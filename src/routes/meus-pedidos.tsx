import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/StoreHeader";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({ meta: [{ title: "Meus pedidos — SmartCell" }] }),
  component: MyOrders,
});

const LABELS: Record<string, { txt: string; cls: string }> = {
  pending: { txt: "Aguardando pagamento", cls: "bg-warning/20 text-warning" },
  paid: { txt: "Pago", cls: "bg-success/20 text-success" },
  shipped: { txt: "Enviado", cls: "bg-primary/20 text-primary" },
  delivered: { txt: "Entregue", cls: "bg-success/20 text-success" },
  cancelled: { txt: "Cancelado", cls: "bg-destructive/20 text-destructive" },
  refunded: { txt: "Reembolsado", cls: "bg-muted text-muted-foreground" },
};

function MyOrders() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);
      setChecking(false);
    })();
  }, [navigate]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,status,created_at,channel,payment_method")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (checking) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StoreHeader />
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">
          <i className="fa-solid fa-receipt mr-2 text-primary" /> Meus pedidos
        </h1>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <i className="fa-solid fa-cart-shopping mb-3 text-4xl text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não fez nenhum pedido</p>
            <Link to="/" className="mt-4 inline-block text-primary hover:underline">
              Ver produtos
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => {
              const lbl = LABELS[o.status] ?? { txt: o.status, cls: "bg-muted" };
              return (
                <li key={o.id}>
                  <Link
                    to="/meus-pedidos/$id"
                    params={{ id: o.id }}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary"
                  >
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                      <div className="text-sm">
                        {new Date(o.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${lbl.cls}`}>{lbl.txt}</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        R$ {Number(o.total).toFixed(2)}
                      </div>
                      <div className="text-xs uppercase text-muted-foreground">
                        {o.payment_method ?? "—"}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}