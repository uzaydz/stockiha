import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInventoryVariants } from '@/hooks/useInventoryVariants';
import { 
  getVariantDisplayName, 
  getSizeDisplayName, 
  getStockStatusColor, 
  getStockStatusText,
  type ProductVariant,
  type ProductSize 
} from '@/lib/api/inventory-variants-api';
import {
  Package,
  Edit3,
  Eye,
  History,
  RefreshCw,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Palette,
  Ruler,
  DollarSign,
  Calendar,
  User,
  FileText,
  Loader2,
  Plus,
  Minus,
  Save,
  X,
  Info,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductInventoryDetailsProps {
  productId: string;
  onClose?: () => void;
  showInModal?: boolean;
}

const ProductInventoryDetails: React.FC<ProductInventoryDetailsProps> = ({
  productId,
  onClose,
  showInModal = false
}) => {
  const {
    inventoryDetails,
    inventoryLog,
    isLoading,
    isUpdating,
    isSyncing,
    isLoadingLog,
    error,
    updateError,
    editingVariant,
    changePreview,
    quickSummary,
    loadInventoryDetails,
    refreshInventoryDetails,
    loadInventoryLog,
    refreshLog,
    startEditingVariant,
    updateEditingQuantity,
    updateEditingNotes,
    previewChanges,
    cancelEditing,
    saveChanges,
    syncInventory,
    exportInventoryData,
    clearError,
    clearUpdateError
  } = useInventoryVariants({
    enableRealTimeUpdates: true,
    cacheResults: true
  });

  const [selectedTab, setSelectedTab] = useState('overview');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLogSheet, setShowLogSheet] = useState(false);

  // تحميل البيانات عند تحميل المكون
  useEffect(() => {
    if (productId) {
      loadInventoryDetails(productId);
    }
  }, [productId, loadInventoryDetails]);

  // مكون عرض حالة المخزون
  const StockStatusBadge: React.FC<{ status: string; quantity?: number }> = ({ status, quantity }) => {
    const colorClass = getStockStatusColor(status);
    const statusText = getStockStatusText(status);
    
    return (
      <Badge variant="outline" className={cn('text-xs font-medium', colorClass)}>
        <div className="flex items-center gap-1">
          {status === 'in-stock' && <CheckCircle className="w-3 h-3" />}
          {status === 'low-stock' && <AlertTriangle className="w-3 h-3" />}
          {status === 'out-of-stock' && <XCircle className="w-3 h-3" />}
          {status === 'reorder-needed' && <Clock className="w-3 h-3" />}
          <span>{statusText}</span>
          {quantity !== undefined && <span>({quantity})</span>}
        </div>
      </Badge>
    );
  };

  // مكون عرض المتغير الواحد
  const VariantCard: React.FC<{ 
    variant: ProductVariant; 
    productId: string;
    onEdit: (variantId?: string, currentQuantity?: number) => void;
  }> = ({ variant, productId, onEdit }) => {
    const isSimple = variant.type === 'simple';
    const isColorOnly = variant.type === 'color_only';
    const isColorWithSizes = variant.type === 'color_with_sizes';

    return (
      <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {!isSimple && variant.color_code && (
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: variant.color_code }}
                  title={variant.color_name}
                />
              )}
              <div>
                <h4 className="font-medium text-sm">
                  {getVariantDisplayName(variant)}
                </h4>
                {variant.barcode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    باركود: {variant.barcode}
                  </p>
                )}
              </div>
            </div>
            <StockStatusBadge status={variant.stock_status} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">
                {isColorWithSizes ? variant.color_quantity : variant.quantity}
              </div>
              <div className="text-xs text-muted-foreground">الكمية الحالية</div>
            </div>
            
            {variant.price && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {variant.price} د.ج
                </div>
                <div className="text-xs text-muted-foreground">السعر</div>
              </div>
            )}
          </div>

          {/* عرض المقاسات إذا وجدت */}
          {isColorWithSizes && variant.sizes && variant.sizes.length > 0 && (
            <div className="space-y-2 mb-3">
              <Label className="text-xs font-medium text-muted-foreground">المقاسات:</Label>
              <div className="grid grid-cols-2 gap-2">
                {variant.sizes.map((size, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background border rounded">
                    <span className="text-xs font-medium">{size.size_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{size.quantity}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onEdit(size.size_id, size.quantity)}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onEdit(
                isSimple ? undefined : variant.color_id,
                isColorWithSizes ? variant.color_quantity : variant.quantity
              )}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              تعديل
            </Button>
            
            {variant.color_image && (
              <Button size="sm" variant="outline">
                <Eye className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // مكون نموذج التعديل
  const EditVariantDialog = () => {
    if (!editingVariant) return null;

    return (
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              تعديل كمية المخزون
            </DialogTitle>
            <DialogDescription>
              قم بتحديث كمية المخزون للمتغير المحدد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {updateError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{updateError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>الكمية الحالية</Label>
              <Input 
                value={editingVariant.currentQuantity} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>الكمية الجديدة</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateEditingQuantity(Math.max(0, editingVariant.newQuantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  min="0"
                  value={editingVariant.newQuantity}
                  onChange={(e) => updateEditingQuantity(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateEditingQuantity(editingVariant.newQuantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أدخل ملاحظات حول التحديث..."
                value={editingVariant.notes}
                onChange={(e) => updateEditingNotes(e.target.value)}
                rows={3}
              />
            </div>

            {changePreview && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {changePreview.estimatedImpact}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              cancelEditing();
              setShowEditDialog(false);
              clearUpdateError();
            }}>
              <X className="w-4 h-4 mr-1" />
              إلغاء
            </Button>
            <Button onClick={previewChanges} variant="secondary" size="sm">
              معاينة
            </Button>
            <Button 
              onClick={async () => {
                try {
                  await saveChanges();
                  setShowEditDialog(false);
                } catch (error) {
                  // الخطأ يتم التعامل معه في saveChanges
                }
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // مكون سجل المخزون
  const InventoryLogSheet = () => (
    <Sheet open={showLogSheet} onOpenChange={setShowLogSheet}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            سجل المخزون
          </SheetTitle>
          <SheetDescription>
            عرض تاريخ جميع العمليات على مخزون هذا المنتج
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadInventoryLog(productId)}
              disabled={isLoadingLog}
            >
              {isLoadingLog ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              تحديث
            </Button>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            {isLoadingLog ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {inventoryLog.map((entry, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          entry.quantity_change > 0 ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="font-medium text-sm">{entry.variant_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {entry.operation_type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('ar-DZ', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">التغيير</Label>
                        <div className={cn(
                          "font-medium",
                          entry.quantity_change > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">من</Label>
                        <div>{entry.previous_stock}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">إلى</Label>
                        <div>{entry.new_stock}</div>
                      </div>
                    </div>

                    {entry.notes && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        {entry.notes}
                      </div>
                    )}

                    {entry.created_by_name && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {entry.created_by_name}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );

  // المحتوى الرئيسي
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={clearError}>
                إغلاق
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (!inventoryDetails) {
      return (
        <div className="p-6 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لم يتم العثور على بيانات المخزون</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* العنوان والإجراءات */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{inventoryDetails.product_name}</h2>
            <p className="text-muted-foreground mt-1">
              SKU: {inventoryDetails.product_sku}
              {inventoryDetails.product_barcode && ` • ${inventoryDetails.product_barcode}`}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refreshInventoryDetails}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={syncInventory}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </Button>
            
            <Button size="sm" variant="outline" onClick={() => {
              loadInventoryLog(productId);
              setShowLogSheet(true);
            }}>
              <History className="w-4 h-4" />
            </Button>
            
            <Button size="sm" variant="outline" onClick={exportInventoryData}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ملخص سريع */}
        {quickSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{quickSummary.total_stock}</div>
                <div className="text-xs text-muted-foreground">إجمالي المخزون</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{quickSummary.variants_count}</div>
                <div className="text-xs text-muted-foreground">المتغيرات</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{quickSummary.low_stock_count}</div>
                <div className="text-xs text-muted-foreground">منخفض المخزون</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{quickSummary.out_of_stock_count}</div>
                <div className="text-xs text-muted-foreground">نفذ من المخزون</div>
              </div>
            </Card>
          </div>
        )}

        {/* التفاصيل الأساسية */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              معلومات المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">إجمالي المخزون</Label>
                <div className="text-lg font-bold">{inventoryDetails.total_stock_quantity}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الحد الأدنى</Label>
                <div className="text-lg font-bold">{inventoryDetails.min_stock_level}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">مستوى إعادة الطلب</Label>
                <div className="text-lg font-bold">{inventoryDetails.reorder_level}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">كمية إعادة الطلب</Label>
                <div className="text-lg font-bold">{inventoryDetails.reorder_quantity}</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">حالة المخزون</Label>
                <StockStatusBadge status={inventoryDetails.stock_status} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">قيمة المخزون</Label>
                <div className="text-lg font-bold text-green-600">
                  {inventoryDetails.total_stock_value.toLocaleString()} د.ج
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">آخر تحديث</Label>
                <div className="text-sm">
                  {new Date(inventoryDetails.last_inventory_update).toLocaleDateString('ar-DZ')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* المتغيرات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {inventoryDetails.use_sizes ? <Ruler className="w-5 h-5" /> : <Palette className="w-5 h-5" />}
              المتغيرات
              <Badge variant="secondary">{inventoryDetails.variants_data.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventoryDetails.variants_data.map((variant, index) => (
                <VariantCard
                  key={index}
                  variant={variant}
                  productId={productId}
                  onEdit={(variantId, currentQuantity) => {
                    startEditingVariant(productId, variantId, currentQuantity);
                    setShowEditDialog(true);
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const content = (
    <div className="w-full h-full">
      {renderContent()}
      <EditVariantDialog />
      <InventoryLogSheet />
    </div>
  );

  if (showInModal) {
    return (
      <Dialog open={true} onOpenChange={() => onClose?.()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المخزون</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {content}
    </div>
  );
};

export default ProductInventoryDetails; 