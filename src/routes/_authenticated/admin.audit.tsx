import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Auditoria — Admin" }] }),
  component: AuditPage,
});

type Row = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  login: { label: "Login", icon: "fa-right-to-bracket", color: "text-emerald-500" },
  logout: { label: "Logout", icon: "fa-right-from-bracket", color: "text-muted-foreground" },
  "order.status_change": { label: "Status do pedido", icon: "fa-shuffle", color: "text-blue-500" },
  "order.cancel": { label: "Cancelou pedido", icon: "fa-ban", color: "text-red-500" },
  "order.refund": { label: "Reembolsou pedido", icon: "fa-rotate-left", color: "text-amber-500" },
  "order.delete": { label: "Apagou pedido", icon: "fa-trash", color: "text-red-500" },
  "order.edit": { label: "Editou pedido", icon: "fa-pen", color: "text-primary" },
  "order.payment_webhook": { label: "Webhook MP", icon: "fa-bolt", color: "text-emerald-500" },
  "product.create": { label: "Criou produto", icon: "fa-plus", color: "text-emerald-500" },
  "product.update": { label: "Editou produto", icon: "fa-pen", color: "text-primary" },
  "product.delete": { label: "Apagou produto", icon: "fa-trash", color: "text-red-500" },
  "category.create": { label: "Criou categoria", icon: "fa-plus", color: "text-emerald-500" },
  "category.update": { label: "Editou categoria", icon: "fa-pen", color: "text-primary" },
  "category.delete": { label: "Apagou categoria", icon: "fa-trash", color: "text-red-500" },
  "user.role_change": { label: "Alterou papel", icon: "fa-user-shield", color: "text-amber-500" },
  "user.create": { label: "Criou usuário", icon: "fa-user-plus", color: "text-emerald-500" },
  "user.delete": { label: "Apagou usuário", icon: "fa-user-slash", color: "text-red-500" },
  "settings.update": { label: "Atualizou config.", icon: "fa-gear", color: "text-primary" },
};

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function AuditPage() {
  const fetchLogs = useServerFn(listAuditLogs);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [from, setFrom] = useState(todayISO(-30));
  const [to, setTo] = useState(todayISO());

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ["admin", "audit", { action, entity, userQuery, from, to }],
    queryFn: () =>
      fetchLogs({
        data: {
          action: action || undefined,
          entity_type: entity || undefined,
          user_query: userQuery || undefined,
          from: from ? from + "T00:00:00" : undefined,
          to: to ? to + "T23:59:59" : undefined,
          limit: 500,
        },
      }) as Promise<Row[]>,
  });

  function exportCSV() {
    const header = ["Data","Usuário","E-mail","Ação","Entidade","ID","IP","Detalhes"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        new Date(r.created_at).toISOString(),
        JSON.stringify(r.user_name ?? ""),
        r.user_email ?? "",
        r.action,
        r.entity_type ?? "",
        r.entity_id ?? "",
        r.ip ?? "",
        JSON.stringify(r.details ?? {}),
      ].join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Ação</label>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(ACTION_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Entidade</label>
            <select className="input" value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">Todas</option>
              <option value="order">Pedido</option>
              <option value="product">Produto</option>
              <option value="category">Categoria</option>
              <option value="user">Usuário</option>
              <option value="settings">Configurações</option>
              <option value="auth">Autenticação</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Usuário (nome/email)</label>
            <input className="input" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="ex: Carlos" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">De</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Até</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{isFetching ? "Carregando…" : `${rows.length} evento(s)`}</span>
          <button onClick={exportCSV} className="rounded-md border border-border px-3 py-1.5 hover:border-primary hover:text-primary">
            <i className="fa-solid fa-file-csv mr-1" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && !isFetching && (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <i className="fa-solid fa-clipboard-list mb-2 text-3xl" />
            <p>Nenhum evento registrado nesse período.</p>
          </div>
        )}
        {rows.map((r) => {
          const meta = ACTION_META[r.action] ?? { label: r.action, icon: "fa-circle-info", color: "text-muted-foreground" };
          const detailStr = r.details && Object.keys(r.details).length ? JSON.stringify(r.details) : null;
          return (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className={`mt-0.5 ${meta.color}`}>
                  <i className={`fa-solid ${meta.icon} text-lg`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold">{meta.label}</span>
                    <span className="text-sm text-muted-foreground">
                      por <b>{r.user_name ?? r.user_email ?? "sistema"}</b>
                    </span>
                    {r.entity_type && r.entity_id && (
                      <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">
                        {r.entity_type}#{r.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  {detailStr && (
                    <pre className="mt-1 overflow-x-auto rounded bg-surface p-2 text-xs text-muted-foreground">
                      {detailStr}
                    </pre>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                  {r.ip && <div className="font-mono">{r.ip}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}