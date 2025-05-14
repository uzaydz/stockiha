import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

// مكونات واجهة المستخدم
import Navbar from "@/components/Navbar";
import OrderConfirmation from "@/components/thank-you/OrderConfirmation";
import OrderSummary from "@/components/thank-you/OrderSummary";
import OrderNotification from "@/components/thank-you/OrderNotification";
import ThankYouActions from "@/components/thank-you/ThankYouActions";
import TemplateLoader from "@/components/thank-you/TemplateLoader";
import ThankYouContent from "@/components/thank-you/ThankYouContent";
import { Loader2 } from "lucide-react";

// *** تحديث الاستيراد والنوع ***
import { getOrderByOrderNumber, FullOrderInfo, DisplayOrderInfo } from "@/api/orders";
import { Database } from "@/lib/supabase-types";

// نوع قالب صفحة الشكر
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";

// *** إضافة حقول محسوبة لـ FullOrderInfo إذا لزم الأمر لاحقًا ***
// interface DisplayOrderInfo extends Partial<OnlineOrder> {
//   orderNumber: string; 
//   productName?: string; 
//   estimatedDelivery?: string; 
// }

// *** إزالة التعريف المحلي للواجهة ***
// interface DisplayOrderInfo extends FullOrderInfo {
//   orderNumber: string; // لضمان وجوده كسلسلة نصية
//   productName?: string; // يمكن جلبه لاحقًا أو تمريره
//   estimatedDelivery?: string;
// }

export default function ThankYouPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // *** استخدام النوع المحدث للحالة ***
  const [orderInfo, setOrderInfo] = useState<DisplayOrderInfo | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [errorLoadingOrder, setErrorLoadingOrder] = useState<string | null>(null);
  const [template, setTemplate] = useState<ThankYouTemplate | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(true);
  const templateLoadedRef = useRef(false);
  // const orderInfoLoadedRef = useRef(false); // لم نعد بحاجة لهذا

  // *** useEffect جديد لجلب بيانات الطلب من قاعدة البيانات ***
  useEffect(() => {
    const orderNumberParam = searchParams.get("orderNumber");

    if (!orderNumberParam) {
      console.error("Order number not found in URL params.");
      navigate("/"); // أو توجيه لصفحة خطأ
      return;
    }

    const fetchOrderData = async () => {
      setIsLoadingOrder(true);
      setErrorLoadingOrder(null);
      try {
        console.log(`Fetching order data for order number: ${orderNumberParam}`);
        const fetchedOrder = await getOrderByOrderNumber(orderNumberParam);

        if (fetchedOrder) {
          console.log("Order data fetched successfully:", fetchedOrder);
          // حساب تاريخ التسليم المقدر
          const deliveryDate = new Date();
          deliveryDate.setDate(deliveryDate.getDate() + 3);
          const estimatedDelivery = deliveryDate.toLocaleDateString("ar-DZ") + " - " + 
            new Date(deliveryDate.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-DZ");
            
          // *** الوصول إلى product_id من أول عنصر في الطلب ***
          const productIdFromItem = fetchedOrder.items && fetchedOrder.items.length > 0 ? fetchedOrder.items[0].product_id : undefined;
          // *** ملاحظة: productName لا يزال غير موجود ***
          // يمكن إضافة استعلام آخر هنا لجلب اسم المنتج باستخدام productIdFromItem
          // أو تعديل getOrderByOrderNumber ليشمل join مع جدول products
          
          setOrderInfo({ 
            ...fetchedOrder,
            orderNumber: fetchedOrder.customer_order_number?.toString() || orderNumberParam, 
            estimatedDelivery,
            // productName: fetchedProductName // إذا تم جلبه
          });
        } else {
          console.error(`Order with number ${orderNumberParam} not found.`);
          setErrorLoadingOrder("لم يتم العثور على الطلب المحدد.");
        }
      } catch (error) {
        console.error("Error fetching order data:", error);
        setErrorLoadingOrder("حدث خطأ أثناء جلب بيانات الطلب.");
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchOrderData();
  }, [searchParams, navigate]);

  // *** إزالة useEffect القديم الذي يعتمد على معلمات URL ***
  // useEffect(() => { ... }, [searchParams, navigate]);

  // معالج تحميل القالب
  const handleTemplateLoad = (loadedTemplate: ThankYouTemplate | null) => {
    if (templateLoadedRef.current) return;
    templateLoadedRef.current = true;
    
    console.log("تم تحميل القالب:", loadedTemplate?.name || "القالب الافتراضي");
    setTemplate(loadedTemplate);
    setIsTemplateLoading(false);
  };

  // التأكد من أننا لدينا بيانات الطلب قبل تحميل القالب
  useEffect(() => {
    // *** تعديل الشرط ليعتمد على orderInfo بدلاً من orderInfo.orderNumber ***
    if (orderInfo && !templateLoadedRef.current) {
      console.log("طلب تحميل القالب بعد تحميل بيانات الطلب");
      setIsTemplateLoading(true);
    }
  }, [orderInfo]); // الاعتماد على كائن orderInfo بأكمله

  // *** تعديل حالة التحميل لتشمل تحميل الطلب والقالب ***
  // *** الوصول إلى product_id عبر items[0] ***
  const productIdForTemplate = orderInfo?.items?.[0]?.product_id;
  if (isLoadingOrder || (orderInfo && isTemplateLoading && productIdForTemplate)) { 
    return (
      <>
        <Helmet>
          <title>جار تحميل الصفحة...</title>
        </Helmet>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-12 pb-16 px-4 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{isLoadingOrder ? 'جاري تحميل بيانات الطلب...' : 'جاري تحميل صفحة الشكر...'}</p>
          </div>
        </div>

        {/* تحميل القالب في الخلفية - فقط إذا كان لدينا معرف المنتج وبيانات الطلب */}
        {/* *** استخدام productIdForTemplate *** */}
        {productIdForTemplate && isLoadingOrder === false && (
          <TemplateLoader 
            productId={productIdForTemplate} 
            onLoad={handleTemplateLoad} 
          />
        )}
      </>
    );
  }

  // *** إضافة معالجة حالة الخطأ في تحميل الطلب ***
  if (errorLoadingOrder) {
    return (
      <>
        <Helmet>
          <title>خطأ في تحميل الطلب</title>
        </Helmet>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-12 pb-16 px-4 flex items-center justify-center">
          <div className="text-center text-destructive">
            <p>{errorLoadingOrder}</p>
            {/* يمكن إضافة زر للعودة للصفحة الرئيسية */}
          </div>
        </div>
      </>
    );
  }
  
  // *** التأكد من وجود orderInfo قبل العرض ***
  if (!orderInfo) {
      // نظريًا لن نصل هنا بسبب معالجة الأخطاء والتحميل أعلاه، لكن كإجراء احترازي
      return null; 
  }

  return (
    <>
      <Helmet>
        {/* *** استخدام رقم الطلب من الحالة *** */}
        <title>شكرًا لطلبك - معلومات الطلب #{orderInfo.orderNumber}</title>
        <meta name="description" content="تم استلام طلبك بنجاح وسيتم معالجته قريبًا" />
      </Helmet>

      <Navbar />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-12 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          {template ? (
            // عرض صفحة الشكر باستخدام القالب المخصص
            <ThankYouContent
              template={template}
              orderInfo={orderInfo}
            />
          ) : (
            // عرض صفحة الشكر الافتراضية إذا لم يتوفر قالب
            <>
              <OrderConfirmation />
              
              <div className="space-y-6">
                <OrderSummary orderInfo={orderInfo} />
                
                <div className="mb-6">
                  <OrderNotification type="info" />
                </div>
                
                <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <ThankYouActions />
                </div>
                
                <div className="mt-8 text-center text-muted-foreground">
                  <p>إذا كان لديك أي استفسار، يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
} 