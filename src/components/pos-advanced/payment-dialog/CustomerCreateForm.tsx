import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, X } from 'lucide-react';

interface CustomerCreateFormProps {
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string; email: string }) => Promise<void>;
  initialData?: { name: string; phone: string; email: string };
  isCreating?: boolean;
}

export const CustomerCreateForm: React.FC<CustomerCreateFormProps> = ({
  onClose,
  onSubmit,
  initialData,
  isCreating = false
}) => {
  const [formData, setFormData] = useState(
    initialData || { name: '', phone: '', email: '' }
  );

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30 dark:bg-muted/10">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">إنشاء عميل جديد</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
          disabled={isCreating}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">الاسم *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="اسم العميل"
            className="h-8 text-sm"
            disabled={isCreating}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">الهاتف</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="رقم الهاتف"
            className="h-8 text-sm"
            dir="rtl"
            disabled={isCreating}
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!formData.name.trim() || isCreating}
          size="sm"
          className="flex-1 h-8"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
              إنشاء...
            </>
          ) : (
            <>
              <UserPlus className="h-3 w-3 mr-1" />
              إنشاء
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isCreating}
          size="sm"
          className="h-8"
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
};
