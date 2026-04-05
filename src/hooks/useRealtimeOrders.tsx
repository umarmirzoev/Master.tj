import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Хук realtime-заказов подписывается на изменения таблицы orders и обновляет интерфейс.
interface UseRealtimeOrdersOptions {
  userId?: string;
  role: "client" | "master" | "admin";
  onUpdate: () => void;
}

export function useRealtimeOrders({ userId, role, onUpdate }: UseRealtimeOrdersOptions) {
  const { toast } = useToast();

  // На изменения заказов реагируем по-разному для клиента, мастера и администратора.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`orders-${role}-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          if (role === "admin") {
            toast({ title: "🔔 Новый заказ", description: "Поступил новый заказ" });
            onUpdate();
          } else if (role === "master") {
            toast({ title: "Новый заказ доступен!" });
            onUpdate();
          } else if (role === "client" && payload.new.client_id === userId) {
            onUpdate();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          if (role === "client" && payload.new.client_id === userId) {
            const status = payload.new.status as string;
            const statusMessages: Record<string, string> = {
              accepted: "✅ Ваш заказ принят",
              assigned: "👷 К заказу назначен мастер",
              on_the_way: "🚗 Мастер выехал к вам",
              arrived: "📍 Мастер прибыл",
              in_progress: "🔧 Мастер начал работу",
              completed: "🎉 Заказ завершён!",
              cancelled: "❌ Заказ отменён",
            };
            if (statusMessages[status]) {
              toast({ title: "Обновление заказа", description: statusMessages[status] });
            }
          }
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role]);
}
