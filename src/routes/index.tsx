import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartCell — Tudo para seu Celular" },
      { name: "description", content: "Capas, películas, carregadores e acessórios com entrega rápida. Pagamento via Pix." },
      { property: "og:title", content: "SmartCell — Tudo para seu Celular" },
      { property: "og:description", content: "Capas, películas, carregadores e acessórios com entrega rápida." },
    ],
  }),
  component: Index,
});

type Category = { id: string; name: string; slug: string; icon: string | null };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  category_id: string | null;
  images: string[];
  featured: boolean;
};

function Index() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null),
    );
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,icon")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const featured = products.filter((p) => p.featured).slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-primary/60 bg-gradient-to-br from-background to-surface backdrop-blur-xl">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <i className="fa-solid fa-mobile-screen text-3xl text-primary" />
            <span className="bg-gradient-to-r from-primary to-yellow-300 bg-clip-text text-2xl font-extrabold text-transparent">
              SmartCell
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
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

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-surface to-background py-16">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            Tudo para o seu <span className="text-primary">celular</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Capas, películas, carregadores, fones e muito mais. Pagamento via Pix com
            confirmação instantânea.
          </p>
        </div>
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-bold">Categorias</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((c) => (
              <div
                key={c.id}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary"
              >
                <i className={`fa-solid ${c.icon ?? "fa-tag"} text-3xl text-primary`} />
                <span className="text-center text-sm font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Produtos */}
      <section className="container mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">
          {featured.length > 0 ? "Destaques" : "Nossos produtos"}
        </h2>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando produtos...</p>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <i className="fa-solid fa-box-open mb-3 text-4xl text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum produto cadastrado ainda. Acesse o painel admin para cadastrar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {(featured.length > 0 ? featured : products).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 border-t border-border bg-surface py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} SmartCell. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const cover = product.images?.[0];
  const price = product.sale_price ?? product.price;
  return (
    <Link
      to="/produto/$id"
      params={{ id: product.id }}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary"
    >
      <div className="aspect-square overflow-hidden bg-surface">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <i className="fa-solid fa-image text-4xl" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          {product.sale_price && (
            <span className="text-xs text-muted-foreground line-through">
              R$ {product.price.toFixed(2)}
            </span>
          )}
          <span className="text-lg font-bold text-primary">R$ {price.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  );
}
