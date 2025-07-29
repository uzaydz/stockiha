import { useState, useEffect } from 'react';
import { 
  Label 
} from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import provinces from '@/data/algeria-provinces';
import { getMunicipalitiesByProvinceId } from '@/data/algeria-municipalities';
import { FormField as IFormField } from '@/api/form-settings';

interface ProvinceFieldProps {
  field: IFormField;
  updateField: (field: IFormField) => void;
}

export const ProvinceField = ({ field, updateField }: ProvinceFieldProps) => {
  // إعداد الحقول المرتبطة إذا لم تكن موجودة
  useEffect(() => {
    if (!field.linkedFields) {
      updateField({
        ...field,
        linkedFields: {
          municipalityField: null
        }
      });
    }
  }, [field, updateField]);

  return (
    <div className="space-y-2">
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

        <div className="flex items-center space-x-2 space-x-reverse">
          <Checkbox
            id={`field-${field.id}-create-municipality`}
            checked={!!field.linkedFields?.municipalityField}
            onCheckedChange={(checked) => {
              if (checked) {
                // إنشاء حقل البلدية المرتبط
                updateField({
                  ...field,
                  linkedFields: {
                    ...field.linkedFields,
                    municipalityField: 'auto'
                  }
                });
              } else {
                // إزالة الارتباط
                updateField({
                  ...field,
                  linkedFields: {
                    ...field.linkedFields,
                    municipalityField: null
                  }
                });
              }
            }}
          />
          <Label htmlFor={`field-${field.id}-create-municipality`} className="text-sm font-medium">
            إنشاء حقل بلدية مرتبط تلقائيًا
          </Label>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        هذا الحقل سيظهر كقائمة منسدلة تحتوي على جميع الولايات الجزائرية (58 ولاية).
      </p>
    </div>
  );
};

interface ProvinceSelectorProps {
  provinceId: string | number | null;
  municipalityId: string | null;
  onProvinceChange: (value: string) => void;
  onMunicipalityChange: (value: string) => void;
  provinceLabel?: string;
  municipalityLabel?: string;
  required?: boolean;
}

export const ProvinceSelector = ({ 
  provinceId, 
  municipalityId, 
  onProvinceChange, 
  onMunicipalityChange,
  provinceLabel = "الولاية",
  municipalityLabel = "البلدية",
  required = false
}: ProvinceSelectorProps) => {
  const [availableMunicipalities, setAvailableMunicipalities] = useState<{ id: string; name: string }[]>([]);

  // عند تغيير الولاية، قم بتحديث قائمة البلديات
  useEffect(() => {
    if (provinceId) {
      const municipalities = getMunicipalitiesByProvinceId(Number(provinceId));
      setAvailableMunicipalities(municipalities);
      
      // إذا تم تغيير الولاية وكانت البلدية المحددة لا تنتمي لهذه الولاية، قم بإعادة تعيينها
      const municipalityExists = municipalities.some(m => m.id === municipalityId);
      if (municipalityId && !municipalityExists) {
        onMunicipalityChange('');
      }
    } else {
      setAvailableMunicipalities([]);
      onMunicipalityChange('');
    }
  }, [provinceId, municipalityId, onMunicipalityChange]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {provinceLabel}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        <Select 
          value={provinceId?.toString() || ''} 
          onValueChange={onProvinceChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر الولاية" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map(province => (
              <SelectItem key={province.id} value={province.id.toString()}>
                {province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {municipalityLabel}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        <Select 
          value={municipalityId || ''} 
          onValueChange={onMunicipalityChange}
          disabled={!provinceId || availableMunicipalities.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={provinceId ? "اختر البلدية" : "اختر الولاية أولاً"} />
          </SelectTrigger>
          <SelectContent>
            {availableMunicipalities.map(municipality => (
              <SelectItem key={municipality.id} value={municipality.id}>
                {municipality.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ProvinceSelector;
