import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, type Permission } from "@/lib/permissions";
import { AdminSearch } from "@/components/AdminSearch";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — SmartCell" }] }),
  component: AdminLayout,
});

const NAV: { to: string; icon: string; label: string; exact?: boolean; perm: Permission }[] = [
  { to: "/admin", icon: "fa-tachometer-alt", label: "Dashboard", exact: true, perm: "dashboard" },
  { to: "/admin/pdv", icon: "fa-cash-register", label: "PDV (Balcão)", perm: "pdv" },
  { to: "/admin/sales", icon: "fa-dollar-sign", label: "Vendas", perm: "sales" },
  { to: "/admin/products", icon: "fa-box", label: "Produtos", perm: "products" },
  { to: "/admin/media", icon: "fa-images", label: "Mídia", perm: "media" },
  { to: "/admin/categories", icon: "fa-tags", label: "Categorias", perm: "categories" },
  { to: "/admin/orders", icon: "fa-shopping-cart", label: "Pedidos", perm: "orders.view" },
  { to: "/admin/coupons", icon: "fa-ticket", label: "Cupons", perm: "coupons" },
  { to: "/admin/reports", icon: "fa-chart-column", label: "Relatórios", perm: "reports" },
  { to: "/admin/themes", icon: "fa-palette", label: "Temas festivos", perm: "themes" },
  { to: "/admin/finance", icon: "fa-chart-line", label: "Financeiro", perm: "finance" },
  { to: "/admin/content", icon: "fa-pen-ruler", label: "Conteúdo do site", perm: "content" },
  { to: "/admin/users", icon: "fa-users", label: "Usuários", perm: "users" },
  { to: "/admin/backup", icon: "fa-download", label: "Backup / Import", perm: "backup" },
  { to: "/admin/about", icon: "fa-circle-info", label: "Sobre", perm: "content" },
  { to: "/admin/settings", icon: "fa-cog", label: "Configurações", perm: "settings" },
];

function AdminLayout() {
  const { role, loading, can, isStaff } = usePermissions();
  const [name, setName] = useState("Administrador");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.user.id)
        .maybeSingle();
      if (prof?.full_name) setName(prof.full_name);
      else if (u.user.email) setName(u.user.email);
    })();
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const visibleNav = useMemo(() => NAV.filter((n) => can(n.perm)), [role]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <i className="fa-solid fa-lock mb-4 text-4xl text-destructive" />
          <h1 className="mb-2 text-xl font-bold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta não tem permissão para acessar o painel.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary hover:underline">
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    );
  }

  const current = visibleNav.find((n) =>
    n.exact ? pathname === n.to : pathname.startsWith(n.to),
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r-2 border-primary/60 bg-gradient-to-b from-background to-surface transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <i className="fa-solid fa-mobile-screen text-2xl text-primary" />
          <div>
            <div className="font-bold leading-tight">SmartCell</div>
            <div className="text-xs text-muted-foreground">Painel Admin</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {visibleNav.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5 text-center`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground capitalize">{role}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 rounded-md border border-border px-3 py-2 text-center text-xs hover:border-primary"
            >
              Loja
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="flex-1 rounded-md border border-border px-3 py-2 text-xs hover:border-destructive hover:text-destructive"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-md border border-border p-2 lg:hidden"
              aria-label="Menu"
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div className="flex items-center gap-2 text-lg font-bold">
              <i className={`fa-solid ${current?.icon ?? "fa-gauge"} text-primary`} />
              <span>{current?.label ?? "Admin"}</span>
            </div>
          </div>
          <div className="flex-1 max-w-md ml-4 hidden md:block"><AdminSearch /></div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <div className="mb-4 md:hidden"><AdminSearch /></div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}