import { toast } from "@/components/ui/use-toast";
import { processOrder } from "@/api/store";
import { OrderFormValues } from "./OrderFormTypes";
import { checkDatabaseConnection } from "./DatabaseConnection";

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
  const address = customFormData?.address || values.address || "غير محدد";
  const city = municipality; // استخدام البلدية كمدينة
  
  // استخراج stop_desk_id من النموذج أو البيانات المخصصة
  const stop_desk_id = customFormData?.stop_desk_id || customFormData?.stopDeskId || values.stopDeskId || null;
  
  console.log(`[OrderFormSubmitter] إعداد بيانات الطلب، stop_desk_id: ${stop_desk_id}`);

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
    console.error("خطأ في محاولة إرسال الطلب:", error);
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
    onSuccess,
    onError,
    onSubmitStart,
    onSubmitEnd,
    formData
  } = props;
  
  // بدء عملية التقديم
  onSubmitStart();
  
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
    
    // إعداد بيانات الطلب
    const orderData = prepareOrderData(props, formData);
    
    
    
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
        console.error(`فشلت المحاولة رقم ${retryCount + 1}:`, error);
        
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
      console.error("عادت نتيجة فارغة من معالجة الطلب");
      throw new Error("لم يتم استلام أي استجابة من الخادم. يرجى المحاولة مرة أخرى.");
    }
    
    if (orderResult && orderResult.error) {
      console.error("استجابة الخطأ من الخادم:", orderResult.error);
      throw new Error(`خطأ API: ${orderResult.error}. التفاصيل: ${orderResult.detail || 'لا توجد تفاصيل متاحة'}`);
    }
    
    // معالجة النجاح
    onSuccess(orderResult.order_number?.toString() || "N/A");
    
    toast({
      title: "تم تقديم الطلب بنجاح",
      description: `رقم الطلب: ${orderResult.order_number}`,
      variant: "default",
    });
    
    return true;
  } catch (error) {
    console.error("خطأ في تقديم الطلب:", error);
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