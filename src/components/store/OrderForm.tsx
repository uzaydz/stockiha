import { useState, useRef, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTenant } from "@/context/TenantContext";
import { OrderFormProps, orderFormSchema, OrderFormValues, CustomFormField } from "./order-form/OrderFormTypes";
import { PersonalInfoFields, DeliveryInfoFields, CustomFormFields, OrderSummary, getShippingProviderClone } from "./order-form";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import {
  submitOrderForm,
  checkDatabaseConnection,
  collectCustomFormData,
  validateCustomForm,
  transferCustomFormData
} from "./order-form";
import { processOrder, getProductNameById } from "@/api/store";
import { YalidineApiClient } from "../../lib/yalidine-api-client";
import { supabase } from "@/lib/supabase-client";
import * as yalidineService from "@/api/yalidine/service";
import { YalidineShippingService } from '@/api/shippingService';
import type { YalidineWilaya } from '@/api/shippingService';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getShippingProvinces, getShippingMunicipalities, calculateShippingFee } from "@/api/product-page";
import { ShippingProviderSettings } from "./order-form/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Home, Building, Truck, AlertCircle } from "lucide-react";
import { DELIVERY_COMPANIES, DELIVERY_OPTIONS, PAYMENT_METHODS } from "./order-form/OrderFormTypes";
// Ensure lodash-es is installed: npm install lodash-es OR yarn add lodash-es
import { debounce } from 'lodash-es'; 

/**
 * نموذج الطلب المحسن
 */
// TODO: اجعل هذا قابلًا للإعداد أو احصل عليه من إعدادات المتجر بشكل ديناميكي
const DEFAULT_FROM_WILAYA_ID = '40';

interface AbandonedCartPayload {
  organization_id: string;
  product_id?: string | null;
  product_color_id?: string | null;
  product_size_id?: string | null;
  quantity?: number;
  customer_name?: string;
  customer_phone: string;
  customer_email?: string;
  province?: string;
  municipality?: string;
  address?: string;
  delivery_option?: string;
  payment_method?: string;
  notes?: string;
  custom_fields_data?: Record<string, any>;
  calculated_delivery_fee?: number | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  // status is handled by the backend or specific flows
}

