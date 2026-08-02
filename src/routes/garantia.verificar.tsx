import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { verifyWarranty, type PublicWarranty } from "@/lib/warranty.functions";

export const Route = createFileRoute("/garantia/verificar")({
  head: () => ({
    meta: [
      { title: "Verificar Garantia — SmartCell" },
      {
        name: "description",
        content:
          "Consulte a validade da garantia do seu conserto SmartCell informando o código da ordem de serviço.",
      },
      { property: "og:title", content: "Verificar Garantia — SmartCell" },
      {
        property: "og:description",
        content: "Confira em segundos se a garantia do seu reparo continua vigente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : "",
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code: initial } = Route.useSearch();
  const [code, setCode] = useState(initial ?? "");
  const [data, setData] = useState<PublicWarranty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(value: string) {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await verifyWarranty({ data: { code: value } });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível consultar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial) void run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-black tracking-tight">Verificar garantia</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Informe o código da ordem de serviço (ex.: OSABCD1234) impresso no seu certificado.
      </p>

      <form
        className="mt-5 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(code);
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="OSXXXXXXXX"
          className="min-w-[200px] flex-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-sm uppercase"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Ordem de serviço
              </div>
              <div className="font-mono text-xl font-bold">{data.code}</div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                data.valid ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
              }`}
            >
              {data.valid ? "Garantia vigente" : "Garantia expirada"}
            </span>
          </div>

          <dl className="mt-4 space-y-1 text-sm">
            <Item label="Cliente" value={data.customer_name} />
            <Item label="Aparelho" value={[data.brand, data.model].filter(Boolean).join(" ") || data.device} />
            <Item label="IMEI / Série" value={data.imei} />
            <Item label="Serviço executado" value={data.service_done} />
            <Item label="Peças utilizadas" value={data.parts_used} />
            <Item label="Técnico" value={data.technician} />
            <Item label="Prazo" value={`${data.warranty_days} dias`} />
            <Item
              label="Válida até"
              value={new Date(data.expires_at).toLocaleDateString("pt-BR")}
            />
          </dl>

          {data.warranty_text && (
            <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              {data.warranty_text}
            </p>
          )}
        </div>
      )}

      <Link to="/" className="mt-8 inline-block text-sm text-primary hover:underline">
        ← Voltar para a loja
      </Link>
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}