import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Edit3,
  RefreshCw,
  Layers,
  Package,
  History,
  Zap,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import InventoryLogSheet from './components/InventoryLogSheet';
import { useInventoryVariantDetails } from '@/hooks/useInventoryVariantDetails';
import { InventoryServiceError } from '@/services/InventoryService';

interface ProductInventoryDetailsProps {
  productId: string;
  onClose?: () => void;
  showInModal?: boolean;
  canEdit?: boolean;
}

interface VariantRowData {
  id: string;
  label: string;
  subtitle?: string;
  quantity: number;
  stockStatus: string;
  type: 'variant' | 'size';
  variantId: string | null;
  editable: boolean;
  parentId?: string;
  colorCode?: string | null;
  barcode?: string | null;
  price?: number;
}

type BulkOperation = 'set' | 'increase' | 'decrease';

interface InventoryLogVisualEntry {
  variant_name?: string;
  quantity_change: number;
  previous_stock: number | string;
  new_stock: number | string;
  notes?: string | null;
  created_at: string;
  created_by_name?: string;
}

const statusConfig = {
  'in-stock': { 
    label: 'متوفر', 
    class: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
    dot: 'bg-emerald-500'
  },
  'low-stock': { 
    label: 'منخفض', 
    class: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  'out-of-stock': { 
    label: 'نفذ', 
    class: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400',
    dot: 'bg-rose-500'
  },
  'reorder-needed': { 
    label: 'يحتاج طلب', 
    class: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400',
    dot: 'bg-sky-500'
  },
  'unknown': { 
    label: 'غير محدد', 
    class: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400',
    dot: 'bg-slate-500'
  }
};

const ProductInventoryDetails: React.FC<ProductInventoryDetailsProps> = ({
  productId,
  onClose,
  showInModal = false,
  canEdit = true,
}) => {
  const {
    details,
    variants,
    isLoading,
    isValidating,
    error,
    refresh,
    updateVariant,
    applyBulkUpdate,
    syncInventory,
    logEntries,
    isLogLoading,
    loadLog,
    refreshLog,
  } = useInventoryVariantDetails(productId);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<{ row: VariantRowData; value: string } | null>(null);
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rows = useMemo<VariantRowData[]>(() => {
    if (!details) return [];
    const list: VariantRowData[] = [];

    variants.forEach((variant) => {
      const baseRow: VariantRowData = {
        id: variant.id,
        label: variant.colorName || details.productName,
        subtitle: variant.type === 'simple' ? undefined : details.productName,
        quantity: variant.quantity,
        stockStatus: variant.stockStatus,
        type: 'variant',
        variantId: variant.variantId,
        editable: canEdit && variant.type !== 'color_with_sizes',
        colorCode: variant.colorCode ?? null,
        barcode: variant.barcode ?? null,
        price: variant.price,
      };

      list.push(baseRow);

      if (variant.type === 'color_with_sizes') {
        variant.sizes.forEach((size) => {
          list.push({
            id: size.id,
            parentId: variant.id,
            label: size.sizeName,
            subtitle: variant.colorName ?? undefined,
            quantity: size.quantity,
            stockStatus: size.stockStatus,
            type: 'size',
            variantId: size.sizeId,
            editable: canEdit,
            barcode: size.barcode ?? null,
            price: size.price,
          });
        });
      }
    });

    return list;
  }, [variants, details, canEdit]);

  const rowMap = useMemo(() => {
    return rows.reduce<Map<string, VariantRowData>>((acc, row) => {
      acc.set(row.id, row);
      return acc;
    }, new Map());
  }, [rows]);

  const handleSelectRow = useCallback((row: VariantRowData, checked: boolean) => {
    if (!row.editable) return;
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(row.id);
      } else {
        next.delete(row.id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedRowIds(new Set());
      return;
    }
    const selectable = rows.filter((row) => row.editable).map((row) => row.id);
    setSelectedRowIds(new Set(selectable));
  }, [rows]);

  const openEditDialog = useCallback((row: VariantRowData) => {
    if (!row.editable) return;
    setEditDialog({ row, value: row.quantity.toString() });
  }, []);

  const handleEditSubmit = useCallback(async () => {
    if (!editDialog || !productId) return;
    const { row, value } = editDialog;
    if (!row.variantId) {
      toast.error('لا يمكن تحديد معرف المتغير للتعديل');
      return;
    }
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('الرجاء إدخال كمية صحيحة');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateVariant({
        variantId: row.variantId,
        newQuantity: parsed,
        operationType: 'manual',
      });
      toast.success('تم تحديث المخزون بنجاح');
      setEditDialog(null);
    } catch (err) {
      const message = err instanceof InventoryServiceError ? err.message : 'حدث خطأ أثناء التحديث';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [editDialog, productId, updateVariant]);

  const handleBulkSubmit = useCallback(
    async (operation: BulkOperation, value: number) => {
      if (value < 0) {
        toast.error('القيمة يجب أن تكون موجبة');
        return;
      }

      const updates = Array.from(selectedRowIds)
        .map((id) => rowMap.get(id))
        .filter((row): row is VariantRowData => Boolean(row && row.variantId));

      if (!updates.length) {
        toast.error('لم يتم اختيار أي عناصر صالحة للتعديل');
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = updates.map((row) => {
          const current = row.quantity;
          let nextQuantity = current;
          switch (operation) {
            case 'set':
              nextQuantity = value;
              break;
            case 'increase':
              nextQuantity = current + value;
              break;
            case 'decrease':
              nextQuantity = Math.max(0, current - value);
              break;
          }

          const note =
            operation === 'set'
              ? `تعيين الكمية إلى ${nextQuantity}`
              : operation === 'increase'
                ? `زيادة الكمية بمقدار ${value}`
                : `تخفيض الكمية بمقدار ${value}`;

          return {
            variantId: row.variantId,
            newQuantity: nextQuantity,
            operationType: operation === 'set' ? 'manual' : 'adjustment',
            notes: note,
          };
        });

        await applyBulkUpdate(payload);
        toast.success('تم تطبيق التعديلات بنجاح');
        setSelectedRowIds(new Set());
        setBulkDialogOpen(false);
      } catch (err) {
        const message = err instanceof InventoryServiceError ? err.message : 'حدث خطأ أثناء التعديل المجمع';
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [rowMap, selectedRowIds, applyBulkUpdate]
  );

  const handleSyncInventory = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await syncInventory();
      toast.success('تمت مزامنة المخزون بنجاح');
    } catch (err) {
      const message = err instanceof InventoryServiceError ? err.message : 'فشلت عملية المزامنة';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [syncInventory]);

  const openLog = useCallback(() => {
    loadLog();
    setLogSheetOpen(true);
  }, [loadLog]);

  const logData = useMemo<InventoryLogVisualEntry[]>(() => {
    if (!logEntries) return [];
    return logEntries.map((entry) => {
      const variant = variants.find((item) => item.variantId === entry.variant_id || item.id === entry.variant_id);
      const size = variants
        .flatMap((item) => item.sizes)
        .find((sizeItem) => sizeItem.sizeId === entry.size_id || sizeItem.id === entry.size_id);

      return {
        variant_name: size ? `${size.sizeName} · ${variant?.colorName ?? variant?.variantId ?? ''}` : variant?.colorName ?? variant?.variantId ?? details?.productName,
        quantity_change: entry.quantity_change,
        previous_stock: entry.previous_quantity ?? '—',
        new_stock: entry.new_quantity ?? '—',
        notes: entry.notes,
        created_at: entry.updated_at,
        created_by_name: entry.updated_by ?? undefined,
      };
    });
  }, [logEntries, variants, details]);

  const RowItem = React.memo(function RowItem({
    row,
    isSelected,
    onToggleSelect,
    onEdit,
    isExpanded,
    onToggleExpand,
  }: {
    row: VariantRowData;
    isSelected: boolean;
    onToggleSelect: (row: VariantRowData, checked: boolean) => void;
    onEdit: (row: VariantRowData) => void;
    isExpanded: boolean;
    onToggleExpand: (rowId: string) => void;
  }) {
    return (
      <TableRow
        className={cn(
          'group hover:bg-muted/30 transition-colors sm:cursor-default cursor-pointer',
          row.type === 'size' && 'bg-muted/20'
        )}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('input') || target.closest('label')) return;
          if (window.matchMedia('(max-width: 639px)').matches) {
            onToggleExpand(row.id);
          }
        }}
      >
        <TableCell className="pl-4">
          <Checkbox
            disabled={!row.editable}
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect(row, Boolean(checked))}
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            {row.colorCode && (
              <div
                className="h-5 w-5 rounded-md border-2 border-background shadow-sm flex-shrink-0"
                style={{ backgroundColor: row.colorCode }}
              />
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{row.label}</p>
              {row.subtitle && (
                <p className="text-xs text-muted-foreground truncate">{row.subtitle}</p>
              )}
              {isExpanded && (
                <div className="mt-2 sm:hidden space-y-2 rounded-md border p-2 bg-background/60">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">الباركود</span>
                    <code className="text-[10px] leading-4 text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      {row.barcode || '—'}
                    </code>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">الكمية</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{row.quantity.toLocaleString()}</span>
                      {row.price && (
                        <span className="text-[11px] text-muted-foreground">{row.price.toLocaleString()} د.ج</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">الحالة</span>
                    <StatusBadge status={row.stockStatus} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">إجراء</span>
                    {row.editable ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => onEdit(row)}
                        aria-label={`تعديل ${row.label}`}
                      >
                        تعديل
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[11px] bg-muted/50">تجميعي</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            {row.barcode || '—'}
          </code>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-semibold text-base">{row.quantity.toLocaleString()}</span>
            {row.price && (
              <span className="text-xs text-muted-foreground">
                {row.price.toLocaleString()} د.ج
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <StatusBadge status={row.stockStatus} />
        </TableCell>
        <TableCell className="text-center">
          {row.editable ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit(row)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          ) : (
            <Badge variant="outline" className="text-xs bg-muted/50">
              تجميعي
            </Badge>
          )}
        </TableCell>
      </TableRow>
    );
  });

  const content = (
    <div className="flex flex-col h-full gap-4 md:gap-6">
      {error && (
        <Alert variant="destructive" className="border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950">
          <AlertDescription className="text-rose-800 dark:text-rose-200">{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">
              {details?.productName || 'تفاصيل المنتج'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              إدارة شاملة للمخزون والمتغيرات
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 md:h-10 md:w-10"
              onClick={() => refresh()} 
              disabled={isValidating || isSubmitting}
            >
              <RefreshCw className={cn('h-4 w-4', (isValidating || isSubmitting) && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Stats Cards - Mobile Optimized */}
        {details ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatsCard
              icon={Package}
              label="إجمالي المخزون"
              value={details.totalStockQuantity.toLocaleString()}
              gradient="from-emerald-500/10 to-emerald-600/5"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatsCard
              icon={Layers}
              label="المتغيرات"
              value={details.totalVariants}
              subtitle={`${details.lowStockVariants} منخفض`}
              gradient="from-amber-500/10 to-amber-600/5"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatsCard
              icon={TrendingUp}
              label="قيمة المخزون"
              value={`${details.totalStockValue.toLocaleString()}`}
              unit="د.ج"
              gradient="from-sky-500/10 to-sky-600/5"
              iconColor="text-sky-600 dark:text-sky-400"
            />
            <StatsCard
              icon={BarChart3}
              label="متوسط الشراء"
              value={`${details.averagePurchasePrice.toLocaleString()}`}
              unit="د.ج"
              gradient="from-purple-500/10 to-purple-600/5"
              iconColor="text-purple-600 dark:text-purple-400"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleSyncInventory} disabled={isSubmitting} className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">مزامنة المخزون</span>
          <span className="sm:hidden">مزامنة</span>
        </Button>
        <Button variant="outline" size="sm" onClick={openLog} className="gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">سجل العمليات</span>
          <span className="sm:hidden">السجل</span>
        </Button>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="variants" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full sm:w-auto justify-start">
          <TabsTrigger value="variants" className="flex-1 sm:flex-initial gap-2">
            <Box className="h-4 w-4" />
            المتغيرات
          </TabsTrigger>
          <TabsTrigger value="info" className="flex-1 sm:flex-initial gap-2">
            <BarChart3 className="h-4 w-4" />
            المعلومات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variants" className="flex-1 flex flex-col min-h-0 gap-3 mt-4">
          {/* Selection Actions */}
          {selectedRowIds.size > 0 && (
            <div className="flex items-center justify-between gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm font-medium">
                <span className="text-primary">{selectedRowIds.size}</span> عنصر محدد
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedRowIds(new Set())}>
                  إلغاء
                </Button>
                <Button size="sm" onClick={() => setBulkDialogOpen(true)} disabled={isSubmitting}>
                  تعديل مجمع
                </Button>
              </div>
            </div>
          )}

          {/* Table Card */}
          <Card className="flex-1 min-h-0 flex flex-col border-muted/40">
            <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b">
                      <TableRow>
                        <TableHead className="w-12 pl-4">
                          <Checkbox
                            checked={rows.length > 0 && selectedRowIds.size === rows.filter((r) => r.editable).length}
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          />
                        </TableHead>
                        <TableHead className="min-w-[180px]">المتغير</TableHead>
                        <TableHead className="hidden md:table-cell">الباركود</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="hidden sm:table-cell">الحالة</TableHead>
                        <TableHead className="w-20 text-center">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow 
                          key={row.id} 
                          className={cn(
                            'group hover:bg-muted/30 transition-colors sm:cursor-default cursor-pointer',
                            row.type === 'size' && 'bg-muted/20'
                          )}
                          onClick={(e) => {
                            // تجاهل النقرات على عناصر التحكم
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('input') || target.closest('label')) return;
                            // هاتف فقط: بدّل التوسيع
                            if (window.matchMedia('(max-width: 639px)').matches) {
                              setExpandedRowId(prev => (prev === row.id ? null : row.id));
                            }
                          }}
                        >
                          <TableCell className="pl-4">
                            <Checkbox
                              disabled={!row.editable}
                              checked={selectedRowIds.has(row.id)}
                              onCheckedChange={(checked) => handleSelectRow(row, Boolean(checked))}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {row.colorCode && (
                                <div 
                                  className="h-5 w-5 rounded-md border-2 border-background shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: row.colorCode }}
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{row.label}</p>
                                {row.subtitle && (
                                  <p className="text-xs text-muted-foreground truncate">{row.subtitle}</p>
                                )}
                                {/* تفاصيل الهاتف تظهر عند التوسيع */}
                                {expandedRowId === row.id && (
                                  <div className="mt-2 sm:hidden space-y-2 rounded-md border p-2 bg-background/60">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-[11px] text-muted-foreground">الباركود</span>
                                      <code className="text-[10px] leading-4 text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                        {row.barcode || '—'}
                                      </code>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-[11px] text-muted-foreground">الكمية</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{row.quantity.toLocaleString()}</span>
                                        {row.price && (
                                          <span className="text-[11px] text-muted-foreground">{row.price.toLocaleString()} د.ج</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-[11px] text-muted-foreground">الحالة</span>
                                      <StatusBadge status={row.stockStatus} />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-[11px] text-muted-foreground">إجراء</span>
                                      {row.editable ? (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="h-8"
                                          onClick={() => openEditDialog(row)}
                                          aria-label={`تعديل ${row.label}`}
                                        >
                                          تعديل
                                        </Button>
                                      ) : (
                                        <Badge variant="outline" className="text-[11px] bg-muted/50">تجميعي</Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                              {row.barcode || '—'}
                            </code>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-semibold text-base">{row.quantity.toLocaleString()}</span>
                              {row.price && (
                                <span className="text-xs text-muted-foreground">
                                  {row.price.toLocaleString()} د.ج
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <StatusBadge status={row.stockStatus} />
                          </TableCell>
                          <TableCell className="text-center">
                            {row.editable ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => openEditDialog(row)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-muted/50">
                                تجميعي
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Status Summary */}
          <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
            {Object.entries(
              rows.reduce((acc, row) => {
                acc[row.stockStatus] = (acc[row.stockStatus] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([status, count]) => (
              <div key={status} className="flex-shrink-0">
                <StatusBadge status={status} count={count} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          {details ? (
            <Card className="border-muted/40">
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
                <InfoRow label="الرمز" value={details.productSku || '—'} />
                <InfoRow label="الباركود" value={details.productBarcode || '—'} />
                <InfoRow label="حد الطلب الأدنى" value={details.minStockLevel} />
                <InfoRow label="كمية إعادة الطلب" value={details.reorderQuantity} />
                <InfoRow 
                  label="آخر تحديث" 
                  value={details.lastInventoryUpdate ? new Date(details.lastInventoryUpdate).toLocaleDateString('ar-DZ') : 'غير متوفر'} 
                />
                <InfoRow label="حالة المخزون">
                  <StatusBadge status={details.stockStatus} />
                </InfoRow>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QuantityEditDialog
        open={Boolean(editDialog)}
        value={editDialog?.value ?? ''}
        onValueChange={(value) => setEditDialog((state) => (state ? { ...state, value } : state))}
        onClose={() => setEditDialog(null)}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
        title={editDialog?.row.label ?? 'تعديل الكمية'}
      />

      <BulkUpdateDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedRows={Array.from(selectedRowIds).map((id) => rowMap.get(id)).filter((row): row is VariantRowData => Boolean(row))}
        onSubmit={handleBulkSubmit}
        isSubmitting={isSubmitting}
      />

      <InventoryLogSheet
        open={logSheetOpen}
        onOpenChange={setLogSheetOpen}
        isLoadingLog={isLogLoading}
        inventoryLog={logData}
        productId={productId}
        loadInventoryLog={() => {
          loadLog();
          refreshLog();
        }}
      />
    </div>
  );

  if (showInModal) {
    return (
      <Dialog open onOpenChange={() => onClose?.()}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl">تفاصيل المخزون</DialogTitle>
            <DialogDescription>إدارة متقدمة للمخزون والمتغيرات</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 py-4">{content}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return <div className="h-full">{content}</div>;
};

export default ProductInventoryDetails;

// Utility Components
interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  unit?: string;
  gradient: string;
  iconColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon: Icon, label, value, subtitle, unit, gradient, iconColor }) => (
  <Card className={cn('border-muted/40 bg-gradient-to-br', gradient)}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium mb-1 truncate">{label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl md:text-2xl font-bold truncate">{value}</p>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-2 rounded-lg bg-background/50', iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge: React.FC<{ status: string; count?: number }> = ({ status, count }) => {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium border', config.class)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
      {count !== undefined && <span className="opacity-60">({count})</span>}
    </Badge>
  );
};

interface InfoRowProps {
  label: string;
  value?: string | number;
  children?: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, children }) => (
  <div className="space-y-1.5">
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
    {children || <p className="text-sm font-medium">{value}</p>}
  </div>
);

// Dialogs
interface QuantityEditDialogProps {
  open: boolean;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  title: string;
}

const QuantityEditDialog: React.FC<QuantityEditDialogProps> = ({
  open,
  value,
  onValueChange,
  onSubmit,
  onClose,
  isSubmitting,
  title,
}) => (
  <Dialog open={open} onOpenChange={(state) => (!state ? onClose() : null)}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-primary" />
          {title}
        </DialogTitle>
        <DialogDescription>أدخل الكمية الجديدة للمخزون</DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="text-lg font-semibold text-center h-14"
          autoFocus
        />
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: VariantRowData[];
  onSubmit: (operation: BulkOperation, value: number) => void;
  isSubmitting: boolean;
}

const BulkUpdateDialog: React.FC<BulkUpdateDialogProps> = ({ 
  open, 
  onOpenChange, 
  selectedRows, 
  onSubmit, 
  isSubmitting 
}) => {
  const [operation, setOperation] = useState<BulkOperation>('set');
  const [value, setValue] = useState('0');

  const handleSubmit = () => {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('الرجاء إدخال قيمة صحيحة');
      return;
    }
    onSubmit(operation, parsed);
  };

  const operations = [
    { value: 'set' as const, label: 'تعيين', icon: '=' },
    { value: 'increase' as const, label: 'زيادة', icon: '+' },
    { value: 'decrease' as const, label: 'تخفيض', icon: '-' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل مجمع للمخزون</DialogTitle>
          <DialogDescription>
            تطبيق عملية على {selectedRows.length} عنصر محدد
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">نوع العملية</label>
            <div className="grid grid-cols-3 gap-2">
              {operations.map((op) => (
                <Button
                  key={op.value}
                  type="button"
                  variant={operation === op.value ? 'default' : 'outline'}
                  onClick={() => setOperation(op.value)}
                  className="gap-2"
                >
                  <span className="text-lg font-bold">{op.icon}</span>
                  {op.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">القيمة</label>
            <Input 
              type="number" 
              min={0} 
              value={value} 
              onChange={(e) => setValue(e.target.value)}
              className="text-lg font-semibold text-center h-12"
            />
          </div>

          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">العناصر المحددة:</p>
            <div className="space-y-1 max-h-32 overflow-auto">
              {selectedRows.map((row) => (
                <div key={row.id} className="flex items-center gap-2 text-sm">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{row.label}</span>
                  {row.subtitle && <span className="text-muted-foreground">· {row.subtitle}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedRows.length === 0}>
            {isSubmitting ? 'جارٍ التطبيق...' : 'تنفيذ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
