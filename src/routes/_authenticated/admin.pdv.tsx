import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createPhysicalSale } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/admin/pdv")({
  component: PDV,
});

type Product = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  stock: number;
  images: string[];
};
type SaleItem = { productId: string; name: string; price: number; quantity: number; stock: number };

function PDV() {
  const navigate = useNavigate();
  const submit = useServerFn(createPhysicalSale);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [payment, setPayment] = useState("dinheiro");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<SaleItem[]>([]);
  const [reviewHeader, setReviewHeader] = useState("");
  const [reviewFooter, setReviewFooter] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["pdv-products", search],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id,name,price,sale_price,stock,images")
        .eq("active", true)
        .gt("stock", 0)
        .limit(30);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data } = await q;
      return (data ?? []) as Product[];
    },
  });

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

  function openReview() {
    if (cart.length === 0) return toast.error("Adicione produtos");
    setReviewItems(cart.map((i) => ({ ...i })));
    setReviewHeader("");
    setReviewFooter("");
    setReviewOpen(true);
  }

  const reviewSubtotal = reviewItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const reviewTotal = Math.max(0, reviewSubtotal - discount);

  async function finalize() {
    if (cart.length === 0) return toast.error("Adicione produtos");
    const items = reviewOpen ? reviewItems : cart;
    setSaving(true);
    try {
      const extraNotes = [reviewHeader, notes, reviewFooter].filter(Boolean).join("\n");
      const res = await submit({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price })),
          customer,
          payment_method: payment,
          discount,
          notes: extraNotes || undefined,
        },
      });
      toast.success("Venda registrada!");
      window.open(`/comprovante/${res.orderId}`, "_blank");
      setCart([]);
      setCustomer({ name: "", phone: "" });
      setDiscount(0);
      setNotes("");
      setReviewOpen(false);
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
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="rounded-lg border border-border bg-card p-3 text-left hover:border-primary"
            >
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
              <div className="text-sm text-primary">R$ {Number(p.sale_price ?? p.price).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{p.stock} em estoque</div>
            </button>
          ))}
        </div>
      </section>

      <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-bold">
          <i className="fa-solid fa-cash-register mr-2 text-primary" /> Venda balcão
        </h2>
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
                  <span className="ml-auto font-bold">R$ {(i.price * i.quantity).toFixed(2)}</span>
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
          <input
            placeholder="Telefone (opcional)"
            value={customer.phone}
            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
            className="input"
          />
          <select value={payment} onChange={(e) => setPayment(e.target.value)} className="input">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="cartao_debito">Cartão de débito</option>
            <option value="cartao_credito">Cartão de crédito</option>
            <option value="outro">Outro</option>
          </select>
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
          <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div className="flex justify-between text-warning"><span>Desconto</span><span>-R$ {discount.toFixed(2)}</span></div>}
          <div className="flex items-baseline justify-between border-t border-border pt-2 text-lg">
            <span>Total</span>
            <span className="font-bold text-primary">R$ {total.toFixed(2)}</span>
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

      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6">
            <h3 className="mb-1 text-lg font-bold"><i className="fa-solid fa-receipt mr-2 text-primary" />Revisar comprovante</h3>
            <p className="mb-4 text-xs text-muted-foreground">Edite preços, quantidades e adicione mensagens antes de finalizar.</p>
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
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="Desconto (R$)" className="input" value={discount || ""} onChange={(e) => setDiscount(e.target.valueAsNumber || 0)} />
              <div className="flex items-center justify-end text-lg font-bold text-primary">Total R$ {reviewTotal.toFixed(2)}</div>
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