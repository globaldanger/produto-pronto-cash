import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage, deleteProductImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

type Settings = {
  id: string;
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  store_whatsapp: string;
  store_instagram: string;
  pix_key: string;
  mercadopago_access_token: string;
  store_logo: string | null;
  store_header_image: string | null;
  about_hero_image: string | null;
  about_gallery: string[];
  about_text1: string;
  about_text2: string;
  store_slogan: string;
  store_hours: string;
};

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (!data) return null;
      const norm: Settings = {
        id: data.id,
        store_name: data.store_name ?? "",
        store_phone: data.store_phone ?? "",
        store_email: data.store_email ?? "",
        store_address: data.store_address ?? "",
        store_whatsapp: data.store_whatsapp ?? "",
        store_instagram: data.store_instagram ?? "",
        pix_key: data.pix_key ?? "",
        mercadopago_access_token: data.mercadopago_access_token ?? "",
        store_logo: data.store_logo ?? null,
        store_header_image: data.store_header_image ?? null,
        about_hero_image: data.about_hero_image ?? null,
        about_gallery: data.about_gallery ?? [],
        about_text1: data.about_text1 ?? "",
        about_text2: data.about_text2 ?? "",
        store_slogan: data.store_slogan ?? "",
        store_hours: data.store_hours ?? "",
      };
      return norm;
    },
  });

  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save() {
    if (!data?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .update({
        store_name: form.store_name,
        store_phone: form.store_phone,
        store_email: form.store_email,
        store_address: form.store_address,
        store_whatsapp: form.store_whatsapp,
        store_instagram: form.store_instagram,
        pix_key: form.pix_key,
        mercadopago_access_token: form.mercadopago_access_token,
        store_logo: form.store_logo,
        store_header_image: form.store_header_image,
        about_hero_image: form.about_hero_image,
        about_gallery: form.about_gallery ?? [],
        about_text1: form.about_text1,
        about_text2: form.about_text2,
        store_slogan: form.store_slogan,
        store_hours: form.store_hours,
      })
      .eq("id", data.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings"] });
    qc.invalidateQueries({ queryKey: ["store_settings_public"] });
    qc.invalidateQueries({ queryKey: ["store_about_public"] });
  }

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSingleUpload(field: "store_logo" | "store_header_image" | "about_hero_image", file: File | null) {
    if (!file) return;
    setUploading(field);
    try {
      const url = await uploadImage(file, field);
      const prev = form[field];
      set(field, url);
      if (prev) await deleteProductImage(prev);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading("about_gallery");
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadImage(f, "about-gallery"));
      set("about_gallery", [...(form.about_gallery ?? []), ...urls]);
      toast.success(`${urls.length} imagem(ns) enviada(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  async function removeGalleryImg(url: string) {
    set("about_gallery", (form.about_gallery ?? []).filter((u) => u !== url));
    await deleteProductImage(url);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Section title="Loja" icon="fa-store">
        <Field label="Nome da loja">
          <input className="input" value={form.store_name ?? ""} onChange={(e) => set("store_name", e.target.value)} />
        </Field>
        <Field label="Slogan">
          <input className="input" value={form.store_slogan ?? ""} onChange={(e) => set("store_slogan", e.target.value)} />
        </Field>
        <Field label="E-mail">
          <input className="input" value={form.store_email ?? ""} onChange={(e) => set("store_email", e.target.value)} />
        </Field>
        <Field label="Telefone">
          <input className="input" value={form.store_phone ?? ""} onChange={(e) => set("store_phone", e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <input className="input" value={form.store_whatsapp ?? ""} onChange={(e) => set("store_whatsapp", e.target.value)} />
        </Field>
        <Field label="Instagram">
          <input className="input" value={form.store_instagram ?? ""} onChange={(e) => set("store_instagram", e.target.value)} />
        </Field>
        <Field label="Endereço">
          <textarea rows={2} className="input" value={form.store_address ?? ""} onChange={(e) => set("store_address", e.target.value)} />
        </Field>
        <Field label="Horário de funcionamento">
          <input className="input" value={form.store_hours ?? ""} onChange={(e) => set("store_hours", e.target.value)} />
        </Field>
      </Section>

      <Section title="Aparência do site" icon="fa-palette">
        <ImageField
          label="Logo da loja (quadrado, fica no header)"
          url={form.store_logo ?? null}
          uploading={uploading === "store_logo"}
          onPick={(f) => handleSingleUpload("store_logo", f)}
          onRemove={() => set("store_logo", null)}
        />
        <ImageField
          label="Imagem do header (banner topo do site)"
          url={form.store_header_image ?? null}
          uploading={uploading === "store_header_image"}
          onPick={(f) => handleSingleUpload("store_header_image", f)}
          onRemove={() => set("store_header_image", null)}
        />
      </Section>

      <Section title="Sobre a loja (página inicial)" icon="fa-circle-info">
        <Field label="Texto principal">
          <textarea rows={4} className="input" value={form.about_text1 ?? ""} onChange={(e) => set("about_text1", e.target.value)} />
        </Field>
        <Field label="Texto secundário">
          <textarea rows={4} className="input" value={form.about_text2 ?? ""} onChange={(e) => set("about_text2", e.target.value)} />
        </Field>
        <ImageField
          label="Imagem principal da seção Sobre"
          url={form.about_hero_image ?? null}
          uploading={uploading === "about_hero_image"}
          onPick={(f) => handleSingleUpload("about_hero_image", f)}
          onRemove={() => set("about_hero_image", null)}
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Galeria de fotos da loja
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(form.about_gallery ?? []).map((url) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded border border-border">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeGalleryImg(url)}
                  className="absolute right-1 top-1 rounded bg-destructive px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              {uploading === "about_gallery" ? (
                <i className="fa-solid fa-spinner fa-spin text-2xl" />
              ) : (
                <i className="fa-solid fa-plus text-2xl" />
              )}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleGalleryUpload(e.target.files)} />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Pagamento (Mercado Pago)" icon="fa-credit-card">
        <Field label="Chave Pix">
          <input className="input" value={form.pix_key ?? ""} onChange={(e) => set("pix_key", e.target.value)} />
        </Field>
        <Field label="Access Token Mercado Pago">
          <input
            type="password"
            className="input"
            placeholder="APP_USR-..."
            value={form.mercadopago_access_token ?? ""}
            onChange={(e) => set("mercadopago_access_token", e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Token de produção do Mercado Pago — usado para gerar cobranças Pix.
          </p>
        </Field>
        <p className="text-xs text-muted-foreground">
          Configure o webhook no Mercado Pago apontando para:
          <code className="ml-1 rounded bg-surface px-1 py-0.5">{typeof window !== "undefined" ? window.location.origin : ""}/api/public/mp-webhook</code>
        </p>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}

function ImageField({
  label, url, uploading, onPick, onRemove,
}: { label: string; url: string | null; uploading: boolean; onPick: (f: File | null) => void; onRemove: () => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-3">
        <div className="h-20 w-32 overflow-hidden rounded border border-border bg-surface">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <i className="fa-solid fa-image text-xl" />
            </div>
          )}
        </div>
        <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs hover:border-primary">
          {uploading ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Enviando</> : <><i className="fa-solid fa-upload mr-1" />Trocar</>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>
        {url && (
          <button onClick={onRemove} className="rounded-md border border-border px-3 py-2 text-xs hover:border-destructive hover:text-destructive">
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <i className={`fa-solid ${icon} text-primary`} />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}