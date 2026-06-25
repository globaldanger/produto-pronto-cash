import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — SmartCell" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ products: 0, orders: 0, pending: 0 });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) {
        const [prods, orders, pending] = await Promise.all([
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);
        setStats({
          products: prods.count ?? 0,
          orders: orders.count ?? 0,
          pending: pending.count ?? 0,
        });
      }
    })();
  }, []);

  if (isAdmin === null) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <i className="fa-solid fa-lock mb-4 text-4xl text-destructive" />
          <h1 className="mb-2 text-xl font-bold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta não tem permissão de administrador. Peça ao dono do sistema
            para promover seu usuário a admin.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary hover:underline">
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-mobile-screen text-2xl text-primary" />
            <span className="text-xl font-bold">SmartCell Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
              Ver loja
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Painel</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Produtos" value={stats.products} icon="fa-box" />
          <StatCard label="Pedidos" value={stats.orders} icon="fa-receipt" />
          <StatCard label="Pendentes" value={stats.pending} icon="fa-clock" />
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <i className="fa-solid fa-tools mb-3 text-3xl text-primary" />
          <h2 className="mb-2 text-lg font-semibold">Etapa 2 em construção</h2>
          <p className="text-sm text-muted-foreground">
            CRUD de produtos, upload de imagens e gestão de pedidos chegam na próxima
            entrega.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
        <i className={`fa-solid ${icon} text-3xl text-primary opacity-60`} />
      </div>
    </div>
  );
}