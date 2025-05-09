import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField as IFormField } from '@/api/form-settings';
import { ProvinceField } from '@/components/form-fields/ProvinceSelector';
import { MunicipalityField } from '@/components/form-fields/MunicipalitySelector';

interface FormFieldItemProps {
  field: IFormField;
  index: number;
  totalFields: number;
  onUpdateField: (field: IFormField) => void;
  onMoveField: (fieldId: string, direction: 'up' | 'down') => void;
  onDeleteField: (fieldId: string) => void;
  allFields: IFormField[];
}

export function FormFieldItem({
  field,
  index,
  totalFields,
  onUpdateField,
  onMoveField,
  onDeleteField,
  allFields
}: FormFieldItemProps) {
  
  // العنوان المختصر للحقل
  const getFieldTypeLabel = (type: IFormField['type']) => {
    switch (type) {
      case 'text': return 'نص';
      case 'email': return 'بريد إلكتروني';
      case 'tel': return 'هاتف';
      case 'select': return 'قائمة منسدلة';
      case 'radio': return 'اختيار واحد';
      case 'checkbox': return 'اختيار متعدد';
      case 'province': return 'ولاية';
      case 'municipality': return 'بلدية';
      default: return type;
    }
  };

  // عرض إعدادات الحقل حسب نوعه
  const renderFieldSettings = () => {
    switch (field.type) {
      case 'province':
        return <ProvinceField field={field} updateField={onUpdateField} />;
      case 'municipality':
        return <MunicipalityField field={field} updateField={onUpdateField} allFields={allFields} />;
      case 'select':
      case 'radio':
      case 'checkbox':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-label`}>عنوان الحقل</Label>
              <Input
                id={`field-${field.id}-label`}
                value={field.label}
                onChange={(e) => onUpdateField({ ...field, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-name`}>اسم الحقل</Label>
              <Input
                id={`field-${field.id}-name`}
                value={field.name}
                onChange={(e) => onUpdateField({ ...field, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-type`}>نوع الحقل</Label>
              <select
                id={`field-${field.id}-type`}
                value={field.type}
                onChange={(e) => onUpdateField({ ...field, type: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="text">نص</option>
                <option value="email">بريد إلكتروني</option>
                <option value="tel">هاتف</option>
                <option value="select">قائمة منسدلة</option>
                <option value="radio">اختيار واحد</option>
                <option value="checkbox">اختيار متعدد</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-placeholder`}>نص التلميح</Label>
              <Input
                id={`field-${field.id}-placeholder`}
                value={field.placeholder || ''}
                onChange={(e) => onUpdateField({ ...field, placeholder: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 space-x-reverse mr-2 mb-4">
                <Checkbox
                  id={`field-${field.id}-required`}
                  checked={field.required}
                  onCheckedChange={(checked) => onUpdateField({ ...field, required: !!checked })}
                />
                <Label htmlFor={`field-${field.id}-required`}>هذا الحقل مطلوب</Label>
              </div>
              
              <div className="border rounded-md p-3 bg-muted/40">
                <Label className="mb-2 block">خيارات الحقل</Label>
                {field.options?.map((option, idx) => (
                  <div key={idx} className="flex space-x-2 space-x-reverse mb-2">
                    <div className="flex-1">
                      <Input
                        placeholder="النص المعروض"
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...(field.options || [])];
                          newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                          onUpdateField({ ...field, options: newOptions });
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="القيمة"
                        value={option.value}
                        onChange={(e) => {
                          const newOptions = [...(field.options || [])];
                          newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                          onUpdateField({ ...field, options: newOptions });
                        }}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const newOptions = [...(field.options || [])];
                        newOptions.splice(idx, 1);
                        onUpdateField({ ...field, options: newOptions });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const newOptions = [...(field.options || []), { label: '', value: '' }];
                    onUpdateField({ ...field, options: newOptions });
                  }}
                >
                  إضافة خيار
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-label`}>عنوان الحقل</Label>
              <Input
                id={`field-${field.id}-label`}
                value={field.label}
                onChange={(e) => onUpdateField({ ...field, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-name`}>اسم الحقل</Label>
              <Input
                id={`field-${field.id}-name`}
                value={field.name}
                onChange={(e) => onUpdateField({ ...field, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-type`}>نوع الحقل</Label>
              <select
                id={`field-${field.id}-type`}
                value={field.type}
                onChange={(e) => onUpdateField({ ...field, type: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="text">نص</option>
                <option value="email">بريد إلكتروني</option>
                <option value="tel">هاتف</option>
                <option value="select">قائمة منسدلة</option>
                <option value="radio">اختيار واحد</option>
                <option value="checkbox">اختيار متعدد</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-${field.id}-placeholder`}>نص التلميح</Label>
              <Input
                id={`field-${field.id}-placeholder`}
                value={field.placeholder || ''}
                onChange={(e) => onUpdateField({ ...field, placeholder: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 space-x-reverse mr-2">
                <Checkbox
                  id={`field-${field.id}-required`}
                  checked={field.required}
                  onCheckedChange={(checked) => onUpdateField({ ...field, required: !!checked })}
                />
                <Label htmlFor={`field-${field.id}-required`}>هذا الحقل مطلوب</Label>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card dark:bg-card">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-medium">{field.label}</div>
          <div className="text-sm text-muted-foreground">
            {getFieldTypeLabel(field.type)}
            {field.required && ' (مطلوب)'}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onMoveField(field.id, 'up')}
            disabled={index === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onMoveField(field.id, 'down')}
            disabled={index === totalFields - 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              if (window.confirm('هل أنت متأكد من حذف هذا الحقل؟')) {
                onDeleteField(field.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      
      {/* عرض إعدادات الحقل المناسبة حسب نوعه */}
      {renderFieldSettings()}
    </div>
  );
} 