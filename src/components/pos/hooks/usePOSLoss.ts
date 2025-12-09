/**
 * ⚡ usePOSLoss - Hook لإدارة وضع الخسائر في POS
 * ============================================================
 *
 * يدير:
 * - حالة وضع الخسائر (تشغيل/إيقاف)
 * - سلة عناصر الخسارة
 * - إنشاء تصريح الخسارة محلياً (Offline-First)
 * - تحديث المخزون تلقائياً
 *
 * ============================================================
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { Product } from '@/types';
import type { LossCartItem, LossType, LossCondition } from '@/components/pos-advanced/cart/LossModeCart';
import { createLocalLossDeclaration, calculateLossTotals } from '@/api/localLossDeclarationService';
import { reduceLocalProductStock } from '@/api/localProductService';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useWorkSession } from '@/context/WorkSessionContext';
import { usePOSMode } from '@/context/POSModeContext';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface UsePOSLossReturn {
  // حالة الوضع
  isLossMode: boolean;
  toggleLossMode: () => void;
  enterLossMode: () => void;
  exitLossMode: () => void;

  // سلة الخسائر
  lossItems: LossCartItem[];
  lossDescription: string;
  setLossDescription: (value: string) => void;

  // إدارة العناصر
  addItemToLossCart: (product: Product) => void;
  addVariantToLossCart: (
    product: Product,
    colorId?: string,
    sizeId?: string,
    price?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    image?: string
  ) => void;
  updateLossItem: (itemId: string, updates: Partial<LossCartItem>) => void;
  removeLossItem: (itemId: string) => void;
  clearLossCart: () => void;

  // أنواع البيع المتقدمة
  updateLossItemWeight: (itemId: string, weight: number) => void;
  updateLossItemLength: (itemId: string, length: number) => void;
  updateLossItemBoxCount: (itemId: string, boxCount: number) => void;
  updateLossItemSellingUnit: (itemId: string, unit: 'piece' | 'weight' | 'meter' | 'box') => void;

  // تسجيل الخسارة
  submitLoss: () => Promise<boolean>;
  isSubmittingLoss: boolean;

  // الإجماليات
  lossTotals: {
    totalCostValue: number;
    totalSellingValue: number;
    itemsCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const generateLossNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `LOSS-${year}${month}${day}-${random}`;
};

const calculateItemTotals = (item: LossCartItem): { totalCostValue: number; totalSellingValue: number } => {
  let quantity = item.quantity;

  // حساب الكمية حسب نوع البيع
  switch (item.sellingUnit) {
    case 'weight':
      quantity = item.weight || 0;
      break;
    case 'meter':
      quantity = item.length || 0;
      break;
    case 'box':
      quantity = (item.boxCount || 0) * (item.unitsPerBox || 1);
      break;
  }

  return {
    totalCostValue: quantity * item.unitCostPrice,
    totalSellingValue: quantity * item.unitSellingPrice
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════

export const usePOSLoss = (): UsePOSLossReturn => {
  const { currentOrganization } = useTenant();
  const { user } = useAuth();
  const { activeSession } = useWorkSession();

  // ⚡ استخدام POSModeContext للتزامن مع التايتل بار
  const { mode, setMode, toggleLossMode: contextToggleLoss } = usePOSMode();

  // ⚡ حالة الوضع مرتبطة بالـ Context
  const isLossMode = mode === 'loss';

  // سلة الخسائر
  const [lossItems, setLossItems] = useState<LossCartItem[]>([]);
  const [lossDescription, setLossDescription] = useState('');
  const [isSubmittingLoss, setIsSubmittingLoss] = useState(false);

  // ⚡ مسح السلة عند الخروج من وضع الخسائر
  useEffect(() => {
    if (mode !== 'loss' && lossItems.length > 0) {
      // عند الخروج من وضع الخسائر، امسح السلة
      setLossItems([]);
      setLossDescription('');
      console.log('[usePOSLoss] Mode changed to', mode, '- clearing loss cart');
    }
  }, [mode]);

  // ═══════════════════════════════════════════════════════════════════════
  // Toggle Loss Mode - ⚡ مرتبط بالـ Context
  // ═══════════════════════════════════════════════════════════════════════

  const toggleLossMode = useCallback(() => {
    contextToggleLoss();
    console.log('[usePOSLoss] toggleLossMode via context');
  }, [contextToggleLoss]);

  const enterLossMode = useCallback(() => {
    setMode('loss');
    console.log('[usePOSLoss] enterLossMode via context');
  }, [setMode]);

  const exitLossMode = useCallback(() => {
    setMode('sales');
    setLossItems([]);
    setLossDescription('');
    console.log('[usePOSLoss] exitLossMode via context');
  }, [setMode]);

  // ═══════════════════════════════════════════════════════════════════════
  // Add Item to Loss Cart
  // ═══════════════════════════════════════════════════════════════════════

  const addItemToLossCart = useCallback((product: Product) => {
    console.log('[usePOSLoss] 🔶 addItemToLossCart called with:', product.name, product.id);

    setLossItems(prev => {
      console.log('[usePOSLoss] 🔶 Current lossItems count:', prev.length);

      // تحقق من وجود المنتج (بدون متغيرات)
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && !item.colorId && !item.sizeId
      );

      if (existingIndex >= 0) {
        // زيادة الكمية
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        // إعادة حساب الإجماليات
        const totals = calculateItemTotals(updated[existingIndex]);
        updated[existingIndex].totalCostValue = totals.totalCostValue;
        updated[existingIndex].totalSellingValue = totals.totalSellingValue;
        return updated;
      }

      // تحديد نوع البيع من المنتج
      let sellingUnit: 'piece' | 'weight' | 'meter' | 'box' = 'piece';
      if (product.sell_by_weight) sellingUnit = 'weight';
      else if (product.sell_by_meter) sellingUnit = 'meter';
      else if (product.sell_by_box) sellingUnit = 'box';

      const newItem: LossCartItem = {
        id: uuidv4(),
        product,
        quantity: 1,
        sellingUnit,
        weight: sellingUnit === 'weight' ? 1 : undefined,
        weightUnit: product.weight_unit || 'kg',
        length: sellingUnit === 'meter' ? 1 : undefined,
        boxCount: sellingUnit === 'box' ? 1 : undefined,
        unitsPerBox: product.units_per_box || 1,
        lossType: 'damaged',
        lossCondition: 'completely_damaged',
        unitCostPrice: product.purchase_price || 0,
        unitSellingPrice: product.price || 0,
        totalCostValue: product.purchase_price || 0,
        totalSellingValue: product.price || 0
      };

      return [...prev, newItem];
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // Add Variant to Loss Cart
  // ═══════════════════════════════════════════════════════════════════════

  const addVariantToLossCart = useCallback((
    product: Product,
    colorId?: string,
    sizeId?: string,
    price?: number,
    colorName?: string,
    colorCode?: string,
    sizeName?: string,
    image?: string
  ) => {
    setLossItems(prev => {
      // تحقق من وجود نفس المتغير
      const existingIndex = prev.findIndex(
        item =>
          item.product.id === product.id &&
          item.colorId === colorId &&
          item.sizeId === sizeId
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        const totals = calculateItemTotals(updated[existingIndex]);
        updated[existingIndex].totalCostValue = totals.totalCostValue;
        updated[existingIndex].totalSellingValue = totals.totalSellingValue;
        return updated;
      }

      let sellingUnit: 'piece' | 'weight' | 'meter' | 'box' = 'piece';
      if (product.sell_by_weight) sellingUnit = 'weight';
      else if (product.sell_by_meter) sellingUnit = 'meter';
      else if (product.sell_by_box) sellingUnit = 'box';

      const unitPrice = price || product.price || 0;

      const newItem: LossCartItem = {
        id: uuidv4(),
        product,
        quantity: 1,
        colorId,
        colorName,
        colorCode,
        sizeId,
        sizeName,
        variantPrice: price,
        variantImage: image,
        sellingUnit,
        weight: sellingUnit === 'weight' ? 1 : undefined,
        weightUnit: product.weight_unit || 'kg',
        length: sellingUnit === 'meter' ? 1 : undefined,
        boxCount: sellingUnit === 'box' ? 1 : undefined,
        unitsPerBox: product.units_per_box || 1,
        lossType: 'damaged',
        lossCondition: 'completely_damaged',
        unitCostPrice: product.purchase_price || 0,
        unitSellingPrice: unitPrice,
        totalCostValue: product.purchase_price || 0,
        totalSellingValue: unitPrice
      };

      return [...prev, newItem];
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // Update & Remove Items
  // ═══════════════════════════════════════════════════════════════════════

  const updateLossItem = useCallback((itemId: string, updates: Partial<LossCartItem>) => {
    setLossItems(prev => {
      return prev.map(item => {
        if (item.id !== itemId) return item;

        const updated = { ...item, ...updates };
        const totals = calculateItemTotals(updated);
        return {
          ...updated,
          totalCostValue: totals.totalCostValue,
          totalSellingValue: totals.totalSellingValue
        };
      });
    });
  }, []);

  const removeLossItem = useCallback((itemId: string) => {
    setLossItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearLossCart = useCallback(() => {
    setLossItems([]);
    setLossDescription('');
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // Advanced Selling Types
  // ═══════════════════════════════════════════════════════════════════════

  const updateLossItemWeight = useCallback((itemId: string, weight: number) => {
    updateLossItem(itemId, { weight: Math.max(0.1, weight) });
  }, [updateLossItem]);

  const updateLossItemLength = useCallback((itemId: string, length: number) => {
    updateLossItem(itemId, { length: Math.max(0.1, length) });
  }, [updateLossItem]);

  const updateLossItemBoxCount = useCallback((itemId: string, boxCount: number) => {
    updateLossItem(itemId, { boxCount: Math.max(1, boxCount) });
  }, [updateLossItem]);

  const updateLossItemSellingUnit = useCallback((
    itemId: string,
    unit: 'piece' | 'weight' | 'meter' | 'box'
  ) => {
    setLossItems(prev => {
      return prev.map(item => {
        if (item.id !== itemId) return item;

        const updated: LossCartItem = {
          ...item,
          sellingUnit: unit,
          quantity: unit === 'piece' ? 1 : item.quantity,
          weight: unit === 'weight' ? 1 : undefined,
          length: unit === 'meter' ? 1 : undefined,
          boxCount: unit === 'box' ? 1 : undefined
        };

        const totals = calculateItemTotals(updated);
        return {
          ...updated,
          totalCostValue: totals.totalCostValue,
          totalSellingValue: totals.totalSellingValue
        };
      });
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // Submit Loss
  // ═══════════════════════════════════════════════════════════════════════

  const submitLoss = useCallback(async (): Promise<boolean> => {
    if (!currentOrganization?.id) {
      toast.error('لم يتم العثور على المؤسسة');
      return false;
    }

    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    if (lossItems.length === 0) {
      toast.error('لا توجد عناصر للتسجيل');
      return false;
    }

    if (!lossDescription.trim()) {
      toast.error('يجب إدخال وصف للخسارة');
      return false;
    }

    setIsSubmittingLoss(true);

    try {
      const lossNumber = generateLossNumber();
      const now = new Date().toISOString();
      // ⚡ يجب أن يكون reported_by UUID صالح - نستخدم user.id (من auth.users)
      const reportedBy = user.id; // تم التحقق أعلاه

      // حساب الإجماليات
      const totals = lossItems.reduce(
        (acc, item) => ({
          totalCostValue: acc.totalCostValue + item.totalCostValue,
          totalSellingValue: acc.totalSellingValue + item.totalSellingValue,
          totalItemsCount: acc.totalItemsCount + item.quantity
        }),
        { totalCostValue: 0, totalSellingValue: 0, totalItemsCount: 0 }
      );

      // تحضير بيانات الخسارة
      const lossData = {
        loss_number: lossNumber,
        organization_id: currentOrganization.id,
        loss_type: lossItems[0]?.lossType || 'damaged',
        loss_description: lossDescription.trim(),
        incident_date: now.split('T')[0],
        reported_by: reportedBy,
        status: 'approved' as const, // نوافق تلقائياً لتحديث المخزون فوراً
        total_cost_value: totals.totalCostValue,
        total_selling_value: totals.totalSellingValue,
        total_items_count: totals.totalItemsCount,
        notes: `تم التسجيل من نقطة البيع`
      };

      // تحضير عناصر الخسارة
      const items = lossItems.map(item => {
        // حساب الكمية الفعلية
        let lostQuantity = item.quantity;
        if (item.sellingUnit === 'weight') lostQuantity = item.weight || 0;
        else if (item.sellingUnit === 'meter') lostQuantity = item.length || 0;
        else if (item.sellingUnit === 'box') lostQuantity = (item.boxCount || 0) * (item.unitsPerBox || 1);

        return {
          product_id: item.product.id,
          product_name: item.product.name,
          product_sku: item.product.sku || '',
          product_barcode: item.product.barcode || '',
          lost_quantity: lostQuantity,
          unit_cost_price: item.unitCostPrice,
          unit_selling_price: item.unitSellingPrice,
          total_cost_value: item.totalCostValue,
          total_selling_value: item.totalSellingValue,
          loss_condition: item.lossCondition,
          color_id: item.colorId || null,
          color_name: item.colorName || null,
          size_id: item.sizeId || null,
          size_name: item.sizeName || null,
          item_notes: item.lossNotes || null,
          inventory_adjusted: true,
          inventory_adjusted_at: now,
          inventory_adjusted_by: reportedBy, // UUID أو null
          organization_id: currentOrganization.id
        };
      });

      // إنشاء الخسارة محلياً
      const result = await createLocalLossDeclaration({
        lossData: lossData as any,
        items: items as any
      });

      // ⚡ تحديث المخزون فوراً لكل عنصر
      for (const item of lossItems) {
        let quantityToReduce = item.quantity;
        if (item.sellingUnit === 'weight') quantityToReduce = item.weight || 0;
        else if (item.sellingUnit === 'meter') quantityToReduce = item.length || 0;
        else if (item.sellingUnit === 'box') quantityToReduce = item.boxCount || 0;

        try {
          await reduceLocalProductStock(
            item.product.id,
            Math.abs(quantityToReduce),
            {
              colorId: item.colorId,
              sizeId: item.sizeId,
              sellingUnit: item.sellingUnit // ⚡ تمرير نوع البيع
            }
          );
        } catch (stockError) {
          console.error('[usePOSLoss] Failed to reduce stock for', item.product.id, stockError);
        }
      }

      // تنظيف وإظهار رسالة نجاح
      setLossItems([]);
      setLossDescription('');
      setMode('sales'); // ⚡ استخدام Context بدلاً من setIsLossMode

      toast.success(`تم تسجيل الخسارة ${lossNumber}`, {
        description: `${lossItems.length} عنصر - ${totals.totalCostValue.toLocaleString('ar-DZ')} د.ج`
      });

      return true;
    } catch (error) {
      console.error('[usePOSLoss] Submit error:', error);
      toast.error('فشل في تسجيل الخسارة');
      return false;
    } finally {
      setIsSubmittingLoss(false);
    }
  }, [currentOrganization, user, activeSession, lossItems, lossDescription]);

  // ═══════════════════════════════════════════════════════════════════════
  // Totals
  // ═══════════════════════════════════════════════════════════════════════

  const lossTotals = useMemo(() => {
    return lossItems.reduce(
      (acc, item) => ({
        totalCostValue: acc.totalCostValue + item.totalCostValue,
        totalSellingValue: acc.totalSellingValue + item.totalSellingValue,
        itemsCount: acc.itemsCount + 1
      }),
      { totalCostValue: 0, totalSellingValue: 0, itemsCount: 0 }
    );
  }, [lossItems]);

  // ═══════════════════════════════════════════════════════════════════════
  // Return
  // ═══════════════════════════════════════════════════════════════════════

  return {
    isLossMode,
    toggleLossMode,
    enterLossMode,
    exitLossMode,

    lossItems,
    lossDescription,
    setLossDescription,

    addItemToLossCart,
    addVariantToLossCart,
    updateLossItem,
    removeLossItem,
    clearLossCart,

    updateLossItemWeight,
    updateLossItemLength,
    updateLossItemBoxCount,
    updateLossItemSellingUnit,

    submitLoss,
    isSubmittingLoss,

    lossTotals
  };
};

export default usePOSLoss;
