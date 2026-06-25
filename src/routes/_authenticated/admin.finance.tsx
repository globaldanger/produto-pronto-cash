import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  component: FinancePage,
});

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FinancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "expenses">("overview");
  const [adding, setAdding] = useState(false);

  const { data: revenue = 0 } = useQuery({
    queryKey: ["finance", "revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("total").eq("status", "paid");
      return (data ?? []).reduce((s, o: { total: number }) => s + Number(o.total), 0);
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["finance", "expenses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      return (data ?? []) as Expense[];
    },
  });

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border">
        {(["overview", "expenses"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {t === "overview" ? "Visão geral" : "Despesas"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card label="Receita" value={fmtBRL(revenue)} color="text-primary" icon="fa-arrow-trend-up" />
          <Card label="Despesas" value={fmtBRL(totalExpenses)} color="text-destructive" icon="fa-arrow-trend-down" />
          <Card label="Lucro" value={fmtBRL(profit)} color={profit >= 0 ? "text-primary" : "text-destructive"} icon="fa-coins" />
        </div>
      )}

      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setAdding(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <i className="fa-solid fa-plus mr-2" />
              Nova despesa
            </button>
          </div>

          {expenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              Nenhuma despesa registrada
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Descrição</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 text-xs">{new Date(e.expense_date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">{e.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{e.category ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-destructive">{fmtBRL(Number(e.amount))}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={async () => {
                            if (!confirm("Excluir despesa?")) return;
                            await supabase.from("expenses").delete().eq("id", e.id);
                            qc.invalidateQueries({ queryKey: ["finance", "expenses"] });
                          }}
                          className="rounded border border-border px-2 py-1 text-xs hover:border-destructive hover:text-destructive"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {adding && (
        <ExpenseModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ["finance", "expenses"] });
          }}
        />
      )}
    </div>
  );
}

function Card({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <i className={`fa-solid ${icon} text-3xl ${color} opacity-60`} />
      </div>
    </div>
  );
}

function ExpenseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    description: "",
    amount: 0,
    category: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });

  async function save() {
    if (!form.description || !form.amount) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({
      ...form,
      amount: Number(form.amount),
      category: form.category || null,
      user_id: u.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Despesa adicionada");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-xl font-bold">Nova despesa</h2>
        <div className="space-y-3">
          <input
            placeholder="Descrição"
            className="input w-full"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Valor (R$)"
            className="input w-full"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.valueAsNumber })}
          />
          <input
            placeholder="Categoria (opcional)"
            className="input w-full"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            type="date"
            className="input w-full"
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={save} className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Salvar</button>
        </div>
      </div>
    </div>
  );
}