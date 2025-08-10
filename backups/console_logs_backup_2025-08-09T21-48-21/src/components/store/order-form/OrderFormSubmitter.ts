import { toast } from "@/components/ui/use-toast";
import { processOrder } from "@/api/store";
import { OrderFormValues } from "./OrderFormTypes";
import { checkDatabaseConnection } from "./DatabaseConnection";
import { addCSRFTokenToFormData } from "@/utils/csrf";

export interface OrderFormSubmitterProps {
  values: OrderFormValues;
  organizationId: string;
  productId: string;
  productColorId: string | null;
  productSizeId: string | null;
  sizeName: string | null;
  quantity: number;
  price: number;
  deliveryFee: number;
  metadata?: Record<string, any> | null;
  formData?: Record<string, any>;
  onSuccess: (orderNumber: string) => void;
  onError: (message: string) => void;
  onSubmitStart: () => void;
  onSubmitEnd: () => void;
}

/**
 * دالة إعداد بيانات الطلب
 */
export const prepareOrderData = (props: OrderFormSubmitterProps, customFormData?: Record<string, any>): any => {
  const {
    values,
    productId,
    productColorId,
    productSizeId,
    sizeName,
    quantity,
    price,
    deliveryFee,
    metadata
  } = props;

  // استخراج معرف النموذج المخصص ومزود الشحن المستنسخ من البيانات
  const form_id = values.form_id || null;
  const shipping_clone_id = values.shipping_clone_id || null;

  // استخدام البيانات المخصصة إذا كانت متوفرة
  const fullName = customFormData?.fullName || values.fullName || "زائر";
  const phone = customFormData?.phone || values.phone || "0000000000";
  const province = customFormData?.province || values.province || "غير محدد";
  const municipality = customFormData?.municipality || values.municipality || "غير محدد";
  
  // تحديد العنوان بناءً على نوع التوصيل والبيانات المتوفرة
  let address = customFormData?.address || values.address;
  if (!address) {
    const deliveryOption = customFormData?.deliveryOption || values.deliveryOption || "home";
    if (deliveryOption === "home") {
      address = `التوصيل المنزلي إلى ${municipality}, ${province}`;
    } else {
      address = `استلام من مكتب في ${municipality}, ${province}`;
    }
  }
  
  const city = municipality; // استخدام البلدية كمدينة
  
  // استخراج stop_desk_id من النموذج أو البيانات المخصصة
  const stop_desk_id = customFormData?.stop_desk_id || customFormData?.stopDeskId || values.stopDeskId || null;

  // إضافة معلومات تفصيلية أكثر في metadata
  let enhancedMetadata: Record<string, any> = { ...metadata };
  
  // إضافة معلومات الشحن
  enhancedMetadata.shipping_details = {
    ...enhancedMetadata.shipping_details,
    province_id: province,
    commune_id: municipality,
    stop_desk_id: stop_desk_id,
    delivery_option: customFormData?.deliveryOption || values.deliveryOption
  };

  const orderData = {
    // معلومات شخصية
    fullName,
    phone,
    
    // معلومات العنوان
    province,
    municipality,
    address,
    city, // إضافة حقل المدينة المطلوب
    
    // معلومات التوصيل
    deliveryCompany: values.deliveryCompany || "yalidine",
    deliveryOption: values.deliveryOption || "home",
    
    // معلومات الدفع
    paymentMethod: values.paymentMethod || "cash_on_delivery",
    notes: values.notes || "",
    
    // معلومات المنتج
    productId,
    productColorId,
    productSizeId,
    sizeName,
    quantity,
    
    // معلومات السعر
    unitPrice: price,
    totalPrice: price * quantity,
    deliveryFee: deliveryFee,
    
    // معلومات النموذج المخصص ومزود الشحن
    form_id: form_id,
    shipping_clone_id: shipping_clone_id,
    
    // إضافة معرف مكتب الاستلام
    stop_desk_id: stop_desk_id,
    
    // بيانات النموذج المخصص (إذا كانت موجودة)
    formData: customFormData,

    // Add metadata to the prepared order data
    metadata: enhancedMetadata 
  };

  return orderData;
};

/**
 * دالة محاولة إرسال الطلب مع دعم المحاولة المتكررة
 */
