import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/sales")({
  component: SalesPage,
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SalesPage() {
  const { data } = useQuery({
    queryKey: ["admin", "sales"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: orders } = await supabase
        .from("orders")
        .select("id,total,status,created_at,customer_name")
        .eq("status", "paid")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      const list = orders ?? [];
      const total = list.reduce((s, o) => s + Number(o.total), 0);
      const today = new Date().toDateString();
      const todayTotal = list
        .filter((o) => new Date(o.created_at).toDateString() === today)
        .reduce((s, o) => s + Number(o.total), 0);
      const avg = list.length > 0 ? total / list.length : 0;
      return { list, total, todayTotal, avg, count: list.length };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Vendas hoje" value={fmtBRL(data?.todayTotal ?? 0)} icon="fa-calendar-day" />
        <Stat label="Receita 30d" value={fmtBRL(data?.total ?? 0)} icon="fa-sack-dollar" />
        <Stat label="Pedidos pagos" value={String(data?.count ?? 0)} icon="fa-check-circle" />
        <Stat label="Ticket médio" value={fmtBRL(data?.avg ?? 0)} icon="fa-chart-line" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-bold">Vendas recentes (últimos 30 dias)</h3>
        {(data?.list ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma venda paga ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Data</th>
                <th className="px-2 py-2 text-left">Cliente</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.list.map((o) => (
                <tr key={o.id}>
                  <td className="px-2 py-2 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-2 py-2">{o.customer_name ?? "—"}</td>
                  <td className="px-2 py-2 text-right font-semibold text-primary">{fmtBRL(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <i className={`fa-solid ${icon} text-3xl text-primary opacity-60`} />
      </div>
    </div>
  );
}