import React, { useMemo, useState, useCallback } from 'react';
import { User as AppUser, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Check, Trash2 } from 'lucide-react';
import { RETURN_REASONS_WITH_ICONS_ARRAY } from '@/constants/returnReasons';
import CompactUnifiedCartItem from './CompactUnifiedCartItem';
import SellingUnitSelectorModal, { SellingUnitConfig } from './SellingUnitSelectorModal';
import type { SaleType, SellingUnit } from '@/lib/pricing/wholesalePricing';

// ⚡ واجهة CartItem الموحدة - تدعم جميع أنواع البيع
interface CartItem {
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  customPrice?: number;
  // ⚡ حقول أنواع البيع المتقدمة
  saleType?: SaleType;
  isWholesale?: boolean;
  originalPrice?: number;
  sellingUnit?: SellingUnit;
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  pricePerWeightUnit?: number;
  boxCount?: number;
  unitsPerBox?: number;
  boxPrice?: number;
  length?: number;
  pricePerMeter?: number;
}

interface ReturnModeCartProps {
  returnItems: CartItem[];
  returnReason: string;
  returnNotes: string;
  customers: AppUser[];
  currentUser: AppUser | null;
  isSubmittingOrder: boolean;
  updateReturnItemQuantity: (index: number, quantity: number) => void;
  removeReturnItem: (index: number) => void;
  clearReturnCart: () => void;
  processReturn: (customerId?: string, reason?: string, notes?: string) => Promise<void>;
  setReturnReason: (reason: string) => void;
  setReturnNotes: (notes: string) => void;
  updateReturnItemPrice?: (index: number, price: number) => void;
  // ⚡ دوال أنواع البيع المتقدمة
  updateReturnItemWeight?: (index: number, weight: number) => void;
  updateReturnItemBoxCount?: (index: number, count: number) => void;
  updateReturnItemLength?: (index: number, length: number) => void;
  updateReturnItemSellingUnit?: (index: number, unit: SellingUnit) => void;
  updateReturnItemFullConfig?: (index: number, config: {
    sellingUnit: SellingUnit;
    quantity?: number;
    weight?: number;
    weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
    boxCount?: number;
    length?: number;
  }) => void;
  calculateReturnItemTotal?: (item: CartItem) => number;
}

