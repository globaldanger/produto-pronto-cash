import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";

/** Barra de navegação inferior (somente mobile) */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cartCount = useCart((s) => s.count());
  const toggleCart = useCart((s) => s.toggle);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLogged(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setLogged(!!sess?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const item = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition ${
      active ? "theme-accent-text" : "text-muted-foreground"
    }`;

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden />
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <Link to="/" className={item(pathname === "/")}>
          <i className="fa-solid fa-house text-lg" />
          Início
        </Link>
        <Link to="/rastrear" className={item(pathname.startsWith("/rastrear"))}>
          <i className="fa-solid fa-truck text-lg" />
          Rastrear
        </Link>
        <button onClick={() => toggleCart(true)} className={item(false)} aria-label="Carrinho">
          <span className="relative">
            <i className="fa-solid fa-cart-shopping text-lg" />
            {cartCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full theme-accent-bg px-1 text-[9px] font-bold">
                {cartCount}
              </span>
            )}
          </span>
          Carrinho
        </button>
        <Link
          to={logged ? "/conta" : "/auth"}
          search={logged ? ({ tab: "orders" } as never) : undefined}
          className={item(pathname.startsWith("/conta") || pathname.startsWith("/auth"))}
        >
          <i className="fa-solid fa-user text-lg" />
          {logged ? "Conta" : "Entrar"}
        </Link>
      </nav>
    </>
  );
}