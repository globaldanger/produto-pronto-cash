import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "Cupons — Admin" }] }),
  component: CouponsPage,
});

type CouponType = "percent" | "fixed" | "free_shipping";
type Coupon = {
  id?: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  min_order: number;
  max_uses: number | null;
  uses?: number;
  expires_at: string | null;
  active: boolean;
};

const EMPTY: Coupon = {
  code: "", description: "", type: "percent", value: 10,
  min_order: 0, max_uses: null, expires_at: null, active: true,
};

function CouponsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Coupon | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin_coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Coupon[];
    },
  });

  const filtered = data.filter((c) =>
    !q ? true : c.code.toLowerCase().includes(q.toLowerCase()) || (c.description ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const save = useMutation({
    mutationFn: async (c: Coupon) => {
      const payload = {
        code: c.code.trim().toUpperCase(),
        description: c.description || null,
        type: c.type,
        value: Number(c.value),
        min_order: Number(c.min_order),
        max_uses: c.max_uses == null || Number.isNaN(Number(c.max_uses)) ? null : Number(c.max_uses),
        expires_at: c.expires_at || null,
        active: c.active,
      };
      if (!payload.code) throw new Error("Informe um código");
      if (c.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Cupom salvo"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin_coupons"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function togglePause(c: Coupon) {
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id!);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin_coupons"] });
  }
  async function expire(c: Coupon) {
    if (!confirm(`Expirar cupom ${c.code} agora?`)) return;
    const { error } = await supabase.from("coupons").update({ expires_at: new Date().toISOString(), active: false }).eq("id", c.id!);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin_coupons"] });
  }
  async function remove(c: Coupon) {
    if (!confirm(`Excluir cupom ${c.code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id!);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin_coupons"] });
  }

  function status(c: Coupon) {
    if (!c.active) return { label: "Pausado", color: "bg-neutral-500/15 text-neutral-300" };
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now())
      return { label: "Expirado", color: "bg-destructive/15 text-destructive" };
    if (c.max_uses !== null && Number(c.uses ?? 0) >= Number(c.max_uses))
      return { label: "Esgotado", color: "bg-amber-500/15 text-amber-400" };
    return { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400" };
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cupons de desconto</h1>
          <p className="text-sm text-muted-foreground">Crie, pause, expire e monitore o uso dos seus cupons.</p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Buscar cupom..."
            className="input w-56"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={() => setEditing({ ...EMPTY })} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            <i className="fa-solid fa-plus mr-1" /> Novo cupom
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Mín. pedido</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Validade</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Carregando...</td></tr>
            ) : !filtered.length ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum cupom cadastrado.</td></tr>
            ) : filtered.map((c) => {
              const st = status(c);
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-mono font-bold">{c.code}<div className="text-[11px] font-normal text-muted-foreground">{c.description}</div></td>
                  <td className="p-3">{c.type === "percent" ? "%" : c.type === "fixed" ? "R$" : "Frete"}</td>
                  <td className="p-3">{c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? `R$ ${Number(c.value).toFixed(2)}` : "Grátis"}</td>
                  <td className="p-3">R$ {Number(c.min_order).toFixed(2)}</td>
                  <td className="p-3">{c.uses ?? 0}{c.max_uses ? `/${c.max_uses}` : ""}</td>
                  <td className="p-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.color}`}>{st.label}</span></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button title={c.active ? "Pausar" : "Ativar"} onClick={() => togglePause(c)} className="grid h-8 w-8 place-items-center rounded border border-border hover:border-primary"><i className={`fa-solid ${c.active ? "fa-pause" : "fa-play"}`} /></button>
                      <button title="Editar" onClick={() => setEditing(c)} className="grid h-8 w-8 place-items-center rounded border border-border hover:border-primary"><i className="fa-solid fa-pen" /></button>
                      <button title="Expirar" onClick={() => expire(c)} className="grid h-8 w-8 place-items-center rounded border border-border hover:border-amber-500"><i className="fa-solid fa-hourglass-end" /></button>
                      <button title="Excluir" onClick={() => remove(c)} className="grid h-8 w-8 place-items-center rounded border border-border text-destructive hover:border-destructive"><i className="fa-solid fa-trash" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <CouponForm value={editing} onCancel={() => setEditing(null)} onSave={(c) => save.mutate(c)} loading={save.isPending} />}
    </div>
  );
}

function CouponForm({ value, onCancel, onSave, loading }: { value: Coupon; onCancel: () => void; onSave: (c: Coupon) => void; loading: boolean }) {
  const [c, setC] = useState<Coupon>(value);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-bold">{c.id ? "Editar" : "Novo"} cupom</h3>
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3"><L>Código *</L><input className="input font-mono uppercase" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} /></div>
          <div className="sm:col-span-3"><L>Tipo</L>
            <select className="input" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value as CouponType })}>
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
              <option value="free_shipping">Frete grátis</option>
            </select>
          </div>
          <div className="sm:col-span-6"><L>Descrição interna</L><input className="input" value={c.description ?? ""} onChange={(e) => setC({ ...c, description: e.target.value })} /></div>
          <div className="sm:col-span-2"><L>Valor</L><input type="number" step="0.01" className="input" value={c.value} onChange={(e) => setC({ ...c, value: Number(e.target.value) })} disabled={c.type === "free_shipping"} /></div>
          <div className="sm:col-span-2"><L>Pedido mín. (R$)</L><input type="number" step="0.01" className="input" value={c.min_order} onChange={(e) => setC({ ...c, min_order: Number(e.target.value) })} /></div>
          <div className="sm:col-span-2"><L>Máx. usos</L><input type="number" className="input" value={c.max_uses ?? ""} placeholder="ilimitado" onChange={(e) => setC({ ...c, max_uses: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <div className="sm:col-span-4"><L>Expira em</L><input type="datetime-local" className="input" value={c.expires_at ? c.expires_at.slice(0, 16) : ""} onChange={(e) => setC({ ...c, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} /> Ativo</label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
          <button disabled={loading} onClick={() => onSave(c)} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-muted-foreground">{children}</label>;
}