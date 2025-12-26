/**
 * 🏭 Modern Advanced Inventory Component
 * واجهة المخزون المتقدمة - تدعم جميع أنواع البيع والمتغيرات
 *
 * يدعم:
 * - البيع بالقطعة (piece)
 * - البيع بالوزن (weight)
 * - البيع بالكرتون (box)
 * - البيع بالمتر (meter)
 * - الألوان والمقاسات
 * - العمل أوفلاين وأونلاين
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { resolveProductImageSrc } from '@/lib/products/productImageResolver';
import {
  Package,
  Scale,
  Box,
  Ruler,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp,
  Palette,
  Search,
  Filter,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import StockUpdateAdvanced, { type StockUpdateParams } from './StockUpdateAdvanced';
import type { AdvancedInventoryProduct, SellingUnitType, StockStatus } from './types';

// =====================================================
// الأنواع
// =====================================================

interface InventoryStats {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
  weight_products?: number;
  box_products?: number;
  meter_products?: number;
}

interface InventoryFilters {
  search: string;
  stockFilter: 'all' | StockStatus;
  sellingType: 'all' | SellingUnitType;
  page: number;
  pageSize: number;
}

interface InventoryModernAdvancedProps {
  products: AdvancedInventoryProduct[];
  stats: InventoryStats | null;
  loading: boolean;
  filters: InventoryFilters;
  total: number;
  filtered: number;
  totalPages: number;
  onUpdateFilters: (filters: Partial<InventoryFilters>) => void;
  onGoToPage: (page: number) => void;
  onRefresh: () => void;
  onUpdateStock: (params: StockUpdateParams) => Promise<boolean>;
  isUpdating?: boolean;
}

// =====================================================
// المكون الرئيسي
// =====================================================

export default function InventoryModernAdvanced({
  products,
  stats,
  loading,
  filters,
  total,
  filtered,
  totalPages,
  onUpdateFilters,
  onGoToPage,
  onRefresh,
  onUpdateStock,
  isUpdating = false,
}: InventoryModernAdvancedProps) {
  const { isOnline } = useNetworkStatus();
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedItem, setSelectedItem] = useState<AdvancedInventoryProduct | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // اكتشاف الشاشات الصغيرة
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // البحث مع debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onUpdateFilters({ search: searchTerm, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, filters.search, onUpdateFilters]);

  // توسيع/طي المنتج
  const toggleExpand = useCallback((productId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  // فتح نافذة تحديث المخزون
  const handleItemClick = useCallback((item: AdvancedInventoryProduct) => {
    setSelectedItem(item);
    setShowUpdateDialog(true);
  }, []);

  // إكمال التحديث
  const handleUpdateComplete = useCallback(() => {
    setShowUpdateDialog(false);
    setSelectedItem(null);
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="space-y-6">
      {/* إحصائيات المخزون */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading && !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 sm:p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label="إجمالي المنتجات"
              value={stats?.total_products || 0}
              icon={Package}
              variant="default"
            />
            <StatCard
              label="متوفر"
              value={stats?.in_stock || 0}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              label="منخفض"
              value={stats?.low_stock || 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <StatCard
              label="نفذ"
              value={stats?.out_of_stock || 0}
              icon={XCircle}
              variant="danger"
            />
          </>
        )}
      </div>

      {/* إحصائيات أنواع البيع */}
      {stats && (stats.weight_products || stats.box_products || stats.meter_products) && (
        <div className="grid grid-cols-3 gap-3">
          {stats.weight_products && stats.weight_products > 0 && (
            <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  {stats.weight_products} منتج بالوزن
                </span>
              </div>
            </Card>
          )}
          {stats.box_products && stats.box_products > 0 && (
            <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {stats.box_products} منتج بالكرتون
                </span>
              </div>
            </Card>
          )}
          {stats.meter_products && stats.meter_products > 0 && (
            <Card className="p-3 bg-purple-50 dark:bg-purple-950/30 border-purple-200">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  {stats.meter_products} منتج بالمتر
                </span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* البحث والفلاتر */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* شريط البحث */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن منتج بالاسم أو الباركود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* الفلاتر */}
          <div className="flex flex-wrap gap-2">
            {/* فلتر حالة المخزون */}
            <div className="flex gap-1 flex-wrap">
              <FilterButton
                active={filters.stockFilter === 'all'}
                onClick={() => onUpdateFilters({ stockFilter: 'all', page: 1 })}
              >
                الكل
              </FilterButton>
              <FilterButton
                active={filters.stockFilter === 'in-stock'}
                onClick={() => onUpdateFilters({ stockFilter: 'in-stock', page: 1 })}
                variant="success"
              >
                متوفر
              </FilterButton>
              <FilterButton
                active={filters.stockFilter === 'low-stock'}
                onClick={() => onUpdateFilters({ stockFilter: 'low-stock', page: 1 })}
                variant="warning"
              >
                منخفض
              </FilterButton>
              <FilterButton
                active={filters.stockFilter === 'out-of-stock'}
                onClick={() => onUpdateFilters({ stockFilter: 'out-of-stock', page: 1 })}
                variant="danger"
              >
                نفذ
              </FilterButton>
            </div>

            {/* فلتر نوع البيع */}
            <Select
              value={filters.sellingType}
              onValueChange={(value) => onUpdateFilters({ sellingType: value as any, page: 1 })}
            >
              <SelectTrigger className="w-[140px] h-9">
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="نوع البيع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="piece">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    قطعة
                  </div>
                </SelectItem>
                <SelectItem value="weight">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    وزن
                  </div>
                </SelectItem>
                <SelectItem value="box">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    كرتون
                  </div>
                </SelectItem>
                <SelectItem value="meter">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    متر
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* حالة الاتصال */}
            {!isOnline && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <WifiOff className="h-3 w-3 ml-1" />
                أوفلاين
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* قائمة المنتجات */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-20 w-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : products.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">لا توجد منتجات</p>
              <p className="text-sm">جرب تغيير معايير البحث أو الفلاتر</p>
            </div>
          </Card>
        ) : (
          <>
            {products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpand={() => toggleExpand(item.id)}
                onEdit={() => handleItemClick(item)}
                isMobile={isMobile}
              />
            ))}

            {/* الترقيم */}
            {totalPages > 1 && (
              <Card className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    صفحة {filters.page} من {totalPages} ({filtered} نتيجة من {total})
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onGoToPage(filters.page - 1)}
                      disabled={loading || filters.page === 1}
                      className="flex-1 sm:flex-initial"
                    >
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onGoToPage(filters.page + 1)}
                      disabled={loading || filters.page >= totalPages}
                      className="flex-1 sm:flex-initial"
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* نافذة تحديث المخزون */}
      {selectedItem && (
        <StockUpdateAdvanced
          item={selectedItem}
          open={showUpdateDialog}
          onClose={() => setShowUpdateDialog(false)}
          onSuccess={handleUpdateComplete}
          onUpdateStock={onUpdateStock}
          isUpdating={isUpdating}
          isOnline={isOnline}
        />
      )}
    </div>
  );
}

