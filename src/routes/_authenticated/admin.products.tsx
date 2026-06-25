import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage, deleteProductImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number | null;
  stock: number;
  category_id: string | null;
  images: string[];
  active: boolean;
  featured: boolean;
  sku: string | null;
};

const empty: Omit<Product, "id"> = {
  name: "",
  description: "",
  price: 0,
  sale_price: null,
  cost_price: null,
  stock: 0,
  category_id: null,
  images: [],
  active: true,
  featured: false,
  sku: null,
};

function ProductsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<(Partial<Product> & { id?: string }) | null>(null);
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function remove(p: Product) {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    for (const img of p.images ?? []) await deleteProductImage(img);
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <i className="fa-solid fa-plus mr-2" />
          Novo produto
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <i className="fa-solid fa-box-open mb-3 text-4xl" />
          <p>Nenhum produto cadastrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded bg-surface">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <i className="fa-solid fa-image" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        {p.sku && <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    R$ {Number(p.sale_price ?? p.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.stock < 5 ? "text-destructive" : ""}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded px-2 py-1 text-xs font-bold ${
                        p.active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(p)}
                      className="mr-2 rounded border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="rounded border border-border px-3 py-1 text-xs hover:border-destructive hover:text-destructive"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductModal
          product={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "products"] });
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Partial<Product> & { id?: string };
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(product);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof Product>(k: K, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadProductImage(file));
      }
      set("images", [...(form.images ?? []), ...urls]);
      toast.success(`${urls.length} imagem(ns) enviada(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeImg(url: string) {
    set("images", (form.images ?? []).filter((u) => u !== url));
    await deleteProductImage(url);
  }

  async function save() {
    if (!form.name || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name!,
      description: form.description || null,
      price: Number(form.price),
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      stock: Number(form.stock ?? 0),
      category_id: form.category_id || null,
      images: form.images ?? [],
      active: form.active ?? true,
      featured: form.featured ?? false,
      sku: form.sku || null,
    };
    const res = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(form.id ? "Produto atualizado" : "Produto criado");
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{form.id ? "Editar produto" : "Novo produto"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome *">
            <input className="input" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="SKU">
            <input className="input" value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Categoria">
            <select className="input" value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
              <option value="">— sem categoria —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Estoque">
            <input type="number" className="input" value={form.stock ?? 0} onChange={(e) => set("stock", e.target.valueAsNumber)} />
          </Field>
          <Field label="Preço (R$) *">
            <input type="number" step="0.01" className="input" value={form.price ?? 0} onChange={(e) => set("price", e.target.valueAsNumber)} />
          </Field>
          <Field label="Preço promocional (R$)">
            <input type="number" step="0.01" className="input" value={form.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value ? e.target.valueAsNumber : null)} />
          </Field>
          <Field label="Custo (R$)">
            <input type="number" step="0.01" className="input" value={form.cost_price ?? ""} onChange={(e) => set("cost_price", e.target.value ? e.target.valueAsNumber : null)} />
          </Field>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active ?? true} onChange={(e) => set("active", e.target.checked)} />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured ?? false} onChange={(e) => set("featured", e.target.checked)} />
              Destaque
            </label>
          </div>
        </div>

        <Field label="Descrição">
          <textarea rows={3} className="input" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </Field>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium">Imagens</label>
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(form.images ?? []).map((url) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded border border-border">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeImg(url)}
                  className="absolute right-1 top-1 rounded bg-destructive px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              {uploading ? (
                <i className="fa-solid fa-spinner fa-spin text-2xl" />
              ) : (
                <i className="fa-solid fa-plus text-2xl" />
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}