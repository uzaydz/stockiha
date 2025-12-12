/**
 * ⚡ Hook لحسابات السلة المحسنة
 * يفصل منطق الحسابات المعقدة عن المكون الرئيسي لتحسين الأداء
 */

import { useMemo } from 'react';
import type { CartItem } from '@/types';

interface CartCalculationsOptions {
  cartItems: CartItem[];
  selectedServices: any[];
  selectedSubscriptions: any[];
  returnItems?: CartItem[];
  lossItems?: any[];
  lossTotals?: { totalCostValue: number };
}

interface CartSummary {
  itemCount: number;
  total: number;
  originalTotal: number;
}

interface ReturnSummary {
  itemCount: number;
  total: number;
}

interface LossSummary {
  itemCount: number;
  total: number;
}

/**
 * حساب سعر العنصر حسب نوع البيع
 */
const calculateItemPrice = (item: CartItem): number => {
  const sellingUnit = (item as any).sellingUnit;
  const hasCustomPrice = (item as any).customPrice !== undefined || item.variantPrice !== undefined;
  const customPrice = (item as any).customPrice ?? item.variantPrice ?? 0;

  switch (sellingUnit) {
    case 'weight': {
      const unitPrice = hasCustomPrice ? customPrice : (item.product?.price_per_weight_unit || item.product?.price || 0);
      return ((item as any).weight || 0) * unitPrice;
    }
    case 'box': {
      const unitPrice = hasCustomPrice ? customPrice : (item.product?.box_price || item.product?.price || 0);
      return ((item as any).boxCount || 0) * unitPrice;
    }
    case 'meter': {
      const unitPrice = hasCustomPrice ? customPrice : (item.product?.price_per_meter || item.product?.price || 0);
      return ((item as any).length || 0) * unitPrice;
    }
    default: {
      if (hasCustomPrice) {
        return customPrice * (item.quantity || 0);
      }

      const quantity = item.quantity || 0;
      const itemSaleType = (item as any).saleType;

      // إذا اختار المستخدم "تجزئة" صراحةً
      if (itemSaleType === 'retail') {
        return (item.product?.price || 0) * quantity;
      }

      // التحقق من وجود مستويات أسعار الجملة
      const wholesaleTiers = item.product?.wholesale_tiers;

      if (wholesaleTiers && Array.isArray(wholesaleTiers) && wholesaleTiers.length > 0) {
        const lowestTier = wholesaleTiers.reduce((min: any, t: any) =>
          (!min || t.min_quantity < min.min_quantity) ? t : min, null);

        if (itemSaleType === 'wholesale' || (!itemSaleType && lowestTier && quantity >= lowestTier.min_quantity)) {
          const sortedTiers = [...wholesaleTiers].sort((a: any, b: any) => b.min_quantity - a.min_quantity);
          const applicableTier = sortedTiers.find((t: any) => quantity >= t.min_quantity);
          if (applicableTier) {
            const wholesalePrice = applicableTier.price_per_unit || applicableTier.price;
            return wholesalePrice * quantity;
          }
        }
      }

      return (item.product?.price || 0) * quantity;
    }
  }
};

/**
 * حساب السعر الأصلي للعنصر (بدون تعديلات يدوية)
 */
const calculateOriginalItemPrice = (item: CartItem): number => {
  const sellingUnit = (item as any).sellingUnit;
  const quantity = item.quantity || 1;

  switch (sellingUnit) {
    case 'weight':
      return ((item as any).weight || 0) * (item.product?.price_per_weight_unit || item.product?.price || 0);
    case 'box':
      return ((item as any).boxCount || 0) * (item.product?.box_price || item.product?.price || 0);
    case 'meter':
      return ((item as any).length || 0) * (item.product?.price_per_meter || item.product?.price || 0);
    default: {
      const itemSaleType = (item as any).saleType;

      if (itemSaleType === 'retail') {
        return (item.product?.price || 0) * quantity;
      }

      const wholesaleTiers = item.product?.wholesale_tiers;

      if (wholesaleTiers && Array.isArray(wholesaleTiers) && wholesaleTiers.length > 0) {
        const lowestTier = wholesaleTiers.reduce((min: any, t: any) =>
          (!min || t.min_quantity < min.min_quantity) ? t : min, null);

        if (itemSaleType === 'wholesale' || (!itemSaleType && lowestTier && quantity >= lowestTier.min_quantity)) {
          const sortedTiers = [...wholesaleTiers].sort((a: any, b: any) => b.min_quantity - a.min_quantity);
          const applicableTier = sortedTiers.find((t: any) => quantity >= t.min_quantity);
          if (applicableTier) {
            const wholesalePrice = applicableTier.price_per_unit || applicableTier.price;
            return wholesalePrice * quantity;
          }
        }
      }

      return (item.product?.price || 0) * quantity;
    }
  }
};

export const usePOSCartCalculations = ({
  cartItems,
  selectedServices,
  selectedSubscriptions,
  returnItems = [],
  lossItems = [],
  lossTotals = { totalCostValue: 0 }
}: CartCalculationsOptions) => {

  // ⚡ حساب ملخص السلة
  const cartSummary = useMemo<CartSummary>(() => {
    const productItemsCount = cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
    const extraItemsCount = selectedServices.length + selectedSubscriptions.length;
    const itemsTotal = productItemsCount + extraItemsCount;

    const productsTotal = cartItems.reduce((total, item) => total + calculateItemPrice(item), 0);
    const originalProductsTotal = cartItems.reduce((total, item) => total + calculateOriginalItemPrice(item), 0);

    const servicesTotal = selectedServices.reduce((total, service) => total + (service?.price || 0), 0);
    const subscriptionsTotal = selectedSubscriptions.reduce((total, subscription) => {
      return total + (subscription?.price || subscription?.selling_price || subscription?.purchase_price || 0);
    }, 0);

    return {
      itemCount: itemsTotal,
      total: productsTotal + servicesTotal + subscriptionsTotal,
      originalTotal: originalProductsTotal + servicesTotal + subscriptionsTotal
    };
  }, [cartItems, selectedServices, selectedSubscriptions]);

  // ⚡ حساب ملخص الإرجاع
  const returnSummary = useMemo<ReturnSummary>(() => {
    const itemCount = returnItems.reduce((total, item) => total + (item.quantity || 0), 0);
    const total = returnItems.reduce((sum, item) => {
      const price = (item as any).customPrice ?? item.variantPrice ?? item.product?.price ?? 0;
      return sum + price * (item.quantity || 0);
    }, 0);

    return { itemCount, total };
  }, [returnItems]);

  // ⚡ ملخص سلة الخسائر
  const lossSummary = useMemo<LossSummary>(() => ({
    itemCount: lossItems.length,
    total: lossTotals.totalCostValue
  }), [lossItems.length, lossTotals.totalCostValue]);

  // ⚡ الملخص النشط حسب الوضع
  const getActiveCartSummary = (isLossMode: boolean, isReturnMode: boolean) => {
    if (isLossMode) return lossSummary;
    if (isReturnMode) return returnSummary;
    return cartSummary;
  };

  return {
    cartSummary,
    returnSummary,
    lossSummary,
    getActiveCartSummary,
    calculateItemPrice,
    calculateOriginalItemPrice
  };
};

export default usePOSCartCalculations;
