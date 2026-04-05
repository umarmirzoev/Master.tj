import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/hooks/useCart";
import { useRecentlyViewed, RecentProduct } from "@/hooks/useRecentlyViewed";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { FavoriteButton } from "@/components/favorites/FavoritesSection";
import { ShoppingCart, Star, Package, ArrowRight, Clock, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  excludeId?: string;
}

// Блок недавно просмотренных товаров возвращает пользователя к последним интересным позициям.
export default function RecentlyViewedProducts({ excludeId }: Props) {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const { recentlyViewed } = useRecentlyViewed();

  const items = excludeId ? recentlyViewed.filter((p) => p.id !== excludeId) : recentlyViewed;

  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12"
    >
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("shopRecentlyViewed")}</h2>
          <p className="text-sm text-muted-foreground">{t("shopRecentlyViewedDesc")}</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible">
        {items.map((p) => (
          <RecentCard key={p.id} product={p} onAdd={(id) => addToCart(id, false)} t={t} />
        ))}
      </div>
    </motion.section>
  );
}

function RecentCard({ product: p, onAdd, t }: { product: RecentProduct; onAdd: (id: string) => void; t: (k: string) => string }) {
  const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const quickLink = `https://wa.me/992979117007?text=${encodeURIComponent(`Здравствуйте! Интересует товар: ${p.name}`)}`;
  return (
    <Card className="hover:shadow-lg transition-all overflow-hidden border-border group shrink-0 w-[180px] sm:w-auto">
      <Link to={`/shop/product/${p.id}`}>
        <div className="aspect-square bg-muted/20 flex items-center justify-center overflow-hidden relative">
          <SmartProductImage product={p} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton itemType="product" itemId={p.id} size="sm" />
          </div>
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{discount}%</span>
          )}
        </div>
      </Link>
      <CardContent className="p-3 space-y-2">
        <Link to={`/shop/product/${p.id}`}>
          <h3 className="text-sm font-medium text-foreground hover:text-primary line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
        </Link>
        {p.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs text-muted-foreground">{p.rating}</span>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <span className="text-lg font-bold text-foreground">{p.price}</span>
          <span className="text-xs text-muted-foreground mb-0.5">{t("currencySomoni")}</span>
          {p.old_price && <span className="text-xs text-muted-foreground line-through ml-1">{p.old_price}</span>}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 rounded-full text-xs h-8 gap-1" onClick={(e) => { e.preventDefault(); onAdd(p.id); }}>
            <ShoppingCart className="w-3 h-3" /> {t("shopAddToCart")}
          </Button>
          <a href={quickLink} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-2.5">
              <MessageCircle className="w-3 h-3" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
