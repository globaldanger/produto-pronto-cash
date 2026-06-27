import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkPaymentStatus } from "@/lib/payments.functions";
import { StoreHeader } from "@/components/StoreHeader";

export const Route = createFileRoute("/checkout/sucesso/$id")({
  head: () => ({ meta: [{ title: "Pagamento Pix — SmartCell" }] }),
  component: SuccessPage,
});

type Order = {
  id: string;
  total: number;
  status: string;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_expires_at: string | null;
  payment_method: string | null;
  mp_init_point: string | null;
};

function SuccessPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const check = useServerFn(checkPaymentStatus);
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<string>("pending");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,total,status,pix_qr_code,pix_qr_code_base64,pix_expires_at,payment_method,mp_init_point")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setOrder(data as Order);
        setStatus(data.status);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (status === "paid") return;
    const t = setInterval(async () => {
      try {
        const r = await check({ data: { orderId: id } });
        if (r.status === "paid") {
          setStatus("paid");
          toast.success("Pagamento confirmado!");
        }
      } catch {
        /* noop */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [id, status, check]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        {!order ? (
          <p className="p-12 text-center text-muted-foreground">Carregando pedido...</p>
        ) : status === "paid" ? (
          <div className="rounded-xl border border-success/40 bg-card p-8 text-center">
            <i className="fa-solid fa-circle-check mb-4 text-6xl text-success" />
            <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
            <p className="mt-2 text-muted-foreground">
              Pedido <span className="font-mono">#{id.slice(0, 8)}</span> — R$ {Number(order.total).toFixed(2)}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => navigate({ to: "/meus-pedidos/$id", params: { id } })}
                className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
              >
                Ver pedido
              </button>
              <a
                href={`/comprovante/${id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-4 py-2"
              >
                <i className="fa-solid fa-print mr-1" /> Comprovante
              </a>
            </div>
          </div>
        ) : order.payment_method === "card" ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            <i className="fa-solid fa-credit-card mb-4 text-6xl text-primary" />
            <h1 className="text-2xl font-bold">Pagamento com cartão</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Clique abaixo para concluir o pagamento no Mercado Pago.
            </p>
            {order.mp_init_point && (
              <a
                href={order.mp_init_point}
                className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow hover:bg-primary/90"
              >
                <i className="fa-solid fa-lock mr-2" /> Pagar R$ {Number(order.total).toFixed(2)}
              </a>
            )}
            <div className="mt-6 flex justify-center text-sm text-muted-foreground">
              <i className="fa-solid fa-spinner fa-spin mr-2 text-primary" /> Aguardando confirmação...
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold">Pague com Pix</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escaneie o QR code ou copie o código abaixo. Confirmação automática em segundos.
            </p>
            {order.pix_qr_code_base64 && (
              <img
                src={`data:image/png;base64,${order.pix_qr_code_base64}`}
                alt="QR Code Pix"
                className="mx-auto mt-6 h-64 w-64 rounded-lg border border-border bg-white p-2"
              />
            )}
            {order.pix_qr_code && (
              <div className="mx-auto mt-6 max-w-md">
                <label className="text-xs text-muted-foreground">Código Pix copia-e-cola</label>
                <textarea
                  readOnly
                  rows={3}
                  value={order.pix_qr_code}
                  className="input mt-1 font-mono text-xs"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(order.pix_qr_code ?? "");
                    toast.success("Copiado!");
                  }}
                  className="mt-2 w-full rounded-md bg-primary py-2 font-semibold text-primary-foreground"
                >
                  <i className="fa-solid fa-copy mr-1" /> Copiar código
                </button>
              </div>
            )}
            <div className="mt-6 flex justify-center text-sm text-muted-foreground">
              <i className="fa-solid fa-spinner fa-spin mr-2 text-primary" /> Aguardando pagamento...
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Total: <span className="font-bold text-primary">R$ {Number(order.total).toFixed(2)}</span>
            </p>
            <Link to="/meus-pedidos" className="mt-6 inline-block text-xs text-muted-foreground hover:text-primary">
              Pagar depois — ver meus pedidos
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}