import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CheckoutInput = {
  items: { productId: string; quantity: number }[];
  customer: { name: string; phone: string; address?: string; notes?: string; email?: string };
};

export const createPixCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CheckoutInput) => {
    if (!data?.items?.length) throw new Error("Carrinho vazio");
    if (!data.customer?.name || !data.customer?.phone)
      throw new Error("Nome e telefone obrigatórios");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load products
    const ids = data.items.map((i) => i.productId);
    const { data: prods, error: pErr } = await supabase
      .from("products")
      .select("id,name,price,sale_price,stock,images")
      .in("id", ids);
    if (pErr) throw pErr;
    if (!prods || prods.length !== ids.length) throw new Error("Produto inválido no carrinho");

    let total = 0;
    const orderItems = data.items.map((i) => {
      const p = prods.find((x) => x.id === i.productId)!;
      if (i.quantity > p.stock) throw new Error(`Estoque insuficiente para ${p.name}`);
      const unit = Number(p.sale_price ?? p.price);
      total += unit * i.quantity;
      return {
        product_id: p.id,
        product_name: p.name,
        product_image: p.images?.[0] ?? null,
        quantity: i.quantity,
        unit_price: unit,
      };
    });

    // Load MP token from store_settings
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("mercadopago_access_token,store_name")
      .limit(1)
      .maybeSingle();
    const token = settings?.mercadopago_access_token?.trim();
    if (!token) {
      throw new Error(
        "Mercado Pago não configurado. Acesse Configurações no painel admin e informe o Access Token.",
      );
    }

    // Create order (pending)
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customer.name,
        customer_phone: data.customer.phone,
        customer_address: data.customer.address ?? null,
        notes: data.customer.notes ?? null,
        total,
        status: "pending",
        channel: "online",
        payment_method: "pix",
      })
      .select()
      .single();
    if (oErr) throw oErr;

    const { error: iErr } = await supabase
      .from("order_items")
      .insert(orderItems.map((it) => ({ ...it, order_id: order.id })));
    if (iErr) throw iErr;

    // Create Pix payment in Mercado Pago
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": order.id,
      },
      body: JSON.stringify({
        transaction_amount: Number(total.toFixed(2)),
        description: `Pedido #${order.id.slice(0, 8)} — ${settings?.store_name ?? "Loja"}`,
        payment_method_id: "pix",
        external_reference: order.id,
        payer: {
          email: data.customer.email || `cliente+${userId.slice(0, 8)}@smartcell.app`,
          first_name: data.customer.name.split(" ")[0],
          last_name: data.customer.name.split(" ").slice(1).join(" ") || "Cliente",
        },
      }),
    });
    const mpJson = (await mpRes.json()) as {
      id?: number;
      status?: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string };
      };
      message?: string;
      cause?: { description: string }[];
    };
    if (!mpRes.ok || !mpJson.id) {
      const msg = mpJson.message || mpJson.cause?.[0]?.description || "Erro Mercado Pago";
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled", cancel_reason: `MP: ${msg}` })
        .eq("id", order.id);
      throw new Error(msg);
    }

    const qr = mpJson.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrB64 = mpJson.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("orders")
      .update({
        mp_payment_id: String(mpJson.id),
        pix_qr_code: qr,
        pix_qr_code_base64: qrB64,
        pix_expires_at: expires,
      })
      .eq("id", order.id);

    return { orderId: order.id };
  });

export const checkPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await context.supabase
      .from("orders")
      .select("id,status,mp_payment_id,user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status === "paid") return { status: "paid" as const };
    if (!order.mp_payment_id) return { status: order.status };

    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("mercadopago_access_token")
      .limit(1)
      .maybeSingle();
    const token = settings?.mercadopago_access_token?.trim();
    if (!token) return { status: order.status };

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${order.mp_payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = (await r.json()) as { status?: string };
    if (j.status === "approved") {
      await markOrderPaid(data.orderId);
      return { status: "paid" as const };
    }
    return { status: order.status };
  });

async function markOrderPaid(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
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
}

type AdminSaleInput = {
  items: { productId: string; quantity: number }[];
  customer: { name?: string; phone?: string };
  payment_method: string;
  discount?: number;
  notes?: string;
};

export const createPhysicalSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AdminSaleInput) => {
    if (!data?.items?.length) throw new Error("Selecione ao menos um produto");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas admin");

    const ids = data.items.map((i) => i.productId);
    const { data: prods } = await supabaseAdmin
      .from("products")
      .select("id,name,price,sale_price,stock,images")
      .in("id", ids);
    if (!prods || prods.length !== ids.length) throw new Error("Produto inválido");

    let subtotal = 0;
    const orderItems = data.items.map((i) => {
      const p = prods.find((x) => x.id === i.productId)!;
      if (i.quantity > p.stock) throw new Error(`Estoque insuficiente: ${p.name}`);
      const unit = Number(p.sale_price ?? p.price);
      subtotal += unit * i.quantity;
      return {
        product_id: p.id,
        product_name: p.name,
        product_image: p.images?.[0] ?? null,
        quantity: i.quantity,
        unit_price: unit,
      };
    });
    const discount = Number(data.discount ?? 0);
    const total = Math.max(0, subtotal - discount);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        customer_name: data.customer.name || "Balcão",
        customer_phone: data.customer.phone || "—",
        total,
        discount,
        status: "paid",
        channel: "fisica",
        payment_method: data.payment_method,
        notes: data.notes ?? null,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;

    await supabaseAdmin
      .from("order_items")
      .insert(orderItems.map((it) => ({ ...it, order_id: order.id })));

    for (const it of orderItems) {
      await supabaseAdmin.rpc("decrement_stock", {
        _product_id: it.product_id,
        _qty: it.quantity,
      });
    }

    return { orderId: order.id };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await context.supabase
      .from("orders")
      .select("id,status,user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin && order.user_id !== context.userId) throw new Error("Sem permissão");
    if (order.status === "cancelled" || order.status === "refunded")
      throw new Error("Pedido já encerrado");

    const wasPaid = order.status === "paid" || order.status === "shipped" || order.status === "delivered";
    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled", cancel_reason: data.reason })
      .eq("id", data.orderId);

    if (wasPaid) {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("product_id,quantity")
        .eq("order_id", data.orderId);
      for (const it of items ?? []) {
        await supabaseAdmin.rpc("increment_stock", {
          _product_id: it.product_id,
          _qty: it.quantity,
        });
      }
    }
    return { ok: true };
  });

export const refundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; reason?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas admin");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id,status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status === "refunded") throw new Error("Já reembolsado");

    await supabaseAdmin
      .from("orders")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        cancel_reason: data.reason ?? null,
      })
      .eq("id", data.orderId);

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id,quantity")
      .eq("order_id", data.orderId);
    for (const it of items ?? []) {
      await supabaseAdmin.rpc("increment_stock", {
        _product_id: it.product_id,
        _qty: it.quantity,
      });
    }
    return { ok: true };
  });