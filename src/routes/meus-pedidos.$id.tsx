import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { cancelOrder, checkPaymentStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/meus-pedidos/$id")({
  head: () => ({ meta: [{ title: "Pedido — SmartCell" }] }),
  component: OrderDetail,
});

type Order = {
  id: string;
  total: number;
  status: string;
  channel: string;
  payment_method: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  notes: string | null;
  created_at: string;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  cancel_reason: string | null;
};
type Item = { id: string; product_name: string; quantity: number; unit_price: number; product_image: string | null };

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const cancel = useServerFn(cancelOrder);
  const check = useServerFn(checkPaymentStatus);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      navigate({ to: "/auth" });
      return;
    }
    const [{ data: o }, { data: its }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id),
    ]);
    setOrder(o as Order | null);
    setItems((its ?? []) as Item[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doCancel() {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;
    try {
      await cancel({ data: { orderId: id, reason } });
      toast.success("Pedido cancelado");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function refresh() {
    try {
      await check({ data: { orderId: id } });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  if (!order) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <Link to="/meus-pedidos" className="mt-3 inline-block text-primary hover:underline">← Voltar</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link to="/meus-pedidos" className="text-sm text-muted-foreground hover:text-primary">
          ← Voltar
        </Link>
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Pedido #{order.id.slice(0, 8)}</h1>
              <p className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase text-primary">
              {order.status}
            </span>
          </div>

          <ul className="mt-6 divide-y divide-border text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  {i.product_image ? (
                    <img src={i.product_image} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-surface text-muted-foreground">
                      <i className="fa-solid fa-image" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{i.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.quantity}× R$ {Number(i.unit_price).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="font-semibold">R$ {(i.quantity * Number(i.unit_price)).toFixed(2)}</div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <Info label="Cliente" value={order.customer_name ?? "—"} />
            <Info label="Telefone" value={order.customer_phone ?? "—"} />
            <Info label="Pagamento" value={order.payment_method ?? "—"} />
            <Info label="Canal" value={order.channel} />
            {order.customer_address && <Info label="Endereço" value={order.customer_address} />}
            {order.notes && <Info label="Observações" value={order.notes} />}
            {order.cancel_reason && <Info label="Motivo" value={order.cancel_reason} />}
          </div>

          {order.status === "pending" && order.pix_qr_code && (
            <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-center">
              <p className="mb-2 text-sm font-semibold">Pagamento Pix pendente</p>
              {order.pix_qr_code_base64 && (
                <img
                  src={`data:image/png;base64,${order.pix_qr_code_base64}`}
                  alt="QR Pix"
                  className="mx-auto h-48 w-48 rounded bg-white p-2"
                />
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(order.pix_qr_code ?? "");
                  toast.success("Código copiado!");
                }}
                className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <i className="fa-solid fa-copy mr-1" /> Copiar código Pix
              </button>
              <button
                onClick={refresh}
                className="ml-2 rounded-md border border-border px-4 py-2 text-sm"
              >
                <i className="fa-solid fa-rotate mr-1" /> Atualizar status
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/comprovante/${order.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
            >
              <i className="fa-solid fa-print mr-1" /> Ver comprovante
            </a>
            {(order.status === "pending" || order.status === "paid") && (
              <button
                onClick={doCancel}
                className="rounded-md border border-border px-4 py-2 text-sm hover:border-destructive hover:text-destructive"
              >
                <i className="fa-solid fa-ban mr-1" /> Cancelar pedido
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}