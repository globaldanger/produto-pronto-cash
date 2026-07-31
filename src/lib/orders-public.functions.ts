import { createServerFn } from "@tanstack/react-start";

const FIELDS =
  "id,tracking_code,status,kanban_status,total,channel,payment_method,delivery_type,customer_name,created_at,paid_at,shipping_city,shipping_state";

export type PublicOrder = {
  id: string;
  tracking_code: string | null;
  status: string;
  kanban_status: string | null;
  total: number;
  channel: string;
  payment_method: string | null;
  delivery_type: string;
  customer_name: string | null;
  created_at: string;
  paid_at: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
};

export const getOrderPublic = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId || data.orderId.trim().length < 6)
      throw new Error("Informe o código de rastreio ou o número do pedido");
    return { orderId: data.orderId.trim() };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.orderId;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    const query = supabaseAdmin.from("orders").select(FIELDS);
    const { data: found, error } = isUuid
      ? await query.eq("id", term).maybeSingle()
      : await query.ilike("tracking_code", term).maybeSingle();
    if (error) throw error;
    if (!found) throw new Error("Pedido não encontrado");
    const order = found as unknown as PublicOrder;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name,quantity,unit_price,product_image")
      .eq("order_id", order.id);
    const { data: events } = await supabaseAdmin
      .from("order_tracking_events")
      .select("status,description,location,created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    return { order, items: items ?? [], events: events ?? [] };
  });
