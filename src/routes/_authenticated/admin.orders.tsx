import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { cancelOrder, refundOrder, deleteOrder, verifyOrderPayment } from "@/lib/payments.functions";
import { updateOrderItems } from "@/lib/admin.functions";
import { logAudit } from "@/lib/audit.functions";
import { usePermissions } from "@/lib/permissions";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
  created_at: string;
  channel: string;
  payment_method: string | null;
};

const STATUS = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;
type Status = (typeof STATUS)[number];
const LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

function fmtBRL(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KanbanBoard({ orders, onMove }: { orders: Order[]; onMove: (id: string, status: Status) => void }) {
  const cols: Status[] = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {cols.map((col) => {
        const list = orders.filter((o) => o.status === col);
        return (
          <div
            key={col}
            className="min-w-[260px] flex-1 rounded-xl border border-border bg-surface p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) onMove(id, col);
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold">{LABEL[col]}</h3>
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{list.length}</span>
            </div>
            <div className="space-y-2">
              {list.map((o) => (
                <div
                  key={o.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
                  className="cursor-grab rounded-lg border border-border bg-card p-3 text-xs active:cursor-grabbing hover:border-primary"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">#{o.id.slice(0, 8)}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{o.channel === "fisica" ? "Física" : "Online"}</span>
                  </div>
                  <div className="truncate font-semibold">{o.customer_name ?? "Cliente"}</div>
                  <div className="text-[11px] text-muted-foreground">{o.customer_phone ?? ""}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-primary">{fmtBRL(Number(o.total))}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <a href={`/comprovante/${o.id}`} target="_blank" rel="noreferrer" className="rounded border border-border px-2 py-0.5 text-[10px] hover:border-primary"><i className="fa-solid fa-print" /></a>
                    <a href={`/etiqueta/${o.id}`} target="_blank" rel="noreferrer" className="rounded border border-border px-2 py-0.5 text-[10px] hover:border-primary"><i className="fa-solid fa-tag" /></a>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="rounded border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">Arraste aqui</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const doCancel = useServerFn(cancelOrder);
  const doRefund = useServerFn(refundOrder);
  const doUpdate = useServerFn(updateOrderItems);
  const doDelete = useServerFn(deleteOrder);
  const doVerify = useServerFn(verifyOrderPayment);
  const { isAdmin } = usePermissions();
  const [editing, setEditing] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<{ product_id: string; product_name: string; quantity: number; unit_price: number }[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editDiscount, setEditDiscount] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [details, setDetails] = useState<string | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["admin", "orders", filter, channelFilter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as Status);
      if (channelFilter !== "all") q = q.eq("channel", channelFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    logAudit({ data: { action: "order.status_change", entity_type: "order", entity_id: id, details: { status } } }).catch(() => undefined);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  }

  async function cancel(id: string) {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;
    try {
      await doCancel({ data: { orderId: id, reason } });
      logAudit({ data: { action: "order.cancel", entity_type: "order", entity_id: id, details: { reason } } }).catch(() => undefined);
      toast.success("Venda cancelada — estoque devolvido");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function refund(id: string) {
    const reason = prompt("Motivo do reembolso (opcional):") ?? undefined;
    if (!confirm("Confirmar reembolso? O estoque será devolvido.")) return;
    try {
      await doRefund({ data: { orderId: id, reason } });
      logAudit({ data: { action: "order.refund", entity_type: "order", entity_id: id, details: { reason } } }).catch(() => undefined);
      toast.success("Pedido reembolsado");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function destroy(id: string) {
    if (!confirm("Apagar este pedido permanentemente? Esta ação não pode ser desfeita.")) return;
    try {
      await doDelete({ data: { orderId: id } });
      logAudit({ data: { action: "order.delete", entity_type: "order", entity_id: id } }).catch(() => undefined);
      toast.success("Pedido apagado");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function verify(id: string) {
    try {
      const r: { status: string; info?: string } = await doVerify({ data: { orderId: id } });
      if (r.status === "paid") toast.success(r.info ?? "Pagamento confirmado");
      else toast.info(r.info ?? `Status: ${r.status}`);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function openEdit(id: string) {
    const [{ data: o }, { data: items }] = await Promise.all([
      supabase.from("orders").select("id,discount,notes").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("product_id,product_name,quantity,unit_price").eq("order_id", id),
    ]);
    if (!o) return toast.error("Pedido não encontrado");
    setEditing(id);
    setEditItems((items ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price), quantity: Number(i.quantity) })));
    setEditNotes(o.notes ?? "");
    setEditDiscount(Number(o.discount ?? 0));
  }

  async function saveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      await doUpdate({ data: { orderId: editing, items: editItems, discount: editDiscount, notes: editNotes } });
      toast.success("Comprovante atualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSavingEdit(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border p-1">
          <button onClick={() => setView("lista")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <i className="fa-solid fa-list mr-1" /> Lista
          </button>
          <button onClick={() => setView("kanban")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <i className="fa-solid fa-columns mr-1" /> Kanban
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {["all", "online", "fisica"].map((c) => (
          <button
            key={c}
            onClick={() => setChannelFilter(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${channelFilter === c ? "bg-accent text-accent-foreground" : "border border-border"}`}
          >
            {c === "all" ? "Todos os canais" : c === "online" ? "Online" : "Loja física"}
          </button>
        ))}
      </div>
      {view === "lista" && <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === "all" ? "bg-primary text-primary-foreground" : "border border-border"}`}
        >
          Todos
        </button>
        {STATUS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "border border-border"}`}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>}

      {view === "kanban" ? (
        <KanbanBoard orders={orders} onMove={updateStatus} />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <i className="fa-solid fa-receipt mb-3 text-4xl" />
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Pedido</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Pagamento</th>
                <th className="px-4 py-3 text-center">Canal</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{o.customer_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_phone ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{fmtBRL(Number(o.total))}</td>
                  <td className="px-4 py-3 text-center text-xs uppercase">{o.payment_method ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {o.channel === "fisica" ? "Física" : "Online"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value as Status)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      {STATUS.map((s) => (
                        <option key={s} value={s}>{LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDetails(o.id)}
                      className="mr-1 rounded border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                      title="Ver mais"
                    >
                      <i className="fa-solid fa-eye" />
                    </button>
                    <a
                      href={`/comprovante/${o.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-1 inline-block rounded border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                      title="Comprovante"
                    >
                      <i className="fa-solid fa-print" />
                    </a>
                    <a
                      href={`/etiqueta/${o.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-1 inline-block rounded border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                      title="Etiqueta de envio"
                    >
                      <i className="fa-solid fa-tag" />
                    </a>
                    {o.status !== "cancelled" && o.status !== "refunded" && (
                      <button
                        onClick={() => cancel(o.id)}
                        className="mr-1 rounded border border-border px-2 py-1 text-xs hover:border-destructive hover:text-destructive"
                        title="Cancelar"
                      >
                        <i className="fa-solid fa-ban" />
                      </button>
                    )}
                    {o.status === "pending" && o.channel === "online" && (
                      <button
                        onClick={() => verify(o.id)}
                        className="mr-1 rounded border border-border px-2 py-1 text-xs hover:border-success hover:text-success"
                        title="Verificar pagamento no Mercado Pago"
                      >
                        <i className="fa-solid fa-circle-check" />
                      </button>
                    )}
                    {o.status === "paid" || o.status === "shipped" || o.status === "delivered" ? (
                      <button
                        onClick={() => refund(o.id)}
                        className="rounded border border-border px-2 py-1 text-xs hover:border-warning hover:text-warning"
                        title="Reembolsar"
                      >
                        <i className="fa-solid fa-rotate-left" />
                      </button>
                    ) : null}
                    {isAdmin && o.status !== "cancelled" && o.status !== "refunded" && (
                      <button
                        onClick={() => openEdit(o.id)}
                        className="ml-1 rounded border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary"
                        title="Editar comprovante"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => destroy(o.id)}
                        className="ml-1 rounded border border-border px-2 py-1 text-xs hover:border-destructive hover:text-destructive"
                        title="Apagar pedido"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6">
            <h3 className="mb-1 text-lg font-bold"><i className="fa-solid fa-pen-to-square mr-2 text-primary" />Editar comprovante</h3>
            <p className="mb-4 text-xs text-muted-foreground">Ajuste itens, preços e observações. O estoque é recalculado se o pedido já foi pago.</p>
            <div className="space-y-2">
              {editItems.map((i, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_90px_30px] items-center gap-2 rounded border border-border p-2">
                  <div className="min-w-0 truncate text-sm font-semibold">{i.product_name}</div>
                  <input type="number" min={0} className="input text-sm" value={i.quantity}
                    onChange={(e) => { const c = [...editItems]; c[idx] = { ...i, quantity: Math.max(0, e.target.valueAsNumber || 0) }; setEditItems(c); }} />
                  <input type="number" step="0.01" min={0} className="input text-sm" value={i.unit_price}
                    onChange={(e) => { const c = [...editItems]; c[idx] = { ...i, unit_price: e.target.valueAsNumber || 0 }; setEditItems(c); }} />
                  <button onClick={() => setEditItems(editItems.filter((_, j) => j !== idx))} className="text-destructive"><i className="fa-solid fa-trash" /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="Desconto (R$)" className="input" value={editDiscount || ""} onChange={(e) => setEditDiscount(e.target.valueAsNumber || 0)} />
              <div className="flex items-center justify-end text-lg font-bold text-primary">
                Total R$ {Math.max(0, editItems.reduce((s,i)=>s+i.unit_price*i.quantity,0) - editDiscount).toFixed(2)}
              </div>
            </div>
            <textarea rows={3} className="input mt-3" placeholder="Observações" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} disabled={savingEdit} className="rounded-md border border-border px-4 py-2 text-sm hover:border-destructive">Cancelar</button>
              <button onClick={saveEdit} disabled={savingEdit || editItems.length === 0} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {savingEdit ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}