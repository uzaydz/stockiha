// أدوات موحّدة لحساب المخزون بدقة عبر جميع المكونات والخدمات
// القاعدة:
// - منتج بدون ألوان: مخزونه = stock_quantity (أو actual_stock_quantity إن وُجد)
// - منتج بألوان فقط: مخزون المنتج = مجموع كميات الألوان
// - منتج بألوان ومقاسات: كمية اللون = مجموع كميات المقاسات، ومخزون المنتج = مجموع كميات الألوان (بعد حساب المقاسات)

type AnyRecord = Record<string, any>;

/**
 * ✅ دالة مساعدة موحدة لتحويل JSON string إلى array
 * تتعامل مع البيانات من SQLite التي قد تكون مخزنة كـ JSON strings
 */
function parseArrayField(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore parse errors
    }
  }
  return [];
}

/**
 * ✅ دالة مساعدة موحدة للحصول على الألوان/المتغيرات من المنتج
 * تبحث في جميع الأسماء المحتملة: variants, product_colors, colors
 */
export function getProductVariants(product: AnyRecord | undefined | null): any[] {
  if (!product) return [];

  // الأولوية: variants (من RPC) > product_colors (من Supabase) > colors (محلي)
  const sources = [
    (product as any).variants,
    (product as any).product_colors,
    (product as any).colors
  ];

  for (const source of sources) {
    const parsed = parseArrayField(source);
    if (parsed.length > 0) return parsed;
  }

  return [];
}

/**
 * ✅ دالة مساعدة موحدة للحصول على المقاسات من اللون
 * تبحث في جميع الأسماء المحتملة: sizes, product_sizes
 */
export function getColorSizes(color: AnyRecord | undefined | null): any[] {
  if (!color) return [];

  const sources = [
    (color as any).sizes,
    (color as any).product_sizes
  ];

  for (const source of sources) {
    const parsed = parseArrayField(source);
    if (parsed.length > 0) return parsed;
  }

  return [];
}

export function computeSizesTotal(color: AnyRecord | undefined | null): number {
  if (!color) return 0;
  // ✅ استخدام getColorSizes للتعامل مع JSON strings
  const sizes = getColorSizes(color);
  if (sizes.length === 0) return 0;
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
  // ✅ استخدام getProductVariants للتعامل مع JSON strings ومصادر متعددة
  const colors = getProductVariants(product);
  if (colors.length === 0) return 0;
  return colors.reduce((sum: number, c: any) => sum + computeColorQuantity(c), 0);
}

export function computeAvailableStock(product: AnyRecord | undefined | null): number {
  if (!product) return 0;
  // ✅ استخدام getProductVariants للتحقق من وجود متغيرات
  const variants = getProductVariants(product);
  const hasVariants = Boolean((product as any).has_variants) || variants.length > 0;
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

/**
 * ✅ دالة للتحقق من صحة الكمية وضمان أنها ضمن الحدود المسموحة
 * @param quantity الكمية المطلوبة
 * @param minQuantity الحد الأدنى (افتراضي: 0)
 * @param maxQuantity الحد الأقصى (افتراضي: غير محدود)
 * @returns الكمية المعدلة ضمن الحدود
 */
export function validateQuantity(
  quantity: number,
  minQuantity: number = 0,
  maxQuantity?: number
): number {
  let validatedQty = Number(quantity);

  // التحقق من أن القيمة رقم صالح
  if (!Number.isFinite(validatedQty)) {
    console.warn(`[stock] Invalid quantity value: ${quantity}, defaulting to 0`);
    validatedQty = 0;
  }

  // ضمان الحد الأدنى
  if (validatedQty < minQuantity) {
    console.warn(`[stock] Quantity ${validatedQty} is below minimum ${minQuantity}, adjusting to ${minQuantity}`);
    validatedQty = minQuantity;
  }

  // ضمان الحد الأقصى إذا كان محدداً
  if (maxQuantity !== undefined && validatedQty > maxQuantity) {
    console.warn(`[stock] Quantity ${validatedQty} exceeds maximum ${maxQuantity}, adjusting to ${maxQuantity}`);
    validatedQty = maxQuantity;
  }

  return validatedQty;
}

/**
 * ✅ دالة للتحقق من أن تغيير المخزون سيبقي الكمية ضمن الحدود
 * @returns true إذا كان التغيير آمناً، false إذا سيؤدي لكمية سالبة
 */
export function isStockChangeValid(
  currentStock: number,
  change: number,
  allowNegative: boolean = false
): { valid: boolean; resultingStock: number; error?: string } {
  const current = validateQuantity(currentStock);
  const delta = Number(change);

  if (!Number.isFinite(delta)) {
    return { valid: false, resultingStock: current, error: 'Invalid change value' };
  }

  const resultingStock = current + delta;

  if (!allowNegative && resultingStock < 0) {
    return {
      valid: false,
      resultingStock: 0,
      error: `Cannot reduce stock by ${Math.abs(delta)} when only ${current} available`
    };
  }

  return { valid: true, resultingStock: Math.max(0, resultingStock) };
}

/**
 * ✅ دالة للحصول على كمية متغير محدد (لون/مقاس)
 */
export function getVariantQuantity(
  product: AnyRecord | undefined | null,
  colorId?: string | null,
  sizeId?: string | null
): number {
  if (!product) return 0;

  // إذا لم يكن هناك colorId، نرجع المخزون الإجمالي
  if (!colorId) {
    return computeAvailableStock(product);
  }

  // البحث عن اللون
  const variants = getProductVariants(product);
  const color = variants.find((c: any) =>
    c?.id === colorId ||
    c?.color_id === colorId ||
    c?.colorId === colorId ||
    c?.variant_id === colorId
  );

  if (!color) return 0;

  // إذا كان هناك sizeId، نبحث عن المقاس
  if (sizeId) {
    const sizes = getColorSizes(color);
    const size = sizes.find((s: any) =>
      s?.id === sizeId ||
      s?.size_id === sizeId ||
      s?.sizeId === sizeId
    );
    return size ? validateQuantity(size.quantity) : 0;
  }

  // إرجاع كمية اللون
  return validateQuantity(computeColorQuantity(color));
}

