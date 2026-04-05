import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";

interface OrderChatProps { orderId: string; isOpen: boolean; onClose: () => void; }
interface Message { id: string; order_id: string; sender_id: string; message: string; created_at: string; read: boolean; }

// Компонент чата по заказу даёт клиенту и исполнителю общаться внутри конкретной заявки.
export default function OrderChat({ orderId, isOpen, onClose }: OrderChatProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase.from("order_messages").select("*").eq("order_id", orderId).order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  // Загружаем историю сообщений и подписываемся на realtime-обновления по заказу.
  useEffect(() => {
    if (!isOpen || !orderId) return;
    fetchMessages();
    if (user) {
      supabase.from("order_messages").update({ read: true }).eq("order_id", orderId).neq("sender_id", user.id).eq("read", false).then(() => {});
    }
    const channel = supabase.channel(`order-chat-${orderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        if (user && (payload.new as Message).sender_id !== user.id) {
          supabase.from("order_messages").update({ read: true }).eq("id", (payload.new as Message).id).then(() => {});
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOpen, orderId, user]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  // Отправляем новое сообщение в таблицу order_messages и возвращаем фокус в поле ввода.
  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("order_messages").insert({ order_id: orderId, sender_id: user.id, message: newMessage.trim() });
    if (!error) setNewMessage("");
    setSending(false);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{t("dashOrders")} — {t("notifTitle")}</span>
          <span className="text-xs text-muted-foreground">({messages.length})</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-xs">{t("close")}</Button>
      </div>
      <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
        <div className="space-y-2">
          {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">{t("notifEmpty")}</p>}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                  <p className="break-words">{msg.message}</p>
                  <p className={`text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input ref={inputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={t("dashSearch")} className="flex-1 rounded-full text-sm h-9" disabled={sending} />
          <Button type="submit" size="icon" className="h-9 w-9 rounded-full shrink-0" disabled={sending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
