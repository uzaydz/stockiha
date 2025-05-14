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

  // مستمع لتغير نوع التوصيل (منزلي أو مكتب) أو الولاية
  useEffect(() => {
    const deliveryOption = form.watch('deliveryOption');
    const province = form.watch('province');
    
    if (hasShippingIntegration && province && deliveryOption && tenant?.id) {
      form.setValue('municipality', '');
      setCommunesList([]);
      setCurrentDeliveryFee(deliveryFee);
      
      loadShippingCommunes(Number(province));
    }
  }, [form.watch('deliveryOption'), form.watch('province'), hasShippingIntegration, tenant?.id]);

  // useEffect لحساب رسوم التوصيل عند تغير المدخلات اللازمة
  useEffect(() => {
    const provinceId = form.watch('province');
    const communeId = form.watch('municipality');
    const deliveryOpt = form.watch('deliveryOption') as 'home' | 'desk';
    const currentActualQuantity = quantity; 

    if (hasShippingIntegration && provinceId && communeId && deliveryOpt && tenant?.id && currentActualQuantity && formSettings) {
      // إذا كان العرض يتضمن شحناً مجانياً
      if (hasFreeShipping) {
        setCurrentDeliveryFee(0);
        return;
      }
      
      calculateFee();
    }

    async function calculateFee() {
      try {
        setIsLoadingDeliveryFee(true);
        
        // احتساب الوزن (1 للمنتج الواحد)
        const estimatedWeight = Math.max(1, Math.ceil(currentActualQuantity));
        
        console.log(`تمرير معرف مزود الشحن المستنسخ: ${shippingCloneId} إلى دالة احتساب الرسوم`);
        
        // تمرير معرف مزود الشحن المستنسخ إلى دالة احتساب الرسوم
        const fee = await calculateShippingFee(
          tenant.id,
          Number(provinceId),
          Number(communeId),
          deliveryOpt,
          estimatedWeight,
          shippingCloneId ? Number(shippingCloneId) : undefined
        );
        
        setCurrentDeliveryFee(fee);
      } catch (error) {
        console.error('[OrderForm] خطأ في حساب رسوم التوصيل:', error);
        setCurrentDeliveryFee(deliveryFee); // استخدام القيمة الافتراضية في حالة الخطأ
      } finally {
        setIsLoadingDeliveryFee(false);
      }
    }
  }, [
    form.watch('province'),
    form.watch('municipality'),
    form.watch('deliveryOption'),
    quantity,
    tenant?.id,
    hasShippingIntegration,
    hasFreeShipping,
    shippingCloneId, // إضافة معرف مزود الشحن المستنسخ إلى قائمة الاعتمادات
  ]);
  
  // تحميل بيانات البلديات
  const loadShippingCommunes = async (wilayaId: number) => {
    if (!tenant?.id || !wilayaId) return;
    
    try {
      setIsLoadingCommunes(true);
      
      const municipalities = await getShippingMunicipalities(wilayaId);
      
      if (Array.isArray(municipalities)) {
        setCommunesList(municipalities);
      } else {
        setCommunesList([]);
      }
    } catch (error) {
      console.error('[OrderForm] خطأ في تحميل البلديات:', error);
      setCommunesList([]);
    } finally {
      setIsLoadingCommunes(false);
    }
  };

  const handleWilayaChange = (wilayaId: string) => {
    setSelectedWilaya(wilayaId);
    form.setValue('province', wilayaId);
    form.setValue('municipality', '');
    setCurrentDeliveryFee(deliveryFee);
  };

  const handleDeliveryCompanyChange = (value: string) => {
    form.setValue('deliveryCompany', value);
  };

  // مستمع لتغير نوع التوصيل
  const handleDeliveryTypeChange = (value: 'home' | 'desk') => {
    console.log(`تغيير نوع التوصيل إلى: ${value}`);
    setSelectedDeliveryType(value);
    form.setValue('deliveryOption', value);
  };

  // تهيئة النموذج بعد التحميل
  useEffect(() => {
    // التأكد من أن النموذج جاهز
    setFormReady(true);
    
    // تحديد الشركة الافتراضية للتوصيل
    const defaultCompany = hasShippingIntegration && shippingProviderId ? 
                         shippingProviderId : "yalidine";
    form.setValue("deliveryCompany", defaultCompany);
    handleDeliveryCompanyChange(defaultCompany);
    
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
    console.log("تم تهيئة النموذج بالقيم الافتراضية", form.getValues());
    console.log("حالة النموذج بعد التهيئة:", {
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      errors: form.formState.errors
    });
  }, []);

  // تحديد تهيئة الخاصيات
  useEffect(() => {
    // استخدام إعداد افتراضي لمعالجة الحالة التي لا يوجد فيها إعدادات مزود شحن
    if (!shippingProviderSettings) {
      console.log("لا توجد إعدادات مزود شحن - تهيئة كلا الخيارين");
      console.log("تعيين نوع التوصيل الافتراضي إلى: home");
      setSelectedDeliveryType('home');
      form.setValue('deliveryOption', 'home');
    } else {
      console.log("تم تحديد إعدادات مزود الشحن - تكوين الخيارات المتاحة");
      // حدد نوع التوصيل الافتراضي بناءً على إعدادات مزود الشحن المستنسخ
      if (!shippingProviderSettings.is_home_delivery_enabled && shippingProviderSettings.is_desk_delivery_enabled) {
        console.log("تعيين نوع التوصيل الافتراضي إلى: desk (فقط الاستلام من المكتب متاح)");
        setSelectedDeliveryType('desk');
        form.setValue('deliveryOption', 'desk');
      } else if (shippingProviderSettings.is_home_delivery_enabled && !shippingProviderSettings.is_desk_delivery_enabled) {
        console.log("تعيين نوع التوصيل الافتراضي إلى: home (فقط التوصيل للمنزل متاح)");
        setSelectedDeliveryType('home');
        form.setValue('deliveryOption', 'home');
      } else {
        console.log("تعيين نوع التوصيل الافتراضي إلى: home (كلاهما متاح، الافتراضي)");
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
          console.log("تم العثور على زر التقديم، إضافة مستمع الحدث");
          
          // إضافة مستمع الحدث
          const handleSubmitButtonClick = (e: Event) => {
            e.preventDefault(); // منع السلوك الافتراضي
            console.log("تم النقر على زر التقديم (من المستمع المخصص)");
            
            if (isSubmitting) {
              console.log("التقديم جاري بالفعل، تم تجاهل النقرة");
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
      // التحقق من قيم النموذج قبل المتابعة
      if (!form.formState.isValid) {
        console.error("النموذج غير صالح", form.formState.errors);
        setError("يرجى التحقق من جميع الحقول المطلوبة");
        setIsSubmitting(false);
        return;
      }

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
      
      console.log("معلومات طلب المنتج:", {
        معرف_النموذج: formId,
        معرف_مزود_الشحن: shippingCloneProviderId
      });

      const formValues = form.getValues();
      console.log("قيم النموذج عند التقديم:", formValues);
      
      // تجاوز التحقق من الصحة والمتابعة مباشرة
      setIsSubmitting(true);
      setError(null);
      
      // إرسال النموذج مباشرة
      const values = form.getValues();
      console.log("إرسال قيم النموذج:", values);
      
      // تأكيد إضافي من قيمة رسوم التوصيل قبل الإرسال
      console.log(`رسوم التوصيل قبل الإرسال: ${currentDeliveryFee} دج`);
      console.log(`نوع التوصيل قبل الإرسال: ${values.deliveryOption}`);
      
      // إذا كانت بعض الحقول المطلوبة فارغة، استخدم قيم افتراضية
      const submissionValues = {
        ...values,
        fullName: values.fullName || 'زائر',
        phone: values.phone || '0000000000',
        province: values.province || 'غير محدد',
        municipality: values.municipality || 'غير محدد',
        address: values.address || 'غير محدد',
        // استخدام نوع التوصيل كما هو (سيتم تحويله في API)
        deliveryOption: values.deliveryOption || 'home',
        // إضافة معرف النموذج ومزود الشحن
        form_id: formId,
        shipping_clone_id: shippingCloneProviderId
      };
      
      // التأكد من أن سعر التوصيل ليس 0 إذا تم حسابه بنجاح
      // Adjust final delivery fee based on free shipping offer
      const finalDeliveryFee = hasFreeShipping ? 0 : currentDeliveryFee;
      
      console.log(`سعر التوصيل النهائي المستخدم: ${finalDeliveryFee} دج`);
      
      // تحويل نوع التوصيل للنظام الخلفي عند الإرسال
      const apiDeliveryType = submissionValues.deliveryOption === 'desk' ? 'desk' : submissionValues.deliveryOption;
      console.log(`نوع التوصيل المستخدم في الواجهة: ${submissionValues.deliveryOption}`);
      console.log(`نوع التوصيل المرسل للـ API: ${apiDeliveryType}`);

      // --- Construct Metadata Payload --- 
      let metadataPayload: Record<string, any> | null = null;
      if (activeOffer) {
        metadataPayload = {
          applied_quantity_offer: {
            id: activeOffer.id, // Assuming offer object has an id
            type: activeOffer.type,
            minQuantity: activeOffer.minQuantity,
            discountValue: activeOffer.discountValue || 0, // Include discount value if present
            appliedDiscountAmount: discountAmount, // The actual calculated discount
            appliedFreeShipping: hasFreeShipping // Whether free shipping was applied
          }
        };
      }
      console.log("Metadata Payload:", metadataPayload);
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
        formData: null,
        onSuccess: (orderNum) => {
          console.log("تم إرسال الطلب بنجاح:", orderNum);
          setOrderNumber(orderNum);
        },
        onError: (msg) => {
          console.error("خطأ في إرسال الطلب:", msg);
          setError(msg);
        },
        onSubmitStart: () => {
          console.log("بدء إرسال الطلب");
        },
        onSubmitEnd: () => {
          console.log("انتهاء إرسال الطلب");
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
  const getFieldLabel = (fieldName: string, fields: any[]) => {
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
      deliveryCompany: 'شركة التوصيل'
    };
    
    return defaultLabels[fieldName] || fieldName;
  };

  const onSubmit = async (values: OrderFormValues) => {
    console.log("تم استدعاء onSubmit");
    setIsSubmitting(true);
    
    try {
      // تأكد من إضافة معرف النموذج ومزود الشحن المستنسخ إلى متغيرات الطلب
      const formId = formSettings?.id;
      
      // استخراج معرف مزود الشحن المستنسخ
      let cloneId = shippingCloneId;
      if (!cloneId && formSettings?.settings) {
        // محاولة استخراج معرف مزود الشحن من settings
        if (formSettings.settings.shipping_clone_id) {
          cloneId = formSettings.settings.shipping_clone_id;
        } 
        // محاولة استخراج المعرف من shipping_integration
        else if (formSettings.settings.shipping_integration?.provider_id) {
          cloneId = formSettings.settings.shipping_integration.provider_id;
        }
      }
      
      console.log(`معلومات إضافية للطلب: معرف النموذج=${formId}, معرف مزود الشحن=${cloneId}`);
      
      // استدعاء وظيفة معالجة النموذج مع تمرير المعلومات الإضافية
      await processFormSubmission();
      
    } catch (error) {
      console.error("خطأ في معالجة النموذج:", error);
      setIsSubmitting(false);
      setError("حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.");
    }
  };

  // تعريف دالة استخلاص معرف مزود الشحن المستنسخ
  const extractShippingCloneId = async (): Promise<string | number | null> => {
    console.log(">> بدء استخراج معرف مزود الشحن المستنسخ من إعدادات النموذج");
    
    // البحث في formSettings
    if (formSettings) {
      console.log(">> إعدادات النموذج المتاحة:", formSettings);
      
      // فحص مباشر عن shipping_clone_id في جذر إعدادات النموذج
      if (formSettings.settings && formSettings.settings.shipping_clone_id) {
        console.log(">> تم العثور على shipping_clone_id مباشرة في إعدادات النموذج:", formSettings.settings.shipping_clone_id);
        return formSettings.settings.shipping_clone_id;
      }
      
      // البحث في purchase_page_config داخل formSettings
      if (formSettings.purchase_page_config && formSettings.purchase_page_config.shipping_clone_id) {
        console.log(">> تم العثور على shipping_clone_id في purchase_page_config:", formSettings.purchase_page_config.shipping_clone_id);
        return formSettings.purchase_page_config.shipping_clone_id;
      }
      
      // فحص في إعدادات تكامل الشحن
      if (formSettings.settings && 
          formSettings.settings.shipping_integration && 
          formSettings.settings.shipping_integration.enabled &&
          formSettings.settings.shipping_integration.provider_id) {
        console.log(">> تم العثور على معرف مزود في تكامل الشحن:", formSettings.settings.shipping_integration.provider_id);
        return formSettings.settings.shipping_integration.provider_id;
      }
    }
    
    // البحث عن معرف مزود الشحن المستنسخ للمنتج المحدد
    if (productId) {
      try {
        console.log(">> البحث عن shipping_clone_id للمنتج:", productId);
        const { data: productData, error } = await supabase
          .from('products')
          .select('shipping_clone_id, purchase_page_config')
          .eq('id', productId)
          .single();
        
        if (error) {
          console.error(">> خطأ في استعلام المنتج:", error);
        } else if (productData) {
          // البحث في shipping_clone_id مباشرة
          if (productData.data.shipping_clone_id) {
            console.log(">> تم العثور على shipping_clone_id مباشرة في المنتج:", productData.data.shipping_clone_id);
            return productData.data.shipping_clone_id;
          }
          
          // البحث في purchase_page_config
          if (productData.data.purchase_page_config && productData.data.purchase_page_config.shipping_clone_id) {
            console.log(">> تم العثور على shipping_clone_id في purchase_page_config للمنتج:", productData.data.purchase_page_config.shipping_clone_id);
            return productData.data.purchase_page_config.shipping_clone_id;
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
        console.log(">> محاولة تحليل إعدادات النموذج:", settingsStr.substring(0, 200));
        
        if (settingsStr.includes("shipping_clone_id")) {
          // تحليل يدوي للنص
          const match = settingsStr.match(/"shipping_clone_id"\s*:\s*"?(\d+)"?/);
          if (match && match[1]) {
            console.log(">> تم العثور على shipping_clone_id في النص:", match[1]);
            return match[1];
          }
        }
      } catch (e) {
        console.error(">> خطأ في تحليل إعدادات النموذج:", e);
      }
    }
    
    console.log(">> لم يتم العثور على معرف مزود الشحن المستنسخ في إعدادات النموذج");
    return await getDefaultShippingCloneId();
  };

  // دالة للبحث عن معرف مزود شحن مستنسخ افتراضي
  const getDefaultShippingCloneId = async (): Promise<string | number | null> => {
    if (!tenant || !tenant.id) {
      console.log(">> لا يمكن البحث عن مزود شحن افتراضي - لا توجد مؤسسة");
      return null;
    }

    try {
      console.log(">> البحث عن مزود شحن مستنسخ افتراضي للمؤسسة:", tenant.id);
      
      // استخدام any لتجاوز التحقق من النوع
      const result = await (supabase as any).from('shipping_provider_clones')
        .select('id')
        .eq('organization_id', tenant.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        const defaultCloneId = result.data[0].id;
        console.log(">> تم العثور على مزود شحن مستنسخ افتراضي:", defaultCloneId);
        
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
            
            console.log(">> تم تحديث النموذج بمعرف مزود الشحن المستنسخ:", updateResult);
          } catch (updateError) {
            console.error(">> خطأ في تحديث النموذج:", updateError);
          }
        }
        
        return defaultCloneId;
      } else {
        console.log(">> لم يتم العثور على مزود شحن مستنسخ");
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
        console.log(">> معرف مزود الشحن المستنسخ النهائي:", cloneId);
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
      console.log(">> بداية تنفيذ fetchShippingProviderSettings");
      console.log(">> معرف مزود الشحن المستنسخ:", shippingCloneId);
      console.log(">> هل تم توفير معرف مزود الشحن؟", !!shippingCloneId);
      
      if (!shippingCloneId) {
        console.log(">> لم يتم توفير معرف مزود الشحن المستنسخ");
        return;
      }
      
      try {
        setIsLoadingProviderSettings(true);
        console.log(">> جاري جلب إعدادات مزود الشحن المستنسخ...");
        
        // تحويل القيمة إلى رقم صحيح
        const numericCloneId = Number(shippingCloneId);
        
        // التحقق من صحة الرقم قبل الاستمرار
        if (isNaN(numericCloneId)) {
          console.error(">> معرف مزود الشحن المستنسخ غير صالح:", shippingCloneId);
          setIsLoadingProviderSettings(false);
          return;
        }
        
        console.log(">> محاولة جلب مزود الشحن المستنسخ بالمعرف:", numericCloneId);
        const cloneData = await getShippingProviderClone(numericCloneId);
        
        if (cloneData) {
          console.log(">> تم جلب إعدادات مزود الشحن المستنسخ بنجاح:", cloneData);
          setShippingProviderSettings(cloneData as ShippingProviderSettings);
          
          // تعيين نوع التوصيل الافتراضي بناءً على الإعدادات
          const typedCloneData = cloneData as ShippingProviderSettings;
          console.log(">> حالة التوصيل للمنزل:", typedCloneData.is_home_delivery_enabled);
          console.log(">> حالة التوصيل للمكتب:", typedCloneData.is_desk_delivery_enabled);
          
          if (!typedCloneData.is_home_delivery_enabled && typedCloneData.is_desk_delivery_enabled) {
            console.log(">> تعيين نوع التوصيل الافتراضي إلى: desk (المكتب فقط)");
            setSelectedDeliveryType('desk');
            form.setValue('deliveryOption', 'desk');
          } else if (typedCloneData.is_home_delivery_enabled && !typedCloneData.is_desk_delivery_enabled) {
            console.log(">> تعيين نوع التوصيل الافتراضي إلى: home (المنزل فقط)");
            setSelectedDeliveryType('home');
            form.setValue('deliveryOption', 'home');
          } else {
            console.log(">> تعيين نوع التوصيل الافتراضي إلى: home (الافتراضي)");
            setSelectedDeliveryType('home');
            form.setValue('deliveryOption', 'home');
          }
        } else {
          console.log(">> فشل في جلب إعدادات مزود الشحن المستنسخ");
          // استخدام اعدادات افتراضية
          console.log(">> تعيين نوع التوصيل الافتراضي إلى: home (عند الفشل)");
          setSelectedDeliveryType('home');
          form.setValue('deliveryOption', 'home');
        }
      } catch (error) {
        console.error(">> خطأ في جلب إعدادات مزود الشحن المستنسخ:", error);
        // استخدام اعدادات افتراضية في حالة الخطأ
        console.log(">> تعيين نوع التوصيل الافتراضي إلى: home (عند حدوث خطأ)");
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
      console.log("التحقق من إعدادات التوصيل:", {
        is_home_delivery_enabled: shippingProviderSettings.is_home_delivery_enabled,
        is_desk_delivery_enabled: shippingProviderSettings.is_desk_delivery_enabled,
        currentDeliveryType: selectedDeliveryType
      });
      
      // عرض خيار التوصيل للمنزل فقط إذا كان مفعلاً
      if (shippingProviderSettings.is_home_delivery_enabled === true && 
          shippingProviderSettings.is_desk_delivery_enabled === false && 
          selectedDeliveryType !== 'home') {
        console.log("فرض التوصيل للمنزل فقط (المنزل مفعل فقط)");
        setSelectedDeliveryType('home');
        form.setValue('deliveryOption', 'home');
      } 
      // عرض خيار التوصيل للمكتب فقط إذا كان مفعلاً
      else if (shippingProviderSettings.is_home_delivery_enabled === false && 
               shippingProviderSettings.is_desk_delivery_enabled === true && 
               selectedDeliveryType !== 'desk') {
        console.log("فرض التوصيل للمكتب فقط (المكتب مفعل فقط)");
        setSelectedDeliveryType('desk');
        form.setValue('deliveryOption', 'desk');
      }
    }
  }, [shippingProviderSettings, selectedDeliveryType]);

  // تحديد قيمة حقل deliveryOption في react-hook-form
  useEffect(() => {
    form.setValue('deliveryOption', selectedDeliveryType);
    console.log(`تعيين قيمة حقل deliveryOption في النموذج: ${selectedDeliveryType}`);
  }, [selectedDeliveryType, form]);

  // Debounced function to save abandoned cart
  const debouncedSaveAbandonedCart = debounce(async (formData: OrderFormValues, currentCustomFieldsData?: Record<string, string>) => {
    if (!tenant?.id || !formData.phone || formData.phone.length < 7) { // Basic phone validation
      // console.log('Abandoned cart: Missing tenant ID or invalid phone. Tenant:', tenant, 'Phone:', formData.phone);
      return;
    }

    const payload: AbandonedCartPayload = {
      organization_id: tenant.id,
      customer_phone: formData.phone,
      customer_name: formData.fullName || undefined,
      customer_email: formData.email || undefined, // Assuming email is part of OrderFormValues
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
      custom_fields_data: currentCustomFieldsData, // Pass current custom fields data
      calculated_delivery_fee: currentDeliveryFee, // Use the calculated current delivery fee
      subtotal: subtotal, 
      discount_amount: discountAmount, 
      total_amount: subtotal - discountAmount + (hasFreeShipping ? 0 : currentDeliveryFee), 
      // status is handled by the backend or specific flows
    };

    // Remove undefined keys to keep payload clean
    Object.keys(payload).forEach(key => {
      if ((payload as any)[key] === undefined) {
        delete (payload as any)[key];
      }
    });
    
    console.log('Attempting to save abandoned cart:', payload);
    const bodyAsJsonString = JSON.stringify(payload); // تحويل يدوي إلى JSON
    console.log('Body as JSON string before sending:', bodyAsJsonString); // طباعة السلسلة

    try {
      const functionUrl = `${supabase.supabaseUrl}/functions/v1/save-abandoned-cart`;
      const accessToken = supabase.headers.Authorization?.split('Bearer ')[1] || supabase.supabaseKey;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'apikey': supabase.supabaseKey, // Or your anon key directly
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          // Add other headers Supabase client might add, like x-client-info, if necessary
          // 'x-client-info': 'your-app-name/version' 
        },
        body: bodyAsJsonString,
      });

      if (!response.ok) {
        // Attempt to parse error from response body
        let errorData = { message: `HTTP error! status: ${response.status}` };
        try {
          const jsonError = await response.json();
          errorData = { ...jsonError, message: jsonError.error || jsonError.message || `HTTP error! status: ${response.status}` };
        } catch (e) {
          // Could not parse JSON, use status text or default message
          errorData.message = response.statusText || errorData.message;
        }
        console.error('Error saving abandoned cart:', errorData);
        // Optionally, update UI with errorData.message or errorData.details
      } else {
        const data = await response.json();
        console.log('Abandoned cart saved/updated successfully via fetch:', data);
      }

    } catch (invokeError) {
      // This will catch network errors or issues with fetch itself
      console.error('Exception invoking Supabase function with fetch:', invokeError);
    }
  }, 2500); // Debounce time: 2.5 seconds

  // Function to handle phone input blur event
  const handlePhoneBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    console.log('>>> OrderForm.tsx: handlePhoneBlur CALLED. Value:', event.target.value); // Log for handlePhoneBlur

    // const phone = event.target.value;
    // if (phone && /^[0-9]{10}$/.test(phone)) { // Basic validation for Algerian phone numbers (example)
    //   console.log('Valid phone, attempting to save:', phone);
    //   // Restore actual save logic once blur is confirmed
    //   // debouncedSaveAbandonedCart({ customer_phone: phone }); 
    // } else {
    //   console.log('Invalid or empty phone, not saving:', phone);
    // }
  };

  const watchedAddress = form.watch('address');
  // const watchedQuantity = form.watch('quantity'); // Quantity changes might be too frequent, rely on prop or specific interactions

  useEffect(() => {
    // Trigger if other relevant fields change *after* a phone number has been entered and validated (e.g. on blur)
    // The primary trigger for phone is now onBlur.
    const currentValues = form.getValues();
    if (currentValues.phone && currentValues.phone.length >= 7 && tenant?.id) {
        // Check if any of the *other* watched fields have actual values or have changed
        // This prevents saving on every minor form state update if only phone was touched and blurred.
        if (watchedAddress) {
            console.log('Relevant field (not phone) changed, attempting to save abandoned cart.');
            debouncedSaveAbandonedCart(currentValues, currentValues.customFields);
        }
    }
  }, [watchedAddress, form, tenant, debouncedSaveAbandonedCart]); // Removed watchedPhone and watchedQuantity

  // عرض نموذج الطلب
  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* تحسين شرط العرض للتأكد من ظهور النموذج دائمًا */}
          {customFields.length > 0 && customFields.some(field => field.isVisible === true) ? (
            // عرض النموذج المخصص إذا كان متوفرًا وفيه حقول مرئية
            <>
              <CustomFormFields 
                formFields={visibleCustomFields} // استخدام النسخة المذكرة
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
                  console.log(`تحديث حقل ${fieldName} في النموذج الرئيسي بقيمة: ${value}`);
                  
                  // استخدام طريقة تتجاوز التحقق من النوع
                  form.setValue(fieldName as any, value);
                  
                  // إذا كان الحقل هو نوع التوصيل، قم بتحديث حالة نوع التوصيل المحددة
                  if (fieldName === 'deliveryOption') {
                    setSelectedDeliveryType(value as 'home' | 'desk');
                  }
                }}
                shippingProviderSettings={shippingProviderSettings || undefined}
              />
            </>
          ) : (
            // عرض النموذج الافتراضي إذا لم يكن هناك حقول مخصصة
            <>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">الاسم الكامل</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="أدخل الاسم الكامل" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            console.log(`تم تغيير الاسم إلى: ${e.target.value}`);
                          }}
                          className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">رقم الهاتف</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="الهاتف رقم أدخل" 
                          type="tel" 
                          className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-right [&::placeholder]:text-right [&::placeholder]:mr-0"
                          style={{ 
                            textAlign: 'right', 
                            direction: 'rtl' 
                          }}
                          dir="rtl"
                          inputMode="tel"
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            console.log(`تم تغيير رقم الهاتف إلى: ${e.target.value}`);
                          }}
                          onBlur={(event: React.FocusEvent<HTMLInputElement>) => { // This is our custom onBlur
                            console.log('>>> OrderForm.tsx: Controller onBlur WRAPPER CALLED for phone'); // Log for Controller's onBlur wrapper
                            field.onBlur(event); // Call RHF's onBlur
                            handlePhoneBlur(event);        // Call our specific handler
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* حقل نوع التوصيل */}
                <FormField
                  control={form.control}
                  name="deliveryOption"
                  render={({ field }) => {
                    // طباعة المعلومات لفهم ما يحدث
                    console.log("===== معلومات تصحيح خيارات التوصيل =====");
                    console.log("هل تم تحميل إعدادات مزود الشحن؟", !!shippingProviderSettings);
                    console.log("إعدادات مزود الشحن:", shippingProviderSettings);
                    console.log("نوع التوصيل الحالي:", field.value);
                    
                    // تحديد الخيارات المتاحة مباشرة بناءً على إعدادات مزود الشحن
                    // إذا كان مزود الشحن يسمح فقط بنوع معين، نستخدم ذلك النوع فقط
                    const showHomeDelivery = shippingProviderSettings ? shippingProviderSettings.is_home_delivery_enabled !== false : true;
                    const showDeskDelivery = shippingProviderSettings ? shippingProviderSettings.is_desk_delivery_enabled !== false : true;
                    
                    console.log("عرض خيار التوصيل للمنزل؟", showHomeDelivery);
                    console.log("عرض خيار التوصيل للمكتب؟", showDeskDelivery);
                    
                    // إذا كان هناك خيار واحد فقط متاح، تأكد من اختياره
                    useEffect(() => {
                      if (!showHomeDelivery && showDeskDelivery && field.value !== 'desk') {
                        console.log("تعيين نوع التوصيل إلى المكتب (الخيار الوحيد المتاح)");
                        field.onChange('desk');
                        setSelectedDeliveryType('desk');
                      }
                      if (showHomeDelivery && !showDeskDelivery && field.value !== 'home') {
                        console.log("تعيين نوع التوصيل إلى المنزل (الخيار الوحيد المتاح)");
                        field.onChange('home');
                        setSelectedDeliveryType('home');
                      }
                    }, [showHomeDelivery, showDeskDelivery, field.value]);
                    
                    return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">نوع التوصيل *</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {/* إضافة معلومات توضيحية للمستخدم عند وجود خيار توصيل واحد فقط */}
                          {(showHomeDelivery && !showDeskDelivery) && (
                            <div className="mb-2 text-sm text-blue-600">
                              متاح فقط خيار التوصيل للمنزل
                            </div>
                          )}
                          {(!showHomeDelivery && showDeskDelivery) && (
                            <div className="mb-2 text-sm text-blue-600">
                              متاح فقط خيار الاستلام من المكتب
                            </div>
                          )}
                          <RadioGroup
                            onValueChange={(value) => {
                              console.log("تم اختيار:", value);
                              field.onChange(value);
                              handleDeliveryTypeChange(value as 'home' | 'desk');
                            }}
                            defaultValue={field.value}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            {/* خيار التوصيل للمنزل */}
                            {showHomeDelivery && (
                              <div className="flex items-center space-x-3 space-x-reverse">
                                <RadioGroupItem value="home" id="home-delivery" className="border-input" />
                                <Label htmlFor="home-delivery" className="flex items-center">
                                  <Home className="ml-2 h-5 w-5 text-muted-foreground" />
                                  توصيل للمنزل
                                  <span className="mr-2 text-xs text-gray-500">
                                    توصيل الطلب مباشرة إلى عنوانك
                                  </span>
                                  {shippingProviderSettings?.is_free_delivery_home && (
                                    <span className="mr-1 text-xs text-green-600 font-medium">
                                      (مجاني!)
                                    </span>
                                  )}
                                </Label>
                              </div>
                            )}
                            
                            {/* خيار الاستلام من المكتب */}
                            {showDeskDelivery && (
                              <div className="flex items-center space-x-3 space-x-reverse">
                                <RadioGroupItem value="desk" id="desk-delivery" className="border-input" />
                                <Label htmlFor="desk-delivery" className="flex items-center">
                                  <Building className="ml-2 h-5 w-5 text-muted-foreground" />
                                  استلام من المكتب
                                  <span className="mr-2 text-xs text-gray-500">
                                    استلام الطلب من مكتب شركة التوصيل
                                  </span>
                                  {shippingProviderSettings?.is_free_delivery_desk && (
                                    <span className="mr-1 text-xs text-green-600 font-medium">
                                      (مجاني!)
                                    </span>
                                  )}
                                </Label>
                              </div>
                            )}
                          </RadioGroup>
                          
                          {/* عرض شريط إخطار عند توفر خيار توصيل واحد فقط */}
                          {shippingProviderSettings && (
                            <div className={`p-2 rounded-md mt-2 text-sm ${
                              (!showHomeDelivery || !showDeskDelivery) ? 'bg-blue-50 border border-blue-200 text-blue-700' : ''
                            }`}>
                              {(!showHomeDelivery && showDeskDelivery) && (
                                <div className="flex items-center">
                                  <Building className="inline-block ml-1 h-4 w-4" />
                                  <span>متاح فقط خيار الاستلام من المكتب لهذا المنتج</span>
                                </div>
                              )}
                              {(showHomeDelivery && !showDeskDelivery) && (
                                <div className="flex items-center">
                                  <Home className="inline-block ml-1 h-4 w-4" />
                                  <span>متاح فقط خيار التوصيل للمنزل لهذا المنتج</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">الولاية</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleWilayaChange(value);
                            console.log(`تم تغيير الولاية إلى: ${value}`);
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50">
                              <SelectValue placeholder="اختر الولاية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {wilayasList.map((province) => (
                              <SelectItem key={province.id} value={province.id.toString()}>
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="municipality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">البلدية</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            console.log(`تم تغيير البلدية إلى: ${value}`);
                          }}
                          defaultValue={field.value}
                          disabled={!selectedWilaya}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50">
                              <SelectValue placeholder="اختر البلدية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {communesList.map((municipality) => (
                              <SelectItem
                                key={municipality.id}
                                value={municipality.id.toString()}
                              >
                                {municipality.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">العنوان</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أدخل العنوان بالتفصيل" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            console.log(`تم تغيير العنوان إلى: ${e.target.value}`);
                          }}
                          className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* حقل شركة التوصيل */}
                <FormField
                  control={form.control}
                  name="deliveryCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">شركة التوصيل *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleDeliveryCompanyChange(value);
                          }}
                          defaultValue={field.value}
                          disabled={hasShippingIntegration}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50">
                              <SelectValue placeholder="اختر شركة التوصيل" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DELIVERY_COMPANIES.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                <div className="flex items-center">
                                  <Truck className="ml-2 h-4 w-4 text-muted-foreground" />
                                  {company.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                      {hasShippingIntegration && (
                        <div className="text-xs text-muted-foreground">
                          <AlertCircle className="inline-block w-3 h-3 ml-1" />
                          تم تعيين شركة التوصيل تلقائيًا وفقًا لإعدادات المتجر
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                {/* حقل طريقة الدفع */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">طريقة الدفع *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50">
                              <SelectValue placeholder="اختر طريقة الدفع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">ملاحظات إضافية</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أضف أي ملاحظات إضافية خاصة بالطلب (اختياري)" 
                          {...field} 
                          className="bg-white border border-gray-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              onClick={() => {
                // تقديم النموذج مباشرة بدون تحقق
                setError(null);
                onSubmit(form.getValues());
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