export const attemptOrderSubmission = async (
  organizationId: string,
  orderData: any,
  retryCount: number = 0
): Promise<any> => {
  // تحديد مهلة زمنية لمنع الانتظار للأبد
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      
      reject(new Error("انتهت مهلة معالجة الطلب"));
    }, 15000); // 15 ثانية كحد أقصى
  });
  
  // بدء إرسال الطلب
  
  const orderPromise = processOrder(organizationId, orderData);
  
  try {
    // استخدام Promise.race لتحديد مهلة زمنية
    const result = await Promise.race([orderPromise, timeoutPromise]) as any;
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * الدالة الرئيسية لمعالجة تقديم النموذج
 */
export const submitOrderForm = async (props: OrderFormSubmitterProps): Promise<boolean> => {
  const {
    values,
    organizationId,
    productId,
    quantity,
    price,
    deliveryFee,
    onSuccess,
    onError,
    onSubmitStart,
    onSubmitEnd,
    formData
  } = props;
  
  // بدء عملية التقديم
  onSubmitStart();
  
  // تتبع بدء عملية الدفع مع بيانات محسنة للـ Event Match Quality
  try {
    if (productId && typeof window !== 'undefined') {
      const totalPrice = (price * quantity) + deliveryFee;
      
      // جمع بيانات المستخدم المتاحة من النموذج
      const userData = {
        phone: values.phone || undefined,
        external_id: undefined, // سيتم إنشاؤه في ConversionTracker
        client_user_agent: navigator.userAgent,
        language: navigator.language || 'ar',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      // إرسال حدث initiate_checkout مع بيانات محسنة
      await fetch('/api/conversion-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          event_type: 'initiate_checkout',
          platform: 'multiple',
          user_data: userData,
          custom_data: {
            quantity,
            unit_price: price,
            delivery_fee: deliveryFee,
            total_price: totalPrice,
            currency: 'DZD',
            page_type: 'order_form',
            checkout_initiated_at: new Date().toISOString(),
            // معلومات إضافية من النموذج
            customer_province: values.province,
            customer_municipality: values.municipality,
            delivery_option: values.deliveryOption,
            payment_method: values.paymentMethod
          }
        })
      });

      // تتبع البكسل أيضاً إذا كان متاحاً
      if ((window as any).trackConversion) {
        await (window as any).trackConversion('initiate_checkout', {
          value: totalPrice,
          currency: 'DZD',
          content_type: 'product',
          content_ids: [productId],
          num_items: quantity,
          userPhone: values.phone // تمرير رقم الهاتف للتتبع
        });
      }
    }
  } catch (trackingError) {
    // لا نوقف العملية بسبب خطأ في التتبع
  }
  
  try {
    // التحقق من الاتصال بقاعدة البيانات أولاً
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      const errorMessage = "لا يمكن الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.";
      onError(errorMessage);
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
      return false;
    }
    
    // إعداد بيانات الطلب مع CSRF protection
    const orderData = addCSRFTokenToFormData(prepareOrderData(props, formData));

    // إعداد معلمات محاولة إعادة الإرسال
    let retryCount = 0;
    const MAX_RETRIES = 1; // محاولة واحدة إضافية
    
    // تنفيذ محاولة إرسال الطلب مع دعم إعادة المحاولة
    let orderResult;
    let lastError;
    
    while (retryCount <= MAX_RETRIES) {
      try {
        orderResult = await attemptOrderSubmission(organizationId, orderData, retryCount);
        // إذا نجحت المحاولة، نخرج من الحلقة
        break;
      } catch (error) {
        lastError = error;
        
        if (retryCount < MAX_RETRIES) {
          // انتظار قبل المحاولة التالية
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        } else {
          // فشل جميع المحاولات
          throw error;
        }
      }
    }
    
    // التحقق من نجاح العملية
    if (!orderResult) {
      throw new Error("لم يتم استلام أي استجابة من الخادم. يرجى المحاولة مرة أخرى.");
    }
    
    if (orderResult && orderResult.error) {
      throw new Error(`خطأ API: ${orderResult.error}. التفاصيل: ${orderResult.detail || 'لا توجد تفاصيل متاحة'}`);
    }
    
    // معالجة النجاح
    onSuccess(orderResult.order_number?.toString() || "N/A");
    
    toast({
      title: "تم تقديم الطلب بنجاح",
      description: `رقم الطلب: ${orderResult.order_number}`,
      variant: "default",
    });
    
    // تتبع نجاح الشراء مع بيانات شاملة للـ Event Match Quality
    if (orderResult.success && orderResult.data?.customer_order_number) {
      try {
        const totalPrice = (price * quantity) + deliveryFee;
        
        // جمع بيانات المستخدم الشاملة
        const purchaseUserData = {
          phone: values.phone || undefined,
          external_id: orderResult.data.customer_order_number.toString(), // استخدام رقم الطلب كمعرف خارجي
          client_user_agent: navigator.userAgent,
          language: navigator.language || 'ar',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          // معلومات إضافية من العميل
          customer_name: values.fullName,
          customer_location: `${values.province}, ${values.municipality}`
        };
        
        // تتبع حدث الشراء الناجح
        await fetch('/api/conversion-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            order_id: orderResult.data.customer_order_number.toString(),
            event_type: 'purchase',
            platform: 'multiple',
            user_data: purchaseUserData,
            custom_data: {
              quantity,
              unit_price: price,
              delivery_fee: deliveryFee,
              total_price: totalPrice,
              currency: 'DZD',
              page_type: 'order_success',
              purchase_completed_at: new Date().toISOString(),
              
              // معلومات تفصيلية عن الطلب
              order_number: orderResult.data.customer_order_number,
              customer_id: orderResult.data.customer_id,
              customer_province: values.province,
              customer_municipality: values.municipality,
              delivery_option: values.deliveryOption,
              payment_method: values.paymentMethod,
              
              // معلومات المنتج
              product_color_id: props.productColorId,
              product_size_id: props.productSizeId,
              size_name: props.sizeName
            }
          })
        });

        // تتبع البكسل أيضاً
        if ((window as any).trackConversion) {
          await (window as any).trackConversion('purchase', {
            value: totalPrice,
            currency: 'DZD',
            content_type: 'product',
            content_ids: [productId],
            num_items: quantity,
            order_id: orderResult.data.customer_order_number.toString(),
            userPhone: values.phone,
            customerName: values.fullName
          });
        }

      } catch (trackingError) {
        // لا نوقف العملية
      }
    }
    
    return true;
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    
    // معالجة أنواع الأخطاء المختلفة
    if (errorMessage.includes("انتهت مهلة") || errorMessage.includes("تجاوز مهلة")) {
      errorMessage = "استغرق الطلب وقتًا طويلًا، يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.";
    } else if (errorMessage.includes("فشل الاتصال")) {
      errorMessage = "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.";
    } else if (errorMessage.includes("slug")) {
      errorMessage = "حدثت مشكلة في معالجة الطلب. يرجى الاتصال بالدعم الفني.";
    }
    
    onError(errorMessage);
    
    toast({
      title: "فشل تقديم الطلب",
      description: errorMessage,
      variant: "destructive",
    });
    
    return false;
  } finally {
    // إنهاء عملية التقديم
    onSubmitEnd();
  }
};
