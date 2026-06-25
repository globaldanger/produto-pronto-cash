import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comprovante/$id")({
  head: () => ({ meta: [{ title: "Comprovante — SmartCell" }] }),
  component: ReceiptPage,
});

type Order = {
  id: string;
  total: number;
  discount: number;
  status: string;
  channel: string;
  payment_method: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
};
type Item = { id: string; product_name: string; quantity: number; unit_price: number };
type Settings = {
  store_name: string;
  store_phone: string | null;
  store_address: string | null;
  store_email: string | null;
  store_logo: string | null;
};

function ReceiptPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: its }, { data: s }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase
          .from("store_settings")
          .select("store_name,store_phone,store_address,store_email,store_logo")
          .limit(1)
          .maybeSingle(),
      ]);
      setOrder(o as Order | null);
      setItems((its ?? []) as Item[]);
      setSettings(s as Settings | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-12 text-center">Carregando comprovante...</div>;
  if (!order) {
    return (
      <div className="p-12 text-center">
        <p>Comprovante não encontrado ou sem permissão.</p>
        <Link to="/" className="mt-3 inline-block text-primary hover:underline">Voltar</Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0);

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .receipt { color: black !important; width: 100% !important; max-width: 72mm !important; }
          .receipt * { color: black !important; }
        }
      `}</style>
      <div className="min-h-screen bg-neutral-100 py-8 text-neutral-900">
        <div className="no-print mx-auto mb-4 flex max-w-md justify-center gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-black px-4 py-2 font-semibold text-white"
          >
            <i className="fa-solid fa-print mr-2" /> Imprimir
          </button>
          <Link to="/" className="rounded-md border border-neutral-300 bg-white px-4 py-2">
            Fechar
          </Link>
        </div>

        <div className="receipt mx-auto max-w-md bg-white p-6 font-mono text-xs shadow">
          <div className="text-center">
            {settings?.store_logo && (
              <img src={settings.store_logo} alt="" className="mx-auto mb-2 h-12 w-12 rounded object-cover" />
            )}
            <div className="text-base font-bold">{settings?.store_name ?? "SmartCell"}</div>
            {settings?.store_address && <div>{settings.store_address}</div>}
            {settings?.store_phone && <div>Tel: {settings.store_phone}</div>}
            {settings?.store_email && <div>{settings.store_email}</div>}
          </div>
          <div className="my-3 border-t border-dashed border-neutral-400" />
          <div className="text-center font-semibold">
            {order.channel === "fisica" ? "VENDA — LOJA FÍSICA" : "PEDIDO ONLINE"}
          </div>
          <div className="mt-1 flex justify-between">
            <span>Pedido:</span>
            <span>#{order.id.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between">
            <span>Data:</span>
            <span>{new Date(order.paid_at ?? order.created_at).toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex justify-between">
            <span>Cliente:</span>
            <span>{order.customer_name ?? "—"}</span>
          </div>
          {order.customer_phone && order.customer_phone !== "—" && (
            <div className="flex justify-between">
              <span>Telefone:</span>
              <span>{order.customer_phone}</span>
            </div>
          )}
          <div className="my-3 border-t border-dashed border-neutral-400" />
          <div className="font-semibold">ITENS</div>
          {items.map((i) => (
            <div key={i.id} className="mt-1">
              <div className="leading-tight">{i.product_name}</div>
              <div className="flex justify-between">
                <span>
                  {i.quantity} × R$ {Number(i.unit_price).toFixed(2)}
                </span>
                <span>R$ {(i.quantity * Number(i.unit_price)).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div className="my-3 border-t border-dashed border-neutral-400" />
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between">
              <span>Desconto:</span>
              <span>- R$ {Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-base font-bold">
            <span>TOTAL:</span>
            <span>R$ {Number(order.total).toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Pagamento:</span>
            <span className="uppercase">{order.payment_method ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="uppercase">{order.status}</span>
          </div>
          {order.notes && (
            <>
              <div className="my-2 border-t border-dashed border-neutral-400" />
              <div>Obs: {order.notes}</div>
            </>
          )}
          <div className="my-3 border-t border-dashed border-neutral-400" />
          <div className="text-center">Obrigado pela preferência!</div>
        </div>
      </div>
    </>
  );
}