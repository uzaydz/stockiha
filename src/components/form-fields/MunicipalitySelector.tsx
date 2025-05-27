import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField as IFormField } from '@/api/form-settings';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MunicipalityFieldProps {
  field: IFormField;
  updateField: (field: IFormField) => void;
  allFields: IFormField[];
}

export const MunicipalityField = ({ field, updateField, allFields }: MunicipalityFieldProps) => {
  const [availableProvinceFields, setAvailableProvinceFields] = useState<IFormField[]>([]);
  const [linkedProvinceId, setLinkedProvinceId] = useState<string | null>(null);

  // البحث عن حقول الولايات المتاحة للربط
  useEffect(() => {
    const provinceFields = allFields.filter(f => f.type === 'province' && f.id !== field.id);
    setAvailableProvinceFields(provinceFields);
    
    // إذا كان هناك اعتمادية محددة بالفعل
    if (field.dependency?.fieldId) {
      setLinkedProvinceId(field.dependency.fieldId);
    } else if (field.linkedFields?.provinceField) {
      // إذا كان هناك حقل ولاية مرتبط
      setLinkedProvinceId(field.linkedFields.provinceField);
    } else if (provinceFields.length === 1) {
      // إذا كان هناك حقل ولاية واحد فقط، اربط به تلقائيًا
      const provinceField = provinceFields[0];
      updateField({
        ...field,
        dependency: {
          fieldId: provinceField.id,
          value: '*'
        },
        linkedFields: {
          ...field.linkedFields,
          provinceField: provinceField.id
        }
      });
      setLinkedProvinceId(provinceField.id);
    }
  }, [allFields, field, updateField]);

  // عند اختيار حقل ولاية للربط
  const handleProvinceFieldChange = (provinceFieldId: string) => {
    setLinkedProvinceId(provinceFieldId);
    updateField({
      ...field,
      dependency: {
        fieldId: provinceFieldId,
        value: '*'
      },
      linkedFields: {
        ...field.linkedFields,
        provinceField: provinceFieldId
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`field-${field.id}-label`}>عنوان الحقل</Label>
        <Input
          id={`field-${field.id}-label`}
          value={field.label}
          onChange={(e) => updateField({ ...field, label: e.target.value })}
        />
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Checkbox
            id={`field-${field.id}-required`}
            checked={field.required}
            onCheckedChange={(checked) => updateField({ ...field, required: !!checked })}
          />
          <Label htmlFor={`field-${field.id}-required`} className="text-sm font-medium">
            هذا الحقل مطلوب
          </Label>
        </div>
      </div>

      {availableProvinceFields.length > 0 ? (
        <div className="mt-4 space-y-2">
          <Label htmlFor={`field-${field.id}-province-link`}>ربط بحقل الولاية</Label>
          <Select
            value={linkedProvinceId || ''}
            onValueChange={handleProvinceFieldChange}
          >
            <SelectTrigger id={`field-${field.id}-province-link`}>
              <SelectValue placeholder="اختر حقل الولاية" />
            </SelectTrigger>
            <SelectContent>
              {availableProvinceFields.map((provinceField) => (
                <SelectItem key={provinceField.id} value={provinceField.id}>
                  {provinceField.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            سيتم ربط هذا الحقل بحقل الولاية المحدد لعرض البلديات المناسبة فقط.
          </p>
        </div>
      ) : (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800 mt-4">
          <AlertDescription className="text-sm">
            لم يتم العثور على حقول ولاية. أضف حقل ولاية أولاً ليعمل حقل البلدية بشكل صحيح.
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        هذا الحقل سيظهر كقائمة منسدلة تحتوي على بلديات الولاية المختارة.
      </p>
    </div>
  );
};

export default MunicipalityField;
