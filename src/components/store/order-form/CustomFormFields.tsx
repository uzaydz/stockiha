import { useId, useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomFormFieldsProps } from "./OrderFormTypes";
import { PROVINCES } from "./OrderFormTypes";

// إضافة وصف إلى واجهة FormField
interface ExtendedFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'province' | 'municipality' | 'textarea';
  required: boolean;
  placeholder?: string;
  order: number;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
  isVisible: boolean;
  description?: string; // إضافة حقل الوصف
  linkedFields?: {
    municipalityField?: string | null;
    provinceField?: string | null;
    [key: string]: string | null | undefined;
  };
  dependency?: {
    fieldId: string;
    value: string;
  };
}

// واجهة البلديات الجزائرية
interface Municipalities {
  [province: string]: string[];
}

// قائمة البلديات لكل ولاية (مبسطة للتوضيح)
const MUNICIPALITIES: Municipalities = {
  "الجزائر": ["باب الوادي", "حسين داي", "بئر مراد رايس", "حيدرة", "باش جراح"],
  "وهران": ["وهران", "عين الترك", "بئر الجير", "السانية", "مرسى الحجاج"],
  "قسنطينة": ["قسنطينة", "الخروب", "حامة بوزيان", "زيغود يوسف", "ديدوش مراد"],
  // إضافة باقي الولايات والبلديات حسب الحاجة
};

