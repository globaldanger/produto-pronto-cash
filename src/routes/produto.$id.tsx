import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";
import { StoreHeader } from "@/components/StoreHeader";
import { CartDrawer } from "@/components/CartDrawer";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({ meta: [{ title: "Produto — SmartCell" }] }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Produto não encontrado</h1>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          ← Voltar para a loja
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div>
        <h1 className="text-xl font-bold">Erro ao carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  images: string[];
};

function ProductPage() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [qty, setQty] = useState(1);
  const [favId, setFavId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const add = useCart((s) => s.add);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,sale_price,stock,images")
        .eq("id", id)
        .eq("active", true)
        .maybeSingle();
      if (error) console.error(error);
      setProduct(data as Product | null);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: f } = await supabase.from("favorites").select("id").eq("user_id", u.user.id).eq("product_id", id).maybeSingle();
      setFavId(f?.id ?? null);
    })();
  }, [id]);

  async function toggleFav() {
    if (!userId) return toast.error("Faça login para favoritar");
    if (favId) {
      await supabase.from("favorites").delete().eq("id", favId);
      setFavId(null);
      toast.success("Removido dos favoritos");
    } else {
      const { data, error } = await supabase.from("favorites").insert({ user_id: userId, product_id: id }).select("id").single();
      if (error) return toast.error(error.message);
      setFavId(data.id);
      toast.success("Adicionado aos favoritos");
    }
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  if (!product) throw notFound();

  const price = product.sale_price ?? product.price;
  const cover = product.images[selected];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-card">
            {cover ? (
              <img src={cover} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <i className="fa-solid fa-image text-5xl" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setSelected(i)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === selected ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <button
              onClick={toggleFav}
              className={`grid h-11 w-11 place-items-center rounded-full border transition ${favId ? "border-destructive bg-destructive/10 text-destructive" : "border-border hover:border-destructive hover:text-destructive"}`}
              aria-label="Favoritar"
              title={favId ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <i className={`fa-${favId ? "solid" : "regular"} fa-heart`} />
            </button>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            {product.sale_price && (
              <span className="text-lg text-muted-foreground line-through">
                R$ {product.price.toFixed(2)}
              </span>
            )}
            <span className="text-4xl font-bold text-primary">R$ {price.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}
          </p>
          {product.description && (
            <p className="mt-6 whitespace-pre-line text-base leading-relaxed">
              {product.description}
            </p>
          )}
          {product.stock > 0 && (
            <div className="mt-8 flex items-center gap-3">
              <label className="text-sm font-medium">Quantidade:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="h-9 w-9 rounded border border-border hover:border-primary"
                >−</button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  className="h-9 w-9 rounded border border-border hover:border-primary"
                >+</button>
              </div>
            </div>
          )}
          <button
            disabled={product.stock <= 0}
            onClick={() => {
              add({ productId: product.id, name: product.name, image: product.images[0] ?? null, price, stock: product.stock }, qty);
              toast.success(`${qty}× adicionado ao carrinho`);
            }}
            className="mt-4 w-full rounded-lg bg-primary py-4 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <i className="fa-solid fa-cart-shopping mr-2" />
            {product.stock <= 0 ? "Esgotado" : "Adicionar ao carrinho"}
          </button>
        </div>
      </main>
      <CartDrawer />
    </div>
  );
}