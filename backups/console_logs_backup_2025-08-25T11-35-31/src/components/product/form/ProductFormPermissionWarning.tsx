import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProductFormPermissionWarningProps {
  permissionWarning?: string;
}

const ProductFormPermissionWarning: React.FC<ProductFormPermissionWarningProps> = memo(({
  permissionWarning,
}) => {
  if (!permissionWarning) {
    return null;
  }

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        تحذير الصلاحيات
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        {permissionWarning}
      </AlertDescription>
    </Alert>
  );
});

ProductFormPermissionWarning.displayName = 'ProductFormPermissionWarning';

export default ProductFormPermissionWarning;