export default function OrderForm({
  productId,
  productColorId,
  productSizeId,
  sizeName,
  basePrice,
  activeOffer,
  deliveryFee = 0,
  quantity = 1,
  customFields = [],
  formSettings = null,
  productColorName = null,
  productSizeName = null
}: OrderFormProps) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState(deliveryFee);
  const [formReady, setFormReady] = useState(false);
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  
  // حالة معلومات الشحن
  const [communesList, setCommunesList] = useState<any[]>([]);
  const [isLoadingCommunes, setIsLoadingCommunes] = useState(false);
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null);
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<'home' | 'desk'>('home');
  
  // حالة مكاتب ياليدين
  const [yalidineCentersList, setYalidineCentersList] = useState<any[]>([]);
  const [isLoadingYalidineCenters, setIsLoadingYalidineCenters] = useState(false);
  const [selectedStopDeskId, setSelectedStopDeskId] = useState<string | null>(null); // لتخزين معرف المكتب المختار
  
  // حالة مزود الشحن المستنسخ
  const [shippingProviderSettings, setShippingProviderSettings] = useState<ShippingProviderSettings | null>(null);
  const [isLoadingProviderSettings, setIsLoadingProviderSettings] = useState(false);
  
  // التحقق من وجود دمج شركة توصيل
  const hasShippingIntegration = !!(formSettings?.settings?.shipping_integration?.enabled &&
                               formSettings?.settings?.shipping_integration?.provider_id);
  const shippingProviderId = hasShippingIntegration ? 
                           formSettings?.settings?.shipping_integration?.provider_id : null;

  // تحويل الكود من استخدام دالة عادية إلى دالة غير متزامنة
  const [shippingCloneId, setShippingCloneId] = useState<string | number | null>(null);

  // إعداد نموذج React Hook Form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      province: "",
      municipality: "",
      address: "",
      deliveryCompany: shippingProviderId || "yalidine",
      deliveryOption: "home",
      paymentMethod: "cash_on_delivery",
      notes: ""
    },
    mode: "onBlur",
    reValidateMode: "onChange"
  });

  // استخدام useMemo لتثبيت مرجع الحقول المخصصة المرئية
  const visibleCustomFields = useMemo(() => {
    return customFields.filter(field => field.isVisible === true);
  }, [customFields]);

  // --- Calculate Order Values based on Active Offer ---
  const subtotal = useMemo(() => basePrice * quantity, [basePrice, quantity]);

  const discountAmount = useMemo(() => {
    if (!activeOffer) return 0;
    if (activeOffer.type === 'discount_percentage' && activeOffer.discountValue) {
      return subtotal * (activeOffer.discountValue / 100);
    } else if (activeOffer.type === 'discount_fixed' && activeOffer.discountValue) {
      return activeOffer.discountValue;
    } 
    return 0;
  }, [activeOffer, subtotal]);

  // Determine if the active offer provides free shipping
  const hasFreeShipping = useMemo(() => {
    return activeOffer && (activeOffer.type === 'free_shipping' || activeOffer.freeShipping === true);
  }, [activeOffer]);
  // --- End Calculate Order Values ---

  // استخدام React Query لجلب الولايات
  const { data: wilayasList = [], isLoading: isLoadingWilayas } = useQuery({
    queryKey: ['shipping-provinces', tenant?.id],
    queryFn: () => tenant?.id ? getShippingProvinces(tenant.id) : Promise.resolve([]),
    enabled: !!tenant?.id && hasShippingIntegration,
    staleTime: 24 * 60 * 60 * 1000, // 24 ساعة
  });

  // مستمع لتغير نوع التوصيل
  const handleDeliveryTypeChange = (value: 'home' | 'desk') => {
    console.log(`[OrderForm] تغيير نوع التوصيل إلى: ${value}`);
    
    // مسح البيانات غير المتوافقة مع نوع التوصيل الجديد
    if (value === 'desk') {
      // عند اختيار التوصيل للمكتب: مسح البلدية وتحميل المكاتب
      form.setValue('municipality', '', { shouldValidate: false, shouldDirty: false });
      
      // تحميل مكاتب الاستلام إذا كانت الولاية محددة
      const currentProvince = form.getValues('province');
      if (currentProvince && hasShippingIntegration) {
        console.log(`[OrderForm] تحميل مكاتب الولاية ${currentProvince} للتوصيل للمكتب`);
        
        // إعادة تعيين قائمة المكاتب قبل التحميل
        setYalidineCentersList([]);
        // مسح قيمة المكتب المحددة
        form.setValue('stopDeskId', '', { shouldValidate: false, shouldDirty: false });
        
        // تحميل المكاتب مع تأخير قصير للتأكد من تحديث واجهة المستخدم أولاً
        setTimeout(async () => {
          try {
            setIsLoadingYalidineCenters(true);
            const { data: centers, error } = await supabase
              .from('yalidine_centers_global')
              .select('center_id, name, commune_id, wilaya_id, commune_name')
              .eq('wilaya_id', Number(currentProvince));
              
            if (error) {
              console.error('[OrderForm] خطأ في تحميل مكاتب ياليدين:', error);
              setYalidineCentersList([]);
            } else if (centers && centers.length > 0) {
              console.log(`[OrderForm] تم تحميل ${centers.length} مكتب للولاية ${currentProvince}`);
              setYalidineCentersList(centers);
            } else {
              console.warn(`[OrderForm] لا توجد مكاتب متاحة للولاية ${currentProvince}`);
              setYalidineCentersList([]);
            }
      } catch (error) {
            console.error('[OrderForm] استثناء عند تحميل مكاتب ياليدين:', error);
            setYalidineCentersList([]);
      } finally {
            setIsLoadingYalidineCenters(false);
          }
        }, 100);
      }
    } else {
      // عند اختيار التوصيل للمنزل: مسح معرف المكتب وتحميل البلديات
      form.setValue('stopDeskId', '', { shouldValidate: false, shouldDirty: false });
      
      // تحميل البلديات إذا كانت الولاية محددة
      const currentProvince = form.getValues('province');
      if (currentProvince && hasShippingIntegration) {
        console.log(`[OrderForm] تحميل بلديات الولاية ${currentProvince} للتوصيل المنزلي`);
        
        // إعادة تعيين قائمة البلديات قبل التحميل
        setCommunesList([]);
        // مسح قيمة البلدية المحددة
        form.setValue('municipality', '', { shouldValidate: false, shouldDirty: false });
        
        // تحميل البلديات مع تأخير قصير للتأكد من تحديث واجهة المستخدم أولاً
        setTimeout(async () => {
    try {
      setIsLoadingCommunes(true);
            const municipalities = await getShippingMunicipalities(Number(currentProvince));
      
            if (Array.isArray(municipalities) && municipalities.length > 0) {
              console.log(`[OrderForm] تم تحميل ${municipalities.length} بلدية للولاية ${currentProvince}`);
        setCommunesList(municipalities);
      } else {
              console.warn(`[OrderForm] لا توجد بلديات متاحة للولاية ${currentProvince}`);
        setCommunesList([]);
      }
    } catch (error) {
      console.error('[OrderForm] خطأ في تحميل البلديات:', error);
      setCommunesList([]);
    } finally {
      setIsLoadingCommunes(false);
    }
        }, 100);
      }
    }
    
    // تحديث حالة المكون ونموذج react-hook-form
    setSelectedDeliveryType(value);
    form.setValue('deliveryOption', value);
  };

  // دالة لمعالجة تغيير الولاية
  const handleWilayaChange = (wilayaId: string) => {
    console.log(`[OrderForm] تم استدعاء handleWilayaChange مع الولاية: ${wilayaId}`);
    
    // تحديث قيمة الولاية في النموذج
    form.setValue('province', wilayaId, { shouldValidate: true });
    
    // مسح قيم البلدية ومكتب الاستلام القديمة
    form.setValue('municipality', '', { shouldValidate: false, shouldDirty: false });
    form.setValue('stopDeskId', '', { shouldValidate: false, shouldDirty: false });
    
    // مسح قوائم البلديات والمكاتب القديمة
    setCommunesList([]);
    setYalidineCentersList([]);
    
    // تحميل البيانات الجديدة بناءً على نوع التوصيل الحالي
    const currentDeliveryOption = form.getValues('deliveryOption');
    
    setTimeout(async () => {
      if (currentDeliveryOption === 'desk') {
        // إذا كان التوصيل للمكتب، قم بتحميل مكاتب ياليدين الجديدة
        console.log(`[OrderForm] تحميل مكاتب ياليدين للولاية الجديدة: ${wilayaId}`);
        
        try {
          setIsLoadingYalidineCenters(true);
          const { data: centers, error } = await supabase
            .from('yalidine_centers_global')
            .select('center_id, name, commune_id, wilaya_id, commune_name')
            .eq('wilaya_id', Number(wilayaId));
            
          if (error) {
            console.error('[OrderForm] خطأ في تحميل مكاتب ياليدين:', error);
            setYalidineCentersList([]);
          } else if (centers && centers.length > 0) {
            console.log(`[OrderForm] تم تحميل ${centers.length} مكتب للولاية ${wilayaId}`);
            setYalidineCentersList(centers);
          } else {
            console.warn(`[OrderForm] لا توجد مكاتب متاحة للولاية ${wilayaId}`);
            setYalidineCentersList([]);
          }
        } catch (error) {
          console.error('[OrderForm] استثناء عند تحميل مكاتب ياليدين:', error);
          setYalidineCentersList([]);
        } finally {
          setIsLoadingYalidineCenters(false);
        }
      } else {
        // إذا كان التوصيل للمنزل، قم بتحميل بلديات جديدة
        console.log(`[OrderForm] تحميل بلديات الولاية الجديدة: ${wilayaId}`);
        
        try {
          setIsLoadingCommunes(true);
          const municipalities = await getShippingMunicipalities(Number(wilayaId));
          
          if (Array.isArray(municipalities) && municipalities.length > 0) {
            console.log(`[OrderForm] تم تحميل ${municipalities.length} بلدية للولاية ${wilayaId}`);
            setCommunesList(municipalities);
          } else {
            console.warn(`[OrderForm] لا توجد بلديات متاحة للولاية ${wilayaId}`);
            setCommunesList([]);
          }
        } catch (error) {
          console.error('[OrderForm] خطأ في تحميل البلديات:', error);
          setCommunesList([]);
        } finally {
          setIsLoadingCommunes(false);
        }
      }
    }, 100);
  };

  // تهيئة النموذج بعد التحميل
  useEffect(() => {
    // التأكد من أن النموذج جاهز
    setFormReady(true);
    
    // تحديد الشركة الافتراضية للتوصيل
    const defaultCompany = hasShippingIntegration && shippingProviderId ? 
                         shippingProviderId : "yalidine";
    form.setValue("deliveryCompany", defaultCompany);
    
    // تحديد القيم الافتراضية للنموذج
    if (!form.getValues().deliveryOption) {
      form.setValue("deliveryOption", "home");
    }
    
    if (!form.getValues().paymentMethod) {
      form.setValue("paymentMethod", "cash_on_delivery");
    }
    
    // إعادة تعيين أي أخطاء سابقة
    setError(null);
    
    // تسجيل حالة النموذج بعد التهيئة
    
    
  }, []);

  // تحديد تهيئة الخاصيات
  useEffect(() => {
    // استخدام إعداد افتراضي لمعالجة الحالة التي لا يوجد فيها إعدادات مزود شحن
    if (!shippingProviderSettings) {
      
      
      setSelectedDeliveryType('home');
      form.setValue('deliveryOption', 'home');
    } else {
      
      // حدد نوع التوصيل الافتراضي بناءً على إعدادات مزود الشحن المستنسخ
      if (!shippingProviderSettings.is_home_delivery_enabled && shippingProviderSettings.is_desk_delivery_enabled) {
        
        setSelectedDeliveryType('desk');
        form.setValue('deliveryOption', 'desk');
      } else if (shippingProviderSettings.is_home_delivery_enabled && !shippingProviderSettings.is_desk_delivery_enabled) {
        
        setSelectedDeliveryType('home');
        form.setValue('deliveryOption', 'home');
      } else {
        
        setSelectedDeliveryType('home');
        form.setValue('deliveryOption', 'home');
      }
    }
  }, [shippingProviderSettings]);

  // إضافة مستمع لزر تأكيد الطلب
  useEffect(() => {
    // تم تعطيل هذا المستمع لأننا نستخدم معالج النقر المباشر الآن
    /*
    const setupSubmitButtonListener = () => {
      // انتظار حتى يتم تحميل الصفحة بالكامل
      setTimeout(() => {
        // البحث عن زر التقديم
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton && !submitButtonRef.current) {
          
          
          // إضافة مستمع الحدث
          const handleSubmitButtonClick = (e: Event) => {
            e.preventDefault(); // منع السلوك الافتراضي
            
            
            if (isSubmitting) {
              
              return;
            }
            
            // تنفيذ التقديم يدويًا
            if (formRef.current) {
              processFormSubmission();
            }
          };
          
          submitButton.addEventListener('click', handleSubmitButtonClick);
          submitButtonRef.current = submitButton as HTMLButtonElement;
          
          // إزالة المستمع عند تدمير المكون
          return () => {
            if (submitButtonRef.current) {
              submitButtonRef.current.removeEventListener('click', handleSubmitButtonClick);
            }
          };
        }
      }, 500); // تأخير للتأكد من تحميل جميع العناصر
    };
    
    setupSubmitButtonListener();
    */
  }, [isSubmitting]);

  // توجيه المستخدم إلى صفحة الشكر عند نجاح الطلب
  useEffect(() => {
    if (orderNumber) {
      const totalPrice = basePrice * quantity + currentDeliveryFee;
      
      // جلب اسم المنتج إذا تم توفيره
      const getProductInfo = async () => {
        try {
          // استخدام واجهة برمجة التطبيقات الداخلية للحصول على معلومات المنتج
          let productName = "";
          if (productId) {
            productName = await getProductNameById(productId);
          }
          
          // توجيه المستخدم إلى صفحة الشكر مع بيانات الطلب
          navigate(`/thank-you?orderNumber=${orderNumber}&quantity=${quantity}&price=${basePrice}&deliveryFee=${currentDeliveryFee}&totalPrice=${totalPrice}&productId=${productId || ""}&productName=${encodeURIComponent(productName)}`);
        } catch (error) {
          console.error("خطأ أثناء جلب معلومات المنتج:", error);
          // التوجيه بدون معلومات المنتج في حالة حدوث خطأ
          navigate(`/thank-you?orderNumber=${orderNumber}&quantity=${quantity}&price=${basePrice}&deliveryFee=${currentDeliveryFee}&totalPrice=${totalPrice}`);
        }
      };
      
      getProductInfo();
    }
  }, [orderNumber, navigate, quantity, basePrice, currentDeliveryFee, productId]);

  // معالجة تقديم النموذج بشكل مباشر
  const processFormSubmission = async () => {
    try {
      // الطباعة التشخيصية لفهم المشكلة
      console.log("===== تشخيص مشكلة stopDeskId =====");
      console.log("قيم النموذج عند التقديم:", form.getValues());
      console.log("نوع التوصيل:", form.getValues('deliveryOption'));
      console.log("معرف مكتب الاستلام:", form.getValues('stopDeskId'));
      console.log("في النموذج المخصص:", visibleCustomFields && visibleCustomFields.length > 0);
      console.log("===================================");
      
      // إعداد قائمة الحقول المطلوبة
      const requiredFields = ['fullName', 'phone', 'province'];
      
      // جمع جميع قيم النموذج
      const formValues = form.getValues();
      
      // إصلاح لمشكلة النموذج المخصص في حالة stopDeskId
      if (visibleCustomFields && visibleCustomFields.length > 0 && formValues.deliveryOption === 'desk') {
        // تحقق إذا كان مكتب الاستلام المختار فعليًا موجود في قائمة المكاتب
        const validStopDesk = yalidineCentersList.find(
          center => center.center_id.toString() === formValues.stopDeskId
        );
        
        // إذا كان مكتب الاستلام غير موجود، ابحث عن مكتب مرتبط بالبلدية المختارة
        if (!validStopDesk && formValues.municipality) {
          console.log(`[إصلاح] البحث عن مكتب مرتبط بالبلدية: ${formValues.municipality}`);
          
          // البحث عن مكتب في البلدية المختارة بشكل أكثر دقة
          try {
            const { data: centers, error } = await supabase
              .from('yalidine_centers_global')
              .select('center_id, name, commune_id, wilaya_id, commune_name')
              .eq('commune_id', Number(formValues.municipality))
              .eq('wilaya_id', Number(formValues.province));
              
            if (error) {
              console.error("[إصلاح] خطأ في الاستعلام عن المكاتب:", error);
            } else if (centers && centers.length > 0) {
              // استخدام المكتب الأول المرتبط بالبلدية المختارة
              const centerId = centers[0].center_id.toString();
              console.log(`[إصلاح] تم العثور على مكتب مرتبط بالبلدية: ${centerId} (${centers[0].name})`);
              form.setValue('stopDeskId', centerId, { shouldValidate: true, shouldDirty: true });
              formValues.stopDeskId = centerId;
            } else {
              // البحث عن مكتب في الولاية إذا لم يتم العثور على مكتب للبلدية
              const { data: wilayaCenters, error: wilayaError } = await supabase
                .from('yalidine_centers_global')
                .select('center_id, name, commune_id, wilaya_id, commune_name')
                .eq('wilaya_id', Number(formValues.province));
                
              if (wilayaError) {
                console.error("[إصلاح] خطأ في الاستعلام عن مكاتب الولاية:", wilayaError);
              } else if (wilayaCenters && wilayaCenters.length > 0) {
                // استخدام المكتب الأول في الولاية
                const centerId = wilayaCenters[0].center_id.toString();
                console.log(`[إصلاح] تم العثور على مكتب في الولاية: ${centerId} (${wilayaCenters[0].name})`);
                form.setValue('stopDeskId', centerId, { shouldValidate: true, shouldDirty: true });
                formValues.stopDeskId = centerId;
              } else if (!formValues.stopDeskId) {
                // إذا لم يتم العثور على مكتب واستمرت المشكلة
                console.log("[إصلاح] لا توجد مكاتب متاحة، استخدام قيمة افتراضية");
                form.setValue('stopDeskId', '1', { shouldValidate: true, shouldDirty: true });
                formValues.stopDeskId = '1';
                formValues.stop_desk_id = '1';
              }
            }
          } catch (searchError) {
            console.error("[إصلاح] خطأ غير متوقع في البحث عن المكاتب:", searchError);
            // استخدام القيمة الافتراضية في حالة الخطأ
            if (!formValues.stopDeskId) {
              console.log("[إصلاح] استخدام قيمة افتراضية بسبب خطأ");
              form.setValue('stopDeskId', '1', { shouldValidate: true, shouldDirty: true });
              formValues.stopDeskId = '1';
              formValues.stop_desk_id = '1';
            }
          }
        }
      }
      
      // إضافة البلدية أو مكتب الاستلام حسب نوع التوصيل
      if (formValues.deliveryOption === 'home') {
        requiredFields.push('municipality');
        requiredFields.push('address');
      } else if (formValues.deliveryOption === 'desk') {
        requiredFields.push('stopDeskId'); // Address might not be required for desk pickup
      }
      
      // التحقق من الحقول المطلوبة
      const missingFields = requiredFields.filter(field => !formValues[field]);
      
      // إذا كانت هناك حقول مفقودة، عرض خطأ
      if (missingFields.length > 0) {
        console.error("حقول مفقودة:", missingFields);
        setError(`يرجى ملء الحقول التالية: ${missingFields.map(field => getFieldLabel(field)).join(', ')}`);
        setIsSubmitting(false);
        return;
      }
      
      // طباعة قيمة البلدية للتشخيص
      const municipalityValue = formValues.municipality;
      
      const stopDeskIdValue = formValues.stopDeskId;
      

      // استخراج معرف النموذج ومزود الشحن
      const formId = formSettings?.id;
      
      // استخراج معرف مزود الشحن المستنسخ
      let shippingCloneProviderId = null;
      
      // استخراج معرف مزود الشحن المستنسخ من إعدادات النموذج
      if (formSettings?.settings) {
        if (typeof formSettings.settings.shipping_clone_id !== 'undefined') {
          shippingCloneProviderId = formSettings.settings.shipping_clone_id;
        } else if (formSettings.settings.shipping_integration && 
                  formSettings.settings.shipping_integration.provider_id) {
          shippingCloneProviderId = formSettings.settings.shipping_integration.provider_id;
        }
      }
      
      // استخدام المعرف المخزن في الحالة إذا كان متاحاً
      if (shippingCloneId && !shippingCloneProviderId) {
        shippingCloneProviderId = shippingCloneId;
      }
      


      
      
      // إعداد النموذج للإرسال مع القيم المطلوبة
      setIsSubmitting(true);
      setError(null);
      
      // تأكد إضافي من قيمة رسوم التوصيل قبل الإرسال
      
      
      
      // إذا كانت بعض الحقول المطلوبة فارغة، استخدم قيم افتراضية
      const submissionValues: Record<string, any> = {
        ...formValues,
        fullName: formValues.fullName || 'زائر',
        phone: formValues.phone || '0000000000',
        province: formValues.province || 'غير محدد',
        // municipality and address will be handled based on deliveryOption
        deliveryOption: formValues.deliveryOption || 'home',
        form_id: formId,
        shipping_clone_id: shippingCloneProviderId
      };

      if (formValues.deliveryOption === 'home') {
        submissionValues.municipality = formValues.municipality || 'غير محدد';
        submissionValues.address = formValues.address || 'غير محدد';
      } else if (formValues.deliveryOption === 'desk') {
        // تأكد من أن قيمة stopDeskId موجودة
        if (!formValues.stopDeskId) {
          if (visibleCustomFields && visibleCustomFields.length > 0) {
            // في حالة النموذج المخصص، قد نحتاج إلى استخدام قيمة افتراضية
            console.log("[إرسال] استخدام قيمة افتراضية لمكتب الاستلام في النموذج المخصص");
            formValues.stopDeskId = '1';
            submissionValues.stopDeskId = '1';
            submissionValues.stop_desk_id = '1';
          } else {
            setError('يرجى اختيار مكتب الاستلام');
            setIsSubmitting(false);
            return;
          }
        }
        
        submissionValues.stop_desk_id = formValues.stopDeskId || null; // Use the new column name
        // For 'desk' delivery, municipality might not be directly from the form,
        // or could be the commune_id of the stop desk. Address is usually not needed.
        // We will ensure the stop desk's commune_id is used for fee calculation.
        // The actual 'municipality' field in the order might be less relevant here,
        // but we can set it to the stop desk's commune if needed for consistency.
        const selectedCenter = yalidineCentersList.find(center => center.center_id.toString() === formValues.stopDeskId);
        if (selectedCenter) {
            submissionValues.municipality = selectedCenter.commune_id?.toString() || 'غير محدد'; 
        } else {
            submissionValues.municipality = 'غير محدد'; // Fallback
        }
        submissionValues.address = 'استلام من مكتب ياليدين'; // Or a more specific address from the center if available
        
        // إضافة طباعة تشخيصية للمساعدة في تتبع المشكلة
        console.log(`[إرسال] تم تعيين stop_desk_id إلى: ${submissionValues.stop_desk_id}`);
      }
      
      // التأكد من أن سعر التوصيل ليس 0 إذا تم حسابه بنجاح
      // Adjust final delivery fee based on free shipping offer
      const finalDeliveryFee = hasFreeShipping ? 0 : currentDeliveryFee;
      
      
      
      // تحويل نوع التوصيل للنظام الخلفي عند الإرسال
      const apiDeliveryType = submissionValues.deliveryOption === 'desk' ? 'desk' : submissionValues.deliveryOption;
      
      

      // --- Construct Metadata Payload --- 
      let metadataPayload: Record<string, any> = {}; // Initialize as an empty object

      if (activeOffer) {
        metadataPayload.applied_quantity_offer = {
            id: activeOffer.id, 
            type: activeOffer.type,
            minQuantity: activeOffer.minQuantity,
            discountValue: activeOffer.discountValue || 0, 
            appliedDiscountAmount: discountAmount, 
            appliedFreeShipping: hasFreeShipping 
        };
      }

      if (formValues.deliveryOption === 'desk' && formValues.stopDeskId) {
        const selectedCenter = yalidineCentersList.find(center => center.center_id.toString() === formValues.stopDeskId);
        if (selectedCenter) {
          metadataPayload.shipping_details = {
            ...metadataPayload.shipping_details, // Preserve other shipping details if any
            stop_desk_id: selectedCenter.center_id,
            stop_desk_name: selectedCenter.name,
            stop_desk_commune_id: selectedCenter.commune_id,
            // You might want to add wilaya_id and full address of the stop desk here too
            stop_desk_wilaya_id: selectedCenter.wilaya_id, 
          };
        }
      }
      
      // --- End Construct Metadata Payload ---
      
      await submitOrderForm({
        values: submissionValues,
        organizationId: tenant.id,
        productId,
        productColorId,
        productSizeId,
        sizeName: sizeName || null,
        quantity,
        price: basePrice, // Pass basePrice as price here
        deliveryFee: finalDeliveryFee, // استخدام القيمة النهائية المؤكدة
        metadata: metadataPayload, // Pass the constructed metadata
        formData: submissionValues, // تمرير بيانات النموذج كاملة بما فيها stop_desk_id
        onSuccess: (orderNum) => {
          
          setOrderNumber(orderNum);
        },
        onError: (msg) => {
          console.error("خطأ في إرسال الطلب:", msg);
          setError(msg);
        },
        onSubmitStart: () => {
          
        },
        onSubmitEnd: () => {
          
          setIsSubmitting(false);
        }
      });
      
    } catch (error) {
      console.error("خطأ في إرسال النموذج:", error);
      setError("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  // وظيفة مساعدة للحصول على تسمية الحقل من حقول النموذج المخصصة
  const getFieldLabel = (fieldName: string, fields: any[] = visibleCustomFields) => {
    const field = fields.find(f => f.name === fieldName);
    if (field) return field.label;
    
    // تسميات للحقول الافتراضية
    const defaultLabels: Record<string, string> = {
      fullName: 'الاسم الكامل',
      phone: 'رقم الهاتف',
      province: 'الولاية',
      municipality: 'البلدية',
      address: 'العنوان',
      deliveryOption: 'نوع التوصيل',
      deliveryCompany: 'شركة التوصيل',
      paymentMethod: 'طريقة الدفع',
      stopDeskId: 'مكتب الاستلام' // Add label for stopDeskId
    };
    
    return defaultLabels[fieldName] || fieldName;
  };

  // معالجة تقديم النموذج عند النقر على زر الإرسال (يتم استدعاؤها بواسطة form.handleSubmit)
  const onSubmit = async (values: OrderFormValues) => {
    
    // معظم المنطق تم نقله إلى processFormSubmission
    // processFormSubmission سيتم استدعاؤه من داخل زر النقر المخصص
    // أو يمكنك الاحتفاظ بهذا إذا كنت تفضل استخدام form.handleSubmit القياسي
    // في هذه الحالة، تأكد من أن processFormSubmission لا يتم استدعاؤه مرتين.
    // للتصميم الحالي حيث يتم استدعاء onSubmit من form.handleSubmit، ونحن نستدعي onSubmit من زر النقر:
    // هذا جيد، حيث أن onSubmit الآن سيفوض إلى processFormSubmission.
    
    // استدعاء وظيفة معالجة النموذج
    await processFormSubmission(); 
  };

  // دالة للتشخيص تقوم بإضافة stopDeskId إلى النموذج يدوياً في حالة النموذج المخصص
  const debugAddStopDeskIdIfMissing = async () => {
    // التحقق مما إذا كنا في النموذج المخصص
    if (visibleCustomFields && visibleCustomFields.length > 0) {
      // التحقق مما إذا كان نوع التوصيل هو للمكتب
      const deliveryOption = form.getValues('deliveryOption');
      if (deliveryOption === 'desk') {
        // التحقق مما إذا كان stopDeskId غير موجود أو فارغ
        const stopDeskId = form.getValues('stopDeskId');
        if (!stopDeskId) {
          console.log("[تشخيص] stopDeskId مفقود في النموذج المخصص، سيتم إضافته يدوياً");
          
          // الحصول على الولاية والبلدية الحالية
          const provinceId = form.getValues('province');
          const municipalityId = form.getValues('municipality');
          
          if (provinceId && municipalityId) {
            // البحث عن مكتب استلام مرتبط بالبلدية
            try {
              const { data: centers, error } = await supabase
                .from('yalidine_centers_global')
                .select('center_id, name, commune_id, wilaya_id, commune_name')
                .eq('commune_id', Number(municipalityId))
                .eq('wilaya_id', Number(provinceId));
                
              if (error) {
                console.error("[تشخيص] خطأ في الاستعلام عن المكاتب:", error);
              } else if (centers && centers.length > 0) {
                // استخدام المكتب الأول المرتبط بالبلدية
                const centerId = centers[0].center_id.toString();
                console.log(`[تشخيص] تم العثور على مكتب ${centerId} (${centers[0].name}) للبلدية ${municipalityId}`);
                form.setValue('stopDeskId', centerId, { shouldValidate: true, shouldDirty: true });
                return true;
              } else {
                console.log(`[تشخيص] لم يتم العثور على مكتب للبلدية ${municipalityId}، البحث في الولاية`);
                
                // البحث عن مكاتب في الولاية إذا لم نجد للبلدية
                const { data: wilayaCenters, error: wilayaError } = await supabase
                  .from('yalidine_centers_global')
                  .select('center_id, name, commune_id, wilaya_id, commune_name')
                  .eq('wilaya_id', Number(provinceId));
                  
                if (wilayaError) {
                  console.error("[تشخيص] خطأ في الاستعلام عن مكاتب الولاية:", wilayaError);
                } else if (wilayaCenters && wilayaCenters.length > 0) {
                  // استخدام المكتب الأول في الولاية
                  const centerId = wilayaCenters[0].center_id.toString();
                  console.log(`[تشخيص] تم العثور على مكتب ${centerId} (${wilayaCenters[0].name}) في الولاية ${provinceId}`);
                  form.setValue('stopDeskId', centerId, { shouldValidate: true, shouldDirty: true });
                  return true;
                }
              }
            } catch (error) {
              console.error("[تشخيص] خطأ غير متوقع في البحث عن المكاتب:", error);
            }
          }
          
          // العثور على أول معرف مكتب متاح في yalidineCentersList
          if (yalidineCentersList && yalidineCentersList.length > 0) {
            const firstCenter = yalidineCentersList[0];
            const centerId = firstCenter.center_id.toString();
            console.log(`[تشخيص] تعيين قيمة مكتب الاستلام إلى: ${centerId}`);
            form.setValue('stopDeskId', centerId, { shouldValidate: true, shouldDirty: true });
            return true;
          } else {
            console.log("[تشخيص] لا توجد مكاتب استلام متاحة، استخدام قيمة افتراضية");
            form.setValue('stopDeskId', '1', { shouldValidate: true, shouldDirty: true });
            return false;
          }
        } else {
          console.log(`[تشخيص] stopDeskId موجود بالفعل: ${stopDeskId}`);
          return true;
        }
      } else {
        console.log(`[تشخيص] نوع التوصيل ليس للمكتب: ${deliveryOption}`);
        return true;
      }
    } else {
      console.log("[تشخيص] لسنا في النموذج المخصص");
      return true;
    }
  };

  // تعريف دالة استخلاص معرف مزود الشحن المستنسخ
  const extractShippingCloneId = async (): Promise<string | number | null> => {
    
    
    // البحث في formSettings
    if (formSettings) {
      
      
      // فحص مباشر عن shipping_clone_id في جذر إعدادات النموذج
      if (formSettings.settings && formSettings.settings.shipping_clone_id) {
        
        return formSettings.settings.shipping_clone_id;
      }
      
      // البحث في purchase_page_config داخل formSettings
      if (formSettings.purchase_page_config && formSettings.purchase_page_config.shipping_clone_id) {
        
        return formSettings.purchase_page_config.shipping_clone_id;
      }
      
      // فحص في إعدادات تكامل الشحن
      if (formSettings.settings && 
          formSettings.settings.shipping_integration && 
          formSettings.settings.shipping_integration.enabled &&
          formSettings.settings.shipping_integration.provider_id) {
        
        return formSettings.settings.shipping_integration.provider_id;
      }
    }
    
    // البحث عن معرف مزود الشحن المستنسخ للمنتج المحدد
    if (productId) {
      try {
        
        const { data: productData, error } = await supabase
          .from('products')
          .select('shipping_clone_id, purchase_page_config')
          .eq('id', productId)
          .single();
        
        if (error) {
          console.error(">> خطأ في استعلام المنتج:", error);
        } else if (productData) {
          // البحث في shipping_clone_id مباشرة
          if (productData.shipping_clone_id) {
            
            return productData.shipping_clone_id;
          }
          
          // البحث في purchase_page_config
          if (productData.purchase_page_config && productData.purchase_page_config.shipping_clone_id) {
            
            return productData.purchase_page_config.shipping_clone_id;
          }
        }
      } catch (err) {
        console.error(">> خطأ في البحث عن معرف مزود الشحن للمنتج:", err);
      }
    }
    
    // محاولة استخراج المعرف من الإعدادات بطرق أخرى
    if (formSettings && formSettings.settings) {
      // فحص في النسخة غير المنسقة من الإعدادات
      try {
        const settingsStr = JSON.stringify(formSettings.settings);
        
        
        if (settingsStr.includes("shipping_clone_id")) {
          // تحليل يدوي للنص
          const match = settingsStr.match(/"shipping_clone_id"\s*:\s*"?(\d+)"?/);
          if (match && match[1]) {
            
            return match[1];
          }
        }
      } catch (e) {
        console.error(">> خطأ في تحليل إعدادات النموذج:", e);
      }
    }
    
    
    return await getDefaultShippingCloneId();
  };

  // دالة للبحث عن معرف مزود شحن مستنسخ افتراضي
  const getDefaultShippingCloneId = async (): Promise<string | number | null> => {
    if (!tenant || !tenant.id) {
      
      return null;
    }

    try {
      
      
      // استخدام any لتجاوز التحقق من النوع
      const result = await (supabase as any).from('shipping_provider_clones')
        .select('id')
        .eq('organization_id', tenant.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const defaultCloneId = result.data[0].id;
        
        
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
        
        // استخدم 1 كقيمة افتراضية إذا لم يتم العثور على سجل
        return 1;
      }
    } catch (error) {
      console.error(">> خطأ في البحث عن مزود شحن مستنسخ افتراضي:", error);
      // استخدم 1 كقيمة افتراضية في حالة حدوث خطأ
      return 1;
    }
  };

  // استدعاء دالة استخلاص معرف مزود الشحن المستنسخ
  useEffect(() => {
    const getCloneId = async () => {
      try {
        const cloneId = await extractShippingCloneId();
        
        setShippingCloneId(cloneId);
      } catch (error) {
        console.error(">> خطأ في استخلاص معرف مزود الشحن المستنسخ:", error);
        setShippingCloneId(null);
      }
    };
    
    getCloneId();
  }, [formSettings, tenant?.id]);

  // جلب إعدادات مزود الشحن المستنسخ
  useEffect(() => {
    const fetchShippingProviderSettings = async () => {
      
      
      
      
      if (!shippingCloneId) {
        
        return;
      }
      
      try {
        setIsLoadingProviderSettings(true);
        
        
        // تحويل القيمة إلى رقم صحيح
        const numericCloneId = Number(shippingCloneId);
        
        // التحقق من صحة الرقم قبل الاستمرار
        if (isNaN(numericCloneId)) {
          console.error(">> معرف مزود الشحن المستنسخ غير صالح:", shippingCloneId);
          setIsLoadingProviderSettings(false);
          return;
        }
        
        
        const cloneData = await getShippingProviderClone(numericCloneId);
        
        if (cloneData) {
          
          setShippingProviderSettings(cloneData as ShippingProviderSettings);
          
          // تعيين نوع التوصيل الافتراضي بناءً على الإعدادات
          const typedCloneData = cloneData as ShippingProviderSettings;
          
          
          
          if (!typedCloneData.is_home_delivery_enabled && typedCloneData.is_desk_delivery_enabled) {
            
            setSelectedDeliveryType('desk');
            form.setValue('deliveryOption', 'desk');
          } else if (typedCloneData.is_home_delivery_enabled && !typedCloneData.is_desk_delivery_enabled) {
            
            setSelectedDeliveryType('home');
            form.setValue('deliveryOption', 'home');
          } else {
            
            setSelectedDeliveryType('home');
            form.setValue('deliveryOption', 'home');
          }
        } else {
          
          // استخدام اعدادات افتراضية
          
          setSelectedDeliveryType('home');
          form.setValue('deliveryOption', 'home');
        }
      } catch (error) {
        console.error(">> خطأ في جلب إعدادات مزود الشحن المستنسخ:", error);
        // استخدام اعدادات افتراضية في حالة الخطأ
        
        setSelectedDeliveryType('home');
        form.setValue('deliveryOption', 'home');
      } finally {
        setIsLoadingProviderSettings(false);
      }
    };
    
    fetchShippingProviderSettings();
  }, [shippingCloneId]);

  // معالجة تغيير نوع التوصيل (home أو desk) بناءً على إعدادات مزود الشحن
  useEffect(() => {
    if (shippingProviderSettings) {
      
      
      // عرض خيار التوصيل للمنزل فقط إذا كان مفعلاً
      if (shippingProviderSettings.is_home_delivery_enabled === true && 
          shippingProviderSettings.is_desk_delivery_enabled === false && 
          selectedDeliveryType !== 'home') {
        
        setSelectedDeliveryType('home');
        form.setValue('deliveryOption', 'home');
      } 
      // عرض خيار التوصيل للمكتب فقط إذا كان مفعلاً
      else if (shippingProviderSettings.is_home_delivery_enabled === false && 
               shippingProviderSettings.is_desk_delivery_enabled === true && 
               selectedDeliveryType !== 'desk') {
        
        setSelectedDeliveryType('desk');
        form.setValue('deliveryOption', 'desk');
      }
    }
  }, [shippingProviderSettings, selectedDeliveryType]);

  // تحديد قيمة حقل deliveryOption في react-hook-form
  useEffect(() => {
    form.setValue('deliveryOption', selectedDeliveryType);
    
  }, [selectedDeliveryType, form]);

  // تخزين مؤقت للطلب السابق لمقارنته قبل الحفظ
  const lastSavedCartRef = useRef<string>('');

  // Debounced function to save abandoned cart
  const debouncedSaveAbandonedCart = debounce(async (formData: OrderFormValues, currentCustomFieldsData?: Record<string, string>) => {
    // التحقق من وجود مستأجر وهاتف صالح يحتوي على 8 أرقام على الأقل
    if (!tenant?.id || !formData.phone || formData.phone.length < 8) {
      return;
    }

    // الحصول على النسخة السابقة للمقارنة
    const previousSavedCart = lastSavedCartRef.current;
    
    const payload: AbandonedCartPayload = {
      organization_id: tenant.id,
      customer_phone: formData.phone,
      customer_name: formData.fullName || undefined,
      customer_email: formData.email || undefined,
      province: formData.province || undefined,
      municipality: formData.municipality || undefined,
      address: formData.address || undefined,
      delivery_option: formData.deliveryOption || undefined,
      payment_method: formData.paymentMethod || undefined,
      notes: formData.notes || undefined,
      quantity: formData.quantity || 1,
      product_id: productId || null,
      product_color_id: productColorId || null,
      product_size_id: productSizeId || null,
      custom_fields_data: currentCustomFieldsData,
      calculated_delivery_fee: currentDeliveryFee,
      subtotal: subtotal, 
      discount_amount: discountAmount, 
      total_amount: subtotal - discountAmount + (hasFreeShipping ? 0 : currentDeliveryFee)
    };

    // حذف القيم الفارغة لتنظيف البيانات
    Object.keys(payload).forEach(key => {
      if ((payload as any)[key] === undefined) {
        delete (payload as any)[key];
      }
    });
    
    // تحويل البيانات إلى نص JSON للمقارنة
    const payloadAsString = JSON.stringify(payload);
    
    // التحقق مما إذا كانت البيانات الحالية تختلف عن آخر بيانات تم حفظها
    if (payloadAsString === lastSavedCartRef.current) {
      
      return;
    }
    
    // التحقق من وجود تغييرات جوهرية في البيانات
    const hasSignificantChanges = (prev: string, current: string): boolean => {
      if (!prev) return true; // إذا لم يكن هناك بيانات سابقة، فهناك تغيير جوهري
      
      try {
        const prevData = JSON.parse(prev);
        const currentData = JSON.parse(current);
        
        // فحص التغييرات في الحقول الرئيسية
        const criticalFields = ['customer_phone', 'customer_name', 'province', 'municipality', 'address'];
        
        for (const field of criticalFields) {
          // التحقق من أن الحقل موجود في كلا الكائنين وأن قيمتيهما مختلفتان
          if (prevData[field] !== currentData[field]) {
            // للحقول النصية مثل الاسم، تجاهل التغييرات إذا كان الفرق أقل من 3 أحرف (تجنب الحفظ عند الكتابة حرفاً بحرف)
            if (field === 'customer_name' && 
                typeof prevData[field] === 'string' && typeof currentData[field] === 'string') {
              
              // تجاهل التغييرات الطفيفة في الاسم (عند كتابة حرف بحرف)
              if (Math.abs(prevData[field].length - currentData[field].length) < 3) {
                continue;
              }
            }
            
            // هناك تغيير جوهري
            return true;
          }
        }
        
        return false;
      } catch (error) {
        return true; // في حالة وجود خطأ، نعتبر أن هناك تغييراً جوهرياً
      }
    };
    
    // التحقق من وجود تغييرات جوهرية قبل الحفظ
    if (!hasSignificantChanges(previousSavedCart, payloadAsString)) {
      
      return;
    }
    
    // تحديث مرجع آخر بيانات تم حفظها
    lastSavedCartRef.current = payloadAsString;
    
    
    const bodyAsJsonString = JSON.stringify(payload);
    

    try {
      // استخدام واجهة برمجة تطبيقات REST مباشرة
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/save-abandoned-cart`;
      
      // الحصول على رمز الوصول من الجلسة
      let accessToken = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || '';
      } catch (e) {
        console.error('خطأ في الحصول على رمز الوصول:', e);
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: bodyAsJsonString,
      });

      if (!response.ok) {
        // محاولة تحليل الخطأ من استجابة الجسم
        let errorData = { message: `HTTP error! status: ${response.status}` };
        try {
          const jsonError = await response.json();
          errorData = { ...jsonError, message: jsonError.error || jsonError.message || `HTTP error! status: ${response.status}` };
        } catch (e) {
          // لا يمكن تحليل JSON، استخدم نص الحالة أو الرسالة الافتراضية
          errorData.message = response.statusText || errorData.message;
        }
        console.error('Error saving abandoned cart:', errorData);
      } else {
        const data = await response.json();
        
      }

    } catch (invokeError) {
      // سيلتقط هذا أخطاء الشبكة أو المشكلات المتعلقة بالجلب نفسه
      console.error('Exception invoking Supabase function with fetch:', invokeError);
    }
  }, 3000); // زيادة وقت التأخير من 2 ثانية إلى 3 ثوانٍ للحد من الطلبات المتكررة

  // دالة معالجة فقدان التركيز في حقل الهاتف
  const handlePhoneBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const phone = event.target.value;
    // التحقق من أن الهاتف يحتوي على 8 أرقام على الأقل
    if (phone && phone.length >= 8 && tenant?.id) {
      
      const currentValues = form.getValues();
      
      // تحديث وقت آخر حفظ لتجنب الحفظ المتكرر
      lastSaveTimeRef.current = Date.now();
      
      // استخدام تأخير بسيط للسماح بتحديث أي قيم أخرى قبل الحفظ
      setTimeout(() => {
        debouncedSaveAbandonedCart(currentValues, currentValues.customFields);
      }, 300);
    }
  };

  // دالة مساعدة لمعالجة تركيز/فقدان تركيز الحقول النصية
  const handleTextFieldBlur = (fieldName: string, event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (fieldName === 'fullName') {
      const currentValues = form.getValues();
      
      // التحقق من أن الاسم ليس فارغاً
      if (currentValues.fullName && currentValues.fullName.length > 0 && tenant?.id) {
        // تأكد من وجود رقم هاتف صالح أيضاً
        if (currentValues.phone && currentValues.phone.length >= 8) {
          
          
          // تحديث وقت آخر حفظ
          lastSaveTimeRef.current = Date.now();
          
          // استخدام تأخير بسيط
          setTimeout(() => {
            debouncedSaveAbandonedCart(currentValues, currentValues.customFields);
          }, 300);
        }
      }
    }
  };

  const watchedPhone = form.watch('phone');
  
  // مراقبة جميع قيم النموذج بصورة إجمالية لتقليل عدد الطلبات
  const watchedValues = form.watch();

  // إنشاء مرجع للحفاظ على القيم السابقة للمقارنة
  const previousFormValuesRef = useRef<Partial<OrderFormValues>>({});
  // إضافة مؤقت مراقبة التغييرات
  const changeTimerRef = useRef<NodeJS.Timeout | null>(null);
  // حفظ حالة آخر عملية حفظ
  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    // التحقق من أن الهاتف صالح ويحتوي على 8 أرقام على الأقل
    if (watchedPhone && watchedPhone.length >= 8 && tenant?.id) {
      // إلغاء أي مؤقت سابق
      if (changeTimerRef.current) {
        clearTimeout(changeTimerRef.current);
      }
      
      // تحديد وقت الآن
      const now = Date.now();
      // التأكد من وجود فترة كافية منذ آخر حفظ (3 ثوانٍ على الأقل)
      const minTimeBetweenSaves = 3000; // 3 ثوانٍ
      
      // التحقق مما إذا كان التغيير معنويًا
      let hasSignificantChanges = false;
      
      // فحص التغييرات في الحقول الرئيسية
      const importantFields = ['fullName', 'phone', 'province', 'municipality', 'address'];
      
      for (const field of importantFields) {
        // تجاهل التغييرات الطفيفة في الاسم (حرف بحرف)
        if (field === 'fullName' && 
            typeof watchedValues[field] === 'string' && 
            typeof previousFormValuesRef.current[field] === 'string' &&
            previousFormValuesRef.current[field]) {
          
          // إذا كان التغيير في الاسم أقل من 3 أحرف، لا نعتبره تغييراً جوهرياً
          const prevLength = (previousFormValuesRef.current[field] as string).length;
          const currLength = (watchedValues[field] as string).length;
          
          if (Math.abs(prevLength - currLength) < 3) {
            continue;
          }
        }
        
        if (watchedValues[field] !== previousFormValuesRef.current[field]) {
          hasSignificantChanges = true;
          break;
        }
      }
      
      // تحديث مرجع القيم السابقة
      previousFormValuesRef.current = { ...watchedValues };
      
      // إذا كانت هناك تغييرات معنوية ومر وقت كافٍ منذ آخر حفظ، قم بجدولة حفظ السلة
      if (hasSignificantChanges && (now - lastSaveTimeRef.current > minTimeBetweenSaves)) {
        changeTimerRef.current = setTimeout(() => {
          
          debouncedSaveAbandonedCart(watchedValues, watchedValues.customFields);
          // تحديث وقت آخر حفظ
          lastSaveTimeRef.current = Date.now();
        }, 500); // تأخير 500 مللي ثانية لتجميع التغييرات
      }
    }
  }, [watchedValues, tenant, debouncedSaveAbandonedCart]);

  // عرض نموذج الطلب
  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 rtl:text-right">
          {visibleCustomFields && visibleCustomFields.length > 0 ? (
              <CustomFormFields 
              formFields={visibleCustomFields}
                noForm={true}
                productId={productId}
                onDeliveryPriceChange={(price) => {
                  if (price !== null && price !== undefined) {
                    setCurrentDeliveryFee(price);
                    setTimeout(() => {
                      setCurrentDeliveryFee(price);
                    }, 300);
                  }
                }}
                onFieldChange={(fieldName, value) => {
                  
                  if (fieldName === 'municipality' && value) {
                    form.setValue('municipality', value, { 
                    shouldValidate: true, shouldDirty: true, shouldTouch: true 
                    });
                    
                  } else {
                    form.setValue(fieldName as any, value);
                  }
                  if (fieldName === 'deliveryOption') {
                    setSelectedDeliveryType(value as 'home' | 'desk');
                  }
                }}
            />
          ) : (
            <>
              <PersonalInfoFields form={form} />
              <DeliveryInfoFields
                form={form}
                provinces={wilayasList}
                municipalities={communesList}
                yalidineCenters={yalidineCentersList}
                isLoadingYalidineCenters={isLoadingYalidineCenters}
                onWilayaChange={handleWilayaChange}
                hasShippingIntegration={hasShippingIntegration}
                isLoadingWilayas={isLoadingWilayas}
                isLoadingCommunes={isLoadingCommunes}
                shippingProviderSettings={shippingProviderSettings || undefined}
              />
            </>
          )}

          {/* ملخص الطلب */}
          <div className="mt-8">
            <OrderSummary
              productId={productId}
              isLoadingDeliveryFee={isLoadingDeliveryFee}
              basePrice={basePrice}
              quantity={quantity}
              subtotal={subtotal}
              discount={discountAmount}
              deliveryFee={currentDeliveryFee}
              hasFreeShipping={hasFreeShipping}
              total={subtotal - discountAmount + (hasFreeShipping ? 0 : currentDeliveryFee)}
              productColorName={productColorName}
              productSizeName={productSizeName}
              deliveryType={selectedDeliveryType}
              shippingProviderSettings={shippingProviderSettings || undefined}
            />
          </div>

          {/* زر تأكيد الطلب */}
          <div className="flex justify-center mt-6">
            <button
              type="button"
              className="w-full max-w-md flex items-center justify-center bg-primary text-white font-medium py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
              disabled={isSubmitting}
              onClick={async () => {
                // تقديم النموذج مباشرة بدون تحقق
                setError(null);
                
                // تحقق مما إذا كنا في النموذج المخصص مع نوع توصيل desk ولكن بدون stopDeskId
                if (visibleCustomFields && visibleCustomFields.length > 0 && 
                    form.getValues('deliveryOption') === 'desk' && 
                    !form.getValues('stopDeskId')) {
                  console.log("[زر التقديم] تعيين قيمة افتراضية لـ stopDeskId");
                  form.setValue('stopDeskId', '1', { shouldValidate: true, shouldDirty: true });
                }
                
                // تشخيص وإصلاح مشكلة stopDeskId
                await debugAddStopDeskIdIfMissing();
                
                // استخدام تأخير قصير للتأكد من اكتمال عمليات تحديث stopDeskId
                setTimeout(() => {
                  processFormSubmission();
                }, 100);
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  <span>جاري إرسال الطلب...</span>
                </>
              ) : (
                <>
                  <CreditCard className="ml-2 h-5 w-5" />
                  إرسال الطلب
                </>
              )}
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
} 