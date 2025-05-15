import React from "react";
import { Home, Building, MapPin, Phone, Mail, User, MessageSquare, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExtendedFormField } from "./types";

// مكون حقل النص العام
export const TextField = ({ 
  field, 
  className = "",
  updateValue
}: { 
  field: ExtendedFormField & { onChange?: (...event: any[]) => void; onBlur?: (...event: any[]) => void; value?: string; ref?: React.Ref<any> }, 
  className?: string,
  updateValue?: (name: string, value: string) => void
}) => {
  // تغيير نص placeholder للهاتف
  let placeholderText = field.placeholder;
  if (field.type === 'tel' && placeholderText === "أدخل رقم الهاتف") {
    placeholderText = "الهاتف رقم أدخل";
  }
  
  // تحديد الصنف CSS بناءً على نوع الحقل
  const inputClassName = field.type === 'tel' 
    ? "w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground text-right [&::placeholder]:text-right [&::placeholder]:mr-0"
    : "w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground";
  
  // تحديد الخصائص الإضافية لحقل الهاتف
  const telProps = field.type === 'tel' ? {
    dir: "rtl" as const,
    inputMode: "tel" as const,
  } : {};
  
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={field.id} className="block text-sm font-medium mb-2 text-foreground flex items-center">
        {getFieldIcon(field.type)}
        {field.label}
        {field.required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <input
        type={field.type === 'number' ? 'number' : field.type}
        name={field.name} // From RHF via controllerField
        id={field.id}
        placeholder={placeholderText}
        // defaultValue={field.value || field.defaultValue} // RHF controls the value
        required={field.required}
        className={inputClassName}
        style={field.type === 'tel' ? { textAlign: 'right', direction: 'rtl' as const } : undefined}
        {...telProps}
        
        // react-hook-form props
        onChange={(e) => {
          // Call original RHF onChange if it exists
          if (field.onChange) {
            field.onChange(e);
          }
          // Then call custom updateValue if it exists
          if (updateValue && field.name) {
            updateValue(field.name, e.target.value); 
          }
        }}
        onBlur={field.onBlur} // From RHF (via controllerField, and includes our custom handlePhoneBlur)
        value={field.value || field.defaultValue || ''} // Value should be from RHF (via controllerField) or defaultValue if not yet set
        ref={field.ref} // From RHF (via controllerField)
      />
      {field.description && (
        <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
};

// مكون حقل النص متعدد الأسطر
export const TextAreaField = ({ 
  field, 
  className = "",
  updateValue
}: { 
  field: ExtendedFormField, 
  className?: string,
  updateValue?: (name: string, value: string) => void
}) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={field.id} className="block text-sm font-medium mb-2 text-foreground flex items-center">
      <MessageSquare className="w-4 h-4 ml-2 text-primary" />
      {field.label}
      {field.required && <span className="text-red-500 mr-1">*</span>}
    </label>
    <textarea
      name={field.name}
      id={field.id}
      placeholder={field.placeholder}
      defaultValue={field.value || field.defaultValue}
      required={field.required}
      rows={4}
      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm hover:border-muted-foreground"
      onChange={(e) => {
        if (updateValue && field.name) {
          updateValue(field.name, e.target.value);
        }
      }}
    />
    {field.description && (
      <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
    )}
  </div>
);

// مكون حقل القائمة المنسدلة
export const SelectField = ({ 
  field, 
  className = "",
  updateValue
}: { 
  field: ExtendedFormField, 
  className?: string,
  updateValue?: (name: string, value: string) => void
}) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={field.id} className="block text-sm font-medium mb-2 text-foreground flex items-center">
      <ChevronDown className="w-4 h-4 ml-2 text-primary" />
      {field.label}
      {field.required && <span className="text-red-500 mr-1">*</span>}
    </label>
    <div className="relative">
      <select
        name={field.name}
        id={field.id}
        defaultValue={field.value || field.defaultValue || ''}
        required={field.required}
        className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm appearance-none hover:border-muted-foreground"
        onChange={(e) => {
          if (updateValue && field.name) {
            updateValue(field.name, e.target.value);
          }
        }}
      >
        <option value="" disabled>
          {field.placeholder || "اختر..."}
        </option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
    {field.description && (
      <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
    )}
  </div>
);

// مكون حقل الولاية
export const ProvinceField = ({ 
  field, 
  handleProvinceChange,
  className = "",
  updateValue
}: { 
  field: ExtendedFormField, 
  handleProvinceChange: (provinceId: string, municipalityFieldId: string | null) => void,
  className?: string,
  updateValue?: (name: string, value: string) => void
}) => {
  const municipalityFieldId = field.linkedFields?.municipalityField;
  
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={field.id} className="block text-sm font-medium mb-2 text-foreground flex items-center">
        <MapPin className="w-4 h-4 ml-2 text-primary" />
        {field.label}
        {field.required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <div className="relative">
        <select
          name={field.name}
          id={field.id}
          value={field.value || field.defaultValue || ''}
          required={field.required}
          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm appearance-none hover:border-muted-foreground"
          onChange={(e) => {
            const newProvinceId = e.target.value;
            handleProvinceChange(newProvinceId, municipalityFieldId);
            
            // تحديث القيمة في النموذج الأساسي
            if (updateValue && field.name) {
              updateValue(field.name, newProvinceId);
            }
          }}
        >
          <option value="" disabled>
            {field.placeholder || "اختر الولاية..."}
          </option>
          {field.provinces?.map(province => (
            <option key={province.id} value={province.id.toString()}>
              {province.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {field.description && (
        <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
};

// مكون حقل البلدية
export const MunicipalityField = ({ 
  field, 
  recalculateAndSetDeliveryPrice,
  setValue,
  setExtendedFields,
  extendedFields,
  className = "",
  updateValue
}: { 
  field: ExtendedFormField, 
  recalculateAndSetDeliveryPrice: (currentDeliveryType?: string, currentProvinceId?: string, currentMunicipalityId?: string) => void,
  setValue: any,
  setExtendedFields: React.Dispatch<React.SetStateAction<ExtendedFormField[]>>,
  extendedFields: ExtendedFormField[],
  className?: string,
  updateValue?: (name: string, value: string) => void
}) => {
  let provinceId = '';
  const provinceFieldId = field.linkedFields?.provinceField;
  
  if (provinceFieldId) {
    const provinceField = extendedFields.find(f => f.id === provinceFieldId);
    provinceId = provinceField?.value || '';
  } else {
    const provinceField = extendedFields.find(f => f.type === 'province');
    provinceId = provinceField?.value || '';
  }
  
  const deliveryTypeField = extendedFields.find(f => f.type === 'deliveryType');
  const selectedDeliveryType = deliveryTypeField?.value || 'home';
  
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={field.id} className="block text-sm font-medium mb-2 text-foreground flex items-center">
        <MapPin className="w-4 h-4 ml-2 text-primary" />
        {field.label}
        {field.required && <span className="text-red-500 mr-1">*</span>}
      </label>
      
      {field.isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <div className="relative">
          <select
            name={field.name}
            id={field.id}
            value={field.value || field.defaultValue || ''}
            required={field.required}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-background text-foreground shadow-sm appearance-none disabled:bg-muted disabled:text-muted-foreground hover:border-muted-foreground"
            disabled={!field.municipalities || field.municipalities.length === 0}
            onChange={(e) => {
              const municipalityId = e.target.value;
              
              // تحديث القيمة في extendedFields
              const updatedFields = extendedFields.map(f => {
                if (f.id === field.id) {
                  return {
                    ...f,
                    value: municipalityId
                  };
                }
                return f;
              });
              
              setExtendedFields(updatedFields);
              
              // تحديث القيمة في النموذج الأساسي - تحسين معالجة القيمة
              if (field.name && municipalityId) {
                // تأكد من وجود قيمة صالحة
                if (municipalityId !== "" && municipalityId !== "undefined" && municipalityId !== null) {
                  setValue(field.name, municipalityId);
                  
                  // استخدام التابع updateValue لنقل القيمة للنموذج الرئيسي
                  if (updateValue) {
                    updateValue(field.name, municipalityId);
                    
                    // تأكيد تحديث القيمة
                    console.log(`تم تحديث قيمة البلدية (${field.name}) إلى: ${municipalityId}`);
                  }
                  
                  // إعادة حساب سعر التوصيل إذا تغيرت البلدية
                  recalculateAndSetDeliveryPrice(selectedDeliveryType, provinceId, municipalityId);
                }
              }
            }}
          >
            <option value="" disabled>
              {field.placeholder || "اختر البلدية..."}
            </option>
            {field.municipalities?.map(municipality => (
              <option key={municipality.id} value={municipality.id.toString()}>
                {municipality.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      )}
      {field.description && (
        <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
      )}
      {field.municipalities && field.municipalities.length === 0 && !field.isLoading && (
        <p className="text-sm text-yellow-600 mt-2">
          يجب تحديد الولاية أولاً
        </p>
      )}
    </div>
  );
};

// مكون حقل زر الراديو
export const RadioField = ({ 
  field, 
  setExtendedFields,
  extendedFields,
  recalculateAndSetDeliveryPrice,
  className = "",
  updateValue,
  shippingProviderSettings 
}: { 
  field: ExtendedFormField, 
  setExtendedFields: React.Dispatch<React.SetStateAction<ExtendedFormField[]>>,
  extendedFields: ExtendedFormField[],
  recalculateAndSetDeliveryPrice: (currentDeliveryType?: string, currentProvinceId?: string, currentMunicipalityId?: string) => void,
  className?: string,
  updateValue?: (name: string, value: string) => void,
  shippingProviderSettings?: any
}) => {
  // التحقق مما إذا كان هذا الحقل خاص بنوع التوصيل الثابت
  const isDeliveryTypeField = field.name === 'fixedDeliveryType' || field.description?.includes('حقل نوع التوصيل الثابت');
  
  // إذا كان الحقل هو نوع التوصيل الثابت ولدينا إعدادات مزود الشحن، تحقق من الخيارات المتاحة
  if (isDeliveryTypeField && shippingProviderSettings) {
    console.log(">> استخدام RadioField لعرض خيارات التوصيل");
    console.log(">> بيانات مزود الشحن:", shippingProviderSettings);
    
    const isHomeDeliveryEnabled = shippingProviderSettings.is_home_delivery_enabled !== false;
    const isDeskDeliveryEnabled = shippingProviderSettings.is_desk_delivery_enabled !== false;
    
    // أسعار التوصيل من إعدادات مزود الشحن
    const homePrice = shippingProviderSettings.unified_home_price || 0;
    const deskPrice = shippingProviderSettings.unified_desk_price || 0;
    const isFreeHomeDelivery = shippingProviderSettings.is_free_delivery_home === true;
    const isFreeDeskDelivery = shippingProviderSettings.is_free_delivery_desk === true;
    
    console.log(">> خيارات التوصيل المتاحة:", {
      isHomeDeliveryEnabled,
      isDeskDeliveryEnabled,
      homePrice,
      deskPrice,
      isFreeHomeDelivery,
      isFreeDeskDelivery
    });
    
    // تعديل الخيارات المتاحة بناءً على إعدادات مزود الشحن
    let availableOptions = field.options || [];
    
    if (!isHomeDeliveryEnabled) {
      // إزالة خيار التوصيل للمنزل إذا كان غير متاح
      availableOptions = availableOptions.filter(option => option.value !== 'home');
    }
    
    if (!isDeskDeliveryEnabled) {
      // إزالة خيار التوصيل للمكتب إذا كان غير متاح
      availableOptions = availableOptions.filter(option => option.value !== 'desk');
    }
    
    // إعادة بناء الخيارات مع أسعار التوصيل المحدثة
    availableOptions = availableOptions.map(option => {
      if (option.value === 'home') {
        return {
          ...option,
          label: `توصيل للمنزل${isFreeHomeDelivery ? ' (مجاني!)' : ` (${homePrice} دج)`}`
        };
      } else if (option.value === 'desk') {
        return {
          ...option,
          label: `استلام من مكتب شركة التوصيل${isFreeDeskDelivery ? ' (مجاني!)' : ` (${deskPrice} دج)`}`
        };
      }
      return option;
    });
    
    // إذا لم تكن هناك خيارات متاحة، اعرض رسالة
    if (availableOptions.length === 0) {
      return (
        <div className={`mb-4 ${className}`}>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-500">
            لا توجد خيارات توصيل متاحة حاليًا. يرجى الاتصال بالدعم.
          </div>
        </div>
      );
    }
    
    // إذا كان هناك خيار واحد فقط متاح، اعرضه كخيار وحيد
    if (availableOptions.length === 1) {
      const option = availableOptions[0];
      let buttonText = option.label;
      let priceText = "";
      
      // إضافة السعر المناسب
      if (option.value === 'home') {
        priceText = isFreeHomeDelivery ? 
          "شحن مجاني!" : 
          `سعر الشحن: ${homePrice} دج`;
      } else if (option.value === 'desk') {
        priceText = isFreeDeskDelivery ? 
          "شحن مجاني!" : 
          `سعر الشحن: ${deskPrice} دج`;
      }
      
      // تحديث قيمة الحقل في النموذج
      if (field.value !== option.value) {
        const updatedFields = extendedFields.map(f => {
          if (f.id === field.id) {
            return {
              ...f,
              value: option.value
            };
          }
          return f;
        });
        setExtendedFields(updatedFields);
        
        // تحديث النموذج الأساسي
        if (updateValue) {
          updateValue(field.name, option.value);
          console.log(`>> تحديث حقل ${field.name} في النموذج الأساسي بقيمة: ${option.value}`);
        }
        
        // تحديث قيمة deliveryOption في النموذج الأساسي
        if (updateValue) {
          updateValue('deliveryOption', option.value);
          console.log(`>> تحديث نوع التوصيل في النموذج الأساسي من حقل نوع التوصيل الثابت: ${option.value}`);
        }
      }
      
      return (
        <div className={`mb-4 ${className}`}>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <div className="space-y-3 bg-background p-4 rounded-lg border border-primary bg-primary/10 transition-all">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="relative">
                <input
                  type="radio"
                  name={field.name}
                  id={`${field.name}-${option.value}`}
                  value={option.value}
                  checked={true}
                  readOnly
                  className="ml-2 h-4 w-4 text-primary border-border focus:ring-primary"
                />
              </div>
              <label htmlFor={`${field.name}-${option.value}`} className="text-sm">
                <div>
                  {option.value === 'home' ? 'توصيل للمنزل' : 'استلام من مكتب شركة التوصيل'}
                  <div className="text-xs mt-1 text-muted-foreground">
                    {option.value === 'home' ? 'توصيل الطلب مباشرة إلى عنوانك' : 'استلام الطلب من مكتب شركة التوصيل'}
                  </div>
                  <div className="text-xs mt-1 text-blue-600">
                    {priceText}
                  </div>
                </div>
              </label>
            </div>
          </div>
          <input type="hidden" name={field.name} value={option.value} />
          <p className="mt-1 text-xs text-blue-600">
            هذا هو الخيار الوحيد المتاح حاليًا بناءً على إعدادات التوصيل
          </p>
        </div>
      );
    }

    // استخدام الخيارات المتاحة فقط
    field = { ...field, options: availableOptions };
    
    // استخدام تصميم أكثر جاذبية للخيارات المتعددة
    return (
      <div className={`mb-4 ${className}`}>
        <label className="block text-sm font-medium mb-2 text-foreground">
          {field.label}
          {field.required && <span className="text-red-500 mr-1">*</span>}
        </label>
        <div className="space-y-3">
          {availableOptions.map((option) => {
            // تحديد سعر ونص الخيار
            let priceText = "";
            if (option.value === 'home') {
              priceText = isFreeHomeDelivery ? 
                "شحن مجاني!" : 
                `سعر الشحن: ${homePrice} دج`;
            } else if (option.value === 'desk') {
              priceText = isFreeDeskDelivery ? 
                "شحن مجاني!" : 
                `سعر الشحن: ${deskPrice} دج`;
            }
            
            const isSelected = field.value === option.value;
            
            return (
              <div 
                key={option.value}
                className={`flex items-center p-4 border rounded-lg cursor-pointer ${isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-input hover:border-muted-foreground'}`}
                onClick={() => {
                  const updatedFields = extendedFields.map(f => 
                    f.id === field.id ? { ...f, value: option.value } : f
                  );
                  setExtendedFields(updatedFields);
                  
                  // تحديث النموذج الأساسي
                  if (updateValue) {
                    updateValue(field.name, option.value);
                    console.log(`>> تحديث حقل ${field.name} في النموذج الأساسي بقيمة: ${option.value}`);
                  }
                  
                  // تحديث قيمة deliveryOption في النموذج الأساسي
                  if (updateValue) {
                    updateValue('deliveryOption', option.value);
                    console.log(`>> تحديث نوع التوصيل في النموذج الأساسي من حقل نوع التوصيل الثابت: ${option.value}`);
                  }
                  
                  const provinceField = extendedFields.find(f => f.type === 'province');
                  const municipalityField = extendedFields.find(f => f.type === 'municipality');
                  
                  if (provinceField?.value) {
                    recalculateAndSetDeliveryPrice(option.value, provinceField.value, municipalityField?.value);
                  }
                }}
              >
                <div className="relative">
                  <input
                    type="radio"
                    name={field.name}
                    id={`${field.name}-${option.value}`}
                    value={option.value}
                    checked={isSelected}
                    onChange={() => {}}
                    className="opacity-0 absolute"
                  />
                  <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-input'}`}>
                    {isSelected && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                  </div>
                </div>
                <label htmlFor={`${field.name}-${option.value}`} className="flex-1">
                  <div className="flex items-center">
                    {option.value === 'home' ? 
                      <Home className="ml-3 h-5 w-5 text-primary" /> : 
                      <Building className="ml-3 h-5 w-5 text-primary" />
                    }
                    <div>
                      <span className="font-medium block text-foreground">
                        {option.value === 'home' ? 'توصيل للمنزل' : 'استلام من مكتب شركة التوصيل'}
                      </span>
                      <span className="text-xs text-muted-foreground block mt-1">
                        {option.value === 'home' ? 'توصيل الطلب مباشرة إلى عنوانك' : 'استلام الطلب من مكتب شركة التوصيل'}
                      </span>
                      <span className={`text-xs font-medium block mt-1 ${
                        option.value === 'home' ? 
                          (isFreeHomeDelivery ? 'text-green-600' : 'text-blue-600') : 
                          (isFreeDeskDelivery ? 'text-green-600' : 'text-blue-600')
                      }`}>
                        {priceText}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
        {field.description && (
          <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  }
  
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium mb-2 text-foreground">
        {field.label}
        {field.required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <div className="space-y-3 bg-background p-4 rounded-lg border border-border hover:border-muted-foreground transition-all">
        {field.options?.map((option) => (
          <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
              <input
                type="radio"
                name={field.name}
                id={`${field.name}-${option.value}`}
                value={option.value}
                defaultChecked={field.defaultValue === option.value || field.value === option.value}
                required={field.required}
                className="ml-2 h-4 w-4 text-primary border-border focus:ring-primary"
                onChange={(e) => {
                  const updatedFields = extendedFields.map(f => 
                    f.id === field.id ? { ...f, value: e.target.value } : f
                  );
                  setExtendedFields(updatedFields);
                  
                  // تحديث النموذج الأساسي
                  if (updateValue) {
                    updateValue(field.name, e.target.value);
                    console.log(`>> تحديث حقل ${field.name} في النموذج الأساسي بقيمة: ${e.target.value}`);
                  }
                  
                  // إذا كان الحقل متعلق بنوع التوصيل، قم بتحديث قيمة deliveryOption في النموذج الأساسي
                  if (field.name === 'deliveryOption' || field.name === 'fixedDeliveryType') {
                    if (updateValue) {
                      updateValue('deliveryOption', e.target.value);
                      console.log(`>> تحديث نوع التوصيل في النموذج الأساسي من حقل ${field.name}: ${e.target.value}`);
                    }
                    
                    const provinceField = extendedFields.find(f => f.type === 'province');
                    const municipalityField = extendedFields.find(f => f.type === 'municipality');
                    
                    if (provinceField?.value) {
                      recalculateAndSetDeliveryPrice(e.target.value, provinceField.value, municipalityField?.value);
                    }
                  }
                }}
              />
            </div>
            <label htmlFor={`${field.name}-${option.value}`} className="text-sm cursor-pointer">
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {field.description && (
        <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
};

// مكون حقل الاختيار المتعدد
export const CheckboxField = ({ field, className = "" }: { field: ExtendedFormField, className?: string }) => (
  <div className={`mb-4 ${className}`}>
    <label className="block text-sm font-medium mb-2 text-foreground">
      {field.label}
      {field.required && <span className="text-red-500 mr-1">*</span>}
    </label>
    <div className="space-y-3 bg-background p-4 rounded-lg border border-border hover:border-muted-foreground transition-all">
      {field.options?.map((option) => (
        <div key={option.value} className="flex items-center space-x-2 space-x-reverse">
          <input
            type="checkbox"
            name={`${field.name}[${option.value}]`}
            id={`${field.name}-${option.value}`}
            value={option.value}
            defaultChecked={field.defaultValue === option.value}
            className="ml-2 h-4 w-4 rounded text-primary border-border focus:ring-primary"
          />
          <label htmlFor={`${field.name}-${option.value}`} className="text-sm cursor-pointer">
            {option.label}
          </label>
        </div>
      ))}
    </div>
    {field.description && (
      <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
    )}
  </div>
);

// وظيفة لإرجاع الأيقونة المناسبة لكل نوع حقل
export const getFieldIcon = (fieldType: string) => {
  switch (fieldType) {
    case 'text':
      return <User className="w-4 h-4 ml-2 text-primary" />;
    case 'email':
      return <Mail className="w-4 h-4 ml-2 text-primary" />;
    case 'tel':
      return <Phone className="w-4 h-4 ml-2 text-primary" />;
    case 'province':
    case 'municipality':
      return <MapPin className="w-4 h-4 ml-2 text-primary" />;
    case 'textarea':
      return <MessageSquare className="w-4 h-4 ml-2 text-primary" />;
    case 'deliveryType':
      return <Building className="w-4 h-4 ml-2 text-primary" />;
    default:
      return null;
  }
}; 