import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            data?: { id?: string | number };
            type?: string;
            action?: string;
          };
          const paymentId = body?.data?.id ? String(body.data.id) : null;
          if (!paymentId) return new Response("ignored", { status: 200 });

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
          const j = (await r.json()) as { status?: string; external_reference?: string };
          if (!j.external_reference) return new Response("no ref", { status: 200 });

          if (j.status === "approved") {
            const { data: order } = await supabaseAdmin
              .from("orders")
              .select("id,status")
              .eq("id", j.external_reference)
              .maybeSingle();
            if (order && order.status !== "paid") {
              await supabaseAdmin
                .from("orders")
                .update({ status: "paid", paid_at: new Date().toISOString() })
                .eq("id", j.external_reference);
              const { data: items } = await supabaseAdmin
                .from("order_items")
                .select("product_id,quantity")
                .eq("order_id", j.external_reference);
              for (const it of items ?? []) {
                await supabaseAdmin.rpc("decrement_stock", {
                  _product_id: it.product_id,
                  _qty: it.quantity,
                });
              }
            }
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