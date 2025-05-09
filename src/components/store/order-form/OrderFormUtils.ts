import { UseFormReturn } from "react-hook-form";
import { CustomFormField, OrderFormValues } from "./OrderFormTypes";

/**
 * تحديد الحقول المتوفرة في النموذج المخصص
 */
export const getAvailableCustomFields = (customFields: CustomFormField[]): Set<string> => {
  const fieldNames = new Set<string>();
  
  if (!customFields || customFields.length === 0) {
    return fieldNames;
  }
  
  customFields.filter(field => field.isVisible).forEach(field => {
    fieldNames.add(field.name);
  });
  
  return fieldNames;
};

/**
 * تجميع البيانات من النموذج المخصص
 */
export const collectCustomFormData = (
  formElement: HTMLFormElement,
  customFields: CustomFormField[]
): Record<string, any> | null => {
  if (!formElement || !customFields || customFields.length === 0) {
    return null;
  }
  
  console.log("بدء تجميع بيانات النموذج المخصص");
  const formData = new FormData(formElement);
  const customFormData: Record<string, any> = {};
  
  // إضافة قاموس للتسميات الحقلية
  customFormData.fieldLabels = {};
  
  // تحديد الحقول الأساسية التي نحتاج لاستخراجها دائمًا
  const essentialFields = ['fullName', 'phone', 'province', 'municipality', 'address', 'deliveryOption'];
  
  // جمع بيانات الحقول المخصصة
  customFields.filter(field => field.isVisible).forEach(field => {
    const fieldName = `custom_${field.name}`;
    console.log(`محاولة تجميع حقل: ${fieldName}`);
    
    // إضافة تسمية الحقل للقاموس
    customFormData.fieldLabels[field.name] = field.label;
    
    if (field.type === 'checkbox') {
      // للحقول متعددة الاختيار، نجمع القيم كمصفوفة
      const checkboxValues = Array.from(formElement.querySelectorAll(`input[name="${fieldName}[]"]:checked`)).map(el => (el as HTMLInputElement).value);
      console.log(`قيم الاختيارات لـ ${fieldName}:`, checkboxValues);
      if (checkboxValues.length > 0) {
        customFormData[field.name] = checkboxValues;
      }
    } else if (field.type === 'radio') {
      // للحقول ذات الخيار الواحد
      const radioValue = formElement.querySelector(`input[name="${fieldName}"]:checked`) as HTMLInputElement;
      if (radioValue) {
        console.log(`قيمة ${fieldName} (راديو):`, radioValue.value);
        customFormData[field.name] = radioValue.value;
      }
    } else {
      // للحقول العادية (نص، رقم، إلخ)
      let value: FormDataEntryValue | null = null;
      
      // محاولة الحصول على القيمة من الحقل بالبادئة
      value = formData.get(fieldName);
      
      // إذا لم يتم العثور على القيمة، حاول بدون البادئة
      if (!value || value === "") {
        value = formData.get(field.name);
      }
      
      console.log(`قيمة ${field.name}:`, value);
      if (value !== null && value !== "") {
        customFormData[field.name] = value;
      }
    }
  });
  
  // استخراج الحقول الأساسية من النموذج إذا لم يتم العثور عليها في النموذج المخصص
  essentialFields.forEach(fieldName => {
    if (customFormData[fieldName] === undefined || customFormData[fieldName] === "") {
      // محاولة الحصول على القيمة من الحقل الأساسي
      const value = formData.get(fieldName);
      if (value !== null && value !== "") {
        console.log(`تم استخراج ${fieldName} من النموذج الأساسي:`, value);
        customFormData[fieldName] = value;
      }
      
      // محاولة الحصول على القيمة من الحقول المخصصة بإضافة البادئة custom_
      const customValue = formData.get(`custom_${fieldName}`);
      if (customValue !== null && customValue !== "" && (!value || value === "")) {
        console.log(`تم استخراج ${fieldName} من حقل مخصص:`, customValue);
        customFormData[fieldName] = customValue;
      }
    }
  });
  
  // استخراج حقول إضافية للتوصيل إذا كانت موجودة
  ['deliveryCompany', 'deliveryOption', 'paymentMethod', 'notes'].forEach(fieldName => {
    if (customFormData[fieldName] === undefined || customFormData[fieldName] === "") {
      const value = formData.get(fieldName);
      if (value !== null && value !== "") {
        console.log(`تم استخراج ${fieldName}:`, value);
        customFormData[fieldName] = value;
      }
    }
  });
  
  // التحقق من وجود البيانات الأساسية وإضافة قيم افتراضية إذا كانت مفقودة
  if (!customFormData.deliveryOption) {
    customFormData.deliveryOption = "home";
  }
  
  if (!customFormData.paymentMethod) {
    customFormData.paymentMethod = "cod";  // الدفع عند الاستلام
  }
  
  if (!customFormData.address && customFormData.municipality) {
    customFormData.address = customFormData.municipality;
  }
  
  console.log("بيانات النموذج المخصص المجمعة:", customFormData);
  return customFormData;
};

/**
 * نقل البيانات من النموذج المخصص إلى نموذج react-hook-form
 */
export const transferCustomFormData = (
  formElement: HTMLFormElement,
  customFields: CustomFormField[],
  form: UseFormReturn<OrderFormValues>
): void => {
  if (!formElement || !customFields || customFields.length === 0) {
    return;
  }
  
  console.log("نقل بيانات النموذج المخصص إلى react-hook-form");
  const formData = new FormData(formElement);
  
  // تحديث القيم في react-hook-form مباشرة - فقط للحقول المتوفرة في النموذج المخصص
  customFields.filter(field => field.isVisible).forEach(field => {
    const fieldName = `custom_${field.name}`;
    const value = formData.get(fieldName);
    
    // التعامل مع الحقول الأساسية وإضافتها إلى نموذج react-hook-form
    if (field.name === 'fullName' || field.name === 'phone' || field.name === 'province' || 
        field.name === 'municipality' || field.name === 'address') {
      if (value !== null && value !== "") {
        form.setValue(field.name as any, value as string, { shouldValidate: true });
        console.log(`تم نقل قيمة ${field.name}: ${value} إلى النموذج الأساسي`);
      }
    }
  });
  
  // تحديث حالة النموذج
  form.trigger();
};

/**
 * التحقق من وجود حقول إجبارية غير معبأة في النموذج المخصص
 */
export const validateCustomForm = (
  formElement: HTMLFormElement,
  customFields: CustomFormField[]
): { isValid: boolean, errorMessages: string[] } => {
  if (!formElement || !customFields || customFields.length === 0) {
    return { isValid: true, errorMessages: [] };
  }
  
  console.log("جاري التحقق من النموذج المخصص");
  
  // التحقق من الحقول الإجبارية في النموذج المخصص
  const requiredFields = customFields.filter(field => field.isVisible && field.required);
  let isValid = true;
  let errorMessages: string[] = [];
  
  for (const field of requiredFields) {
    const formData = new FormData(formElement);
    const fieldName = `custom_${field.name}`;
    const value = field.type === 'checkbox' 
      ? formData.getAll(`${fieldName}[]`) 
      : formData.get(fieldName);
      
    console.log(`التحقق من الحقل ${field.name}:`, value);
    
    if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === "string" && value.trim() === "")) {
      isValid = false;
      errorMessages.push(`الحقل "${field.label}" مطلوب`);
      
      // إضافة رسالة خطأ للحقل
      const fieldElement = document.getElementById(field.name);
      if (fieldElement) {
        fieldElement.classList.add('border-red-500');
      }
    }
  }
  
  return { isValid, errorMessages };
}; 