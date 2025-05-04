import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ShoppingBag, Receipt, Wrench, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Product, Service } from '@/types';
import { formatPrice } from '@/lib/utils';

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
}

interface PrintReceiptProps {
  cartItems: CartItem[];
  selectedServices: (Service & { 
    scheduledDate?: Date; 
    notes?: string;
    service_booking_id?: string;
    public_tracking_code?: string;
  })[];
  discount: number;
  total: number;
  subtotal: number;
  customerName?: string;
  orderDate: Date;
  orderNumber: string;
  onPrintCompleted?: () => void;
  paidAmount?: number;
  remainingAmount?: number;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({
  cartItems,
  selectedServices,
  discount,
  total,
  subtotal,
  customerName = 'زبون',
  orderDate,
  orderNumber,
  onPrintCompleted,
  paidAmount,
  remainingAmount,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // حساب موعد الانتهاء المتوقع
  const calculateEstimatedDeliveryDate = (): string => {
    if (selectedServices.length === 0) return '';
    
    // التحقق من وجود موعد خدمة محدد
    const scheduledService = selectedServices.find(service => service.scheduledDate);
    
    // إذا كان هناك موعد محدد للخدمة، استخدمه كتاريخ التسليم المتوقع
    if (scheduledService && scheduledService.scheduledDate) {
      return `${formatDate(scheduledService.scheduledDate)} ${formatTime(scheduledService.scheduledDate)}`;
    }
    
    // إذا لم يكن هناك موعد محدد، استخدم حساب الوقت التقريبي
    const totalHours = selectedServices.reduce((total, service) => {
      const estimatedTime = service.estimatedTime || '';
      // استخراج الساعات من نص مثل "ساعتين" أو "3 ساعات"
      const hourMatch = estimatedTime.match(/(\d+)\s*(?:ساعة|ساعات|ساعتين)/i);
      // استخراج الدقائق من نص مثل "30 دقيقة" أو "45 دقيقة"
      const minuteMatch = estimatedTime.match(/(\d+)\s*(?:دقيقة|دقائق)/i);
      
      let hours = 0;
      if (hourMatch) {
        hours += parseInt(hourMatch[1], 10);
      } else if (estimatedTime.includes('ساعتين')) {
        hours += 2;
      } else if (estimatedTime.includes('ساعة')) {
        hours += 1;
      }
      
      if (minuteMatch) {
        hours += parseInt(minuteMatch[1], 10) / 60;
      }
      
      return total + hours;
    }, 0);
    
    // حساب موعد الانتهاء المتوقع
    const estimatedDelivery = new Date(orderDate.getTime());
    estimatedDelivery.setHours(estimatedDelivery.getHours() + Math.ceil(totalHours));
    
    return `${formatDate(estimatedDelivery)} ${formatTime(estimatedDelivery)}`;
  };

  // استخراج كود التتبع للخدمة - نسخة مبسطة تماماً
  const getTrackingCode = (service: Service & { 
    scheduledDate?: Date; 
    notes?: string;
    service_booking_id?: string;
    public_tracking_code?: string; 
  }): string => {
    // استخدام كود التتبع العام من قاعدة البيانات
    if (service.public_tracking_code) {
      console.log("استخدام كود التتبع العام:", service.public_tracking_code);
      return service.public_tracking_code;
    }
    
    // احتياطياً: استخدام رقم الطلب
    console.log("استخدام رقم الطلب:", orderNumber);
    return orderNumber;
  };

  // الحصول على كود التتبع للوصل بالكامل
  const receiptTrackingCode = selectedServices.length > 0 ? getTrackingCode(selectedServices[0]) : orderNumber;
  console.log("رمز التتبع النهائي للوصل:", receiptTrackingCode);

  // توليد رابط QR Code للملصق
  useEffect(() => {
    const qrData = `TRACKING:${receiptTrackingCode}\nDATE:${orderDate.toISOString()}\nAMOUNT:${total}\nCUSTOMER:${customerName}`;
    const encodedData = encodeURIComponent(qrData);
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedData}`);
  }, [receiptTrackingCode, orderDate, total, customerName]);

  // تنسيق التاريخ بالميلادي مع الأرقام العربية 1-2-3
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // تنسيق الوقت بالأرقام العربية
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // دالة معالجة السعر
  const displayPrice = (price: number | string): string => {
    // التعامل مع القيم الفارغة أو الصفرية
    if (price === null || price === undefined || price === '') {
      // إذا كان هناك منتجات في السلة، نحسب متوسط السعر من الإجمالي
      if (cartItems.length > 0 && subtotal > 0) {
        return formatPrice(subtotal / cartItems.length);
      }
      return formatPrice(0);
    }
    
    // ١. إذا كان رقمًا مباشرًا
    if (typeof price === 'number') {
      // التحقق من أن السعر ليس صفراً رغم وجود سعر إجمالي
      if (price === 0 && subtotal > 0 && cartItems.length > 0) {
        return formatPrice(subtotal / cartItems.length);
      }
      return formatPrice(price);
    }
    
    // ٢. إذا كان نصًا، حاول تحويله
    if (typeof price === 'string') {
      const numPrice = parseFloat(price.replace(/[^\d.-]/g, ''));
      if (!isNaN(numPrice)) {
        // التحقق من أن السعر ليس صفراً رغم وجود سعر إجمالي
        if (numPrice === 0 && subtotal > 0 && cartItems.length > 0) {
          return formatPrice(subtotal / cartItems.length);
        }
        return formatPrice(numPrice);
      }
    }
    
    // ٣. الحالة الافتراضية: استخدام متوسط السعر أو صفر
    if (subtotal > 0 && cartItems.length > 0) {
      return formatPrice(subtotal / cartItems.length);
    }
    
    return formatPrice(0);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    // استخدام نافذة جديدة للطباعة فقط
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      // تحسين أنماط الطباعة لتتناسب مع طابعة الملصقات
      const printStyles = `
        <style>
          @media print {
            @page {
              size: 58mm auto; /* عرض الورق في معظم طابعات الملصقات الحرارية */
              margin: 0;
            }
            body {
              margin: 0;
              padding: 3mm 2mm;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 10px;
              line-height: 1.2;
              direction: rtl;
              width: 54mm;
              background-color: white;
              color: black;
            }
            
            /* تصميم الرأس */
            .print-header {
              text-align: center;
              margin-bottom: 4mm;
              background-color: #f0f0f0;
              padding: 2mm;
              border-radius: 3mm;
              box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.1);
            }
            .print-logo {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 2mm;
              padding-bottom: 1mm;
              border-bottom: 1px solid #000;
              color: #222;
            }
            .print-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 1.5mm;
              color: #333;
            }
            .print-info {
              font-size: 9px;
              margin-bottom: 1mm;
              color: #555;
              display: flex;
              justify-content: space-between;
            }
            
            /* الفواصل والخطوط */
            .print-line {
              border-top: 1px dashed #000;
              margin: 2.5mm 0;
              width: 100%;
            }
            
            .print-line-solid {
              border-top: 1px solid #888;
              margin: 3mm 0;
              width: 100%;
            }
            
            /* تصميم جدول المنتجات */
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              margin: 2mm 0;
            }
            .print-table th, .print-table td {
              text-align: right;
              padding: 1.5mm 1mm;
              border-bottom: 1px dotted #ddd;
            }
            .print-table th {
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 1.5mm;
              color: #333;
              background-color: #f8f8f8;
            }
            .print-table td:last-child {
              text-align: left;
              font-weight: bold;
            }
            
            /* مجموع المبالغ */
            .print-totals {
              margin-top: 3mm;
              width: 100%;
              background-color: #f8f8f8;
              border-radius: 2mm;
              padding: 2.5mm;
              box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.05);
            }
            .print-total-line {
              display: flex;
              justify-content: space-between;
              margin: 1mm 0;
              width: 100%;
              padding: 0.5mm 0;
            }
            .print-total-line-main {
              display: flex;
              justify-content: space-between;
              margin: 1.5mm 0 0 0;
              width: 100%;
              font-weight: bold;
              font-size: 13px;
              padding: 1.5mm 0 0 0;
              border-top: 1px solid #ccc;
              color: #000;
            }
            
