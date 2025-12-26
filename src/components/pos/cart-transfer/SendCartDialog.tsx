/**
 * SendCartDialog - نافذة إرسال السلة لجهاز آخر
 *
 * تعرض QR Code للسلة ليتم مسحه من الجهاز الآخر
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Monitor,
  Smartphone,
  Send,
  Package,
  X,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CartQRGenerator } from './CartQRGenerator';
import { p2pCartService, CartTransferData } from '@/services/P2PCartService';

interface SendCartDialogProps {
  open: boolean;
  onClose: () => void;
  cartItems: any[];
  customerId?: string;
  customerName?: string;
  notes?: string;
}

export function SendCartDialog({
  open,
  onClose,
  cartItems,
  customerId,
  customerName,
  notes,
}: SendCartDialogProps) {
  // تحضير بيانات السلة للنقل
  const cartData = useMemo(() => {
    return p2pCartService.prepareCartForTransfer(
      cartItems,
      customerId,
      customerName,
      notes
    );
  }, [cartItems, customerId, customerName, notes]);

  // حساب الإجمالي (مع مراعاة نوع البيع)
  const total = useMemo(() => {
    return cartData.items.reduce((sum, item) => {
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
  }, [cartData.items]);

  // هل السلة فارغة؟
  const isEmpty = cartItems.length === 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <span>إرسال السلة</span>
          </DialogTitle>
          <DialogDescription>
            امسح هذا الكود من الحاسوب لاستلام السلة
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          // السلة فارغة
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-medium text-lg">السلة فارغة</h3>
              <p className="text-sm text-muted-foreground mt-1">
                أضف منتجات للسلة أولاً
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* رسم توضيحي */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">هاتفك</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/50 to-primary/20" />
                <Send className="h-4 w-4 text-primary mx-2" />
                <div className="h-0.5 flex-1 bg-gradient-to-l from-primary/50 to-primary/20" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">الحاسوب</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <CartQRGenerator
                cart={cartData}
                size={180}
                showShareButton={true}
              />
            </div>

            <Separator />

            {/* ملخص السلة */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">محتوى السلة:</h4>
              <ScrollArea className="h-[150px] rounded-lg border p-2">
                <div className="space-y-2">
                  {cartData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded">
                          {item.sellingUnit === 'weight' ? `${item.weight || item.quantity} كغ` :
                           item.sellingUnit === 'box' ? `${item.boxCount || item.quantity} كرتون` :
                           item.sellingUnit === 'meter' ? `${item.length || item.quantity} م` :
                           `${item.quantity}x`}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{item.productName}</span>
                          {(item.colorName || item.sizeName) && (
                            <span className="text-xs text-muted-foreground">
                              {[item.colorName, item.sizeName].filter(Boolean).join(' • ')}
                            </span>
                          )}
                          {item.batchNumber && (
                            <span className="text-xs text-indigo-600">دفعة: {item.batchNumber}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold whitespace-nowrap mr-2 text-primary">
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

              {/* الإجمالي */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">الإجمالي:</span>
                <span className="font-bold text-lg text-primary">
                  {total.toFixed(0)} د.ج
                </span>
              </div>
            </div>

            {/* زر الإغلاق */}
            <Button variant="outline" onClick={onClose} className="w-full">
              <X className="h-4 w-4 ml-2" />
              إغلاق
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SendCartDialog;
