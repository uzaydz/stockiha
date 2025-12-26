/**
 * CartQRGenerator - مكون عرض QR Code للسلة
 *
 * يعرض QR Code يحتوي على بيانات السلة المضغوطة
 * يمكن للجهاز الآخر مسحه لاستلام السلة
 */

import React, { useMemo, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { Copy, Check, RefreshCw, Smartphone, Monitor, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { p2pCartService, CartTransferData } from '@/services/P2PCartService';
import { toast } from 'sonner';

interface CartQRGeneratorProps {
  cart: CartTransferData;
  size?: number;
  className?: string;
  showCopyButton?: boolean;
  showShareButton?: boolean;
  onShare?: () => void;
}

export function CartQRGenerator({
  cart,
  size = 200,
  className,
  showCopyButton = true,
  showShareButton = true,
  onShare,
}: CartQRGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // إنشاء كود QR المضغوط
  const qrData = useMemo(() => {
    return p2pCartService.encodeCartForQR(cart);
  }, [cart]);

  // حجم البيانات
  const dataSize = useMemo(() => {
    return qrData.length;
  }, [qrData]);

  // هل البيانات كبيرة جداً؟
  const isDataTooLarge = dataSize > 2500;

  // نسخ الكود
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      toast.success('تم نسخ الكود');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('فشل نسخ الكود');
    }
  };

  // مشاركة عبر Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'سلة المشتريات',
          text: `سلة تحتوي على ${cart.items.length} منتج`,
          url: qrData,
        });
        onShare?.();
      } catch (error) {
        // المستخدم ألغى المشاركة
      }
    } else {
      handleCopy();
    }
  };

  // حساب الإجمالي (مع مراعاة نوع البيع)
  const total = useMemo(() => {
    return cart.items.reduce((sum, item) => {
      // حساب الكمية حسب نوع البيع
      let qty = item.quantity || 1;
      if (item.sellingUnit === 'weight' && item.weight) {
        qty = item.weight;
      } else if (item.sellingUnit === 'box' && item.boxCount) {
        qty = item.boxCount;
      } else if (item.sellingUnit === 'meter' && item.length) {
        qty = item.length;
      }
      return sum + item.price * qty;
    }, 0);
  }, [cart.items]);

  if (isDataTooLarge) {
    return (
      <div className={cn('flex flex-col items-center gap-4 p-4', className)}>
        <div className="flex items-center justify-center w-48 h-48 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-dashed border-yellow-300 dark:border-yellow-700">
          <div className="text-center p-4">
            <RefreshCw className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              السلة كبيرة جداً
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              ({cart.items.length} منتج)
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-[200px]">
          يرجى تقليل عدد المنتجات أو استخدام الاتصال المباشر P2P
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* QR Code */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
        <div className="relative bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
          <QRCodeSVG
            value={qrData}
            size={size}
            level="M"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>

        {/* أيقونة الهاتف/الحاسوب */}
        <div className="absolute -top-2 -right-2 bg-primary text-white p-1.5 rounded-full shadow-lg">
          <Smartphone className="h-4 w-4" />
        </div>
      </div>

      {/* معلومات السلة */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">المنتجات:</span>
          <span className="font-semibold">{cart.items.length}</span>
          <span className="text-muted-foreground mx-1">|</span>
          <span className="text-muted-foreground">الإجمالي:</span>
          <span className="font-semibold text-primary">
            {total.toFixed(0)} د.ج
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          امسح هذا الكود من الجهاز الآخر
        </p>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex items-center gap-2">
        {showCopyButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span>تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>نسخ الكود</span>
              </>
            )}
          </Button>
        )}

        {showShareButton && navigator.share && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span>مشاركة</span>
          </Button>
        )}
      </div>

      {/* حجم البيانات */}
      <div className="text-xs text-muted-foreground">
        حجم البيانات: {(dataSize / 1024).toFixed(1)} KB
      </div>
    </div>
  );
}

export default CartQRGenerator;
