/**
 * نظام حساب أسعار الجملة
 *
 * يدعم 3 أنواع من التسعير:
 * 1. retail - البيع بالتجزئة (السعر العادي)
 * 2. wholesale - البيع بالجملة (سعر مخفض للكميات الكبيرة)
 * 3. partial_wholesale - نصف الجملة (سعر متوسط للكميات المتوسطة)
 *
 * يدعم أيضاً:
 * - مراحل أسعار متعددة (wholesale_tiers)
 * - حد أدنى للكميات
 * - التبديل التلقائي بين أنواع التسعير
 */

import type { Product } from '@/types';
import type { LocalProductFull } from '@/types/localProduct';

// =====================================================
// الأنواع والواجهات
// =====================================================

/**
 * نوع البيع
 */
export type SaleType = 'retail' | 'wholesale' | 'partial_wholesale';

/**
 * مرحلة سعر الجملة
 */
export interface WholesaleTier {
  id?: string;
  min_quantity: number;
  price_per_unit: number;
  max_quantity?: number;
}

/**
 * نتيجة حساب السعر
 */
export interface PricingResult {
  /** سعر الوحدة المطبق */
  unitPrice: number;
  /** السعر الإجمالي */
  totalPrice: number;
  /** نوع البيع المطبق فعلياً */
  appliedSaleType: SaleType;
  /** السعر الأصلي (التجزئة) */
  originalPrice: number;
  /** مبلغ التوفير */
  savings: number;
  /** نسبة التوفير */
  savingsPercentage: number;
  /** هل هذا سعر جملة؟ */
  isWholesale: boolean;
  /** مرحلة السعر المطبقة (إن وجدت) */
  appliedTier?: WholesaleTier;
  /** الحد الأدنى للكمية المطلوبة */
  minRequiredQuantity?: number;
  /** رسالة توضيحية */
  message?: string;
}

/**
 * معلومات المنتج للتسعير
 */
export interface ProductPricingInfo {
  id: string;
  price: number;
  wholesale_price?: number | null;
  partial_wholesale_price?: number | null;
  min_wholesale_quantity?: number | null;
  min_partial_wholesale_quantity?: number | null;
  allow_retail?: boolean;
  allow_wholesale?: boolean;
  allow_partial_wholesale?: boolean;
  wholesale_tiers?: WholesaleTier[] | string | null;
}

// =====================================================
// دوال مساعدة
// =====================================================

/**
 * تحويل wholesale_tiers من JSON string إلى مصفوفة
 */
