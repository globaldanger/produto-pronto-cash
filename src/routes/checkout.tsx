import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/stores/cart";
import { createPixCheckout } from "@/lib/payments.functions";
import { StoreHeader } from "@/components/StoreHeader";
import { CartDrawer } from "@/components/CartDrawer";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar compra — SmartCell" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clear } = useCart();
  const submit = useServerFn(createPixCheckout);

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "", email: "" });
  const [loading, setLoading] = useState(false);

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

  async function pay() {
    if (!form.name || !form.phone) return toast.error("Preencha nome e telefone");
    if (items.length === 0) return toast.error("Carrinho vazio");
    setLoading(true);
    try {
      const res = await submit({
        data: {
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customer: form,
        },
      });
      clear();
      navigate({ to: "/checkout/sucesso/$id", params: { id: res.orderId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (checking || !user) {
    return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1fr_380px]">
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="mb-4 text-2xl font-bold">Dados de entrega</h1>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nome completo *">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Telefone *">
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Endereço (rua, número, bairro, cidade)">
                <textarea
                  rows={2}
                  className="input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Observações">
                <textarea
                  rows={2}
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Seu pedido</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Carrinho vazio. <Link to="/" className="text-primary hover:underline">Voltar para a loja</Link>
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border text-sm">
                {items.map((i) => (
                  <li key={i.productId} className="flex justify-between gap-2 py-2">
                    <span className="line-clamp-1">
                      {i.quantity}× {i.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      R$ {(i.price * i.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">R$ {total().toFixed(2)}</span>
              </div>
              <button
                onClick={pay}
                disabled={loading}
                className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <><i className="fa-solid fa-spinner fa-spin mr-2" /> Gerando Pix...</>
                ) : (
                  <><i className="fa-brands fa-pix mr-2" /> Pagar com Pix</>
                )}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Pagamento processado via Mercado Pago
              </p>
            </>
          )}
        </aside>
      </main>
      <CartDrawer />
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