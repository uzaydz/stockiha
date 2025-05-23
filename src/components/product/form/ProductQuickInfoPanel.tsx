import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Eye, Package, DollarSign, Hash, BarChart3, Star, Sparkles } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { cn } from '@/lib/utils';

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

  const InfoItem = ({ icon: Icon, label, value, className }: { icon: React.ElementType, label: string, value: string, className?: string }) => (
    <div className="group p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
          className || "bg-gradient-to-br from-primary/20 to-primary/10"
        )}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-300">
            {value || '-'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main Info Card */}
      <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/20 shadow-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-4 w-24 h-24 bg-primary rounded-full blur-2xl" />
          <div className="absolute bottom-4 left-4 w-20 h-20 bg-secondary rounded-full blur-2xl" />
        </div>
        
        <div className="relative p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                معلومات سريعة
              </h2>
              <p className="text-sm text-muted-foreground">ملخص المنتج</p>
            </div>
          </div>

          <div className="space-y-4">
            <InfoItem
              icon={Package}
              label="اسم المنتج"
              value={watchedName}
              className="bg-gradient-to-br from-blue-500/20 to-blue-500/10"
            />
            
            <InfoItem
              icon={DollarSign}
              label="السعر"
              value={watchedPrice !== undefined ? `${watchedPrice} دج` : undefined}
              className="bg-gradient-to-br from-green-500/20 to-green-500/10"
            />
            
            <InfoItem
              icon={BarChart3}
              label="الكمية المتوفرة"
              value={watchedStockQuantity !== undefined ? `${watchedStockQuantity} وحدة` : undefined}
              className="bg-gradient-to-br from-orange-500/20 to-orange-500/10"
            />
            
            <InfoItem
              icon={Hash}
              label="رمز المنتج (SKU)"
              value={watchedSku}
              className="bg-gradient-to-br from-purple-500/20 to-purple-500/10"
            />
          </div>
        </div>
      </Card>

      {/* Image Preview Card */}
      {thumbnailImage && (
        <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/20 shadow-xl">
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">معاينة المنتج</h3>
            </div>
            
            <div className="relative group">
              <div className="aspect-square relative rounded-2xl overflow-hidden bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30">
                <img
                  src={thumbnailImage}
                  alt="معاينة المنتج"
                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image')}
                />
                {/* Overlay Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Action Card for Edit Mode */}
      {isEditMode && productId && (
        <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-xl border border-primary/20 shadow-xl">
          <div className="relative p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">خيارات سريعة</h3>
            </div>
            
            <Button
              variant="outline"
              className="w-full h-12 bg-background/80 backdrop-blur-sm border border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 group"
              onClick={() => window.open(`/product/${productId}`, '_blank')}
            >
              <Eye className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
              عرض في المتجر
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductQuickInfoPanel; 