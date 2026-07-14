import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Acesso restrito a administradores");
}

async function writeAudit(
  actorId: string,
  actorEmail: string | null,
  action: string,
  entity_type: string,
  entity_id: string,
  details: Record<string, unknown> = {},
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", actorId)
      .maybeSingle();
    await supabaseAdmin.from("audit_logs").insert({
      user_id: actorId,
      user_email: actorEmail,
      user_name: prof?.full_name ?? null,
      action,
      entity_type,
      entity_id,
      details: details as never,
    });
  } catch (e) {
    console.error("[audit-internal]", e);
  }
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,phone");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role");
    const { data: auth } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const byId: Record<string, { email: string | null; created_at: string }> = {};
    for (const u of auth?.users ?? []) byId[u.id] = { email: u.email ?? null, created_at: u.created_at };
    return (profiles ?? []).map((p) => {
      const userRoles = (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role);
      const role = userRoles.includes("admin")
        ? "admin"
        : userRoles.includes("funcionario")
          ? "funcionario"
          : "cliente";
      return {
        id: p.id,
        full_name: p.full_name ?? "",
        phone: p.phone ?? "",
        email: byId[p.id]?.email ?? null,
        created_at: byId[p.id]?.created_at ?? null,
        role,
      };
    });
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: "admin" | "funcionario" | "cliente" }) => {
    if (!["admin","funcionario","cliente"].includes(data.role)) throw new Error("Papel inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && data.role !== "admin")
      throw new Error("Você não pode rebaixar a própria conta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    const actorEmail = (context.claims as Record<string, unknown> | undefined)?.email as string | undefined;
    await writeAudit(
      context.userId,
      actorEmail ?? null,
      "user.role_change",
      "user",
      data.userId,
      { role: data.role },
    );
    return { ok: true };
  });

const BACKUP_TABLES = [
  "store_settings",
  "categories",
  "products",
  "orders",
  "order_items",
  "expenses",
  "profiles",
  "user_roles",
] as const;

export const exportBackup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: Record<string, any[]> = {};
    for (const t of BACKUP_TABLES) {
      const { data, error } = await supabaseAdmin.from(t).select("*");
      if (error) throw new Error(`${t}: ${error.message}`);
      out[t] = data ?? [];
    }
    return { version: 1, generated_at: new Date().toISOString(), tables: out };
  });

export const importBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { backup: { tables: Record<string, any[]> } }) => {
    if (!data?.backup?.tables) throw new Error("Arquivo de backup inválido");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = data.backup.tables;
    const result: Record<string, number> = {};
    // Order matters for FK: store_settings, categories, products, profiles, user_roles, orders, order_items, expenses
    const order = ["store_settings","categories","products","profiles","user_roles","orders","order_items","expenses"];
    for (const t of order) {
      const rows = tables[t];
      if (!rows || !Array.isArray(rows) || rows.length === 0) { result[t] = 0; continue; }
      const { error } = await supabaseAdmin.from(t as any).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`${t}: ${error.message}`);
      result[t] = rows.length;
    }
    return { ok: true, restored: result };
  });

export const bulkImportProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    rows: { name: string; price: number; stock: number; description?: string; sale_price?: number | null; cost_price?: number | null; category_slug?: string | null; featured?: boolean; active?: boolean; }[];
  }) => {
    if (!data?.rows?.length) throw new Error("Nenhuma linha");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isFunc } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "funcionario" });
    if (!isStaff && !isFunc) throw new Error("Sem permissão");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cats } = await supabaseAdmin.from("categories").select("id,slug");
    const bySlug: Record<string, string> = {};
    for (const c of cats ?? []) bySlug[c.slug] = c.id;
    const inserts = data.rows.map((r) => ({
      name: r.name,
      description: r.description ?? null,
      price: Number(r.price),
      sale_price: r.sale_price != null ? Number(r.sale_price) : null,
      cost_price: r.cost_price != null ? Number(r.cost_price) : null,
      stock: Number(r.stock ?? 0),
      category_id: r.category_slug ? (bySlug[r.category_slug] ?? null) : null,
      featured: !!r.featured,
      active: r.active !== false,
      images: [],
    }));
    const { error, count } = await supabaseAdmin
      .from("products")
      .insert(inserts, { count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? inserts.length };
  });

type EditItem = { product_id: string; product_name: string; quantity: number; unit_price: number };

export const getAdminPaymentSecrets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("store_settings")
      .select("id,mercadopago_access_token")
      .limit(1)
      .maybeSingle();
    return {
      id: data?.id ?? null,
      mercadopago_access_token: data?.mercadopago_access_token ?? "",
    };
  });

export const setAdminPaymentSecrets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { mercadopago_access_token: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("store_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (!existing?.id) throw new Error("Configurações não encontradas");
    const { error } = await supabaseAdmin
      .from("store_settings")
      .update({ mercadopago_access_token: data.mercadopago_access_token || null })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrderItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; items: EditItem[]; discount?: number; notes?: string }) => {
    if (!data.orderId) throw new Error("Pedido inválido");
    if (!data.items?.length) throw new Error("Adicione ao menos um item");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders").select("id,status,discount").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");

    // Pull current items to compute stock delta
    const { data: prev } = await supabaseAdmin
      .from("order_items").select("product_id,quantity").eq("order_id", data.orderId);
    const prevMap: Record<string, number> = {};
    for (const p of prev ?? []) prevMap[p.product_id] = (prevMap[p.product_id] ?? 0) + p.quantity;

    const newMap: Record<string, number> = {};
    for (const i of data.items) newMap[i.product_id] = (newMap[i.product_id] ?? 0) + i.quantity;

    const isClosed = order.status === "paid" || order.status === "shipped" || order.status === "delivered";

    // Replace items
    await supabaseAdmin.from("order_items").delete().eq("order_id", data.orderId);
    const subtotal = data.items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
    const discount = Number(data.discount ?? order.discount ?? 0);
    const total = Math.max(0, subtotal - discount);
    await supabaseAdmin.from("order_items").insert(
      data.items.map((i) => ({
        order_id: data.orderId,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    );
    await supabaseAdmin.from("orders").update({
      total, discount, notes: data.notes ?? undefined,
    }).eq("id", data.orderId);
    const actorEmail = (context.claims as Record<string, unknown> | undefined)?.email as string | undefined;
    await writeAudit(
      context.userId,
      actorEmail ?? null,
      "order.edit",
      "order",
      data.orderId,
      { total, discount, item_count: data.items.length },
    );

    // Adjust stock if order already debited from stock
    if (isClosed) {
      const allIds = new Set([...Object.keys(prevMap), ...Object.keys(newMap)]);
      for (const pid of allIds) {
        const delta = (newMap[pid] ?? 0) - (prevMap[pid] ?? 0);
        if (delta > 0) await supabaseAdmin.rpc("decrement_stock", { _product_id: pid, _qty: delta });
        else if (delta < 0) await supabaseAdmin.rpc("increment_stock", { _product_id: pid, _qty: -delta });
      }
    }
    return { ok: true, total };
  });