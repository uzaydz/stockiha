import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Archive,
  Search,
  Trash2,
  Clock,
  User,
  ShoppingCart,
  Download,
  Upload,
  X,
  Package,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getHeldOrders,
  deleteHeldOrder,
  HeldOrder,
  searchHeldOrders,
  exportHeldOrders,
  clearAllHeldOrders,
} from '@/lib/hold-orders';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface POSAdvancedHoldOrdersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestoreOrder: (order: HeldOrder) => void;
}

const POSAdvancedHoldOrders: React.FC<POSAdvancedHoldOrdersProps> = ({
  open,
  onOpenChange,
  onRestoreOrder,
}) => {
  const [orders, setOrders] = useState<HeldOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<HeldOrder | null>(null);
  const confirmDialog = useConfirmDialog();

  // تحميل الطلبات
  useEffect(() => {
    if (open) {
      loadOrders();
    }
  }, [open]);

  const loadOrders = () => {
    const loadedOrders = getHeldOrders();
    setOrders(loadedOrders);
  };

  // البحث والتصفية
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    return searchHeldOrders(searchQuery);
  }, [orders, searchQuery]);

  // حساب الإجمالي لطلب
  const calculateOrderTotal = (order: HeldOrder): number => {
    const itemsTotal = order.items.reduce((sum, item) => {
      const price = item.customPrice || item.variantPrice || item.product.price || 0;
      return sum + price * item.quantity;
    }, 0);

    const servicesTotal = order.services.reduce((sum, service) => sum + (service.price || 0), 0);
    const subscriptionsTotal = order.subscriptions.reduce((sum, sub) => sum + (sub.price || sub.selling_price || 0), 0);

    let total = itemsTotal + servicesTotal + subscriptionsTotal;

    // تطبيق الخصم
    if (order.discountType === 'percentage' && order.discount) {
      total -= (total * order.discount) / 100;
    } else if (order.discountType === 'fixed' && order.discountAmount) {
      total -= order.discountAmount;
    }

    return Math.max(0, total);
  };

  // حذف طلب
  const handleDeleteOrder = async (order: HeldOrder) => {
    const confirmed = await confirmDialog.confirm({
      title: 'حذف الطلب المعلق',
      description: `هل أنت متأكد من حذف الطلب "${order.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      type: 'danger',
    });

    if (confirmed) {
      const success = deleteHeldOrder(order.id);
      if (success) {
        toast.success('تم حذف الطلب المعلق بنجاح');
        loadOrders();
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(null);
        }
      } else {
        toast.error('فشل حذف الطلب');
      }
    }
  };

  // استرجاع طلب
  const handleRestoreOrder = (order: HeldOrder) => {
    onRestoreOrder(order);
    onOpenChange(false);
    toast.success(`تم استرجاع الطلب "${order.name}"`);
  };

  // تصدير الطلبات
  const handleExport = () => {
    const data = exportHeldOrders();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `held-orders-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير الطلبات المعلقة');
  };

  // مسح جميع الطلبات
  const handleClearAll = async () => {
    const confirmed = await confirmDialog.confirm({
      title: 'مسح جميع الطلبات',
      description: 'هل أنت متأكد من حذف جميع الطلبات المعلقة؟ لا يمكن التراجع عن هذا الإجراء!',
      confirmText: 'مسح الكل',
      cancelText: 'إلغاء',
      type: 'danger',
      requireDoubleConfirm: true,
    });

    if (confirmed) {
      clearAllHeldOrders();
      setOrders([]);
      setSelectedOrder(null);
      toast.success('تم مسح جميع الطلبات المعلقة');
    }
  };

  // تنسيق التاريخ
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    
    return date.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Archive className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl">الطلبات المعلقة</DialogTitle>
                  <DialogDescription className="mt-1">
                    {filteredOrders.length} طلب معلق
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {orders.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      تصدير
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      مسح الكل
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* البحث */}
            <div className="relative mt-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في الطلبات المعلقة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </DialogHeader>

          <Separator />

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden">
            {/* قائمة الطلبات */}
            <ScrollArea className="h-full border-l">
              <div className="p-4 space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12"
                    >
                      <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {searchQuery ? 'لا توجد نتائج' : 'لا توجد طلبات معلقة'}
                      </p>
                    </motion.div>
                  ) : (
                    filteredOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={() => setSelectedOrder(order)}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                          selectedOrder?.id === order.id
                            ? 'bg-primary/5 border-primary'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-sm line-clamp-1">
                            {order.name}
                          </h4>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {order.items.length} منتج
                          </Badge>
                        </div>

                        {order.customerName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <User className="h-3 w-3" />
                            {order.customerName}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(order.updatedAt)}
                          </span>
                          <span className="font-bold text-primary">
                            {calculateOrderTotal(order).toLocaleString()} دج
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* تفاصيل الطلب */}
            <div className="col-span-2 flex flex-col h-full">
              {selectedOrder ? (
                <>
                  <div className="p-6 space-y-4 flex-1 overflow-auto">
                    {/* معلومات الطلب */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{selectedOrder.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(selectedOrder.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrder(selectedOrder)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {selectedOrder.customerName && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {selectedOrder.customerName}
                          </span>
                        </div>
                      )}

                      {selectedOrder.notes && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-sm text-muted-foreground">
                            {selectedOrder.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* العناصر */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        المنتجات ({selectedOrder.items.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item, index) => {
                          // ⚡ دعم thumbnail_base64 للعمل Offline
                          const imageSrc = item.variantImage || 
                            (item.product as any).thumbnail_base64 || 
                            item.product.thumbnail_image;
                          return (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-lg border"
                          >
                            {imageSrc ? (
                              <img
                                src={imageSrc}
                                alt={item.product.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">
                                {item.product.name}
                              </p>
                              {(item.colorName || item.sizeName) && (
                                <p className="text-xs text-muted-foreground">
                                  {[item.colorName, item.sizeName].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">
                                ×{item.quantity}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {((item.customPrice || item.variantPrice || item.product.price || 0) * item.quantity).toLocaleString()} دج
                              </p>
                            </div>
                          </div>
                        );})}
                      </div>
                    </div>

                    {/* الخدمات والاشتراكات */}
                    {(selectedOrder.services.length > 0 || selectedOrder.subscriptions.length > 0) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          {selectedOrder.services.map((service, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded border-l-4 border-l-blue-400">
                              <span className="text-sm">{service.name}</span>
                              <span className="text-sm font-medium">{service.price.toLocaleString()} دج</span>
                            </div>
                          ))}
                          {selectedOrder.subscriptions.map((sub, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded border-l-4 border-l-green-400">
                              <span className="text-sm">{sub.name}</span>
                              <span className="text-sm font-medium">{(sub.price || sub.selling_price).toLocaleString()} دج</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* الإجمالي */}
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="font-bold flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          الإجمالي:
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {calculateOrderTotal(selectedOrder).toLocaleString()} دج
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="p-6 pt-4 border-t bg-muted/30">
                    <Button
                      onClick={() => handleRestoreOrder(selectedOrder)}
                      className="w-full h-12 text-base gap-2"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      استرجاع الطلب
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-12">
                  <div>
                    <Archive className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      اختر طلباً لعرض تفاصيله
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة التأكيد */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        title={confirmDialog.config.title}
        description={confirmDialog.config.description}
        confirmText={confirmDialog.config.confirmText}
        cancelText={confirmDialog.config.cancelText}
        type={confirmDialog.config.type}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
        loading={confirmDialog.loading}
        requireDoubleConfirm={confirmDialog.config.requireDoubleConfirm}
      />
    </>
  );
};

export default POSAdvancedHoldOrders;

