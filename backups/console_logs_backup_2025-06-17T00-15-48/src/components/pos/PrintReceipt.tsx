import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ShoppingBag, Receipt, Wrench, QrCode, Clock, User, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Product, Service } from '@/types';
import { formatPrice } from '@/lib/utils';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { useTenant } from '@/context/TenantContext';
import { POSSettings } from '@/types/posSettings';

interface CartItem {
  product: Product;
  quantity: number;
  wholesalePrice?: number | null;
  isWholesale?: boolean;
  colorId?: string;
  colorName?: string;
  colorCode?: string;
  sizeId?: string;
  sizeName?: string;
  variantPrice?: number;
  variantImage?: string;
}

interface SelectedService extends Service {
  scheduledDate?: Date;
  notes?: string;
  customerId?: string;
  public_tracking_code?: string;
}

interface PrintReceiptProps {
  orderId: string;
  items: CartItem[];
  services: SelectedService[];
  subtotal: number;
  tax: number;
  total: number;
  customerName?: string;
  employeeName?: string;
  paymentMethod?: string;
  discount?: number;
  discountAmount?: number;
  amountPaid?: number;
  remainingAmount?: number;
  isPartialPayment?: boolean;
  considerRemainingAsPartial?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({
  orderId,
  items,
  services,
  subtotal,
  tax,
  total,
  customerName,
  employeeName,
  paymentMethod,
  discount = 0,
  discountAmount = 0,
  amountPaid,
  remainingAmount = 0,
  isPartialPayment = false,
  considerRemainingAsPartial = false,
  isOpen,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { currentOrganization } = useTenant();
  
  // استخدام هوك إعدادات نقطة البيع
  const { settings, isLoading } = usePOSSettings({
    organizationId: currentOrganization?.id
  });

  // طباعة الوصل
  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload(); // إعادة تحميل لاستعادة الصفحة
    }
  };

  // تحديد موضع رمز العملة
  const formatPriceWithSettings = (price: number) => {
    if (!settings) return formatPrice(price);
    
    const formattedPrice = price.toFixed(2);
    return settings.currency_position === 'before' 
      ? `${settings.currency_symbol} ${formattedPrice}`
      : `${formattedPrice} ${settings.currency_symbol}`;
  };

