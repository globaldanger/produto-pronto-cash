import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  pushPermission,
  requestPushPermission,
  notify,
  type PushPermission,
} from "@/lib/notifications";

export function NotificationOptIn() {
  const [perm, setPerm] = useState<PushPermission>("unsupported");

  useEffect(() => setPerm(pushPermission()), []);

  if (perm === "unsupported") return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-bell mt-1 theme-accent-text" />
          <div>
            <p className="text-sm font-semibold">Notificações no celular</p>
            <p className="text-xs text-muted-foreground">
              Receba um aviso em tempo real quando o pagamento for aprovado, o pedido for
              separado, enviado ou ficar pronto para retirada.
            </p>
          </div>
        </div>
        {perm === "granted" ? (
          <span className="rounded-full border border-success/40 px-3 py-1 text-xs text-success">
            <i className="fa-solid fa-check mr-1" /> Ativadas
          </span>
        ) : perm === "denied" ? (
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Bloqueadas no navegador
          </span>
        ) : (
          <button
            onClick={async () => {
              const res = await requestPushPermission();
              setPerm(res);
              if (res === "granted") {
                notify("Notificações ativadas", "Você será avisado sobre cada etapa do pedido.");
                toast.success("Notificações ativadas");
              } else if (res === "denied") {
                toast.error("Permissão negada nas configurações do navegador");
              }
            }}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
          >
            Ativar notificações
          </button>
        )}
      </div>
      {perm === "denied" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Reative em Configurações do site → Notificações. No iPhone, adicione o site à Tela de
          Início para receber notificações.
        </p>
      )}
    </div>
  );
}
