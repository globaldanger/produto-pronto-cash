import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Product = { id: string; name: string; price: number; sale_price: number | null; images: string[] };

export function StoreSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    if (!open) return;
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const term = `%${q.trim()}%`;
      const { data } = await supabase
        .from("products")
        .select("id,name,price,sale_price,images")
        .eq("active", true)
        .or(`name.ilike.${term},description.ilike.${term}`)
        .limit(10);
      setResults((data ?? []) as Product[]);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  if (compact && !open) {
    return (
      <button
        aria-label="Buscar"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-3 py-2 hover:border-primary hover:text-primary"
      >
        <i className="fa-solid fa-magnifying-glass" />
      </button>
    );
  }

  return (
    <>
      <div className={compact ? "fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4" : "relative"}>
        <div className={compact ? "w-full max-w-2xl" : ""}>
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus={compact}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={compact ? undefined : () => setTimeout(() => setOpen(false), 150)}
              placeholder="Buscar produtos..."
              className="w-full rounded-md border border-border bg-card pl-9 pr-10 py-2 text-sm outline-none focus:border-primary"
            />
            {compact && (
              <button
                onClick={() => { setOpen(false); setQ(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
          {open && q.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
              {results.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Nenhum produto encontrado</div>
              ) : (
                results.map((p) => {
                  const price = p.sale_price ?? p.price;
                  return (
                    <Link
                      key={p.id}
                      to="/produto/$id"
                      params={{ id: p.id }}
                      onClick={() => { setOpen(false); setQ(""); }}
                      className="flex items-center gap-3 border-b border-border px-3 py-2 hover:bg-surface last:border-b-0"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-surface">
                        {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-primary">R$ {Number(price).toFixed(2)}</div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}