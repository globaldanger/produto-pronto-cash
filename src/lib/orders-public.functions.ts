import { createServerFn } from "@tanstack/react-start";

export const getOrderPublic = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId || data.orderId.length < 8) throw new Error("Número do pedido inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,total,channel,payment_method,delivery_type,customer_name,created_at,paid_at,shipping_city,shipping_state",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Pedido não encontrado");
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name,quantity,unit_price,product_image")
      .eq("order_id", order.id);
    return { order, items: items ?? [] };
  });