            /* تذييل الملصق */
            .print-footer {
              text-align: center;
              margin-top: 4mm;
              font-size: 8px;
              padding: 2mm;
              border-top: 1px dashed #999;
              color: #555;
              background-color: #f9f9f9;
              border-radius: 0 0 2mm 2mm;
            }
            
            /* تصميم مربع الخدمة */
            .print-service-details {
              border: 1px solid #999;
              padding: 3mm;
              margin: 3mm 0;
              border-radius: 2mm;
              background-color: #fff;
              box-shadow: 0 0.5mm 1.5mm rgba(0,0,0,0.08);
            }
            
            .print-service-title {
              font-weight: bold;
              text-align: center;
              border-bottom: 1px dashed #999;
              padding-bottom: 2mm;
              margin-bottom: 2.5mm;
              font-size: 12px;
              color: #333;
            }
            
            .print-service-name {
              font-weight: bold;
              font-size: 13px;
              text-align: center;
              margin-bottom: 2.5mm;
              padding-bottom: 1.5mm;
              border-bottom: 1px solid #eee;
              color: #000;
            }
            
            .print-service-box {
              display: flex;
              justify-content: space-between;
              margin: 1.5mm 0;
              padding: 0.5mm 0;
            }
            
            .print-service-label {
              font-weight: bold;
              font-size: 9px;
              color: #555;
            }
            
