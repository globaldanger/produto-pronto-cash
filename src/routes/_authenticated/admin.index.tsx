import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAID_STATUSES = ["paid", "shipped", "delivered"];

const QUICK_ACTIONS = [
  { to: "/admin/pdv", icon: "fa-cash-register", label: "Nova venda (PDV)" },
  { to: "/admin/products", icon: "fa-plus", label: "Novo produto" },
  { to: "/admin/service", icon: "fa-screwdriver-wrench", label: "Nova ordem de serviço" },
  { to: "/admin/customers", icon: "fa-address-book", label: "Clientes" },
  { to: "/admin/reports", icon: "fa-chart-column", label: "Relatórios" },
];

function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 29);
      since.setHours(0, 0, 0, 0);

      const [prods, cats, orders, paid, pending, lowStock, latest, recent, customers, services] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total").eq("status", "paid"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("id,name,stock").lt("stock", 5).order("stock").limit(5),
        supabase
          .from("orders")
          .select("id,customer_name,total,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("orders")
          .select("total,status,created_at,channel")
          .gte("created_at", since.toISOString()),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase
          .from("service_orders")
          .select("*", { count: "exact", head: true })
          .not("status", "in", '("entregue","cancelado")'),
      ]);
      const revenue = (paid.data ?? []).reduce((s, o: { total: number }) => s + Number(o.total), 0);

      const recentRows = (recent.data ?? []).filter((o: any) => PAID_STATUSES.includes(o.status));
      const dayKey = (d: Date) => d.toISOString().slice(0, 10);
      const buckets: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets[dayKey(d)] = 0;
      }
      for (const o of recentRows) {
        const k = dayKey(new Date(o.created_at));
        if (k in buckets) buckets[k] += Number(o.total);
      }
      const series = Object.entries(buckets).map(([date, total]) => ({
        date,
        label: date.slice(8, 10) + "/" + date.slice(5, 7),
        total,
      }));

      const todayKey = dayKey(new Date());
      const today = buckets[todayKey] ?? 0;
      const last7 = series.slice(-7).reduce((s, r) => s + r.total, 0);
      const prev7 = series.slice(-14, -7).reduce((s, r) => s + r.total, 0);
      const growth = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null;
      const ticket = recentRows.length ? recentRows.reduce((s, o: any) => s + Number(o.total), 0) / recentRows.length : 0;
      const online = recentRows.filter((o: any) => o.channel !== "pdv").length;

      return {
        products: prods.count ?? 0,
        categories: cats.count ?? 0,
        orders: orders.count ?? 0,
        revenue,
        pending: pending.count ?? 0,
        lowStock: lowStock.data ?? [],
        latest: latest.data ?? [],
        series,
        today,
        last7,
        growth,
        ticket,
        online,
        pdv: recentRows.length - online,
        customers: customers.count ?? 0,
        services: services.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to as never}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary"
          >
            <i className={`fa-solid ${a.icon}`} /> {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="fa-sun" label="Vendas hoje" value={fmtBRL(data?.today ?? 0)} link="/admin/sales" />
        <StatCard
          icon="fa-arrow-trend-up"
          label="Últimos 7 dias"
          value={fmtBRL(data?.last7 ?? 0)}
          hint={
            data?.growth == null
              ? undefined
              : `${data.growth >= 0 ? "+" : ""}${data.growth.toFixed(0)}% vs. semana anterior`
          }
          positive={(data?.growth ?? 0) >= 0}
          link="/admin/reports"
        />
        <StatCard icon="fa-receipt" label="Ticket médio (30d)" value={fmtBRL(data?.ticket ?? 0)} link="/admin/reports" />
        <StatCard
          icon="fa-hourglass-half"
          label="Pedidos pendentes"
          value={data?.pending ?? 0}
          hint={data?.pending ? "Aguardando pagamento" : "Tudo em dia"}
          positive={!data?.pending}
          link="/admin/orders"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <i className="fa-solid fa-chart-area text-primary" /> Receita dos últimos 30 dias
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.series ?? []} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" interval={4} />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(v: number) => fmtBRL(Number(v))}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <MiniStat label="Vendas online (30d)" value={data?.online ?? 0} />
          <MiniStat label="Vendas no balcão (30d)" value={data?.pdv ?? 0} />
          <MiniStat label="Clientes cadastrados" value={data?.customers ?? 0} />
          <MiniStat label="OS em aberto" value={data?.services ?? 0} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="fa-box" label="Produtos" value={data?.products ?? 0} link="/admin/products" />
        <StatCard icon="fa-tags" label="Categorias" value={data?.categories ?? 0} link="/admin/categories" />
        <StatCard icon="fa-shopping-cart" label="Pedidos" value={data?.orders ?? 0} link="/admin/orders" />
        <StatCard icon="fa-dollar-sign" label="Receita (pago)" value={fmtBRL(data?.revenue ?? 0)} link="/admin/finance" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Estoque baixo" icon="fa-triangle-exclamation">
          {data && data.lowStock.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="rounded bg-destructive/15 px-2 py-1 text-xs font-bold text-destructive">
                    {p.stock} un.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty msg="Sem alertas de estoque" />
          )}
        </Card>
        <Card title="Últimos pedidos" icon="fa-receipt">
          {data && data.latest.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.latest.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.customer_name ?? "Cliente"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{fmtBRL(Number(o.total))}</div>
                    <div className="text-xs text-muted-foreground">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty msg="Nenhum pedido ainda" />
          )}
          <Link to="/admin/orders" className="mt-3 block text-center text-xs text-primary hover:underline">
            Ver todos →
          </Link>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold">{value}</div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  link,
  hint,
  positive,
}: {
  icon: string;
  label: string;
  value: number | string;
  link: string;
  hint?: string;
  positive?: boolean;
}) {
  return (
    <Link
      to={link as never}
      className="rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold">{value}</p>
          {hint && (
            <p className={`mt-1 text-[11px] font-medium ${positive ? "text-success" : "text-destructive"}`}>{hint}</p>
          )}
        </div>
        <i className={`fa-solid ${icon} text-3xl text-primary opacity-60`} />
      </div>
    </Link>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold">
        <i className={`fa-solid ${icon} text-primary`} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{msg}</p>;
}