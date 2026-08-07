import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";
import { CartDrawer } from "@/components/CartDrawer";
import { NotificationOptIn } from "@/components/NotificationOptIn";

export const Route = createFileRoute("/conta")({
  head: () => ({ meta: [{ title: "Minha conta — SmartCell" }] }),
  component: AccountPage,
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab as string | undefined) ?? "orders",
  }),
});

type TabKey = "orders" | "favorites" | "addresses" | "profile" | "points";

const TABS: { key: TabKey; label: string; icon: string; desc: string }[] = [
  { key: "orders", label: "Meus pedidos", icon: "fa-receipt", desc: "Acompanhe suas compras" },
  { key: "favorites", label: "Favoritos", icon: "fa-heart", desc: "Produtos salvos" },
  { key: "addresses", label: "Endereços", icon: "fa-location-dot", desc: "Onde entregar" },
  { key: "points", label: "Pontos", icon: "fa-star", desc: "Programa de fidelidade" },
  { key: "profile", label: "Perfil", icon: "fa-user-gear", desc: "Dados da conta" },
];

function AccountPage() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/conta" } as never });
        return;
      }
      setUser({ id: data.user.id, email: data.user.email ?? undefined });
      setChecking(false);
    })();
  }, [navigate]);

  // Realtime updates for orders / loyalty / favorites / addresses
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`account_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["account_orders", user.id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_points", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["account_points", user.id] });
          qc.invalidateQueries({ queryKey: ["points_menu", user.id] });
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["account_favorites", user.id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_addresses", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["account_addresses", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const active = (TABS.find((t) => t.key === tab) ?? TABS[0]).key;

  if (checking || !user) {
    return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow theme-accent-text">Central do cliente</p>
            <h1 className="font-display text-4xl md:text-5xl">Minha conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
              <i className="fa-solid fa-signal mr-1 text-success" /> Atualização em tempo real
            </span>
          </div>
        </header>

        <div className="mb-6">
          <NotificationOptIn />
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav className="space-y-1 self-start rounded-2xl border border-border bg-card p-3">
            {TABS.map((t) => (
              <Link
                key={t.key}
                to="/conta"
                search={{ tab: t.key }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active === t.key
                    ? "theme-accent-bg font-semibold shadow"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                <span className="grid h-8 w-8 place-items-center rounded-md border border-border/60">
                  <i className={`fa-solid ${t.icon}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">{t.label}</span>
                  <span className={`block text-[11px] ${active === t.key ? "text-black/70" : "text-muted-foreground"}`}>{t.desc}</span>
                </span>
              </Link>
            ))}
          </nav>

          <section className="min-h-[400px] rounded-2xl border border-border bg-card p-5 md:p-6">
            {active === "orders" && <OrdersTab userId={user.id} />}
            {active === "favorites" && <FavoritesTab userId={user.id} />}
            {active === "addresses" && <AddressesTab userId={user.id} />}
            {active === "points" && <PointsTab userId={user.id} />}
            {active === "profile" && <ProfileTab userId={user.id} email={user.email ?? ""} />}
          </section>
        </div>
      </main>
      <CartDrawer />
    </div>
  );
}

/* ============ Orders ============ */

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Aguardando pagamento", color: "bg-amber-500/15 text-amber-400", icon: "fa-hourglass-half" },
  paid: { label: "Pago", color: "bg-emerald-500/15 text-emerald-400", icon: "fa-circle-check" },
  processing: { label: "Em preparação", color: "bg-blue-500/15 text-blue-400", icon: "fa-box" },
  ready: { label: "Pronto para retirada", color: "bg-cyan-500/15 text-cyan-400", icon: "fa-store" },
  shipped: { label: "Enviado", color: "bg-indigo-500/15 text-indigo-400", icon: "fa-truck" },
  delivered: { label: "Entregue", color: "bg-emerald-500/15 text-emerald-400", icon: "fa-flag-checkered" },
  cancelled: { label: "Cancelado", color: "bg-destructive/15 text-destructive", icon: "fa-ban" },
  refunded: { label: "Reembolsado", color: "bg-neutral-500/15 text-neutral-300", icon: "fa-arrow-rotate-left" },
};

