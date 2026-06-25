import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { StoreHeader } from "@/components/StoreHeader";
import { CartDrawer } from "@/components/CartDrawer";

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

  const { data: about } = useQuery({
    queryKey: ["store_about_public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("store_name,store_slogan,about_text1,about_text2,about_hero_image,about_gallery,store_address,store_phone,store_whatsapp,store_hours,store_instagram")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-surface to-background py-16">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            {about?.store_name ?? "SmartCell"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            {about?.store_slogan ?? "Capas, películas, carregadores, fones e muito mais. Pagamento via Pix com confirmação instantânea."}
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

      {/* Sobre a loja */}
      {(about?.about_text1 || about?.about_text2 || about?.about_hero_image || (about?.about_gallery?.length ?? 0) > 0) && (
        <section className="border-t border-border bg-surface py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">
              Sobre a <span className="text-primary">nossa loja</span>
            </h2>
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              {about?.about_hero_image && (
                <img
                  src={about.about_hero_image}
                  alt="Nossa loja"
                  className="aspect-video w-full rounded-xl object-cover"
                />
              )}
              <div className="space-y-4 text-muted-foreground">
                {about?.about_text1 && <p className="whitespace-pre-line text-base leading-relaxed">{about.about_text1}</p>}
                {about?.about_text2 && <p className="whitespace-pre-line text-base leading-relaxed">{about.about_text2}</p>}
              </div>
            </div>
            {(about?.about_gallery?.length ?? 0) > 0 && (
              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {about!.about_gallery!.map((url) => (
                  <img key={url} src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-border bg-background py-8 text-center text-sm text-muted-foreground">
        {about?.store_address && <p className="mb-1">{about.store_address}</p>}
        {about?.store_phone && <p className="mb-1">Tel: {about.store_phone}{about.store_hours ? ` • ${about.store_hours}` : ""}</p>}
        <p>© {new Date().getFullYear()} {about?.store_name ?? "SmartCell"}. Todos os direitos reservados.</p>
      </footer>
      <CartDrawer />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const cover = product.images?.[0];
  const price = product.sale_price ?? product.price;
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary">
      <Link to="/produto/$id" params={{ id: product.id }} className="block">
        <div className="aspect-square overflow-hidden bg-surface">
          {cover ? (
            <img src={cover} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
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
              <span className="text-xs text-muted-foreground line-through">R$ {product.price.toFixed(2)}</span>
            )}
            <span className="text-lg font-bold text-primary">R$ {price.toFixed(2)}</span>
          </div>
        </div>
      </Link>
      <button
        disabled={product.stock <= 0}
        onClick={() => {
          add({ productId: product.id, name: product.name, image: cover ?? null, price, stock: product.stock });
          toast.success("Adicionado ao carrinho");
        }}
        className="m-3 mt-0 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <i className="fa-solid fa-cart-plus mr-1" /> {product.stock <= 0 ? "Esgotado" : "Adicionar"}
      </button>
    </div>
  );
}
