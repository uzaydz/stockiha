import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentMethodField, PaymentMethodFormData } from '@/types/payment';

interface CreatePaymentMethodDialogProps {
  onCreateMethod: (method: PaymentMethodFormData) => void;
}

export function CreatePaymentMethodDialog({ onCreateMethod }: CreatePaymentMethodDialogProps) {
  const [open, setOpen] = useState(false);
  const [newMethod, setNewMethod] = useState<PaymentMethodFormData>({
    name: '',
    code: '',
    description: '',
    instructions: '',
    icon: 'cash',
    fields: [],
    is_active: true,
    display_order: 0
  });
  
  // حقل جديد مؤقت
  const [newField, setNewField] = useState<PaymentMethodField>({
    name: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: true,
  });

  const resetForm = () => {
    setNewMethod({
      name: '',
      code: '',
      description: '',
      instructions: '',
      icon: 'cash',
      fields: [],
      is_active: true,
      display_order: 0
    });
    resetNewField();
  };

  const resetNewField = () => {
    setNewField({
      name: '',
      label: '',
      type: 'text',
      placeholder: '',
      required: true,
    });
  };

  const handleCreate = () => {
    onCreateMethod(newMethod);
    setOpen(false);
    resetForm();
  };

  const handleInputChange = (field: keyof PaymentMethodFormData, value: any) => {
    setNewMethod({ ...newMethod, [field]: value });
  };
  
  const handleAddField = () => {
    if (newField.name && newField.label) {
      const updatedFields = [...(newMethod.fields || [])];
      updatedFields.push({ ...newField });
      setNewMethod({ ...newMethod, fields: updatedFields });
      resetNewField();
    }
  };
  
  const handleRemoveField = (index: number) => {
    if (newMethod.fields) {
      const updatedFields = newMethod.fields.filter((_, i) => i !== index);
      setNewMethod({ ...newMethod, fields: updatedFields });
    }
  };

  const isFormValid = () => {
    return newMethod.name.trim() !== '' && 
           newMethod.code.trim() !== '';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          إضافة طريقة دفع
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>إضافة طريقة دفع جديدة</DialogTitle>
          <DialogDescription>
            قم بإضافة طريقة دفع جديدة ليستخدمها العملاء عند اختيار الاشتراكات.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم طريقة الدفع</Label>
              <Input 
                id="name"
                value={newMethod.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="مثال: الدفع عند الاستلام"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">رمز طريقة الدفع</Label>
              <Input 
                id="code"
                value={newMethod.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="مثال: cash_on_delivery"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">وصف طريقة الدفع</Label>
            <Textarea 
              id="description"
              value={newMethod.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="وصف مختصر لطريقة الدفع"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="instructions">تعليمات الدفع</Label>
            <Textarea 
              id="instructions"
              value={newMethod.instructions || ''}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              placeholder="تعليمات مفصلة للعميل حول كيفية إتمام الدفع بهذه الطريقة"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="icon">أيقونة</Label>
            <Select 
              value={newMethod.icon || 'cash'} 
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
              {newMethod.fields && newMethod.fields.length > 0 ? (
                <div className="space-y-2">
                  {newMethod.fields.map((field, index) => (
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
              value={newMethod.display_order}
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
              checked={newMethod.is_active} 
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreate} disabled={!isFormValid()}>إنشاء طريقة الدفع</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
