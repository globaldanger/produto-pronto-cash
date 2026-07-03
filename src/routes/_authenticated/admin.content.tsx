import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage, deleteProductImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
});

type Banner = { image: string; title?: string; link?: string };
type FaqItem = { question: string; answer: string };
type FooterLink = { label: string; url: string };

type Content = {
  id: string;
  home_hero_title: string;
  home_hero_subtitle: string;
  home_hero_cta: string;
  home_banners: Banner[];
  about_text1: string;
  about_text2: string;
  about_hero_image: string | null;
  about_gallery: string[];
  product_page_shipping_text: string;
  product_page_warranty_text: string;
  product_page_extra_info: string;
  faq: FaqItem[];
  footer_text: string;
  footer_links: FooterLink[];
  footer_payment_methods: string;
  receipt_header_text: string;
  receipt_footer_text: string;
  receipt_show_logo: boolean;
};

function ContentPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin_content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select(
          "id,home_hero_title,home_hero_subtitle,home_hero_cta,home_banners,about_text1,about_text2,about_hero_image,about_gallery,product_page_shipping_text,product_page_warranty_text,product_page_extra_info,faq,footer_text,footer_links,footer_payment_methods,receipt_header_text,receipt_footer_text,receipt_show_logo"
        )
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });
  const [form, setForm] = useState<Partial<Content>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm({
      id: data.id,
      home_hero_title: data.home_hero_title ?? "",
      home_hero_subtitle: data.home_hero_subtitle ?? "",
      home_hero_cta: data.home_hero_cta ?? "",
      home_banners: data.home_banners ?? [],
      about_text1: data.about_text1 ?? "",
      about_text2: data.about_text2 ?? "",
      about_hero_image: data.about_hero_image ?? null,
      about_gallery: data.about_gallery ?? [],
      product_page_shipping_text: data.product_page_shipping_text ?? "",
      product_page_warranty_text: data.product_page_warranty_text ?? "",
      product_page_extra_info: data.product_page_extra_info ?? "",
      faq: data.faq ?? [],
      footer_text: data.footer_text ?? "",
      footer_links: data.footer_links ?? [],
      footer_payment_methods: data.footer_payment_methods ?? "",
      receipt_header_text: data.receipt_header_text ?? "",
      receipt_footer_text: data.receipt_footer_text ?? "",
      receipt_show_logo: data.receipt_show_logo ?? true,
    });
  }, [data]);

  function set<K extends keyof Content>(k: K, v: Content[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.id) return;
    setSaving(true);
    const { id, ...rest } = form;
    const { error } = await supabase.from("store_settings").update(rest as any).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Conteúdo salvo");
    qc.invalidateQueries({ queryKey: ["admin_content"] });
    qc.invalidateQueries({ queryKey: ["store_settings_public"] });
    qc.invalidateQueries({ queryKey: ["store_about_public"] });
    qc.invalidateQueries({ queryKey: ["store_content_public"] });
  }

  async function uploadOne(field: "about_hero_image", file: File | null) {
    if (!file) return;
    setUploading(field);
    try {
      const url = await uploadImage(file, field);
      const prev = form[field];
      set(field, url);
      if (prev) await deleteProductImage(prev);
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(null); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Edite aqui todo o texto e mídia exibidos no site. Mudanças aplicam após "Salvar".
      </p>

      <Section title="Página inicial — Hero" icon="fa-house">
        <Field label="Título principal">
          <input className="input" value={form.home_hero_title ?? ""} onChange={(e) => set("home_hero_title", e.target.value)} />
        </Field>
        <Field label="Subtítulo / descrição">
          <textarea rows={2} className="input" value={form.home_hero_subtitle ?? ""} onChange={(e) => set("home_hero_subtitle", e.target.value)} />
        </Field>
        <Field label="Texto do botão (CTA)">
          <input className="input" placeholder="Ex: Ver produtos" value={form.home_hero_cta ?? ""} onChange={(e) => set("home_hero_cta", e.target.value)} />
        </Field>
      </Section>

      <Section title="Banners da home" icon="fa-images">
        <BannersEditor banners={form.home_banners ?? []} onChange={(b) => set("home_banners", b)} />
      </Section>

      <Section title="Página 'Sobre'" icon="fa-circle-info">
        <Field label="Texto principal">
          <textarea rows={4} className="input" value={form.about_text1 ?? ""} onChange={(e) => set("about_text1", e.target.value)} />
        </Field>
        <Field label="Texto secundário">
          <textarea rows={4} className="input" value={form.about_text2 ?? ""} onChange={(e) => set("about_text2", e.target.value)} />
        </Field>
        <Field label="Imagem principal do Sobre">
          <div className="flex items-center gap-3">
            <div className="h-20 w-32 overflow-hidden rounded border border-border bg-surface">
              {form.about_hero_image
                ? <img src={form.about_hero_image} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-muted-foreground"><i className="fa-solid fa-image" /></div>}
            </div>
            <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs hover:border-primary">
              {uploading === "about_hero_image" ? "Enviando..." : "Trocar"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadOne("about_hero_image", e.target.files?.[0] ?? null)} />
            </label>
            {form.about_hero_image && (
              <button onClick={() => set("about_hero_image", null)} className="rounded-md border border-border px-3 py-2 text-xs hover:border-destructive">Remover</button>
            )}
          </div>
        </Field>
        <p className="text-xs text-muted-foreground">A galeria de fotos da loja continua em Configurações &gt; Aparência.</p>
      </Section>

      <Section title="Página do produto (textos fixos)" icon="fa-box">
        <Field label="Informações de envio (aparecem em todo produto)">
          <textarea rows={2} className="input" value={form.product_page_shipping_text ?? ""} onChange={(e) => set("product_page_shipping_text", e.target.value)} />
        </Field>
        <Field label="Garantia">
          <textarea rows={2} className="input" value={form.product_page_warranty_text ?? ""} onChange={(e) => set("product_page_warranty_text", e.target.value)} />
        </Field>
        <Field label="Informações extras">
          <textarea rows={3} className="input" value={form.product_page_extra_info ?? ""} onChange={(e) => set("product_page_extra_info", e.target.value)} />
        </Field>
      </Section>

      <Section title="Perguntas frequentes (FAQ)" icon="fa-circle-question">
        <FaqEditor items={form.faq ?? []} onChange={(f) => set("faq", f)} />
      </Section>

      <Section title="Rodapé" icon="fa-shoe-prints">
        <Field label="Texto do rodapé">
          <textarea rows={2} className="input" value={form.footer_text ?? ""} onChange={(e) => set("footer_text", e.target.value)} />
        </Field>
        <Field label="Métodos de pagamento (texto)">
          <input className="input" placeholder="Ex: Pix, Cartão de crédito, Dinheiro" value={form.footer_payment_methods ?? ""} onChange={(e) => set("footer_payment_methods", e.target.value)} />
        </Field>
        <FooterLinksEditor links={form.footer_links ?? []} onChange={(l) => set("footer_links", l)} />
      </Section>

      <Section title="Comprovante (template)" icon="fa-print">
        <Field label="Mensagem no topo do comprovante">
          <textarea rows={2} className="input" value={form.receipt_header_text ?? ""} onChange={(e) => set("receipt_header_text", e.target.value)} />
        </Field>
        <Field label="Mensagem no rodapé do comprovante">
          <textarea rows={2} className="input" value={form.receipt_footer_text ?? ""} onChange={(e) => set("receipt_footer_text", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.receipt_show_logo} onChange={(e) => set("receipt_show_logo", e.target.checked)} />
          Exibir logo da loja no comprovante
        </label>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={saving}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 shadow-lg">
          {saving ? "Salvando..." : "Salvar conteúdo"}
        </button>
      </div>
    </div>
  );
}

function BannersEditor({ banners, onChange }: { banners: Banner[]; onChange: (b: Banner[]) => void }) {
  const [uploadIdx, setUploadIdx] = useState<number | null>(null);
  async function pickImage(idx: number, file: File | null) {
    if (!file) return;
    setUploadIdx(idx);
    try {
      const url = await uploadImage(file, "banners");
      const copy = [...banners];
      copy[idx] = { ...copy[idx], image: url };
      onChange(copy);
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploadIdx(null); }
  }
  return (
    <div className="space-y-2">
      {banners.map((b, idx) => (
        <div key={idx} className="grid grid-cols-[80px_1fr_auto] gap-2 rounded border border-border p-2">
          <div className="h-14 w-20 overflow-hidden rounded bg-surface">
            {b.image && <img src={b.image} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="space-y-1">
            <input className="input" placeholder="Título" value={b.title ?? ""} onChange={(e) => { const c = [...banners]; c[idx] = { ...c[idx], title: e.target.value }; onChange(c); }} />
            <input className="input" placeholder="Link (opcional)" value={b.link ?? ""} onChange={(e) => { const c = [...banners]; c[idx] = { ...c[idx], link: e.target.value }; onChange(c); }} />
            <label className="inline-block cursor-pointer text-xs text-primary hover:underline">
              {uploadIdx === idx ? "Enviando..." : b.image ? "Trocar imagem" : "Enviar imagem"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(idx, e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button onClick={() => onChange(banners.filter((_, i) => i !== idx))} className="self-start text-destructive hover:opacity-70"><i className="fa-solid fa-trash" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...banners, { image: "", title: "", link: "" }])}
        className="rounded border border-dashed border-border px-3 py-2 text-xs hover:border-primary">
        <i className="fa-solid fa-plus mr-1" /> Adicionar banner
      </button>
    </div>
  );
}

function FaqEditor({ items, onChange }: { items: FaqItem[]; onChange: (f: FaqItem[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={idx} className="space-y-1 rounded border border-border p-2">
          <input className="input" placeholder="Pergunta" value={it.question} onChange={(e) => { const c = [...items]; c[idx] = { ...c[idx], question: e.target.value }; onChange(c); }} />
          <textarea rows={2} className="input" placeholder="Resposta" value={it.answer} onChange={(e) => { const c = [...items]; c[idx] = { ...c[idx], answer: e.target.value }; onChange(c); }} />
          <button onClick={() => onChange(items.filter((_, i) => i !== idx))} className="text-xs text-destructive hover:underline">Remover</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { question: "", answer: "" }])} className="rounded border border-dashed border-border px-3 py-2 text-xs hover:border-primary">
        <i className="fa-solid fa-plus mr-1" /> Adicionar pergunta
      </button>
    </div>
  );
}

function FooterLinksEditor({ links, onChange }: { links: FooterLink[]; onChange: (l: FooterLink[]) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted-foreground">Links do rodapé</label>
      {links.map((l, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input className="input" placeholder="Rótulo" value={l.label} onChange={(e) => { const c = [...links]; c[idx] = { ...c[idx], label: e.target.value }; onChange(c); }} />
          <input className="input" placeholder="URL" value={l.url} onChange={(e) => { const c = [...links]; c[idx] = { ...c[idx], url: e.target.value }; onChange(c); }} />
          <button onClick={() => onChange(links.filter((_, i) => i !== idx))} className="text-destructive"><i className="fa-solid fa-trash" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...links, { label: "", url: "" }])} className="rounded border border-dashed border-border px-3 py-2 text-xs hover:border-primary">
        <i className="fa-solid fa-plus mr-1" /> Adicionar link
      </button>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><i className={`fa-solid ${icon} text-primary`} />{title}</h2>
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