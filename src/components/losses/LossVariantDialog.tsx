import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { Product, ProductVariant } from '@/types/losses';
import { formatCurrency } from '@/lib/losses/utils';

interface LossVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: Product | null;
  productVariants: ProductVariant[];
  loadingVariants: boolean;
  onSelectVariant: (variant: ProductVariant) => void;
}

const LossVariantDialog: React.FC<LossVariantDialogProps> = ({
  open,
  onOpenChange,
  selectedProduct,
  productVariants,
  loadingVariants,
  onSelectVariant
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby="variants-dialog-description">
        <DialogHeader>
          <DialogTitle>
            اختيار متغير المنتج: {selectedProduct?.name}
          </DialogTitle>
          <div id="variants-dialog-description" className="sr-only">
            قائمة متغيرات المنتج المتاحة للاختيار من بينها مثل الألوان والمقاسات
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {loadingVariants ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                اختر المتغير المحدد (اللون/المقاس) الذي تريد إضافته لتصريح الخسارة:
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {productVariants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted"
                    onClick={() => onSelectVariant(variant)}
                  >
                    <div>
                      <p className="font-medium">{variant.variant_display_name}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {variant.color_name && (
                          <span>اللون: {variant.color_name}</span>
                        )}
                        {variant.size_name && (
                          <span>المقاس: {variant.size_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <p className="text-sm">المخزون: {variant.current_stock}</p>
                      <p className="text-sm">التكلفة: {formatCurrency(variant.product_purchase_price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {productVariants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد متغيرات متاحة لهذا المنتج
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LossVariantDialog;







