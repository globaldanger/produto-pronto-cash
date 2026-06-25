import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      };
      return norm;
    },
  });

  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);

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
      })
      .eq("id", data.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Section title="Loja" icon="fa-store">
        <Field label="Nome da loja">
          <input className="input" value={form.store_name ?? ""} onChange={(e) => set("store_name", e.target.value)} />
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