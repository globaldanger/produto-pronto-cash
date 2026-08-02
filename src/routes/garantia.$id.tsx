import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

export const Route = createFileRoute("/garantia/$id")({
  head: () => ({
    meta: [
      { title: "Comprovante de Garantia — SmartCell" },
      {
        name: "description",
        content:
          "Comprovante de garantia de serviço técnico da SmartCell com dados do aparelho, serviço executado e prazo de cobertura.",
      },
      { property: "og:title", content: "Comprovante de Garantia — SmartCell" },
      {
        property: "og:description",
        content: "Documento de garantia de conserto emitido pela SmartCell.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WarrantyPage,
});

type ServiceOrder = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string | null;
  customer_cpf: string | null;
  customer_address: string | null;
  device: string;
  brand: string | null;
  model: string | null;
  imei: string | null;
  color: string | null;
  accessories: string | null;
  defect_reported: string | null;
  diagnosis: string | null;
  service_done: string | null;
  parts_used: string | null;
  price: number;
  amount_paid: number;
  status: string;
  warranty_days: number;
  warranty_start: string;
  warranty_text: string | null;
  technician: string | null;
  created_at: string;
  photos_in: string[] | null;
  photos_out: string[] | null;
};

type Settings = {
  store_name: string;
  store_phone: string | null;
  store_address: string | null;
  store_email: string | null;
  store_logo: string | null;
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-40 shrink-0 text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Block({ title, value }: { title: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{title}</div>
      <p className="whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  );
}

function WarrantyPage() {
  const { id } = Route.useParams();
  const [os, setOs] = useState<ServiceOrder | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: s }] = await Promise.all([
        supabase.from("service_orders").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("store_settings")
          .select("store_name,store_phone,store_address,store_email,store_logo")
          .limit(1)
          .maybeSingle(),
      ]);
      setOs(o as ServiceOrder | null);
      setSettings(s as Settings | null);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!os?.code || typeof window === "undefined") return;
    const url = `${window.location.origin}/garantia/verificar?code=${encodeURIComponent(os.code)}`;
    setVerifyUrl(url);
    QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(null));
  }, [os?.code]);

  if (loading) return <div className="p-12 text-center">Carregando comprovante...</div>;
  if (!os) {
    return (
      <div className="p-12 text-center">
        <p>Comprovante não encontrado ou sem permissão.</p>
        <Link to="/" className="mt-3 inline-block text-primary hover:underline">Voltar</Link>
      </div>
    );
  }

  const start = new Date(`${os.warranty_start}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + (os.warranty_days ?? 0));
  const valid = end.getTime() >= Date.now();
  const saldo = Number(os.price) - Number(os.amount_paid);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .doc { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
        }
      `}</style>
      <div className="min-h-screen bg-neutral-100 py-8 text-neutral-900">
        <div className="no-print mx-auto mb-4 flex max-w-3xl justify-center gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-black px-4 py-2 font-semibold text-white"
          >
            <i className="fa-solid fa-print mr-2" /> Imprimir / PDF
          </button>
          <Link to="/admin/service" className="rounded-md border border-neutral-300 bg-white px-4 py-2">
            Voltar
          </Link>
        </div>

        <div className="doc mx-auto max-w-3xl bg-white p-10 text-sm shadow">
          <header className="flex items-start justify-between gap-4 border-b border-neutral-300 pb-4">
            <div className="flex items-center gap-3">
              {settings?.store_logo && (
                <img src={settings.store_logo} alt="" className="h-14 w-14 rounded object-cover" />
              )}
              <div>
                <div className="text-lg font-black uppercase tracking-wide">
                  {settings?.store_name ?? "SmartCell"}
                </div>
                {settings?.store_address && <div className="text-xs">{settings.store_address}</div>}
                <div className="text-xs">
                  {[settings?.store_phone, settings?.store_email].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                Certificado de Garantia
              </div>
              <div className="font-mono text-xl font-bold">{os.code}</div>
              <div className="text-xs text-neutral-500">
                Emitido em {new Date(os.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
          </header>

          <section className="mt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Cliente</h2>
            <Row label="Nome" value={os.customer_name} />
            <Row label="Telefone" value={os.customer_phone} />
            <Row label="CPF" value={os.customer_cpf} />
            <Row label="Endereço" value={os.customer_address} />
          </section>

          <section className="mt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Aparelho</h2>
            <Row label="Equipamento" value={os.device} />
            <Row label="Marca / Modelo" value={[os.brand, os.model].filter(Boolean).join(" ") || null} />
            <Row label="IMEI / Série" value={os.imei} />
            <Row label="Cor" value={os.color} />
            <Row label="Acessórios" value={os.accessories} />
          </section>

          <section className="mt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Serviço</h2>
            <Block title="Defeito relatado" value={os.defect_reported} />
            <Block title="Diagnóstico" value={os.diagnosis} />
            <Block title="Serviço executado" value={os.service_done} />
            <Block title="Peças utilizadas" value={os.parts_used} />
            <Row label="Técnico responsável" value={os.technician} />
          </section>

          <section className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-neutral-100 p-4 text-center">
            <div>
              <div className="text-[11px] uppercase text-neutral-500">Valor do serviço</div>
              <div className="text-lg font-bold">R$ {Number(os.price).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-neutral-500">Pago</div>
              <div className="text-lg font-bold">R$ {Number(os.amount_paid).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-neutral-500">Saldo</div>
              <div className="text-lg font-bold">R$ {saldo.toFixed(2)}</div>
            </div>
          </section>

          <section className="mt-5 rounded-lg border-2 border-neutral-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black uppercase tracking-wide">
                Garantia de {os.warranty_days} dias
              </h2>
              <span
                className={`rounded px-2 py-1 text-[11px] font-bold uppercase ${
                  valid ? "bg-neutral-900 text-white" : "bg-neutral-300 text-neutral-700"
                }`}
              >
                {valid ? "Vigente" : "Expirada"}
              </span>
            </div>
            <div className="mt-1 text-xs">
              Válida de {start.toLocaleDateString("pt-BR")} até{" "}
              <strong>{end.toLocaleDateString("pt-BR")}</strong>
            </div>
            {os.warranty_text && (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed">{os.warranty_text}</p>
            )}
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-300 pt-3">
              {qr && <img src={qr} alt={`QR code de verificação da garantia ${os.code}`} className="h-24 w-24" />}
              <div className="text-[11px] leading-relaxed text-neutral-600">
                <strong className="block text-neutral-900">Verifique esta garantia</strong>
                Aponte a câmera do celular para o QR code ou acesse{" "}
                <span className="break-all font-mono">{verifyUrl}</span> e informe o código{" "}
                <strong>{os.code}</strong>. Apresente este comprovante para acionar a garantia.
              </div>
            </div>
          </section>

          {((os.photos_in?.length ?? 0) > 0 || (os.photos_out?.length ?? 0) > 0) && (
            <section className="mt-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                Registro fotográfico
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <PhotoGrid title="Entrada do aparelho" photos={os.photos_in ?? []} />
                <PhotoGrid title="Saída após o serviço" photos={os.photos_out ?? []} />
              </div>
            </section>
          )}

          <section className="mt-12 grid grid-cols-2 gap-10 text-center text-xs">
            <div className="border-t border-neutral-400 pt-2">Assinatura do cliente</div>
            <div className="border-t border-neutral-400 pt-2">
              {settings?.store_name ?? "SmartCell"} — Responsável técnico
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function PhotoGrid({ title, photos }: { title: string; photos: string[] }) {
  if (!photos.length) return null;
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-neutral-700">{title}</div>
      <div className="grid grid-cols-3 gap-1">
        {photos.map((p) => (
          <img key={p} src={p} alt={title} className="aspect-square w-full rounded border border-neutral-200 object-cover" />
        ))}
      </div>
    </div>
  );
}