// =====================================================
// مكونات فرعية
// =====================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: typeof Package;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const colors = {
    default: 'border-l-slate-400',
    success: 'border-l-green-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
  };

  const iconColors = {
    default: 'text-slate-500',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
  };

  return (
    <Card className={cn('p-3 sm:p-4 lg:p-6 border-l-4 transition-all hover:shadow-md', colors[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{value.toLocaleString()}</p>
        </div>
        <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', iconColors[variant])} />
      </div>
    </Card>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

function FilterButton({ active, onClick, variant = 'default', children }: FilterButtonProps) {
  const colors = {
    default: active ? 'bg-slate-100 border-slate-300' : 'border-slate-200',
    success: active ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-200',
    warning: active ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200',
    danger: active ? 'bg-red-50 border-red-300 text-red-700' : 'border-slate-200',
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('transition-all text-xs sm:text-sm h-9', colors[variant])}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

interface ProductCardProps {
  item: AdvancedInventoryProduct;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  isMobile?: boolean;
}

function ProductCard({ item, isExpanded, onToggleExpand, onEdit, isMobile = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const statusColors = {
    'in-stock': 'bg-green-50 text-green-700 border-green-200',
    'low-stock': 'bg-amber-50 text-amber-700 border-amber-200',
    'out-of-stock': 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabels = {
    'in-stock': 'متوفر',
    'low-stock': 'منخفض',
    'out-of-stock': 'نفذ',
  };

  const stockStatus = (item.stock_status || 'in-stock') as StockStatus;

  // تحديد أيقونة نوع البيع
  const getSellingTypeInfo = () => {
    const types = [];
    if (item.sell_by_weight) types.push({ icon: Scale, label: 'وزن', color: 'text-emerald-600' });
    if (item.sell_by_box) types.push({ icon: Box, label: 'كرتون', color: 'text-blue-600' });
    if (item.sell_by_meter) types.push({ icon: Ruler, label: 'متر', color: 'text-purple-600' });
    return types;
  };

  const sellingTypes = getSellingTypeInfo();

  useEffect(() => {
    setImageError(false);
  }, [item.id]);

  return (
    <Card className="transition-all hover:shadow-lg border overflow-hidden">
      {/* المحتوى الرئيسي */}
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4">
          {/* صورة المنتج - ⚡ دعم thumbnail_base64 للعمل Offline */}
          <div className="flex-shrink-0 relative">
            {(() => {
              const imageSrc = resolveProductImageSrc(item as any);
              return imageSrc && !imageError ? (
              <img
                src={imageSrc}
                alt={item.name}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-cover border"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-primary/10 flex items-center justify-center border">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
            );
            })()}

            {/* أيقونات أنواع البيع */}
            {sellingTypes.length > 0 && (
              <div className="absolute -bottom-1 -left-1 flex gap-0.5">
                {sellingTypes.map((type, idx) => (
                  <div
                    key={idx}
                    className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center border"
                  >
                    <type.icon className={cn('h-3 w-3', type.color)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* معلومات المنتج */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate">
                  {item.name}
                </h3>
                {item.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn('text-xs flex-shrink-0', statusColors[stockStatus])}
              >
                {statusLabels[stockStatus]}
              </Badge>
            </div>

            {/* معلومات المخزون */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              {/* المخزون الأساسي */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                <Package className="h-3 w-3 text-slate-500" />
                <span className="font-bold">{item.stock_quantity}</span>
                <span className="text-muted-foreground">قطعة</span>
              </div>

              {/* مخزون الوزن */}
              {item.sell_by_weight && (
                <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded">
                  <Scale className="h-3 w-3 text-emerald-600" />
                  <span className="font-bold text-emerald-700">
                    {(item.available_weight || 0).toFixed(2)}
                  </span>
                  <span className="text-emerald-600">{item.weight_unit || 'kg'}</span>
                </div>
              )}

              {/* مخزون الكرتون */}
              {item.sell_by_box && (
                <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded">
                  <Box className="h-3 w-3 text-blue-600" />
                  <span className="font-bold text-blue-700">{item.available_boxes || 0}</span>
                  <span className="text-blue-600">كرتون</span>
                </div>
              )}

              {/* مخزون المتر */}
              {item.sell_by_meter && (
                <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/50 px-2 py-1 rounded">
                  <Ruler className="h-3 w-3 text-purple-600" />
                  <span className="font-bold text-purple-700">
                    {(item.available_length || 0).toFixed(2)}
                  </span>
                  <span className="text-purple-600">{item.meter_unit || 'm'}</span>
                </div>
              )}
            </div>

            {/* معلومات المتغيرات */}
            {item.has_variants && item.colors && item.colors.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Palette className="h-3 w-3 text-muted-foreground" />
                <div className="flex gap-1 flex-wrap">
                  {item.colors.slice(0, isMobile ? 3 : 5).map((color) => (
                    <div
                      key={color.id}
                      className="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded"
                    >
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: color.color_code }}
                      />
                      <span>{color.name}</span>
                      <span className="text-muted-foreground">({color.quantity})</span>
                    </div>
                  ))}
                  {item.colors.length > (isMobile ? 3 : 5) && (
                    <span className="text-xs text-muted-foreground px-1">
                      +{item.colors.length - (isMobile ? 3 : 5)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* الألوان والمقاسات المفصلة */}
      {item.has_variants && item.colors && item.colors.length > 0 && (
        <>
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                إخفاء التفاصيل
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                عرض الألوان والمقاسات ({item.colors.length} لون)
              </>
            )}
          </button>

          {isExpanded && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t space-y-3">
              {item.colors.map((color) => (
                <div key={color.id} className="bg-white dark:bg-slate-800 rounded-lg border p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: color.color_code }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{color.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {color.quantity} قطعة
                        {color.has_sizes && color.sizes && ` - ${color.sizes.length} مقاس`}
                      </div>
                    </div>
                  </div>

                  {/* المقاسات */}
                  {color.has_sizes && color.sizes && color.sizes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                      {color.sizes.map((size) => (
                        <div
                          key={size.id}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium border',
                            size.quantity === 0
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : size.quantity <= 5
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          )}
                        >
                          {size.name}: {size.quantity}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* أزرار الإجراءات */}
      <div className="px-4 py-3 border-t bg-white dark:bg-slate-900 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-9"
          onClick={onEdit}
        >
          <Edit className="ml-1 h-3.5 w-3.5" />
          تحديث المخزون
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-9"
          onClick={onToggleExpand}
        >
          <Eye className="ml-1 h-3.5 w-3.5" />
          {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
        </Button>
      </div>
    </Card>
  );
}
