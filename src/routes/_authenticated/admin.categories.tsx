import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number | null;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const { data: cats = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  async function save() {
    if (!editing?.name) return;
    const payload = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      icon: editing.icon || "fa-tag",
      sort_order: editing.sort_order ?? 0,
    };
    const res = editing.id
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Categoria salva");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function remove(c: Category) {
    if (!confirm(`Excluir "${c.name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing({ name: "", icon: "fa-tag", sort_order: 0 })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <i className="fa-solid fa-plus mr-2" />
          Nova categoria
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {cats.map((c) => (
          <div key={c.id} className="group rounded-xl border border-border bg-card p-5 text-center">
            <i className={`fa-solid ${c.icon ?? "fa-tag"} mb-2 text-3xl text-primary`} />
            <div className="font-semibold">{c.name}</div>
            <div className="text-xs text-muted-foreground">/{c.slug}</div>
            <div className="mt-3 flex justify-center gap-2 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => setEditing(c)} className="rounded border border-border px-2 py-1 text-xs">
                <i className="fa-solid fa-pen" />
              </button>
              <button onClick={() => remove(c)} className="rounded border border-border px-2 py-1 text-xs hover:border-destructive hover:text-destructive">
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-xl font-bold">{editing.id ? "Editar" : "Nova"} categoria</h2>
            <div className="space-y-3">
              <input
                placeholder="Nome"
                className="input w-full"
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <input
                placeholder="Ícone FontAwesome (ex: fa-mobile)"
                className="input w-full"
                value={editing.icon ?? ""}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
              />
              <input
                type="number"
                placeholder="Ordem"
                className="input w-full"
                value={editing.sort_order ?? 0}
                onChange={(e) => setEditing({ ...editing, sort_order: e.target.valueAsNumber })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={save} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}