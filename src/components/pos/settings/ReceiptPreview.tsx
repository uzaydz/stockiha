import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Receipt, QrCode, Hash } from 'lucide-react';
import { POSSettings } from '@/types/posSettings';
import { QRCodeSVG } from 'qrcode.react';

interface ReceiptPreviewProps {
  settings: POSSettings | null;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ settings }) => {
  if (!settings) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>معاينة الوصل</p>
          <p className="text-xs">سيتم عرض المعاينة هنا</p>
        </div>
      </Card>
    );
  }

  // بيانات تجريبية للمعاينة
  const sampleOrder = {
    id: 'ORD-2024-001',
    tracking_code: 'TRK-123456',
    date: new Date().toLocaleDateString('ar-SA'),
    time: new Date().toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    employee: 'أحمد محمد',
    customer: 'عميل تجريبي',
    items: [
      { name: 'قهوة تركية', quantity: 2, price: 15.00 },
      { name: 'كرواسون', quantity: 1, price: 8.50 },
      { name: 'عصير برتقال', quantity: 1, price: 12.00 }
    ],
    subtotal: 35.50,
    tax: 5.33,
    total: 40.83
  };

  // تحديد موضع رمز العملة
  const formatPrice = (price: number) => {
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
          // يمكن إضافة CSS مخصص هنا
        };
      case 'classic':
      default:
        return baseStyles;
    }
  };

  return (
    <Card className="overflow-hidden">
      <div 
        className="p-4 text-sm"
        style={{
          width: `${settings.paper_width * 3}px`, // معاينة بمقياس 3:1
          ...getTemplateStyles(),
          margin: '0 auto',
          fontFamily: 'Tajawal, Arial, sans-serif'
        }}
      >
        {/* رأسية الوصل */}
        <div className={`mb-4 ${getTextAlignment(settings.header_style)}`}>
          {/* شعار المتجر */}
          {settings.show_store_logo && settings.store_logo_url && (
            <div className="mb-3 flex justify-center">
              <img 
                src={settings.store_logo_url} 
                alt="شعار المتجر" 
                className="w-12 h-12 object-contain"
              />
            </div>
          )}

          {/* معلومات المتجر */}
          {settings.show_store_info && (
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
          <p className="mb-2" style={{ color: settings.primary_color }}>
            {settings.welcome_message}
          </p>

          {/* نص الرأسية */}
          <p className="text-xs mb-2">
            {settings.receipt_header_text}
          </p>
        </div>

        {/* معلومات الطلب */}
        <div className="mb-4 border-t border-b border-dashed py-2">
          {/* التاريخ والوقت */}
          {settings.show_date_time && (
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                التاريخ:
              </span>
              <span>{sampleOrder.date} {sampleOrder.time}</span>
            </div>
          )}

          {/* رقم الطلب */}
          <div className="flex justify-between text-xs mb-1">
            <span>رقم الطلب:</span>
            <span className="font-mono">{sampleOrder.id}</span>
          </div>

          {/* كود التتبع */}
          {settings.show_tracking_code && (
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                كود التتبع:
              </span>
              <span className="font-mono">{sampleOrder.tracking_code}</span>
            </div>
          )}

          {/* اسم الموظف */}
          {settings.show_employee_name && (
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                الموظف:
              </span>
              <span>{sampleOrder.employee}</span>
            </div>
          )}

          {/* معلومات العميل */}
          {settings.show_customer_info && (
            <div className="flex justify-between text-xs">
              <span>العميل:</span>
              <span>{sampleOrder.customer}</span>
            </div>
          )}
        </div>

        {/* عناصر الطلب */}
        <div className="mb-4">
          <h3 className="font-bold text-xs mb-2 border-b border-dashed pb-1">
            تفاصيل الطلب
          </h3>
          
          {settings.item_display_style === 'table' ? (
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
                {sampleOrder.items.map((item) => (
                  <tr key={item.name}>
                    <td className="text-right py-1">{item.name}</td>
                    <td className="text-center py-1">{item.quantity}</td>
                    <td className={`py-1 ${settings.price_position === 'right' ? 'text-right' : 'text-left'}`}>
                      {formatPrice(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // عرض في شكل قائمة
            <div className="space-y-2">
              {sampleOrder.items.map((item) => (
                <div key={`list-${item.name}`} className="flex justify-between items-center">
                  <div className="flex-1">
                    <span className="text-xs">{item.name}</span>
                    <span className="text-xs text-muted-foreground mx-1">×{item.quantity}</span>
                  </div>
                  <span className="text-xs font-mono">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* المجموع */}
        <div className="mb-4 border-t border-dashed pt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>المجموع الفرعي:</span>
            <span className="font-mono">{formatPrice(sampleOrder.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span>{settings.tax_label}:</span>
            <span className="font-mono">{formatPrice(sampleOrder.tax)}</span>
          </div>
          <div 
            className="flex justify-between text-sm font-bold border-t border-dashed pt-1"
            style={{ color: settings.primary_color }}
          >
            <span>المجموع الكلي:</span>
            <span className="font-mono">{formatPrice(sampleOrder.total)}</span>
          </div>
        </div>

        {/* تذييل الوصل */}
        <div className={`${getTextAlignment(settings.footer_style)}`}>
          {/* نص التذييل */}
          <p className="text-xs mb-3">
            {settings.receipt_footer_text}
          </p>

          {/* رمز QR */}
          {settings.show_qr_code && settings.store_website && (
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 flex items-center justify-center">
                <QRCodeSVG 
                  value={settings.store_website}
                  size={44}
                  level="M"
                  includeMargin={false}
                  fgColor={settings?.text_color || '#000000'}
                  bgColor={settings?.background_color || '#ffffff'}
                />
              </div>
            </div>
          )}
          {/* عرض رمز QR فارغ إذا لم يكن هناك موقع */}
          {settings.show_qr_code && !settings.store_website && (
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 border-2 border-dashed border-border flex items-center justify-center">
                <QrCode className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* معلومات إضافية */}
          {(settings.business_license || settings.tax_number) && (
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

        {/* شريط في النهاية للإشارة لنهاية الوصل */}
        <div className="mt-4 pt-2 border-t-2 border-dashed text-center">
          <div className="text-xs text-muted-foreground">
            ═══════════════════
          </div>
        </div>
      </div>

      {/* معلومات المعاينة */}
      <div className="px-4 py-2 bg-muted/30 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>معاينة {settings.receipt_template}</span>
          <Badge variant="outline" className="text-xs">
            {settings.paper_width}مم
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default ReceiptPreview;
