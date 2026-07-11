import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Relatórios — Admin" }] }),
  component: ReportsPage,
});

type Order = {
  id: string;
  total: number;
  status: string;
  channel: string | null;
  created_at: string;
  paid_at: string | null;
};

type Item = {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
};

const RANGES = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "365", label: "1 ano" },
];

const COLORS = ["#d4af37", "#f4d47a", "#b8860b", "#facc15", "#f59e0b", "#eab308"];

function fmtBRL(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ReportsPage() {
  const today = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const [from, setFrom] = useState<string>(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(today.toISOString().slice(0, 10));

  const range = useMemo(() => {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      days: Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)),
    };
  }, [from, to]);

  function setPreset(days: number) {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - days + 1);
    setFrom(f.toISOString().slice(0, 10));
    setTo(t.toISOString().slice(0, 10));
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", from, to],
    queryFn: async () => {
      const [{ data: orders }, { data: items }] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total,status,channel,created_at,paid_at")
          .gte("created_at", range.startISO)
          .lte("created_at", range.endISO),
        supabase.from("order_items").select("order_id,product_id,product_name,quantity,unit_price"),
      ]);
      return { orders: (orders ?? []) as Order[], items: (items ?? []) as Item[] };
    },
  });

  const orders = data?.orders ?? [];
  const items = data?.items ?? [];
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered");

  // Vendas por dia
  const daily = useMemo(() => {
    const map = new Map<string, { date: string; receita: number; pedidos: number }>();
    const start = new Date(`${from}T00:00:00`);
    for (let i = 0; i < range.days; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = d.toISOString().slice(0, 10);
      map.set(k, { date: k, receita: 0, pedidos: 0 });
    }
    paidOrders.forEach((o) => {
      const k = (o.paid_at ?? o.created_at).slice(0, 10);
      const row = map.get(k);
      if (row) { row.receita += Number(o.total); row.pedidos += 1; }
    });
    return [...map.values()].map((r) => ({ ...r, label: r.date.slice(5) }));
  }, [paidOrders, from, range.days]);

  // Top produtos
  const topProducts = useMemo(() => {
    const paidIds = new Set(paidOrders.map((o) => o.id));
    const map = new Map<string, { name: string; quantidade: number; receita: number }>();
    items.filter((i) => paidIds.has(i.order_id)).forEach((i) => {
      const cur = map.get(i.product_name) ?? { name: i.product_name, quantidade: 0, receita: 0 };
      cur.quantidade += Number(i.quantity);
      cur.receita += Number(i.quantity) * Number(i.unit_price);
      map.set(i.product_name, cur);
    });
    return [...map.values()].sort((a, b) => b.receita - a.receita).slice(0, 8);
  }, [items, paidOrders]);

  // Distribuição por status
  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach((o) => m.set(o.status, (m.get(o.status) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Canal
  const byChannel = useMemo(() => {
    const m = new Map<string, number>();
    paidOrders.forEach((o) => {
      const k = o.channel === "fisica" ? "Loja física" : "Online";
      m.set(k, (m.get(k) ?? 0) + Number(o.total));
    });
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [paidOrders]);

  const totalReceita = paidOrders.reduce((s, o) => s + Number(o.total), 0);
  const ticketMedio = paidOrders.length > 0 ? totalReceita / paidOrders.length : 0;
  const conversao = orders.length > 0 ? (paidOrders.length / orders.length) * 100 : 0;

  function downloadCSV(name: string, rows: (string | number)[][]) {
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${from}_a_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportReceita() {
    downloadCSV("receita-por-dia", [
      ["Data", "Receita (R$)", "Pedidos"],
      ...daily.map((d) => [d.date, d.receita.toFixed(2), d.pedidos]),
      ["TOTAL", totalReceita.toFixed(2), paidOrders.length],
    ]);
  }

  function exportPedidos() {
    downloadCSV("pedidos", [
      ["ID", "Data", "Status", "Canal", "Pago em", "Total (R$)"],
      ...orders.map((o) => [
        o.id,
        new Date(o.created_at).toLocaleString("pt-BR"),
        o.status,
        o.channel ?? "",
        o.paid_at ? new Date(o.paid_at).toLocaleString("pt-BR") : "",
        Number(o.total).toFixed(2),
      ]),
    ]);
  }

  function exportTopProdutos() {
    downloadCSV("top-produtos", [
      ["#", "Produto", "Quantidade", "Receita (R$)"],
      ...topProducts.map((p, i) => [i + 1, p.name, p.quantidade, p.receita.toFixed(2)]),
    ]);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Filtre por período e exporte os dados em CSV.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setPreset(Number(r.key))}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">De</label>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Até</label>
            <input type="date" value={to} min={from} max={today.toISOString().slice(0, 10)}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm" />
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={exportReceita}
              className="rounded-md border border-border px-3 py-2 text-xs hover:border-primary hover:text-primary">
              <i className="fa-solid fa-file-csv mr-1 text-primary" /> Receita por dia
            </button>
            <button onClick={exportPedidos}
              className="rounded-md border border-border px-3 py-2 text-xs hover:border-primary hover:text-primary">
              <i className="fa-solid fa-file-csv mr-1 text-primary" /> Pedidos
            </button>
            <button onClick={exportTopProdutos}
              className="rounded-md border border-border px-3 py-2 text-xs hover:border-primary hover:text-primary">
              <i className="fa-solid fa-file-csv mr-1 text-primary" /> Top produtos
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI icon="fa-dollar-sign" label="Receita" value={fmtBRL(totalReceita)} />
        <KPI icon="fa-receipt" label="Pedidos pagos" value={String(paidOrders.length)} />
        <KPI icon="fa-cart-shopping" label="Ticket médio" value={fmtBRL(ticketMedio)} />
        <KPI icon="fa-percent" label="Conversão" value={`${conversao.toFixed(1)}%`} />
      </div>

      {isLoading ? (
        <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
      ) : (
        <>
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold"><i className="fa-solid fa-chart-line text-primary" /> Receita por dia</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="label" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} formatter={(v: number) => fmtBRL(v)} />
                  <Line type="monotone" dataKey="receita" stroke="#d4af37" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-bold"><i className="fa-solid fa-trophy text-primary" /> Top produtos (receita)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis type="number" stroke="#888" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#888" fontSize={11} width={120} />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="receita" fill="#d4af37" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-bold"><i className="fa-solid fa-chart-pie text-primary" /> Pedidos por status</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                      {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold"><i className="fa-solid fa-store text-primary" /> Receita por canal</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byChannel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="name" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333" }} formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="value" fill="#d4af37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold"><i className="fa-solid fa-list text-primary" /> Top produtos — detalhes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topProducts.map((p, i) => (
                    <tr key={p.name}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 text-right">{p.quantidade}</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{fmtBRL(p.receita)}</td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Sem vendas no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function KPI({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <i className={`fa-solid ${icon} text-2xl text-primary opacity-60`} />
      </div>
    </div>
  );
}