import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrinter } from "@/hooks/usePrinter";

// *** استيراد النوع المحدث ***
import { DisplayOrderInfo } from "@/api/orders";

// *** إزالة الواجهة القديمة ***
// interface OrderInfo {
//   orderNumber: string;
//   quantity: number;
//   price: number;
//   deliveryFee: number;
//   totalPrice: number;
//   date?: string;
//   customerName?: string;
//   customerEmail?: string;
//   customerPhone?: string;
//   shippingAddress?: string;
//   paymentMethod?: string;
//   estimatedDelivery?: string;
// }

// *** تحديث الواجهة لاستخدام النوع الجديد ***
interface ThankYouContentProps {
  template: ThankYouTemplate;
  orderInfo: DisplayOrderInfo;
}

export default function ThankYouContent({ template, orderInfo }: ThankYouContentProps) {
  const navigate = useNavigate();

  // ⚡ نظام الطباعة الموحد
  const { printHtml, isElectron: isElectronPrint } = usePrinter();
  
  // استخراج معلومات التصميم والألوان
  const { layout_type, color_scheme, custom_colors, content } = template;

  // *** استخلاص بيانات محسوبة/مستخدمة بشكل متكرر ***
  const orderDate = orderInfo.created_at ? new Date(orderInfo.created_at).toLocaleDateString("ar-DZ") : orderInfo.estimatedDelivery?.split(' - ')[0] || '-';
  const finalTotal = orderInfo.total ? parseFloat(orderInfo.total as any) : 0;
  const firstItem = orderInfo.items?.[0];
  const quantity = firstItem?.quantity || 0;
  const productsSubtotal = orderInfo.subtotal ? parseFloat(orderInfo.subtotal as any) : 0;
  const shippingCost = orderInfo.shipping_cost ? parseFloat(orderInfo.shipping_cost as any) : 0;
  
  // استخلاص تفاصيل العرض المطبق
  let appliedOffer = null;
  if (orderInfo.metadata && typeof orderInfo.metadata === 'object' && 'applied_quantity_offer' in orderInfo.metadata) {
    appliedOffer = (orderInfo.metadata as any).applied_quantity_offer;
  }
  const discountAmount = appliedOffer?.appliedDiscountAmount;
  const freeShipping = appliedOffer?.appliedFreeShipping;
  
  // تحديد الألوان بناءً على سكيم الألوان المحدد
  const getColors = () => {
    if (color_scheme === "custom" && custom_colors) {
      return custom_colors;
    }

    // ألوان افتراضية لكل سكيم
    const colorSchemes = {
      primary: {
        background: "var(--background)",
        accent: "#3b82f6",
        text: "var(--foreground)",
        border: "var(--border)",
      },
      success: {
        background: "var(--background)",
        accent: "#22c55e",
        text: "var(--foreground)",
        border: "var(--border)",
      },
      info: {
        background: "var(--background)",
        accent: "#0ea5e9",
        text: "var(--foreground)",
        border: "var(--border)",
      },
    };

    return colorSchemes[color_scheme as keyof typeof colorSchemes];
  };

  const colors = getColors();

  // معالجة إجراءات الأزرار
  const handleAction = async (action: string) => {
    if (action === "print") {
      // ⚡ استخدام نظام الطباعة الموحد
      if (isElectronPrint) {
        try {
          const contentDiv = document.querySelector('.thank-you-content');
          if (contentDiv) {
            await printHtml(`
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
                <head>
                  <meta charset="UTF-8">
                  <title>تفاصيل الطلب #${orderInfo.orderNumber}</title>
                  <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; padding: 20px; }
                    @page { size: A4; margin: 15mm; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; border: 1px solid #ddd; text-align: right; }
                  </style>
                </head>
                <body>${contentDiv.innerHTML}</body>
              </html>
            `, { silent: false, pageSize: 'A4' });
            return;
          }
        } catch (err) {
          console.warn('[ThankYouContent] فشلت الطباعة المباشرة:', err);
        }
      }
      // Fallback
      window.print();
    } else if (action.startsWith("http") || action.startsWith("https")) {
      window.open(action, "_blank");
    } else {
      navigate(action);
    }
  };

  return (
    <div 
      className="thank-you-content bg-card text-card-foreground rounded-lg"
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
          <p className="text-lg text-muted-foreground">
            {content.header.subtitle}
          </p>
          
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
            "mb-8 p-4 rounded-lg border border-border bg-muted/20",
            layout_type === 'elegant' ? 'border-2' : 'border',
            layout_type === 'minimalist' ? 'text-center' : ''
          )}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm mb-1 text-muted-foreground">رقم الطلب</p>
              <p className="text-lg font-bold">#{orderInfo.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm mb-1 text-muted-foreground">تاريخ الطلب</p>
              {/* *** استخدام التاريخ المنسق *** */}
              <p className="text-lg font-bold">{orderDate}</p>
            </div>
            <div>
              <p className="text-sm mb-1 text-muted-foreground">إجمالي المبلغ</p>
              {/* *** استخدام الإجمالي النهائي مع التحقق *** */}
              <p className="text-lg font-bold">{finalTotal ? finalTotal.toLocaleString() : '-'} د.ج</p>
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
            <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">
              تفاصيل الطلب
            </h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="p-2 text-start">المنتج</th>
                    <th className="p-2 text-center">الكمية</th>
                    <th className="p-2 text-end">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="p-2">المنتج المطلوب</td>
                    {/* *** استخدام الكمية من items *** */}
                    <td className="p-2 text-center">{quantity || '-'}</td>
                    {/* *** استخدام المجموع الفرعي للمنتجات *** */}
                    <td className="p-2 text-end">{productsSubtotal ? productsSubtotal.toLocaleString() : '-'} د.ج</td>
                  </tr>
                  {/* *** إضافة سطر الخصم *** */}
                  {discountAmount > 0 && (
                    <tr className="border-t border-border text-red-600 dark:text-red-400">
                      <td className="p-2">الخصم المطبق (عرض)</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-end">- {discountAmount.toLocaleString()} د.ج</td>
                    </tr>
                  )}
                  {/* *** تعديل عرض رسوم التوصيل *** */}
                  {(shippingCost > 0 || freeShipping) && (
                    <tr className="border-t border-border">
                      <td className="p-2">رسوم التوصيل</td>
                      <td className="p-2 text-center">-</td>
                      <td className={`p-2 text-end ${freeShipping ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {freeShipping ? "مجاني (عرض)" : `${shippingCost.toLocaleString()} د.ج`}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold border-border bg-primary/10">
                    <td className="p-2" colSpan={2}>الإجمالي</td>
                    {/* *** استخدام الإجمالي النهائي مع التحقق *** */}
                    <td className="p-2 text-end">{finalTotal ? finalTotal.toLocaleString() : '-'} د.ج</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* تفاصيل الشحن */}
        {/* *** ملاحظة: orderInfo.shippingAddress غير موجود، نستخدم shipping_address_id كسلسلة نصية مؤقتًا *** */}
        {/* *** من الأفضل تعديل getOrderByOrderNumber لجلب العنوان الفعلي *** */}
        {content.features.showShippingDetails && orderInfo.shipping_address_id && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border">
              تفاصيل الشحن
            </h2>
            <div className="p-4 rounded-lg border border-border bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm mb-1 text-muted-foreground">العنوان</p>
                  {/* *** استخدام حقل بديل أو جلب العنوان الفعلي *** */}
                  <p className="font-medium">{orderInfo.shipping_address_id ? `مسجل (ID: ${orderInfo.shipping_address_id})` : 'غير متوفر'}</p>
                </div>
                {/* *** استخدام payment_method *** */}
                {orderInfo.payment_method && (
                  <div>
                    <p className="text-sm mb-1 text-muted-foreground">طريقة الدفع</p>
                    <p className="font-medium">{orderInfo.payment_method === 'cash_on_delivery' ? 'الدفع عند الاستلام' : orderInfo.payment_method}</p>
                  </div>
                )}
                {/* *** استخدام estimatedDelivery المحسوب *** */}
                {orderInfo.estimatedDelivery && (
                  <div>
                    <p className="text-sm mb-1 text-muted-foreground">تاريخ التسليم المتوقع</p>
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

        {/* معلومات التواصل */}
        {content.features.showContactSupport && (
          <div className="mt-12 text-center">
            <p className="mb-2 text-muted-foreground">
              إذا كان لديك أي استفسار، يرجى التواصل معنا
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <a 
                href="mailto:support@example.com"
                className="text-sm hover:underline"
                style={{ color: colors.accent }}
              >
                support@example.com
              </a>
              <a 
                href="tel:+123456789"
                className="text-sm hover:underline"
                style={{ color: colors.accent }}
              >
                +123 456 789
              </a>
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        {content.footer_text && (
          <div className="my-8 p-4 rounded-lg border text-center border-border bg-muted/10">
            <p className="italic text-muted-foreground">
              {content.footer_text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
