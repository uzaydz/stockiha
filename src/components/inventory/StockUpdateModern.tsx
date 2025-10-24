/**
 * Modern Stock Update Dialog - Simple & Intuitive
 * نافذة تحديث المخزون العصرية - بسيطة وسهلة
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useInventoryOptimized } from '@/hooks/useInventoryOptimized';
import type { InventoryProduct } from '@/lib/api/inventory-optimized';

// Simple types for colors and sizes
interface ColorVariant {
  id: string;
  name: string;
  color_code: string;
  quantity: number;
  has_sizes: boolean;
  sizes?: SizeVariant[];
}

interface SizeVariant {
  id: string;
  name: string;
  quantity: number;
}

interface StockUpdateModernProps {
  item: InventoryProduct;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockUpdateModern({
  item,
  open,
  onClose,
  onSuccess,
}: StockUpdateModernProps) {
  const { updateStock, updating } = useInventoryOptimized();

  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeVariant | null>(null);
  const [operation, setOperation] = useState<'add' | 'subtract' | 'set'>('set');
  const [quantity, setQuantity] = useState<number>(0);
  const [note, setNote] = useState('');
  const [itemColors, setItemColors] = useState<ColorVariant[]>([]);
  const [loadingColors, setLoadingColors] = useState(false);

  // Load colors and sizes from item data (already fetched by RPC)
  useEffect(() => {
    if (!open || !item.has_variants) {
      setItemColors([]);
      setLoadingColors(false);
      return;
    }

    // Use data from RPC response - no need to fetch again!
    if (item.colors && Array.isArray(item.colors)) {
      const mappedColors: ColorVariant[] = item.colors.map((color: any) => ({
        id: color.id,
        name: color.name,
        color_code: color.color_code,
        quantity: color.quantity || 0,
        has_sizes: color.has_sizes || false,
        sizes: (color.sizes || []).map((size: any) => ({
          id: size.id,
          name: size.name,
          quantity: size.quantity || 0,
        })),
      }));
      
      setItemColors(mappedColors);
      console.log('✅ Using colors from RPC response:', mappedColors);
    } else {
      setItemColors([]);
    }
    
    setLoadingColors(false);
  }, [open, item]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedColor(null);
      setSelectedSize(null);
      setOperation('set');
      setQuantity(item.stock_quantity || 0);
      setNote('');
    }
  }, [open, item]);

  // Get current quantity
  const currentQuantity = selectedSize
    ? selectedSize.quantity
    : selectedColor
    ? selectedColor.quantity
    : item.stock_quantity || 0;

  // Calculate preview quantity
  const previewQuantity = 
    operation === 'set'
      ? quantity
      : operation === 'add'
      ? currentQuantity + quantity
      : Math.max(0, currentQuantity - quantity);

  // Check if color has sizes
  const colorHasSizes = selectedColor && selectedColor.has_sizes && selectedColor.sizes && selectedColor.sizes.length > 0;

  const handleSubmit = async () => {
    // Validation: If color has sizes, must select a size
    if (selectedColor && colorHasSizes && !selectedSize) {
      alert('يجب اختيار مقاس محدد لأن هذا اللون يحتوي على مقاسات');
      return;
    }

    const variantId = selectedSize?.id || selectedColor?.id || undefined;
    
    const success = await updateStock({
      product_id: item.id,
      variant_id: variantId,
      quantity: operation === 'set' ? quantity : Math.abs(quantity),
      operation,
      note,
    });

    if (success) {
      onSuccess();
    }
  };

  const quickActions = [
    { label: '-10', value: -10, operation: 'subtract' as const },
    { label: '-5', value: -5, operation: 'subtract' as const },
    { label: '-1', value: -1, operation: 'subtract' as const },
    { label: '+1', value: 1, operation: 'add' as const },
    { label: '+5', value: 5, operation: 'add' as const },
    { label: '+10', value: 10, operation: 'add' as const },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">تحديث المخزون</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="flex gap-4 p-4 bg-slate-50 rounded-lg">
            {item.thumbnail_image && (
              <img
                src={item.thumbnail_image}
                alt={item.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{item.name}</h3>
              {item.sku && <p className="text-sm text-muted-foreground">{item.sku}</p>}
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">الكمية الحالية: </span>
                <span className="font-semibold">{currentQuantity}</span>
              </p>
            </div>
          </div>

          {/* Variants Selection */}
          {item.has_variants && (
            <div className="space-y-4">
              {loadingColors ? (
                <div className="space-y-3">
                  <Label className="text-base mb-3 block">جاري تحميل الألوان والمقاسات...</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              ) : itemColors.length > 0 ? (
                <>
              <div>
                <Label className="text-base mb-3 block">اختر اللون</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <VariantButton
                    active={!selectedColor}
                    onClick={() => {
                      setSelectedColor(null);
                      setSelectedSize(null);
                      setQuantity(item.stock_quantity || 0);
                    }}
                  >
                    <div className="text-center">
                      <div className="font-medium">الكل</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.stock_quantity || 0} وحدة
                      </div>
                    </div>
                  </VariantButton>

                  {itemColors.map((color) => (
                    <VariantButton
                      key={color.id}
                      active={selectedColor?.id === color.id}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedSize(null);
                        setQuantity(color.quantity);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color.color_code }}
                        />
                        <div className="text-right flex-1">
                          <div className="font-medium text-sm">{color.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {color.quantity} وحدة
                          </div>
                        </div>
                      </div>
                    </VariantButton>
                  ))}
                </div>
              </div>

              {/* Sizes Selection */}
              {selectedColor && selectedColor.has_sizes && selectedColor.sizes && selectedColor.sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base">اختر المقاس</Label>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      مطلوب ✱
                    </span>
                  </div>
                  
                  {/* Warning message */}
                  {!selectedSize && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      ⚠️ يجب اختيار مقاس محدد لأن هذا اللون يحتوي على مقاسات
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedColor.sizes.map((size) => (
                      <VariantButton
                        key={size.id}
                        active={selectedSize?.id === size.id}
                        onClick={() => {
                          setSelectedSize(size);
                          setQuantity(size.quantity);
                        }}
                      >
                        <div className="text-center">
                          <div className="font-medium">{size.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {size.quantity} وحدة
                          </div>
                        </div>
                      </VariantButton>
                    ))}
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    💡 كمية اللون ({selectedColor.quantity}) = مجموع كميات المقاسات
                  </div>
                </div>
              )}
                </>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                  لا توجد ألوان أو مقاسات لهذا المنتج
                </div>
              )}
            </div>
          )}

          {/* Operation Type */}
          <div>
            <Label className="text-base mb-3 block">نوع العملية</Label>
            <div className="grid grid-cols-3 gap-2">
              <OperationButton
                active={operation === 'set'}
                onClick={() => {
                  setOperation('set');
                  setQuantity(currentQuantity);
                }}
              >
                تحديد الكمية
              </OperationButton>
              <OperationButton
                active={operation === 'add'}
                onClick={() => {
                  setOperation('add');
                  setQuantity(0);
                }}
                variant="success"
              >
                إضافة
              </OperationButton>
              <OperationButton
                active={operation === 'subtract'}
                onClick={() => {
                  setOperation('subtract');
                  setQuantity(0);
                }}
                variant="danger"
              >
                خصم
              </OperationButton>
            </div>
          </div>

          {/* Quick Actions */}
          {operation !== 'set' && (
            <div>
              <Label className="text-base mb-3 block">إجراءات سريعة</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {quickActions
                  .filter((action) => action.operation === operation)
                  .map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setQuantity(Math.abs(action.value))}
                      className="font-semibold"
                    >
                      {action.label}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <Label htmlFor="quantity" className="text-base mb-2 block">
              {operation === 'set' ? 'الكمية الجديدة' : 'الكمية'}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="text-lg font-semibold text-center"
            />
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">
                سيصبح المخزون
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {previewQuantity}
              </p>
            </div>
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note" className="text-base mb-2 block">
              ملاحظة (اختياري)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أضف ملاحظة حول سبب التحديث..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={updating}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updating || quantity === 0 && operation !== 'set'}
              className="flex-1"
            >
              {updating ? 'جاري التحديث...' : 'تحديث المخزون'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Sub Components ====================

interface VariantButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function VariantButton({ active, onClick, children }: VariantButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border-2 transition-all text-right',
        active
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  );
}

interface OperationButtonProps {
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger';
  children: React.ReactNode;
}

function OperationButton({ active, onClick, variant = 'default', children }: OperationButtonProps) {
  const colors = {
    default: active ? 'border-primary bg-primary text-white' : 'border-slate-200',
    success: active ? 'border-green-500 bg-green-500 text-white' : 'border-slate-200',
    danger: active ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'py-3 rounded-lg border-2 font-semibold transition-all',
        colors[variant]
      )}
    >
      {children}
    </button>
  );
}

