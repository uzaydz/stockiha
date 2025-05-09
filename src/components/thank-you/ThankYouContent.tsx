import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OrderInfo {
  orderNumber: string;
  quantity: number;
  price: number;
  deliveryFee: number;
  totalPrice: number;
  date?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  estimatedDelivery?: string;
}

interface ThankYouContentProps {
  template: ThankYouTemplate;
  orderInfo: OrderInfo;
}

export default function ThankYouContent({ template, orderInfo }: ThankYouContentProps) {
  const navigate = useNavigate();
  
  // استخراج معلومات التصميم والألوان
  const { layout_type, color_scheme, custom_colors, content } = template;
  
  // تحديد الألوان بناءً على سكيم الألوان المحدد
  const getColors = () => {
    if (color_scheme === "custom" && custom_colors) {
      return custom_colors;
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

    return colorSchemes[color_scheme as keyof typeof colorSchemes];
  };

  const colors = getColors();

  // معالجة إجراءات الأزرار
  const handleAction = (action: string) => {
    if (action === "print") {
      window.print();
    } else if (action.startsWith("http") || action.startsWith("https")) {
      window.open(action, "_blank");
    } else {
      navigate(action);
    }
  };

  return (
    <div 
      className="thank-you-content"
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      <div className={`p-6 ${layout_type === 'minimalist' ? 'max-w-md mx-auto text-center' : 'max-w-4xl mx-auto'}`}>
        {/* العنوان */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: colors.accent }}
          >
            {content.header.title}
          </h1>
          <p className="text-lg">{content.header.subtitle}</p>
          
          {layout_type === 'elegant' && (
            <div 
              className="h-1 w-24 mx-auto mt-6 rounded-full"
              style={{ backgroundColor: colors.accent }}
            ></div>
          )}
        </div>

        {/* ملخص الطلب */}
        <div 
          className={cn(
            "mb-8 p-4 rounded-lg",
            layout_type === 'elegant' ? 'border-2' : 'border',
            layout_type === 'minimalist' ? 'text-center' : ''
          )}
          style={{ 
            borderColor: colors.border,
            backgroundColor: layout_type === 'colorful' ? `${colors.accent}10` : ''
          }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm mb-1">رقم الطلب</p>
              <p className="text-lg font-bold">#{orderInfo.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm mb-1">تاريخ الطلب</p>
              <p className="text-lg font-bold">{orderInfo.date}</p>
            </div>
            <div>
              <p className="text-sm mb-1">إجمالي المبلغ</p>
              <p className="text-lg font-bold">{orderInfo.totalPrice.toLocaleString()} د.ج</p>
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
        {content.features.showOrderDetails && (
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
                      backgroundColor: layout_type === 'colorful' 
                        ? `${colors.accent}20` 
                        : `${colors.border}60` 
                    }}
                  >
                    <th className="p-2 text-start">المنتج</th>
                    <th className="p-2 text-center">الكمية</th>
                    <th className="p-2 text-end">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t" style={{ borderColor: colors.border }}>
                    <td className="p-2">المنتج المطلوب</td>
                    <td className="p-2 text-center">{orderInfo.quantity}</td>
                    <td className="p-2 text-end">{(orderInfo.price * orderInfo.quantity).toLocaleString()} د.ج</td>
                  </tr>
                  {orderInfo.deliveryFee > 0 && (
                    <tr className="border-t" style={{ borderColor: colors.border }}>
                      <td className="p-2">رسوم التوصيل</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-end">{orderInfo.deliveryFee.toLocaleString()} د.ج</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold" style={{ borderColor: colors.border, backgroundColor: `${colors.accent}10` }}>
                    <td className="p-2" colSpan={2}>الإجمالي</td>
                    <td className="p-2 text-end">{orderInfo.totalPrice.toLocaleString()} د.ج</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* تفاصيل الشحن */}
        {content.features.showShippingDetails && orderInfo.shippingAddress && (
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
                  <p className="font-medium">{orderInfo.shippingAddress}</p>
                </div>
                {orderInfo.paymentMethod && (
                  <div>
                    <p className="text-sm mb-1">طريقة الدفع</p>
                    <p className="font-medium">{orderInfo.paymentMethod}</p>
                  </div>
                )}
                {orderInfo.estimatedDelivery && (
                  <div>
                    <p className="text-sm mb-1">تاريخ التسليم المتوقع</p>
                    <p className="font-medium">{orderInfo.estimatedDelivery}</p>
                  </div>
                )}
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
            onClick={() => handleAction(content.call_to_action.primary.action)}
          >
            {content.call_to_action.primary.text}
          </Button>
          
          {content.call_to_action.secondary && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              style={{ 
                borderColor: colors.accent,
                color: colors.accent 
              }}
              onClick={() => handleAction(content.call_to_action.secondary!.action)}
            >
              {content.call_to_action.secondary.text}
            </Button>
          )}
        </div>

        {/* الاقسام المخصصة */}
        {content.custom_sections && content.custom_sections.length > 0 && (
          <div className="my-8 space-y-6">
            {content.custom_sections.map((section, index) => (
              <div key={section.id || index} className="p-4 border rounded-lg" style={{ borderColor: colors.border }}>
                <h3 className="text-lg font-medium mb-2">{section.title}</h3>
                {section.type === "text" && <p>{section.content}</p>}
                {section.type === "html" && <div dangerouslySetInnerHTML={{ __html: section.content }} />}
                {section.type === "button" && (
                  <Button
                    className="mt-2"
                    style={{ 
                      backgroundColor: colors.accent,
                      color: "white" 
                    }}
                  >
                    {section.content}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* نص التذييل */}
        <div className="text-center mt-8 pt-8 border-t text-sm" style={{ borderColor: colors.border }}>
          <p>{content.footer_text}</p>
        </div>
      </div>
    </div>
  );
} 