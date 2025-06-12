import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';

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
    <DialogFooter className="flex justify-between px-6 py-4 border-t">
      <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
        إلغاء
      </Button>
      <Button 
        type="submit" 
        disabled={isSubmitting || !hasPermission}
      >
        {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        حفظ التغييرات
      </Button>
    </DialogFooter>
  );
};

export default ProductEditActions;
