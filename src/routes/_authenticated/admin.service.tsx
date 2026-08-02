import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { maskCpf, maskPhone } from "@/lib/cep";
import { usePermissions } from "@/lib/permissions";
import { uploadImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/service")({
  component: ServiceOrdersPage,
});

type ServiceOrder = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_cpf: string | null;
  customer_address: string | null;
  device: string;
  brand: string | null;
  model: string | null;
  imei: string | null;
  color: string | null;
  accessories: string | null;
  defect_reported: string | null;
  diagnosis: string | null;
  service_done: string | null;
  parts_used: string | null;
  price: number;
  amount_paid: number;
  status: string;
  warranty_days: number;
  warranty_start: string;
  warranty_text: string | null;
  technician: string | null;
  notes: string | null;
  created_at: string;
  photos_in: string[];
  photos_out: string[];
};

const STATUS: { value: string; label: string; cls: string }[] = [
  { value: "aberta", label: "Aberta", cls: "bg-muted text-muted-foreground" },
  { value: "em_andamento", label: "Em andamento", cls: "bg-amber-500/15 text-amber-500" },
  { value: "pronto", label: "Pronto p/ retirada", cls: "bg-blue-500/15 text-blue-400" },
  { value: "entregue", label: "Entregue", cls: "bg-primary/15 text-primary" },
  { value: "cancelada", label: "Cancelada", cls: "bg-destructive/15 text-destructive" },
];

const DEFAULT_WARRANTY =
  "Garantia cobre exclusivamente o serviço executado e a peça substituída descrita nesta ordem. " +
  "Não cobre danos por queda, contato com líquidos, oxidação, mau uso, violação do lacre ou reparo por terceiros.";

const emptyOrder = (): Partial<ServiceOrder> => ({
  customer_name: "",
  customer_phone: "",
  customer_cpf: "",
  customer_address: "",
  device: "",
  brand: "",
  model: "",
  imei: "",
  color: "",
  accessories: "",
  defect_reported: "",
  diagnosis: "",
  service_done: "",
  parts_used: "",
  price: 0,
  amount_paid: 0,
  status: "aberta",
  warranty_days: 90,
  warranty_start: new Date().toISOString().slice(0, 10),
  warranty_text: DEFAULT_WARRANTY,
  technician: "",
  notes: "",
  photos_in: [],
  photos_out: [],
});

function statusMeta(v: string) {
  return STATUS.find((s) => s.value === v) ?? STATUS[0];
}

function ServiceOrdersPage() {
  const qc = useQueryClient();
  const { isAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Partial<ServiceOrder> | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "service_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ServiceOrder[];
    },
  });

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    const okQ =
      !q ||
      [o.code, o.customer_name, o.customer_phone, o.device, o.model, o.imei]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    return okQ && (!statusFilter || o.status === statusFilter);
  });

  async function remove(o: ServiceOrder) {
    if (!confirm(`Excluir a ordem ${o.code}?`)) return;
    const { error } = await supabase.from("service_orders").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Ordem excluída");
    qc.invalidateQueries({ queryKey: ["admin", "service_orders"] });
  }

  async function quickStatus(o: ServiceOrder, status: string) {
    const { error } = await supabase.from("service_orders").update({ status }).eq("id", o.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "service_orders"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Ordens de serviço</h1>
          <p className="text-sm text-muted-foreground">
            Consertos, assistência técnica e comprovantes de garantia.
          </p>
        </div>
        <button
          onClick={() => setEditing(emptyOrder())}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <i className="fa-solid fa-plus mr-2" />
          Nova ordem
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Código, cliente, aparelho ou IMEI..."
            className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <i className="fa-solid fa-screwdriver-wrench mb-3 text-4xl" />
          <p>Nenhuma ordem de serviço encontrada</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Aparelho</th>
                <th className="px-4 py-3 text-left">Garantia</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => {
                const meta = statusMeta(o.status);
                const end = new Date(o.warranty_start);
                end.setDate(end.getDate() + (o.warranty_days ?? 0));
                const valid = end.getTime() >= Date.now();
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{o.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{[o.brand, o.model].filter(Boolean).join(" ") || o.device}</div>
                      <div className="text-xs text-muted-foreground">{o.defect_reported}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={valid ? "text-primary" : "text-muted-foreground"}>
                        {o.warranty_days} dias · até {end.toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      R$ {Number(o.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={o.status}
                        onChange={(e) => quickStatus(o, e.target.value)}
                        className={`rounded px-2 py-1 text-xs font-bold ${meta.cls}`}
                      >
                        {STATUS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        to="/garantia/$id"
                        params={{ id: o.id }}
                        target="_blank"
                        className="mr-2 rounded border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                        title="Comprovante de garantia"
                      >
                        <i className="fa-solid fa-file-shield" />
                      </Link>
                      <button
                        onClick={() => setEditing(o)}
                        className="mr-2 rounded border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => remove(o)}
                          className="rounded border border-border px-3 py-1 text-xs hover:border-destructive hover:text-destructive"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ServiceModal
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "service_orders"] });
          }}
        />
      )}
    </div>
  );
}

