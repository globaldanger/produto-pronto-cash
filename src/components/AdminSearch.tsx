import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Result =
  | { kind: "product"; id: string; title: string; subtitle: string }
  | { kind: "order"; id: string; title: string; subtitle: string }
  | { kind: "category"; id: string; title: string; subtitle: string };

export function AdminSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const term = `%${q.trim()}%`;
      const [{ data: prods }, { data: cats }, { data: ords }] = await Promise.all([
        supabase.from("products").select("id,name,price").ilike("name", term).limit(5),
        supabase.from("categories").select("id,name,slug").ilike("name", term).limit(3),
        supabase
          .from("orders")
          .select("id,customer_name,customer_phone,total,created_at")
          .or(`customer_name.ilike.${term},customer_phone.ilike.${term}`)
          .limit(5),
      ]);
      const out: Result[] = [
        ...(prods ?? []).map((p) => ({
          kind: "product" as const, id: p.id, title: p.name,
          subtitle: `Produto · R$ ${Number(p.price).toFixed(2)}`,
        })),
        ...(cats ?? []).map((c) => ({
          kind: "category" as const, id: c.id, title: c.name, subtitle: `Categoria · ${c.slug}`,
        })),
        ...(ords ?? []).map((o) => ({
          kind: "order" as const, id: o.id,
          title: o.customer_name ?? `Pedido #${o.id.slice(0,8)}`,
          subtitle: `Pedido · R$ ${Number(o.total).toFixed(2)} · ${new Date(o.created_at).toLocaleDateString("pt-BR")}`,
        })),
      ];
      setResults(out);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function linkFor(r: Result): string {
    if (r.kind === "product") return `/produto/${r.id}`;
    if (r.kind === "order") return `/comprovante/${r.id}`;
    return `/admin/categories`;
  }

  return (
    <div className="relative">
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar produtos, pedidos, clientes..."
          className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Nada encontrado</div>
          ) : (
            results.map((r) => (
              <Link
                key={`${r.kind}-${r.id}`}
                to={linkFor(r)}
                className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm hover:bg-surface last:border-b-0"
                onClick={() => { setOpen(false); setQ(""); }}
              >
                <i className={`fa-solid ${r.kind === "product" ? "fa-box" : r.kind === "order" ? "fa-receipt" : "fa-tag"} w-4 text-primary`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}