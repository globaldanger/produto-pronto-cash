import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: "Pagamentos — Admin" }] }),
  component: PaymentsPage,
});

type PaymentStatus = "all" | "pending" | "paid" | "refunded" | "cancelled";

type Row = {
  id: string;
  status: string;
  total: number;
  customer_name: string | null;
  payment_method: string | null;
  channel: string | null;
  mp_payment_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pendente", color: "bg-amber-500/15 text-amber-500", icon: "fa-clock" },
  paid: { label: "Pago", color: "bg-emerald-500/15 text-emerald-500", icon: "fa-check-circle" },
  refunded: { label: "Estornado", color: "bg-blue-500/15 text-blue-500", icon: "fa-rotate-left" },
  cancelled: { label: "Cancelado", color: "bg-red-500/15 text-red-500", icon: "fa-ban" },
  shipped: { label: "Enviado", color: "bg-indigo-500/15 text-indigo-500", icon: "fa-truck" },
  delivered: { label: "Entregue", color: "bg-emerald-500/15 text-emerald-500", icon: "fa-box" },
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(v: string | null) {
  return v ? new Date(v).toLocaleString("pt-BR") : "—";
}
function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function PaymentsPage() {
  const [status, setStatus] = useState<PaymentStatus>("all");
  const [from, setFrom] = useState(todayISO(-30));
  const [to, setTo] = useState(todayISO());
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [method, setMethod] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "payments", { status, from, to, method }],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id,status,total,customer_name,payment_method,channel,mp_payment_id,paid_at,refunded_at,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (status !== "all") q = q.eq("status", status);
      if (method !== "all") q = q.eq("payment_method", method);
      if (from) q = q.gte("created_at", from + "T00:00:00");
      if (to) q = q.lte("created_at", to + "T23:59:59");
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
  });

  const filtered = useMemo(() => {
    const min = parseFloat(minValue) || 0;
    const max = parseFloat(maxValue) || Infinity;
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.total < min || r.total > max) return false;
      if (s) {
        const hay = `${r.customer_name ?? ""} ${r.id} ${r.mp_payment_id ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, minValue, maxValue, search]);

  const totals = useMemo(() => {
    const t = { paid: 0, pending: 0, refunded: 0, count: filtered.length };
    for (const r of filtered) {
      if (r.status === "paid" || r.status === "shipped" || r.status === "delivered") t.paid += Number(r.total);
      else if (r.status === "pending") t.pending += Number(r.total);
      else if (r.status === "refunded") t.refunded += Number(r.total);
    }
    return t;
  }, [filtered]);

  function exportCSV() {
    const header = ["ID","Data","Cliente","Método","Canal","Status","Valor","MP Payment","Pago em","Estorno"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        r.id,
        new Date(r.created_at).toISOString(),
        JSON.stringify(r.customer_name ?? ""),
        r.payment_method ?? "",
        r.channel ?? "",
        r.status,
        r.total,
        r.mp_payment_id ?? "",
        r.paid_at ?? "",
        r.refunded_at ?? "",
      ].join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagamentos-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Recebido" value={fmtBRL(totals.paid)} icon="fa-check-circle" color="text-emerald-500" />
        <Kpi label="Pendente" value={fmtBRL(totals.pending)} icon="fa-clock" color="text-amber-500" />
        <Kpi label="Estornado" value={fmtBRL(totals.refunded)} icon="fa-rotate-left" color="text-blue-500" />
        <Kpi label="Transações" value={String(totals.count)} icon="fa-receipt" color="text-primary" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="refunded">Estornado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Método</label>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="all">Todos</option>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">De</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Até</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor mín.</label>
            <input type="number" step="0.01" className="input" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor máx.</label>
            <input type="number" step="0.01" className="input" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Buscar por cliente, ID do pedido ou ID Mercado Pago…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={exportCSV}
            className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
          >
            <i className="fa-solid fa-file-csv mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">MP</th>
                <th className="px-4 py-3">Pedido</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum pagamento encontrado</td></tr>
              )}
              {filtered.map((r) => {
                const s = STATUS_LABEL[r.status] ?? { label: r.status, color: "bg-muted", icon: "fa-circle" };
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">{r.customer_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 capitalize">{r.payment_method ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}>
                        <i className={`fa-solid ${s.icon}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtBRL(Number(r.total))}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {r.mp_payment_id ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/orders"
                        search={{ id: r.id } as never}
                        className="text-primary hover:underline"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square mr-1" />
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <i className={`fa-solid ${icon} ${color}`} /> {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}