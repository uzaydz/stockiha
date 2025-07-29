import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Eye, Package, DollarSign, Hash, BarChart3 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';

interface ProductQuickInfoPanelProps {
  form: UseFormReturn<ProductFormValues>; // To watch form values
  isEditMode: boolean;
  productId?: string;
  thumbnailImage: string | undefined; // Watched thumbnail_image value
}

const ProductQuickInfoPanel: React.FC<ProductQuickInfoPanelProps> = ({
  form,
  isEditMode,
  productId,
  thumbnailImage,
}) => {
  const { watch } = form;
  const watchedName = watch('name');
  const watchedPrice = watch('price');
  const watchedStockQuantity = watch('stock_quantity');
  const watchedSku = watch('sku');

  const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">
          {value || 'غير محدد'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Main Info Card */}
      <Card className="p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          معلومات المنتج
        </h3>
        
        <div className="space-y-3">
          <InfoItem
            icon={Package}
            label="اسم المنتج"
            value={watchedName}
          />
          
          <InfoItem
            icon={DollarSign}
            label="السعر"
            value={watchedPrice !== undefined ? `${watchedPrice} دج` : ''}
          />
          
          <InfoItem
            icon={BarChart3}
            label="الكمية"
            value={watchedStockQuantity !== undefined ? `${watchedStockQuantity}` : ''}
          />
          
          <InfoItem
            icon={Hash}
            label="رمز المنتج"
            value={watchedSku}
          />
        </div>
      </Card>

      {/* Image Preview Card */}
      {thumbnailImage && (
        <Card className="p-4">
          <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            معاينة الصورة
          </h3>
          
          <div className="aspect-square rounded-lg overflow-hidden bg-muted/30 border">
            <img
              src={thumbnailImage}
              alt="معاينة المنتج"
              className="object-cover w-full h-full"
              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image')}
            />
          </div>
        </Card>
      )}

      {/* Action Card for Edit Mode */}
      {isEditMode && productId && (
        <Card className="p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(`/product/${productId}`, '_blank')}
          >
            <Eye className="mr-2 h-4 w-4" />
            عرض في المتجر
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ProductQuickInfoPanel;
