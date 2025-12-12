/**
 * ⚡ مكون إدخال الأرقام التسلسلية
 * يعرض حقول إدخال الأرقام التسلسلية للمنتجات التي تتطلب ذلك
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Hash,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  Barcode,
  Package
} from 'lucide-react';

// نوع عنصر السلة
interface CartItem {
  // الحقول المباشرة
  id?: string;
  product_id?: string;
  productId?: string;
  name?: string;
  quantity: number;
  price?: number;
  track_serial_numbers?: boolean | number;
  require_serial_on_sale?: boolean | number;
  thumbnail_image?: string;
  colorName?: string;
  sizeName?: string;
  variantId?: string;
  // الحقل المجمّع للمنتج (من useCartTabs)
  product?: {
    id: string;
    name: string;
    thumbnail_image?: string;
    track_serial_numbers?: boolean | number;
    require_serial_on_sale?: boolean | number;
  };
}

// نوع الأرقام التسلسلية المدخلة
export interface SerialNumberEntry {
  productId: string;
  productName: string;
  variantId?: string;
  serialNumbers: string[];
  requiredCount: number;
}

interface SerialNumbersEntrySectionProps {
  cartItems: CartItem[];
  onSerialsChange: (serials: SerialNumberEntry[]) => void;
  serialEntries: SerialNumberEntry[];
}

export const SerialNumbersEntrySection: React.FC<SerialNumbersEntrySectionProps> = ({
  cartItems,
  onSerialsChange,
  serialEntries
}) => {
  // المنتجات التي تتطلب أرقام تسلسلية
  const productsRequiringSerials = cartItems.filter(item => {
    // التحقق من الحقول المباشرة أو داخل product
    const trackSerial =
      item.track_serial_numbers === true ||
      item.track_serial_numbers === 1 ||
      item.product?.track_serial_numbers === true ||
      item.product?.track_serial_numbers === 1;

    const requireSerial =
      item.require_serial_on_sale === true ||
      item.require_serial_on_sale === 1 ||
      item.product?.require_serial_on_sale === true ||
      item.product?.require_serial_on_sale === 1;

    // 🔍 DEBUG
    console.log('[SerialSection] 🔍 Checking item:', {
      name: item.name || item.product?.name,
      trackSerial,
      requireSerial,
      directTrack: item.track_serial_numbers,
      productTrack: item.product?.track_serial_numbers
    });

    return trackSerial && requireSerial;
  });

  // حالة توسيع/طي كل منتج
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // دالة مساعدة للحصول على معرف المنتج
  const getProductId = useCallback((item: CartItem) => {
    return item.product_id || item.productId || item.id || item.product?.id || '';
  }, []);

  // دالة مساعدة للحصول على اسم المنتج
  const getProductName = useCallback((item: CartItem) => {
    return item.name || item.product?.name || '';
  }, []);

  // دالة مساعدة للحصول على صورة المنتج
  const getProductImage = useCallback((item: CartItem) => {
    return item.thumbnail_image || item.product?.thumbnail_image;
  }, []);

  // تهيئة الأرقام التسلسلية عند تغيير المنتجات
  useEffect(() => {
    if (productsRequiringSerials.length > 0 && serialEntries.length === 0) {
      const initialEntries: SerialNumberEntry[] = productsRequiringSerials.map(item => ({
        productId: getProductId(item),
        productName: getProductName(item),
        variantId: item.variantId,
        serialNumbers: Array(item.quantity).fill(''),
        requiredCount: item.quantity
      }));
      onSerialsChange(initialEntries);

      // فتح أول منتج تلقائياً
      if (productsRequiringSerials.length > 0) {
        const firstProductKey = `${getProductId(productsRequiringSerials[0])}-${productsRequiringSerials[0].variantId || ''}`;
        setExpandedProducts(new Set([firstProductKey]));
      }
    }
  }, [productsRequiringSerials.length, getProductId, getProductName]);

  // تبديل توسيع/طي منتج
  const toggleProductExpand = useCallback((productKey: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productKey)) {
        newSet.delete(productKey);
      } else {
        newSet.add(productKey);
      }
      return newSet;
    });
  }, []);

  // تحديث رقم تسلسلي معين
  const updateSerialNumber = useCallback((productId: string, variantId: string | undefined, index: number, value: string) => {
    const newEntries = serialEntries.map(entry => {
      if (entry.productId === productId && entry.variantId === variantId) {
        const newSerials = [...entry.serialNumbers];
        newSerials[index] = value.trim();
        return { ...entry, serialNumbers: newSerials };
      }
      return entry;
    });
    onSerialsChange(newEntries);
  }, [serialEntries, onSerialsChange]);

  // مسح رقم تسلسلي
  const clearSerialNumber = useCallback((productId: string, variantId: string | undefined, index: number) => {
    updateSerialNumber(productId, variantId, index, '');
  }, [updateSerialNumber]);

  // حساب عدد الأرقام المكتملة
  const getCompletedCount = useCallback((entry: SerialNumberEntry) => {
    return entry.serialNumbers.filter(s => s.trim() !== '').length;
  }, []);

  // إذا لا توجد منتجات تتطلب أرقام تسلسلية
  if (productsRequiringSerials.length === 0) {
    return null;
  }

  // حساب إجمالي الأرقام المطلوبة والمكتملة
  const totalRequired = serialEntries.reduce((sum, e) => sum + e.requiredCount, 0);
  const totalCompleted = serialEntries.reduce((sum, e) => sum + getCompletedCount(e), 0);
  const allCompleted = totalRequired === totalCompleted;

  return (
    <div className="space-y-3">
      {/* العنوان والملخص */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2 text-sm">
          <Barcode className="h-4 w-4" />
          الأرقام التسلسلية
          <span className="text-red-500">*</span>
        </h3>
        <Badge
          variant={allCompleted ? "default" : "destructive"}
          className={cn(
            "text-xs",
            allCompleted && "bg-green-600"
          )}
        >
          {totalCompleted} / {totalRequired}
        </Badge>
      </div>

      {/* تنبيه */}
      {!allCompleted && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>يجب إدخال جميع الأرقام التسلسلية لإتمام الطلب</span>
          </div>
        </div>
      )}

      {/* قائمة المنتجات */}
      <div className="space-y-2">
        {productsRequiringSerials.map((item, itemIndex) => {
          const productId = getProductId(item);
          const productName = getProductName(item);
          const productImage = getProductImage(item);
          const productKey = `${productId}-${item.variantId || ''}`;
          const isExpanded = expandedProducts.has(productKey);

          const entry = serialEntries.find(
            e => e.productId === productId && e.variantId === item.variantId
          );

          const completedCount = entry ? getCompletedCount(entry) : 0;
          const isComplete = completedCount === item.quantity;

          return (
            <div
              key={productKey}
              className={cn(
                "border rounded-lg overflow-hidden transition-colors",
                isComplete
                  ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                  : "border-gray-200 dark:border-gray-700"
              )}
            >
              {/* رأس المنتج */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleProductExpand(productKey)}
              >
                <div className="flex items-center gap-3">
                  {/* صورة المنتج */}
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={productName}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div>
                    <div className="font-medium text-sm">{productName}</div>
                    {(item.colorName || item.sizeName) && (
                      <div className="text-xs text-muted-foreground">
                        {item.colorName && <span>{item.colorName}</span>}
                        {item.colorName && item.sizeName && <span> - </span>}
                        {item.sizeName && <span>{item.sizeName}</span>}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      الكمية: {item.quantity}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* حالة الإكمال */}
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {completedCount}/{item.quantity}
                    </Badge>
                  )}

                  {/* أيقونة التوسيع */}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* حقول الإدخال */}
              {isExpanded && entry && (
                <div className="p-3 pt-0 space-y-2 border-t">
                  {entry.serialNumbers.map((serial, serialIndex) => (
                    <div key={serialIndex} className="flex items-center gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {serialIndex + 1}
                      </div>
                      <div className="relative flex-1">
                        <Hash className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          value={serial}
                          onChange={(e) => updateSerialNumber(productId, item.variantId, serialIndex, e.target.value)}
                          placeholder={`الرقم التسلسلي ${serialIndex + 1}`}
                          className={cn(
                            "pr-8 h-9 text-sm",
                            serial.trim() && "border-green-300 dark:border-green-700"
                          )}
                          dir="ltr"
                        />
                      </div>
                      {serial.trim() && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => clearSerialNumber(productId, item.variantId, serialIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SerialNumbersEntrySection;
