/**
 * ▦ VariantMatrix - مصفوفة المتغيرات
 * ============================================================
 *
 * نافذة لإدخال الكميات للمتغيرات (الألوان × المقاسات) بسرعة
 *
 * مثال:
 * +----------+----+----+----+----+
 * |          | S  | M  | L  | XL |
 * +----------+----+----+----+----+
 * | أحمر     | 5  | 5  | 2  | 0  |
 * | أزرق     | 3  | 4  | 3  | 1  |
 * | أبيض     | 2  | 3  | 2  | 0  |
 * +----------+----+----+----+----+
 *
 * ============================================================
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, X, Grid3X3, Package } from 'lucide-react';
import type {
  VariantColor,
  VariantSize,
  VariantMatrixCell,
  SmartPurchaseItem,
} from '../types/smart-purchase.types';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

interface VariantMatrixProps {
  /** هل النافذة مفتوحة */
  open: boolean;
  /** إغلاق النافذة */
  onOpenChange: (open: boolean) => void;
  /** معلومات المنتج */
  product: {
    id: string;
    name: string;
    thumbnail?: string;
    purchasePrice?: number;
    colors: VariantColor[];
    sizes?: VariantSize[];
    // ⚡ إعدادات الوحدات
    sell_by_box?: boolean;
    units_per_box?: number;
    sell_by_meter?: boolean;
    roll_length?: number;
    sell_by_weight?: boolean;
  };
  /** سعر الوحدة الافتراضي */
  defaultUnitCost: number;
  /** عند التأكيد */
  onConfirm: (items: SmartPurchaseItem[]) => void;
  /** اللغة */
  locale?: 'ar' | 'en';
}

interface MatrixCell {
  colorId: string;
  sizeId: string | null;
  quantity: number;
  unitCost: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function VariantMatrix({
  open,
  onOpenChange,
  product,
  defaultUnitCost,
  onConfirm,
  locale = 'ar',
}: VariantMatrixProps) {
  const [cells, setCells] = useState<MatrixCell[]>([]);
  const [unitCost, setUnitCost] = useState(defaultUnitCost);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // تحديد إذا كان المنتج له مقاسات
  const hasSizes = product.sizes && product.sizes.length > 0;

  // تهيئة المصفوفة عند الفتح
  useEffect(() => {
    if (open) {
      const initialCells: MatrixCell[] = [];

      for (const color of product.colors) {
        if (hasSizes && product.sizes) {
          for (const size of product.sizes) {
            initialCells.push({
              colorId: color.id,
              sizeId: size.id,
              quantity: 0,
              unitCost: defaultUnitCost,
            });
          }
        } else {
          initialCells.push({
            colorId: color.id,
            sizeId: null,
            quantity: 0,
            unitCost: defaultUnitCost,
          });
        }
      }

      setCells(initialCells);
      setUnitCost(defaultUnitCost);
    }
  }, [open, product, hasSizes, defaultUnitCost]);

  // تحديث خلية
  const updateCell = useCallback((colorId: string, sizeId: string | null, quantity: number) => {
    setCells(prev => prev.map(cell => {
      if (cell.colorId === colorId && cell.sizeId === sizeId) {
        return { ...cell, quantity: Math.max(0, quantity) };
      }
      return cell;
    }));
  }, []);

  // الحصول على قيمة خلية
  const getCellValue = useCallback((colorId: string, sizeId: string | null): number => {
    const cell = cells.find(c => c.colorId === colorId && c.sizeId === sizeId);
    return cell?.quantity || 0;
  }, [cells]);

  // حساب المجاميع
  const totals = useMemo(() => {
    const colorTotals: Record<string, number> = {};
    const sizeTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const cell of cells) {
      grandTotal += cell.quantity;

      colorTotals[cell.colorId] = (colorTotals[cell.colorId] || 0) + cell.quantity;

      if (cell.sizeId) {
        sizeTotals[cell.sizeId] = (sizeTotals[cell.sizeId] || 0) + cell.quantity;
      }
    }

    return { colorTotals, sizeTotals, grandTotal };
  }, [cells]);

