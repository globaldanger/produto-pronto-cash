import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/lib/permissions";
import {
  lookupCep,
  searchStreets,
  maskCep,
  maskCpf,
  maskPhone,
  isValidCpf,
} from "@/lib/cep";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({ meta: [{ title: "Clientes — Painel SmartCell" }] }),
  component: CustomersPage,
});

export type Customer = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  credit_limit: number;
  created_at: string;
};

type Ledger = {
  id: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  kind: string;
  description: string | null;
  created_at: string;
};

const emptyCustomer: Partial<Customer> = {
  name: "",
  cpf: "",
  phone: "",
  email: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  notes: "",
  credit_limit: 0,
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CustomersPage() {
  const qc = useQueryClient();
  const { isAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["admin", "customer-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_ledger")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ledger[];
    },
  });

  const balances = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of ledger) m[l.customer_id] = (m[l.customer_id] ?? 0) + Number(l.amount);
    return m;
  }, [ledger]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        (c.cpf ?? "").includes(t) ||
        (c.phone ?? "").includes(t) ||
        (c.email ?? "").toLowerCase().includes(t),
    );
  }, [customers, search]);

  const totalDebt = Object.values(balances).reduce((s, v) => s + (v < 0 ? -v : 0), 0);
  const totalCredit = Object.values(balances).reduce((s, v) => s + (v > 0 ? v : 0), 0);

  async function remove(c: Customer) {
    if (!confirm(`Excluir o cliente "${c.name}"? O histórico de crédito também será apagado.`))
      return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído");
    qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    qc.invalidateQueries({ queryKey: ["admin", "customer-ledger"] });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi icon="fa-users" label="Clientes" value={String(customers.length)} />
        <Kpi icon="fa-hand-holding-dollar" label="Total em fiado" value={brl(totalDebt)} tone="warning" />
        <Kpi icon="fa-wallet" label="Créditos disponíveis" value={brl(totalCredit)} tone="primary" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, telefone..."
            className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <button
          onClick={() => setEditing({ ...emptyCustomer })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <i className="fa-solid fa-user-plus mr-2" /> Novo cliente
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <i className="fa-solid fa-user-group mb-3 text-4xl" />
          <p>Nenhum cliente cadastrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Contato</th>
                <th className="px-4 py-3 text-left">Cidade</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => {
                const bal = balances[c.id] ?? 0;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.cpf || "sem CPF"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{c.phone || "—"}</div>
                      <div>{c.email || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.city ? `${c.city}/${c.state ?? ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-bold ${
                          bal < 0 ? "text-destructive" : bal > 0 ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {brl(bal)}
                      </span>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {bal < 0 ? "deve" : bal > 0 ? "crédito" : "em dia"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(c)}
                        className="mr-2 rounded border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                        title="Ver mais"
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                      <button
                        onClick={() => setEditing(c)}
                        className="mr-2 rounded border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => remove(c)}
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
        <CustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "customers"] });
          }}
        />
      )}

      {detail && (
        <CustomerDetail
          customer={detail}
          balance={balances[detail.id] ?? 0}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: "primary" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <i className={`fa-solid ${icon}`} /> {label}
      </div>
      <div
        className={`mt-1 text-2xl font-extrabold ${
          tone === "warning" ? "text-warning" : tone === "primary" ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function CustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: Partial<Customer>;
  onClose: () => void;
  onSaved: (c: Customer) => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>(customer);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [streetQuery, setStreetQuery] = useState("");
  const [streetResults, setStreetResults] = useState<
    { cep: string; street: string; neighborhood: string; city: string; state: string }[]
  >([]);
  const [streetLoading, setStreetLoading] = useState(false);

  function set<K extends keyof Customer>(k: K, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onCepChange(v: string) {
    const masked = maskCep(v);
    set("cep", masked);
    if (masked.replace(/\D/g, "").length === 8) {
      setCepLoading(true);
      const addr = await lookupCep(masked);
      setCepLoading(false);
      if (!addr) return toast.error("CEP não encontrado");
      setForm((f) => ({
        ...f,
        cep: addr.cep,
        street: addr.street || f.street,
        neighborhood: addr.neighborhood || f.neighborhood,
        city: addr.city,
        state: addr.state,
      }));
      toast.success(`${addr.city}/${addr.state}`);
    }
  }

  async function findStreets() {
    if (!form.state || !form.city) return toast.error("Informe cidade e UF primeiro");
    setStreetLoading(true);
    const res = await searchStreets(form.state, form.city, streetQuery);
    setStreetLoading(false);
    setStreetResults(res);
    if (res.length === 0) toast.error("Nenhuma rua encontrada");
  }

  async function save() {
    if (!form.name?.trim()) return toast.error("Informe o nome do cliente");
    if (form.cpf && form.cpf.replace(/\D/g, "").length > 0 && !isValidCpf(form.cpf))
      return toast.error("CPF inválido");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      cpf: form.cpf?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      cep: form.cep?.trim() || null,
      street: form.street?.trim() || null,
      number: form.number?.trim() || null,
      complement: form.complement?.trim() || null,
      neighborhood: form.neighborhood?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      notes: form.notes?.trim() || null,
      credit_limit: Number(form.credit_limit ?? 0),
    };
    const res = form.id
      ? await supabase.from("customers").update(payload).eq("id", form.id).select().single()
      : await supabase.from("customers").insert(payload).select().single();
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(form.id ? "Cliente atualizado" : "Cliente cadastrado");
    onSaved(res.data as Customer);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{form.id ? "Editar cliente" : "Novo cliente"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome *">
            <input className="input" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </F>
          <F label="CPF">
            <input
              className="input"
              placeholder="000.000.000-00"
              value={form.cpf ?? ""}
              onChange={(e) => set("cpf", maskCpf(e.target.value))}
            />
          </F>
          <F label="Telefone">
            <input
              className="input"
              placeholder="(00) 00000-0000"
              value={form.phone ?? ""}
              onChange={(e) => set("phone", maskPhone(e.target.value))}
            />
          </F>
          <F label="E-mail">
            <input className="input" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </F>
          <F label="CEP">
            <div className="relative">
              <input
                className="input"
                placeholder="00000-000"
                value={form.cep ?? ""}
                onChange={(e) => onCepChange(e.target.value)}
              />
              {cepLoading && (
                <i className="fa-solid fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary" />
              )}
            </div>
          </F>
          <F label="Limite de fiado (R$)">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.credit_limit ?? 0}
              onChange={(e) => set("credit_limit", e.target.valueAsNumber || 0)}
            />
          </F>
          <F label="Rua">
            <input className="input" value={form.street ?? ""} onChange={(e) => set("street", e.target.value)} />
          </F>
          <F label="Número">
            <input className="input" value={form.number ?? ""} onChange={(e) => set("number", e.target.value)} />
          </F>
          <F label="Bairro">
            <input
              className="input"
              value={form.neighborhood ?? ""}
              onChange={(e) => set("neighborhood", e.target.value)}
            />
          </F>
          <F label="Complemento">
            <input
              className="input"
              value={form.complement ?? ""}
              onChange={(e) => set("complement", e.target.value)}
            />
          </F>
          <F label="Cidade">
            <input className="input" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </F>
          <F label="UF">
            <input
              maxLength={2}
              className="input uppercase"
              value={form.state ?? ""}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
            />
          </F>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            <i className="fa-solid fa-road mr-1" /> Buscar rua pela cidade
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Digite parte do nome da rua"
              value={streetQuery}
              onChange={(e) => setStreetQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && findStreets()}
            />
            <button
              type="button"
              onClick={findStreets}
              disabled={streetLoading}
              className="rounded-md border border-border px-4 text-sm hover:border-primary"
            >
              {streetLoading ? <i className="fa-solid fa-spinner fa-spin" /> : "Buscar"}
            </button>
          </div>
          {streetResults.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
              {streetResults.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        cep: r.cep,
                        street: r.street,
                        neighborhood: r.neighborhood,
                        city: r.city,
                        state: r.state,
                      }));
                      setStreetResults([]);
                    }}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-left hover:border-primary"
                  >
                    <span className="font-medium">{r.street}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {r.neighborhood}, {r.city}/{r.state} · {r.cep}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <F label="Observações">
          <textarea
            rows={2}
            className="input"
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </F>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">
            Cancelar
          </button>
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

function CustomerDetail({
  customer,
  balance,
  onClose,
}: {
  customer: Customer;
  balance: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(0);
  const [kind, setKind] = useState("pagamento");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["admin", "customer-ledger", customer.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_ledger")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Ledger[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "customer-orders", customer.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,tracking_code,total,status,channel,created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as {
        id: string;
        tracking_code: string | null;
        total: number;
        status: string;
        channel: string;
        created_at: string;
      }[];
    },
  });

  async function addEntry() {
    const v = Number(amount);
    if (!v) return toast.error("Informe um valor");
    // pagamento e crédito somam ao saldo; dívida subtrai
    const signed = kind === "divida" ? -Math.abs(v) : Math.abs(v);
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("customer_ledger").insert({
      customer_id: customer.id,
      amount: signed,
      kind,
      description: desc || null,
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lançamento registrado");
    setAmount(0);
    setDesc("");
    qc.invalidateQueries({ queryKey: ["admin", "customer-ledger"] });
  }

  const address = [
    customer.street && `${customer.street}, ${customer.number ?? "s/n"}`,
    customer.complement,
    customer.neighborhood,
    customer.city && `${customer.city}/${customer.state ?? ""}`,
    customer.cep && `CEP ${customer.cep}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{customer.name}</h2>
            <p className="text-xs text-muted-foreground">
              {customer.cpf || "sem CPF"} · {customer.phone || "sem telefone"}
            </p>
            {address && <p className="mt-1 text-xs text-muted-foreground">{address}</p>}
            {customer.notes && <p className="mt-2 text-sm">{customer.notes}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-xs uppercase text-muted-foreground">Saldo</div>
            <div
              className={`text-2xl font-extrabold ${
                balance < 0 ? "text-destructive" : balance > 0 ? "text-primary" : ""
              }`}
            >
              {brl(balance)}
            </div>
            <div className="text-xs text-muted-foreground">
              {balance < 0 ? "Cliente deve (fiado)" : balance > 0 ? "Crédito disponível" : "Em dia"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="text-xs uppercase text-muted-foreground">Limite de fiado</div>
            <div className="text-2xl font-extrabold">{brl(Number(customer.credit_limit ?? 0))}</div>
            <div className="text-xs text-muted-foreground">{orders.length} compra(s) associada(s)</div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-bold">Novo lançamento</p>
          <div className="grid gap-2 sm:grid-cols-[140px_160px_1fr_auto]">
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="pagamento">Pagamento recebido</option>
              <option value="credito">Crédito pré-pago</option>
              <option value="divida">Dívida / fiado manual</option>
              <option value="ajuste">Ajuste</option>
            </select>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="Valor"
              value={amount || ""}
              onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
            />
            <input
              className="input"
              placeholder="Descrição (opcional)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <button
              onClick={addEntry}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              Lançar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-bold">Histórico de crédito</p>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem lançamentos.</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {entries.map((e) => (
                  <li key={e.id} className="rounded border border-border p-2">
                    <div className="flex justify-between">
                      <span className="font-semibold capitalize">{e.kind.replace("_", " ")}</span>
                      <span className={Number(e.amount) < 0 ? "text-destructive" : "text-primary"}>
                        {brl(Number(e.amount))}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                      {e.description ? ` · ${e.description}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">Compras</p>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma compra associada.</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {orders.map((o) => (
                  <li key={o.id} className="rounded border border-border p-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-xs">{o.tracking_code ?? o.id.slice(0, 8)}</span>
                      <span className="font-semibold">{brl(Number(o.total))}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.channel} · {o.status}
                      </span>
                      <Link to="/comprovante/$id" params={{ id: o.id }} className="text-primary hover:underline">
                        comprovante
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
