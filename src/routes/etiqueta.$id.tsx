import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/etiqueta/$id")({
  head: () => ({ meta: [{ title: "Etiqueta de envio" }] }),
  component: LabelPage,
});

type Order = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_cep: string | null;
  shipping_street: string | null;
  shipping_number: string | null;
  shipping_complement: string | null;
  shipping_neighborhood: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  total: number;
  created_at: string;
};
type Store = {
  store_name: string | null;
  store_address: string | null;
  store_city: string | null;
  store_state: string | null;
  store_cep: string | null;
  store_phone: string | null;
};

function LabelPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<{ product_name: string; quantity: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: s }, { data: it }] = await Promise.all([
        supabase.from("orders").select("id,customer_name,customer_phone,shipping_cep,shipping_street,shipping_number,shipping_complement,shipping_neighborhood,shipping_city,shipping_state,total,created_at").eq("id", id).maybeSingle(),
        supabase.from("store_settings").select("store_name,store_address,store_city,store_state,store_cep,store_phone").limit(1).maybeSingle(),
        supabase.from("order_items").select("product_name,quantity").eq("order_id", id),
      ]);
      setOrder(o as Order | null);
      setStore(s as Store | null);
      setItems((it ?? []) as { product_name: string; quantity: number }[]);
      setTimeout(() => window.print(), 400);
    })();
  }, [id]);

  if (!order) return <div className="p-10 text-center text-muted-foreground">Carregando etiqueta...</div>;

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-0">
      <style>{`@media print { @page { size: A6; margin: 6mm; } body { background: white; } .no-print { display: none; } }`}</style>
      <div className="mx-auto max-w-[105mm] border-2 border-black bg-white p-4 font-sans text-[11px] leading-tight">
        <div className="mb-2 flex items-center justify-between border-b-2 border-black pb-1">
          <div className="text-[10px] font-bold uppercase">Etiqueta de envio</div>
          <div className="font-mono text-[10px]">#{order.id.slice(0, 8)}</div>
        </div>

        <div className="mb-2">
          <div className="text-[9px] font-bold uppercase tracking-wide">Remetente</div>
          <div className="font-bold">{store?.store_name ?? "SmartCell"}</div>
          {store?.store_address && <div>{store.store_address}</div>}
          <div>
            {store?.store_city ?? ""} {store?.store_state ? `- ${store.store_state}` : ""}{" "}
            {store?.store_cep ? `CEP ${store.store_cep}` : ""}
          </div>
          {store?.store_phone && <div>Tel: {store.store_phone}</div>}
        </div>

        <div className="mb-2 rounded border-2 border-black bg-black p-2 text-white">
          <div className="text-[9px] font-bold uppercase tracking-wide">Destinatário</div>
          <div className="text-[14px] font-bold">{order.customer_name ?? "—"}</div>
          <div>
            {order.shipping_street ?? ""}{order.shipping_number ? `, ${order.shipping_number}` : ""}
            {order.shipping_complement ? ` — ${order.shipping_complement}` : ""}
          </div>
          <div>{order.shipping_neighborhood ?? ""}</div>
          <div className="font-bold">
            {order.shipping_city ?? ""} {order.shipping_state ? `- ${order.shipping_state}` : ""}
          </div>
          <div className="text-[13px] font-bold tracking-widest">CEP {order.shipping_cep ?? "—"}</div>
          {order.customer_phone && <div>Tel: {order.customer_phone}</div>}
        </div>

        <div className="mb-2">
          <div className="text-[9px] font-bold uppercase tracking-wide">Conteúdo ({items.length} itens)</div>
          <ul className="ml-3 list-disc">
            {items.map((i, k) => <li key={k}>{i.quantity}x {i.product_name}</li>)}
          </ul>
        </div>

        <div className="mt-2 border-t border-black pt-1 text-[9px]">
          Pedido: {new Date(order.created_at).toLocaleDateString("pt-BR")} · Não contém valor declarado
        </div>
      </div>
      <div className="no-print mt-6 text-center">
        <button onClick={() => window.print()} className="rounded bg-black px-6 py-2 text-white">
          🖨 Imprimir novamente
        </button>
      </div>
    </div>
  );
}