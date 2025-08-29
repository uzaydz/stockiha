import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FieldErrors } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';

interface ProductFormValidationErrorsProps {
  errors: FieldErrors<ProductFormValues>;
}

const ProductFormValidationErrors: React.FC<ProductFormValidationErrorsProps> = memo(({
  errors,
}) => {
  const errorCount = Object.keys(errors).length;
  
  if (errorCount === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>يرجى إصلاح الأخطاء التالية:</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1 mt-2">
          {Object.entries(errors).map(([field, error]) => (
            <li key={field} className="text-sm">
              {typeof error === 'object' && error && 'message' in error && error.message 
                ? String(error.message)
                : `خطأ في حقل ${field}`
              }
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
});

ProductFormValidationErrors.displayName = 'ProductFormValidationErrors';

export default ProductFormValidationErrors;
