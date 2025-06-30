import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { 
  getAvailableWilayas, 
  getMunicipalitiesByWilayaId,
  type YalidineMunicipality
} from '@/data/yalidine-municipalities-complete';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
  validation?: {
    pattern?: string;
    message?: string;
  };
  conditional?: {
    field: string;
    value: string;
  };
}

export interface ProductFormData {
  [key: string]: string | boolean | number;
}

interface ProductFormRendererProps {
  formData?: {
    fields: FormField[];
    name?: string;
    [key: string]: any;
  };
  formStrategy?: string;
  onFormSubmit?: (data: ProductFormData) => void;
  onFormChange?: (data: ProductFormData) => void;
  loading?: boolean;
  className?: string;
  // البدائل القديمة للتوافق
  fields?: FormField[];
  onSubmit?: (data: ProductFormData) => void;
  initialData?: ProductFormData;
  isSubmitting?: boolean;
}

const ProductFormRenderer: React.FC<ProductFormRendererProps> = ({
  formData: externalFormData,
  formStrategy,
  onFormSubmit,
  onFormChange,
  loading = false,
  className,
  // البدائل القديمة للتوافق
  fields: directFields,
  onSubmit,
  initialData = {},
  isSubmitting = false
}) => {
  // تحديد الحقول من المصدر الصحيح
  const fields = externalFormData?.fields || directFields || [];
  const isLoading = loading || isSubmitting;
  const submitHandler = onFormSubmit || onSubmit;
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [provinces] = useState(getAvailableWilayas());
  const [availableMunicipalities, setAvailableMunicipalities] = useState<YalidineMunicipality[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');

  // تحديد أسماء حقول الولايات والبلديات
  const provinceFieldNames = ['province', 'wilaya', 'state', 'الولاية'];
  const municipalityFieldNames = ['municipality', 'commune', 'city', 'البلدية', 'المدينة'];

  // العثور على حقل الولاية في النموذج
  const provinceField = fields?.find(field => 
    provinceFieldNames.some(name => 
      field.name.toLowerCase().includes(name.toLowerCase()) || 
      field.label.toLowerCase().includes(name.toLowerCase())
    )
  );

  // العثور على حقل البلدية في النموذج
  const municipalityField = fields?.find(field => 
    municipalityFieldNames.some(name => 
      field.name.toLowerCase().includes(name.toLowerCase()) || 
      field.label.toLowerCase().includes(name.toLowerCase())
    )
  );

  // تحديث البلديات عند تغيير الولاية
  useEffect(() => {
    
    if (selectedProvinceId) {
      const municipalities = getMunicipalitiesByWilayaId(Number(selectedProvinceId));
      setAvailableMunicipalities(municipalities);
      
    } else {
      setAvailableMunicipalities([]);
    }
  }, [selectedProvinceId]);

  // مراقبة تغيير بيانات النموذج
  useEffect(() => {
    
    if (provinceField) {
      const provinceValue = formData[provinceField.name] as string;
      
      if (provinceValue && provinceValue !== selectedProvinceId) {
        setSelectedProvinceId(provinceValue);
        
        // إعادة تعيين البلدية عند تغيير الولاية
        if (municipalityField && formData[municipalityField.name]) {
          const newFormData = { ...formData };
          newFormData[municipalityField.name] = '';
          setFormData(newFormData);
          onFormChange?.(newFormData);
        }
      }
    }
  }, [formData, provinceField, municipalityField, selectedProvinceId, onFormChange]);

  // إرسال التحديثات للمكون الأب
  useEffect(() => {
    onFormChange?.(formData);
  }, [formData, onFormChange]);

  // تحديث قيمة حقل في النموذج
  const updateFormData = useCallback((fieldName: string, value: string | boolean | number) => {
    
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };

      // إذا كان هذا حقل ولاية، اطبع معلومات إضافية
      if (provinceFieldNames.some(name => fieldName.toLowerCase().includes(name.toLowerCase()))) {
      }
      
      // إذا كان هذا حقل بلدية، اطبع معلومات إضافية
      if (municipalityFieldNames.some(name => fieldName.toLowerCase().includes(name.toLowerCase()))) {
      }
      
      return newData;
    });
  }, [selectedProvinceId, provinceFieldNames, municipalityFieldNames]);

  // فحص إذا كان الحقل مرئي بناءً على الشروط
  const isFieldVisible = (field: FormField): boolean => {
    if (!field.conditional) return true;
    
    const conditionValue = formData[field.conditional.field];
    return conditionValue === field.conditional.value;
  };

  // عرض حقل الولاية
  const renderProvinceField = (field: FormField) => {
    const currentValue = formData[field.name] as string || '';

    return (
      <div className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Select
          value={currentValue}
          onValueChange={(value) => updateFormData(field.name, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'اختر الولاية'} />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((province) => (
              <SelectItem key={province.id} value={province.id.toString()}>
                {province.name_ar || province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // عرض حقل البلدية
  const renderMunicipalityField = (field: FormField) => {
    const currentValue = formData[field.name] as string || '';

    if (!selectedProvinceId) {
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium text-gray-400">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="اختر الولاية أولاً" />
            </SelectTrigger>
          </Select>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Select
          value={currentValue || ""}
          onValueChange={(value) => updateFormData(field.name, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'اختر البلدية'} />
          </SelectTrigger>
          <SelectContent>
            {availableMunicipalities.map((municipality) => (
              <SelectItem key={municipality.id} value={municipality.id.toString()}>
                {municipality.name_ar || municipality.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // عرض حقل عادي
  const renderRegularField = (field: FormField) => {
    const currentValue = formData[field.name] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              name={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={currentValue as string}
              onChange={(e) => updateFormData(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              name={field.name}
              placeholder={field.placeholder}
              value={currentValue as string}
              onChange={(e) => updateFormData(field.name, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={currentValue as string}
              onValueChange={(value) => updateFormData(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'اختر خيار'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id={field.id}
              checked={currentValue as boolean}
              onCheckedChange={(checked) => updateFormData(field.name, checked)}
            />
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={currentValue as string}
              onValueChange={(value) => updateFormData(field.name, value)}
            >
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <Label htmlFor={`${field.id}-${option.value}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  // عرض حقل واحد
  const renderField = (field: FormField) => {
    if (!isFieldVisible(field)) return null;

    // تحديد نوع الحقل
    const isProvinceField = provinceFieldNames.some(name => 
      field.name.toLowerCase().includes(name.toLowerCase()) || 
      field.label.toLowerCase().includes(name.toLowerCase())
    );

    const isMunicipalityField = municipalityFieldNames.some(name => 
      field.name.toLowerCase().includes(name.toLowerCase()) || 
      field.label.toLowerCase().includes(name.toLowerCase())
    );

    if (isProvinceField) {
      return renderProvinceField(field);
    }

    if (isMunicipalityField) {
      return renderMunicipalityField(field);
    }

    return renderRegularField(field);
  };

  // التعامل مع إرسال النموذج
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitHandler) {
      submitHandler(formData);
    }
  };

  // فحص إذا كانت الحقول غير محددة
  if (!fields || !Array.isArray(fields)) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>معلومات الطلب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            جاري تحميل النموذج...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>معلومات الطلب</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field.id}>
              {renderField(field)}
            </div>
          ))}
          
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-3 px-4 rounded-lg font-medium transition-colors",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? 'جاري الإرسال...' : 'تأكيد الطلب'}
          </button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductFormRenderer;