  // تحديد محاذاة النص
  const getTextAlignment = (style: string) => {
    switch (style) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      case 'centered': 
      default: return 'text-center';
    }
  };

  // أنماط القالب
  const getTemplateStyles = () => {
    if (!settings) return {};
    
    const baseStyles = {
      fontSize: `${settings.font_size}px`,
      lineHeight: settings.line_spacing,
      color: settings.text_color,
      backgroundColor: settings.background_color,
    };

    switch (settings.receipt_template) {
      case 'modern':
        return {
          ...baseStyles,
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        };
      case 'minimal':
        return {
          ...baseStyles,
          border: '1px solid #e5e7eb',
        };
      case 'custom':
        return {
          ...baseStyles,
          // يمكن إضافة CSS مخصص هنا من settings.custom_css
        };
      case 'classic':
      default:
        return baseStyles;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">طباعة الوصل</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* محتوى الوصل للطباعة */}
        <div 
          ref={printRef}
          className="receipt-content"
          style={{
            width: settings ? `${settings.paper_width * 3.5}px` : '300px',
            margin: '0 auto',
            fontFamily: 'monospace',
            ...getTemplateStyles()
          }}
        >
          {/* رأسية الوصل */}
          <div className={`mb-4 ${settings ? getTextAlignment(settings.header_style) : 'text-center'}`}>
            {/* شعار المتجر */}
            {settings?.show_store_logo && settings.store_logo_url && (
              <div className="mb-3 flex justify-center">
                <img 
                  src={settings.store_logo_url} 
                  alt="شعار المتجر" 
                  className="w-16 h-16 object-contain"
                />
              </div>
            )}

            {/* معلومات المتجر */}
            {settings?.show_store_info && (
              <div className="mb-3">
                <h2 
                  className="font-bold text-lg mb-1"
                  style={{ color: settings.primary_color }}
                >
                  {settings.store_name}
                </h2>
                {settings.store_phone && (
                  <p className="text-xs">{settings.store_phone}</p>
                )}
                {settings.store_email && (
                  <p className="text-xs">{settings.store_email}</p>
                )}
                {settings.store_address && (
                  <p className="text-xs">{settings.store_address}</p>
                )}
              </div>
            )}

            {/* رسالة الترحيب */}
            {settings?.welcome_message && (
              <p className="mb-2" style={{ color: settings.primary_color }}>
                {settings.welcome_message}
              </p>
            )}

            {/* نص الرأسية */}
            {settings?.receipt_header_text && (
              <p className="text-xs mb-2">
                {settings.receipt_header_text}
              </p>
            )}
          </div>

          {/* معلومات الطلب */}
          <div className="mb-4 border-t border-b border-dashed py-2">
            {/* التاريخ والوقت */}
            {settings?.show_date_time && (
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  التاريخ:
                </span>
                <span>
                  {new Date().toLocaleDateString('ar-SA')} {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {/* رقم الطلب */}
            <div className="flex justify-between text-xs mb-1">
              <span>رقم الطلب:</span>
              <span className="font-mono">{orderId}</span>
            </div>

            {/* اسم الموظف */}
            {settings?.show_employee_name && employeeName && (
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  الموظف:
                </span>
                <span>{employeeName}</span>
              </div>
            )}

            {/* معلومات العميل */}
            {settings?.show_customer_info && customerName && (
              <div className="flex justify-between text-xs">
                <span>العميل:</span>
                <span>{customerName}</span>
              </div>
            )}
          </div>

          {/* عناصر الطلب */}
          {items.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
                المنتجات
              </h3>
              
              {settings?.item_display_style === 'table' ? (
                // عرض في شكل جدول
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dashed">
                      <th className="text-right py-1">المنتج</th>
                      <th className="text-center py-1">الكمية</th>
                      <th className={`py-1 ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                        السعر
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="text-right py-1">
                          {item.product.name}
                          {item.colorName && <span className="text-xs text-gray-500"> - {item.colorName}</span>}
                          {item.sizeName && <span className="text-xs text-gray-500"> - {item.sizeName}</span>}
                        </td>
                        <td className="text-center py-1">{item.quantity}</td>
                        <td className={`py-1 ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                          {formatPriceWithSettings((item.variantPrice || item.wholesalePrice || item.product.price) * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // عرض في شكل قائمة
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="text-xs">{item.product.name}</span>
                        {item.colorName && <span className="text-xs text-gray-500"> - {item.colorName}</span>}
                        {item.sizeName && <span className="text-xs text-gray-500"> - {item.sizeName}</span>}
                        <span className="text-xs text-muted-foreground mx-1">×{item.quantity}</span>
                      </div>
                      <span className="text-xs font-mono">
                        {formatPriceWithSettings((item.variantPrice || item.wholesalePrice || item.product.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* الخدمات */}
          {services.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
                الخدمات
              </h3>
              <div className="space-y-2">
                {services.map((service, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex-1">
                      <span className="text-xs">{service.name}</span>
                      {service.public_tracking_code && (
                        <div className="text-xs text-gray-500">كود: {service.public_tracking_code}</div>
                      )}
                    </div>
                    <span className="text-xs font-mono">
                      {formatPriceWithSettings(service.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* المجموع */}
          <div className="mb-4 border-t border-dashed pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>المجموع الفرعي:</span>
              <span className="font-mono">{formatPriceWithSettings(subtotal)}</span>
            </div>
            
            {/* عرض التخفيض إذا كان موجوداً */}
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs mb-1">
                <span>الخصم ({discount}%):</span>
                <span className="font-mono text-red-600">- {formatPriceWithSettings(discountAmount)}</span>
              </div>
            )}
            
            {tax > 0 && (
              <div className="flex justify-between text-xs mb-1">
                <span>{settings?.tax_label || 'الضريبة'}:</span>
                <span className="font-mono">{formatPriceWithSettings(tax)}</span>
              </div>
            )}
            
            <div 
              className="flex justify-between text-sm font-bold border-t border-dashed pt-1"
              style={{ color: settings?.primary_color }}
            >
              <span>المجموع الكلي:</span>
              <span className="font-mono">{formatPriceWithSettings(total)}</span>
            </div>
            
            {/* معلومات الدفع الجزئي */}
            {isPartialPayment && (
              <div className="mt-2 border-t border-dashed pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>المبلغ المدفوع:</span>
                  <span className="font-mono text-green-600">{formatPriceWithSettings(amountPaid || 0)}</span>
                </div>
                
                {considerRemainingAsPartial ? (
                  <div className="flex justify-between text-xs mb-1">
                    <span>المبلغ المتبقي:</span>
                    <span className="font-mono text-amber-600">{formatPriceWithSettings(remainingAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs mb-1">
                    <span>تخفيض إضافي:</span>
                    <span className="font-mono text-blue-600">{formatPriceWithSettings(remainingAmount)}</span>
                  </div>
                )}
                
                <div className="text-xs text-center mt-1 py-1 bg-gray-100 rounded">
                  {considerRemainingAsPartial ? (
                    <span>⚠️ دفعة جزئية - المبلغ المتبقي للعميل: {customerName || 'غير محدد'}</span>
                  ) : (
                    <span>✅ تخفيض على العميل - الطلب مكتمل</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* طريقة الدفع */}
          {paymentMethod && (
            <div className="mb-4 text-xs">
              <span>طريقة الدفع: {paymentMethod}</span>
            </div>
          )}

          {/* تذييل الوصل */}
          <div className={`${settings ? getTextAlignment(settings.footer_style) : 'text-center'}`}>
            {/* نص التذييل */}
            {settings?.receipt_footer_text && (
              <p className="text-xs mb-3">
                {settings.receipt_footer_text}
              </p>
            )}

            {/* رمز QR */}
            {settings?.show_qr_code && (
              <div className="flex justify-center mb-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 border-2 border-dashed border-gray-400 flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500">QR Code</span>
                </div>
              </div>
            )}

            {/* معلومات إضافية */}
            {(settings?.business_license || settings?.tax_number) && (
              <div className="text-xs space-y-1 pt-2 border-t border-dashed">
                {settings.business_license && (
                  <p>س.ت: {settings.business_license}</p>
                )}
                {settings.tax_number && (
                  <p>ر.ض: {settings.tax_number}</p>
                )}
              </div>
            )}
          </div>

          {/* خط النهاية */}
          <div className="mt-4 pt-2 border-t-2 border-dashed text-center">
            <div className="text-xs text-gray-500">
              ═══════════════════
            </div>
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-2 mt-6">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
        
        {isLoading && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            جاري تحميل إعدادات الطباعة...
          </p>
        )}
      </div>
    </div>
  );
};

export default PrintReceipt;