const ReturnModeCart: React.FC<ReturnModeCartProps> = ({
  returnItems,
  returnReason,
  returnNotes,
  customers,
  currentUser,
  isSubmittingOrder,
  updateReturnItemQuantity,
  removeReturnItem,
  clearReturnCart,
  processReturn,
  setReturnReason,
  setReturnNotes,
  updateReturnItemPrice,
  // ⚡ دوال أنواع البيع المتقدمة
  updateReturnItemWeight,
  updateReturnItemBoxCount,
  updateReturnItemLength,
  updateReturnItemSellingUnit,
  updateReturnItemFullConfig,
  calculateReturnItemTotal
}) => {
  // ⚡ حالة Modal التعديل
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const editingItem = editingItemIndex !== null ? returnItems[editingItemIndex] : null;

  // ⚡ حساب إجمالي عنصر حسب نوع البيع
  const calculateItemTotal = useCallback((item: CartItem): number => {
    // استخدام الدالة الممررة إذا توفرت
    if (calculateReturnItemTotal) {
      return calculateReturnItemTotal(item);
    }

    const sellingUnit = item.sellingUnit || 'piece';
    switch (sellingUnit) {
      case 'weight':
        const pricePerWeight = item.pricePerWeightUnit || (item.product as any).price_per_weight_unit || item.product.price || 0;
        return (item.weight || 0) * pricePerWeight;
      case 'box':
        const boxPrice = item.boxPrice || (item.product as any).box_price || item.product.price || 0;
        return (item.boxCount || 0) * boxPrice;
      case 'meter':
        const pricePerMeter = item.pricePerMeter || (item.product as any).price_per_meter || item.product.price || 0;
        return (item.length || 0) * pricePerMeter;
      case 'piece':
      default:
        const unitPrice = item.customPrice || item.variantPrice || item.product.price || 0;
        return (item.quantity || 0) * unitPrice;
    }
  }, [calculateReturnItemTotal]);

  // ⚡ حساب الإجمالي مع دعم أنواع البيع
  const returnTotal = useMemo(() => {
    return returnItems.reduce((total, item) => {
      return total + calculateItemTotal(item);
    }, 0);
  }, [returnItems, calculateItemTotal]);

  // ⚡ حساب عدد العناصر
  const totalReturnItemsCount = useMemo(() => {
    return returnItems.reduce((total, item) => {
      const sellingUnit = item.sellingUnit || 'piece';
      switch (sellingUnit) {
        case 'weight':
          return total + (item.weight || 0);
        case 'box':
          return total + (item.boxCount || 0);
        case 'meter':
          return total + (item.length || 0);
        default:
          return total + (item.quantity || 0);
      }
    }, 0);
  }, [returnItems]);

  // ⚡ فتح Modal التعديل
  const handleEditItem = useCallback((index: number) => {
    setEditingItemIndex(index);
  }, []);

  // ⚡ إغلاق Modal التعديل
  const handleCloseEditModal = useCallback(() => {
    setEditingItemIndex(null);
  }, []);

  // ⚡ تأكيد التعديل من Modal
  const handleConfirmEdit = useCallback((config: SellingUnitConfig) => {
    if (editingItemIndex === null) return;

    // استخدام الدالة الموحدة لتحديث كل الإعدادات مرة واحدة
    if (updateReturnItemFullConfig) {
      updateReturnItemFullConfig(editingItemIndex, {
        sellingUnit: config.sellingUnit,
        quantity: config.quantity,
        weight: config.weight,
        weightUnit: config.weightUnit,
        boxCount: config.boxCount,
        length: config.length
      });
    } else {
      // Fallback للدوال الفردية
      if (updateReturnItemSellingUnit) {
        updateReturnItemSellingUnit(editingItemIndex, config.sellingUnit);
      }

      switch (config.sellingUnit) {
        case 'weight':
          if (updateReturnItemWeight && config.weight) {
            updateReturnItemWeight(editingItemIndex, config.weight);
          }
          break;
        case 'box':
          if (updateReturnItemBoxCount && config.boxCount) {
            updateReturnItemBoxCount(editingItemIndex, config.boxCount);
          }
          break;
        case 'meter':
          if (updateReturnItemLength && config.length) {
            updateReturnItemLength(editingItemIndex, config.length);
          }
          break;
        case 'piece':
        default:
          updateReturnItemQuantity(editingItemIndex, config.quantity);
          break;
      }
    }

    setEditingItemIndex(null);
  }, [
    editingItemIndex,
    updateReturnItemFullConfig,
    updateReturnItemSellingUnit,
    updateReturnItemWeight,
    updateReturnItemBoxCount,
    updateReturnItemLength,
    updateReturnItemQuantity
  ]);

  // ⚡ تغيير سريع للكمية (للقطع فقط)
  const handleQuickQuantityChange = useCallback((index: number, delta: number) => {
    const item = returnItems[index];
    if (!item) return;

    const sellingUnit = item.sellingUnit || 'piece';
    if (sellingUnit !== 'piece') return; // فقط للقطع

    const currentQuantity = item.quantity || 1;
    const newQuantity = Math.max(1, currentQuantity + delta);
    updateReturnItemQuantity(index, newQuantity);
  }, [returnItems, updateReturnItemQuantity]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background dark:bg-slate-950 border-l-4 border-l-orange-500">
      {/* Header - مشابه لـ NormalModeCart */}
      <div className="bg-card/30 backdrop-blur-sm border-b border-border/50">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* أيقونة الإرجاع */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-100/80 dark:bg-orange-950/50">
                <RotateCcw className="h-3.5 w-3.5 text-orange-600" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">سلة الإرجاع</h3>
              </div>
              {totalReturnItemsCount > 0 && (
                <Badge className="inline-flex items-center rounded-full bg-orange-100/80 text-orange-700 border-0 px-2 py-0.5 text-[10px] font-medium">
                  {Math.round(totalReturnItemsCount * 100) / 100}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {returnItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearReturnCart}
                  className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  title="مسح"
                  disabled={isSubmittingOrder}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {returnItems.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[250px] text-center p-4">
              <div className="space-y-3">
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-orange-100/30">
                  <RotateCcw className="h-8 w-8 text-orange-500/40" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-muted-foreground">لا توجد عناصر</p>
                  <p className="text-xs text-muted-foreground/60">امسح للإضافة</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 space-y-1.5">
              {/* ⚡ استخدام CompactUnifiedCartItem مثل NormalModeCart */}
              {returnItems.map((item, index) => (
                <CompactUnifiedCartItem
                  key={`return-${item.product.id}-${item.colorId || 'no-color'}-${item.sizeId || 'no-size'}-${index}`}
                  item={item}
                  index={index}
                  onRemove={removeReturnItem}
                  onEdit={handleEditItem}
                  onQuickQuantityChange={handleQuickQuantityChange}
                  isReturn={true}
                />
              ))}
            </div>
          )}
      </div>

      {/* Actions - مبسط */}
      {returnItems.length > 0 && (
        <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-3 space-y-2.5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              سبب الإرجاع *
            </label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="اختر السبب" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS_WITH_ICONS_ARRAY.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">عدد العناصر</span>
              <span className="font-medium text-foreground">
                {Math.round(totalReturnItemsCount * 100) / 100}
              </span>
            </div>
            <div className="flex items-center justify-between bg-orange-50/50 dark:bg-orange-950/20 p-2 rounded-lg">
              <span className="text-sm font-semibold text-foreground">الإجمالي</span>
              <span className="text-lg font-bold text-orange-600">
                {returnTotal.toLocaleString()} دج
              </span>
            </div>
          </div>

          <Button
            onClick={() => processReturn(undefined, returnReason, returnNotes)}
            disabled={!returnReason || isSubmittingOrder}
            className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm"
          >
            <div className="flex items-center justify-center gap-1.5">
              {isSubmittingOrder ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent" />
                  <span className="text-sm">معالجة...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span className="text-sm">تأكيد الإرجاع</span>
                </>
              )}
            </div>
          </Button>
        </div>
      )}

      {/* ⚡ Modal تعديل عنصر سلة الإرجاع */}
      {editingItem && (
        <SellingUnitSelectorModal
          isOpen={editingItemIndex !== null}
          onClose={handleCloseEditModal}
          product={editingItem.product}
          onConfirm={handleConfirmEdit}
          currentConfig={{
            sellingUnit: editingItem.sellingUnit || 'piece',
            value: editingItem.weight || editingItem.boxCount || editingItem.length || editingItem.quantity || 1,
            quantity: editingItem.quantity || 1,
            weight: editingItem.weight,
            weightUnit: editingItem.weightUnit,
            boxCount: editingItem.boxCount,
            length: editingItem.length
          }}
          mode="edit"
        />
      )}
    </div>
  );
};

export default React.memo(ReturnModeCart);
