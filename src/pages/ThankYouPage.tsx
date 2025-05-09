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

// نوع قالب صفحة الشكر
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";

// نوع بيانات الطلب
interface OrderInfo {
  orderNumber: string;
  quantity: number;
  price: number;
  deliveryFee: number;
  totalPrice: number;
  date?: string;
  productId?: string;
  productName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  estimatedDelivery?: string;
}

export default function ThankYouPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({
    orderNumber: "",
    quantity: 0,
    price: 0,
    deliveryFee: 0,
    totalPrice: 0,
  });
  const [template, setTemplate] = useState<ThankYouTemplate | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(true);
  const templateLoadedRef = useRef(false);
  const orderInfoLoadedRef = useRef(false);

  useEffect(() => {
    if (orderInfoLoadedRef.current) return;
    
    // استخراج بيانات الطلب من معلمات URL
    const orderNumber = searchParams.get("orderNumber") || "";
    const quantity = Number(searchParams.get("quantity") || "0");
    const price = Number(searchParams.get("price") || "0");
    const deliveryFee = Number(searchParams.get("deliveryFee") || "0");
    const totalPrice = Number(searchParams.get("totalPrice") || "0");
    const productId = searchParams.get("productId") || undefined;
    const productName = searchParams.get("productName") || undefined;
    
    // متغيرات اختيارية إضافية
    const shippingAddress = searchParams.get("shippingAddress") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || "الدفع عند الاستلام";
    
    // اليوم كتاريخ افتراضي للطلب
    const date = new Date().toLocaleDateString("ar-DZ");
    
    // تقدير تاريخ التسليم (بعد 3-5 أيام)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);
    const estimatedDelivery = deliveryDate.toLocaleDateString("ar-DZ") + " - " + 
      new Date(deliveryDate.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-DZ");

    // التحقق من وجود رقم الطلب على الأقل
    if (!orderNumber) {
      navigate("/");
      return;
    }

    // تحديث حالة بيانات الطلب
    orderInfoLoadedRef.current = true;
    setOrderInfo({
      orderNumber,
      quantity,
      price,
      deliveryFee,
      totalPrice: totalPrice || (price * quantity + deliveryFee),
      date,
      productId,
      productName,
      shippingAddress,
      paymentMethod,
      estimatedDelivery
    });
  }, [searchParams, navigate]);

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
    if (orderInfo.orderNumber && !templateLoadedRef.current) {
      console.log("طلب تحميل القالب بعد تحميل بيانات الطلب");
      // نبدأ تحميل القالب هنا، بعد تحميل بيانات الطلب
      setIsTemplateLoading(true);
    }
  }, [orderInfo]);

  // إظهار حالة التحميل أثناء جلب القالب
  if (isTemplateLoading) {
    return (
      <>
        <Helmet>
          <title>جار تحميل الصفحة...</title>
        </Helmet>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-12 pb-16 px-4 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">جاري تحميل صفحة الشكر...</p>
          </div>
        </div>

        {/* تحميل القالب في الخلفية - فقط إذا كان لدينا معرف المنتج */}
        {orderInfo.productId && (
          <TemplateLoader 
            productId={orderInfo.productId} 
            onLoad={handleTemplateLoad} 
          />
        )}
      </>
    );
  }

  return (
    <>
      <Helmet>
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
                
                <div className="bg-white dark:bg-background rounded-lg border shadow-sm overflow-hidden">
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