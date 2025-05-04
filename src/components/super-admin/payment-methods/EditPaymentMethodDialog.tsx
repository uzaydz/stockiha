import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentMethod, PaymentMethodField } from '@/types/payment';

interface EditPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: PaymentMethod | null;
  onSave: (method: PaymentMethod) => void;
}

export function EditPaymentMethodDialog({ open, onOpenChange, method, onSave }: EditPaymentMethodDialogProps) {
  const [editedMethod, setEditedMethod] = useState<PaymentMethod | null>(null);
  
  // حقل جديد مؤقت
  const [newField, setNewField] = useState<PaymentMethodField>({
    name: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: true,
  });

  // تحديث النموذج عندما تتغير طريقة الدفع
  useEffect(() => {
    if (method) {
      setEditedMethod({ ...method });
    }
  }, [method]);

  const resetNewField = () => {
    setNewField({
      name: '',
      label: '',
      type: 'text',
      placeholder: '',
      required: true,
    });
  };

  const handleSave = () => {
    if (editedMethod) {
      onSave(editedMethod);
    }
  };

  const handleInputChange = (field: keyof PaymentMethod, value: any) => {
    if (editedMethod) {
      setEditedMethod({ ...editedMethod, [field]: value });
    }
  };
  
  const handleAddField = () => {
    if (editedMethod && newField.name && newField.label) {
      const updatedFields = editedMethod.fields ? [...editedMethod.fields] : [];
      updatedFields.push({ ...newField });
      setEditedMethod({ ...editedMethod, fields: updatedFields });
      resetNewField();
    }
  };
  
  const handleRemoveField = (index: number) => {
    if (editedMethod && editedMethod.fields) {
      const updatedFields = editedMethod.fields.filter((_, i) => i !== index);
      setEditedMethod({ ...editedMethod, fields: updatedFields });
    }
  };

  if (!editedMethod) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تعديل طريقة الدفع</DialogTitle>
          <DialogDescription>
            قم بتعديل تفاصيل طريقة الدفع التي سيستخدمها العملاء.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم طريقة الدفع</Label>
              <Input 
                id="name"
                value={editedMethod.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">رمز طريقة الدفع</Label>
              <Input 
                id="code"
                value={editedMethod.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">وصف طريقة الدفع</Label>
            <Textarea 
              id="description"
              value={editedMethod.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="instructions">تعليمات الدفع</Label>
            <Textarea 
              id="instructions"
              value={editedMethod.instructions || ''}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="icon">أيقونة</Label>
            <Select 
              value={editedMethod.icon || ''} 
              onValueChange={(value) => handleInputChange('icon', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر أيقونة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="mail">بريدي</SelectItem>
                <SelectItem value="smartphone">هاتف</SelectItem>
                <SelectItem value="currency">عملة رقمية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>حقول البيانات المطلوبة</Label>
            
            <div className="border rounded-md p-4 space-y-4">
              {editedMethod.fields && editedMethod.fields.length > 0 ? (
                <div className="space-y-2">
                  {editedMethod.fields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted rounded-md p-2">
                      <div>
                        <span className="font-medium">{field.label}</span>
                        <span className="text-xs text-muted-foreground mr-2">({field.type})</span>
                        {field.required && <span className="text-red-500">*</span>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveField(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">لا توجد حقول بعد</p>
              )}
              
              <div className="border-t pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="field_name" className="text-xs">اسم الحقل</Label>
                    <Input 
                      id="field_name"
                      value={newField.name}
                      onChange={(e) => setNewField({...newField, name: e.target.value})}
                      placeholder="مثال: phone_number"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="field_label" className="text-xs">تسمية الحقل</Label>
                    <Input 
                      id="field_label"
                      value={newField.label}
                      onChange={(e) => setNewField({...newField, label: e.target.value})}
                      placeholder="مثال: رقم الهاتف"
                      className="h-8"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="field_type" className="text-xs">نوع الحقل</Label>
                    <Select 
                      value={newField.type} 
                      onValueChange={(value) => setNewField({...newField, type: value as 'text' | 'number' | 'email' | 'tel' | 'textarea'})}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">نص</SelectItem>
                        <SelectItem value="number">رقم</SelectItem>
                        <SelectItem value="email">بريد إلكتروني</SelectItem>
                        <SelectItem value="tel">هاتف</SelectItem>
                        <SelectItem value="textarea">نص طويل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="field_placeholder" className="text-xs">نص توضيحي</Label>
                    <Input 
                      id="field_placeholder"
                      value={newField.placeholder || ''}
                      onChange={(e) => setNewField({...newField, placeholder: e.target.value})}
                      placeholder="مثال: أدخل رقم هاتفك"
                      className="h-8"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 justify-end">
                  <div className="flex items-center">
                    <Label htmlFor="field_required" className="text-xs ml-2">مطلوب</Label>
                    <Switch 
                      id="field_required" 
                      checked={newField.required} 
                      onCheckedChange={(checked) => setNewField({...newField, required: checked})}
                    />
                  </div>
                  
                  <Button type="button" size="sm" onClick={handleAddField} disabled={!newField.name || !newField.label}>
                    إضافة الحقل
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="display_order">ترتيب العرض</Label>
            <Input 
              id="display_order"
              type="number"
              value={editedMethod.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value, 10))}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center">
                <Label htmlFor="is_active" className="ml-2">تفعيل طريقة الدفع</Label>
                <span className="text-xs text-muted-foreground mr-1">(متاحة للاستخدام)</span>
              </div>
            </div>
            <Switch 
              id="is_active" 
              checked={editedMethod.is_active} 
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave}>حفظ التغييرات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 