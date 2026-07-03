import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/themes")({
  head: () => ({ meta: [{ title: "Temas festivos — Admin" }] }),
  component: ThemesPage,
});

type ThemePack = {
  id?: string;
  key: string;
  name: string;
  accent_color: string;
  accent_glow: string;
  banner_text: string | null;
  banner_subtext: string | null;
  decoration: string;
  active: boolean;
};

const DECOS = [
  { key: "none", label: "Nenhuma" },
  { key: "fireworks", label: "Fogos (Ano Novo)" },
  { key: "flags", label: "Bandeirinhas (São João)" },
  { key: "confetti", label: "Confetes (Copa)" },
  { key: "snow", label: "Neve (Natal)" },
  { key: "hearts", label: "Corações" },
];

const PRESETS: ThemePack[] = [
  { key: "default", name: "Padrão", accent_color: "#d4af37", accent_glow: "#f4d47a", banner_text: null, banner_subtext: null, decoration: "none", active: true },
  { key: "sao_joao", name: "São João", accent_color: "#f59e0b", accent_glow: "#fde68a", banner_text: "Arraiá SmartCell!", banner_subtext: "Descontos quentes como fogueira", decoration: "flags", active: false },
  { key: "copa", name: "Copa do Mundo", accent_color: "#22c55e", accent_glow: "#fde047", banner_text: "É Copa!", banner_subtext: "Vibre com os melhores preços", decoration: "confetti", active: false },
  { key: "ano_novo", name: "Ano Novo", accent_color: "#c084fc", accent_glow: "#f9a8d4", banner_text: "Feliz Ano Novo!", banner_subtext: "Comece o ano com tecnologia", decoration: "fireworks", active: false },
  { key: "natal", name: "Natal", accent_color: "#ef4444", accent_glow: "#4ade80", banner_text: "Feliz Natal!", banner_subtext: "Presentes que encantam", decoration: "snow", active: false },
];

const EMPTY: ThemePack = {
  key: "", name: "", accent_color: "#d4af37", accent_glow: "#f4d47a",
  banner_text: "", banner_subtext: "", decoration: "none", active: false,
};

function ThemesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ThemePack | null>(null);

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ["admin_themes"],
    queryFn: async () => {
      const { data } = await supabase.from("theme_packs").select("*").order("name");
      return (data ?? []) as ThemePack[];
    },
  });
  const { data: active } = useQuery({
    queryKey: ["admin_active_theme"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("active_theme_key").limit(1).maybeSingle();
      return data?.active_theme_key ?? "default";
    },
  });

  const save = useMutation({
    mutationFn: async (t: ThemePack) => {
      if (!t.key.trim() || !t.name.trim()) throw new Error("Chave e nome obrigatórios");
      const payload = { ...t, key: t.key.trim().toLowerCase() };
      if (t.id) {
        const { error } = await supabase.from("theme_packs").update(payload).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("theme_packs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Tema salvo"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin_themes"] }); qc.invalidateQueries({ queryKey: ["active_theme"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function activate(t: ThemePack) {
    const { data: row } = await supabase.from("store_settings").select("id").limit(1).maybeSingle();
    if (!row?.id) return toast.error("Configurações da loja não encontradas");
    const { error } = await supabase.from("store_settings").update({ active_theme_key: t.key }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(`Tema "${t.name}" ativado`);
    qc.invalidateQueries({ queryKey: ["admin_active_theme"] });
    qc.invalidateQueries({ queryKey: ["active_theme"] });
  }
  async function remove(t: ThemePack) {
    if (t.key === "default") return toast.error("Não é possível excluir o tema padrão");
    if (!confirm(`Excluir tema ${t.name}?`)) return;
    const { error } = await supabase.from("theme_packs").delete().eq("id", t.id!);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin_themes"] });
  }
  async function seedPreset(p: ThemePack) {
    const exists = themes.find((t) => t.key === p.key);
    if (exists) return setEditing(exists);
    const { error } = await supabase.from("theme_packs").insert(p);
    if (error) return toast.error(error.message);
    toast.success(`"${p.name}" adicionado`);
    qc.invalidateQueries({ queryKey: ["admin_themes"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Temas festivos</h1>
          <p className="text-sm text-muted-foreground">Ative decorações e cores especiais em datas comemorativas.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          <i className="fa-solid fa-plus mr-1" /> Novo tema
        </button>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Presets rápidos</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => seedPreset(p)} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary">
              <span className="h-3 w-3 rounded-full" style={{ background: p.accent_color, boxShadow: `0 0 8px ${p.accent_glow}` }} />
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {themes.map((t) => (
            <article
              key={t.id}
              className="relative overflow-hidden rounded-2xl border-2 bg-card p-5"
              style={{ borderColor: active === t.key ? t.accent_color : undefined }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 20% 0%, ${t.accent_glow}, transparent 60%)` }} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-lg" style={{ background: t.accent_color, boxShadow: `0 0 20px ${t.accent_glow}` }} />
                    <div>
                      <h3 className="text-lg font-bold">{t.name}</h3>
                      <p className="font-mono text-[11px] text-muted-foreground">{t.key}</p>
                    </div>
                  </div>
                  {active === t.key && (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: t.accent_color, color: "#000" }}>
                      ATIVO
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Decoração:</span> {DECOS.find((d) => d.key === t.decoration)?.label ?? t.decoration}</p>
                  {t.banner_text && <p className="text-xs text-muted-foreground">"{t.banner_text}"</p>}
                </div>
                <div className="mt-4 flex gap-2">
                  {active !== t.key && (
                    <button onClick={() => activate(t)} className="rounded-md px-3 py-1.5 text-xs font-bold text-black" style={{ background: t.accent_color }}>
                      <i className="fa-solid fa-bolt mr-1" /> Ativar
                    </button>
                  )}
                  <button onClick={() => setEditing(t)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary"><i className="fa-solid fa-pen" /> Editar</button>
                  <button onClick={() => remove(t)} className="ml-auto rounded-md border border-border px-3 py-1.5 text-xs text-destructive hover:border-destructive"><i className="fa-solid fa-trash" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <ThemeForm value={editing} onCancel={() => setEditing(null)} onSave={(t) => save.mutate(t)} loading={save.isPending} />
      )}
    </div>
  );
}

function ThemeForm({ value, onCancel, onSave, loading }: { value: ThemePack; onCancel: () => void; onSave: (t: ThemePack) => void; loading: boolean }) {
  const [t, setT] = useState<ThemePack>(value);
  // Live preview: temporarily override CSS accent while editing
  useEffect(() => {
    const root = document.documentElement;
    const prev = { c: root.style.getPropertyValue("--theme-accent"), g: root.style.getPropertyValue("--theme-accent-glow") };
    root.style.setProperty("--theme-accent", t.accent_color);
    root.style.setProperty("--theme-accent-glow", t.accent_glow || t.accent_color);
    return () => {
      if (prev.c) root.style.setProperty("--theme-accent", prev.c);
      else root.style.removeProperty("--theme-accent");
      if (prev.g) root.style.setProperty("--theme-accent-glow", prev.g);
      else root.style.removeProperty("--theme-accent-glow");
    };
  }, [t.accent_color, t.accent_glow]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-bold">{t.id ? "Editar" : "Novo"} tema</h3>

        {/* Live preview */}
        <div className="mb-5 overflow-hidden rounded-xl border-2 p-4" style={{ borderColor: t.accent_color, background: `radial-gradient(circle at 30% 0%, ${t.accent_glow}22, transparent 70%)` }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Prévia</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="h-12 w-12 rounded-lg" style={{ background: t.accent_color, boxShadow: `0 0 24px ${t.accent_glow}` }} />
            <div>
              <div className="text-lg font-bold" style={{ color: t.accent_color }}>{t.name || "Nome do tema"}</div>
              <div className="text-xs text-muted-foreground">{t.banner_text || "Texto do banner aparece aqui"}</div>
            </div>
            <button className="ml-auto rounded-md px-3 py-1.5 text-xs font-bold text-black" style={{ background: t.accent_color }}>Botão CTA</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3"><L>Chave *</L><input className="input font-mono" value={t.key} onChange={(e) => setT({ ...t, key: e.target.value.toLowerCase() })} placeholder="sao_joao" /></div>
          <div className="sm:col-span-3"><L>Nome *</L><input className="input" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} /></div>
          <div className="sm:col-span-3"><L>Cor de destaque</L>
            <div className="flex items-center gap-2"><input type="color" className="h-10 w-14 rounded border border-border bg-transparent" value={t.accent_color} onChange={(e) => setT({ ...t, accent_color: e.target.value })} /><input className="input" value={t.accent_color} onChange={(e) => setT({ ...t, accent_color: e.target.value })} /></div>
          </div>
          <div className="sm:col-span-3"><L>Cor de brilho</L>
            <div className="flex items-center gap-2"><input type="color" className="h-10 w-14 rounded border border-border bg-transparent" value={t.accent_glow} onChange={(e) => setT({ ...t, accent_glow: e.target.value })} /><input className="input" value={t.accent_glow} onChange={(e) => setT({ ...t, accent_glow: e.target.value })} /></div>
          </div>
          <div className="sm:col-span-3"><L>Decoração</L>
            <select className="input" value={t.decoration} onChange={(e) => setT({ ...t, decoration: e.target.value })}>
              {DECOS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3 flex items-center gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} /> Visível para ativação</label></div>
          <div className="sm:col-span-6"><L>Texto do banner</L><input className="input" value={t.banner_text ?? ""} onChange={(e) => setT({ ...t, banner_text: e.target.value })} /></div>
          <div className="sm:col-span-6"><L>Subtexto</L><input className="input" value={t.banner_subtext ?? ""} onChange={(e) => setT({ ...t, banner_subtext: e.target.value })} /></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
          <button disabled={loading} onClick={() => onSave(t)} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-muted-foreground">{children}</label>;
}