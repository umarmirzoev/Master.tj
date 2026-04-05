import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { resolveProductImage } from "@/utils/shopImages";

type ProductLike = {
  id?: string | null;
  name?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  shop_categories?: { name?: string | null } | null;
};

type SmartProductImageProps = {
  product?: ProductLike | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  iconClassName?: string;
};

export function SmartProductImage({
  product,
  alt,
  className,
  wrapperClassName,
  iconClassName = "w-12 h-12 text-muted-foreground/30",
}: SmartProductImageProps) {
  const sources = useMemo(() => {
    const unique = new Set<string>();
    const resolvedImage = resolveProductImage(product || undefined);
    const candidates = [
      product?.image_url || "",
      ...(Array.isArray(product?.images) ? product!.images.filter(Boolean) : []),
      resolvedImage || "",
    ];

    return candidates.filter((src) => {
      if (!src || unique.has(src)) return false;
      unique.add(src);
      return true;
    });
  }, [product]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sources]);

  const currentSrc = sources[index];

  if (!currentSrc) {
    return (
      <div className={wrapperClassName}>
        <Package className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        setIndex((prev) => {
          if (prev >= sources.length - 1) return prev;
          return prev + 1;
        });
      }}
    />
  );
}
