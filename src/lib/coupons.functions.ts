import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ValidatedCoupon = {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  discount: number;
  description: string | null;
};

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; subtotal: number }) => {
    if (!d?.code?.trim()) throw new Error("Informe um código de cupom");
    const subtotal = Number(d.subtotal);
    if (!isFinite(subtotal) || subtotal <= 0) throw new Error("Subtotal inválido");
    return { code: d.code.trim().toUpperCase(), subtotal };
  })
  .handler(async ({ data, context }): Promise<ValidatedCoupon> => {
    const { supabase } = context;
    const { data: c, error } = await supabase
      .from("coupons")
      .select("id,code,description,type,value,min_order,max_uses,uses,expires_at,active")
      .ilike("code", data.code)
      .maybeSingle();
    if (error) throw error;
    if (!c) throw new Error("Cupom não encontrado");
    if (!c.active) throw new Error("Cupom pausado pelo administrador");
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now())
      throw new Error("Cupom expirado");
    if (c.max_uses !== null && Number(c.uses) >= Number(c.max_uses))
      throw new Error("Cupom esgotado");
    if (data.subtotal < Number(c.min_order))
      throw new Error(`Pedido mínimo de R$ ${Number(c.min_order).toFixed(2)} para este cupom`);

    let discount = 0;
    if (c.type === "percent") discount = (data.subtotal * Number(c.value)) / 100;
    else if (c.type === "fixed") discount = Number(c.value);
    // free_shipping: desconto sobre frete (não temos taxa nesse modelo → 0)
    discount = Math.max(0, Math.min(discount, data.subtotal));

    return {
      id: c.id,
      code: c.code,
      type: c.type as ValidatedCoupon["type"],
      value: Number(c.value),
      discount: Number(discount.toFixed(2)),
      description: c.description,
    };
  });