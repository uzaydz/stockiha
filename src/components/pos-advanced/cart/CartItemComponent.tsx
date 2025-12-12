import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Trash2,
  Plus,
  Minus,
  Edit3,
  Scale,
  Box,
  Ruler,
  Calendar,
  Hash,
  AlertTriangle
} from 'lucide-react';
import { SaleTypeSelector, SaleTypeBadge } from '@/components/pos/SaleTypeSelector';
import type { SaleType, SellingUnit } from '@/lib/pricing/wholesalePricing';
import {
  toProductPricingInfo,
  isSaleTypeAvailable,
  calculateProductPrice,
  getAvailableSellingUnits,
  calculateWeightPrice,
  calculateBoxPrice,
  calculateMeterPrice,
  getWeightUnitLabel
} from '@/lib/pricing/wholesalePricing';
import {
  WeightInput,
  BoxCountInput,
  MeterInput,
  SellingUnitSelector,
  BatchSelector,
  SerialNumberInput,
  type BatchInfo,
  type SerialInfo
} from './inputs';

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
  saleType?: SaleType;
  isWholesale?: boolean;
  originalPrice?: number;
  // === حقول أنواع البيع المتقدمة ===
  sellingUnit?: SellingUnit;
  // البيع بالوزن
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  pricePerWeightUnit?: number;
  // البيع بالعلبة
  boxCount?: number;
  unitsPerBox?: number;
  boxPrice?: number;
  // البيع بالمتر
  length?: number;
  pricePerMeter?: number;
  // === حقول الدفعات والأرقام التسلسلية ===
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string[];
}

interface CartItemComponentProps {
  item: CartItem;
  index: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
  onUpdatePrice?: (index: number, price: number) => void;
  onUpdateSaleType?: (index: number, saleType: SaleType) => void;
  onUpdateSellingUnit?: (index: number, unit: SellingUnit) => void;
  onUpdateWeight?: (index: number, weight: number) => void;
  onUpdateBoxCount?: (index: number, count: number) => void;
  onUpdateLength?: (index: number, length: number) => void;
  // === props الدفعات والأرقام التسلسلية ===
  onUpdateBatch?: (index: number, batchId: string, batchNumber: string) => void;
  onUpdateSerialNumbers?: (index: number, serials: string[], serialIds?: string[]) => void;
  availableBatches?: BatchInfo[];
  availableSerials?: SerialInfo[];
  // ⚡ props جديدة للعمل Offline
  organizationId?: string; // مطلوب لـ SerialNumberInput و BatchSelector الجديدة
  orderDraftId?: string;   // مطلوب لحجز الأرقام التسلسلية
  onSerialReserved?: (serialId: string, serialNumber: string) => void;
  onSerialReleased?: (serialId: string, serialNumber: string) => void;
  onSerialConflict?: (serialNumber: string, conflictType: 'reserved' | 'sold') => void;
  isReturn?: boolean;
}

