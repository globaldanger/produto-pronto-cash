import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { cancelOrder, refundOrder } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
  created_at: string;
  channel: string;
  payment_method: string | null;
};

const STATUS = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;
type Status = (typeof STATUS)[number];
const LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

function fmtBRL(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const doCancel = useServerFn(cancelOrder);
  const doRefund = useServerFn(refundOrder);

  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders", filter, channelFilter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as Status);
      if (channelFilter !== "all") q = q.eq("channel", channelFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  }

  async function cancel(id: string) {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;
    try {
      await doCancel({ data: { orderId: id, reason } });
      toast.success("Venda cancelada — estoque devolvido");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function refund(id: string) {
    const reason = prompt("Motivo do reembolso (opcional):") ?? undefined;
    if (!confirm("Confirmar reembolso? O estoque será devolvido.")) return;
    try {
      await doRefund({ data: { orderId: id, reason } });
      toast.success("Pedido reembolsado");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", "online", "fisica"].map((c) => (
          <button
            key={c}
            onClick={() => setChannelFilter(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${channelFilter === c ? "bg-accent text-accent-foreground" : "border border-border"}`}
          >
            {c === "all" ? "Todos os canais" : c === "online" ? "Online" : "Loja física"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === "all" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          Todos
        </button>
        {STATUS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "border border-border"}`}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <i className="fa-solid fa-receipt mb-3 text-4xl" />
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Pedido</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Pagamento</th>
                <th className="px-4 py-3 text-center">Canal</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{o.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_phone ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{fmtBRL(Number(o.total))}</td>
                  <td className="px-4 py-3 text-center text-xs uppercase">{o.payment_method ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {o.channel === "fisica" ? "Física" : "Online"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value as Status)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      {STATUS.map((s) => (
                        <option key={s} value={s}>{LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/comprovante/${o.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-1 inline-block rounded border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                      title="Comprovante"
                    >
                      <i className="fa-solid fa-print" />
                    </a>
                    {o.status !== "cancelled" && o.status !== "refunded" && (
                      <button
                        onClick={() => cancel(o.id)}
                        className="mr-1 rounded border border-border px-2 py-1 text-xs hover:border-destructive hover:text-destructive"
                        title="Cancelar"
                      >
                        <i className="fa-solid fa-ban" />
                      </button>
                    )}
                    {o.status === "paid" || o.status === "shipped" || o.status === "delivered" ? (
                      <button
                        onClick={() => refund(o.id)}
                        className="rounded border border-border px-2 py-1 text-xs hover:border-warning hover:text-warning"
                        title="Reembolsar"
                      >
                        <i className="fa-solid fa-rotate-left" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}