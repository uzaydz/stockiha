import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Printer, X, Receipt, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import PrintReceipt from './PrintReceipt';
import PrintInvoiceFromPOS, { PrintInvoiceFromPOSRef } from './PrintInvoiceFromPOS';
import { CartItemType } from './CartItem';
import { Service } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

interface PrintReceiptDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  completedItems: CartItemType[];
  completedServices: (Service & {
    scheduledDate?: Date;
    notes?: string;
    service_booking_id?: string;
    public_tracking_code?: string;
  })[];
  completedTotal: number;
  completedSubtotal: number;
  completedDiscount: number;
  completedDiscountAmount?: number;
  completedCustomerName?: string;
  completedPaidAmount: number;
  completedRemainingAmount: number;
  isPartialPayment?: boolean;
  considerRemainingAsPartial?: boolean;
  orderDate: Date;
  orderNumber: string;
  subscriptionAccountInfo?: {
    username?: string;
    email?: string;
    password?: string;
    notes?: string;
  };
  onPrintCompleted: () => void;
}

type PrintOption = 'select' | 'receipt' | 'invoice';

export default function PrintReceiptDialog({
  isOpen,
  onOpenChange,
  completedItems,
  completedServices,
  completedTotal,
  completedSubtotal,
  completedDiscount,
  completedDiscountAmount = 0,
  completedCustomerName,
  completedPaidAmount,
  completedRemainingAmount,
  isPartialPayment = false,
  considerRemainingAsPartial = false,
  orderDate,
  orderNumber,
  subscriptionAccountInfo,
  onPrintCompleted
}: PrintReceiptDialogProps) {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const [currentView, setCurrentView] = useState<PrintOption>('select');
  const invoiceRef = useRef<PrintInvoiceFromPOSRef>(null);

  // تحديد طريقة الدفع بناءً على البيانات
  const paymentMethod = completedRemainingAmount > 0 ? 'دفع جزئي' : 'مكتمل';

  const handleClose = () => {
    setCurrentView('select');
    onPrintCompleted();
    onOpenChange(false);
  };

  const handlePrintInvoice = () => {
    if (invoiceRef.current) {
      invoiceRef.current.print();
    }
  };

  if (!isOpen) return null;

  // إذا كان العرض الحالي هو اختيار نوع الطباعة
  if (currentView === 'select') {
    return createPortal(
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: 99999 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Printer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">اختر نوع الطباعة</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">رقم الطلب: {orderNumber}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="rounded-full w-8 h-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content - Print Options */}
          <div className="p-6 space-y-4">
            {/* Option 1: Receipt */}
            <button
              onClick={() => setCurrentView('receipt')}
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 flex items-center gap-4 group"
            >
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Receipt className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">طباعة وصل عادي</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  وصل بسيط للعميل يحتوي على تفاصيل المنتجات والأسعار
                </p>
              </div>
              <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors rtl:rotate-180" />
            </button>

            {/* Option 2: Invoice */}
            <button
              onClick={() => setCurrentView('invoice')}
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 flex items-center gap-4 group"
            >
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">طباعة فاتورة</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  فاتورة رسمية احترافية مع تفاصيل كاملة وتوقيع
                </p>
              </div>
              <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors rtl:rotate-180" />
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClose}
            >
              إلغاء وإغلاق
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // إذا كان العرض الحالي هو طباعة الفاتورة
  if (currentView === 'invoice') {
    return createPortal(
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: 99999 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('select')}
                className="rounded-full w-8 h-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">طباعة فاتورة</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">رقم الطلب: {orderNumber}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="rounded-full w-8 h-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content - Invoice Preview Info */}
          <div className="p-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 mb-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">معاينة الفاتورة</h3>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>• رقم الفاتورة: <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{orderNumber}</span></p>
                    <p>• العميل: <span className="font-bold text-gray-900 dark:text-gray-100">{completedCustomerName || 'عميل زائر'}</span></p>
                    <p>• عدد المنتجات: <span className="font-bold text-gray-900 dark:text-gray-100">{completedItems.length}</span></p>
                    <p>• المجموع: <span className="font-bold text-gray-900 dark:text-gray-100">{completedTotal.toFixed(2)} DA</span></p>
                    {isPartialPayment && (
                      <>
                        <p>• المدفوع: <span className="font-bold text-green-600">{completedPaidAmount.toFixed(2)} DA</span></p>
                        <p>• المتبقي: <span className="font-bold text-amber-600">{completedRemainingAmount.toFixed(2)} DA</span></p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 max-h-48 overflow-y-auto">
              <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">المنتجات:</h4>
              <div className="space-y-2">
                {completedItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.product.name}
                      {item.colorName && <span className="text-xs"> - {item.colorName}</span>}
                      {item.sizeName && <span className="text-xs"> - {item.sizeName}</span>}
                      <span className="text-gray-400 mx-1">×{item.quantity}</span>
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                      {((item.variantPrice || item.product.price) * item.quantity).toFixed(2)} DA
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer - Actions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentView('select')}
            >
              <ChevronRight className="h-4 w-4 ml-2 rtl:rotate-180" />
              رجوع
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handlePrintInvoice}
            >
              <Printer className="h-4 w-4 ml-2" />
              طباعة الفاتورة
            </Button>
          </div>
        </div>

        {/* Hidden Invoice Component for Printing */}
        <PrintInvoiceFromPOS
          ref={invoiceRef}
          orderId={orderNumber}
          items={completedItems}
          subtotal={completedSubtotal}
          total={completedTotal}
          customerName={completedCustomerName}
          discount={completedDiscount}
          discountAmount={completedDiscountAmount}
          amountPaid={completedPaidAmount}
          remainingAmount={completedRemainingAmount}
          isPartialPayment={isPartialPayment}
          language="ar"
          organization={currentOrganization}
        />
      </div>,
      document.body
    );
  }

  // إذا كان العرض الحالي هو طباعة الوصل العادي
  return (
    <>
      {/* Back Button Overlay */}
      {createPortal(
        <div
          className="fixed top-4 right-4"
          style={{ zIndex: 100000 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('select')}
            className="bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
          >
            <ChevronRight className="h-4 w-4 ml-1 rtl:rotate-180" />
            العودة للخيارات
          </Button>
        </div>,
        document.body
      )}

      <PrintReceipt
        isOpen={true}
        onClose={handleClose}
        orderId={orderNumber}
        items={completedItems}
        services={completedServices}
        subtotal={completedSubtotal}
        tax={0}
        total={completedTotal}
        customerName={completedCustomerName}
        employeeName={user?.user_metadata?.name || user?.email}
        paymentMethod={paymentMethod}
        discount={completedDiscount}
        discountAmount={completedDiscountAmount}
        amountPaid={completedPaidAmount}
        remainingAmount={completedRemainingAmount}
        isPartialPayment={isPartialPayment}
        considerRemainingAsPartial={considerRemainingAsPartial}
        subscriptionAccountInfo={subscriptionAccountInfo}
      />
    </>
  );
}
