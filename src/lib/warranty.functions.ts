import { createServerFn } from "@tanstack/react-start";

export type PublicWarranty = {
  code: string;
  customer_name: string;
  device: string;
  brand: string | null;
  model: string | null;
  imei: string | null;
  service_done: string | null;
  parts_used: string | null;
  technician: string | null;
  status: string;
  warranty_days: number;
  warranty_start: string;
  warranty_text: string | null;
  created_at: string;
  valid: boolean;
  expires_at: string;
};

function maskName(name: string) {
  return name
    .split(/\s+/)
    .map((p, i) => (i === 0 || p.length <= 2 ? p : `${p[0]}.`))
    .join(" ");
}

export const verifyWarranty = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => {
    const code = (data?.code ?? "").trim().toUpperCase();
    if (code.length < 6) throw new Error("Informe o código da ordem de serviço");
    return { code };
  })
  .handler(async ({ data }): Promise<PublicWarranty> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: os, error } = await supabaseAdmin
      .from("service_orders")
      .select(
        "code,customer_name,device,brand,model,imei,service_done,parts_used,technician,status,warranty_days,warranty_start,warranty_text,created_at",
      )
      .ilike("code", data.code)
      .maybeSingle();
    if (error) throw error;
    if (!os) throw new Error("Ordem de serviço não encontrada");

    const start = new Date(`${os.warranty_start}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + (os.warranty_days ?? 0));

    return {
      ...os,
      customer_name: maskName(os.customer_name),
      imei: os.imei ? `****${os.imei.slice(-4)}` : null,
      valid: end.getTime() >= Date.now() && os.status !== "cancelada",
      expires_at: end.toISOString(),
    } as PublicWarranty;
  });