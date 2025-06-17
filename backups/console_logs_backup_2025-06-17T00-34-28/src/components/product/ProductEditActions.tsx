import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductEditActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  hasPermission: boolean;
}

const ProductEditActions: React.FC<ProductEditActionsProps> = ({
  isSubmitting,
  onCancel,
  hasPermission
}) => {
  return (
    <div className="space-y-4">
      {/* تحذير عند عدم وجود صلاحية */}
      {!hasPermission && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            تحذير: قد لا تملك الصلاحية الكاملة لتعديل المنتجات. إذا واجهت مشاكل، يرجى التواصل مع مدير النظام.
          </AlertDescription>
        </Alert>
      )}
      
      <DialogFooter className="flex justify-between px-6 py-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className={!hasPermission ? 'bg-amber-600 hover:bg-amber-700' : ''}
        >
          {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {!hasPermission ? 'محاولة الحفظ' : 'حفظ التغييرات'}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default ProductEditActions;
