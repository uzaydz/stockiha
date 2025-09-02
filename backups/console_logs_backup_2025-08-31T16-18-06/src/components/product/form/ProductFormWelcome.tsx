import React, { memo } from 'react';
import { Package } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProductFormWelcomeProps {
  isEditMode: boolean;
}

const ProductFormWelcome: React.FC<ProductFormWelcomeProps> = memo(({
  isEditMode,
}) => {
  if (isEditMode) {
    return null;
  }

  return (
    <Alert className="mb-6 border-primary/20 bg-primary/5">
      <Package className="h-4 w-4" />
      <AlertTitle>إنشاء منتج جديد</AlertTitle>
      <AlertDescription>
        املأ جميع المعلومات المطلوبة لإنشاء منتج احترافي. سيتم حفظ مسودة تلقائياً أثناء الكتابة.
      </AlertDescription>
    </Alert>
  );
});

ProductFormWelcome.displayName = 'ProductFormWelcome';

export default ProductFormWelcome;