const CartItemComponent: React.FC<CartItemComponentProps> = ({
  item,
  index,
  onUpdateQuantity,
  onRemove,
  onUpdatePrice,
  onUpdateSaleType,
  onUpdateSellingUnit,
  onUpdateWeight,
  onUpdateBoxCount,
  onUpdateLength,
  onUpdateBatch,
  onUpdateSerialNumbers,
  availableBatches = [],
  availableSerials = [],
  // ⚡ props جديدة للعمل Offline
  organizationId,
  orderDraftId,
  onSerialReserved,
  onSerialReleased,
  onSerialConflict,
  isReturn = false
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');

  const currentPrice = item.customPrice || item.variantPrice || item.product.price || 0;
  const originalPrice = item.originalPrice || item.variantPrice || item.product.price || 0;
  const isPriceModified = item.customPrice && item.customPrice !== originalPrice;

  // التحقق من توفر خيارات الجملة للمنتج
  const pricingInfo = useMemo(() => toProductPricingInfo(item.product), [item.product]);
  const hasWholesaleOptions = useMemo(() => {
    const hasWholesale = isSaleTypeAvailable(pricingInfo, 'wholesale');
    const hasPartialWholesale = isSaleTypeAvailable(pricingInfo, 'partial_wholesale');
    return hasWholesale || hasPartialWholesale;
  }, [pricingInfo]);

  // نوع البيع الحالي
  const currentSaleType: SaleType = item.saleType || 'retail';

  // دالة تغيير نوع البيع
  const handleSaleTypeChange = useCallback((newSaleType: SaleType) => {
    if (onUpdateSaleType) {
      onUpdateSaleType(index, newSaleType);
    }
  }, [index, onUpdateSaleType]);

  const handlePriceEdit = useCallback(() => {
    setTempPrice(currentPrice.toString());
    setIsEditingPrice(true);
  }, [currentPrice]);

  const handlePriceSave = useCallback(() => {
    const newPrice = parseFloat(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0 && onUpdatePrice) {
      onUpdatePrice(index, newPrice);
    }
    setIsEditingPrice(false);
  }, [tempPrice, index, onUpdatePrice]);

  const handlePriceBlur = useCallback(() => {
    // حفظ تلقائي عند الخروج من الحقل
    handlePriceSave();
  }, [handlePriceSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceSave();
    } else if (e.key === 'Escape') {
      setIsEditingPrice(false);
      setTempPrice('');
    }
  }, [handlePriceSave]);

  const handleQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity > 0) {
      onUpdateQuantity(index, newQuantity);
    }
  }, [index, onUpdateQuantity]);

  // === أنواع البيع المتقدمة ===

  // التحقق من أنواع البيع المتاحة للمنتج
  const availableSellingUnits = useMemo(() =>
    getAvailableSellingUnits(item.product), [item.product]);

  const hasAdvancedSellingOptions = availableSellingUnits.length > 1;

  // نوع البيع الحالي (القطعة افتراضي)
  const currentSellingUnit: SellingUnit = item.sellingUnit || 'piece';

  // دالة تغيير نوع وحدة البيع
  const handleSellingUnitChange = useCallback((newUnit: SellingUnit) => {
    if (onUpdateSellingUnit) {
      onUpdateSellingUnit(index, newUnit);
    }
  }, [index, onUpdateSellingUnit]);

  // دالة تغيير الوزن
  const handleWeightChange = useCallback((newWeight: number) => {
    if (onUpdateWeight) {
      onUpdateWeight(index, newWeight);
    }
  }, [index, onUpdateWeight]);

  // دالة تغيير عدد الصناديق
  const handleBoxCountChange = useCallback((newCount: number) => {
    if (onUpdateBoxCount) {
      onUpdateBoxCount(index, newCount);
    }
  }, [index, onUpdateBoxCount]);

  // دالة تغيير الطول
  const handleLengthChange = useCallback((newLength: number) => {
    if (onUpdateLength) {
      onUpdateLength(index, newLength);
    }
  }, [index, onUpdateLength]);

  // === دوال الدفعات والأرقام التسلسلية ===

  // دالة تغيير الدفعة
  const handleBatchChange = useCallback((batchId: string, batchNumber: string) => {
    if (onUpdateBatch) {
      onUpdateBatch(index, batchId, batchNumber);
    }
  }, [index, onUpdateBatch]);

  // دالة تغيير الأرقام التسلسلية - ⚡ محدثة لدعم serialIds
  const handleSerialsChange = useCallback((serials: string[], serialIds?: string[]) => {
    if (onUpdateSerialNumbers) {
      onUpdateSerialNumbers(index, serials, serialIds);
    }
  }, [index, onUpdateSerialNumbers]);

  // التحقق من متطلبات الدفعات والأرقام التسلسلية
  // ⚡ محدث: يدعم الجلب المحلي إذا توفر organizationId
  const requiresBatch = item.product.track_batches && (availableBatches.length > 0 || !!organizationId);
  const requiresSerial = item.product.track_serial_numbers;
  const hasExpiryWarning = item.expiryDate && (() => {
    const daysLeft = Math.ceil((new Date(item.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 30;
  })();

  // حساب السعر النهائي بناءً على نوع البيع
  const calculatedTotal = useMemo(() => {
    switch (currentSellingUnit) {
      case 'weight':
        if (item.weight && item.pricePerWeightUnit) {
          return item.weight * item.pricePerWeightUnit;
        }
        if (item.weight && item.product.price_per_weight_unit) {
          return item.weight * item.product.price_per_weight_unit;
        }
        break;
      case 'box':
        if (item.boxCount && item.boxPrice) {
          return item.boxCount * item.boxPrice;
        }
        if (item.boxCount && item.product.box_price) {
          return item.boxCount * item.product.box_price;
        }
        break;
      case 'meter':
        if (item.length && item.pricePerMeter) {
          return item.length * item.pricePerMeter;
        }
        if (item.length && item.product.price_per_meter) {
          return item.length * item.product.price_per_meter;
        }
        break;
      default:
        // piece - السعر العادي
        return currentPrice * item.quantity;
    }
    return currentPrice * item.quantity;
  }, [currentSellingUnit, item, currentPrice]);

  // أيقونة نوع البيع
  const getSellingUnitIcon = () => {
    switch (currentSellingUnit) {
      case 'weight': return <Scale className="w-3 h-3" />;
      case 'box': return <Box className="w-3 h-3" />;
      case 'meter': return <Ruler className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  return (
    <div className={cn(
      "group relative border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm p-3",
      isReturn
        ? "border-r-2 border-r-amber-500 bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/50"
        : "border-r-2 border-r-primary bg-card border-border/40"
    )}>
        <div className="flex items-start gap-3">
          {/* Product Image - Simplified */}
          {/* ⚡ إضافة دعم thumbnail_base64 للعمل Offline */}
          {(() => {
            const imageSrc = item.variantImage || 
              (item.product as any).thumbnail_base64 || 
              item.product.thumbnail_image || 
              item.product.thumbnailImage || 
              (item.product.images && item.product.images[0]);
            return (
              <div className="relative w-14 h-14 flex-shrink-0 bg-muted rounded-lg overflow-hidden border border-border/50">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={cn(
                  "w-full h-full flex items-center justify-center",
                  imageSrc ? "hidden" : ""
                )}>
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            );
          })()}

          {/* Product Details - Simplified */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header with name and remove button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-tight line-clamp-1 text-foreground">
                  {String(item.product.name || '')}
                </h4>
                {/* Variants - Simplified */}
                {(item.colorName || item.sizeName) && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {item.colorName && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 border border-border/50">
                        {item.colorCode && (
                          <div
                            className="w-2.5 h-2.5 rounded-full border border-border"
                            style={{ backgroundColor: item.colorCode }}
                          />
                        )}
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {String(item.colorName || '')}
                        </span>
                      </div>
                    )}
                    {item.sizeName && (
                      <span className="text-[10px] bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                        {String(item.sizeName || '')}
                      </span>
                    )}
                  </div>
                )}

                {/* محدد نوع البيع (جملة/تجزئة) */}
                {hasWholesaleOptions && onUpdateSaleType && !isReturn && (
                  <div className="mt-1.5">
                    <SaleTypeSelector
                      product={item.product}
                      quantity={item.quantity}
                      currentSaleType={currentSaleType}
                      onSaleTypeChange={handleSaleTypeChange}
                      size="sm"
                      showDetails={false}
                    />
                  </div>
                )}

                {/* عرض شارة نوع البيع إذا كان جملة ولا يوجد محدد */}
                {!hasWholesaleOptions && item.isWholesale && (
                  <div className="mt-1.5">
                    <SaleTypeBadge saleType={currentSaleType} size="sm" />
                  </div>
                )}

                {/* عرض التوفير إذا كان سعر الجملة أقل */}
                {item.isWholesale && originalPrice > currentPrice && (
                  <span className="inline-block mt-1 text-[10px] text-green-600 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded">
                    توفير {((originalPrice - currentPrice) / originalPrice * 100).toFixed(0)}%
                  </span>
                )}

                {/* محدد نوع وحدة البيع (وزن/علبة/متر) */}
                {hasAdvancedSellingOptions && onUpdateSellingUnit && !isReturn && (
                  <div className="mt-1.5">
                    <SellingUnitSelector
                      product={item.product}
                      value={currentSellingUnit}
                      onChange={handleSellingUnitChange}
                      compact
                    />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-7 w-7 p-0 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex-shrink-0 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* === مكونات إدخال أنواع البيع المتقدمة === */}
            {currentSellingUnit === 'weight' && item.product.sell_by_weight && onUpdateWeight && (
              <WeightInput
                value={item.weight || 1}
                onChange={handleWeightChange}
                weightUnit={item.weightUnit || item.product.weight_unit || 'kg'}
                pricePerUnit={item.pricePerWeightUnit || item.product.price_per_weight_unit || 0}
                minWeight={item.product.min_weight}
                maxWeight={item.product.max_weight}
                averageItemWeight={item.product.average_item_weight}
                className="mt-2"
              />
            )}

            {currentSellingUnit === 'box' && item.product.sell_by_box && onUpdateBoxCount && (
              <BoxCountInput
                value={item.boxCount || 1}
                onChange={handleBoxCountChange}
                unitsPerBox={item.unitsPerBox || item.product.units_per_box || 1}
                boxPrice={item.boxPrice || item.product.box_price || 0}
                unitPrice={item.product.price}
                className="mt-2"
              />
            )}

            {currentSellingUnit === 'meter' && item.product.sell_by_meter && onUpdateLength && (
              <MeterInput
                value={item.length || 1}
                onChange={handleLengthChange}
                pricePerMeter={item.pricePerMeter || item.product.price_per_meter || 0}
                rollLength={item.product.roll_length}
                className="mt-2"
              />
            )}

            {/* === مكونات الدفعات والأرقام التسلسلية === */}

            {/* محدد الدفعة - للمنتجات التي تتطلب تتبع الدفعات */}
            {/* ⚡ محدث: يدعم الجلب المحلي offline إذا توفر organizationId */}
            {requiresBatch && onUpdateBatch && !isReturn && (
              <BatchSelector
                productId={item.product.id}
                productName={item.product.name}
                organizationId={organizationId || ''}
                batches={availableBatches}
                selectedBatchId={item.batchId}
                requiredQuantity={item.quantity}
                colorId={item.colorId}
                sizeId={item.sizeId}
                unitType={currentSellingUnit}
                onBatchSelect={handleBatchChange}
                autoSelectFEFO={true}
                showExpiryWarning={true}
                className="mt-2"
              />
            )}

            {/* عرض معلومات الدفعة المحددة (للعرض فقط) */}
            {item.batchNumber && !requiresBatch && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                <Package className="w-3 h-3" />
                <span>دفعة: {item.batchNumber}</span>
                {item.expiryDate && (
                  <>
                    <Calendar className="w-3 h-3 mr-2" />
                    <span className={cn(hasExpiryWarning && 'text-orange-600 font-medium')}>
                      {new Date(item.expiryDate).toLocaleDateString('ar-DZ')}
                    </span>
                    {hasExpiryWarning && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">
                        قريب الانتهاء
                      </Badge>
                    )}
                  </>
                )}
              </div>
            )}

            {/* إدخال الأرقام التسلسلية - للمنتجات التي تتطلب تتبع الأرقام التسلسلية */}
            {/* ⚡ محدث: يدعم حجز الأرقام التسلسلية offline */}
            {requiresSerial && onUpdateSerialNumbers && !isReturn && organizationId && (
              <SerialNumberInput
                productId={item.product.id}
                productName={item.product.name}
                organizationId={organizationId}
                quantity={item.quantity}
                selectedSerials={item.serialNumbers || []}
                orderDraftId={orderDraftId || `draft-${Date.now()}`}
                onSerialsChange={handleSerialsChange}
                onSerialReserved={onSerialReserved}
                onSerialReleased={onSerialReleased}
                onConflict={onSerialConflict ? (serial, type) => onSerialConflict(serial, type as 'reserved' | 'sold') : undefined}
                requireSerial={item.product.require_serial_on_sale !== false}
                supportsIMEI={item.product.supports_imei}
                reservationMinutes={30}
                className="mt-2"
              />
            )}

            {/* عرض الأرقام التسلسلية المحددة (للعرض فقط في الإرجاع) */}
            {isReturn && item.serialNumbers && item.serialNumbers.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  <span>الأرقام التسلسلية:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.serialNumbers.map((serial, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] font-mono">
                      {serial}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* تحذير إذا كانت الأرقام التسلسلية مطلوبة ولم تُدخل */}
            {requiresSerial && !isReturn && (!item.serialNumbers || item.serialNumbers.length < item.quantity) && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  يجب إدخال {item.quantity - (item.serialNumbers?.length || 0)} رقم تسلسلي
                </span>
              </div>
            )}

            {/* Bottom Row: Quantity & Price */}
            <div className="flex items-center justify-between gap-2">
              {/* Quantity Controls - فقط للبيع بالقطعة */}
              {currentSellingUnit === 'piece' && (
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/50 border border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuantityChange(Math.max(1, item.quantity - 1))}
                    className="h-7 w-7 p-0 rounded hover:bg-background"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value) || 1;
                      handleQuantityChange(newQuantity);
                    }}
                    className="w-10 h-7 text-center text-xs font-bold border-0 bg-background rounded p-0"
                    min="1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuantityChange(item.quantity + 1)}
                    className="h-7 w-7 p-0 rounded hover:bg-background"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* عرض نوع البيع للأنواع غير القطعة */}
              {currentSellingUnit !== 'piece' && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
                  {getSellingUnitIcon()}
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentSellingUnit === 'weight' && item.weight && (
                      <>{item.weight} {getWeightUnitLabel(item.weightUnit || item.product.weight_unit || 'kg')}</>
                    )}
                    {currentSellingUnit === 'box' && item.boxCount && (
                      <>{item.boxCount} كرتون</>
                    )}
                    {currentSellingUnit === 'meter' && item.length && (
                      <>{item.length} متر</>
                    )}
                  </span>
                </div>
              )}

              {/* Price - Moved here */}
              {onUpdatePrice && (
                <div className="flex-1 max-w-[140px]">
                  {isEditingPrice ? (
                    <div className="bg-background border border-primary rounded-md p-1">
                      <Input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onBlur={handlePriceBlur}
                        onKeyDown={handleKeyDown}
                        className="h-7 w-full text-xs font-semibold rounded border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        min="0"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      className={cn(
                        "group/price flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all hover:scale-105 active:scale-95 w-full",
                        isPriceModified
                          ? "text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/60"
                          : "text-primary bg-primary/10 border border-primary/20 hover:bg-primary/15"
                      )}
                      onClick={handlePriceEdit}
                      title="انقر لتعديل السعر"
                    >
                      <Edit3 className="h-3 w-3 transition-transform group-hover/price:rotate-12" />
                      <span className="text-sm font-bold">
                        {calculatedTotal.toLocaleString()}
                      </span>
                      {isPriceModified && <span className="text-amber-600 dark:text-amber-400 font-bold">*</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default React.memo(CartItemComponent);