  // التنقل بين الخلايا بـ Enter
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    colorIndex: number,
    sizeIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();

      const sizes = product.sizes || [{ id: 'none', name: '' }];
      let nextColorIndex = colorIndex;
      let nextSizeIndex = sizeIndex + 1;

      if (nextSizeIndex >= sizes.length) {
        nextSizeIndex = 0;
        nextColorIndex += 1;
      }

      if (nextColorIndex < product.colors.length) {
        const nextKey = `${product.colors[nextColorIndex].id}-${sizes[nextSizeIndex]?.id || 'none'}`;
        const nextInput = inputRefs.current.get(nextKey);
        nextInput?.focus();
        nextInput?.select();
      }
    }
  }, [product.colors, product.sizes]);

  // التأكيد
  const handleConfirm = () => {
    const items: SmartPurchaseItem[] = [];

    for (const cell of cells) {
      if (cell.quantity > 0) {
        const color = product.colors.find(c => c.id === cell.colorId);
        const size = hasSizes && cell.sizeId
          ? product.sizes?.find(s => s.id === cell.sizeId)
          : null;

        const variantDisplayName = size
          ? `${color?.name} - ${size.name}`
          : color?.name || '';

        items.push({
          id: '',
          tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productId: product.id,
          productName: product.name,
          productImage: product.thumbnail,
          variantType: size ? 'color_size' : 'color_only',
          colorId: cell.colorId,
          colorName: color?.name,
          sizeId: cell.sizeId,
          sizeName: size?.name,
          variantDisplayName,
          // ⚡ إعدادات الوحدات من المنتج
          sellByBox: product.sell_by_box || false,
          unitsPerBox: product.units_per_box,
          sellByMeter: product.sell_by_meter || false,
          rollLength: product.roll_length,
          sellByWeight: product.sell_by_weight || false,
          // الوحدة
          purchaseUnit: 'piece',
          conversionFactor: 1,
          purchaseQuantity: cell.quantity,
          baseQuantity: cell.quantity,
          unitCost: unitCost,
          baseCost: unitCost,
          taxRate: 0,
          taxAmount: 0,
          subtotal: cell.quantity * unitCost,
          totalCost: cell.quantity * unitCost,
          landedCostShare: 0,
          finalCost: cell.quantity * unitCost,
          finalBaseCost: unitCost,
          priceChanged: false,
          currentStock: 0,
          newStock: cell.quantity,
          stockDisplay: `${cell.quantity} قطعة`,
        });
      }
    }

    onConfirm(items);
    onOpenChange(false);
  };

  // إعادة تعيين الكميات
  const handleReset = () => {
    setCells(prev => prev.map(cell => ({ ...cell, quantity: 0 })));
  };

  // ملء سريع
  const handleQuickFill = (quantity: number) => {
    setCells(prev => prev.map(cell => ({ ...cell, quantity })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Grid3X3 className="h-5 w-5 text-primary" />
            <span>مصفوفة المتغيرات</span>
            <Badge variant="secondary" className="mr-auto">
              {product.name}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            أدخل الكميات لكل لون ومقاس. اضغط Enter للانتقال للخلية التالية.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* سعر الوحدة */}
          <div className="mb-4 flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <label className="text-sm font-medium">سعر الوحدة:</label>
            <Input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
              className="w-32 text-center"
              min={0}
            />
            <span className="text-muted-foreground text-sm">د.ج</span>

            <div className="mr-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                إعادة تعيين
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFill(1)}>
                ملء بـ 1
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFill(5)}>
                ملء بـ 5
              </Button>
            </div>
          </div>

          {/* المصفوفة */}
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-right min-w-[120px]">اللون</th>
                  {hasSizes && product.sizes?.map(size => (
                    <th key={size.id} className="border p-2 text-center min-w-[80px]">
                      {size.name}
                    </th>
                  ))}
                  {!hasSizes && (
                    <th className="border p-2 text-center min-w-[80px]">الكمية</th>
                  )}
                  <th className="border p-2 text-center bg-primary/10 min-w-[80px]">
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.colors.map((color, colorIndex) => (
                  <tr key={color.id} className="hover:bg-muted/30">
                    {/* عمود اللون */}
                    <td className="border p-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border"
                          style={{ backgroundColor: color.colorCode }}
                        />
                        <span className="font-medium">{color.name}</span>
                      </div>
                    </td>

                    {/* خلايا المقاسات */}
                    {hasSizes && product.sizes?.map((size, sizeIndex) => (
                      <td key={size.id} className="border p-1">
                        <Input
                          ref={(el) => {
                            if (el) {
                              inputRefs.current.set(`${color.id}-${size.id}`, el);
                            }
                          }}
                          type="number"
                          min={0}
                          value={getCellValue(color.id, size.id) || ''}
                          onChange={(e) => updateCell(color.id, size.id, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, colorIndex, sizeIndex)}
                          onFocus={(e) => e.target.select()}
                          className={cn(
                            "w-full text-center h-10",
                            getCellValue(color.id, size.id) > 0 && "bg-primary/10 border-primary"
                          )}
                          placeholder="0"
                        />
                      </td>
                    ))}

                    {/* خلية واحدة إذا لم يكن هناك مقاسات */}
                    {!hasSizes && (
                      <td className="border p-1">
                        <Input
                          ref={(el) => {
                            if (el) {
                              inputRefs.current.set(`${color.id}-none`, el);
                            }
                          }}
                          type="number"
                          min={0}
                          value={getCellValue(color.id, null) || ''}
                          onChange={(e) => updateCell(color.id, null, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, colorIndex, 0)}
                          onFocus={(e) => e.target.select()}
                          className={cn(
                            "w-full text-center h-10",
                            getCellValue(color.id, null) > 0 && "bg-primary/10 border-primary"
                          )}
                          placeholder="0"
                        />
                      </td>
                    )}

                    {/* مجموع الصف */}
                    <td className="border p-2 text-center font-bold bg-primary/5">
                      {totals.colorTotals[color.id] || 0}
                    </td>
                  </tr>
                ))}

                {/* صف المجاميع */}
                {hasSizes && (
                  <tr className="bg-primary/10 font-bold">
                    <td className="border p-2 text-right">المجموع</td>
                    {product.sizes?.map(size => (
                      <td key={size.id} className="border p-2 text-center">
                        {totals.sizeTotals[size.id] || 0}
                      </td>
                    ))}
                    <td className="border p-2 text-center bg-primary/20">
                      {totals.grandTotal}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ملخص */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-medium">الإجمالي:</span>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-primary">
                  {totals.grandTotal} قطعة
                </div>
                <div className="text-sm text-muted-foreground">
                  = {(totals.grandTotal * unitCost).toLocaleString('ar-DZ')} د.ج
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-2" />
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={totals.grandTotal === 0}
          >
            <Check className="h-4 w-4 ml-2" />
            تأكيد ({totals.grandTotal} قطعة)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 Variant Matrix Button (زر لفتح المصفوفة)
// ═══════════════════════════════════════════════════════════════════════════

interface VariantMatrixButtonProps {
  onClick: () => void;
  variantCount?: number;
  disabled?: boolean;
}

export function VariantMatrixButton({
  onClick,
  variantCount,
  disabled = false,
}: VariantMatrixButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="gap-1.5"
    >
      <Grid3X3 className="h-4 w-4" />
      <span>مصفوفة</span>
      {variantCount && variantCount > 0 && (
        <Badge variant="secondary" className="mr-1 px-1.5 py-0 text-xs">
          {variantCount}
        </Badge>
      )}
    </Button>
  );
}

export default VariantMatrix;
