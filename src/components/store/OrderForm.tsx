import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTenant } from "@/context/TenantContext";
import { OrderFormProps, orderFormSchema, OrderFormValues, CustomFormField } from "./order-form/OrderFormTypes";
import { PersonalInfoFields, DeliveryInfoFields, CustomFormFields, OrderSummary } from "./order-form";
import { Loader2 } from "lucide-react";
import { Form } from "@/components/ui/form";
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

/**
 * نموذج الطلب المحسن
 */
export default function OrderForm({
  productId,
  productColorId,
  productSizeId,
  sizeName,
  price,
  deliveryFee = 0,
  quantity = 1,
  customFields = []
}: OrderFormProps) {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDeliveryFee, setCurrentDeliveryFee] = useState(deliveryFee);
  const [formReady, setFormReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // إعداد نموذج React Hook Form
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      province: "",
      municipality: "",
      address: "",
      deliveryCompany: "yalidine",
      deliveryOption: "home",
      paymentMethod: "cash_on_delivery",
      notes: ""
    },
  });

  // تغيير رسوم التوصيل عند تغيير شركة التوصيل
  const handleDeliveryCompanyChange = (value: string) => {
    const company = [
      { id: "yalidine", fee: 400 },
      { id: "zr_express", fee: 350 },
      { id: "quick_line", fee: 450 }
    ].find(c => c.id === value);
    
    if (company) {
      setCurrentDeliveryFee(company.fee);
    }
  };

  // تهيئة النموذج بعد التحميل
  useEffect(() => {
    // التأكد من أن النموذج جاهز
    setFormReady(true);
    
    // تحديد الشركة الافتراضية للتوصيل
    const defaultCompany = "yalidine";
    form.setValue("deliveryCompany", defaultCompany);
    handleDeliveryCompanyChange(defaultCompany);
  }, []);

  // إضافة مستمع لزر تأكيد الطلب
  useEffect(() => {
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
  }, [isSubmitting]);

  // توجيه المستخدم إلى صفحة الشكر عند نجاح الطلب
  useEffect(() => {
    if (orderNumber) {
      const totalPrice = price * quantity + currentDeliveryFee;
      
      // جلب اسم المنتج إذا تم توفيره
      const getProductInfo = async () => {
        try {
          // استخدام واجهة برمجة التطبيقات الداخلية للحصول على معلومات المنتج
          let productName = "";
          if (productId) {
            productName = await getProductNameById(productId);
          }
          
          // توجيه المستخدم إلى صفحة الشكر مع بيانات الطلب
          navigate(`/thank-you?orderNumber=${orderNumber}&quantity=${quantity}&price=${price}&deliveryFee=${currentDeliveryFee}&totalPrice=${totalPrice}&productId=${productId || ""}&productName=${encodeURIComponent(productName)}`);
        } catch (error) {
          console.error("خطأ أثناء جلب معلومات المنتج:", error);
          // التوجيه بدون معلومات المنتج في حالة حدوث خطأ
          navigate(`/thank-you?orderNumber=${orderNumber}&quantity=${quantity}&price=${price}&deliveryFee=${currentDeliveryFee}&totalPrice=${totalPrice}`);
        }
      };
      
      getProductInfo();
    }
  }, [orderNumber, navigate, quantity, price, currentDeliveryFee, productId]);

  // معالجة تقديم النموذج بشكل مباشر
  const processFormSubmission = async () => {
    console.log("بدء معالجة تقديم النموذج");
    
    if (isSubmitting) {
      console.log("التقديم جاري بالفعل، تم تجاهل الطلب");
      return;
    }
    
    if (!tenant?.id) {
      setError("لم يتم العثور على معلومات المتجر");
      return;
    }
    
    // بدء عملية التقديم
    setIsSubmitting(true);
    setError(null);
    
    try {
      // استخدام النموذج المخصص إذا كان متاحًا
      const hasCustomForm = customFields.length > 0 && customFields.some(field => field.isVisible);
      
      if (hasCustomForm && formRef.current) {
        console.log("معالجة النموذج المخصص");
        
        // التحقق من صحة النموذج المخصص
        const { isValid, errorMessages } = validateCustomForm(formRef.current, customFields);
        if (!isValid) {
          const errorMessage = errorMessages.join(", ");
          console.error("خطأ في النموذج المخصص:", errorMessage);
          setError(errorMessage);
          setIsSubmitting(false);
          return;
        }
        
        // جمع البيانات من النموذج المخصص
        const customFormData = collectCustomFormData(formRef.current, customFields);
        console.log("البيانات المجمعة من النموذج المخصص:", customFormData);
        
        if (!customFormData) {
          console.error("فشل في جمع البيانات من النموذج المخصص");
          setError("حدث خطأ أثناء جمع بيانات النموذج");
          setIsSubmitting(false);
          return;
        }
        
        // محاولة تقديم الطلب مع البيانات المخصصة
        console.log("إرسال الطلب باستخدام البيانات المخصصة");
        
        try {
          await submitOrderForm({
            values: form.getValues(), // استخدام القيم الأساسية للنموذج
            organizationId: tenant.id,
            productId,
            productColorId,
            productSizeId,
            sizeName,
            quantity,
            price,
            deliveryFee: currentDeliveryFee,
            formData: customFormData, // تمرير البيانات المخصصة
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
            },
          });
        } catch (submitError) {
          console.error("خطأ أثناء تقديم الطلب المخصص:", submitError);
          setError("حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.");
          setIsSubmitting(false);
        }
      } else {
        console.log("معالجة النموذج الافتراضي");
        
        // استخدام نموذج react-hook-form للتحقق من الصحة
        try {
          // التحقق من صحة النموذج
          await form.trigger();
          
          if (!form.formState.isValid) {
            console.error("النموذج غير صالح:", form.formState.errors);
            setError("يرجى ملء جميع الحقول المطلوبة بشكل صحيح");
            setIsSubmitting(false);
            return;
          }
          
          // إذا كان النموذج صالحًا، قم بتقديمه
          const values = form.getValues();
          console.log("قيم النموذج الافتراضي:", values);
          
          await submitOrderForm({
            values,
            organizationId: tenant.id,
            productId,
            productColorId,
            productSizeId,
            sizeName,
            quantity,
            price,
            deliveryFee: currentDeliveryFee,
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
            },
          });
        } catch (err) {
          console.error("خطأ أثناء التحقق من النموذج:", err);
          setError("حدث خطأ أثناء معالجة النموذج");
          setIsSubmitting(false);
        }
      }
    } catch (error) {
      console.error("خطأ غير متوقع أثناء معالجة النموذج:", error);
      setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  // معالج النموذج الأصلي (سيتم تجاهله لصالح النهج الجديد)
  const onSubmit = async (values: OrderFormValues) => {
    console.log("تم استدعاء onSubmit الأصلي - سيتم تجاهله");
  };

  // التحقق من اتصال قاعدة البيانات عند تحميل النموذج
  useEffect(() => {
    const verifyConnection = async () => {
      const isConnected = await checkDatabaseConnection();
      if (!isConnected) {
        setError("لا يمكن الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.");
      }
    };
    
    verifyConnection();
  }, []);

  // عرض نموذج الطلب
  return (
    <div className="w-full space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* عرض إما النموذج المخصص أو النموذج الافتراضي، وليس كلاهما */}
          {customFields.length > 0 ? (
            // عرض النموذج المخصص إذا كان متوفرًا
            <CustomFormFields customFields={customFields.filter(field => field.isVisible)} />
          ) : (
            // عرض النموذج الافتراضي إذا لم يكن هناك نموذج مخصص
            <>
              <PersonalInfoFields form={form} />
              <DeliveryInfoFields 
                form={form} 
                onDeliveryCompanyChange={handleDeliveryCompanyChange} 
              />
            </>
          )}
          
          {/* ملخص الطلب (يظهر دائمًا) */}
          <OrderSummary
            quantity={quantity}
            price={price}
            deliveryFee={currentDeliveryFee}
            total={price * quantity + currentDeliveryFee}
            isSubmitting={isSubmitting}
          />
          
          {!formReady && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </form>
      </Form>
    </div>
  );
} 