export function parseWholesaleTiers(tiers: WholesaleTier[] | string | null | undefined): WholesaleTier[] {
  if (!tiers) return [];

  if (typeof tiers === 'string') {
    try {
      const parsed = JSON.parse(tiers);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(tiers) ? tiers : [];
}

/**
 * الحصول على مرحلة السعر المناسبة للكمية
 */
export function getApplicableTier(
  tiers: WholesaleTier[],
  quantity: number
): WholesaleTier | undefined {
  if (!tiers || tiers.length === 0) return undefined;

  // ترتيب المراحل تنازلياً حسب الحد الأدنى للكمية
  const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);

  // البحث عن أول مرحلة تتوافق مع الكمية
  return sortedTiers.find(tier => quantity >= tier.min_quantity);
}

/**
 * التحقق من توفر نوع البيع للمنتج
 */
export function isSaleTypeAvailable(
  product: ProductPricingInfo,
  saleType: SaleType
): boolean {
  switch (saleType) {
    case 'retail':
      return product.allow_retail !== false; // افتراضياً متاح
    case 'wholesale':
      return product.allow_wholesale === true &&
             (product.wholesale_price !== null && product.wholesale_price !== undefined && product.wholesale_price > 0);
    case 'partial_wholesale':
      return product.allow_partial_wholesale === true &&
             (product.partial_wholesale_price !== null && product.partial_wholesale_price !== undefined && product.partial_wholesale_price > 0);
    default:
      return false;
  }
}

/**
 * الحصول على الحد الأدنى للكمية لنوع البيع
 */
export function getMinQuantityForSaleType(
  product: ProductPricingInfo,
  saleType: SaleType
): number {
  switch (saleType) {
    case 'wholesale':
      return product.min_wholesale_quantity || 1;
    case 'partial_wholesale':
      return product.min_partial_wholesale_quantity || 1;
    case 'retail':
    default:
      return 1;
  }
}

// =====================================================
// دالة الحساب الرئيسية
// =====================================================

/**
 * حساب سعر المنتج بناءً على الكمية ونوع البيع
 *
 * @param product - معلومات المنتج
 * @param quantity - الكمية المطلوبة
 * @param requestedSaleType - نوع البيع المطلوب (اختياري)
 * @returns نتيجة الحساب مع جميع التفاصيل
 */
export function calculateProductPrice(
  product: ProductPricingInfo,
  quantity: number,
  requestedSaleType: SaleType = 'retail'
): PricingResult {
  const retailPrice = product.price || 0;
  let unitPrice = retailPrice;
  let appliedSaleType: SaleType = 'retail';
  let appliedTier: WholesaleTier | undefined;
  let minRequiredQuantity: number | undefined;
  let message: string | undefined;

  // التحقق من صحة الكمية
  if (quantity < 1) quantity = 1;

  // محاولة تطبيق نوع البيع المطلوب
  if (requestedSaleType === 'wholesale' && isSaleTypeAvailable(product, 'wholesale')) {
    const minQty = getMinQuantityForSaleType(product, 'wholesale');

    // التحقق من مراحل الأسعار أولاً
    const tiers = parseWholesaleTiers(product.wholesale_tiers);
    if (tiers.length > 0) {
      const tier = getApplicableTier(tiers, quantity);
      if (tier) {
        unitPrice = tier.price_per_unit;
        appliedSaleType = 'wholesale';
        appliedTier = tier;
      } else {
        // الكمية أقل من أقل مرحلة
        const lowestTier = tiers.reduce((min, t) =>
          t.min_quantity < min.min_quantity ? t : min, tiers[0]);
        minRequiredQuantity = lowestTier.min_quantity;
        message = `يجب طلب ${minRequiredQuantity} وحدة على الأقل للحصول على سعر الجملة`;
        // استخدام سعر التجزئة
        unitPrice = retailPrice;
      }
    } else if (quantity >= minQty) {
      // استخدام سعر الجملة الثابت
      unitPrice = product.wholesale_price || retailPrice;
      appliedSaleType = 'wholesale';
    } else {
      minRequiredQuantity = minQty;
      message = `يجب طلب ${minQty} وحدة على الأقل للحصول على سعر الجملة`;
    }
  }
  else if (requestedSaleType === 'partial_wholesale' && isSaleTypeAvailable(product, 'partial_wholesale')) {
    const minQty = getMinQuantityForSaleType(product, 'partial_wholesale');

    if (quantity >= minQty) {
      unitPrice = product.partial_wholesale_price || retailPrice;
      appliedSaleType = 'partial_wholesale';
    } else {
      minRequiredQuantity = minQty;
      message = `يجب طلب ${minQty} وحدة على الأقل للحصول على سعر نصف الجملة`;
    }
  }

  // حساب المبالغ
  const totalPrice = unitPrice * quantity;
  const originalTotal = retailPrice * quantity;
  const savings = originalTotal - totalPrice;
  const savingsPercentage = retailPrice > 0 ? ((retailPrice - unitPrice) / retailPrice) * 100 : 0;

  return {
    unitPrice,
    totalPrice,
    appliedSaleType,
    originalPrice: retailPrice,
    savings,
    savingsPercentage: Math.round(savingsPercentage * 100) / 100,
    isWholesale: appliedSaleType !== 'retail',
    appliedTier,
    minRequiredQuantity,
    message
  };
}

/**
 * الحصول على أفضل سعر ممكن للمنتج بناءً على الكمية
 * يختار تلقائياً نوع البيع الأرخص المتاح
 */
export function getBestPrice(
  product: ProductPricingInfo,
  quantity: number
): PricingResult {
  const prices: PricingResult[] = [];

  // حساب جميع الأسعار المتاحة
  prices.push(calculateProductPrice(product, quantity, 'retail'));

  if (isSaleTypeAvailable(product, 'wholesale')) {
    prices.push(calculateProductPrice(product, quantity, 'wholesale'));
  }

  if (isSaleTypeAvailable(product, 'partial_wholesale')) {
    prices.push(calculateProductPrice(product, quantity, 'partial_wholesale'));
  }

  // اختيار الأرخص
  return prices.reduce((best, current) =>
    current.unitPrice < best.unitPrice ? current : best
  );
}

/**
 * الحصول على جميع خيارات التسعير المتاحة للمنتج
 */
export function getAvailablePricingOptions(
  product: ProductPricingInfo
): Array<{
  saleType: SaleType;
  label: string;
  price: number;
  minQuantity: number;
  available: boolean;
}> {
  const options = [];

  // التجزئة
  options.push({
    saleType: 'retail' as SaleType,
    label: 'تجزئة',
    price: product.price,
    minQuantity: 1,
    available: isSaleTypeAvailable(product, 'retail')
  });

  // نصف الجملة
  if (product.partial_wholesale_price) {
    options.push({
      saleType: 'partial_wholesale' as SaleType,
      label: 'نصف جملة',
      price: product.partial_wholesale_price,
      minQuantity: product.min_partial_wholesale_quantity || 1,
      available: isSaleTypeAvailable(product, 'partial_wholesale')
    });
  }

  // الجملة
  if (product.wholesale_price) {
    options.push({
      saleType: 'wholesale' as SaleType,
      label: 'جملة',
      price: product.wholesale_price,
      minQuantity: product.min_wholesale_quantity || 1,
      available: isSaleTypeAvailable(product, 'wholesale')
    });
  }

  // مراحل الجملة
  const tiers = parseWholesaleTiers(product.wholesale_tiers);
  tiers.forEach((tier, index) => {
    options.push({
      saleType: 'wholesale' as SaleType,
      label: `جملة (${tier.min_quantity}+)`,
      price: tier.price_per_unit,
      minQuantity: tier.min_quantity,
      available: isSaleTypeAvailable(product, 'wholesale')
    });
  });

  return options.sort((a, b) => b.price - a.price);
}

/**
 * تحويل قيمة إلى boolean (يدعم 0/1 من SQLite)
 */
function toBoolean(value: any, defaultValue: boolean = false): boolean {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return defaultValue;
}

/**
 * تحويل Product إلى ProductPricingInfo
 */
export function toProductPricingInfo(product: Product | LocalProductFull): ProductPricingInfo {
  const info: ProductPricingInfo = {
    id: product.id,
    price: product.price || 0,
    wholesale_price: (product as any).wholesale_price ?? (product as any).wholesalePrice ?? null,
    partial_wholesale_price: (product as any).partial_wholesale_price ?? (product as any).partialWholesalePrice ?? null,
    min_wholesale_quantity: (product as any).min_wholesale_quantity ?? (product as any).minWholesaleQuantity ?? null,
    min_partial_wholesale_quantity: (product as any).min_partial_wholesale_quantity ?? (product as any).minPartialWholesaleQuantity ?? null,
    allow_retail: toBoolean((product as any).allow_retail ?? (product as any).allowRetail, true),
    allow_wholesale: toBoolean((product as any).allow_wholesale ?? (product as any).allowWholesale, false),
    allow_partial_wholesale: toBoolean((product as any).allow_partial_wholesale ?? (product as any).allowPartialWholesale, false),
    wholesale_tiers: (product as any).wholesale_tiers ?? (product as any).wholesaleTiers ?? null
  };

  console.log('📦 [toProductPricingInfo] Product:', product.name || product.id);
  console.log('   → RAW: allow_wholesale=', (product as any).allow_wholesale, '| wholesale_price=', (product as any).wholesale_price);
  console.log('   → CONVERTED: allow_wholesale=', info.allow_wholesale, '| wholesale_price=', info.wholesale_price);
  console.log('   → RESULT: hasWholesale=', info.allow_wholesale === true && info.wholesale_price !== null && info.wholesale_price !== undefined && (info.wholesale_price as number) > 0);

  return info;
}

// =====================================================
// أنواع البيع المتقدمة (وزن، علبة، متر)
// =====================================================

/**
 * نوع وحدة البيع
 */
export type SellingUnit = 'piece' | 'weight' | 'box' | 'meter';

/**
 * معلومات المنتج للبيع بالوزن
 */
export interface WeightProductInfo {
  sell_by_weight?: boolean;
  weight_unit?: 'kg' | 'g' | 'lb' | 'oz';
  price_per_weight_unit?: number;
  average_item_weight?: number;
  min_weight?: number;
  max_weight?: number;
  price?: number; // السعر الأساسي كـ fallback
}

/**
 * معلومات المنتج للبيع بالعلبة
 */
export interface BoxProductInfo {
  sell_by_box?: boolean;
  units_per_box?: number;
  box_price?: number;
  box_barcode?: string;
  price?: number; // سعر الوحدة
}

/**
 * معلومات المنتج للبيع بالمتر
 */
export interface MeterProductInfo {
  sell_by_meter?: boolean;
  price_per_meter?: number;
  roll_length?: number;
  price?: number; // السعر الأساسي كـ fallback
}

/**
 * نتيجة حساب البيع بالوزن
 */
export interface WeightPricingResult {
  /** الوزن المحدد */
  weight: number;
  /** وحدة الوزن */
  weightUnit: string;
  /** السعر لكل وحدة وزن */
  pricePerUnit: number;
  /** السعر الإجمالي */
  totalPrice: number;
  /** هل البيع بالوزن متاح؟ */
  isWeightSaleAvailable: boolean;
  /** رسالة توضيحية */
  message?: string;
}

/**
 * نتيجة حساب البيع بالعلبة
 */
export interface BoxPricingResult {
  /** عدد الصناديق */
  boxCount: number;
  /** عدد الوحدات في الصندوق */
  unitsPerBox: number;
  /** إجمالي الوحدات */
  totalUnits: number;
  /** سعر الصندوق */
  boxPrice: number;
  /** سعر الوحدة (في الصندوق) */
  unitPriceInBox: number;
  /** السعر الإجمالي */
  totalPrice: number;
  /** التوفير مقارنة بشراء الوحدات بشكل منفرد */
  savings: number;
  /** نسبة التوفير */
  savingsPercentage: number;
  /** هل البيع بالعلبة متاح؟ */
  isBoxSaleAvailable: boolean;
  /** رسالة توضيحية */
  message?: string;
}

/**
 * نتيجة حساب البيع بالمتر
 */
export interface MeterPricingResult {
  /** الطول بالمتر */
  length: number;
  /** السعر لكل متر */
  pricePerMeter: number;
  /** السعر الإجمالي */
  totalPrice: number;
  /** هل البيع بالمتر متاح؟ */
  isMeterSaleAvailable: boolean;
  /** رسالة توضيحية */
  message?: string;
}

/**
 * حساب سعر المنتج بناءً على الوزن
 *
 * @param product - معلومات المنتج
 * @param weight - الوزن المطلوب
 * @returns نتيجة الحساب
 */
export function calculateWeightPrice(
  product: WeightProductInfo,
  weight: number
): WeightPricingResult {
  const isAvailable = product.sell_by_weight === true &&
                      (product.price_per_weight_unit ?? 0) > 0;

  if (!isAvailable) {
    return {
      weight: 0,
      weightUnit: product.weight_unit || 'kg',
      pricePerUnit: 0,
      totalPrice: 0,
      isWeightSaleAvailable: false,
      message: 'البيع بالوزن غير متاح لهذا المنتج'
    };
  }

  // التحقق من الحدود
  if (product.min_weight && weight < product.min_weight) {
    return {
      weight,
      weightUnit: product.weight_unit || 'kg',
      pricePerUnit: product.price_per_weight_unit || 0,
      totalPrice: 0,
      isWeightSaleAvailable: true,
      message: `الحد الأدنى للوزن هو ${product.min_weight} ${product.weight_unit || 'kg'}`
    };
  }

  if (product.max_weight && weight > product.max_weight) {
    return {
      weight,
      weightUnit: product.weight_unit || 'kg',
      pricePerUnit: product.price_per_weight_unit || 0,
      totalPrice: 0,
      isWeightSaleAvailable: true,
      message: `الحد الأقصى للوزن هو ${product.max_weight} ${product.weight_unit || 'kg'}`
    };
  }

  const pricePerUnit = product.price_per_weight_unit || 0;
  const totalPrice = pricePerUnit * weight;

  return {
    weight,
    weightUnit: product.weight_unit || 'kg',
    pricePerUnit,
    totalPrice: Math.round(totalPrice * 100) / 100,
    isWeightSaleAvailable: true
  };
}

/**
 * حساب سعر المنتج بناءً على عدد الصناديق
 *
 * @param product - معلومات المنتج
 * @param boxCount - عدد الصناديق
 * @returns نتيجة الحساب
 */
export function calculateBoxPrice(
  product: BoxProductInfo,
  boxCount: number
): BoxPricingResult {
  const isAvailable = product.sell_by_box === true &&
                      (product.units_per_box ?? 0) > 0 &&
                      (product.box_price ?? 0) > 0;

  if (!isAvailable) {
    return {
      boxCount: 0,
      unitsPerBox: 0,
      totalUnits: 0,
      boxPrice: 0,
      unitPriceInBox: 0,
      totalPrice: 0,
      savings: 0,
      savingsPercentage: 0,
      isBoxSaleAvailable: false,
      message: 'البيع بالعلبة غير متاح لهذا المنتج'
    };
  }

  const unitsPerBox = product.units_per_box || 0;
  const boxPrice = product.box_price || 0;
  const unitPrice = product.price || 0;

  const totalUnits = boxCount * unitsPerBox;
  const totalPrice = boxCount * boxPrice;
  const unitPriceInBox = unitsPerBox > 0 ? boxPrice / unitsPerBox : 0;

  // حساب التوفير
  const priceIfBuyingUnits = totalUnits * unitPrice;
  const savings = priceIfBuyingUnits - totalPrice;
  const savingsPercentage = priceIfBuyingUnits > 0
    ? (savings / priceIfBuyingUnits) * 100
    : 0;

  return {
    boxCount,
    unitsPerBox,
    totalUnits,
    boxPrice,
    unitPriceInBox: Math.round(unitPriceInBox * 100) / 100,
    totalPrice,
    savings: Math.round(savings * 100) / 100,
    savingsPercentage: Math.round(savingsPercentage * 100) / 100,
    isBoxSaleAvailable: true,
    message: savings > 0 ? `توفير ${Math.round(savingsPercentage)}%` : undefined
  };
}

/**
 * حساب سعر المنتج بناءً على الطول بالمتر
 *
 * @param product - معلومات المنتج
 * @param length - الطول بالمتر
 * @returns نتيجة الحساب
 */
export function calculateMeterPrice(
  product: MeterProductInfo,
  length: number
): MeterPricingResult {
  const isAvailable = product.sell_by_meter === true &&
                      (product.price_per_meter ?? 0) > 0;

  if (!isAvailable) {
    return {
      length: 0,
      pricePerMeter: 0,
      totalPrice: 0,
      isMeterSaleAvailable: false,
      message: 'البيع بالمتر غير متاح لهذا المنتج'
    };
  }

  const pricePerMeter = product.price_per_meter || 0;
  const totalPrice = pricePerMeter * length;

  // التحقق من طول الرول
  if (product.roll_length && length > product.roll_length) {
    return {
      length,
      pricePerMeter,
      totalPrice: 0,
      isMeterSaleAvailable: true,
      message: `الطول المطلوب أكبر من طول الرول (${product.roll_length} متر)`
    };
  }

  return {
    length,
    pricePerMeter,
    totalPrice: Math.round(totalPrice * 100) / 100,
    isMeterSaleAvailable: true
  };
}

/**
 * تحديد نوع وحدة البيع المتاحة للمنتج
 */
export function getAvailableSellingUnits(
  product: WeightProductInfo & BoxProductInfo & MeterProductInfo
): SellingUnit[] {
  const units: SellingUnit[] = ['piece']; // الوحدة دائماً متاحة

  if (product.sell_by_weight && (product.price_per_weight_unit ?? 0) > 0) {
    units.push('weight');
  }

  if (product.sell_by_box && (product.units_per_box ?? 0) > 0 && (product.box_price ?? 0) > 0) {
    units.push('box');
  }

  if (product.sell_by_meter && (product.price_per_meter ?? 0) > 0) {
    units.push('meter');
  }

  return units;
}

/**
 * الحصول على وحدة البيع الافتراضية للمنتج
 */
export function getDefaultSellingUnit(
  product: WeightProductInfo & BoxProductInfo & MeterProductInfo
): SellingUnit {
  // الأولوية: piece > weight > box > meter
  if (product.sell_by_weight && (product.price_per_weight_unit ?? 0) > 0) {
    return 'weight';
  }
  if (product.sell_by_meter && (product.price_per_meter ?? 0) > 0) {
    return 'meter';
  }
  return 'piece';
}

/**
 * ترجمة وحدة البيع للعربية
 */
export function getSellingUnitLabel(unit: SellingUnit): string {
  switch (unit) {
    case 'piece': return 'وحدة';
    case 'weight': return 'وزن';
    case 'box': return 'علبة';
    case 'meter': return 'متر';
    default: return 'وحدة';
  }
}

/**
 * ترجمة وحدة الوزن للعربية
 */
export function getWeightUnitLabel(unit: string): string {
  switch (unit) {
    case 'kg': return 'كجم';
    case 'g': return 'جرام';
    case 'lb': return 'رطل';
    case 'oz': return 'أونصة';
    default: return unit;
  }
}

// =====================================================
// تصدير افتراضي
// =====================================================

export default {
  // دوال الحساب الأساسية
  calculateProductPrice,
  getBestPrice,
  getAvailablePricingOptions,
  isSaleTypeAvailable,
  getMinQuantityForSaleType,
  parseWholesaleTiers,
  getApplicableTier,
  toProductPricingInfo,

  // دوال البيع المتقدمة
  calculateWeightPrice,
  calculateBoxPrice,
  calculateMeterPrice,
  getAvailableSellingUnits,
  getDefaultSellingUnit,
  getSellingUnitLabel,
  getWeightUnitLabel
};
