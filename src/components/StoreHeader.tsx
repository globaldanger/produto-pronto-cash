import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";
import { useQuery } from "@tanstack/react-query";
import { StoreSearch } from "@/components/StoreSearch";

export function StoreHeader() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const cartCount = useCart((s) => s.count());
  const toggleCart = useCart((s) => s.toggle);

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
        .select("store_name,store_logo,store_header_image")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b-2 border-primary/60 bg-gradient-to-br from-background to-surface backdrop-blur-xl">
      {settings?.store_header_image && (
        <div className="h-24 w-full overflow-hidden md:h-32">
          <img
            src={settings.store_header_image}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          {settings?.store_logo ? (
            <img src={settings.store_logo} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <i className="fa-solid fa-mobile-screen text-3xl text-primary" />
          )}
          <span className="bg-gradient-to-r from-primary to-yellow-300 bg-clip-text text-2xl font-extrabold text-transparent">
            {settings?.store_name ?? "SmartCell"}
          </span>
        </Link>
        <div className="hidden flex-1 max-w-md mx-6 md:block">
          <StoreSearch />
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <div className="md:hidden">
            <StoreSearch compact />
          </div>
          <button
            onClick={() => toggleCart(true)}
            className="relative rounded-md border border-border px-3 py-2 hover:border-primary hover:text-primary"
            aria-label="Carrinho"
          >
            <i className="fa-solid fa-cart-shopping" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </button>
          {user ? (
            <>
              <Link
                to="/meus-pedidos"
                className="hidden rounded-md border border-border px-3 py-2 hover:border-primary hover:text-primary sm:inline"
              >
                <i className="fa-solid fa-receipt mr-1" /> Pedidos
              </Link>
              <Link to="/admin" className="hidden text-muted-foreground hover:text-primary sm:inline">
                Painel
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}