import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getOrderPublic } from "@/lib/orders-public.functions";
import { StoreHeader } from "@/components/StoreHeader";

export const Route = createFileRoute("/rastrear")({
  head: () => ({
    meta: [
      { title: "Rastrear pedido — SmartCell" },
      { name: "description", content: "Acompanhe o status do seu pedido pelo número." },
    ],
  }),
  component: TrackPage,
});

type OrderResult = Awaited<ReturnType<typeof getOrderPublic>>;

const STATUS_FLOW: { key: string; label: string; icon: string }[] = [
  { key: "pending", label: "Aguardando pagamento", icon: "fa-clock" },
  { key: "paid", label: "Pagamento aprovado", icon: "fa-circle-check" },
  { key: "shipped", label: "Em transporte / pronto", icon: "fa-truck" },
  { key: "delivered", label: "Entregue / retirado", icon: "fa-flag-checkered" },
];

function statusIndex(s: string) {
  const i = STATUS_FLOW.findIndex((x) => x.key === s);
  return i < 0 ? 0 : i;
}

function TrackPage() {
  const lookup = useServerFn(getOrderPublic);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);

  async function search() {
    const id = code.trim();
    if (!id) return toast.error("Informe o número do pedido");
    setLoading(true);
    try {
      const res = await lookup({ data: { orderId: id } });
      setResult(res);
    } catch (e) {
      setResult(null);
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const o = result?.order;
  const cancelled = o?.status === "cancelled" || o?.status === "refunded";
  const activeIdx = o ? statusIndex(o.status) : -1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            <i className="fa-solid fa-arrow-left mr-1" /> Voltar para a loja
          </Link>
        </div>
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight md:text-4xl">
          Rastrear <span className="text-primary">pedido</span>
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Cole o número do pedido recebido após a compra (ex: <code>a1b2c3d4-...</code>).
          {" "}Tem um conserto?{" "}
          <Link to="/garantia/verificar" className="text-primary hover:underline">
            Verificar garantia pelo código da OS
          </Link>
          .
        </p>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input flex-1"
              placeholder="Número do pedido"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button
              onClick={search}
              disabled={loading}
              className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-magnifying-glass mr-2" /> Buscar</>}
            </button>
          </div>
        </div>

        {o && (
          <div className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Pedido</p>
                <p className="font-mono text-sm">#{o.id.slice(0, 8)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-muted-foreground">Total</p>
                <p className="text-2xl font-extrabold text-primary">
                  R$ {Number(o.total).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {o.payment_method === "pix" ? "Pix" : o.payment_method === "card" ? "Cartão" : (o.payment_method ?? "—")}
                  {" · "}
                  {o.delivery_type === "pickup" ? "Retirada na loja" : "Entrega"}
                </p>
              </div>
            </div>

            {cancelled ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center">
                <i className="fa-solid fa-circle-xmark mb-2 text-2xl text-destructive" />
                <p className="font-bold text-destructive">
                  {o.status === "refunded" ? "Pedido reembolsado" : "Pedido cancelado"}
                </p>
              </div>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-border pl-6">
                {STATUS_FLOW.map((step, i) => {
                  const done = i <= activeIdx;
                  const current = i === activeIdx;
                  return (
                    <li key={step.key} className="relative">
                      <span
                        className={`absolute -left-[34px] grid h-7 w-7 place-items-center rounded-full border-2 ${
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        <i className={`fa-solid ${step.icon} text-xs`} />
                      </span>
                      <p className={`font-semibold ${current ? "text-primary" : done ? "" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      {current && o.status === "paid" && o.paid_at && (
                        <p className="text-xs text-muted-foreground">
                          Confirmado em {new Date(o.paid_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-bold">Itens</p>
              <ul className="space-y-2">
                {result!.items.map((it, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    {it.product_image ? (
                      <img src={it.product_image} alt="" className="h-10 w-10 rounded border border-border object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded border border-border bg-surface text-muted-foreground">
                        <i className="fa-solid fa-image text-xs" />
                      </div>
                    )}
                    <span className="flex-1">{it.product_name}</span>
                    <span className="text-muted-foreground">×{it.quantity}</span>
                    <span className="font-semibold">R$ {(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}