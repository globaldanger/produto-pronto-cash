import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [prods, cats, orders, paid, pending, lowStock, latest] = await Promise.all([
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
      ]);
      const revenue = (paid.data ?? []).reduce((s, o: { total: number }) => s + Number(o.total), 0);
      return {
        products: prods.count ?? 0,
        categories: cats.count ?? 0,
        orders: orders.count ?? 0,
        revenue,
        pending: pending.count ?? 0,
        lowStock: lowStock.data ?? [],
        latest: latest.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-6">
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

function StatCard({ icon, label, value, link }: { icon: string; label: string; value: number | string; link: string }) {
  return (
    <Link
      to={link as never}
      className="rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
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