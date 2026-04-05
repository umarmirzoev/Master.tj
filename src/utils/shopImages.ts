import shopSeedSql from "../../supabase/migrations/20260308101450_571b784e-c3d4-413d-81fc-033e1063062a.sql?raw";

type ProductImageSource = {
  image_url?: string | null;
  name?: string | null;
  description?: string | null;
  images?: string[] | null;
  shop_categories?: { name?: string | null } | null;
};

type KeywordRule = {
  image: string;
  keywords: string[];
};

const normalize = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const exactNameImageMap = new Map<string, string>();
const exactNameGalleryMap = new Map<string, string[]>();

const extractGalleryFromLine = (line: string) => {
  const baseMatch = line.match(
    /^UPDATE shop_products SET image_url = '([^']+)'(?:, images = (.+?))? WHERE id = '([^']+)'; -- (.+)$/
  );

  if (!baseMatch) return null;

  const imageUrl = baseMatch[1];
  const imagesChunk = baseMatch[2] || "";
  const productName = normalize(baseMatch[4]);
  const gallery = [imageUrl, ...Array.from(imagesChunk.matchAll(/'([^']+)'/g)).map((item) => item[1])].filter(Boolean);

  return { imageUrl, productName, gallery };
};

for (const line of shopSeedSql.split(/\r?\n/)) {
  const match = extractGalleryFromLine(line);

  if (!match) continue;

  const imageUrl = match.imageUrl;
  const productName = match.productName;

  if (productName && imageUrl) {
    exactNameImageMap.set(productName, imageUrl);
    exactNameGalleryMap.set(productName, Array.from(new Set(match.gallery)));
  }
}

const keywordRules: KeywordRule[] = [
  {
    keywords: ["вентилятор"],
    image: "https://images.unsplash.com/photo-1643810806660-612a4ceb2e02?w=800&h=800&fit=crop",
  },
  {
    keywords: ["газовая плита", "плита"],
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop",
  },
  {
    keywords: ["кондиционер"],
    image: "https://images.unsplash.com/photo-1631545806609-22cda91a8921?w=800&h=800&fit=crop",
  },
  {
    keywords: ["микроволнов"],
    image: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&h=800&fit=crop",
  },
  {
    keywords: ["обогреватель"],
    image: "https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=800&h=800&fit=crop",
  },
  {
    keywords: ["пылесос"],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop",
  },
  {
    keywords: ["стиральная машина"],
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop",
  },
  {
    keywords: ["камера", "видеорегистратор", "монитор", "домофон", "nvr", "poe"],
    image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&h=800&fit=crop",
  },
  {
    keywords: ["замок", "ручка", "глазок", "доводчик", "петли", "цилиндр", "двер"],
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=800&fit=crop",
  },
  {
    keywords: ["болгарка", "перфоратор", "шурупов", "лобзик", "отвёрт", "отверт", "ключей", "рулетка", "лазерный уровень"],
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=800&fit=crop",
  },
  {
    keywords: ["кабель", "провод", "гофротруба", "изолента", "термоусадка", "wago"],
    image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&h=800&fit=crop",
  },
  {
    keywords: ["лампа", "люстра", "светильник", "прожектор", "лента", "освещ"],
    image: "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=800&h=800&fit=crop",
  },
  {
    keywords: ["выключатель", "розетка", "диммер", "датчик движения", "рамка", "автомат", "узо", "электрощиток", "счётчик", "счетчик"],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop",
  },
  {
    keywords: ["водонагреватель", "раковина", "сифон", "смеситель", "гигиенический душ", "душевая стойка", "кран", "труба пвх", "унитаз", "аэратор"],
    image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=800&fit=crop",
  },
  {
    keywords: ["грунтовка", "краска", "ламинат", "обои", "клей", "подложка", "шпакл", "штукатур"],
    image: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=800&h=800&fit=crop",
  },
];

export function resolveProductImage(product?: ProductImageSource): string | null {
  if (product?.image_url) return product.image_url;

  const normalizedName = normalize(product?.name);
  if (normalizedName && exactNameImageMap.has(normalizedName)) {
    return exactNameImageMap.get(normalizedName) || null;
  }

  const haystack = `${normalizedName} ${normalize(product?.shop_categories?.name)}`;
  const rule = keywordRules.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword)));
  return rule?.image || null;
}

export function getProductGallery(product?: ProductImageSource): string[] {
  const unique = new Set<string>();
  const normalizedName = normalize(product?.name);
  const exactGallery = normalizedName ? exactNameGalleryMap.get(normalizedName) || [] : [];
  const fallbackImage = resolveProductImage(product);
  const candidates = [
    product?.image_url || "",
    ...(Array.isArray(product?.images) ? product.images : []),
    ...exactGallery,
    fallbackImage || "",
  ];

  return candidates.filter((src) => {
    if (!src || unique.has(src)) return false;
    unique.add(src);
    return true;
  }).slice(0, 5);
}
