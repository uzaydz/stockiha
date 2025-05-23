import React, { useState, useEffect, useRef } from "react";
import { Home, Building, Truck, Check, AlertCircle } from "lucide-react";
import { DeliveryTypeFieldProps } from "./types";

export const DeliveryTypeField: React.FC<DeliveryTypeFieldProps> = ({
  field,
  extendedFields,
  setExtendedFields,
  setValue,
  recalculateAndSetDeliveryPrice,
  handleProvinceChange,
  updateValue,
  shippingProviderSettings,
}) => {
  // يستخدم هذا المرجع للتحكم في تنفيذ useEffect مرة واحدة فقط بعد تحميل الإعدادات
  const settingsProcessedRef = useRef(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // إضافة آلية الكشف عن خيارات التوصيل من إعدادات مزود الشحن
  const detectDeliveryOptions = () => {
    // القيم الافتراضية إذا لم تكن هناك إعدادات
    let homeEnabled = true;
    let deskEnabled = true;
    let defaultType = field.defaultValue || 'home';
    
    if (shippingProviderSettings) {
      
      
      // التحقق بشكل صريح من نوع القيم
      homeEnabled = shippingProviderSettings.is_home_delivery_enabled === true;
      deskEnabled = shippingProviderSettings.is_desk_delivery_enabled === true;
      
      // تحديد النوع الافتراضي بناءً على الخيارات المتاحة
      if (!homeEnabled && deskEnabled) {
        defaultType = 'desk';
        
      } else if (homeEnabled && !deskEnabled) {
        defaultType = 'home';
        
      }
      
      // الحالة الخاصة: لم يتم تمكين أي خيارات
      if (!homeEnabled && !deskEnabled) {
        homeEnabled = true; // تفعيل المنزل افتراضيًا
        
      }
    } else {
      
    }
    
    return { homeEnabled, deskEnabled, defaultType };
  };

  // تحديد القيمة الافتراضية بناءً على الإعدادات
  const getDefaultValue = () => {
    const { defaultType } = detectDeliveryOptions();
    
    return defaultType;
  };
  
  // تهيئة حالة المكون
  const [selectedDeliveryType, setSelectedDeliveryType] = useState(getDefaultValue());
  const { homeEnabled, deskEnabled } = detectDeliveryOptions();
  const [isHomeDeliveryEnabled, setIsHomeDeliveryEnabled] = useState(homeEnabled);
  const [isDeskDeliveryEnabled, setIsDeskDeliveryEnabled] = useState(deskEnabled);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // البحث عن حقل البلدية المرتبط
  const municipalityField = extendedFields.find(f => f.type === 'municipality');
  // البحث عن حقل الولاية المرتبط
  const provinceField = extendedFields.find(f => f.type === 'province');
  
  // تأثير لتحديث خيارات التوصيل المتاحة عند تغير إعدادات مزود الشحن
  useEffect(() => {
    // تجنب التنفيذ المبكر قبل تحميل الإعدادات
    if (!shippingProviderSettings && !settingsProcessedRef.current) {
      
      return;
    }
    
    // تنظيف أي مؤقتات سابقة
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }
    
    // تنفيذ التهيئة بعد تأخير قصير لضمان تحميل الإعدادات بشكل كامل
    initializationTimeoutRef.current = setTimeout(() => {
      const { homeEnabled, deskEnabled, defaultType } = detectDeliveryOptions();
      
      
      
      // تحديث حالة الخيارات المتاحة
      setIsHomeDeliveryEnabled(homeEnabled);
      setIsDeskDeliveryEnabled(deskEnabled);
      
      // إذا لم يتم التهيئة بعد، قم بتهيئة القيمة الافتراضية
      if (!hasInitialized) {
        
        
        // تحديث قيمة المكون المحلية
        setSelectedDeliveryType(defaultType);
        
        // تحديث قيمة extendedFields
        const updatedFields = extendedFields.map(f => 
          f.id === field.id ? { ...f, value: defaultType } : f
        );
        setExtendedFields(updatedFields);
        
        // تحديث قيمة deliveryOption في النموذج
        if (updateValue) {
          updateValue('deliveryOption', defaultType);
        }
        
        // تحديث react-hook-form
        if (field.name && setValue) {
          setValue(field.name, defaultType);
        }
        
        // الحصول على القيم الحالية للولاية والبلدية
        const provinceValue = provinceField?.value || '';
        const municipalityValue = municipalityField?.value || '';
        
        // إعادة حساب سعر التوصيل باستخدام القيم الحالية إذا كانت الولاية محددة
        if (provinceValue) {
          recalculateAndSetDeliveryPrice(defaultType, provinceValue, municipalityValue);
        }
        
        setHasInitialized(true);
      }
      // إذا تم التهيئة بالفعل، لكن هناك تغيير في الإعدادات، قم بتحديث الخيار المحدد إذا لزم الأمر
      else if (selectedDeliveryType === 'home' && !homeEnabled && deskEnabled) {
        
        updateDeliveryOption('desk');
      } else if (selectedDeliveryType === 'desk' && !deskEnabled && homeEnabled) {
        
        updateDeliveryOption('home');
      }
      
      // ضع علامة على أنه تم معالجة الإعدادات
      settingsProcessedRef.current = true;
    }, 100);
    
    // تنظيف المؤقت عند إلغاء تحميل المكون
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [shippingProviderSettings]);
  
  
  
  // تحديث القيمة المحددة والنموذج عند تغيير نوع التوصيل
  const updateDeliveryOption = (type: string) => {
    // التحقق من صلاحية الخيار المطلوب
    if (type === 'home' && !isHomeDeliveryEnabled) {
      type = 'desk'; // استخدام المكتب بدلاً من المنزل إذا كان المنزل غير متاح
      
    } else if (type === 'desk' && !isDeskDeliveryEnabled) {
      type = 'home'; // استخدام المنزل بدلاً من المكتب إذا كان المكتب غير متاح
      
    }
    
    
    setSelectedDeliveryType(type);
    
    // تحديث قيمة react-hook-form إذا كان الحقل له اسم
    if (field.name) {
      setValue(field.name, type);
    }
    
    // تحديث قيمة deliveryOption في النموذج الأساسي
    if (updateValue) {
      updateValue('deliveryOption', type);
    }
  };
  
  // دالة لمعالجة تغيير نوع التوصيل
  const handleDeliveryTypeChange = async (type: string) => {
    updateDeliveryOption(type);
    
    // الحصول على القيم الحالية للولاية والبلدية
    const provinceValue = provinceField?.value || '';
    const municipalityValue = municipalityField?.value || '';
    
    // إعادة حساب سعر التوصيل باستخدام القيم الحالية
    if (provinceValue) {
      if (municipalityField && municipalityField.id) {
        await handleProvinceChange(provinceValue, municipalityField.id, type);
      } else {
        recalculateAndSetDeliveryPrice(type, provinceValue, municipalityValue);
      }
    }
  };
  
  // تحقق مما إذا كان هناك خيار واحد فقط متاح
  const forceOneOption = (!isHomeDeliveryEnabled && isDeskDeliveryEnabled) || (isHomeDeliveryEnabled && !isDeskDeliveryEnabled);
  
  // الخيارات المتاحة استنادًا إلى إعدادات مزود الشحن
  const homePrice = shippingProviderSettings?.unified_home_price || 0;
  const deskPrice = shippingProviderSettings?.unified_desk_price || 0;
  const isFreeHomeDelivery = shippingProviderSettings?.is_free_delivery_home || false;
  const isFreeDeskDelivery = shippingProviderSettings?.is_free_delivery_desk || false;
  
  // عرض الحالات الخاصة للخيار الواحد
  if (forceOneOption) {
    
    
    // خيار المنزل فقط
    if (isHomeDeliveryEnabled && !isDeskDeliveryEnabled) {
      return (
        <div className="mb-6 col-span-1 md:col-span-2">
          <h3 className="block text-sm font-medium mb-3 text-foreground flex items-center">
            <Truck className="ml-2 h-5 w-5 text-primary" />
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </h3>
          
          <div className="flex items-center p-4 border border-primary rounded-lg bg-primary/10">
            <Home className="ml-3 h-5 w-5 text-primary" />
            <div>
              <span className="font-medium block text-foreground">توصيل للمنزل</span>
              <span className="text-xs text-muted-foreground block mt-1">سيتم توصيل الطلب إلى عنوانك</span>
              {isFreeHomeDelivery ? (
                <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
              ) : (
                <span className="text-xs text-blue-600 font-medium block mt-1">سعر الشحن: {homePrice} دج</span>
              )}
            </div>
          </div>
          
          <input type="hidden" name={field.name} value="home" />
        </div>
      );
    }
    
    // خيار المكتب فقط
    if (!isHomeDeliveryEnabled && isDeskDeliveryEnabled) {
      return (
        <div className="mb-6 col-span-1 md:col-span-2">
          <h3 className="block text-sm font-medium mb-3 text-foreground flex items-center">
            <Truck className="ml-2 h-5 w-5 text-primary" />
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </h3>
          
          <div className="flex items-center p-4 border border-primary rounded-lg bg-primary/10">
            <Building className="ml-3 h-5 w-5 text-primary" />
            <div>
              <span className="font-medium block text-foreground">استلام من مكتب شركة التوصيل</span>
              <span className="text-xs text-muted-foreground block mt-1">استلام الطلب من مكتب شركة التوصيل</span>
              {isFreeDeskDelivery ? (
                <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
              ) : (
                <span className="text-xs text-blue-600 font-medium block mt-1">سعر الشحن: {deskPrice} دج</span>
              )}
            </div>
          </div>
          
          <input type="hidden" name={field.name} value="desk" />
        </div>
      );
    }
  }
  
  // عرض الخيارات المتاحة فقط
  return (
    <div className="mb-6 col-span-1 md:col-span-2">
      <h3 className="block text-sm font-medium mb-3 text-foreground flex items-center">
        <Truck className="ml-2 h-5 w-5 text-primary" />
        {field.label}
        {field.required && <span className="text-red-500 mr-1">*</span>}
      </h3>
      
      <div className="grid grid-cols-1 gap-4">
        {isHomeDeliveryEnabled && (
          <div 
            className={`flex items-center p-4 border rounded-lg ${selectedDeliveryType === 'home' ? 'border-primary bg-primary/10 shadow-sm' : 'border-input'}`}
            onClick={() => handleDeliveryTypeChange('home')}
          >
            <div className="relative">
              <input
                type="radio"
                name={field.name}
                id={`${field.name}-home`}
                value="home"
                checked={selectedDeliveryType === 'home'}
                onChange={() => handleDeliveryTypeChange('home')}
                className="opacity-0 absolute"
              />
              <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center ${selectedDeliveryType === 'home' ? 'border-primary' : 'border-input'}`}>
                {selectedDeliveryType === 'home' && <Check className="h-3 w-3 text-primary" />}
              </div>
            </div>
            <label htmlFor={`${field.name}-home`} className="flex-1">
              <div className="flex items-center">
                <Home className="ml-3 h-5 w-5 text-primary" />
                <div>
                  <span className="font-medium block text-foreground">توصيل للمنزل</span>
                  <span className="text-xs text-muted-foreground block mt-1">توصيل الطلب مباشرة إلى عنوانك</span>
                  {isFreeHomeDelivery ? (
                    <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
                  ) : (
                    <span className="text-xs text-blue-600 font-medium block mt-1">سعر الشحن: {homePrice} دج</span>
                  )}
                </div>
              </div>
            </label>
          </div>
        )}
        
        {isDeskDeliveryEnabled && (
          <div 
            className={`flex items-center p-4 border rounded-lg ${selectedDeliveryType === 'desk' ? 'border-primary bg-primary/10 shadow-sm' : 'border-input'}`}
            onClick={() => handleDeliveryTypeChange('desk')}
          >
            <div className="relative">
              <input
                type="radio"
                name={field.name}
                id={`${field.name}-desk`}
                value="desk"
                checked={selectedDeliveryType === 'desk'}
                onChange={() => handleDeliveryTypeChange('desk')}
                className="opacity-0 absolute"
              />
              <div className={`w-5 h-5 rounded-full border mr-2 flex items-center justify-center ${selectedDeliveryType === 'desk' ? 'border-primary' : 'border-input'}`}>
                {selectedDeliveryType === 'desk' && <Check className="h-3 w-3 text-primary" />}
              </div>
            </div>
            <label htmlFor={`${field.name}-desk`} className="flex-1">
              <div className="flex items-center">
                <Building className="ml-3 h-5 w-5 text-primary" />
                <div>
                  <span className="font-medium block text-foreground">استلام من مكتب شركة التوصيل</span>
                  <span className="text-xs text-muted-foreground block mt-1">استلام الطلب من مكتب شركة التوصيل</span>
                  {isFreeDeskDelivery ? (
                    <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
                  ) : (
                    <span className="text-xs text-blue-600 font-medium block mt-1">سعر الشحن: {deskPrice} دج</span>
                  )}
                </div>
              </div>
            </label>
          </div>
        )}
        
        <input type="hidden" name={field.name} value={selectedDeliveryType} />
      </div>
    </div>
  );
}; 