import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";
import { useQuery } from "@tanstack/react-query";
import { StoreSearch } from "@/components/StoreSearch";
import { useActiveTheme, ThemeBanner } from "@/lib/theme";

export function StoreHeader() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const cartCount = useCart((s) => s.count());
  const toggleCart = useCart((s) => s.toggle);
  const theme = useActiveTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null),
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user ? { id: sess.user.id, email: sess.user.email ?? undefined } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: settings } = useQuery({
    queryKey: ["store_settings_public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("store_name,store_slogan,store_logo,store_header_image")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile_menu", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: pointsBalance = 0 } = useQuery({
    queryKey: ["points_menu", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_points")
        .select("points")
        .eq("user_id", user!.id);
      return (data ?? []).reduce((s, r) => s + Number(r.points || 0), 0);
    },
  });

  const name = profile?.full_name || user?.email?.split("@")[0] || "";
  const initial = (name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <ThemeBanner theme={theme} />
      {settings?.store_header_image && (
        <div className="relative h-20 w-full overflow-hidden md:h-28">
          <img src={settings.store_header_image} alt="" className="h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}
      <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3 group">
          {settings?.store_logo ? (
            <img src={settings.store_logo} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-card theme-accent-text">
              <i className="fa-solid fa-mobile-screen text-xl" />
            </div>
          )}
          <div className="leading-tight">
            <div className="font-display text-2xl gold-gradient">
              {settings?.store_name ?? "SmartCell"}
            </div>
            {settings?.store_slogan && (
              <div className="eyebrow -mt-1 hidden md:block">{settings.store_slogan}</div>
            )}
          </div>
        </Link>
        <div className="hidden max-w-md flex-1 md:block">
          <StoreSearch />
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <div className="md:hidden">
            <StoreSearch compact />
          </div>
          <Link
            to="/rastrear"
            className="hidden h-10 items-center gap-2 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary sm:inline-flex"
          >
            <i className="fa-solid fa-magnifying-glass-location" /> Rastrear pedido
          </Link>
          <button
            onClick={() => toggleCart(true)}
            className="relative flex h-10 items-center gap-2 rounded-lg border border-border/70 px-3 transition hover:border-primary hover:text-primary"
            aria-label="Carrinho"
          >
            <i className="fa-solid fa-cart-shopping" />
            <span className="hidden text-xs font-medium sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full theme-accent-bg px-1 text-[10px] font-bold shadow-lg">
                {cartCount}
              </span>
            )}
          </button>
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-10 items-center gap-2 rounded-lg border border-border/70 pl-1 pr-3 transition hover:border-primary"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md theme-accent-bg text-sm font-bold">
                  {initial}
                </span>
                <span className="hidden max-w-[120px] truncate text-xs font-semibold md:inline">
                  {name}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-muted-foreground transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                  <div className="border-b border-border/60 bg-gradient-to-br from-card to-surface p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg theme-accent-bg text-lg font-bold">
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{name}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2">
                      <span className="eyebrow">Pontos fidelidade</span>
                      <span className="text-lg font-bold theme-accent-text">{pointsBalance}</span>
                    </div>
                  </div>
                  <div className="p-1">
                    <MenuItem to="/meus-pedidos" icon="fa-receipt" label="Meus pedidos" desc="Acompanhe suas compras" onClick={() => setMenuOpen(false)} />
                    <MenuItem to="/minha-conta/favoritos" icon="fa-heart" label="Favoritos" desc="Produtos salvos" onClick={() => setMenuOpen(false)} />
                    <MenuItem to="/minha-conta/enderecos" icon="fa-location-dot" label="Meus endereços" desc="Entrega mais rápida" onClick={() => setMenuOpen(false)} />
                    <MenuItem to="/minha-conta/perfil" icon="fa-user" label="Meu perfil" desc="Dados pessoais" onClick={() => setMenuOpen(false)} />
                    <MenuItem to="/rastrear" icon="fa-truck" label="Rastrear pedido" desc="Consultar por código" onClick={() => setMenuOpen(false)} />
                  </div>
                  <div className="border-t border-border/60 p-1">
                    <MenuItem to="/admin" icon="fa-shield-halved" label="Painel admin" desc="Área da equipe" onClick={() => setMenuOpen(false)} />
                    <button
                      onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                      <i className="fa-solid fa-right-from-bracket w-5 text-center" />
                      <span className="font-medium">Sair da conta</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex h-10 items-center gap-2 rounded-lg theme-accent-bg px-4 text-sm font-semibold shadow-md transition hover:brightness-110"
            >
              <i className="fa-solid fa-user" /> Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function MenuItem({ to, icon, label, desc, onClick }: { to: string; icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-surface"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 theme-accent-text">
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <i className="fa-solid fa-chevron-right text-[10px] text-muted-foreground" />
    </Link>
  );
}