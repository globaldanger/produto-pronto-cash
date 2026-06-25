import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  created_at: string;
};

const STATUS = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUS)[number];
const LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function fmtBRL(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders", filter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as Status);
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

  return (
    <div className="space-y-4">
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
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
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
                  <td className="px-4 py-3 text-center text-xs">Pix</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}