function ServiceModal({
  order,
  onClose,
  onSaved,
}: {
  order: Partial<ServiceOrder>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(order);
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["service", "customers", customerSearch],
    enabled: customerSearch.trim().length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,name,phone,cpf,street,number,neighborhood,city,state")
        .ilike("name", `%${customerSearch.trim()}%`)
        .limit(6);
      return (data ?? []) as {
        id: string; name: string; phone: string | null; cpf: string | null;
        street: string | null; number: string | null; neighborhood: string | null;
        city: string | null; state: string | null;
      }[];
    },
  });

  function set<K extends keyof ServiceOrder>(k: K, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.customer_name?.trim() || !form.device?.trim()) {
      toast.error("Informe o cliente e o aparelho");
      return;
    }
    setSaving(true);
    const payload = {
      customer_id: form.customer_id ?? null,
      customer_name: form.customer_name!.trim(),
      customer_phone: form.customer_phone || null,
      customer_cpf: form.customer_cpf || null,
      customer_address: form.customer_address || null,
      device: form.device!.trim(),
      brand: form.brand || null,
      model: form.model || null,
      imei: form.imei || null,
      color: form.color || null,
      accessories: form.accessories || null,
      defect_reported: form.defect_reported || null,
      diagnosis: form.diagnosis || null,
      service_done: form.service_done || null,
      parts_used: form.parts_used || null,
      price: Number(form.price ?? 0),
      amount_paid: Number(form.amount_paid ?? 0),
      status: form.status ?? "aberta",
      warranty_days: Number(form.warranty_days ?? 90),
      warranty_start: form.warranty_start || new Date().toISOString().slice(0, 10),
      warranty_text: form.warranty_text || DEFAULT_WARRANTY,
      technician: form.technician || null,
      notes: form.notes || null,
      photos_in: form.photos_in ?? [],
      photos_out: form.photos_out ?? [],
    };
    const res = form.id
      ? await supabase.from("service_orders").update(payload).eq("id", form.id)
      : await supabase.from("service_orders").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(form.id ? "Ordem atualizada" : "Ordem criada");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {form.id ? `Ordem ${form.code}` : "Nova ordem de serviço"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>

        <Section title="Cliente" icon="fa-user" />
        {!form.id && (
          <div className="relative">
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Buscar cliente cadastrado..."
              className="input"
            />
            {customers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-surface"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        customer_id: c.id,
                        customer_name: c.name,
                        customer_phone: c.phone ?? "",
                        customer_cpf: c.cpf ?? "",
                        customer_address: [
                          [c.street, c.number].filter(Boolean).join(", "),
                          c.neighborhood,
                          [c.city, c.state].filter(Boolean).join("/"),
                        ].filter(Boolean).join(" — "),
                      }));
                      setCustomerSearch("");
                    }}
                  >
                    {c.name} <span className="text-muted-foreground">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Nome *">
            <input className="input" value={form.customer_name ?? ""} onChange={(e) => set("customer_name", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <input className="input" value={form.customer_phone ?? ""} onChange={(e) => set("customer_phone", maskPhone(e.target.value))} />
          </Field>
          <Field label="CPF">
            <input className="input" value={form.customer_cpf ?? ""} onChange={(e) => set("customer_cpf", maskCpf(e.target.value))} />
          </Field>
        </div>
        <Field label="Endereço">
          <input className="input" value={form.customer_address ?? ""} onChange={(e) => set("customer_address", e.target.value)} />
        </Field>

        <Section title="Aparelho" icon="fa-mobile-screen" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Aparelho / tipo *">
            <input className="input" placeholder="Celular, notebook..." value={form.device ?? ""} onChange={(e) => set("device", e.target.value)} />
          </Field>
          <Field label="Marca">
            <input className="input" value={form.brand ?? ""} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Modelo">
            <input className="input" value={form.model ?? ""} onChange={(e) => set("model", e.target.value)} />
          </Field>
          <Field label="IMEI / Série">
            <input className="input" value={form.imei ?? ""} onChange={(e) => set("imei", e.target.value)} />
          </Field>
          <Field label="Cor">
            <input className="input" value={form.color ?? ""} onChange={(e) => set("color", e.target.value)} />
          </Field>
          <Field label="Acessórios entregues">
            <input className="input" placeholder="Capa, carregador..." value={form.accessories ?? ""} onChange={(e) => set("accessories", e.target.value)} />
          </Field>
        </div>

        <Section title="Serviço" icon="fa-screwdriver-wrench" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Defeito relatado">
            <textarea rows={2} className="input" value={form.defect_reported ?? ""} onChange={(e) => set("defect_reported", e.target.value)} />
          </Field>
          <Field label="Diagnóstico técnico">
            <textarea rows={2} className="input" value={form.diagnosis ?? ""} onChange={(e) => set("diagnosis", e.target.value)} />
          </Field>
          <Field label="Serviço executado">
            <textarea rows={2} className="input" value={form.service_done ?? ""} onChange={(e) => set("service_done", e.target.value)} />
          </Field>
          <Field label="Peças utilizadas">
            <textarea rows={2} className="input" value={form.parts_used ?? ""} onChange={(e) => set("parts_used", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Valor (R$)">
            <input type="number" step="0.01" className="input" value={form.price ?? 0} onChange={(e) => set("price", e.target.valueAsNumber || 0)} />
          </Field>
          <Field label="Valor pago (R$)">
            <input type="number" step="0.01" className="input" value={form.amount_paid ?? 0} onChange={(e) => set("amount_paid", e.target.valueAsNumber || 0)} />
          </Field>
          <Field label="Técnico">
            <input className="input" value={form.technician ?? ""} onChange={(e) => set("technician", e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status ?? "aberta"} onChange={(e) => set("status", e.target.value)}>
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Section title="Garantia" icon="fa-shield-halved" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Dias de garantia">
            <input type="number" className="input" value={form.warranty_days ?? 90} onChange={(e) => set("warranty_days", e.target.valueAsNumber || 0)} />
          </Field>
          <Field label="Início da garantia">
            <input type="date" className="input" value={form.warranty_start ?? ""} onChange={(e) => set("warranty_start", e.target.value)} />
          </Field>
          <Field label="Atalhos">
            <div className="flex gap-2">
              {[30, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => set("warranty_days", d)}
                  className="rounded border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                >
                  {d}d
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Field label="Termos da garantia (sai no comprovante)">
          <textarea rows={3} className="input" value={form.warranty_text ?? ""} onChange={(e) => set("warranty_text", e.target.value)} />
        </Field>
        <Field label="Observações internas">
          <textarea rows={2} className="input" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <Section title="Fotos do aparelho" icon="fa-camera" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PhotoUploader
            label="Como chegou (entrada)"
            photos={form.photos_in ?? []}
            onChange={(v) => set("photos_in", v)}
          />
          <PhotoUploader
            label="Como saiu (após o serviço)"
            photos={form.photos_out ?? []}
            onChange={(v) => set("photos_out", v)}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {form.id && (
            <Link
              to="/garantia/$id"
              params={{ id: form.id }}
              target="_blank"
              className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
            >
              <i className="fa-solid fa-print mr-2" />
              Comprovante de garantia
            </Link>
          )}
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

function Section({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="mt-6 mb-1 flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      <i className={`fa-solid ${icon}`} />
      {title}
    </div>
  );
}

function PhotoUploader({
  label,
  photos,
  onChange,
}: {
  label: string;
  photos: string[];
  onChange: (v: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadImage(f, "service"));
      onChange([...photos, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((p) => (
          <div key={p} className="group relative">
            <img src={p} alt={label} className="aspect-square w-full rounded object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((x) => x !== p))}
              className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
            >
              <i className="fa-solid fa-trash" />
            </button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => add(e.target.files)}
          />
          <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-plus"}`} />
        </label>
      </div>
    </div>
  );
}

function LegacySection({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="mt-6 mb-1 flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      <i className={`fa-solid ${icon}`} />
      {title}
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