import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notify, ORDER_STATUS_MESSAGE, SERVICE_STATUS_MESSAGE } from "@/lib/notifications";

/**
 * Assina em tempo real os pedidos e ordens de serviço do cliente logado e
 * dispara toast + notificação no celular quando o status muda.
 */
export function useRealtimeNotifications() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const push = (title: string, body: string, url: string) => {
      toast(title, { description: body });
      notify(title, body, url);
    };

    const ch = supabase
      .channel(`notify_${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as { id: string; status?: string; kanban_status?: string | null };
          const prev = payload.old as { status?: string; kanban_status?: string | null };
          const status = next.kanban_status ?? next.status;
          const before = prev?.kanban_status ?? prev?.status;
          if (!status || status === before) return;
          push(
            "Atualização do seu pedido",
            ORDER_STATUS_MESSAGE[status] ?? `Status atualizado: ${status}`,
            `/meus-pedidos/${next.id}`,
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        () => push("Pedido criado", "Recebemos seu pedido com sucesso.", "/meus-pedidos"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "service_orders", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as { id: string; status?: string };
          const prev = payload.old as { status?: string };
          if (!next.status || next.status === prev?.status) return;
          push(
            "Assistência técnica",
            SERVICE_STATUS_MESSAGE[next.status] ?? `Status atualizado: ${next.status}`,
            `/garantia/${next.id}`,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);
}