            .print-service-value {
              font-size: 9px;
              font-weight: bold;
              color: #000;
            }
            
            .print-service-notes {
              font-size: 8px;
              margin-top: 2mm;
              padding: 1.5mm;
              border-top: 1px dotted #ccc;
              background-color: #f9f9f9;
              border-radius: 1mm;
            }
            
            /* تصميم QR code */
            .print-qrcode {
              display: block;
              width: 25mm;
              height: 25mm;
              margin: 0 auto 3mm auto;
              padding: 1mm;
              border: 1px solid #ddd;
              background-color: white;
              box-shadow: 0 1mm 2mm rgba(0,0,0,0.05);
            }
            
            .print-qr-title {
              text-align: center;
              font-size: 8px;
              margin-bottom: 1mm;
              color: #666;
            }
            
            /* رمز المتابعة */
            .print-barcode-container {
              text-align: center;
              margin: 3mm 0;
              padding: 2mm;
              background-color: #f0f0f0;
              border-radius: 2mm;
            }
            
            .print-barcode-placeholder {
              height: 8mm;
              margin: 1mm 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              color: #333;
            }
            
            .print-barcode-id {
              font-weight: bold;
              letter-spacing: 1px;
              margin-top: 1mm;
              font-size: 12px;
              font-family: monospace;
            }
            
