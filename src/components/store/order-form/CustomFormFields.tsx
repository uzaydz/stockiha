import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTenant } from "@/context/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import { User, MapPin, Phone, Mail, MessageSquare, Building, Package2, CreditCard, Home } from "lucide-react";
import { getProvinces, getMunicipalities, calculateDeliveryPrice } from "@/api/yalidine/service";
import { DeliveryTypeField } from "./DeliveryTypeField";
import { 
  TextField, 
  TextAreaField, 
  SelectField, 
  ProvinceField, 
  MunicipalityField, 
  RadioField, 
  CheckboxField 
} from "./FormFieldComponents";
import { supabase } from '@/lib/supabase-client';

// استيراد ملف التنسيقات
import "./form.css";

// استيراد الأنواع من ملف types.ts
import type { CustomFormProps, ExtendedFormField, CustomFormField } from "./types";

// إيقاف رسائل التشخيص في console
if (typeof window !== 'undefined') {
  const originalConsoleLog = console.log;
  console.log = function() {
    // تجاهل رسائل التشخيص المحددة
    const firstArg = arguments[0];
    if (typeof firstArg === 'string' && (
      firstArg.includes('تكامل الشحن') ||
      firstArg.includes('معرّف مزود الشحن') ||
      firstArg.includes('الولايات المحملة') ||
      firstArg.includes('نوع التوصيل الحالي') ||
      firstArg.includes('رسوم التوصيل الحالية') ||
      firstArg.includes('طباعة الحقول في وحدة التحكم') ||
      firstArg.includes('استخدام النموذج المخصص') ||
      firstArg.includes('الحقول:') ||
      firstArg.includes('نوع التوصيل:') ||
      firstArg.includes('>> إعدادات مزود الشحن الافتراضية المستخدمة في renderField') ||
      firstArg.includes('>> بيانات إعدادات مزود الشحن الكاملة') ||
      firstArg.includes('>> القيم المفروضة لخيارات التوصيل') ||
      firstArg.includes('>> القيم النهائية المستخدمة في العرض') ||
      firstArg.includes('>> اختيار التوصيل للمكتب كقيمة افتراضية') ||
      firstArg.includes('>> تحديث إعدادات التوصيل في DeliveryTypeField') ||
      firstArg.includes('>> إجبار استخدام خيار المكتب') ||
      firstArg.includes('>> تحديث نوع التوصيل في النموذج') ||
      firstArg.includes('>> فرض استخدام نوع التوصيل') ||
      firstArg.includes('تحديث حقل deliveryOption في النموذج') ||
      firstArg.includes('إعادة حساب سعر التوصيل')
    )) {
      return;
    }
    originalConsoleLog.apply(console, arguments);
  };
}

// دالة للبحث عن معرف مزود الشحن المستنسخ
async function findClonedShippingProviderId(formSettings: any, orgId: string | null | undefined): Promise<string | number | null> {
  
  
  if (!orgId) {
    
    return null;
  }
  
  
  
  // البحث عن مزود شحن افتراضي للمؤسسة
  try {
    
    
    const { data, error } = await (supabase as any).from('shipping_provider_clones')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) // ترتيب بحسب تاريخ الإنشاء (الأحدث أولاً)
      .limit(1);
      
    if (error) {
      console.error(">> خطأ في البحث عن مزود شحن مستنسخ:", error);
    } else if (data && Array.isArray(data) && data.length > 0) {
      const defaultCloneId = data[0].id;
      
      
      // حفظ معرف المزود المستنسخ في formSettings إذا كان متاحاً
      if (formSettings && formSettings.id) {
        try {
          // تحديث إعدادات النموذج في قاعدة البيانات
          const updateResult = await (supabase as any).from('form_settings')
            .update({
              settings: {
                ...formSettings.settings,
                shipping_clone_id: defaultCloneId.toString()
              }
            })
            .eq('id', formSettings.id);
          
          
        } catch (updateError) {
          console.error(">> خطأ في تحديث النموذج:", updateError);
        }
      }
      
      return defaultCloneId;
    } else {
      
    }
  } catch (error) {
    console.error(">> خطأ في البحث عن مزود شحن مستنسخ:", error);
  }
  
  // إذا وصلنا إلى هنا، نستخدم القيمة 1 كإجراء أخير
  
  return 1;
}

// دالة مساعدة للحصول على إعدادات مزود الشحن الافتراضية
function getDefaultShippingProviderSettings(orgId: string | null | undefined, cloneId: string | number | null) {
  
  
  // البحث في قاعدة البيانات للحصول على مزود شحن مستنسخ
  async function attemptToFetchSettings() {
    if (!cloneId || !orgId) return null;
    
    try {
      const { data, error } = await (supabase as any).from('shipping_provider_clones')
        .select('*')
        .eq('id', cloneId)
        .single();
        
      if (!error && data) {
        
        return data;
      }
    } catch (error) {
      console.error(">> خطأ في البحث عن إعدادات مزود الشحن:", error);
    }
    
    return null;
  }
  
  // محاولة استرجاع اخر مرة من قاعدة البيانات اذا كان ممكناً
  attemptToFetchSettings().then(settings => {
    if (settings) {
      
      return settings;
    }
  });
  
  // إعدادات افتراضية إذا لم يتم العثور على إعدادات في قاعدة البيانات
  return {
    id: cloneId || 1,
    organization_id: orgId || '',
    original_provider_id: 1,
    name: "مزود الشحن الافتراضي",
    is_active: true,
    // بشكل افتراضي، تفعيل خياري المكتب والمنزل
    is_home_delivery_enabled: true,
    is_desk_delivery_enabled: true,
    use_unified_price: true,
    unified_home_price: 800,
    unified_desk_price: 0,
    is_free_delivery_home: false,
    is_free_delivery_desk: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sync_enabled: false
  };
}

// تحديث نوع CustomFormField ليشمل formSettings
interface ExtendedCustomFormField extends CustomFormField {
  formSettings?: {
    id?: string;
    settings?: any;
    [key: string]: any;
  };
}