function OrdersTab({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["account_orders", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,created_at,total,status,payment_method,delivery_type,coupon_code,discount_coupon,mp_init_point,order_items(quantity,product_name,product_image,unit_price)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando pedidos...</div>;
  if (!data.length)
    return (
      <Empty icon="fa-receipt" title="Nenhum pedido ainda" cta="Ir para a loja" href="/" />
    );

  return (
    <div className="space-y-4">
      <SectionTitle icon="fa-receipt" title="Meus pedidos" desc={`${data.length} ${data.length === 1 ? "pedido" : "pedidos"}`} />
      {data.map((o) => {
        const st = STATUS_META[o.status] ?? { label: o.status, color: "bg-neutral-500/15 text-neutral-300", icon: "fa-circle" };
        return (
          <article key={o.id} className="rounded-xl border border-border bg-background/50 p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Pedido</p>
                <p className="font-mono text-sm font-semibold">#{o.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${st.color}`}>
                <i className={`fa-solid ${st.icon}`} /> {st.label}
              </span>
            </header>
            <ul className="mt-3 divide-y divide-border/60 text-sm">
              {(o.order_items ?? []).map((it, idx) => (
                <li key={idx} className="flex items-center gap-3 py-2">
                  {it.product_image ? (
                    <img src={it.product_image} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded bg-surface text-muted-foreground"><i className="fa-solid fa-image" /></div>
                  )}
                  <span className="flex-1 truncate">{it.quantity}× {it.product_name}</span>
                  <span className="text-muted-foreground">R$ {(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>
                <i className="fa-solid fa-calendar mr-1" /> {new Date(o.created_at).toLocaleString("pt-BR")}
              </span>
              <span><i className="fa-solid fa-credit-card mr-1" /> {o.payment_method?.toUpperCase() ?? "—"}</span>
              <span><i className={`fa-solid ${o.delivery_type === "pickup" ? "fa-store" : "fa-truck"} mr-1`} /> {o.delivery_type === "pickup" ? "Retirada" : "Entrega"}</span>
              {o.coupon_code && (
                <span className="theme-accent-text"><i className="fa-solid fa-ticket mr-1" /> {o.coupon_code} (−R$ {Number(o.discount_coupon ?? 0).toFixed(2)})</span>
              )}
              <span className="text-base font-bold text-foreground">Total R$ {Number(o.total).toFixed(2)}</span>
              <div className="flex gap-2">
                {o.status === "pending" && o.mp_init_point && (
                  <a href={o.mp_init_point} className="rounded-md theme-accent-bg px-3 py-1.5 text-xs font-bold">
                    <i className="fa-solid fa-arrow-right mr-1" /> Concluir pagamento
                  </a>
                )}
                <Link to="/rastrear" search={{ id: o.id } as never} className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary">
                  Rastrear
                </Link>
              </div>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

/* ============ Favorites ============ */

function FavoritesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["account_favorites", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("id,product_id,created_at,products(id,name,price,sale_price,images,stock,active)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("favorites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido dos favoritos");
      qc.invalidateQueries({ queryKey: ["account_favorites", userId] });
    },
  });

  if (isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando...</div>;
  if (!data.length) return <Empty icon="fa-heart" title="Nenhum favorito ainda" desc="Toque no coração em qualquer produto para salvar aqui." cta="Explorar produtos" href="/" />;

  return (
    <div>
      <SectionTitle icon="fa-heart" title="Favoritos" desc={`${data.length} ${data.length === 1 ? "item" : "itens"}`} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((f) => {
          const p = f.products as { id: string; name: string; price: number; sale_price: number | null; images: string[]; stock: number; active: boolean } | null;
          if (!p) return null;
          const price = p.sale_price ?? p.price;
          return (
            <div key={f.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background/40">
              <Link to="/produto/$id" params={{ id: p.id }} className="aspect-square overflow-hidden bg-surface">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground"><i className="fa-solid fa-image text-3xl" /></div>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <Link to="/produto/$id" params={{ id: p.id }} className="line-clamp-2 text-sm font-semibold hover:text-primary">{p.name}</Link>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-lg font-bold theme-accent-text">R$ {Number(price).toFixed(2)}</span>
                  <button
                    onClick={() => remove.mutate(f.id)}
                    className="grid h-8 w-8 place-items-center rounded-md border border-border text-destructive hover:border-destructive"
                    aria-label="Remover"
                  ><i className="fa-solid fa-trash text-xs" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ Addresses ============ */

type Address = {
  id?: string;
  label: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  is_default: boolean;
};

function AddressesTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["account_addresses", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as Address[];
    },
  });

  const empty: Address = { label: "Casa", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", is_default: false };
  const [editing, setEditing] = useState<Address | null>(null);

  async function save(a: Address) {
    if (a.is_default) {
      await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", userId);
    }
    if (a.id) {
      const { error } = await supabase.from("customer_addresses").update({ ...a, user_id: userId }).eq("id", a.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("customer_addresses").insert({ ...a, user_id: userId });
      if (error) return toast.error(error.message);
    }
    toast.success("Endereço salvo");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["account_addresses", userId] });
  }
  async function del(id: string) {
    if (!confirm("Excluir este endereço?")) return;
    const { error } = await supabase.from("customer_addresses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["account_addresses", userId] });
  }
  async function makeDefault(id: string) {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", userId);
    const { error } = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["account_addresses", userId] });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionTitle icon="fa-location-dot" title="Meus endereços" desc={`${data.length} salvos`} />
        <button onClick={() => setEditing(empty)} className="rounded-md theme-accent-bg px-3 py-2 text-sm font-semibold">
          <i className="fa-solid fa-plus mr-1" /> Novo
        </button>
      </div>
      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">Carregando...</div>
      ) : !data.length ? (
        <Empty icon="fa-location-dot" title="Nenhum endereço salvo" desc="Cadastre para agilizar seu próximo checkout." />
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <i className="fa-solid fa-house theme-accent-text" /> {a.label ?? "Endereço"}
                    {a.is_default && <span className="rounded-full theme-accent-bg px-2 py-0.5 text-[10px] font-bold">Padrão</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.street}, {a.number} {a.complement ? `— ${a.complement}` : ""}<br />
                    {a.neighborhood ? `${a.neighborhood} — ` : ""}{a.city}/{a.state} — CEP {a.cep}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                {!a.is_default && (
                  <button onClick={() => makeDefault(a.id!)} className="rounded border border-border px-2 py-1 hover:border-primary">Tornar padrão</button>
                )}
                <button onClick={() => setEditing(a)} className="rounded border border-border px-2 py-1 hover:border-primary">Editar</button>
                <button onClick={() => del(a.id!)} className="ml-auto rounded border border-border px-2 py-1 text-destructive hover:border-destructive">Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AddressForm value={editing} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function AddressForm({ value, onCancel, onSave }: { value: Address; onCancel: () => void; onSave: (a: Address) => void }) {
  const [a, setA] = useState<Address>(value);
  const [loading, setLoading] = useState(false);
  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((r) => r.json());
      if (r?.erro) return;
      setA((x) => ({ ...x, cep, street: r.logradouro ?? x.street, neighborhood: r.bairro ?? x.neighborhood, city: r.localidade ?? x.city, state: r.uf ?? x.state }));
    } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-bold">{a.id ? "Editar" : "Novo"} endereço</h3>
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3"><label className="text-xs">Rótulo</label><input className="input" value={a.label ?? ""} onChange={(e) => setA({ ...a, label: e.target.value })} placeholder="Casa, Trabalho..." /></div>
          <div className="sm:col-span-3"><label className="text-xs">CEP</label>
            <div className="relative">
              <input className="input pr-8" value={a.cep} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); setA({ ...a, cep: v }); if (v.length === 8) lookupCep(v); }} />
              {loading && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-2.5 theme-accent-text" />}
            </div>
          </div>
          <div className="sm:col-span-4"><label className="text-xs">Rua</label><input className="input" value={a.street} onChange={(e) => setA({ ...a, street: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="text-xs">Número</label><input className="input" value={a.number} onChange={(e) => setA({ ...a, number: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="sm:col-span-6"><label className="text-xs">Complemento</label><input className="input" value={a.complement ?? ""} onChange={(e) => setA({ ...a, complement: e.target.value })} /></div>
          <div className="sm:col-span-3"><label className="text-xs">Bairro</label><input className="input" value={a.neighborhood ?? ""} onChange={(e) => setA({ ...a, neighborhood: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="text-xs">Cidade</label><input className="input" value={a.city} onChange={(e) => setA({ ...a, city: e.target.value })} /></div>
          <div className="sm:col-span-1"><label className="text-xs">UF</label><input className="input" maxLength={2} value={a.state} onChange={(e) => setA({ ...a, state: e.target.value.toUpperCase() })} /></div>
          <label className="sm:col-span-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={a.is_default} onChange={(e) => setA({ ...a, is_default: e.target.checked })} /> Definir como endereço padrão</label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={() => onSave(a)} className="rounded-md theme-accent-bg px-4 py-2 text-sm font-bold">Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ============ Points ============ */

function PointsTab({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["account_points", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_points")
        .select("id,points,reason,created_at,order_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const balance = useMemo(() => data.reduce((s, r) => s + Number(r.points || 0), 0), [data]);

  return (
    <div>
      <SectionTitle icon="fa-star" title="Pontos de fidelidade" desc="Acumule em cada compra" />
      <div className="mt-4 rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6">
        <p className="eyebrow">Saldo atual</p>
        <p className="mt-1 font-display text-6xl theme-accent-text">{balance}</p>
        <p className="mt-1 text-xs text-muted-foreground">pontos disponíveis</p>
      </div>
      <h3 className="mt-6 mb-2 text-sm font-semibold text-muted-foreground">Histórico</h3>
      {isLoading ? (
        <p className="py-6 text-center text-muted-foreground">Carregando...</p>
      ) : !data.length ? (
        <Empty icon="fa-star" title="Sem movimentações ainda" desc="Faça sua primeira compra para começar a acumular." />
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border">
          {data.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{r.reason}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <span className={`font-bold ${Number(r.points) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                {Number(r.points) >= 0 ? "+" : ""}{r.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============ Profile ============ */

function ProfileTab({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["account_profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name,phone").eq("id", userId).maybeSingle();
      return data ?? { full_name: "", phone: "" };
    },
  });
  const [form, setForm] = useState({ full_name: "", phone: "" });
  useEffect(() => { if (data) setForm({ full_name: data.full_name ?? "", phone: data.phone ?? "" }); }, [data]);

  async function save() {
    const { error } = await supabase.from("profiles").update(form).eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    qc.invalidateQueries({ queryKey: ["account_profile", userId] });
    qc.invalidateQueries({ queryKey: ["profile_menu", userId] });
  }
  async function changePassword() {
    const pw = prompt("Digite a nova senha (mínimo 6 caracteres):");
    if (!pw || pw.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
  }
  return (
    <div>
      <SectionTitle icon="fa-user-gear" title="Meu perfil" desc="Dados da conta" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Nome completo</span>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Telefone</span>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">E-mail</span>
          <input className="input" value={email} disabled />
        </label>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={save} className="rounded-md theme-accent-bg px-4 py-2 text-sm font-bold"><i className="fa-solid fa-check mr-1" /> Salvar alterações</button>
        <button onClick={changePassword} className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary"><i className="fa-solid fa-key mr-1" /> Alterar senha</button>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="ml-auto rounded-md border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">Sair da conta</button>
      </div>
    </div>
  );
}

/* ============ Shared ============ */

function SectionTitle({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg theme-accent-bg">
          <i className={`fa-solid ${icon}`} />
        </span>
        {title}
      </h2>
      {desc && <p className="mt-1 text-xs text-muted-foreground">{desc}</p>}
    </div>
  );
}

function Empty({ icon, title, desc, cta, href }: { icon: string; title: string; desc?: string; cta?: string; href?: string }) {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-full border border-border/60 text-muted-foreground">
        <i className={`fa-solid ${icon} text-2xl`} />
      </div>
      <p className="text-lg font-semibold">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{desc}</p>}
      {cta && href && (
        <Link to={href} className="mt-4 rounded-md theme-accent-bg px-4 py-2 text-sm font-bold">{cta}</Link>
      )}
    </div>
  );
}