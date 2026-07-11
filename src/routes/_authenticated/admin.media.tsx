import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/media")({
  head: () => ({ meta: [{ title: "Biblioteca de mídia — Admin" }] }),
  component: MediaPage,
});

const BUCKET = "product-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

type MediaItem = {
  path: string;
  name: string;
  size: number;
  updated_at: string | null;
  url: string;
};

const FOLDERS = [
  { key: "products", label: "Produtos", icon: "fa-box" },
  { key: "store_logo", label: "Logo", icon: "fa-image" },
  { key: "store_header_image", label: "Header", icon: "fa-panorama" },
  { key: "about_hero_image", label: "Sobre — capa", icon: "fa-circle-info" },
  { key: "about-gallery", label: "Sobre — galeria", icon: "fa-images" },
];

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function MediaPage() {
  const qc = useQueryClient();
  const [folder, setFolder] = useState("products");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "media", folder],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const files = (data ?? []).filter((f) => !!f.id);
      const results: MediaItem[] = [];
      for (const f of files) {
        const fullPath = `${folder}/${f.name}`;
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(fullPath, TEN_YEARS);
        results.push({
          path: fullPath,
          name: f.name,
          size: (f.metadata as { size?: number } | null)?.size ?? 0,
          updated_at: f.updated_at ?? f.created_at ?? null,
          url: signed?.signedUrl ?? "",
        });
      }
      return results;
    },
  });

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalBytes = items.reduce((s, i) => s + i.size, 0);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      let ok = 0;
      for (const f of Array.from(files)) {
        await uploadImage(f, folder);
        ok++;
      }
      toast.success(`${ok} imagem(ns) enviada(s)`);
      qc.invalidateQueries({ queryKey: ["admin", "media", folder] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeItem(path: string) {
    if (!confirm("Excluir esta imagem? Ela pode estar sendo usada em produtos ou no site.")) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return toast.error(error.message);
    toast.success("Imagem excluída");
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["admin", "media", folder] });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  const current = items.find((i) => i.path === selected);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Biblioteca de mídia</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as imagens da loja em um só lugar.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span><i className="fa-solid fa-images mr-1 text-primary" /> {items.length} arquivos</span>
          <span><i className="fa-solid fa-hard-drive mr-1 text-primary" /> {fmtSize(totalBytes)}</span>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {FOLDERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFolder(f.key); setSelected(null); }}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              folder === f.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <i className={`fa-solid ${f.icon}`} /> {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar arquivo..."
            className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <label className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          {uploading ? (
            <><i className="fa-solid fa-spinner fa-spin mr-2" /> Enviando</>
          ) : (
            <><i className="fa-solid fa-upload mr-2" /> Enviar imagens</>
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

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <i className="fa-solid fa-photo-film mb-3 text-4xl" />
          <p>Nenhuma imagem nesta pasta ainda.</p>
          <p className="text-xs mt-1">Envie a primeira usando o botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((it) => (
            <button
              key={it.path}
              onClick={() => setSelected(it.path)}
              className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-card transition ${
                selected === it.path ? "border-primary" : "border-border hover:border-primary/60"
              }`}
            >
              <img src={it.url} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                {it.name}
              </div>
            </button>
          ))}
        </div>
      )}

      {current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{current.name}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtSize(current.size)} · {current.updated_at ? new Date(current.updated_at).toLocaleString("pt-BR") : ""}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <i className="fa-solid fa-times text-xl" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-black/40 p-4">
              <img src={current.url} alt={current.name} className="max-h-[60vh] w-auto object-contain" />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
              <input
                readOnly
                value={current.url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-[240px] rounded-md border border-border bg-surface px-3 py-2 text-xs"
              />
              <button
                onClick={() => copyUrl(current.url)}
                className="rounded-md border border-border px-3 py-2 text-xs hover:border-primary hover:text-primary"
              >
                <i className="fa-solid fa-copy mr-1" /> Copiar URL
              </button>
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-3 py-2 text-xs hover:border-primary hover:text-primary"
              >
                <i className="fa-solid fa-arrow-up-right-from-square mr-1" /> Abrir
              </a>
              <button
                onClick={() => removeItem(current.path)}
                className="rounded-md border border-border px-3 py-2 text-xs hover:border-destructive hover:text-destructive"
              >
                <i className="fa-solid fa-trash mr-1" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
