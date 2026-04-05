const BRAND_REGEX =
  /\b(?:Samsung|LG|Bosch|Makita|DeWalt|Philips|Xiaomi|TP-Link|Hikvision|Dahua|IEK|EKF|Ariston|Beko|Haier|TCL|Vitek|Midea|Hisense)\b/i;

export const detectProductBrand = (product: any): string | null => {
  if (!product) return null;

  if (typeof product.brand === "string" && product.brand.trim()) {
    return product.brand.trim();
  }

  const specsValue =
    product.specs && typeof product.specs === "object" ? Object.values(product.specs).join(" ") : "";
  const source = [product.name, product.description, specsValue].filter(Boolean).join(" ");
  const match = source.match(BRAND_REGEX);
  return match ? match[0] : null;
};
