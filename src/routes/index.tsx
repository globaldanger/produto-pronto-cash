import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { StoreHeader } from "@/components/StoreHeader";
import { CartDrawer } from "@/components/CartDrawer";
import { useActiveTheme, ThemeDecorationLayer } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartCell — Tudo para seu Celular" },
      { name: "description", content: "Capas, películas, carregadores e acessórios com entrega rápida. Pagamento via Pix." },
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
  tags?: string[] | null;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Index() {
  const theme = useActiveTheme();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "price_asc" | "price_desc">("recent");

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
        .select("id,name,description,price,sale_price,stock,images,category_id,featured,active,created_at,tags")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const featured = products.filter((p) => p.featured).slice(0, 8);
  const onSale = products.filter((p) => p.sale_price && p.sale_price < p.price).slice(0, 4);
  const newest = products.slice(0, 8);

  const visible = useMemo(() => {
    const base = activeCat ? products.filter((p) => p.category_id === activeCat) : products;
    const list = [...base];
    const value = (p: Product) => p.sale_price ?? p.price;
    if (sort === "price_asc") list.sort((a, b) => value(a) - value(b));
    if (sort === "price_desc") list.sort((a, b) => value(b) - value(a));
    return list;
  }, [products, activeCat, sort]);

  const gridProducts = activeCat || sort !== "recent" ? visible : featured.length > 0 ? featured : products;

  const { data: about } = useQuery({
    queryKey: ["store_about_public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("store_name,store_slogan,about_text1,about_text2,about_hero_image,about_gallery,store_address,store_phone,store_whatsapp,store_hours,store_instagram,home_banners,footer_text,faq,home_hero_cta,about_stat1_number,about_stat1_label,about_stat2_number,about_stat2_label,about_stat3_number,about_stat3_label,about_stat4_number,about_stat4_label")
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const banners: { image?: string; title?: string; subtitle?: string; cta?: string; link?: string }[] =
    Array.isArray(about?.home_banners) ? (about?.home_banners as any) : [];
  const stats = [
    { n: about?.about_stat1_number, l: about?.about_stat1_label },
    { n: about?.about_stat2_number, l: about?.about_stat2_label },
    { n: about?.about_stat3_number, l: about?.about_stat3_label },
    { n: about?.about_stat4_number, l: about?.about_stat4_label },
  ].filter((s) => s.n);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />

      {/* HERO EDITORIAL */}
      <section className="relative overflow-hidden border-b border-border/60">
        <ThemeDecorationLayer theme={theme} />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 20%, color-mix(in oklab, var(--theme-accent) 40%, transparent), transparent 65%), radial-gradient(50% 50% at 80% 80%, color-mix(in oklab, var(--theme-accent-glow) 25%, transparent), transparent 60%)",
          }}
        />
        <div className="container relative mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div>
            <div className="eyebrow mb-5">
              <span className="mr-2 inline-block h-1 w-8 align-middle" style={{ background: "var(--theme-accent)" }} />
              {theme?.banner_text ?? "Loja oficial de acessórios"}
            </div>
            <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
              Seu celular merece <span className="gold-gradient">o melhor</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {about?.store_slogan ??
                "Curadoria de capas, películas, carregadores e som. Pagamento via Pix ou cartão, com confirmação instantânea."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#produtos"
                className="rounded-full theme-accent-bg px-6 py-3 text-sm font-semibold shadow-lg transition hover:brightness-110"
              >
              <i className="fa-solid fa-bolt mr-2" /> {about?.home_hero_cta || "Ver produtos"}
              </a>
              <Link
                to="/rastrear"
                className="rounded-full border border-border/70 px-6 py-3 text-sm font-semibold hover:border-primary"
              >
                <i className="fa-solid fa-truck mr-2" /> Rastrear pedido
              </Link>
            </div>
            {stats.length > 0 && (
              <div className="mt-10 grid max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map((s, i) => (
                  <div key={i}>
                    <div className="font-display text-3xl theme-accent-text">{s.n}</div>
                    <div className="eyebrow mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bento hero grid */}
          <div className="grid h-[420px] grid-cols-6 grid-rows-6 gap-3 md:h-[520px]">
            {featured.slice(0, 5).map((p, i) => {
              const layouts = [
                "col-span-4 row-span-4",
                "col-span-2 row-span-2",
                "col-span-2 row-span-2",
                "col-span-3 row-span-2",
                "col-span-3 row-span-2",
              ];
              return (
                <Link
                  key={p.id}
                  to="/produto/$id"
                  params={{ id: p.id }}
                  className={`${layouts[i]} card-hover group relative overflow-hidden rounded-2xl border border-border/60 bg-card`}
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-muted-foreground">
                      <i className="fa-solid fa-image" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
                    <div className="text-[10px] uppercase tracking-widest theme-accent-text">
                      {p.sale_price ? "Oferta" : "Destaque"}
                    </div>
                    <div className="line-clamp-1 text-xs font-semibold text-white sm:text-sm">{p.name}</div>
                    <div className="text-sm font-bold text-white">R$ {fmt(p.sale_price ?? p.price)}</div>
                  </div>
                </Link>
              );
            })}
            {featured.length === 0 && (
              <div className="col-span-6 row-span-6 flex items-center justify-center rounded-2xl border border-dashed border-border/60 text-muted-foreground">
                Cadastre produtos em destaque
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MARQUEE de benefícios */}
      <section className="border-b border-border/60 bg-surface/50 py-4 overflow-hidden">
        <div className="marquee whitespace-nowrap text-sm text-muted-foreground">
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex shrink-0 items-center gap-12">
              <span><i className="fa-solid fa-shield-halved mr-2 theme-accent-text" /> Compra 100% segura</span>
              <span><i className="fa-solid fa-truck-fast mr-2 theme-accent-text" /> Entrega rápida</span>
              <span><i className="fa-solid fa-money-bill-transfer mr-2 theme-accent-text" /> Pix ou cartão</span>
              <span><i className="fa-solid fa-medal mr-2 theme-accent-text" /> Programa fidelidade</span>
              <span><i className="fa-solid fa-store mr-2 theme-accent-text" /> Retirada na loja</span>
              <span><i className="fa-solid fa-headset mr-2 theme-accent-text" /> Atendimento humano</span>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIAS */}
      {categories.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-16">
          <SectionHeader eyebrow="Navegue" title="Categorias" />
          <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {categories.map((c) => (
              <a
                key={c.id}
                href={`/#produtos`}
                className="card-hover group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 theme-accent-text text-xl">
                  <i className={`fa-solid ${c.icon ?? "fa-tag"}`} />
                </div>
                <span className="text-center text-xs font-medium">{c.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* BANNERS CMS */}
      {banners.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 pb-8">
          <div className="grid gap-4 md:grid-cols-2">
            {banners.slice(0, 2).map((b, i) => (
              <a
                key={i}
                href={b.link ?? "#"}
                className="card-hover group relative flex h-56 overflow-hidden rounded-2xl border border-border/60 bg-card"
              >
                {b.image && <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105" />}
                <div className="relative flex flex-1 flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6">
                  <div className="eyebrow mb-2 theme-accent-text">Coleção</div>
                  {b.title && <div className="font-display text-3xl text-white">{b.title}</div>}
                  {b.subtitle && <div className="mt-1 text-sm text-white/80">{b.subtitle}</div>}
                  {b.cta && (
                    <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-white">
                      {b.cta} <i className="fa-solid fa-arrow-right" />
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* PRODUTOS */}
      <section id="produtos" className="container mx-auto max-w-7xl px-4 py-16">
        <SectionHeader eyebrow="Curadoria" title={featured.length > 0 ? "Em destaque" : "Nossos produtos"} />
        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-border/60 bg-card" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <i className="fa-solid fa-box-open mb-3 text-4xl text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {(featured.length > 0 ? featured : products).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* OFERTAS */}
      {onSale.length > 0 && (
        <section className="border-y border-border/60 bg-gradient-to-br from-surface/70 to-background py-16">
          <div className="container mx-auto max-w-7xl px-4">
            <SectionHeader eyebrow="Ofertas relâmpago" title="Preços que dão inveja" />
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {onSale.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* NEWEST */}
      {newest.length > 0 && featured.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-16">
          <SectionHeader eyebrow="Novidades" title="Recém chegados" />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {newest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* SOBRE */}
      {(about?.about_text1 || about?.about_hero_image || (about?.about_gallery?.length ?? 0) > 0) && (
        <section className="border-t border-border/60 bg-surface/30 py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              {about?.about_hero_image ? (
                <img src={about.about_hero_image} alt="Nossa loja" className="aspect-[4/5] w-full rounded-3xl object-cover" />
              ) : (
                <div className="aspect-[4/5] w-full rounded-3xl border border-border/60 bg-card" />
              )}
              <div>
                <div className="eyebrow mb-4">Nossa história</div>
                <h2 className="font-display text-4xl md:text-5xl">
                  Feito com cuidado <span className="gold-gradient">de verdade</span>
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
                  {about?.about_text1 && <p className="whitespace-pre-line">{about.about_text1}</p>}
                  {about?.about_text2 && <p className="whitespace-pre-line">{about.about_text2}</p>}
                </div>
                {about?.store_whatsapp && (
                  <a href={`https://wa.me/${String(about.store_whatsapp).replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                    className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold hover:border-primary">
                    <i className="fa-brands fa-whatsapp text-green-400" /> Falar com a loja
                  </a>
                )}
              </div>
            </div>
            {(about?.about_gallery?.length ?? 0) > 0 && (
              <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {about!.about_gallery!.map((url: string) => (
                  <img key={url} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ */}
      {Array.isArray(about?.faq) && about!.faq.length > 0 && (
        <section className="container mx-auto max-w-4xl px-4 py-20">
          <SectionHeader eyebrow="Ajuda" title="Perguntas frequentes" center />
          <div className="mt-8 space-y-3">
            {(about!.faq as { q: string; a: string }[]).map((item, i) => (
              <details key={i} className="group rounded-xl border border-border/60 bg-card p-5">
                <summary className="cursor-pointer list-none font-semibold flex items-center justify-between">
                  {item.q}
                  <i className="fa-solid fa-plus text-xs theme-accent-text group-open:hidden" />
                  <i className="fa-solid fa-minus text-xs theme-accent-text hidden group-open:inline" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-background pt-16 pb-8">
        <div className="container mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-4">
          <div>
            <div className="font-display text-3xl gold-gradient">{about?.store_name ?? "SmartCell"}</div>
            <p className="mt-3 text-sm text-muted-foreground">{about?.store_slogan ?? "Acessórios com curadoria para seu celular."}</p>
          </div>
          <div>
            <div className="eyebrow mb-3">Loja</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary">Início</Link></li>
              <li><Link to="/rastrear" className="hover:text-primary">Rastrear pedido</Link></li>
              <li><Link to="/meus-pedidos" className="hover:text-primary">Meus pedidos</Link></li>
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-3">Contato</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {about?.store_address && <li><i className="fa-solid fa-location-dot mr-2 theme-accent-text" />{about.store_address}</li>}
              {about?.store_phone && <li><i className="fa-solid fa-phone mr-2 theme-accent-text" />{about.store_phone}</li>}
              {about?.store_hours && <li><i className="fa-solid fa-clock mr-2 theme-accent-text" />{about.store_hours}</li>}
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-3">Siga a gente</div>
            <div className="flex gap-2">
              {about?.store_instagram && (
                <a href={about.store_instagram} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 hover:border-primary theme-accent-text">
                  <i className="fa-brands fa-instagram" />
                </a>
              )}
              {about?.store_whatsapp && (
                <a href={`https://wa.me/${String(about.store_whatsapp).replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 hover:border-primary theme-accent-text">
                  <i className="fa-brands fa-whatsapp" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          {about?.footer_text ?? `© ${new Date().getFullYear()} ${about?.store_name ?? "SmartCell"}. Todos os direitos reservados.`}
        </div>
      </footer>
      <CartDrawer />
    </div>
  );
}

function SectionHeader({ eyebrow, title, center }: { eyebrow: string; title: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="mt-2 font-display text-4xl md:text-5xl">{title}</h2>
      <div className={`hairline mt-4 ${center ? "mx-auto w-24" : "w-24"}`} />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const cover = product.images?.[0];
  const price = product.sale_price ?? product.price;
  const discount = product.sale_price ? Math.round((1 - product.sale_price / product.price) * 100) : 0;
  return (
    <div className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
      <Link to="/produto/$id" params={{ id: product.id }} className="block">
        <div className="relative aspect-square overflow-hidden bg-surface">
          {cover ? (
            <img src={cover} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-muted-foreground"><i className="fa-solid fa-image" /></div>
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.featured && <span className="rounded-full theme-accent-bg px-2 py-0.5 text-[10px] font-bold shadow">DESTAQUE</span>}
            {discount > 0 && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white shadow">-{discount}%</span>}
            {(product.tags ?? []).slice(0, 2).map((t) => (
              <span key={t} className="rounded-full border border-white/30 bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">{t}</span>
            ))}
          </div>
          {product.stock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-bold text-white">ESGOTADO</div>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium">{product.name}</h3>
          <div className="mt-2 flex items-baseline gap-2">
            {product.sale_price && (
              <span className="text-xs text-muted-foreground line-through">R$ {fmt(product.price)}</span>
            )}
            <span className="font-display text-xl theme-accent-text">R$ {fmt(price)}</span>
          </div>
        </div>
      </Link>
      <button
        disabled={product.stock <= 0}
        onClick={() => {
          add({ productId: product.id, name: product.name, image: cover ?? null, price, stock: product.stock });
          toast.success("Adicionado ao carrinho");
        }}
        className="m-3 mt-0 rounded-lg border border-border/70 py-2 text-xs font-semibold transition hover:theme-accent-bg hover:border-transparent disabled:opacity-50"
      >
        <i className="fa-solid fa-cart-plus mr-1" /> {product.stock <= 0 ? "Esgotado" : "Adicionar"}
      </button>
    </div>
  );
}
