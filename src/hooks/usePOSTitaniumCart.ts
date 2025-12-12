/**
 * ⚡ Hook لإدارة عمليات TitaniumCart
 * يفصل منطق التحديث والحذف عن المكون الرئيسي
 */

import { useCallback } from 'react';
import type { CartItem } from '@/types';

interface TitaniumCartOptions {
  isLossMode: boolean;
  isReturnMode: boolean;
  lossItems: any[];
  returnItems: CartItem[];
  cartItems: CartItem[];
  // دوال الخسائر
  updateLossItem: (index: number, updates: any) => void;
  removeLossItem: (index: number) => void;
  clearLossCart: () => void;
  // دوال الإرجاع
  updateReturnItemQuantity: (index: number, quantity: number) => void;
  updateReturnItemPrice: (index: number, price: number) => void;
  updateReturnItemWeight?: (index: number, weight: number, unit: string) => void;
  updateReturnItemBoxCount?: (index: number, count: number) => void;
  updateReturnItemLength?: (index: number, length: number) => void;
  updateReturnItemSellingUnit?: (index: number, unit: string) => void;
  removeReturnItem: (index: number) => void;
  clearReturnCart: () => void;
  // دوال السلة العادية
  updateItemQuantity: (index: number, quantity: number) => void;
  updateItemPrice: (index: number, price: number) => void;
  updateItemWeight?: (index: number, weight: number, unit: string) => void;
  updateItemBoxCount?: (index: number, count: number) => void;
  updateItemLength?: (index: number, length: number) => void;
  updateItemSellingUnit?: (index: number, unit: string) => void;
  updateItemSaleType?: (index: number, saleType: string) => void;
  removeItemFromCart: (index: number) => void;
  clearCart: () => void;
}

export const usePOSTitaniumCart = ({
  isLossMode,
  isReturnMode,
  lossItems,
  returnItems,
  cartItems,
  updateLossItem,
  removeLossItem,
  clearLossCart,
  updateReturnItemQuantity,
  updateReturnItemPrice,
  updateReturnItemWeight,
  updateReturnItemBoxCount,
  updateReturnItemLength,
  updateReturnItemSellingUnit,
  removeReturnItem,
  clearReturnCart,
  updateItemQuantity,
  updateItemPrice,
  updateItemWeight,
  updateItemBoxCount,
  updateItemLength,
  updateItemSellingUnit,
  updateItemSaleType,
  removeItemFromCart,
  clearCart
}: TitaniumCartOptions) => {

  // ⚡ الحصول على العناصر الحالية
  const currentCartItems = isLossMode ? lossItems : (isReturnMode ? returnItems : cartItems);

  // ⚡ تحديث الكمية
  const handleUpdateQuantity = useCallback((index: number, value: number) => {
    const items = isLossMode ? lossItems : (isReturnMode ? returnItems : cartItems);
    const item = items[index];
    const sellingUnit = item?.sellingUnit;

    if (isLossMode) {
      if (sellingUnit === 'weight') {
        updateLossItem(index, { weight: value });
      } else if (sellingUnit === 'box') {
        updateLossItem(index, { boxCount: value });
      } else if (sellingUnit === 'meter') {
        updateLossItem(index, { length: value });
      } else {
        updateLossItem(index, { quantity: value });
      }
    } else if (isReturnMode) {
      if (sellingUnit === 'weight') {
        updateReturnItemWeight?.(index, value, item?.weightUnit || 'kg');
      } else if (sellingUnit === 'box') {
        updateReturnItemBoxCount?.(index, value);
      } else if (sellingUnit === 'meter') {
        updateReturnItemLength?.(index, value);
      } else {
        updateReturnItemQuantity(index, value);
      }
    } else {
      if (sellingUnit === 'weight') {
        updateItemWeight?.(index, value, item?.weightUnit || 'kg');
      } else if (sellingUnit === 'box') {
        updateItemBoxCount?.(index, value);
      } else if (sellingUnit === 'meter') {
        updateItemLength?.(index, value);
      } else {
        updateItemQuantity(index, value);
      }
    }
  }, [
    isLossMode, isReturnMode, lossItems, returnItems, cartItems,
    updateLossItem, updateReturnItemQuantity, updateItemQuantity,
    updateReturnItemWeight, updateReturnItemBoxCount, updateReturnItemLength,
    updateItemWeight, updateItemBoxCount, updateItemLength
  ]);

  // ⚡ تحديث السعر
  const handleUpdatePrice = useCallback((index: number, price: number) => {
    if (isLossMode) {
      return; // الخسائر لا تدعم تعديل السعر
    } else if (isReturnMode) {
      updateReturnItemPrice(index, price);
    } else {
      updateItemPrice(index, price);
    }
  }, [isLossMode, isReturnMode, updateReturnItemPrice, updateItemPrice]);

  // ⚡ حذف عنصر
  const handleRemoveItem = useCallback((index: number) => {
    if (isLossMode) {
      removeLossItem(index);
    } else if (isReturnMode) {
      removeReturnItem(index);
    } else {
      removeItemFromCart(index);
    }
  }, [isLossMode, isReturnMode, removeLossItem, removeReturnItem, removeItemFromCart]);

  // ⚡ مسح السلة
  const handleClearCart = useCallback(() => {
    if (isLossMode) {
      clearLossCart();
    } else if (isReturnMode) {
      clearReturnCart();
    } else {
      clearCart();
    }
  }, [isLossMode, isReturnMode, clearLossCart, clearReturnCart, clearCart]);

  // ⚡ حفظ التعديلات المتقدمة
  const handleAdvancedEditSave = useCallback((index: number, updates: any) => {
    if (isLossMode) {
      updateLossItem(index, updates);
    } else if (isReturnMode) {
      if (updates.quantity !== undefined) updateReturnItemQuantity(index, updates.quantity);
      if (updates.customPrice !== undefined) updateReturnItemPrice(index, updates.customPrice);
      if (updates.weight !== undefined) updateReturnItemWeight?.(index, updates.weight, updates.weightUnit);
      if (updates.boxCount !== undefined) updateReturnItemBoxCount?.(index, updates.boxCount);
      if (updates.length !== undefined) updateReturnItemLength?.(index, updates.length);
      if (updates.sellingUnit !== undefined) updateReturnItemSellingUnit?.(index, updates.sellingUnit);
    } else {
      if (updates.quantity !== undefined) updateItemQuantity(index, updates.quantity);
      if (updates.customPrice !== undefined) updateItemPrice(index, updates.customPrice);
      if (updates.weight !== undefined) updateItemWeight?.(index, updates.weight, updates.weightUnit);
      if (updates.boxCount !== undefined) updateItemBoxCount?.(index, updates.boxCount);
      if (updates.length !== undefined) updateItemLength?.(index, updates.length);
      if (updates.sellingUnit !== undefined) updateItemSellingUnit?.(index, updates.sellingUnit);
      if (updates.saleType !== undefined) updateItemSaleType?.(index, updates.saleType);
    }
  }, [
    isLossMode, isReturnMode, updateLossItem,
    updateReturnItemQuantity, updateReturnItemPrice, updateReturnItemWeight,
    updateReturnItemBoxCount, updateReturnItemLength, updateReturnItemSellingUnit,
    updateItemQuantity, updateItemPrice, updateItemWeight,
    updateItemBoxCount, updateItemLength, updateItemSellingUnit, updateItemSaleType
  ]);

  return {
    currentCartItems,
    handleUpdateQuantity,
    handleUpdatePrice,
    handleRemoveItem,
    handleClearCart,
    handleAdvancedEditSave
  };
};

export default usePOSTitaniumCart;