            /* تصميم مربع التسليم */
            .print-delivery-box {
              background-color: #fff;
              border: 1px solid #ddd;
              border-radius: 1.5mm;
              padding: 2mm;
              margin: 2mm 0;
              box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.05);
            }
            
            .print-delivery-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 1mm 0;
              border-bottom: 1px dotted #eee;
            }
            
            .print-delivery-row:last-child {
              border-bottom: none;
            }
            
            .print-delivery-label {
              font-size: 8px;
              font-weight: bold;
              color: #555;
            }
            
            .print-delivery-value {
              font-size: 8px;
              font-weight: normal;
            }
            
            .print-tracking-note {
              background-color: #f9f9f9;
              border-radius: 1mm;
              padding: 1.5mm;
              margin-top: 1.5mm;
              font-size: 7px;
              text-align: center;
              border: 1px dotted #ddd;
            }
            
            /* أنماط إضافية جديدة */
            .print-contact {
              display: flex;
              justify-content: center;
              gap: 5mm;
              margin-top: 1mm;
              font-size: 7px;
              color: #777;
            }
            
            .print-thanks {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 1mm;
              color: #333;
            }
            
            .print-number {
              font-family: 'Courier New', monospace;
            }
            
            .print-date-row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin-top: 2mm;
            }
            
            .print-highlight {
              background-color: #f5f5f5;
              padding: 1mm;
              border-radius: 1mm;
              margin: 1mm 0;
            }
            
            .print-status {
              text-align: center;
              font-weight: bold;
              font-size: 12px;
              padding: 1.5mm;
              margin: 2mm auto;
              background-color: #f0f0f0;
              border: 1px solid #ddd;
              border-radius: 1.5mm;
              width: 90%;
            }
          }
        </style>
      `;

      const printContents = content.innerHTML;
      
      printWindow.document.write('<html><head><title>طباعة الإيصال</title>');
      printWindow.document.write(printStyles);
      printWindow.document.write('</head><body>');
      printWindow.document.write(printContents);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      // تأخير صغير للتأكد من تحميل المحتوى
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        
        // استدعاء دالة الإكمال إذا كانت متوفرة
        if (onPrintCompleted) {
          onPrintCompleted();
        }
      }, 500);
    } else {
      // إذا فشل فتح النافذة، استخدم iframe بدلاً من تعديل DOM مباشرة
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // تعريف المتغيرات المطلوبة
      const printContents = content.innerHTML;
      const printStyles = `
        <style>
          @media print {
            @page {
              size: 58mm auto; /* عرض الورق في معظم طابعات الملصقات الحرارية */
              margin: 0;
            }
            body {
              margin: 0;
              padding: 3mm 2mm;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 10px;
              line-height: 1.2;
              direction: rtl;
              width: 54mm;
              background-color: white;
              color: black;
            }
            
            /* تصميم الرأس */
            .print-header {
              text-align: center;
              margin-bottom: 4mm;
              background-color: #f0f0f0;
              padding: 2mm;
              border-radius: 3mm;
              box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.1);
            }
            .print-logo {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 2mm;
              padding-bottom: 1mm;
              border-bottom: 1px solid #000;
              color: #222;
            }
            .print-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 1.5mm;
              color: #333;
            }
            .print-info {
              font-size: 9px;
              margin-bottom: 1mm;
              color: #555;
              display: flex;
              justify-content: space-between;
            }
            
            /* الفواصل والخطوط */
            .print-line {
              border-top: 1px dashed #000;
              margin: 2.5mm 0;
              width: 100%;
            }
            
            .print-line-solid {
              border-top: 1px solid #888;
              margin: 3mm 0;
              width: 100%;
            }
            
            /* تصميم جدول المنتجات */
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              margin: 2mm 0;
            }
            .print-table th, .print-table td {
              text-align: right;
              padding: 1.5mm 1mm;
              border-bottom: 1px dotted #ddd;
            }
            .print-table th {
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 1.5mm;
              color: #333;
              background-color: #f8f8f8;
            }
            .print-table td:last-child {
              text-align: left;
              font-weight: bold;
            }
            
            /* مجموع المبالغ */
            .print-totals {
              margin-top: 3mm;
              width: 100%;
              background-color: #f8f8f8;
              border-radius: 2mm;
              padding: 2.5mm;
              box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.05);
            }
            .print-total-line {
              display: flex;
              justify-content: space-between;
              margin: 1mm 0;
              width: 100%;
              padding: 0.5mm 0;
            }
            .print-total-line-main {
              display: flex;
              justify-content: space-between;
              margin: 1.5mm 0 0 0;
              width: 100%;
              font-weight: bold;
              font-size: 13px;
              padding: 1.5mm 0 0 0;
              border-top: 1px solid #ccc;
              color: #000;
            }
            
            /* تذييل الملصق */
            .print-footer {
              text-align: center;
              margin-top: 4mm;
              font-size: 8px;
              padding: 2mm;
              border-top: 1px dashed #999;
              color: #555;
              background-color: #f9f9f9;
              border-radius: 0 0 2mm 2mm;
            }
            
            /* تصميم مربع الخدمة */
            .print-service-details {
              border: 1px solid #999;
              padding: 3mm;
              margin: 3mm 0;
              border-radius: 2mm;
              background-color: #fff;
              box-shadow: 0 0.5mm 1.5mm rgba(0,0,0,0.08);
            }
            
            .print-service-title {
              font-weight: bold;
              text-align: center;
              border-bottom: 1px dashed #999;
              padding-bottom: 2mm;
              margin-bottom: 2.5mm;
              font-size: 12px;
              color: #333;
            }
            
            .print-service-name {
              font-weight: bold;
              font-size: 13px;
              text-align: center;
              margin-bottom: 2.5mm;
              padding-bottom: 1.5mm;
              border-bottom: 1px solid #eee;
              color: #000;
            }
            
            .print-service-box {
              display: flex;
              justify-content: space-between;
              margin: 1.5mm 0;
              padding: 0.5mm 0;
            }
            
            .print-service-label {
              font-weight: bold;
              font-size: 9px;
              color: #555;
            }
            
            .print-service-value {
              font-size: 9px;
              font-weight: bold;
              color: #000;
            }
            
            .print-service-notes {
              font-size: 8px;
              margin-top: 2mm;
              padding: 1.5mm;
              border-top: 1px dotted #ccc;
              background-color: #f9f9f9;
              border-radius: 1mm;
            }
            
            /* تصميم QR code */
            .print-qrcode {
              display: block;
              width: 25mm;
              height: 25mm;
              margin: 0 auto 3mm auto;
              padding: 1mm;
              border: 1px solid #ddd;
              background-color: white;
              box-shadow: 0 1mm 2mm rgba(0,0,0,0.05);
            }
            
            .print-qr-title {
              text-align: center;
              font-size: 8px;
              margin-bottom: 1mm;
              color: #666;
            }
            
            /* رمز المتابعة */
            .print-barcode-container {
              text-align: center;
              margin: 3mm 0;
              padding: 2mm;
              background-color: #f0f0f0;
              border-radius: 2mm;
            }
            
            .print-barcode-placeholder {
              height: 8mm;
              margin: 1mm 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              color: #333;
            }
            
            .print-barcode-id {
              font-weight: bold;
              letter-spacing: 1px;
              margin-top: 1mm;
              font-size: 12px;
              font-family: monospace;
            }
            
            /* تصميم مربع التسليم */
            .print-delivery-box {
              background-color: #fff;
              border: 1px solid #ddd;
              border-radius: 1.5mm;
              padding: 2mm;
              margin: 2mm 0;
              box-shadow: 0 0.5mm 1mm rgba(0,0,0,0.05);
            }
            
            .print-delivery-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 1mm 0;
              border-bottom: 1px dotted #eee;
            }
            
            .print-delivery-row:last-child {
              border-bottom: none;
            }
            
            .print-delivery-label {
              font-size: 8px;
              font-weight: bold;
              color: #555;
            }
            
            .print-delivery-value {
              font-size: 8px;
              font-weight: normal;
            }
            
            .print-tracking-note {
              background-color: #f9f9f9;
              border-radius: 1mm;
              padding: 1.5mm;
              margin-top: 1.5mm;
              font-size: 7px;
              text-align: center;
              border: 1px dotted #ddd;
            }
            
            /* أنماط إضافية جديدة */
            .print-contact {
              display: flex;
              justify-content: center;
              gap: 5mm;
              margin-top: 1mm;
              font-size: 7px;
              color: #777;
            }
            
            .print-thanks {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 1mm;
              color: #333;
            }
            
            .print-number {
              font-family: 'Courier New', monospace;
            }
            
            .print-date-row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin-top: 2mm;
            }
            
            .print-highlight {
              background-color: #f5f5f5;
              padding: 1mm;
              border-radius: 1mm;
              margin: 1mm 0;
            }
            
            .print-status {
              text-align: center;
              font-weight: bold;
              font-size: 12px;
              padding: 1.5mm;
              margin: 2mm auto;
              background-color: #f0f0f0;
              border: 1px solid #ddd;
              border-radius: 1.5mm;
              width: 90%;
            }
          }
        </style>
      `;
      
      const printDocument = iframe.contentWindow?.document;
      if (printDocument) {
        printDocument.write('<html><head><title>طباعة الإيصال</title>');
        printDocument.write(printStyles);
        printDocument.write('</head><body>');
        printDocument.write(printContents);
        printDocument.write('</body></html>');
        printDocument.close();
        
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
          
          // استدعاء دالة الإكمال إذا كانت متوفرة
          if (onPrintCompleted) {
            onPrintCompleted();
          }
        }, 500);
      } else {
        // إذا فشل كل شيء، أظهر رسالة للمستخدم
        alert('لم نتمكن من فتح نافذة الطباعة. يرجى التحقق من إعدادات المتصفح.');
        
        // استدعاء دالة الإكمال رغم الفشل
        if (onPrintCompleted) {
          onPrintCompleted();
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* محتوى الطباعة المخفي */}
      <div className="hidden">
        <div ref={printRef} className="p-2">
          <div className="print-header">
            <div className="print-logo">stockiha</div>
            <div className="print-title">إيصال خدمة / ملصق</div>
            <div className="print-info">
              <span>{selectedServices.length > 0 ? 'كود التتبع:' : 'رقم الطلب:'}</span>
              <span className="print-number">{receiptTrackingCode}</span>
            </div>
            <div className="print-date-row">
              <span>{formatDate(orderDate)}</span>
              <span>{formatTime(orderDate)}</span>
            </div>
            <div className="print-info">
              <span>العميل:</span>
              <span>{customerName}</span>
            </div>
          </div>
          
          <div className="print-title-section">
            <h2 className="print-title">فاتورة مبيعات</h2>
            <div className="print-status">
              {remainingAmount && remainingAmount > 0 ? "دين" : "مكتمل"}
            </div>
          </div>
          
          {selectedServices.length > 0 && (
            <>
              {selectedServices.map((service, i) => (
                <div key={i} className="print-service-details">
                  <div className="print-service-title">معلومات الخدمة</div>
                  <div className="print-service-name">{service.name}</div>
                  
                  <div className="print-service-box" style={{ marginTop: '2mm', marginBottom: '2mm' }}>
                    <span className="print-service-label">كود التتبع:</span>
                    <span className="print-service-value print-number" style={{ fontWeight: 'bold', fontSize: '110%' }}>
                      {i === 0 ? receiptTrackingCode : getTrackingCode(service)}
                    </span>
                  </div>
                  
                  <div className="print-service-box" style={{ marginTop: '1mm', marginBottom: '2mm' }}>
                    <span className="print-service-label">المعرف الأصلي:</span>
                    <span className="print-service-value print-number" dir="ltr">
                      {service.service_booking_id || service.id}
                    </span>
                  </div>
                  
                  <div className="print-service-box">
                    <span className="print-service-label">السعر:</span>
                    <span className="print-service-value print-number">{displayPrice(service.price)}</span>
                  </div>
                  
                  {service.scheduledDate && (
                    <div className="print-service-box">
                      <span className="print-service-label">موعد الخدمة:</span>
                      <span className="print-service-value print-number">
                        {formatDate(service.scheduledDate)} {formatTime(service.scheduledDate)}
                      </span>
                    </div>
                  )}
                  
                  {service.notes && (
                    <div className="print-service-notes">
                      <span style={{ fontWeight: 'bold' }}>ملاحظات:</span> {service.notes}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          
          {/* QR Code للملصق */}
          {qrCodeUrl && selectedServices.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '3mm' }}>
              <div className="print-qr-title">امسح الرمز لمتابعة الطلب</div>
              <img src={qrCodeUrl} alt="QR Code" className="print-qrcode" />
            </div>
          )}
          
          {cartItems.length > 0 && (
            <div style={{ marginTop: '3mm' }}>
              <div className="print-service-title">المنتجات المرفقة</div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>العدد</th>
                    <th>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <div className="font-bold" style={{ fontSize: '10px', marginBottom: '1mm' }}>
                          {item.product.name}
                          {item.isWholesale && <span style={{ color: '#059669', fontSize: '8px', marginRight: '2mm' }}>(سعر الجملة)</span>}
                        </div>
                        {(item.colorId || item.sizeId) && (
                          <div style={{ 
                            fontSize: '8px', 
                            marginTop: '1mm', 
                            padding: '1mm', 
                            backgroundColor: '#f9f9f9', 
                            borderRadius: '1mm',
                            border: '0.15mm solid #eee'
                          }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2mm' }}>
                              {item.colorId && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1mm' }}>
                                  <span style={{ fontWeight: 'bold' }}>اللون:</span> 
                                  <span style={{ display: 'flex', alignItems: 'center' }}>
                                    {item.colorCode && (
                                      <span 
                                        style={{ 
                                          width: '3mm', 
                                          height: '3mm', 
                                          backgroundColor: item.colorCode,
                                          borderRadius: '50%',
                                          display: 'inline-block',
                                          marginLeft: '1mm',
                                          marginRight: '1mm',
                                          border: '0.2mm solid #ccc'
                                        }} 
                                      />
                                    )}
                                    <span style={{ fontWeight: '500' }}>{item.colorName}</span>
                                  </span>
                                </div>
                              )}
                              {item.sizeId && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1mm' }}>
                                  <span style={{ fontWeight: 'bold' }}>المقاس:</span> 
                                  <span style={{ fontWeight: '500' }}>{item.sizeName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="print-number">{item.quantity}</td>
                      <td className="print-number">
                        {displayPrice((item.wholesalePrice !== null && item.wholesalePrice !== undefined && item.wholesalePrice > 0) ? 
                          item.wholesalePrice * item.quantity : 
                          (item.product.price && item.product.price > 0) ? 
                            item.product.price * item.quantity : 
                            subtotal / cartItems.length)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="print-line"></div>
          
          <div className="print-totals">
            <div className="print-total-line">
              <span>المجموع:</span>
              <span className="print-number">{displayPrice(subtotal)}</span>
            </div>
            
            {discount > 0 && (
              <div className="print-total-line">
                <span>الخصم:</span>
                <span className="print-number">- {displayPrice(discount)}</span>
              </div>
            )}
            
            <div className="print-total-line-main">
              <span>الإجمالي:</span>
              <span className="print-number">{displayPrice(total)}</span>
            </div>
            
            {paidAmount !== undefined && (
              <>
                <div className="print-total-line">
                  <span>المبلغ المدفوع:</span>
                  <span className="print-number">{displayPrice(paidAmount)}</span>
                </div>
                {remainingAmount && remainingAmount > 0 && (
                  <div className="print-total-line" style={{ color: '#e53e3e', fontWeight: 'bold' }}>
                    <span>المبلغ المتبقي:</span>
                    <span className="print-number">{displayPrice(remainingAmount)}</span>
                  </div>
                )}
              </>
            )}
            
            {remainingAmount && remainingAmount > 0 && (
              <div className="print-status-label" style={{ 
                textAlign: 'center', 
                margin: '2mm 0', 
                padding: '1mm', 
                backgroundColor: '#fee2e2', 
                color: '#e53e3e', 
                borderRadius: '2mm',
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                دين - متبقي {displayPrice(remainingAmount)}
              </div>
            )}
            
            {(!remainingAmount || remainingAmount <= 0) && (
              <div className="print-status-label" style={{ 
                textAlign: 'center', 
                margin: '2mm 0', 
                padding: '1mm', 
                backgroundColor: '#dcfce7', 
                color: '#16a34a', 
                borderRadius: '2mm',
                fontWeight: 'bold'
              }}>
                مكتمل - تم الدفع بالكامل
              </div>
            )}
          </div>
          
          {/* عرض رمز التتبع فقط عندما تكون هناك خدمات */}
          {selectedServices.length > 0 && (
            <div className="print-barcode-container">
              <div className="print-service-title">تفاصيل التسليم</div>
              
              <div className="print-barcode-placeholder">
                <span>رمز التتبع</span>
                <span className="print-barcode-id print-number">
                  {receiptTrackingCode}
                </span>
              </div>
              
              <div className="print-delivery-box">
                <div className="print-delivery-row">
                  <span className="print-delivery-label">تاريخ الاستلام:</span>
                  <span className="print-delivery-value print-number">{formatDate(orderDate)} {formatTime(orderDate)}</span>
                </div>
                
                {selectedServices.find(s => s.scheduledDate) ? (
                  <div className="print-delivery-row">
                    <span className="print-delivery-label">موعد الخدمة/التسليم:</span>
                    <span className="print-delivery-value print-number font-bold">
                      {calculateEstimatedDeliveryDate()}
                    </span>
                  </div>
                ) : (
                  <div className="print-delivery-row">
                    <span className="print-delivery-label">موعد التسليم المتوقع:</span>
                    <span className="print-delivery-value print-number font-bold">{calculateEstimatedDeliveryDate()}</span>
                  </div>
                )}
              </div>
              
              <div className="print-tracking-note">
                {selectedServices.find(s => s.scheduledDate) 
                  ? "موعد الخدمة هو نفسه موعد التسليم المتوقع. لمتابعة الحالة، امسح رمز QR" 
                  : "لمتابعة حالة خدمتك، امسح رمز QR أعلاه أو استخدم رمز التتبع عبر موقعنا"}
              </div>
            </div>
          )}
          
          <div className="print-footer">
            <div className="print-thanks">نشكركم على تعاملكم معنا</div>
            <div>Stockiha - stockiha</div>
            <div className="print-contact">
              <span>هاتف: 123456789</span>
              <span>www.stockiha.com</span>
            </div>
            <div>{new Date().getFullYear()} © جميع الحقوق محفوظة</div>
          </div>
        </div>
      </div>
      
      {/* معاينة الوصل */}
      <Card className="relative mb-4 overflow-hidden">
        <CardContent className="p-4">
          {/* ... existing content ... */}
        </CardContent>
      </Card>
      
      {/* أزرار الطباعة */}
      <div className="flex justify-between gap-2">
        <Button 
          className="flex-1 gap-2" 
          variant="outline" 
          onClick={handlePrint}>
          <Printer className="w-4 h-4" />
          طباعة الوصل
        </Button>
        
        <Button 
          className="flex-1 gap-2" 
          variant="default"
          onClick={() => {
            // استدعاء دالة الإكمال إذا كانت متوفرة
            if (onPrintCompleted) {
              onPrintCompleted();
            }
          }}>
          <Receipt className="w-4 h-4" />
          إنهاء
        </Button>
      </div>
    </div>
  );
};

export default PrintReceipt; 