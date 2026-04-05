import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  masterId: string;
  clientId: string;
  onSubmitted: () => void;
}

// Модалка отзыва собирает оценку и комментарий клиента по завершённому заказу.
export default function ReviewModal({ isOpen, onClose, orderId, masterId, clientId, onSubmitted }: ReviewModalProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Выберите оценку", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      client_id: clientId,
      master_id: masterId,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Update order status to reviewed
    await supabase.from("orders").update({ status: "reviewed", client_rating: rating, client_review: comment.trim() }).eq("id", orderId);

    // Recalculate master rating
    const { data: reviews } = await supabase.from("reviews").select("rating").eq("master_id", masterId);
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await supabase.from("profiles").update({
        average_rating: parseFloat(avg.toFixed(1)),
        total_reviews: reviews.length,
      }).eq("user_id", masterId);
    }

    // Create notification for master
    await supabase.from("notifications").insert({
      user_id: masterId,
      title: "Новый отзыв!",
      message: `${rating}⭐ — ${comment.trim() || "Без комментария"}`,
      type: "review_received",
      related_id: orderId,
    });

    toast({ title: "Отзыв отправлен!" });
    setRating(0);
    setComment("");
    setSubmitting(false);
    onSubmitted();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Оставить отзыв</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                className="p-2 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 sm:w-8 sm:h-8 ${
                    i <= (hover || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            className="text-base min-h-[100px]"
          />
          <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="w-full rounded-full h-12 text-base">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Отправить отзыв
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