// دالة جديدة للبحث عن مكتب الاستلام المتعلق بالبلدية
async function findStopDeskForMunicipality(wilayaId: string | number, municipalityId: string | number): Promise<string | null> {
  if (!municipalityId || !wilayaId) {
    console.log(`[البحث عن مكتب] لا توجد بيانات كافية للبحث: ولاية=${wilayaId}, بلدية=${municipalityId}`);
    return null;
  }
  
  console.log(`[البحث عن مكتب] البحث عن مكتب للبلدية ${municipalityId} في الولاية ${wilayaId}`);
  
  try {
    const { data: centers, error } = await supabase
      .from('yalidine_centers_global')
      .select('center_id, name, commune_id, wilaya_id, commune_name')
      .eq('commune_id', Number(municipalityId))
      .eq('wilaya_id', Number(wilayaId));
      
    if (error) {
      console.error('[البحث عن مكتب] خطأ في الاستعلام:', error);
      return null;
    }
    
    if (centers && centers.length > 0) {
      const centerId = centers[0].center_id.toString();
      console.log(`[البحث عن مكتب] تم العثور على مكتب ${centerId} (${centers[0].name}) للبلدية ${municipalityId}`);
      return centerId;
    } else {
      console.log(`[البحث عن مكتب] لم يتم العثور على مكتب للبلدية ${municipalityId}, البحث عن مكاتب في الولاية`);
      
      // إذا لم نجد مكتب مرتبط بالبلدية، نبحث عن مكاتب في الولاية
      const { data: wilayaCenters, error: wilayaError } = await supabase
        .from('yalidine_centers_global')
        .select('center_id, name, commune_id, wilaya_id, commune_name')
        .eq('wilaya_id', Number(wilayaId));
        
      if (wilayaError) {
        console.error('[البحث عن مكتب] خطأ في استعلام مكاتب الولاية:', wilayaError);
        return null;
      }
      
      if (wilayaCenters && wilayaCenters.length > 0) {
        const centerId = wilayaCenters[0].center_id.toString();
        console.log(`[البحث عن مكتب] تم العثور على مكتب ${centerId} (${wilayaCenters[0].name}) في الولاية ${wilayaId}`);
        return centerId;
      }
    }
    
    console.log('[البحث عن مكتب] لم يتم العثور على أي مكتب');
    return null;
  } catch (error) {
    console.error('[البحث عن مكتب] خطأ غير متوقع:', error);
    return null;
  }
}

