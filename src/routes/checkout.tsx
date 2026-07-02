import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";
import { createPixCheckout } from "@/lib/payments.functions";
import { validateCoupon, type ValidatedCoupon } from "@/lib/coupons.functions";
import { StoreHeader } from "@/components/StoreHeader";
import { CartDrawer } from "@/components/CartDrawer";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar compra — SmartCell" }] }),
  component: CheckoutPage,
});

function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function onlyDigits(v: string, max = 10) {
  return v.replace(/\D/g, "").slice(0, max);
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clear, setQty, remove } = useCart();
  const submit = useServerFn(createPixCheckout);
  const runValidateCoupon = useServerFn(validateCoupon);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    delivery_type: "delivery" as "delivery" | "pickup",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [payment, setPayment] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/checkout" } as never });
        return;
      }
      setUser({ id: data.user.id, email: data.user.email ?? undefined });
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name,phone")
        .eq("id", data.user.id)
        .maybeSingle();
      setForm((f) => ({
        ...f,
        name: prof?.full_name ?? "",
        phone: prof?.phone ?? "",
        email: data.user!.email ?? "",
      }));
      setChecking(false);
    })();
  }, [navigate]);

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j?.erro) return toast.error("CEP não encontrado");
      setForm((f) => ({
        ...f,
        cep,
        street: j.logradouro ?? f.street,
        neighborhood: j.bairro ?? f.neighborhood,
        city: j.localidade ?? f.city,
        state: j.uf ?? f.state,
      }));
    } catch {
      toast.error("Falha ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  }

  async function pay() {
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!form.name.trim()) return toast.error("Informe seu nome completo");
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11)
      return toast.error("Telefone inválido (use DDD + número)");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return toast.error("E-mail inválido");
    if (form.delivery_type !== "delivery" && form.delivery_type !== "pickup")
      return toast.error("Selecione entrega ou retirada");
    if (form.delivery_type === "delivery") {
      const cepDigits = form.cep.replace(/\D/g, "");
      if (cepDigits.length !== 8) return toast.error("CEP inválido");
      if (!form.street.trim()) return toast.error("Informe a rua");
      if (!form.number.trim() || !/^\d+$/.test(form.number))
        return toast.error("Informe o número da casa (apenas dígitos)");
      if (!form.city.trim()) return toast.error("Informe a cidade");
      if (!form.state || form.state.length !== 2) return toast.error("Informe a UF (2 letras)");
    }
    setLoading(true);
    try {
      const res = await submit({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customer: { ...form, phone: phoneDigits, cep: form.cep.replace(/\D/g, "") },
          payment_method: payment,
          coupon_code: coupon?.code,
        },
      });
      clear();
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      navigate({ to: "/checkout/sucesso/$id", params: { id: res.orderId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const itemsTotal = useMemo(() => total(), [items, total]);
  const grandTotal = Math.max(0, itemsTotal - (coupon?.discount ?? 0));

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const c = await runValidateCoupon({ data: { code: couponInput, subtotal: itemsTotal } });
      setCoupon(c);
      toast.success(`Cupom aplicado: −R$ ${c.discount.toFixed(2)}`);
    } catch (e) { toast.error((e as Error).message); setCoupon(null); }
    finally { setCouponLoading(false); }
  }

  if (checking || !user) {
    return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            <i className="fa-solid fa-arrow-left mr-1" /> Continuar comprando
          </Link>
        </div>
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight md:text-4xl">
          Finalizar <span className="text-primary">compra</span>
        </h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <Section icon="fa-truck" title="Como você quer receber?">
              <div className="grid grid-cols-2 gap-3">
                <OptionCard
                  active={form.delivery_type === "delivery"}
                  onClick={() => setForm({ ...form, delivery_type: "delivery" })}
                  icon="fa-house"
                  title="Entrega"
                  desc="Receba no endereço"
                />
                <OptionCard
                  active={form.delivery_type === "pickup"}
                  onClick={() => setForm({ ...form, delivery_type: "pickup" })}
                  icon="fa-store"
                  title="Retirar na loja"
                  desc="Sem custo de entrega"
                />
              </div>
            </Section>

            <Section icon="fa-user" title="Seus dados">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nome completo *">
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Telefone / WhatsApp *">
                  <input
                    className="input"
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="E-mail">
                    <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </Field>
                </div>
              </div>
            </Section>

            {form.delivery_type === "delivery" && (
              <Section icon="fa-location-dot" title="Endereço de entrega">
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <Field label="CEP *">
                      <div className="relative">
                        <input
                          className="input pr-9"
                          placeholder="00000-000"
                          value={form.cep}
                          onChange={(e) => {
                            const masked = maskCep(e.target.value);
                            setForm({ ...form, cep: masked });
                            if (masked.replace(/\D/g, "").length === 8) lookupCep(masked);
                          }}
                          onBlur={(e) => lookupCep(e.target.value)}
                          inputMode="numeric"
                          maxLength={9}
                        />
                        {cepLoading && <i className="fa-solid fa-spinner fa-spin absolute right-3 top-2.5 text-primary" />}
                      </div>
                    </Field>
                  </div>
                  <div className="md:col-span-4">
                    <Field label="Rua *">
                      <input className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Número *">
                      <input
                        className="input"
                        inputMode="numeric"
                        placeholder="123"
                        value={form.number}
                        onChange={(e) => setForm({ ...form, number: onlyDigits(e.target.value, 6) })}
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-4">
                    <Field label="Complemento">
                      <input className="input" placeholder="Apto, bloco, ponto de referência" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
                    </Field>
                  </div>
                  <div className="md:col-span-3">
                    <Field label="Bairro">
                      <input className="input" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Cidade *">
                      <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </Field>
                  </div>
                  <div className="md:col-span-1">
                    <Field label="UF">
                      <input className="input" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
                    </Field>
                  </div>
                </div>
              </Section>
            )}

            <Section icon="fa-credit-card" title="Forma de pagamento">
              <div className="grid gap-3 md:grid-cols-2">
                <OptionCard
                  active={payment === "pix"}
                  onClick={() => setPayment("pix")}
                  icon="fa-qrcode"
                  title="Pix"
                  desc="Aprovação imediata"
                  badge="Recomendado"
                />
                <OptionCard
                  active={payment === "card"}
                  onClick={() => setPayment("card")}
                  icon="fa-credit-card"
                  title="Cartão"
                  desc="Crédito ou Débito · até 12x"
                />
              </div>
            </Section>

            <Section icon="fa-message" title="Observações (opcional)">
              <textarea
                rows={3}
                className="input"
                placeholder="Alguma informação para o vendedor?"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-lg">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <i className="fa-solid fa-bag-shopping text-primary" /> Resumo do pedido
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Carrinho vazio.{" "}
                  <Link to="/" className="text-primary hover:underline">
                    Ir para a loja
                  </Link>
                </p>
              ) : (
                <>
                  <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {items.map((i) => (
                      <li key={i.productId} className="flex gap-3">
                        {i.image ? (
                          <img src={i.image} alt="" className="h-14 w-14 shrink-0 rounded-md border border-border object-cover" />
                        ) : (
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-border bg-surface text-muted-foreground">
                            <i className="fa-solid fa-image" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-semibold">{i.name}</p>
                          <div className="mt-1 flex items-center gap-1">
                            <button
                              onClick={() => setQty(i.productId, i.quantity - 1)}
                              className="grid h-6 w-6 place-items-center rounded border border-border text-xs hover:border-primary"
                            >−</button>
                            <span className="w-6 text-center text-xs font-bold">{i.quantity}</span>
                            <button
                              onClick={() => setQty(i.productId, i.quantity + 1)}
                              className="grid h-6 w-6 place-items-center rounded border border-border text-xs hover:border-primary"
                            >+</button>
                            <button
                              onClick={() => remove(i.productId)}
                              className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                              title="Remover"
                            ><i className="fa-solid fa-trash" /></button>
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-sm font-bold">
                          R$ {(i.price * i.quantity).toFixed(2)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-1 border-t border-border pt-3 text-sm">
                    <Row label="Subtotal" value={`R$ ${itemsTotal.toFixed(2)}`} />
                    <Row
                      label={form.delivery_type === "pickup" ? "Retirada" : "Entrega"}
                      value={form.delivery_type === "pickup" ? "Grátis" : "A combinar"}
                      muted
                    />
                    {coupon && (
                      <Row label={`Cupom ${coupon.code}`} value={`− R$ ${coupon.discount.toFixed(2)}`} />
                    )}
                  </div>
                  <div className="border-t border-border pt-3">
                    {coupon ? (
                      <div className="flex items-center justify-between rounded-lg theme-accent-bg px-3 py-2 text-xs font-bold">
                        <span><i className="fa-solid fa-ticket mr-1" /> {coupon.code} aplicado</span>
                        <button onClick={() => { setCoupon(null); setCouponInput(""); }} className="text-black/70 hover:text-black"><i className="fa-solid fa-xmark" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="input flex-1"
                          placeholder="Cupom de desconto"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        />
                        <button
                          type="button"
                          onClick={applyCoupon}
                          disabled={couponLoading}
                          className="rounded-md border border-border px-3 text-xs font-semibold hover:border-primary disabled:opacity-50"
                        >
                          {couponLoading ? <i className="fa-solid fa-spinner fa-spin" /> : "Aplicar"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between border-t border-border pt-3">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-3xl font-extrabold text-primary">R$ {grandTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={pay}
                    disabled={loading}
                    className="w-full rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? (
                      <><i className="fa-solid fa-spinner fa-spin mr-2" /> Processando...</>
                    ) : payment === "pix" ? (
                      <><i className="fa-solid fa-qrcode mr-2" /> Gerar QR Code Pix</>
                    ) : (
                      <><i className="fa-solid fa-lock mr-2" /> Pagar com cartão</>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <i className="fa-solid fa-shield-halved text-success" />
                    Pagamento seguro via Mercado Pago
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
      <CartDrawer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <i className={`fa-solid ${icon}`} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function OptionCard({
  active, onClick, icon, title, desc, badge,
}: {
  active: boolean; onClick: () => void; icon: string; title: string; desc: string; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
        active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}>
        <i className={`fa-solid ${icon}`} />
      </span>
      <span className="flex-1">
        <span className="block font-bold leading-tight">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <i className="fa-solid fa-circle-check text-primary" />}
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase text-success-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-semibold"}>{value}</span>
    </div>
  );
}