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
import ProductInventoryHeader from './components/ProductInventoryHeader';
import ProductInventorySummary from './components/ProductInventorySummary';
import ProductInventoryInfo from './components/ProductInventoryInfo';
import ProductVariantsGrid from './components/ProductVariantsGrid';
import VariantCard from './components/VariantCard';
import EditVariantDialog from './components/EditVariantDialog';
import InventoryLogSheet from './components/InventoryLogSheet';

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

  // حالة محلية للكمية الجديدة أثناء التعديل
  const [localQuantity, setLocalQuantity] = useState<number | null>(null);

  // تحديث localQuantity عند فتح نافذة التعديل
  useEffect(() => {
    if (showEditDialog && editingVariant) {
      setLocalQuantity(editingVariant.newQuantity);
    }
  }, [showEditDialog, editingVariant]);

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
        <ProductInventoryHeader
          productName={inventoryDetails.product_name}
          sku={inventoryDetails.product_sku}
          barcode={inventoryDetails.product_barcode}
          onRefresh={refreshInventoryDetails}
          onSync={syncInventory}
          onShowLog={() => {
              loadInventoryLog(productId);
              setShowLogSheet(true);
          }}
          onExport={exportInventoryData}
          isLoading={isLoading}
          isSyncing={isSyncing}
        />

        {/* ملخص سريع */}
        {quickSummary && (
          <ProductInventorySummary
            totalStock={quickSummary.total_stock}
            variantsCount={quickSummary.variants_count}
            lowStockCount={quickSummary.low_stock_count}
            outOfStockCount={quickSummary.out_of_stock_count}
          />
        )}

        {/* التفاصيل الأساسية */}
        <ProductInventoryInfo
          totalStockQuantity={inventoryDetails.total_stock_quantity}
          minStockLevel={inventoryDetails.min_stock_level}
          reorderLevel={inventoryDetails.reorder_level}
          reorderQuantity={inventoryDetails.reorder_quantity}
          stockStatus={inventoryDetails.stock_status}
          totalStockValue={inventoryDetails.total_stock_value}
          lastInventoryUpdate={inventoryDetails.last_inventory_update}
          StockStatusBadge={<StockStatusBadge status={inventoryDetails.stock_status} />}
        />

        {/* المتغيرات */}
        <ProductVariantsGrid
          variants={inventoryDetails.variants_data}
                  productId={productId}
          useSizes={inventoryDetails.use_sizes}
                  onEdit={(variantId, currentQuantity) => {
                    startEditingVariant(productId, variantId, currentQuantity);
                    setShowEditDialog(true);
                  }}
          VariantCardComponent={VariantCard}
                />
      </div>
    );
  };

  const content = (
    <div className="w-full h-full">
      {renderContent()}
      <EditVariantDialog
        open={showEditDialog}
        editingVariant={editingVariant}
        updateError={updateError}
        changePreview={changePreview}
        isUpdating={isUpdating}
        onClose={() => {
          cancelEditing();
          setShowEditDialog(false);
          clearUpdateError();
        }}
        onPreview={previewChanges}
        onSave={async (newQuantity) => {
          try {
            await saveChanges();
            setShowEditDialog(false);
          } catch (error) {
            // الخطأ يتم التعامل معه في saveChanges
          }
        }}
        onUpdateNotes={updateEditingNotes}
        onUpdateQuantity={updateEditingQuantity}
        clearUpdateError={clearUpdateError}
      />
      <InventoryLogSheet
        open={showLogSheet}
        onOpenChange={setShowLogSheet}
        isLoadingLog={isLoadingLog}
        inventoryLog={inventoryLog}
        productId={productId}
        loadInventoryLog={loadInventoryLog}
      />
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
