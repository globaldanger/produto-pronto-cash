// Notificações push locais (Web Notifications API).
// Funcionam no navegador, no PWA instalado (Android) e no iOS 16.4+ quando o
// app foi adicionado à tela de início. No app nativo (Capacitor) o WebView
// também entrega as notificações enquanto o app está aberto.

export type PushPermission = "unsupported" | "default" | "granted" | "denied";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function pushPermission(): PushPermission {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as PushPermission;
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (!pushSupported()) return "unsupported";
  try {
    const res = await Notification.requestPermission();
    return res as PushPermission;
  } catch {
    return "denied";
  }
}

export function notify(title: string, body: string, url?: string) {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: url ?? title,
    });
    n.onclick = () => {
      window.focus();
      if (url) window.location.href = url;
      n.close();
    };
  } catch {
    /* alguns navegadores exigem service worker; ignorado silenciosamente */
  }
}

export const ORDER_STATUS_MESSAGE: Record<string, string> = {
  pending: "Pedido recebido — aguardando pagamento.",
  paid: "Pagamento aprovado! Já estamos preparando seu pedido.",
  processing: "Seu pedido está em separação.",
  shipped: "Seu pedido saiu para entrega.",
  ready: "Seu pedido está pronto para retirada na loja.",
  delivered: "Pedido entregue. Obrigado pela compra!",
  cancelled: "Seu pedido foi cancelado.",
  refunded: "Seu pagamento foi estornado.",
};

export const SERVICE_STATUS_MESSAGE: Record<string, string> = {
  received: "Recebemos seu aparelho na assistência.",
  diagnosing: "Seu aparelho está em diagnóstico.",
  repairing: "Seu aparelho está em conserto.",
  waiting_parts: "Aguardando peças para o seu conserto.",
  ready: "Seu aparelho está pronto para retirada!",
  delivered: "Aparelho entregue. Garantia ativa.",
  cancelled: "Ordem de serviço cancelada.",
};
