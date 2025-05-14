export { default as OrderSuccess } from './OrderSuccess';
export { default as PersonalInfoFields } from './PersonalInfoFields';
export { default as DeliveryInfoFields } from './DeliveryInfoFields';
export { CustomFormFields } from './CustomFormFields';
export { default as OrderSummary } from './OrderSummary';
export * from './OrderFormTypes';

// تصدير المكونات الجديدة
export * from './DatabaseConnection';
export * from './OrderFormSubmitter';
export * from './OrderFormUtils';

// تصدير الوظائف المتعلقة بمزودي الشحن المستنسخين
export {
  getShippingProviderClone,
  getAvailableProvincesForClone,
  calculateShippingFee
} from './OrderFormUtils';

// وظائف مساعدة مضافة
// التحقق من اتصال قاعدة البيانات
export async function checkDatabaseConnection() {
  try {
    const response = await fetch('/api/check-connection', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      return true;
    }
    
    console.error('فشل الاتصال بقاعدة البيانات:', response.statusText);
    return false;
  } catch (error) {
    console.error('خطأ أثناء التحقق من اتصال قاعدة البيانات:', error);
    return false;
  }
}

// جمع بيانات النموذج المخصص
export function collectCustomFormData(form: HTMLFormElement, fields: any[]) {
  try {
    if (!form) {
      console.error('لم يتم العثور على النموذج');
      return null;
    }
    
    const formData = new FormData(form);
    const data: {[key: string]: any} = {};
    
    // جمع البيانات من جميع الحقول المخصصة
    fields.forEach(field => {
      if (!field.isVisible) return;
      
      const fieldName = `custom_${field.name}`;
      
      // معالجة خاصة لمربعات الاختيار (الإدخالات المتعددة)
      if (field.type === 'checkbox') {
        const checkboxValues = formData.getAll(`${fieldName}[]`);
        if (checkboxValues && checkboxValues.length > 0) {
          data[field.name] = checkboxValues;
        }
      } else {
        // معالجة باقي أنواع الحقول
        const value = formData.get(fieldName);
        if (value !== null && value !== undefined && value !== '') {
          data[field.name] = value;
        }
      }
    });
    
    return data;
  } catch (error) {
    console.error('خطأ في جمع بيانات النموذج المخصص:', error);
    return null;
  }
}

// التحقق من صحة النموذج المخصص
export function validateCustomForm(form: HTMLFormElement, fields: any[]) {
  try {
    const errorMessages: string[] = [];
    let isValid = true;
    
    // جمع البيانات من النموذج
    const formData = new FormData(form);
    
    // التحقق من جميع الحقول المرئية
    fields.forEach(field => {
      if (!field.isVisible) return;
      
      const fieldName = `custom_${field.name}`;
      let value;
      
      // معالجة خاصة لمربعات الاختيار
      if (field.type === 'checkbox') {
        value = formData.getAll(`${fieldName}[]`);
      } else {
        value = formData.get(fieldName);
      }
      
      // التحقق من الحقول المطلوبة
      if (field.required) {
        if (Array.isArray(value) && value.length === 0) {
          errorMessages.push(`حقل "${field.label}" مطلوب`);
          isValid = false;
        } else if (value === null || value === undefined || value === '') {
          errorMessages.push(`حقل "${field.label}" مطلوب`);
          isValid = false;
        }
      }
      
      // التحقق من قواعد التحقق
      if (value && field.validation) {
        const stringValue = String(value);
        
        if (field.validation.minLength && stringValue.length < field.validation.minLength) {
          errorMessages.push(`${field.label}: يجب أن يحتوي على الأقل ${field.validation.minLength} أحرف`);
          isValid = false;
        }
        
        if (field.validation.maxLength && stringValue.length > field.validation.maxLength) {
          errorMessages.push(`${field.label}: يجب ألا يتجاوز ${field.validation.maxLength} حرف`);
          isValid = false;
        }
        
        if (field.validation.pattern) {
          const pattern = new RegExp(field.validation.pattern);
          if (!pattern.test(stringValue)) {
            errorMessages.push(field.validation.message || `${field.label}: القيمة غير صالحة`);
            isValid = false;
          }
        }
      }
    });
    
    return { isValid, errorMessages };
  } catch (error) {
    console.error('خطأ في التحقق من صحة النموذج المخصص:', error);
    return { isValid: false, errorMessages: ['حدث خطأ أثناء التحقق من النموذج'] };
  }
}

// نقل بيانات النموذج المخصصة إلى النموذج الأساسي
export function transferCustomFormData(customFormData: any, baseForm: any) {
  try {
    // نسخ بيانات النموذج المخصص إلى النموذج الأساسي حسب الاسم
    for (const [key, value] of Object.entries(customFormData)) {
      if (baseForm.hasOwnProperty(key)) {
        baseForm[key] = value;
      }
    }
    
    return baseForm;
  } catch (error) {
    console.error('خطأ في نقل بيانات النموذج المخصص:', error);
    return baseForm;
  }
} 