export const CustomFormFields: React.FC<CustomFormProps> = ({
  formId,
  formFields,
  productId,
  onSubmit,
  isSubmitting = false,
  children,
  noForm = false,
  onDeliveryPriceChange,
  onFieldChange,
}) => {
  const { currentOrganization } = useTenant();
  const [extendedFields, setExtendedFields] = useState<ExtendedFormField[]>([]);
  const [deliveryPrice, setDeliveryPrice] = useState<number | null>(null);
  const { watch, setValue } = useForm();
  const [clonedShippingProviderId, setClonedShippingProviderId] = useState<string | number | null>(null);
  const [shippingProviderSettings, setShippingProviderSettings] = useState<any | null>(null);
  const [isLoadingShippingSettings, setIsLoadingShippingSettings] = useState<boolean>(false);
  // إضافة مرجع للتحكم في تحديثات نوع التوصيل لتجنب الحلقة اللانهائية
  const deliveryTypeUpdateRef = useRef<{
    isHomeOnlyDelivery: boolean;
    isDeskOnlyDelivery: boolean;
    hasBeenUpdated: boolean;
  }>({
    isHomeOnlyDelivery: false,
    isDeskOnlyDelivery: false,
    hasBeenUpdated: false
  });

  // استخراج معرف مزود الشحن المستنسخ
  useEffect(() => {
    if (!currentOrganization) return;
    
    const getShippingCloneId = async () => {
      try {
        // تمكين حالة التحميل
        setIsLoadingShippingSettings(true);
        
        // تحضير كائن formSettings من البيانات المتاحة
        let settingsObj: any = null;
        
        if (formFields && formFields.length > 0) {
          // البحث عن الحقل الذي يحتوي على formSettings
          const fieldWithSettings = formFields.find(field => 
            field && typeof field === 'object' && 'formSettings' in field && field.formSettings
          ) as ExtendedCustomFormField | undefined;
          
          if (fieldWithSettings && fieldWithSettings.formSettings) {
            settingsObj = { 
              id: formId, 
              settings: {}, 
              ...fieldWithSettings.formSettings 
            };
          } else {
            settingsObj = { id: formId, settings: {} };
          }
        }
        
        // البحث عن shipping_clone_id للمنتج المحدد
        if (productId) {
          
          try {
            const { data, error } = await (supabase as any).from('products')
              .select('shipping_clone_id, purchase_page_config')
              .eq('id', productId)
              .single();
              
            if (error) {
              console.error(">> خطأ في جلب معلومات المنتج:", error);
            } else if (data) {
              
              
              if (data.shipping_clone_id) {
                
                const cloneId = data.shipping_clone_id;
                setClonedShippingProviderId(cloneId);
                await fetchShippingProviderSettings(cloneId);
                setIsLoadingShippingSettings(false);
                return;
              } else if (data.purchase_page_config && data.purchase_page_config.shipping_clone_id) {
                
                const cloneId = data.purchase_page_config.shipping_clone_id;
                setClonedShippingProviderId(cloneId);
                await fetchShippingProviderSettings(cloneId);
                setIsLoadingShippingSettings(false);
                return;
              } else {
                
              }
            } else {
              
            }
          } catch (error) {
            console.error(">> خطأ في جلب معلومات المنتج:", error);
          }
        } else {
          
        }
        
        // إذا لم نجد shipping_clone_id في المنتج، نبحث عن مزود شحن افتراضي للمؤسسة
        const cloneId = await findClonedShippingProviderId(settingsObj, currentOrganization?.id);
        
        
        if (cloneId) {
          setClonedShippingProviderId(cloneId);
          await fetchShippingProviderSettings(cloneId);
        } else {
          console.error(">> لم يتم العثور على مزود شحن مناسب");
          
          // تعيين حالة "لا توجد إعدادات" باستخدام الإعدادات الافتراضية
          const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, 1);
          
          setShippingProviderSettings(defaultSettings);
        }
        
        // إنهاء حالة التحميل
        setIsLoadingShippingSettings(false);
      } catch (error) {
        console.error(">> خطأ في استخلاص معرف مزود الشحن المستنسخ:", error);
        
        // تعيين حالة "لا توجد إعدادات" باستخدام الإعدادات الافتراضية في حالة الخطأ
        const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, 1);
        
        setShippingProviderSettings(defaultSettings);
        
        setIsLoadingShippingSettings(false);
      }
    };
    
    getShippingCloneId();
  }, [formId, currentOrganization, formFields, productId, setValue]);

  // دالة لجلب إعدادات مزود الشحن بناءً على المعرف
  const fetchShippingProviderSettings = async (cloneId: string | number) => {
    
    
    
    
    if (cloneId) {
      try {
        
        
        
        // استخدام any لتجاوز التحقق من النوع
        const { data, error } = await (supabase as any).from('shipping_provider_clones')
          .select('*')
          .eq('id', cloneId)
          .single();
          
        if (error) {
          console.error(">> خطأ في جلب إعدادات مزود الشحن المستنسخ:", error);
          return;
        }
        
        if (data) {
          
          
          
          
          // تأكد من أن القيم البوليانية محددة بشكل صحيح وليست null
          const sanitizedData = {
            ...data,
            is_home_delivery_enabled: data.is_home_delivery_enabled === true,
            is_desk_delivery_enabled: data.is_desk_delivery_enabled === true,
            is_free_delivery_home: data.is_free_delivery_home === true,
            is_free_delivery_desk: data.is_free_delivery_desk === true
          };
          
          // تخزين إعدادات مزود الشحن
          setShippingProviderSettings(sanitizedData);
          
          // إعادة تعيين مرجع التحديث لتمكين التحديث في useEffect
          deliveryTypeUpdateRef.current.hasBeenUpdated = false;
          
          
        }
      } catch (error) {
        console.error(">> خطأ في جلب إعدادات مزود الشحن:", error);
        
        // تعيين إعدادات افتراضية في حالة الخطأ
        const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, cloneId);
        setShippingProviderSettings(defaultSettings);
        
        // إعادة تعيين مرجع التحديث لتمكين التحديث في useEffect
        deliveryTypeUpdateRef.current.hasBeenUpdated = false;
      }
    } else {
      console.error(">> لم يتم توفير معرف مزود شحن صالح");
      
      // استخدام إعدادات افتراضية
      const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, 1);
      setShippingProviderSettings(defaultSettings);
      
      // إعادة تعيين مرجع التحديث لتمكين التحديث في useEffect
      deliveryTypeUpdateRef.current.hasBeenUpdated = false;
    }
  };

  // دالة مساعدة لتحديث قيمة الحقل وإرسالها إلى النموذج الأساسي
  const updateFieldValue = (fieldName: string, value: string) => {
    // طباعة تشخيصية لحقل stopDeskId
    if (fieldName === 'deliveryOption' || fieldName === 'stopDeskId') {
      console.log(`[CustomFormFields] تحديث حقل ${fieldName} بالقيمة: ${value}`);
    }
    
    // تجنب التحديثات المتكررة لـ deliveryOption
    if (fieldName === 'deliveryOption' && value === 'desk') {
      // التحقق مما إذا كانت القيمة بالفعل "desk" في extendedFields
      const currentField = extendedFields.find(f => f.name === fieldName);
      if (currentField && currentField.value === 'desk') {
        return; // تجنب التحديث إذا كانت القيمة هي نفسها بالفعل
      }
    }
    
    // تحديث القيمة في extendedFields
    const updatedFields = [...extendedFields];
    const fieldToUpdate = updatedFields.find(f => f.name === fieldName);
    
    if (fieldToUpdate) {
      fieldToUpdate.value = value;
      setExtendedFields(updatedFields);
    }
    
    // تقليل التحديثات المتكررة من خلال تحديد الحقول المهمة
    const isSignificantField = ['fullName', 'phone', 'province', 'municipality', 'address', 'stopDeskId'].includes(fieldName);
    
    // تحديث القيمة في النموذج الأساسي إذا كانت الدالة متوفرة
    if (onFieldChange) {
      // استخدام تأخير بسيط للحقول التي يتم تعديلها بتكرار (مثل الاسم)
      if (fieldName === 'fullName' || fieldName === 'customer_name') {
        setTimeout(() => {
          onFieldChange(fieldName, value);
        }, 500); // تأخير بسيط لتجنب الطلبات المتكررة أثناء الكتابة
      } else {
        onFieldChange(fieldName, value);
        
        // طباعة تشخيصية خاصة لـ stopDeskId
        if (fieldName === 'stopDeskId') {
          console.log(`[CustomFormFields] تم استدعاء onFieldChange لحقل stopDeskId بالقيمة: ${value}`);
        }
      }
    }
  };

  // دالة مساعدة لتحديث الحالة واستدعاء onDeliveryPriceChange
  const updateDeliveryPriceState = (price: number | null) => {
    setDeliveryPrice(price);
    if (onDeliveryPriceChange) {
      onDeliveryPriceChange(price);
    }
  };

  // وظيفة لتحديث سعر التوصيل
  const updateDeliveryPrice = async (
    deliveryType: string,
    provinceId: string,
    municipalityId: string | null | undefined
  ) => {
    if (!provinceId || !currentOrganization) {
      updateDeliveryPriceState(0);
      return;
    }
    
    try {
      // إذا لم يتم تحميل إعدادات مزود التوصيل بعد، استخدم منطق الحساب الافتراضي
      if (!shippingProviderSettings) {
        
        
        // التحقق مما إذا كان لدينا معرف مزود التوصيل
        if (clonedShippingProviderId) {
          // محاولة جلب الإعدادات مرة أخرى
          await fetchShippingProviderSettings(clonedShippingProviderId);
          
          // إذا كانت الإعدادات لا تزال غير متوفرة، استخدم سعر افتراضي معقول
          if (!shippingProviderSettings) {
            const defaultPrice = deliveryType === 'home' ? 800 : 300;
            
            updateDeliveryPriceState(defaultPrice);
          } else {
            // إذا تم تحميل الإعدادات، عاود المحاولة
            updateDeliveryPrice(deliveryType, provinceId, municipalityId);
          }
          return;
        }
        
        // إذا لم يكن لدينا معرف مزود التوصيل، استخدم سعر افتراضي
        const defaultPrice = deliveryType === 'home' ? 800 : 300;
        
        updateDeliveryPriceState(defaultPrice);
        return;
      }
      
      // استخدام إعدادات مزود التوصيل المحملة
      
      
      // التحقق من توفر خيارات التوصيل
      const isHomeEnabled = shippingProviderSettings.is_home_delivery_enabled === true;
      const isDeskEnabled = shippingProviderSettings.is_desk_delivery_enabled === true;
      
      // تحديد نوع التوصيل النهائي بناءً على الخيارات المتاحة
      let finalDeliveryType = deliveryType;
      
      // إذا كان خيار واحد فقط متاح، استخدمه بغض النظر عن القيمة المحددة
      if (!isHomeEnabled && isDeskEnabled) {
        // فقط التوصيل للمكتب متاح
        finalDeliveryType = 'desk';
      } else if (isHomeEnabled && !isDeskEnabled) {
        // فقط التوصيل للمنزل متاح
        finalDeliveryType = 'home';
      } else if (deliveryType === 'home' && !isHomeEnabled) {
        // إذا كان نوع التوصيل "للمنزل" غير مدعوم ولكن "للمكتب" مدعوم
        finalDeliveryType = isDeskEnabled ? 'desk' : 'home';
      } else if (deliveryType === 'desk' && !isDeskEnabled) {
        // إذا كان نوع التوصيل "للمكتب" غير مدعوم ولكن "للمنزل" مدعوم
        finalDeliveryType = isHomeEnabled ? 'home' : 'desk';
      }
      
      // التحقق ما إذا تم تغيير نوع التوصيل
      if (finalDeliveryType !== deliveryType) {
        
        
        // تحديث القيمة في النموذج
        if (setValue) {
          setValue('deliveryOption', finalDeliveryType);
        }
        
        // تحديث القيمة في النموذج الأساسي
        if (onFieldChange) {
          onFieldChange('deliveryOption', finalDeliveryType);
          
          // إذا كان نوع التوصيل الجديد هو للمكتب، ابحث عن مكتب استلام مناسب
          if (finalDeliveryType === 'desk' && provinceId) {
            findStopDeskForMunicipality(provinceId, municipalityId || '')
              .then(stopDeskId => {
                if (stopDeskId) {
                  console.log(`[recalculateAndSetDeliveryPrice] تعيين قيمة مكتب الاستلام = ${stopDeskId} عند تغيير نوع التوصيل إلى desk`);
                  onFieldChange('stopDeskId', stopDeskId);
                } else {
                  // إذا لم يتم العثور على مكتب، استخدم القيمة الافتراضية
                  console.log(`[recalculateAndSetDeliveryPrice] تعيين قيمة افتراضية لـ stopDeskId = 1 (لم يتم العثور على مكتب للبلدية ${municipalityId})`);
                  onFieldChange('stopDeskId', '1');
                }
              });
          }
        }
      }
      
      // حساب سعر التوصيل بناءً على نوع التوصيل النهائي
      if (finalDeliveryType === 'home' && isHomeEnabled) {
        // التحقق ما إذا كان التوصيل للمنزل مجانيًا
        if (shippingProviderSettings.is_free_delivery_home) {
          updateDeliveryPriceState(0);
        } else if (shippingProviderSettings.use_unified_price) {
          // استخدام السعر الموحد للتوصيل للمنزل
          updateDeliveryPriceState(shippingProviderSettings.unified_home_price || 0);
        } else {
          // هنا يمكن إضافة منطق خاص بحساب سعر التوصيل حسب الولاية والبلدية
          const price = await calculateDeliveryPrice(
            currentOrganization.id, // معرف المؤسسة
            "16", // افتراضي لولاية الإرسال - سيتم استبداله بالولاية المحددة في إعدادات المؤسسة
            provinceId, // ولاية الاستقبال
            municipalityId || "", // بلدية الاستقبال (فارغة إذا لم تكن محددة)
            finalDeliveryType as 'home' | 'desk', // نوع التوصيل
            1 // الوزن الافتراضي 1 كجم
          );
          updateDeliveryPriceState(price);
        }
      } else if (finalDeliveryType === 'desk' && isDeskEnabled) {
        // التحقق ما إذا كان التوصيل للمكتب مجانيًا
        if (shippingProviderSettings.is_free_delivery_desk) {
          updateDeliveryPriceState(0);
        } else if (shippingProviderSettings.use_unified_price) {
          // استخدام السعر الموحد للتوصيل للمكتب
          updateDeliveryPriceState(shippingProviderSettings.unified_desk_price || 0);
        } else {
          // هنا يمكن إضافة منطق خاص بحساب سعر التوصيل حسب الولاية والبلدية
          const price = await calculateDeliveryPrice(
            currentOrganization.id, // معرف المؤسسة
            "16", // افتراضي لولاية الإرسال - سيتم استبداله بالولاية المحددة في إعدادات المؤسسة
            provinceId, // ولاية الاستقبال
            municipalityId || "", // بلدية الاستقبال (فارغة إذا لم تكن محددة)
            finalDeliveryType as 'home' | 'desk', // نوع التوصيل
            1 // الوزن الافتراضي 1 كجم
          );
          updateDeliveryPriceState(price);
        }
      } else {
        // إذا كان نوع التوصيل المستخدم غير مدعوم، استخدم سعر افتراضي
        
        const defaultPrice = finalDeliveryType === 'home' ? 800 : 300;
        updateDeliveryPriceState(defaultPrice);
      }
    } catch (error) {
      console.error(">> خطأ في حساب سعر التوصيل:", error);
      updateDeliveryPriceState(0);
    }
  };

  // دالة لإعادة حساب سعر التوصيل وتحديثه
  const recalculateAndSetDeliveryPrice = (
    currentDeliveryType?: string,
    currentProvinceId?: string,
    currentMunicipalityId?: string
  ) => {
    // استخدام نوع التوصيل المحدد أو البحث عنه في الحقول الممتدة
    const deliveryTypeToUse = currentDeliveryType || extendedFields.find(f => f.type === 'deliveryType')?.value || 'home';
    
    // استخدام معرف الولاية المحدد أو البحث عنه في الحقول الممتدة
    const provinceIdToUse = currentProvinceId || extendedFields.find(f => f.type === 'province')?.value;
    
    // استخدام معرف البلدية المحدد أو البحث عنه في الحقول الممتدة
    const municipalityIdToUse = currentMunicipalityId || extendedFields.find(f => f.type === 'municipality')?.value;
    
    
    
    // التحقق مما إذا كنا بحاجة إلى انتظار تحميل إعدادات مزود التوصيل
    if (!shippingProviderSettings && clonedShippingProviderId) {
      // محاولة جلب الإعدادات مرة أخرى
      fetchShippingProviderSettings(clonedShippingProviderId)
        .then(() => {
          // إذا تم تحميل الإعدادات، عاود المحاولة
          if (shippingProviderSettings) {
            recalculateAndSetDeliveryPrice(deliveryTypeToUse, provinceIdToUse, municipalityIdToUse);
          } else if (provinceIdToUse) {
            // إذا لم يتم تحميل الإعدادات، استخدم منطق الحساب الافتراضي
            updateDeliveryPrice(deliveryTypeToUse, provinceIdToUse, municipalityIdToUse);
          } else {
            updateDeliveryPriceState(0);
          }
        });
      return;
    }
    
    // إذا لم تكن إعدادات مزود التوصيل متوفرة ولم يكن لدينا معرف مزود التوصيل
    if (!shippingProviderSettings) {
      if (provinceIdToUse) {
        // استخدام منطق الحساب الافتراضي
        updateDeliveryPrice(deliveryTypeToUse, provinceIdToUse, municipalityIdToUse);
      } else {
        updateDeliveryPriceState(0);
      }
      return;
    }
    
    // التحقق من توفر خيارات التوصيل
    const isHomeEnabled = shippingProviderSettings.is_home_delivery_enabled === true;
    const isDeskEnabled = shippingProviderSettings.is_desk_delivery_enabled === true;
    
    // التعامل مع الحالات المختلفة لخيارات التوصيل
    let finalDeliveryType = deliveryTypeToUse;
    
    // إذا كان خيار واحد فقط متاح، استخدمه بغض النظر عن القيمة المحددة
    if (!isHomeEnabled && isDeskEnabled) {
      // فقط التوصيل للمكتب متاح
      finalDeliveryType = 'desk';
      
    } else if (isHomeEnabled && !isDeskEnabled) {
      // فقط التوصيل للمنزل متاح
      finalDeliveryType = 'home';
      
    } else if (!isHomeEnabled && !isDeskEnabled) {
      // لا توجد خيارات متاحة، استخدم الخيار الافتراضي
      
      finalDeliveryType = 'home';
    }
    // في حالة توفر كلا الخيارين، استخدم القيمة المحددة
    
    // تحديث نوع التوصيل في النموذج إذا تغير
    if (finalDeliveryType !== deliveryTypeToUse) {
      
      
      // تحديث القيمة في النموذج الأساسي
      if (onFieldChange) {
        onFieldChange('deliveryOption', finalDeliveryType);
        
        // إذا كان نوع التوصيل الجديد هو للمكتب، ابحث عن مكتب استلام مناسب
        if (finalDeliveryType === 'desk' && provinceIdToUse) {
          findStopDeskForMunicipality(provinceIdToUse, municipalityIdToUse || '')
            .then(stopDeskId => {
              if (stopDeskId) {
                console.log(`[recalculateAndSetDeliveryPrice] تعيين قيمة مكتب الاستلام = ${stopDeskId} عند تغيير نوع التوصيل إلى desk`);
                onFieldChange('stopDeskId', stopDeskId);
              } else {
                // إذا لم يتم العثور على مكتب، استخدم القيمة الافتراضية
                console.log(`[recalculateAndSetDeliveryPrice] تعيين قيمة افتراضية لـ stopDeskId = 1 (لم يتم العثور على مكتب للبلدية ${municipalityIdToUse})`);
                onFieldChange('stopDeskId', '1');
              }
            });
        }
      }
      
      // تحديث القيمة في النموذج
      if (setValue) {
        setValue('deliveryOption', finalDeliveryType);
      }
      
      // تحديث قيمة الحقل في extendedFields
      const updatedFields = [...extendedFields];
      const deliveryTypeField = updatedFields.find(f => f.type === 'deliveryType' || f.name === 'fixedDeliveryType');
      if (deliveryTypeField) {
        deliveryTypeField.value = finalDeliveryType;
        setExtendedFields(updatedFields);
      }
    }
    
    // حساب سعر التوصيل بناءً على نوع التوصيل النهائي
    if (provinceIdToUse) {
      updateDeliveryPrice(finalDeliveryType, provinceIdToUse, municipalityIdToUse);
    } else {
      updateDeliveryPriceState(0);
    }
  };

  // إضافة useEffect للتعامل مع تحديث نوع التوصيل بناءً على إعدادات مزود الشحن
  useEffect(() => {
    if (!shippingProviderSettings || deliveryTypeUpdateRef.current.hasBeenUpdated) {
      return;
    }
    
    const isHomeEnabled = shippingProviderSettings.is_home_delivery_enabled === true;
    const isDeskEnabled = shippingProviderSettings.is_desk_delivery_enabled === true;
    
    const isHomeOnlyDelivery = isHomeEnabled && !isDeskEnabled;
    const isDeskOnlyDelivery = !isHomeEnabled && isDeskEnabled;
    
    // تحديث المرجع لمنع التحديثات المتكررة
    deliveryTypeUpdateRef.current = {
      isHomeOnlyDelivery,
      isDeskOnlyDelivery,
      hasBeenUpdated: true
    };
    
    if (isHomeOnlyDelivery) {
      
      
      
      setValue('deliveryOption', 'home');
      
      if (onFieldChange) {
        
        onFieldChange('deliveryOption', 'home');
      }
    } else if (isDeskOnlyDelivery) {
      
      
      
      setValue('deliveryOption', 'desk');
      
      if (onFieldChange) {
        
        onFieldChange('deliveryOption', 'desk');
        
        // البحث عن مكتب استلام مناسب بدلاً من استخدام القيمة الافتراضية 1
        const provinceField = extendedFields.find(f => f.type === 'province');
        const municipalityField = extendedFields.find(f => f.type === 'municipality');
        
        const provinceId = provinceField?.value;
        const municipalityId = municipalityField?.value;
        
        if (provinceId && municipalityId) {
          // البحث عن المكتب المناسب باستخدام الدالة الجديدة
          findStopDeskForMunicipality(provinceId, municipalityId)
            .then(stopDeskId => {
              if (stopDeskId) {
                console.log(`[CustomFormFields] تعيين قيمة مكتب الاستلام = ${stopDeskId} بناءً على البلدية ${municipalityId}`);
                onFieldChange('stopDeskId', stopDeskId);
              } else {
                // إذا لم يتم العثور على مكتب، استخدم القيمة الافتراضية ولكن مع رسالة تشخيصية
                console.log("[CustomFormFields] تعيين قيمة افتراضية لـ stopDeskId = 1 (لم يتم العثور على مكتب)");
                onFieldChange('stopDeskId', '1');
              }
            });
        } else {
          // إذا لم تكن البلدية متاحة، استخدم القيمة الافتراضية ولكن مع رسالة تشخيصية
          console.log(`[CustomFormFields] تعيين قيمة افتراضية لـ stopDeskId = 1 (البلدية غير متوفرة، ولاية=${provinceId}, بلدية=${municipalityId})`);
          onFieldChange('stopDeskId', '1');
        }
      }
    }
  }, [shippingProviderSettings, setValue, onFieldChange, extendedFields]);

  // تأثير جانبي لتهيئة الحقول وتحميل البيانات الأولية
  useEffect(() => {
    if (!formFields || !Array.isArray(formFields)) {
      setExtendedFields([]);
      return;
    }
    
    const newExtendedFields = formFields.filter(field => field && field.isVisible).map(field => {
      let initialValue = field.defaultValue || '';
      if (field.type === 'deliveryType' && !initialValue) {
        initialValue = 'home';
      }
      return {
        ...field,
        isLoading: false,
        value: initialValue, 
      };
    });

    const provinceFields = newExtendedFields.filter(field => field.type === 'province');
    const municipalityFields = newExtendedFields.filter(field => field.type === 'municipality');

    for (const municipalityField of municipalityFields) {
      const provinceFieldId = municipalityField.linkedFields?.provinceField;
      if (provinceFieldId) {
        municipalityField.dependency = {
          fieldId: provinceFieldId,
          value: '*',
        };
      }
    }

    const loadProvinces = async () => {
      try {
        if (!currentOrganization) return;

        for (const field of provinceFields) {
          field.isLoading = true;
        }
        setExtendedFields([...newExtendedFields]);

        const provinces = await getProvinces(currentOrganization.id);
        
        if (!provinces || provinces.length === 0) {
          return;
        }

        const formattedProvinces = provinces.map(province => ({
          id: province.id,
          name: province.name
        }));

        for (const field of provinceFields) {
          (field as ExtendedFormField).provinces = formattedProvinces;
          field.isLoading = false;
        }
        setExtendedFields([...newExtendedFields]);
      } catch (error) {
        for (const field of provinceFields) {
          field.isLoading = false;
        }
        setExtendedFields([...newExtendedFields]);
      }
    };

    if (newExtendedFields.length > 0) {
      if (provinceFields.length > 0) {
        loadProvinces();
      } else {
        setExtendedFields(newExtendedFields);
      }
    }
  }, [formFields, currentOrganization, productId]);

  // معالجة تغيير اختيار الولاية
  const handleProvinceChange = async (provinceId: string, municipalityFieldId: string | null, deliveryTypeOverride?: string) => {
    if (!provinceId || !currentOrganization) {
      return;
    }
    
    try {
      const updatedFields = [...extendedFields];
      
      const provinceField = updatedFields.find(field => field.type === 'province');
      if (provinceField) {
        provinceField.value = provinceId;
      }
      
      const deliveryTypeField = updatedFields.find(field => field.type === 'deliveryType' || field.name === 'fixedDeliveryType');
      const selectedDeliveryType = deliveryTypeOverride || deliveryTypeField?.value || 'home';
      
      let municipalityField: ExtendedFormField | undefined;
      
      if (municipalityFieldId === 'auto') {
        municipalityField = updatedFields.find(field => field.type === 'municipality');
      } else {
        municipalityField = updatedFields.find(field => field.id === municipalityFieldId);
      }
      
      if (municipalityField) {
        municipalityField.isLoading = true;
        setExtendedFields([...updatedFields]);
        
        const municipalities = await getMunicipalities(currentOrganization.id, provinceId);
        
        if (!municipalities || municipalities.length === 0) {
          municipalityField.isLoading = false;
          (municipalityField as ExtendedFormField).municipalities = [];
          setExtendedFields([...updatedFields]);
          
          return;
        }
        
        

        const formattedMunicipalities = municipalities.map(municipality => {
          // التأكد من أن المعرف هو نص دائمًا
          const municipalityId = municipality.id?.toString() || '';
          
          if (selectedDeliveryType === 'desk' && municipality.has_stop_desk) {
            return {
              id: Number(municipalityId), // تحويل إلى رقم لتلبية متطلبات النوع
              name: `${municipality.name} (مكتب توصيل متاح)`
            };
          } else {
            return {
              id: Number(municipalityId), // تحويل إلى رقم لتلبية متطلبات النوع
              name: municipality.name
            };
          }
        });
        
        const filteredMunicipalities = selectedDeliveryType === 'desk' 
          ? formattedMunicipalities.filter((_, index) => municipalities[index].has_stop_desk)
          : formattedMunicipalities;
        
        // طباعة البلديات المتاحة للتشخيص
        
        
        (municipalityField as ExtendedFormField).municipalities = filteredMunicipalities;
        municipalityField.isLoading = false;

        let newMunicipalityValue = '';
        const currentMunicipalityId = municipalityField.value;
        
        if (filteredMunicipalities.length > 0) {
          // التحقق من صحة القيمة الحالية
          const currentSelectionIsValid = filteredMunicipalities.some(m => m.id.toString() === currentMunicipalityId);
          
          if (currentSelectionIsValid) {
            newMunicipalityValue = currentMunicipalityId;
          } else {
            // تعيين أول قيمة متاحة كقيمة افتراضية
            newMunicipalityValue = filteredMunicipalities[0].id.toString();
            
          }
        }
        
        // تحديث قيمة البلدية في الحقول الممتدة
        municipalityField.value = newMunicipalityValue;
        
        // تحديث قيمة البلدية في النموذج الرئيسي
        if (municipalityField.name && newMunicipalityValue) {
          setValue(municipalityField.name, newMunicipalityValue);
          
          // استدعاء onFieldChange لإرسال القيمة للنموذج الأصلي
          if (updateFieldValue) {
            updateFieldValue(municipalityField.name, newMunicipalityValue);
            
          }
        }
        
        if (municipalityField.dependency) {
          const provinceField = updatedFields.find(field => field.type === 'province');
          if (provinceField) {
            municipalityField.dependency.fieldId = provinceField.id;
          }
        }
        
        setExtendedFields([...updatedFields]);
        
        setTimeout(() => {
            recalculateAndSetDeliveryPrice(selectedDeliveryType, provinceId, newMunicipalityValue);
        }, 0);
      }
    } catch (error) {
      const updatedFields = [...extendedFields];
      let municipalityField: ExtendedFormField | undefined;
      
      if (municipalityFieldId === 'auto') {
        municipalityField = updatedFields.find(field => field.type === 'municipality');
      } else {
        municipalityField = updatedFields.find(field => field.id === municipalityFieldId);
      }
      
      if (municipalityField) {
        municipalityField.isLoading = false;
        (municipalityField as ExtendedFormField).municipalities = [];
        setExtendedFields([...updatedFields]);
      }
    }
  };

  // معالجة تغيير اختيار البلدية
  const handleMunicipalityChange = (municipalityId: string, provinceId: string) => {
    try {
      const updatedFields = [...extendedFields];
      const municipalityField = updatedFields.find(field => field.type === 'municipality');
      if (municipalityField) {
        municipalityField.value = municipalityId;
      }
      
      const deliveryTypeField = updatedFields.find(field => field.type === 'deliveryType');
      const selectedDeliveryType = deliveryTypeField?.value || 'home';
      
      setExtendedFields(updatedFields);
      
      // إذا كان نوع التوصيل هو للمكتب، ابحث عن مكتب استلام مناسب للبلدية المحددة
      if (selectedDeliveryType === 'desk' && onFieldChange) {
        findStopDeskForMunicipality(provinceId, municipalityId)
          .then(stopDeskId => {
            if (stopDeskId) {
              console.log(`[handleMunicipalityChange] تعيين قيمة مكتب الاستلام = ${stopDeskId} بناءً على البلدية الجديدة ${municipalityId}`);
              onFieldChange('stopDeskId', stopDeskId);
            } else {
              // إذا لم يتم العثور على مكتب، استخدم القيمة الافتراضية
              console.log(`[handleMunicipalityChange] تعيين قيمة افتراضية لـ stopDeskId = 1 (لم يتم العثور على مكتب للبلدية ${municipalityId})`);
              onFieldChange('stopDeskId', '1');
            }
          });
      }
      
      recalculateAndSetDeliveryPrice(selectedDeliveryType, provinceId, municipalityId);
    } catch (error) {
      // تعامل مع الخطأ
      console.error('[handleMunicipalityChange] خطأ:', error);
    }
  };

  // تنظيم الحقول حسب الترتيب
  const sortedFields = [...extendedFields].sort((a, b) => a.order - b.order);

  // تصفية الحقول المكررة (مثل حقول العنوان)
  const uniqueFields = sortedFields.filter((field, index, self) => {
    // احتفظ بالحقل الأول فقط إذا كان هناك حقول متكررة بنفس الاسم
    if (field.name === 'address') {
      return self.findIndex(f => f.name === 'address') === index;
    }
    return true;
  });

  // عرض الحقل بناءً على نوعه
  const renderField = (field: ExtendedFormField) => {
    if (!field.isVisible) return null;
    
    const isShippingField = field.name === 'fixedDeliveryType' || 
      field.description?.includes('حقل نوع التوصيل الثابت') || 
      field.type === 'deliveryType';
    
    // إذا كان حقل توصيل وما زال في حالة التحميل، أظهر حالة التحميل
    if (isShippingField && (isLoadingShippingSettings || (productId && !shippingProviderSettings && clonedShippingProviderId))) {
      return (
        <div key={field.id} className="mb-4 col-span-1 md:col-span-2">
          <label className="block text-sm font-medium mb-2 text-foreground">
            {field.label || "خيارات التوصيل"}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          <div className="bg-muted/40 p-4 rounded-lg animate-pulse">
            <div className="h-6 w-3/4 bg-muted rounded mb-3"></div>
            <div className="h-4 w-1/2 bg-muted rounded"></div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">جاري تحميل خيارات التوصيل...</p>
        </div>
      );
    }
    
    // استخدام إعدادات مزود التوصيل المحملة
    const settingsInfo = shippingProviderSettings ? 
      `الإعدادات الفعلية (${shippingProviderSettings.id}) - المنزل: ${shippingProviderSettings.is_home_delivery_enabled}, المكتب: ${shippingProviderSettings.is_desk_delivery_enabled}` : 
      'لا توجد إعدادات';
    
    
    
    // التحقق من خيارات التوصيل المتاحة
    let isHomeEnabled = false; 
    let isDeskEnabled = false;
    let isHomeOnlyDelivery = false;
    let isDeskOnlyDelivery = false;
    
    if (shippingProviderSettings) {
      isHomeEnabled = shippingProviderSettings.is_home_delivery_enabled === true;
      isDeskEnabled = shippingProviderSettings.is_desk_delivery_enabled === true;
      
      isHomeOnlyDelivery = isHomeEnabled && !isDeskEnabled;
      isDeskOnlyDelivery = !isHomeEnabled && isDeskEnabled;
      
      
      
      // إزالة التحديثات المباشرة للقيم من هنا لتجنب الحلقة اللانهائية 
      // سيتم تنفيذ التحديثات من خلال useEffect بدلاً من ذلك
    }
    
    switch (field.type) {
      case 'text':
      case 'number':
      case 'email':
      case 'tel':
        return <TextField field={field} key={field.id} updateValue={updateFieldValue} />;
      
      case 'textarea':
        return <TextAreaField field={field} key={field.id} updateValue={updateFieldValue} />;
      
      case 'select':
        return <SelectField field={field} key={field.id} updateValue={updateFieldValue} />;
      
      case 'radio':
        // إذا كان حقل نوع التوصيل الثابت
        if (field.name === 'fixedDeliveryType' || field.description?.includes('حقل نوع التوصيل الثابت')) {
          // التأكد من أن إعدادات مزود الشحن متوفرة ومحملة
          if (shippingProviderSettings) {
            
            
            // للمنتجات التي تدعم نوع توصيل واحد فقط، عرض الخيار المتاح فقط
            if (shippingProviderSettings.is_home_delivery_enabled === true && 
                shippingProviderSettings.is_desk_delivery_enabled === false) {
              // عرض معلومات التوصيل للمنزل فقط
              
              return (
                <div key={field.id} className="mb-4 col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    {field.label || "طريقة التوصيل"}
                    {field.required && <span className="text-red-500 mr-1">*</span>}
                  </label>
                  <div className="flex items-center p-4 border border-primary rounded-lg bg-primary/10">
                    <Home className="ml-3 h-5 w-5 text-primary" />
                    <div>
                      <span className="font-medium block text-foreground">توصيل للمنزل</span>
                      <span className="text-xs text-muted-foreground block mt-1">سيتم توصيل الطلب إلى عنوانك</span>
                      {shippingProviderSettings?.is_free_delivery_home ? (
                        <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium block mt-1">
                          سعر الشحن: {shippingProviderSettings?.unified_home_price || 0} دج
                        </span>
                      )}
                    </div>
                  </div>
                  <input type="hidden" name={field.name} value="home" />
                  {field.description && (
                    <p className="mt-2 text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              );
            } else if (shippingProviderSettings.is_home_delivery_enabled === false && 
                       shippingProviderSettings.is_desk_delivery_enabled === true) {
              // عرض معلومات التوصيل للمكتب فقط
              
              return (
                <div key={field.id} className="mb-4 col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    {field.label || "طريقة التوصيل"}
                    {field.required && <span className="text-red-500 mr-1">*</span>}
                  </label>
                  <div className="flex items-center p-4 border border-primary rounded-lg bg-primary/10">
                    <Building className="ml-3 h-5 w-5 text-primary" />
                    <div>
                      <span className="font-medium block text-foreground">استلام من مكتب شركة التوصيل</span>
                      <span className="text-xs text-muted-foreground block mt-1">استلام الطلب من مكتب شركة التوصيل</span>
                      {shippingProviderSettings?.is_free_delivery_desk ? (
                        <span className="text-xs text-green-600 font-medium block mt-1">شحن مجاني!</span>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium block mt-1">
                          سعر الشحن: {shippingProviderSettings?.unified_desk_price || 0} دج
                        </span>
                      )}
                    </div>
                  </div>
                  <input type="hidden" name={field.name} value="desk" />
                  {field.description && (
                    <p className="mt-2 text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              );
            }
          }
          
          // إذا كان كلا الخيارين متاحين أو إذا كانت الإعدادات غير محملة، استخدم مكون نوع التوصيل المخصص
          const hasSettings = !!shippingProviderSettings;
          
          return (
            <DeliveryTypeField
              key={field.id}
              field={field}
              extendedFields={extendedFields}
              setExtendedFields={setExtendedFields}
              setValue={setValue}
              recalculateAndSetDeliveryPrice={recalculateAndSetDeliveryPrice}
              handleProvinceChange={handleProvinceChange}
              updateValue={updateFieldValue}
              shippingProviderSettings={shippingProviderSettings}
            />
          );
        }
        
        // لأي حقل radio آخر، استخدم المكون العام
        return (
          <RadioField 
            key={field.id}
            field={field} 
            setExtendedFields={setExtendedFields}
            extendedFields={extendedFields}
            recalculateAndSetDeliveryPrice={recalculateAndSetDeliveryPrice}
            updateValue={updateFieldValue}
            shippingProviderSettings={field.name === 'fixedDeliveryType' ? shippingProviderSettings : undefined}
          />
        );
      
      case 'checkbox':
        return <CheckboxField field={field} key={field.id} />;
      
      case 'province':
        return (
          <ProvinceField 
            key={field.id}
            field={field} 
            handleProvinceChange={handleProvinceChange}
            updateValue={updateFieldValue}
          />
        );

      case 'municipality':
        return (
          <MunicipalityField 
            key={field.id}
            field={field}
            recalculateAndSetDeliveryPrice={recalculateAndSetDeliveryPrice}
            setValue={setValue}
            setExtendedFields={setExtendedFields}
            extendedFields={extendedFields}
            updateValue={updateFieldValue}
          />
        );

      case 'deliveryType':
        return <SelectField field={field} key={field.id} updateValue={updateFieldValue} />;

      default:
        return null;
    }
  };

  // عرض النموذج
  const content = (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-foreground border-b border-border pb-3">معلومات الطلب</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {uniqueFields.map(renderField)}
        </div>
      </div>
      
      {children}
      
      {onSubmit && !noForm && (
        <div className="mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-primary hover:bg-primary-darker text-primary-foreground font-semibold rounded-lg transition duration-200 disabled:opacity-70 shadow-md hover:shadow-lg flex items-center justify-center text-lg"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري إرسال الطلب...
              </>
            ) : (
              <>
                <CreditCard className="ml-2 h-5 w-5" /> 
                إرسال الطلب
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
  
  // إذا كان noForm صحيحًا، نعرض المحتوى مباشرة بدون عنصر form
  if (noForm) {
    return content;
  }
  
  // وإلا نعرض المحتوى داخل عنصر form
  return (
    <form onSubmit={onSubmit ? onSubmit : (e) => e.preventDefault()} className="custom-form">
      {content}
    </form>
  );
}; 