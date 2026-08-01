import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const EVENT_PRESETS = [
  "Pedido recebido",
  "Pagamento confirmado",
  "Em separação",
  "Pronto para retirada",
  "Saiu para entrega",
  "Entregue",
  "Em manutenção",
  "Conserto finalizado",
];

function fmtBRL(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrderDetailsModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(EVENT_PRESETS[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order-details", orderId],
    queryFn: async () => {
      const [order, items, events] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase
          .from("order_tracking_events")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
      ]);
      if (order.error) throw order.error;
      return {
        order: order.data as Record<string, any> | null,
        items: (items.data ?? []) as Record<string, any>[],
        events: (events.data ?? []) as Record<string, any>[],
      };
    },
  });

  async function addEvent() {
    if (!status) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("order_tracking_events").insert({
      order_id: orderId,
      status,
      description: description || null,
      location: location || null,
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setDescription("");
    setLocation("");
    toast.success("Evento de rastreio adicionado");
    qc.invalidateQueries({ queryKey: ["admin", "order-details", orderId] });
  }

  async function removeEvent(id: string) {
    const { error } = await supabase.from("order_tracking_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "order-details", orderId] });
  }

  const o = data?.order;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">
              <i className="fa-solid fa-circle-info mr-2 text-primary" />
              Detalhes do pedido
            </h3>
            {o?.tracking_code && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(o.tracking_code);
                  toast.success("Código copiado");
                }}
                className="mt-1 rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary"
                title="Copiar código de rastreio"
              >
                {o.tracking_code} <i className="fa-solid fa-copy ml-1" />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>

        {isLoading || !o ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Cliente" value={o.customer_name ?? "—"} />
              <Info label="CPF" value={o.customer_cpf ?? "—"} />
              <Info label="Telefone" value={o.customer_phone ?? "—"} />
              <Info label="Status" value={LABEL[o.status] ?? o.status} />
              <Info label="Canal" value={o.channel === "fisica" ? "Loja física" : "Online"} />
              <Info label="Pagamento" value={(o.payment_method ?? "—").toString().toUpperCase()} />
              <Info label="Entrega" value={o.delivery_type === "retirada" ? "Retirada na loja" : "Entrega"} />
              <Info label="Data" value={new Date(o.created_at).toLocaleString("pt-BR")} />
              {o.warranty_days ? <Info label="Garantia" value={`${o.warranty_days} dias`} /> : null}
              {o.coupon_code ? <Info label="Cupom" value={o.coupon_code} /> : null}
            </div>

            {(o.shipping_street || o.customer_address) && (
              <div className="rounded-lg border border-border bg-surface p-3 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Endereço</div>
                {o.shipping_street
                  ? `${o.shipping_street}, ${o.shipping_number ?? "s/n"}${o.shipping_complement ? ` - ${o.shipping_complement}` : ""} — ${o.shipping_neighborhood ?? ""} ${o.shipping_city ?? ""}/${o.shipping_state ?? ""} — CEP ${o.shipping_cep ?? ""}`
                  : o.customer_address}
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Itens</div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {data.items.map((i) => (
                      <tr key={i.id}>
                        <td className="px-3 py-2">{i.product_name}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{i.quantity}×</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {fmtBRL(Number(i.unit_price) * Number(i.quantity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex flex-col items-end gap-0.5 text-sm">
                {Number(o.shipping_fee) > 0 && (
                  <span className="text-muted-foreground">Frete: {fmtBRL(Number(o.shipping_fee))}</span>
                )}
                {Number(o.discount) + Number(o.discount_coupon) > 0 && (
                  <span className="text-muted-foreground">
                    Desconto: −{fmtBRL(Number(o.discount) + Number(o.discount_coupon))}
                  </span>
                )}
                <span className="text-lg font-bold text-primary">Total {fmtBRL(Number(o.total))}</span>
              </div>
            </div>

            {o.warranty_text && (
              <div className="rounded-lg border border-border bg-surface p-3 text-xs whitespace-pre-line">
                <div className="mb-1 font-semibold uppercase text-muted-foreground">Termos de garantia</div>
                {o.warranty_text}
              </div>
            )}

            {o.notes && (
              <div className="rounded-lg border border-border bg-surface p-3 text-sm whitespace-pre-line">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Observações</div>
                {o.notes}
              </div>
            )}

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Rastreamento interno</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {EVENT_PRESETS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Local (opcional)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <button
                  onClick={addEvent}
                  disabled={saving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? "..." : "Adicionar"}
                </button>
              </div>
              <input
                className="input mt-2"
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <ol className="mt-4 space-y-3 border-l border-border pl-4">
                {data.events.length === 0 && (
                  <li className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</li>
                )}
                {data.events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{ev.status}</div>
                        {ev.description && <div className="text-xs text-muted-foreground">{ev.description}</div>}
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString("pt-BR")}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => removeEvent(ev.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                        title="Remover evento"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <a
                href={`/comprovante/${o.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
              >
                <i className="fa-solid fa-print mr-2" />Comprovante
              </a>
              <a
                href={`/etiqueta/${o.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-4 py-2 text-sm hover:border-primary hover:text-primary"
              >
                <i className="fa-solid fa-tag mr-2" />Etiqueta
              </a>
              <button onClick={onClose} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
