import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { exportBackup, importBackup } from "@/lib/admin.functions";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: BackupPage,
});

function BackupPage() {
  const { isAdmin } = usePermissions();
  const doExport = useServerFn(exportBackup);
  const doImport = useServerFn(importBackup);
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return <p className="text-sm text-muted-foreground">Apenas administradores acessam esta área.</p>;

  async function download() {
    setBusy(true);
    try {
      const data = await doExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smartcell-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function upload(file: File | null) {
    if (!file) return;
    if (!confirm("Restaurar substituirá os dados atuais. Continuar?")) return;
    setBusy(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await doImport({ data: { backup: json } });
      toast.success(`Backup restaurado (${res.restored} registros)`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><i className="fa-solid fa-download text-primary" />Exportar backup</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Gera um arquivo JSON com produtos, categorias, pedidos, despesas e configurações.
        </p>
        <button onClick={download} disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <i className="fa-solid fa-download mr-2" /> Baixar backup
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><i className="fa-solid fa-upload text-primary" />Importar / restaurar</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Envie um arquivo JSON gerado pela exportação. Os dados serão mesclados/restaurados.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:border-primary">
          <i className="fa-solid fa-file-arrow-up" />
          {busy ? "Processando..." : "Selecionar arquivo"}
          <input type="file" accept="application/json" className="hidden" onChange={(e) => upload(e.target.files?.[0] ?? null)} disabled={busy} />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><i className="fa-solid fa-circle-info text-primary" />Dica</h2>
        <p className="text-sm text-muted-foreground">
          Salve o backup periodicamente em um lugar seguro (ex: Google Drive). As imagens permanecem no Storage da loja e não são duplicadas no arquivo.
        </p>
      </div>
    </div>
  );
}