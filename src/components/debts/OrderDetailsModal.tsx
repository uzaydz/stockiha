import React, { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Palette,
  Ruler,
  Scale,
  Box,
  Hash,
  Calendar,
  User,
  CreditCard,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderId: string;
    orderNumber: string;
    date: string;
    total: number;
    amountPaid: number;
    remainingAmount: number;
    employee: string;
  } | null;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  selling_unit_type: string | null;
  weight_sold: number | null;
  weight_unit: string | null;
  meters_sold: number | null;
  boxes_sold: number | null;
  units_per_box: number | null;
  color_name: string | null;
  size_name: string | null;
  variant_display_name: string | null;
  sale_type: string | null;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  // جلب عناصر الطلب من PowerSync
  const { sql, params } = useMemo(() => {
    if (!order?.orderId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          total_price,
          selling_unit_type,
          weight_sold,
          weight_unit,
          meters_sold,
          boxes_sold,
          units_per_box,
          color_name,
          size_name,
          variant_display_name,
          sale_type
        FROM order_items
        WHERE order_id = ?
        ORDER BY created_at DESC
      `,
      params: [order.orderId]
    };
  }, [order?.orderId]);

  const { data: items, isLoading } = useQuery<OrderItem>(sql, params);

  // دالة لتحديد نوع البيع وعرضه
  const getSellingTypeDisplay = (item: OrderItem) => {
    const sellingType = item.selling_unit_type || 'piece';

    switch (sellingType) {
      case 'weight':
        return {
          label: 'بالوزن',
          icon: Scale,
          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
          quantity: `${item.weight_sold || 0} ${item.weight_unit || 'كغ'}`,
        };
      case 'meter':
        return {
          label: 'بالمتر',
          icon: Ruler,
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          quantity: `${item.meters_sold || 0} متر`,
        };
      case 'box':
        return {
          label: 'بالعلبة',
          icon: Box,
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          quantity: `${item.boxes_sold || 0} علبة (${item.units_per_box || 1} قطعة/علبة)`,
        };
      default:
        return {
          label: 'بالقطعة',
          icon: Package,
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          quantity: `${item.quantity} قطعة`,
        };
    }
  };

  // دالة لعرض المتغيرات (اللون والمقاس)
  const getVariantDisplay = (item: OrderItem) => {
    const variants: string[] = [];

    if (item.color_name) {
      variants.push(`اللون: ${item.color_name}`);
    }
    if (item.size_name) {
      variants.push(`المقاس: ${item.size_name}`);
    }
    if (item.variant_display_name && !item.color_name && !item.size_name) {
      variants.push(item.variant_display_name);
    }

    return variants;
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-primary" />
            تفاصيل الطلب {order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        {/* معلومات الطلب الأساسية */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">التاريخ</p>
              <p className="text-sm font-medium">
                {new Date(order.date).toLocaleDateString('ar-DZ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">الموظف</p>
              <p className="text-sm font-medium">{order.employee}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">المبلغ الكلي</p>
              <p className="text-sm font-medium">{formatPrice(order.total)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">رقم الطلب</p>
              <p className="text-sm font-medium">{order.orderNumber}</p>
            </div>
          </div>
        </div>

        {/* ملخص الدفع */}
        <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs">المبلغ الكلي</span>
            </div>
            <p className="text-lg font-bold">{formatPrice(order.total)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Banknote className="h-4 w-4" />
              <span className="text-xs">المدفوع</span>
            </div>
            <p className="text-lg font-bold text-green-600">{formatPrice(order.amountPaid)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">المتبقي</span>
            </div>
            <p className="text-lg font-bold text-red-600">{formatPrice(order.remainingAmount)}</p>
          </div>
        </div>

        <Separator />

        {/* قائمة المنتجات */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            المنتجات ({items?.length || 0})
          </h3>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              جاري تحميل المنتجات...
            </div>
          ) : !items || items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد منتجات في هذا الطلب
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const sellingType = getSellingTypeDisplay(item);
                const variants = getVariantDisplay(item);
                const IconComponent = sellingType.icon;

                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* اسم المنتج */}
                        <h4 className="font-medium text-foreground mb-2">
                          {item.product_name}
                        </h4>

                        {/* المتغيرات (اللون والمقاس) */}
                        {variants.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.color_name && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Palette className="h-3 w-3" />
                                {item.color_name}
                              </Badge>
                            )}
                            {item.size_name && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Ruler className="h-3 w-3" />
                                {item.size_name}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* نوع البيع والكمية */}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={`gap-1 text-xs ${sellingType.color}`}>
                            <IconComponent className="h-3 w-3" />
                            {sellingType.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {sellingType.quantity}
                          </span>
                        </div>

                        {/* نوع البيع (جملة/تجزئة) */}
                        {item.sale_type && item.sale_type !== 'retail' && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {item.sale_type === 'wholesale' ? 'جملة' :
                             item.sale_type === 'semi_wholesale' ? 'نصف جملة' : item.sale_type}
                          </Badge>
                        )}
                      </div>

                      {/* السعر */}
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">سعر الوحدة</p>
                        <p className="text-sm font-medium">{formatPrice(item.unit_price)}</p>
                        <p className="text-xs text-muted-foreground mt-2">الإجمالي</p>
                        <p className="text-base font-bold text-primary">
                          {formatPrice(item.total_price)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* المجموع الكلي */}
        {items && items.length > 0 && (
          <>
            <Separator />
            <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
              <span className="font-semibold">المجموع الكلي</span>
              <span className="text-xl font-bold text-primary">
                {formatPrice(order.total)}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
