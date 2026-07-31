import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CheckoutInput = {
  items: { productId: string; quantity: number }[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    delivery_type: "delivery" | "pickup";
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  payment_method?: "pix" | "card";
  coupon_code?: string;
};

export const createPixCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CheckoutInput) => {
    if (!data?.items?.length) throw new Error("Carrinho vazio");
    if (!data.customer?.name || !data.customer?.phone)
      throw new Error("Nome e telefone obrigatórios");
    if (data.customer.delivery_type === "delivery") {
      if (!data.customer.cep || !data.customer.street || !data.customer.number || !data.customer.city)
        throw new Error("Endereço de entrega incompleto");
    }
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

    const subtotal = total;
    // Apply coupon if present
    let couponCode: string | null = null;
    let couponDiscount = 0;
    let couponId: string | null = null;
    if (data.coupon_code?.trim()) {
      const codeUp = data.coupon_code.trim().toUpperCase();
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("id,code,type,value,min_order,max_uses,uses,expires_at,active")
        .ilike("code", codeUp)
        .maybeSingle();
      if (!c) throw new Error("Cupom não encontrado");
      if (!c.active) throw new Error("Cupom pausado");
      if (c.expires_at && new Date(c.expires_at).getTime() < Date.now())
        throw new Error("Cupom expirado");
      if (c.max_uses !== null && Number(c.uses) >= Number(c.max_uses))
        throw new Error("Cupom esgotado");
      if (subtotal < Number(c.min_order))
        throw new Error(`Pedido mínimo R$ ${Number(c.min_order).toFixed(2)} para este cupom`);
      let d = 0;
      if (c.type === "percent") d = (subtotal * Number(c.value)) / 100;
      else if (c.type === "fixed") d = Number(c.value);
      couponDiscount = Math.max(0, Math.min(d, subtotal));
      couponCode = c.code;
      couponId = c.id;
      total = Math.max(0, subtotal - couponDiscount);
    }

    // Load MP token from server-only secrets table
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("store_name")
      .limit(1)
      .maybeSingle();
    const { data: secrets } = await supabaseAdmin
      .from("store_secrets")
      .select("mercadopago_access_token")
      .limit(1)
      .maybeSingle();
    const token = secrets?.mercadopago_access_token?.trim();
    if (!token) {
      throw new Error(
        "Mercado Pago não configurado. Acesse Configurações no painel admin e informe o Access Token.",
      );
    }

    // Create order (pending)
    const addrSummary =
      data.customer.delivery_type === "pickup"
        ? "Retirada na loja"
        : [
            `${data.customer.street}, ${data.customer.number}`,
            data.customer.complement,
            data.customer.neighborhood,
            `${data.customer.city}/${data.customer.state ?? ""}`,
            data.customer.cep ? `CEP ${data.customer.cep}` : null,
          ]
            .filter(Boolean)
            .join(" — ");
    const method = data.payment_method ?? "pix";
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customer.name,
        customer_phone: data.customer.phone,
        customer_address: addrSummary,
        notes: data.customer.notes ?? null,
        delivery_type: data.customer.delivery_type,
        shipping_cep: data.customer.cep ?? null,
        shipping_street: data.customer.street ?? null,
        shipping_number: data.customer.number ?? null,
        shipping_complement: data.customer.complement ?? null,
        shipping_neighborhood: data.customer.neighborhood ?? null,
        shipping_city: data.customer.city ?? null,
        shipping_state: data.customer.state ?? null,
        total,
        discount: couponDiscount,
        discount_coupon: couponDiscount,
        coupon_code: couponCode,
        status: "pending",
        channel: "online",
        payment_method: method,
      })
      .select()
      .single();
    if (oErr) throw oErr;

    const { error: iErr } = await supabase
      .from("order_items")
      .insert(orderItems.map((it) => ({ ...it, order_id: order.id })));
    if (iErr) throw iErr;

    // Registrar resgate do cupom
    if (couponId && couponCode) {
      await supabaseAdmin.from("coupon_redemptions").insert({
        coupon_id: couponId,
        order_id: order.id,
        user_id: userId,
        discount: couponDiscount,
      });
      const { data: cur } = await supabaseAdmin
        .from("coupons").select("uses").eq("id", couponId).maybeSingle();
      await supabaseAdmin
        .from("coupons")
        .update({ uses: Number(cur?.uses ?? 0) + 1 })
        .eq("id", couponId);
    }

    // Both Pix and Card use Checkout Pro (hosted checkout). This works in any
    // hosting environment (Netlify, InfinityFree, Cloudflare, etc.) since the
    // customer is redirected to mercadopago.com to pay.
    {
      const excluded =
        method === "pix"
          ? [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }]
          : [{ id: "ticket" }, { id: "atm" }];
      const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Idempotency-Key": order.id,
        },
        body: JSON.stringify({
          items: orderItems.map((it) => ({
            title: it.product_name,
            quantity: it.quantity,
            unit_price: Number(Number(it.unit_price).toFixed(2)),
            currency_id: "BRL",
          })),
          payer: {
            name: data.customer.name,
            email: data.customer.email || `cliente+${userId.slice(0, 8)}@smartcell.app`,
          },
          payment_methods: {
            excluded_payment_types: excluded,
            installments: method === "card" ? 12 : 1,
          },
          external_reference: order.id,
          notification_url: `${process.env.SITE_URL ?? ""}/api/public/mp-webhook`,
          back_urls: {
            success: `${process.env.SITE_URL ?? ""}/checkout/sucesso/${order.id}`,
            failure: `${process.env.SITE_URL ?? ""}/checkout/sucesso/${order.id}`,
            pending: `${process.env.SITE_URL ?? ""}/checkout/sucesso/${order.id}`,
          },
          auto_return: "approved",
        }),
      });
      const prefJson = (await prefRes.json()) as {
        id?: string;
        init_point?: string;
        sandbox_init_point?: string;
        message?: string;
        cause?: { description: string }[];
      };
      if (!prefRes.ok || !prefJson.id) {
        const msg = prefJson.message || prefJson.cause?.[0]?.description || "Erro Mercado Pago";
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled", cancel_reason: `MP: ${msg}` })
          .eq("id", order.id);
        throw new Error(msg);
      }
      const init = prefJson.init_point ?? prefJson.sandbox_init_point ?? null;
      await supabaseAdmin
        .from("orders")
        .update({ mp_preference_id: prefJson.id, mp_init_point: init })
        .eq("id", order.id);
      return { orderId: order.id, redirectUrl: init };
    }
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

    const { data: secrets } = await supabaseAdmin
      .from("store_secrets")
      .select("mercadopago_access_token")
      .limit(1)
      .maybeSingle();
    const token = secrets?.mercadopago_access_token?.trim();
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

