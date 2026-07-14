import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";

export type AuditAction =
  | "login"
  | "logout"
  | "order.status_change"
  | "order.cancel"
  | "order.refund"
  | "order.delete"
  | "order.edit"
  | "order.payment_webhook"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "user.role_change"
  | "user.create"
  | "user.delete"
  | "settings.update";

export const logAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      action: AuditAction;
      entity_type?: string;
      entity_id?: string;
      details?: Record<string, unknown>;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    try {
      let ip: string | null = null;
      try {
        ip = getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {
        ip = getRequestHeader("x-forwarded-for") ?? null;
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", context.userId)
        .maybeSingle();
      const email =
        (context.claims as Record<string, unknown> | undefined)?.email as string | undefined;
      await supabaseAdmin.from("audit_logs").insert({
        user_id: context.userId,
        user_email: email ?? null,
        user_name: prof?.full_name ?? null,
        action: data.action,
        entity_type: data.entity_type ?? null,
        entity_id: data.entity_id ?? null,
        details: (data.details ?? {}) as never,
        ip,
      });
    } catch (e) {
      console.error("[audit]", e);
    }
    return { ok: true };
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      action?: string;
      entity_type?: string;
      user_query?: string;
      from?: string;
      to?: string;
      limit?: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso restrito a administradores");
    let q = context.supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
    if (data.action) q = q.eq("action", data.action);
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.user_query) {
      const s = `%${data.user_query}%`;
      q = q.or(`user_email.ilike.${s},user_name.ilike.${s}`);
    }
    q = q.limit(Math.min(data.limit ?? 500, 1000));
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });