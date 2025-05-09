import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Smartphone, Tablet, Monitor, Printer } from "lucide-react";

interface ThankYouPagePreviewProps {
  template: ThankYouTemplate;
}

export default function ThankYouPagePreview({
  template,
}: ThankYouPagePreviewProps) {
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [showElements, setShowElements] = useState(true);

  // تحديد الألوان بناءً على سكيم الألوان المحدد
  const getColors = () => {
    if (template.color_scheme === "custom" && template.custom_colors) {
      return template.custom_colors;
    }

    // ألوان افتراضية لكل سكيم
    const colorSchemes = {
      primary: {
        background: "#ffffff",
        accent: "#3b82f6",
        text: "#374151",
        border: "#e5e7eb",
      },
      success: {
        background: "#f0fdf4",
        accent: "#22c55e",
        text: "#374151",
        border: "#dcfce7",
      },
      info: {
        background: "#f0f9ff",
        accent: "#0ea5e9",
        text: "#374151",
        border: "#e0f2fe",
      },
    };

    return colorSchemes[template.color_scheme as keyof typeof colorSchemes];
  };

  // محاكاة معلومات الطلب
  const orderDetails = {
    order_number: "ORD-12345",
    order_date: new Date().toLocaleDateString("ar-DZ"),
    total_amount: "5,200.00 د.ج",
    payment_method: "الدفع عند الاستلام",
    items: [
      {
        name: "هاتف ذكي جديد",
        quantity: 1,
        price: "4,500.00 د.ج",
      },
      {
        name: "حافظة للهاتف",
        quantity: 1,
        price: "700.00 د.ج",
      },
    ],
    shipping: {
      address: "حي السلام، شارع الاستقلال، رقم 15، الجزائر العاصمة",
      method: "توصيل عادي",
      estimated_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-DZ"),
    }
  };

  // الألوان المستخدمة في المعاينة
  const colors = getColors();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>معاينة صفحة الشكر</CardTitle>
          <CardDescription>
            شاهد كيف ستظهر صفحة الشكر للعملاء بعد إتمام الطلب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={previewDevice === "mobile" ? "default" : "outline"}
                className="h-8 w-8 p-0"
                onClick={() => setPreviewDevice("mobile")}
              >
                <Smartphone className="h-4 w-4" />
                <span className="sr-only">عرض كهاتف</span>
              </Button>
              <Button
                size="sm"
                variant={previewDevice === "tablet" ? "default" : "outline"}
                className="h-8 w-8 p-0"
                onClick={() => setPreviewDevice("tablet")}
              >
                <Tablet className="h-4 w-4" />
                <span className="sr-only">عرض كتابلت</span>
              </Button>
              <Button
                size="sm"
                variant={previewDevice === "desktop" ? "default" : "outline"}
                className="h-8 w-8 p-0"
                onClick={() => setPreviewDevice("desktop")}
              >
                <Monitor className="h-4 w-4" />
                <span className="sr-only">عرض كحاسوب</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => setShowElements(!showElements)}
              >
                {showElements ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span>إخفاء العناصر</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>إظهار العناصر</span>
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
              >
                <Printer className="h-4 w-4" />
                <span>معاينة الطباعة</span>
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "border rounded-md mx-auto transition-all overflow-hidden",
              previewDevice === "mobile" && "max-w-[375px]",
              previewDevice === "tablet" && "max-w-[768px]",
              previewDevice === "desktop" && "w-full"
            )}
          >
            <div 
              className="preview-container" 
              style={{
                backgroundColor: colors.background,
                color: colors.text,
              }}
            >
              {/* محاكاة شريط التنقل العلوي */}
              <div 
                className="py-4 px-6 border-b text-center"
                style={{ borderColor: colors.border }}
              >
                <h3 className="font-bold">اسم المتجر</h3>
              </div>

              {/* محتوى صفحة الشكر */}
              <div className={`p-6 ${template.layout_type === 'minimalist' ? 'max-w-md mx-auto text-center' : 'max-w-4xl mx-auto'}`}>
                {/* الترويسة */}
                <div className="text-center mb-8">
                  <h1 
                    className="text-3xl font-bold mb-2"
                    style={{ color: colors.accent }}
                  >
                    {template.content.header.title}
                  </h1>
                  <p className="text-lg">{template.content.header.subtitle}</p>
                  
                  {template.layout_type === 'elegant' && (
                    <div 
                      className="h-1 w-24 mx-auto mt-6 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    ></div>
                  )}
                </div>

                {/* رقم الطلب والحالة */}
                <div 
                  className={cn(
                    "mb-8 p-4 rounded-lg",
                    template.layout_type === 'elegant' ? 'border-2' : 'border',
                    template.layout_type === 'minimalist' ? 'text-center' : ''
                  )}
                  style={{ 
                    borderColor: colors.border,
                    backgroundColor: template.layout_type === 'colorful' ? `${colors.accent}10` : ''
                  }}
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <p className="text-sm mb-1">رقم الطلب</p>
                      <p className="text-lg font-bold">{orderDetails.order_number}</p>
                    </div>
                    <div>
                      <p className="text-sm mb-1">تاريخ الطلب</p>
                      <p className="text-lg font-bold">{orderDetails.order_date}</p>
                    </div>
                    <div>
                      <p className="text-sm mb-1">إجمالي المبلغ</p>
                      <p className="text-lg font-bold">{orderDetails.total_amount}</p>
                    </div>
                    <div 
                      className="px-4 py-2 rounded-full text-white"
                      style={{ backgroundColor: colors.accent }}
                    >
                      تم استلام الطلب
                    </div>
                  </div>
                </div>

                {/* تفاصيل الطلب */}
                {template.content.features.showOrderDetails && (
                  <div className="mb-8">
                    <h2 
                      className="text-xl font-bold mb-4 pb-2 border-b"
                      style={{ borderColor: colors.border }}
                    >
                      تفاصيل الطلب
                    </h2>
                    <div 
                      className="overflow-hidden rounded-lg border"
                      style={{ borderColor: colors.border }}
                    >
                      <table className="w-full">
                        <thead>
                          <tr 
                            style={{ 
                              backgroundColor: template.layout_type === 'colorful' 
                                ? `${colors.accent}20` 
                                : colors.border 
                            }}
                          >
                            <th className="p-2 text-start">المنتج</th>
                            <th className="p-2 text-center">الكمية</th>
                            <th className="p-2 text-end">السعر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetails.items.map((item, index) => (
                            <tr key={index} className="border-t" style={{ borderColor: colors.border }}>
                              <td className="p-2">{item.name}</td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 text-end">{item.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* تفاصيل الشحن */}
                {template.content.features.showShippingDetails && (
                  <div className="mb-8">
                    <h2 
                      className="text-xl font-bold mb-4 pb-2 border-b"
                      style={{ borderColor: colors.border }}
                    >
                      تفاصيل الشحن
                    </h2>
                    <div 
                      className="p-4 rounded-lg border"
                      style={{ borderColor: colors.border }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm mb-1">العنوان</p>
                          <p className="font-medium">{orderDetails.shipping.address}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1">طريقة الشحن</p>
                          <p className="font-medium">{orderDetails.shipping.method}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1">تاريخ التسليم المتوقع</p>
                          <p className="font-medium">{orderDetails.shipping.estimated_date}</p>
                        </div>
                        <div>
                          <p className="text-sm mb-1">طريقة الدفع</p>
                          <p className="font-medium">{orderDetails.payment_method}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* أزرار الحث على اتخاذ إجراء */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-8">
                  <Button
                    className="w-full sm:w-auto"
                    style={{ 
                      backgroundColor: colors.accent,
                      color: "white" 
                    }}
                  >
                    {template.content.call_to_action.primary.text}
                  </Button>
                  
                  {template.content.call_to_action.secondary && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      style={{ 
                        borderColor: colors.accent,
                        color: colors.accent 
                      }}
                    >
                      {template.content.call_to_action.secondary.text}
                    </Button>
                  )}
                </div>

                {/* نص التذييل */}
                <div className="text-center mt-8 pt-8 border-t text-sm" style={{ borderColor: colors.border }}>
                  <p>{template.content.footer_text}</p>
                </div>
              </div>
            </div>
          </div>

          {showElements && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: "#e5e7eb" }}>
              <div className="text-sm">
                <h3 className="font-medium text-sm">العناصر المعروضة:</h3>
                <ul className="mt-1 space-y-1 ps-5 list-disc">
                  <li>الترويسة مع العنوان والعنوان الفرعي</li>
                  <li>ملخص الطلب مع الرقم والسعر</li>
                  {template.content.features.showOrderDetails && <li>تفاصيل المنتجات المطلوبة</li>}
                  {template.content.features.showShippingDetails && <li>تفاصيل الشحن والتسليم</li>}
                  <li>أزرار الحث على اتخاذ إجراء</li>
                  {template.content.features.showContactSupport && <li>معلومات الاتصال بالدعم</li>}
                </ul>
              </div>
              <div className="text-sm">
                <h3 className="font-medium text-sm">التصميم المطبق:</h3>
                <ul className="mt-1 space-y-1 ps-5 list-disc">
                  <li>التخطيط: {template.layout_type === "standard" ? "قياسي" : 
                               template.layout_type === "minimalist" ? "مينيمال" : 
                               template.layout_type === "elegant" ? "أنيق" : "ملون"}</li>
                  <li>سكيم الألوان: {template.color_scheme === "primary" ? "أساسي" : 
                                    template.color_scheme === "success" ? "نجاح" : 
                                    template.color_scheme === "info" ? "معلوماتي" : "مخصص"}</li>
                  <li>يطبق على: {template.applies_to === "all_products" ? "جميع المنتجات" : "منتجات محددة"}</li>
                </ul>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
} 