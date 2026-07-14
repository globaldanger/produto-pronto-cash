import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Read raw body once so we can both parse it and use it for
          // signature reconstruction if needed.
          const rawBody = await request.text();
          let parsed: { data?: { id?: string | number }; type?: string; action?: string } = {};
          try { parsed = rawBody ? JSON.parse(rawBody) : {}; } catch { /* ignore */ }
          const paymentId = parsed?.data?.id ? String(parsed.data.id) : null;
          if (!paymentId) return new Response("ignored", { status: 200 });

          // Verify Mercado Pago signature to prevent unauthenticated actors
          // from triggering payment processing / MP API abuse.
          // https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
          const secret = process.env.MP_WEBHOOK_SECRET;
          if (!secret) {
            console.warn("[mp-webhook] MP_WEBHOOK_SECRET not configured; refusing to process");
            return new Response("not configured", { status: 200 });
          }
          const sigHeader = request.headers.get("x-signature") ?? "";
          const reqId = request.headers.get("x-request-id") ?? "";
          const parts: Record<string, string> = {};
          for (const seg of sigHeader.split(",")) {
            const idx = seg.indexOf("=");
            if (idx > 0) parts[seg.slice(0, idx).trim()] = seg.slice(idx + 1).trim();
          }
          const ts = parts.ts;
          const v1 = parts.v1;
          if (!ts || !v1 || !reqId) return new Response("missing signature", { status: 200 });
          // Reject stale signatures (>5 min) to blunt replay abuse.
          const tsNum = Number(ts);
          if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
            return new Response("stale", { status: 200 });
          }
          const manifest = `id:${paymentId};request-id:${reqId};ts:${ts};`;
          const { createHmac, timingSafeEqual } = await import("crypto");
          const expected = createHmac("sha256", secret).update(manifest).digest("hex");
          const a = Buffer.from(expected);
          const b = Buffer.from(v1);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("invalid signature", { status: 200 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: settings } = await supabaseAdmin
            .from("store_settings")
            .select("mercadopago_access_token")
            .limit(1)
            .maybeSingle();
          const token = settings?.mercadopago_access_token?.trim();
          if (!token) return new Response("no token", { status: 200 });

          const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!r.ok) return new Response("mp fail", { status: 200 });
          const j = (await r.json()) as {
            status?: string;
            status_detail?: string;
            external_reference?: string;
            transaction_amount?: number;
          };
          if (!j.external_reference) return new Response("no ref", { status: 200 });

          const orderId = j.external_reference;
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id,status,mp_payment_id")
            .eq("id", orderId)
            .maybeSingle();
          if (!order) return new Response("no order", { status: 200 });

          const mpStatus = j.status ?? "";
          const nowIso = new Date().toISOString();
          const auditDetails = {
            mp_payment_id: paymentId,
            mp_status: mpStatus,
            mp_status_detail: j.status_detail ?? null,
            previous_status: order.status,
            amount: j.transaction_amount ?? null,
          };

          async function audit(action: string) {
            try {
              await supabaseAdmin.from("audit_logs").insert({
                user_id: null,
                user_email: null,
                user_name: "Mercado Pago (webhook)",
                action,
                entity_type: "order",
                entity_id: orderId,
                details: auditDetails as never,
              });
            } catch (e) {
              console.error("[mp-webhook audit]", e);
            }
          }

          if (mpStatus === "approved" && order.status !== "paid") {
            await supabaseAdmin
              .from("orders")
              .update({ status: "paid", paid_at: nowIso, mp_payment_id: paymentId })
              .eq("id", orderId);
            const { data: items } = await supabaseAdmin
              .from("order_items")
              .select("product_id,quantity")
              .eq("order_id", orderId);
            for (const it of items ?? []) {
              await supabaseAdmin.rpc("decrement_stock", {
                _product_id: it.product_id,
                _qty: it.quantity,
              });
            }
            await audit("order.payment_webhook");
          } else if ((mpStatus === "refunded" || mpStatus === "charged_back") && order.status !== "refunded") {
            await supabaseAdmin
              .from("orders")
              .update({ status: "refunded", refunded_at: nowIso, mp_payment_id: paymentId })
              .eq("id", orderId);
            const { data: items } = await supabaseAdmin
              .from("order_items")
              .select("product_id,quantity")
              .eq("order_id", orderId);
            // Return stock only if it had been debited (i.e. previously paid)
            if (order.status === "paid" || order.status === "shipped" || order.status === "delivered") {
              for (const it of items ?? []) {
                await supabaseAdmin.rpc("increment_stock", {
                  _product_id: it.product_id,
                  _qty: it.quantity,
                });
              }
            }
            await audit("order.payment_webhook");
          } else if ((mpStatus === "cancelled" || mpStatus === "rejected") && order.status === "pending") {
            await supabaseAdmin
              .from("orders")
              .update({ status: "cancelled", cancel_reason: j.status_detail ?? "MP: " + mpStatus, mp_payment_id: paymentId })
              .eq("id", orderId);
            await audit("order.payment_webhook");
          } else {
            // No state change but keep a trace of the event
            await audit("order.payment_webhook");
          }
          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("[mp-webhook]", e);
          return new Response("error", { status: 200 });
        }
      },
    },
  },
});