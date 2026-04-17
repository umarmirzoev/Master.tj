import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseRealtimeOrdersOptions {
  userId?: string;
  role: "client" | "master" | "admin";
  onUpdate: () => void;
}

export function useRealtimeOrders({ userId, role, onUpdate }: UseRealtimeOrdersOptions) {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId && role !== "admin") return;

    const channel = supabase
      .channel(`orders-${role}-${userId || "admin"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        if (role === "admin") {
          toast({ title: "Новый заказ", description: "Поступил новый заказ услуги." });
          onUpdate();
          return;
        }

        if (role === "master") {
          toast({ title: "Новый заказ доступен" });
          onUpdate();
          return;
        }

        if (role === "client" && payload.new.client_id === userId) {
          onUpdate();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        if (role === "client" && payload.new.client_id === userId) {
          const status = payload.new.status as string;
          const statusMessages: Record<string, string> = {
            accepted: "Ваш заказ принят",
            assigned: "К заказу назначен мастер",
            on_the_way: "Мастер уже едет к вам",
            arrived: "Мастер прибыл",
            in_progress: "Мастер начал работу",
            completed: "Заказ завершен",
            cancelled: "Заказ отменен",
          };

          if (statusMessages[status]) {
            toast({ title: "Обновление заказа", description: statusMessages[status] });
          }
        }

        onUpdate();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shop_orders" }, (payload) => {
        if (role === "admin") {
          toast({ title: "Новый заказ магазина", description: "Поступил новый заказ товара." });
          onUpdate();
          return;
        }

        if (role === "client" && payload.new.user_id === userId) {
          onUpdate();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shop_orders" }, (payload) => {
        if (role === "admin") {
          onUpdate();
          return;
        }

        if (role === "client" && payload.new.user_id === userId) {
          const status = payload.new.status as string;
          const statusMessages: Record<string, string> = {
            confirmed: "Заказ магазина подтвержден",
            processing: "Заказ магазина собирается",
            shipped: "Заказ магазина в пути",
            delivered: "Заказ магазина доставлен",
            completed: "Заказ магазина завершен",
            cancelled: "Заказ магазина отменен",
          };

          if (statusMessages[status]) {
            toast({ title: "Обновление заказа", description: statusMessages[status] });
          }

          onUpdate();
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onUpdate, role, toast, userId]);
}
