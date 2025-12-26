/**
 * ReceiveCartDialog - نافذة استقبال السلة من جهاز آخر
 *
 * تستخدم الكاميرا لمسح QR Code من الهاتف
 * وتعرض السلة المستلمة للمراجعة قبل إضافتها
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Monitor,
  Smartphone,
  Download,
  Package,
  CheckCircle2,
  XCircle,
  Plus,
  Replace,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CartQRScanner } from './CartQRScanner';
import { CartTransferData, CartTransferItem } from '@/services/P2PCartService';
import { toast } from 'sonner';

interface ReceiveCartDialogProps {
  open: boolean;
  onClose: () => void;
  onCartReceived: (items: CartTransferItem[], mode: 'add' | 'replace') => void;
  currentCartItemsCount?: number;
}

type DialogStep = 'scan' | 'preview';

export function ReceiveCartDialog({
  open,
  onClose,
  onCartReceived,
  currentCartItemsCount = 0,
}: ReceiveCartDialogProps) {
  const [step, setStep] = useState<DialogStep>('scan');
  const [receivedCart, setReceivedCart] = useState<CartTransferData | null>(null);

  // معالجة استلام السلة
  const handleCartScanned = useCallback((cart: CartTransferData) => {
    setReceivedCart(cart);
    setStep('preview');
  }, []);

  // إضافة للسلة الحالية
  const handleAddToCart = useCallback(() => {
    if (receivedCart) {
      onCartReceived(receivedCart.items, 'add');
      toast.success(`تمت إضافة ${receivedCart.items.length} منتج للسلة`);
      handleClose();
    }
  }, [receivedCart, onCartReceived]);

  // استبدال السلة الحالية
  const handleReplaceCart = useCallback(() => {
    if (receivedCart) {
      onCartReceived(receivedCart.items, 'replace');
      toast.success(`تم استبدال السلة بـ ${receivedCart.items.length} منتج`);
      handleClose();
    }
  }, [receivedCart, onCartReceived]);

  // إغلاق وإعادة تعيين
  const handleClose = useCallback(() => {
    setStep('scan');
    setReceivedCart(null);
    onClose();
  }, [onClose]);

  // العودة للمسح
  const handleBackToScan = useCallback(() => {
    setStep('scan');
    setReceivedCart(null);
  }, []);

  // حساب الإجمالي (مع مراعاة نوع البيع)
  const total = receivedCart?.items.reduce((sum, item) => {
    let qty = item.quantity || 1;
    if (item.sellingUnit === 'weight' && item.weight) {
      qty = item.weight;
    } else if (item.sellingUnit === 'box' && item.boxCount) {
      qty = item.boxCount;
    } else if (item.sellingUnit === 'meter' && item.length) {
      qty = item.length;
    }
    return sum + item.price * qty;
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <span>استقبال سلة</span>
          </DialogTitle>
          <DialogDescription>
            {step === 'scan'
              ? 'امسح QR Code من الهاتف لاستلام السلة'
              : 'راجع السلة المستلمة قبل إضافتها'}
          </DialogDescription>
        </DialogHeader>

        {step === 'scan' ? (
          // خطوة المسح
          <div className="flex flex-col gap-4">
            {/* رسم توضيحي */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">الهاتف</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/20 to-primary/50" />
                <ArrowRight className="h-4 w-4 text-primary mx-2" />
                <div className="h-0.5 flex-1 bg-gradient-to-l from-green-500/50 to-primary/50" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">حاسوبك</span>
              </div>
            </div>

            {/* الماسح */}
            <CartQRScanner
              onCartScanned={handleCartScanned}
              onError={(error) => toast.error(error)}
              autoStart={open}
            />
          </div>
        ) : (
          // خطوة المعاينة
          <div className="flex flex-col gap-4">
            {/* شارة النجاح */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  تم استلام السلة بنجاح!
                </span>
              </div>
            </div>

            {/* معلومات السلة */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                <Package className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-2xl font-bold">{receivedCart?.items.length || 0}</span>
                <span className="text-xs text-muted-foreground">منتج</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-2xl font-bold text-primary">{total.toFixed(0)}</span>
                <span className="text-xs text-muted-foreground">د.ج</span>
              </div>
            </div>

            <Separator />

            {/* قائمة المنتجات */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">المنتجات المستلمة:</h4>
              <ScrollArea className="h-[200px] rounded-lg border p-2">
                <div className="space-y-2">
                  {receivedCart?.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary">
                          {item.sellingUnit === 'weight' ? `${item.weight || item.quantity} كغ` :
                           item.sellingUnit === 'box' ? `${item.boxCount || item.quantity} كرتون` :
                           item.sellingUnit === 'meter' ? `${item.length || item.quantity} م` :
                           `${item.quantity}x`}
                        </Badge>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">
                            {item.productName}
                          </span>
                          {/* عرض المتغيرات (اللون والمقاس) */}
                          {(item.colorName || item.sizeName) && (
                            <span className="text-xs text-muted-foreground">
                              {[item.colorName, item.sizeName].filter(Boolean).join(' • ')}
                            </span>
                          )}
                          {/* عرض رقم الدفعة */}
                          {item.batchNumber && (
                            <span className="text-xs text-indigo-600 dark:text-indigo-400">
                              دفعة: {item.batchNumber}
                            </span>
                          )}
                          {/* عرض نوع البيع */}
                          {item.saleType && item.saleType !== 'retail' && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              {item.saleType === 'wholesale' ? 'جملة' : 'نصف جملة'}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold whitespace-nowrap text-primary">
                        {(item.price * (
                          item.sellingUnit === 'weight' ? (item.weight || item.quantity) :
                          item.sellingUnit === 'box' ? (item.boxCount || item.quantity) :
                          item.sellingUnit === 'meter' ? (item.length || item.quantity) :
                          item.quantity
                        )).toFixed(0)} د.ج
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* ملاحظات */}
            {receivedCart?.notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>ملاحظات:</strong> {receivedCart.notes}
                </span>
              </div>
            )}

            {/* تحذير إذا كانت السلة الحالية تحتوي على منتجات */}
            {currentCartItemsCount > 0 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-orange-700 dark:text-orange-300">
                <strong>تنبيه:</strong> سلتك الحالية تحتوي على {currentCartItemsCount} منتج
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleBackToScan} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              <span>مسح سلة أخرى</span>
            </Button>

            <div className="flex gap-2 flex-1 justify-end">
              {currentCartItemsCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleReplaceCart}
                  className="gap-2"
                >
                  <Replace className="h-4 w-4" />
                  <span>استبدال</span>
                </Button>
              )}

              <Button onClick={handleAddToCart} className="gap-2">
                <Plus className="h-4 w-4" />
                <span>
                  {currentCartItemsCount > 0 ? 'إضافة للسلة' : 'إضافة'}
                </span>
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReceiveCartDialog;
