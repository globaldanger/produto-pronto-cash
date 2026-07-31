import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createPhysicalSale } from "@/lib/payments.functions";
import { CustomerModal, type Customer } from "@/routes/_authenticated/admin.customers";
import { maskCpf, maskPhone } from "@/lib/cep";

export const Route = createFileRoute("/_authenticated/admin/pdv")({
  component: PDV,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  images: string[];
  tags: string[] | null;
};
type SaleItem = { productId: string; name: string; price: number; quantity: number; stock: number };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DEFAULT_WARRANTY =
  "Garantia de 90 dias para o serviço executado, cobrindo defeitos de instalação e da peça substituída. Não cobre danos por queda, contato com líquidos, mau uso ou violação do lacre.";

function PDV() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const submit = useServerFn(createPhysicalSale);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", cpf: "" });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [payment, setPayment] = useState("dinheiro");
  const [discount, setDiscount] = useState(0);
  const [useCredit, setUseCredit] = useState(0);
  const [amountPaid, setAmountPaid] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<SaleItem[]>([]);
  const [reviewHeader, setReviewHeader] = useState("");
  const [reviewFooter, setReviewFooter] = useState("");
  const [warrantyDays, setWarrantyDays] = useState<number>(90);
  const [warrantyText, setWarrantyText] = useState(DEFAULT_WARRANTY);

  const { data: products = [] } = useQuery({
    queryKey: ["pdv-products", search],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id,name,description,price,sale_price,stock,images,tags")
        .eq("active", true)
        .gt("stock", 0)
        .limit(30);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data } = await q;
      return (data ?? []) as Product[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["pdv-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").order("name").limit(500);
      return (data ?? []) as Customer[];
    },
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["pdv-ledger"],
    queryFn: async () => {
      const { data } = await supabase.from("customer_ledger").select("customer_id,amount");
      return (data ?? []) as { customer_id: string; amount: number }[];
    },
  });

  const balances = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of ledger) m[l.customer_id] = (m[l.customer_id] ?? 0) + Number(l.amount);
    return m;
  }, [ledger]);

  const selected = customers.find((c) => c.id === customerId) ?? null;
  const balance = customerId ? (balances[customerId] ?? 0) : 0;

  const customerMatches = useMemo(() => {
    const t = customerSearch.trim().toLowerCase();
    if (!t) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(t) ||
          (c.cpf ?? "").includes(t) ||
          (c.phone ?? "").includes(t),
      )
      .slice(0, 6);
  }, [customers, customerSearch]);

  function pickCustomer(c: Customer) {
    setCustomerId(c.id);
    setCustomer({ name: c.name, phone: c.phone ?? "", cpf: c.cpf ?? "" });
    setCustomerSearch("");
  }

  function addToCart(p: Product) {
    const price = Number(p.sale_price ?? p.price);
    setCart((c) => {
      const ex = c.find((i) => i.productId === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) {
          toast.error("Sem estoque suficiente");
          return c;
        }
        return c.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...c, { productId: p.id, name: p.name, price, quantity: 1, stock: p.stock }];
    });
  }

  function setQty(productId: string, qty: number) {
    setCart((c) =>
      c
        .map((i) =>
          i.productId === productId ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const isFiado = payment === "fiado";
  const effectivePaid = isFiado ? (amountPaid ?? 0) : Math.max(0, total - useCredit);
  const due = Math.max(0, total - useCredit - effectivePaid);

  function openReview() {
    if (cart.length === 0) return toast.error("Adicione produtos");
    if ((isFiado || useCredit > 0) && !customerId)
      return toast.error("Selecione um cliente cadastrado para fiado ou uso de crédito");
    setReviewItems(cart.map((i) => ({ ...i })));
    setReviewHeader("");
    setReviewFooter("");
    setReviewOpen(true);
  }

  const reviewSubtotal = reviewItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const reviewTotal = Math.max(0, reviewSubtotal - discount);
  const reviewDue = Math.max(0, reviewTotal - useCredit - (isFiado ? (amountPaid ?? 0) : reviewTotal - useCredit));

  async function finalize() {
    if (cart.length === 0) return toast.error("Adicione produtos");
    const items = reviewOpen ? reviewItems : cart;
    setSaving(true);
    try {
      const extraNotes = [reviewHeader, notes, reviewFooter].filter(Boolean).join("\n");
      const finalTotal = Math.max(0, items.reduce((s, i) => s + i.price * i.quantity, 0) - discount);
      const res = await submit({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price })),
          customer,
          customer_id: customerId,
          payment_method: payment,
          discount,
          notes: extraNotes || undefined,
          warranty_text: warrantyText || undefined,
          warranty_days: warrantyDays || null,
          use_credit: useCredit || 0,
          amount_paid: isFiado ? (amountPaid ?? 0) : Math.max(0, finalTotal - useCredit),
        },
      });
      toast.success(res.due > 0 ? `Venda registrada — fiado de ${brl(res.due)}` : "Venda registrada!");
      window.open(`/comprovante/${res.orderId}`, "_blank");
      setCart([]);
      setCustomer({ name: "", phone: "", cpf: "" });
      setCustomerId(null);
      setDiscount(0);
      setUseCredit(0);
      setAmountPaid(null);
      setNotes("");
      setReviewOpen(false);
      qc.invalidateQueries({ queryKey: ["pdv-ledger"] });
      navigate({ to: "/admin/orders" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <section className="space-y-3">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="input"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary"
            >
              <button onClick={() => addToCart(p)} className="w-full text-left">
                <div className="aspect-square overflow-hidden rounded bg-surface">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <i className="fa-solid fa-image text-2xl" />
                    </div>
                  )}
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-semibold">{p.name}</div>
                <div className="text-sm text-primary">{brl(Number(p.sale_price ?? p.price))}</div>
                <div className="text-xs text-muted-foreground">{p.stock} em estoque</div>
              </button>
              <button
                onClick={() => setDetail(p)}
                className="mt-2 w-full rounded border border-border py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                <i className="fa-solid fa-circle-info mr-1" /> Ver mais
              </button>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-bold">
          <i className="fa-solid fa-cash-register mr-2 text-primary" /> Venda balcão
        </h2>

        {/* Cliente */}
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Cliente</span>
            <button
              onClick={() => setNewCustomerOpen(true)}
              className="text-xs text-primary hover:underline"
            >
              <i className="fa-solid fa-user-plus mr-1" /> Novo
            </button>
          </div>
          {selected ? (
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{selected.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selected.cpf || "sem CPF"} · {selected.phone || "sem telefone"}
                </div>
                <div className="text-xs">
                  Saldo:{" "}
                  <span className={balance < 0 ? "text-destructive" : "text-primary"}>{brl(balance)}</span>
                  {Number(selected.credit_limit) > 0 && (
                    <span className="text-muted-foreground">
                      {" "}· limite {brl(Number(selected.credit_limit))}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setCustomerId(null);
                  setCustomer({ name: "", phone: "", cpf: "" });
                  setUseCredit(0);
                }}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                trocar
              </button>
            </div>
          ) : (
            <>
              <input
                className="input"
                placeholder="Buscar cliente por nome, CPF ou telefone"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerMatches.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {customerMatches.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => pickCustomer(c)}
                        className="w-full rounded border border-border bg-card px-2 py-1 text-left hover:border-primary"
                      >
                        {c.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          {c.phone ?? c.cpf ?? ""} · {brl(balances[c.id] ?? 0)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Sem cadastro? Preencha nome/telefone abaixo para venda avulsa.
              </p>
            </>
          )}
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {cart.map((i) => (
              <li key={i.productId} className="rounded border border-border bg-surface p-2">
                <div className="line-clamp-1 font-semibold">{i.name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <button onClick={() => setQty(i.productId, i.quantity - 1)} className="h-6 w-6 rounded border border-border">−</button>
                  <span className="w-8 text-center">{i.quantity}</span>
                  <button onClick={() => setQty(i.productId, i.quantity + 1)} className="h-6 w-6 rounded border border-border">+</button>
                  <span className="ml-auto font-bold">{brl(i.price * i.quantity)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-3">
          <input
            placeholder="Nome do cliente (opcional)"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            className="input"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Telefone"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: maskPhone(e.target.value) })}
              className="input"
            />
            <input
              placeholder="CPF"
              value={customer.cpf}
              onChange={(e) => setCustomer({ ...customer, cpf: maskCpf(e.target.value) })}
              className="input"
            />
          </div>
          <select value={payment} onChange={(e) => setPayment(e.target.value)} className="input">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="cartao_debito">Cartão de débito</option>
            <option value="cartao_credito">Cartão de crédito</option>
            <option value="fiado">Fiado (a prazo)</option>
            <option value="outro">Outro</option>
          </select>
          {selected && balance > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Usar crédito do cliente (disponível {brl(balance)})
              </label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={useCredit || ""}
                onChange={(e) =>
                  setUseCredit(Math.min(balance, Math.max(0, e.target.valueAsNumber || 0)))
                }
              />
            </div>
          )}
          {isFiado && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Valor pago agora (R$)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="0,00"
                value={amountPaid ?? ""}
                onChange={(e) => setAmountPaid(Math.max(0, e.target.valueAsNumber || 0))}
              />
            </div>
          )}
          <input
            type="number"
            step="0.01"
            placeholder="Desconto (R$)"
            value={discount || ""}
            onChange={(e) => setDiscount(e.target.valueAsNumber || 0)}
            className="input"
          />
          <textarea
            rows={2}
            placeholder="Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
          />
        </div>

        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-warning"><span>Desconto</span><span>-{brl(discount)}</span></div>}
          {useCredit > 0 && <div className="flex justify-between text-primary"><span>Crédito usado</span><span>-{brl(useCredit)}</span></div>}
          {due > 0 && <div className="flex justify-between text-destructive"><span>Ficará devendo</span><span>{brl(due)}</span></div>}
          <div className="flex items-baseline justify-between border-t border-border pt-2 text-lg">
            <span>Total</span>
            <span className="font-bold text-primary">{brl(total)}</span>
          </div>
        </div>

        <button
          disabled={saving || cart.length === 0}
          onClick={openReview}
          className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Revisar e finalizar
        </button>
      </aside>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDetail(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-bold">{detail.name}</h3>
              <button onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground">
                <i className="fa-solid fa-times text-xl" />
              </button>
            </div>
            {detail.images?.[0] && (
              <img src={detail.images[0]} alt="" className="mb-3 h-48 w-full rounded object-cover" />
            )}
            <p className="text-sm text-muted-foreground">{detail.description || "Sem descrição."}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded border border-border p-2">
                <div className="text-xs text-muted-foreground">Preço</div>
                <div className="font-bold text-primary">{brl(Number(detail.sale_price ?? detail.price))}</div>
              </div>
              <div className="rounded border border-border p-2">
                <div className="text-xs text-muted-foreground">Estoque</div>
                <div className="font-bold">{detail.stock} un.</div>
              </div>
            </div>
            {detail.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {detail.tags.map((t) => (
                  <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              onClick={() => { addToCart(detail); setDetail(null); }}
              className="mt-4 w-full rounded-lg bg-primary py-2 font-semibold text-primary-foreground"
            >
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      )}

      {newCustomerOpen && (
        <CustomerModal
          customer={{ name: customer.name, phone: customer.phone, cpf: customer.cpf, credit_limit: 0 }}
          onClose={() => setNewCustomerOpen(false)}
          onSaved={(c) => {
            setNewCustomerOpen(false);
            qc.invalidateQueries({ queryKey: ["pdv-customers"] });
            pickCustomer(c);
          }}
        />
      )}

      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6">
            <h3 className="mb-1 text-lg font-bold"><i className="fa-solid fa-receipt mr-2 text-primary" />Revisar comprovante</h3>
            <p className="mb-4 text-xs text-muted-foreground">Edite preços, quantidades, dados do cliente e garantia antes de finalizar.</p>

            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              <input className="input" placeholder="Nome no comprovante" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <input className="input" placeholder="CPF" value={customer.cpf} onChange={(e) => setCustomer({ ...customer, cpf: maskCpf(e.target.value) })} />
              <input className="input" placeholder="Telefone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: maskPhone(e.target.value) })} />
            </div>

            <textarea rows={2} placeholder="Mensagem no topo do comprovante (opcional)" className="input mb-3" value={reviewHeader} onChange={(e) => setReviewHeader(e.target.value)} />
            <div className="space-y-2">
              {reviewItems.map((i, idx) => (
                <div key={i.productId} className="grid grid-cols-[1fr_70px_90px_30px] gap-2 items-center rounded border border-border p-2">
                  <div className="min-w-0 truncate text-sm font-semibold">{i.name}</div>
                  <input type="number" min={0} className="input text-sm" value={i.quantity}
                    onChange={(e) => { const v = Math.max(0, Math.min(e.target.valueAsNumber || 0, i.stock)); const c = [...reviewItems]; c[idx] = { ...i, quantity: v }; setReviewItems(c.filter((x) => x.quantity > 0)); }} />
                  <input type="number" step="0.01" min={0} className="input text-sm" value={i.price}
                    onChange={(e) => { const c = [...reviewItems]; c[idx] = { ...i, price: e.target.valueAsNumber || 0 }; setReviewItems(c); }} />
                  <button onClick={() => setReviewItems(reviewItems.filter((_, j) => j !== idx))} className="text-destructive"><i className="fa-solid fa-trash" /></button>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr]">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Garantia (dias)</label>
                <input type="number" className="input" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.valueAsNumber || 0)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Termos de garantia do serviço</label>
                <textarea rows={3} className="input" value={warrantyText} onChange={(e) => setWarrantyText(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="Desconto (R$)" className="input" value={discount || ""} onChange={(e) => setDiscount(e.target.valueAsNumber || 0)} />
              <div className="flex flex-col items-end justify-center">
                <div className="text-lg font-bold text-primary">Total {brl(reviewTotal)}</div>
                {reviewDue > 0 && <div className="text-xs text-destructive">Fiado: {brl(reviewDue)}</div>}
              </div>
            </div>
            <textarea rows={2} placeholder="Mensagem no rodapé do comprovante (opcional)" className="input mt-3" value={reviewFooter} onChange={(e) => setReviewFooter(e.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setReviewOpen(false)} disabled={saving} className="rounded-md border border-border px-4 py-2 text-sm hover:border-destructive">Cancelar</button>
              <button onClick={finalize} disabled={saving || reviewItems.length === 0} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {saving ? "Salvando..." : "Confirmar venda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
