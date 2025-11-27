/**
 * Modern Inventory Component - Clean & Professional
 * واجهة المخزون العصرية - نظيفة واحترافية
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useInventoryOptimized } from '@/hooks/useInventoryOptimized';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Package, Edit, Eye, BarChart3 } from 'lucide-react';
import StockUpdateModern from './StockUpdateModern';
import type { InventoryProduct } from '@/lib/api/inventory-optimized';

export default function InventoryModern() {
  const { 
    products, 
    stats, 
    loading, 
    filters, 
    updateFilters, 
    refresh, 
    total, 
    filtered, 
    totalPages,
    goToPage 
  } = useInventoryOptimized();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryProduct | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // اكتشاف الشاشات الصغيرة
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // Debounce search with useEffect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined && searchTerm !== filters.search) {
        updateFilters({ search: searchTerm, page: 1 });
      }
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, updateFilters, filters.search]);

  // Handle status filter
  const handleStatusFilter = (status: typeof selectedStatus) => {
    setSelectedStatus(status);
    updateFilters({ stockFilter: status, page: 1 });
  };

  const handleItemClick = (item: InventoryProduct) => {
    setSelectedItem(item);
    setShowUpdateDialog(true);
  };

  const handleUpdateComplete = () => {
    setShowUpdateDialog(false);
    setSelectedItem(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading && !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label="إجمالي المنتجات"
              value={Number(stats?.total_products || 0)}
              variant="default"
            />
            <StatCard
              label="متوفر"
              value={Number(stats?.in_stock || 0)}
              variant="success"
            />
            <StatCard
              label="منخفض"
              value={Number(stats?.low_stock || 0)}
              variant="warning"
            />
            <StatCard
              label="نفذ"
              value={Number(stats?.out_of_stock || 0)}
              variant="danger"
            />
          </>
        )}
      </div>

      {/* Search & Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <Input
              placeholder="ابحث عن منتج..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <FilterButton
              active={selectedStatus === 'all'}
              onClick={() => handleStatusFilter('all')}
            >
              الكل
            </FilterButton>
            <FilterButton
              active={selectedStatus === 'in-stock'}
              onClick={() => handleStatusFilter('in-stock')}
              variant="success"
            >
              متوفر
            </FilterButton>
            <FilterButton
              active={selectedStatus === 'low-stock'}
              onClick={() => handleStatusFilter('low-stock')}
              variant="warning"
            >
              منخفض
            </FilterButton>
            <FilterButton
              active={selectedStatus === 'out-of-stock'}
              onClick={() => handleStatusFilter('out-of-stock')}
              variant="danger"
            >
              نفذ
            </FilterButton>
          </div>
        </div>
      </Card>

      {/* Products List - Mobile First */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ))
        ) : products.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">لا توجد منتجات</p>
              <p className="text-sm">جرب تغيير معايير البحث</p>
            </div>
          </Card>
        ) : (
          <>
            {products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
                isMobile={isMobile}
              />
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    صفحة {filters.page || 1} من {totalPages} ({filtered} نتيجة)
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage((filters.page || 1) - 1)}
                      disabled={loading || (filters.page || 1) === 1}
                      className="flex-1 sm:flex-initial"
                    >
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage((filters.page || 1) + 1)}
                      disabled={loading || (filters.page || 1) >= totalPages}
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

      {/* Update Dialog */}
      {selectedItem && (
        <StockUpdateModern
          item={selectedItem}
          open={showUpdateDialog}
          onClose={() => setShowUpdateDialog(false)}
          onSuccess={handleUpdateComplete}
        />
      )}
    </div>
  );
}

// ==================== Sub Components ====================

interface StatCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  const colors = {
    default: 'border-l-slate-400',
    success: 'border-l-green-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
  };

  return (
    <Card className={cn('p-3 sm:p-4 lg:p-6 border-l-4 transition-all hover:shadow-md', colors[variant])}>
      <p className="text-xs sm:text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{value.toLocaleString()}</p>
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
  item: InventoryProduct;
  onClick: () => void;
  isMobile?: boolean;
}

function ProductCard({ item, onClick, isMobile = false }: ProductCardProps) {
  const [imageError, setImageError] = React.useState(false);

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

  const stockStatus = (item.stock_status || 'in-stock') as 'in-stock' | 'low-stock' | 'out-of-stock';

  // Reset error state when item changes
  React.useEffect(() => {
    setImageError(false);
  }, [item.id]);

  return (
    <Card
      className="p-3 sm:p-4 transition-all hover:shadow-lg border"
    >
      {/* Mobile Layout */}
      <div className="flex gap-3 sm:gap-4">
        {/* Product Image - ⚡ دعم thumbnail_base64 للعمل Offline */}
        <div className="flex-shrink-0">
          {(() => {
            const imageSrc = (item as any).thumbnail_base64 || item.thumbnail_image;
            return imageSrc && !imageError ? (
              <img
                src={imageSrc}
                alt={item.name}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-cover border"
                onError={() => {
                  console.log('🖼️ Image failed to load (offline?):', imageSrc?.slice(0, 50));
                  setImageError(true);
                }}
              />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-primary/10 flex items-center justify-center border">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
            );
          })()}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base sm:text-lg truncate">
                {item.name}
              </h3>
              {item.sku && (
                <p className="text-xs text-muted-foreground">{item.sku}</p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn('text-xs flex-shrink-0', statusColors[stockStatus])}
            >
              {statusLabels[stockStatus]}
            </Badge>
          </div>

          {/* Stock Info */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">الكمية:</span>
              <span className="font-bold text-primary">{item.stock_quantity || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">السعر:</span>
              <span className="font-semibold">{Number(item.price || 0).toLocaleString()} د.ج</span>
            </div>
          </div>

          {/* Variants Info */}
          {item.has_variants && (
            <div className="mt-2 flex gap-1.5 sm:gap-2 flex-wrap">
              {item.colors?.slice(0, isMobile ? 2 : 3).map((color) => (
                <div
                  key={color.id}
                  className="flex items-center gap-1 sm:gap-1.5 text-xs bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                >
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border"
                    style={{ backgroundColor: color.color_code }}
                  />
                  <span className="text-xs">{color.name}</span>
                  <span className="text-muted-foreground">({color.quantity})</span>
                </div>
              ))}
              {item.variant_count && item.variant_count > (isMobile ? 2 : 3) && (
                <span className="text-xs text-muted-foreground px-1.5 sm:px-2 py-0.5 sm:py-1">
                  +{item.variant_count - (isMobile ? 2 : 3)} أخرى
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* الأزرار - تظهر دائماً على الهاتف */}
      <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-9"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Edit className="ml-1 h-3.5 w-3.5" />
          تحديث المخزون
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-9"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Eye className="ml-1 h-3.5 w-3.5" />
          عرض التفاصيل
        </Button>
      </div>
    </Card>
  );
}

