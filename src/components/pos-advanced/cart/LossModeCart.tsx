/**
 * ⚡ LossModeCart - سلة وضع الخسائر (تصميم بسيط)
 */

import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Trash2,
  Minus,
  Plus,
  Loader2,
  X,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

// القيم المسموحة من Supabase
export type LossType = 'damaged' | 'expired' | 'theft' | 'loss' | 'defective' | 'spoiled' | 'broken' | 'contaminated' | 'recalled' | 'other';
export type LossCondition = 'completely_damaged' | 'partially_damaged' | 'expired' | 'missing' | 'stolen' | 'defective' | 'contaminated' | 'other';

export interface LossCartItem {
  id: string;
  product: Product;
  quantity: number;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
  sellingUnit: 'piece' | 'weight' | 'meter' | 'box';
  weight?: number;
  weightUnit?: string;
  length?: number;
  boxCount?: number;
  unitsPerBox?: number;
  lossType: LossType;
  lossCondition: LossCondition;
  lossNotes?: string;
  unitCostPrice: number;
  unitSellingPrice: number;
  totalCostValue: number;
  totalSellingValue: number;
}

interface LossModeCartProps {
  items: LossCartItem[];
  onUpdateItem: (itemId: string, updates: Partial<LossCartItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onClearAll: () => void;
  onSubmitLoss: () => void;
  isSubmitting?: boolean;
  lossDescription: string;
  onLossDescriptionChange: (value: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const LOSS_TYPES: { value: LossType; label: string }[] = [
  { value: 'damaged', label: '💔 تلف' },
  { value: 'expired', label: '📅 انتهاء صلاحية' },
  { value: 'theft', label: '🔓 سرقة' },
  { value: 'broken', label: '💥 كسر' },
  { value: 'loss', label: '📉 فقدان' },
  { value: 'defective', label: '⚠️ معيب' },
  { value: 'spoiled', label: '🗑️ فاسد' },
  { value: 'other', label: '❓ أخرى' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-DZ').format(amount);
};

// ═══════════════════════════════════════════════════════════════════════════
// Loss Item Component (مبسط)
// ═══════════════════════════════════════════════════════════════════════════

const LossItem: React.FC<{
  item: LossCartItem;
  onUpdate: (updates: Partial<LossCartItem>) => void;
  onRemove: () => void;
}> = ({ item, onUpdate, onRemove }) => {

  const productName = item.colorName
    ? `${item.product.name} - ${item.colorName}${item.sizeName ? ` (${item.sizeName})` : ''}`
    : item.product.name;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-orange-200/50 last:border-0">
      {/* صورة مصغرة */}
      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {item.product.thumbnail_image ? (
          <img src={item.product.thumbnail_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package className="h-5 w-5 text-orange-500" />
        )}
      </div>

      {/* معلومات المنتج */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate text-gray-800">{productName}</p>
        <div className="flex items-center gap-2 mt-1">
          {/* سبب الخسارة */}
          <Select
            value={item.lossType}
            onValueChange={(v: LossType) => onUpdate({ lossType: v })}
          >
            <SelectTrigger className="h-6 text-[10px] w-24 border-orange-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOSS_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-orange-600 font-semibold">
            {formatCurrency(item.totalCostValue)} د.ج
          </span>
        </div>
      </div>

      {/* التحكم بالكمية */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-orange-300"
          onClick={() => onUpdate({ quantity: Math.max(1, item.quantity - 1) })}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-orange-300"
          onClick={() => onUpdate({ quantity: item.quantity + 1 })}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* حذف */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:bg-red-50"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const LossModeCart: React.FC<LossModeCartProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onSubmitLoss,
  isSubmitting = false,
  lossDescription,
  onLossDescriptionChange
}) => {
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        cost: acc.cost + item.totalCostValue,
        count: acc.count + item.quantity
      }),
      { cost: 0, count: 0 }
    );
  }, [items]);

  const canSubmit = items.length > 0 && lossDescription.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-orange-50 to-white">
      {/* ═══ Header برتقالي ═══ */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">سلة الخسائر</h2>
              <p className="text-orange-100 text-sm">
                {items.length > 0 ? `${totals.count} قطعة` : 'فارغة'}
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              <Trash2 className="h-4 w-4 ml-1" />
              مسح
            </Button>
          )}
        </div>
      </div>

      {/* ═══ وصف الخسارة ═══ */}
      <div className="p-3 bg-orange-50 border-b border-orange-200">
        <Textarea
          placeholder="✏️ اكتب وصف الخسارة هنا... (مطلوب)"
          value={lossDescription}
          onChange={(e) => onLossDescriptionChange(e.target.value)}
          className="min-h-[50px] text-sm resize-none bg-white border-orange-300 focus:border-orange-500 focus:ring-orange-500"
        />
      </div>

      {/* ═══ قائمة العناصر ═══ */}
      <div className="flex-1 overflow-y-auto px-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <Package className="h-10 w-10 text-orange-400" />
            </div>
            <p className="text-gray-500 font-medium">لا توجد عناصر</p>
            <p className="text-gray-400 text-sm mt-1">
              اضغط على منتج لإضافته للخسائر
            </p>
          </div>
        ) : (
          <div className="py-2">
            {items.map(item => (
              <LossItem
                key={item.id}
                item={item}
                onUpdate={(updates) => onUpdateItem(item.id, updates)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ Footer ═══ */}
      {items.length > 0 && (
        <div className="p-4 bg-white border-t border-orange-200 shadow-lg">
          {/* الإجمالي */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">إجمالي الخسارة:</span>
            <span className="text-xl font-bold text-orange-600">
              {formatCurrency(totals.cost)} د.ج
            </span>
          </div>

          {/* زر التسجيل */}
          <Button
            onClick={onSubmitLoss}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              "w-full h-12 text-base font-bold rounded-xl",
              "bg-gradient-to-r from-orange-500 to-orange-600",
              "hover:from-orange-600 hover:to-orange-700",
              "disabled:from-gray-300 disabled:to-gray-400"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
                جاري التسجيل...
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 ml-2" />
                تسجيل الخسارة
              </>
            )}
          </Button>

          {!lossDescription.trim() && (
            <p className="text-xs text-orange-500 text-center mt-2">
              ⚠️ يجب كتابة وصف للخسارة
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LossModeCart;