const CustomFormFields = ({ customFields }: CustomFormFieldsProps) => {
  const componentId = useId();
  
  // حالة لتخزين قيم الحقول
  const [fieldValues, setFieldValues] = useState<{[key: string]: any}>({});
  
  // حالة لتخزين الولاية المحددة والبلديات المناسبة
  const [selectedProvinces, setSelectedProvinces] = useState<{[key: string]: string}>({});
  const [availableMunicipalities, setAvailableMunicipalities] = useState<{[key: string]: string[]}>({});
  
  // حالة لتخزين أخطاء التحقق
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  
  // خريطة لربط حقول الولاية والبلدية المرتبطة
  const [fieldRelations, setFieldRelations] = useState<{[key: string]: string}>({});
  
  // حالة لتحديد الحقول المرئية استنادًا إلى التبعيات
  const [visibleFields, setVisibleFields] = useState<{[key: string]: boolean}>({});
  
  // مرجع للنموذج
  const formRef = useRef<HTMLFormElement | null>(null);
  
  // التحقق من توفر الحقول المخصصة
  if (!customFields || !customFields.length) return null;
  
  // تصفية الحقول المرئية فقط وترتيبها حسب الترتيب
  const sortedFields = [...customFields]
    .filter(field => field.isVisible === true) // التأكد من عرض الحقول المرئية فقط
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  if (!sortedFields.length) return null;

  // تهيئة الحقول المرئية عند تحميل المكون
  useEffect(() => {
    // وضع جميع الحقول كمرئية افتراضيًا
    const initialVisibility: {[key: string]: boolean} = {};
    sortedFields.forEach(field => {
      const fieldKey = `custom_${field.name}`;
      initialVisibility[fieldKey] = true;
      
      // التحقق من التبعيات
      if (field.dependency && field.dependency.fieldId) {
        // إذا كان الحقل تابعًا لحقل آخر، فإن رؤيته تعتمد على قيمة الحقل الأساسي
        const parentFieldId = field.dependency.fieldId;
        const parentField = customFields.find(f => f.id === parentFieldId);
        
        if (parentField) {
          const parentFieldKey = `custom_${parentField.name}`;
          const requiredValue = field.dependency.value;
          
          // تعيين رؤية الحقل بناءً على قيمة الحقل الأساسي
          if (fieldValues[parentFieldKey] !== requiredValue && requiredValue !== '*') {
            initialVisibility[fieldKey] = false;
          }
        }
      }
    });
    
    setVisibleFields(initialVisibility);
  }, [customFields]);

  // تحديث رابط النموذج مرة واحدة عند التحميل
  useEffect(() => {
    // البحث عن النموذج الأب مرة واحدة فقط
    if (!formRef.current) {
      const parentForm = document.querySelector('form');
      if (parentForm) {
        formRef.current = parentForm;
        console.log("تم العثور على النموذج الأب");
      }
    }
    
    // إنشاء العلاقات بين حقول الولاية والبلدية
    const relations: {[key: string]: string} = {};
    
    // البحث عن حقول الولاية والبلدية المرتبطة
    sortedFields.forEach(field => {
      if (field.type === 'municipality' && field.linkedFields?.provinceField) {
        const provinceField = customFields.find(f => f.id === field.linkedFields?.provinceField);
        if (provinceField) {
          relations[`custom_${field.name}`] = `custom_${provinceField.name}`;
        }
      }
    });
    
    setFieldRelations(relations);
  }, [customFields]);
  
  // معالج تغيير الولاية
  const handleProvinceChange = (province: string, fieldName: string) => {
    console.log(`تغيير الولاية إلى: ${province} في الحقل: ${fieldName}`);
    
    // تحديث قيمة الولاية المحددة
    setSelectedProvinces(prev => ({
      ...prev,
      [fieldName]: province
    }));
    
    // تحديث البلديات المتاحة
    if (MUNICIPALITIES[province]) {
      setAvailableMunicipalities(prev => ({
        ...prev,
        [fieldName]: MUNICIPALITIES[province]
      }));
    } else {
      setAvailableMunicipalities(prev => ({
        ...prev,
        [fieldName]: []
      }));
    }
    
    // تحديث قيم الحقول
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: province
    }));
    
    // تحديث الحقول التابعة
    for (const [municipalityField, provinceField] of Object.entries(fieldRelations)) {
      if (provinceField === fieldName) {
        // إعادة تعيين قيمة البلدية عند تغيير الولاية
        setFieldValues(prev => ({
          ...prev,
          [municipalityField]: ''
        }));
      }
    }
    
    // تحديث الحقول المرئية بناءً على التبعيات
    updateVisibleFieldsBasedOnDependencies(fieldName, province);
  };
  
  // دالة تحديث الحقول المرئية بناءً على التبعيات
  const updateVisibleFieldsBasedOnDependencies = (changedFieldName: string, newValue: any) => {
    const newVisibility = { ...visibleFields };
    
    // البحث عن جميع الحقول التي تعتمد على الحقل المتغير
    sortedFields.forEach(field => {
      if (field.dependency && field.dependency.fieldId) {
        // البحث عن الحقل الأساسي
        const parentField = customFields.find(f => f.id === field.dependency?.fieldId);
        if (parentField) {
          const parentFieldKey = `custom_${parentField.name}`;
          
          // إذا كان الحقل المتغير هو الحقل الأساسي
          if (parentFieldKey === changedFieldName) {
            const fieldKey = `custom_${field.name}`;
            const requiredValue = field.dependency.value;
            
            // تحديث رؤية الحقل بناءً على القيمة الجديدة
            if (requiredValue === '*' || requiredValue === newValue) {
              newVisibility[fieldKey] = true;
            } else {
              newVisibility[fieldKey] = false;
            }
          }
        }
      }
    });
    
    setVisibleFields(newVisibility);
  };
  
  // دالة لمعالجة تغيير قيمة الحقل
  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(`تغيير قيمة الحقل: ${fieldName} إلى:`, value);
    
    // تحديث قيمة الحقل
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // تحديث الحقول المرئية بناءً على التبعيات
    updateVisibleFieldsBasedOnDependencies(fieldName, value);
  };
  
  // تقديم الحقول المرئية فقط
  return (
    <div className="space-y-6 py-4">
      {sortedFields.map((field) => {
        const fieldName = `custom_${field.name}`;
        
        // التحقق من رؤية الحقل
        const isVisible = visibleFields[fieldName] !== false;
        
        if (!isVisible) {
          return null;
        }
        
        return (
          <div key={field.id} className="space-y-2">
            <Label
              htmlFor={`${componentId}-${fieldName}`}
              className={field.required ? "after:content-['*'] after:text-destructive after:mr-1" : ""}
            >
              {field.label}
            </Label>
            
            {field.description && (
              <p className="text-muted-foreground text-sm mb-2">{field.description}</p>
            )}
            
            {renderField(field, fieldName)}
            
            {fieldErrors[fieldName] && (
              <div className="flex items-center mt-1 text-destructive text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                <span>{fieldErrors[fieldName]}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  
  // دالة لعرض الحقل المناسب حسب نوعه
  function renderField(field: ExtendedFormField, fieldName: string) {
    // استقبال قيمة الحقل من الحالة
    const fieldValue = fieldValues[fieldName] || field.defaultValue || '';
    
    // معالج التغيير العام
    const handleChange = (value: any) => {
      handleFieldChange(fieldName, value);
    };
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <Input
            id={`${componentId}-${fieldName}`}
            name={fieldName}
            type={field.type}
            placeholder={field.placeholder}
            required={field.required}
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            id={`${componentId}-${fieldName}`}
            name={fieldName}
            placeholder={field.placeholder}
            required={field.required}
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      
      case 'select':
        return (
          <Select
            name={fieldName}
            value={fieldValue}
            onValueChange={handleChange}
          >
            <SelectTrigger id={`${componentId}-${fieldName}`}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'radio':
        return (
          <RadioGroup
            name={fieldName}
            value={fieldValue}
            onValueChange={handleChange}
            className="flex flex-col space-y-2"
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem id={`${componentId}-${fieldName}-${option.value}`} value={option.value} />
                <Label htmlFor={`${componentId}-${fieldName}-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'checkbox':
        return (
          <div className="flex flex-col space-y-2">
            {field.options?.map((option) => {
              // استخدام مصفوفة للقيم المحددة
              const selectedValues = Array.isArray(fieldValue) ? fieldValue : [fieldValue].filter(Boolean);
              const isChecked = selectedValues.includes(option.value);
              
              return (
                <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={`${componentId}-${fieldName}-${option.value}`}
                    name={`${fieldName}[]`}
                    value={option.value}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const newValues = [...selectedValues];
                      if (checked) {
                        // إضافة القيمة إذا لم تكن موجودة
                        if (!newValues.includes(option.value)) {
                          newValues.push(option.value);
                        }
                      } else {
                        // إزالة القيمة إذا كانت موجودة
                        const index = newValues.indexOf(option.value);
                        if (index !== -1) {
                          newValues.splice(index, 1);
                        }
                      }
                      handleChange(newValues);
                    }}
                  />
                  <Label htmlFor={`${componentId}-${fieldName}-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        );
      
      case 'province':
        return (
          <Select
            name={fieldName}
            value={selectedProvinces[fieldName] || ''}
            onValueChange={(province) => handleProvinceChange(province, fieldName)}
          >
            <SelectTrigger id={`${componentId}-${fieldName}`}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'municipality':
        // البحث عن الولاية المرتبطة
        const relatedProvinceField = fieldRelations[fieldName];
        const selectedProvince = relatedProvinceField ? selectedProvinces[relatedProvinceField] : '';
        const municipalityOptions = 
          (selectedProvince && availableMunicipalities[relatedProvinceField]) 
            ? availableMunicipalities[relatedProvinceField] 
            : [];
        
        return (
          <Select
            name={fieldName}
            value={fieldValue}
            onValueChange={handleChange}
            disabled={!selectedProvince}
          >
            <SelectTrigger id={`${componentId}-${fieldName}`}>
              <SelectValue placeholder={selectedProvince ? field.placeholder : "اختر الولاية أولاً"} />
            </SelectTrigger>
            <SelectContent>
              {municipalityOptions.length > 0 ? (
                municipalityOptions.map((municipality) => (
                  <SelectItem key={municipality} value={municipality}>
                    {municipality}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no_options" disabled>
                  {selectedProvince ? "لا توجد بلديات متاحة" : "اختر الولاية أولاً"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        );
      
      default:
        return null;
    }
  }
};

export default CustomFormFields; 