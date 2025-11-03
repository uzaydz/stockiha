// أدوات موحّدة لحساب المخزون بدقة عبر جميع المكونات والخدمات
// القاعدة:
// - منتج بدون ألوان: مخزونه = stock_quantity (أو actual_stock_quantity إن وُجد)
// - منتج بألوان فقط: مخزون المنتج = مجموع كميات الألوان
// - منتج بألوان ومقاسات: كمية اللون = مجموع كميات المقاسات، ومخزون المنتج = مجموع كميات الألوان (بعد حساب المقاسات)

type AnyRecord = Record<string, any>;

export function computeSizesTotal(color: AnyRecord | undefined | null): number {
  if (!color) return 0;
  const sizes = (color as any).sizes || (color as any).product_sizes;
  if (!Array.isArray(sizes)) return 0;
  return sizes.reduce((sum: number, s: any) => sum + (Number(s?.quantity ?? 0) || 0), 0);
}

export function computeColorQuantity(color: AnyRecord | undefined | null): number {
  if (!color) return 0;
  const hasSizes = Boolean((color as any).has_sizes); // يُفضَّل اعتماد هذه الإشارة إن وُجدت
  const sizesTotal = computeSizesTotal(color);
  if (hasSizes) return sizesTotal; // حسب القاعدة: عند وجود مقاسات تكون كمية اللون = مجموع المقاسات
  const rawQty = Number((color as any).quantity ?? 0) || 0;
  // إن لم يكن has_sizes، نستخدم quantity مباشرة
  return rawQty;
}

export function computeColorsTotal(product: AnyRecord | undefined | null): number {
  if (!product) return 0;
  // يدعم كلتا الحالتين: "colors" من RPC أو "product_colors" من select التقليدي
  const colors = (product as any).colors || (product as any).product_colors;
  if (!Array.isArray(colors)) return 0;
  return colors.reduce((sum: number, c: any) => sum + computeColorQuantity(c), 0);
}

export function computeAvailableStock(product: AnyRecord | undefined | null): number {
  if (!product) return 0;
  // إن كان لديه متغيرات (ألوان/مقاسات) نحسب من الألوان وفق القاعدة
  const hasVariants = Boolean((product as any).has_variants) || Array.isArray((product as any).colors) || Array.isArray((product as any).product_colors);
  if (hasVariants) {
    const totalFromColors = computeColorsTotal(product);
    // fallback احتياطي عند غياب الألوان لأي سبب
    if (totalFromColors > 0) return totalFromColors;
  }
  // fallback إلى actual_stock_quantity ثم stock_quantity
  const actual = Number((product as any).actual_stock_quantity ?? 0);
  if (Number.isFinite(actual) && actual > 0) return actual;
  const sq = Number((product as any).stock_quantity ?? 0) || 0;
  return Math.max(0, sq);
}

export function isOutOfStock(product: AnyRecord | undefined | null): boolean {
  return computeAvailableStock(product) <= 0;
}