export const verifyOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isFunc } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "funcionario",
    });
    if (!isAdmin && !isFunc) throw new Error("Sem permissão");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id,status,mp_payment_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status === "paid") return { status: "paid" as const, info: "Pedido já estava pago" };

    const { data: secrets } = await supabaseAdmin
      .from("store_secrets")
      .select("mercadopago_access_token")
      .limit(1)
      .maybeSingle();
    const token = secrets?.mercadopago_access_token?.trim();
    if (!token) throw new Error("Mercado Pago não configurado");

    // Try direct payment id first; otherwise search by external_reference
    let status: string | undefined;
    let paymentId: string | undefined = order.mp_payment_id ?? undefined;

    if (paymentId) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await r.json()) as { status?: string };
      status = j.status;
    } else {
      const r = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(order.id)}&sort=date_created&criteria=desc&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const j = (await r.json()) as { results?: { id: number; status: string }[] };
      const approved = j.results?.find((p) => p.status === "approved");
      const last = approved ?? j.results?.[0];
      if (last) {
        paymentId = String(last.id);
        status = last.status;
      }
    }

    if (paymentId) {
      await supabaseAdmin.from("orders").update({ mp_payment_id: paymentId }).eq("id", order.id);
    }

    if (status === "approved") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("product_id,quantity")
        .eq("order_id", order.id);
      for (const it of items ?? []) {
        await supabaseAdmin.rpc("decrement_stock", {
          _product_id: it.product_id,
          _qty: it.quantity,
        });
      }
      return { status: "paid" as const, info: "Pagamento confirmado e estoque atualizado" };
    }
    return { status: order.status, info: `Mercado Pago: ${status ?? "nenhum pagamento encontrado"}` };
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
  items: { productId: string; quantity: number; unitPrice?: number }[];
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
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isFunc } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "funcionario" });
    if (!isAdmin && !isFunc) throw new Error("Sem permissão para registrar vendas");

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
      const unit = i.unitPrice != null ? Number(i.unitPrice) : Number(p.sale_price ?? p.price);
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
export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas admin pode apagar pedidos");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("order_items").delete().eq("order_id", data.orderId);
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });
