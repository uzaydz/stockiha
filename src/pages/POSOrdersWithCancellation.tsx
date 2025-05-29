import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { POSOrdersService, type POSOrderWithDetails } from '@/api/posOrdersService';
import { CancelOrderDialog } from '@/components/pos-orders/CancelOrderDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Ban, Eye, Edit, Trash } from 'lucide-react';

interface POSOrdersWithCancellationProps {
  // يمكن إضافة خصائص أخرى حسب الحاجة
}

export const POSOrdersWithCancellation: React.FC<POSOrdersWithCancellationProps> = () => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const [orders, setOrders] = useState<POSOrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<POSOrderWithDetails | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const posOrdersService = POSOrdersService.getInstance();

  // جلب الطلبيات
  const fetchOrders = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      const result = await posOrdersService.getPOSOrders(currentOrganization.id);
      setOrders(result.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ في جلب الطلبيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentOrganization?.id]);

  // معالج إلغاء الطلبية
  const handleCancelOrder = async (
    orderId: string,
    itemsToCancel: string[],
    cancellationReason: string,
    restoreInventory: boolean
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول لإلغاء الطلبيات');
      return false;
    }

    try {
      setCancellingOrderId(orderId);

      const result = await posOrdersService.cancelOrder(
        orderId,
        itemsToCancel.length === selectedOrder?.order_items.length ? null : itemsToCancel,
        cancellationReason,
        restoreInventory,
        user.id
      );

      if (result.success && result.data) {
        toast.success(result.data.message);
        
        // تحديث قائمة الطلبيات
        await fetchOrders();
        
        return true;
      } else {
        toast.error(result.error || 'حدث خطأ أثناء إلغاء الطلبية');
        return false;
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('حدث خطأ أثناء إلغاء الطلبية');
      return false;
    } finally {
      setCancellingOrderId(null);
    }
  };

  // فتح نافذة الإلغاء
  const openCancelDialog = (order: POSOrderWithDetails) => {
    if (order.status === 'cancelled') {
      toast.error('هذه الطلبية ملغاة بالفعل');
      return;
    }
    
    setSelectedOrder(order);
    setIsCancelDialogOpen(true);
  };

  // تحديد لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // تحديد نص الحالة
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتملة';
      case 'pending':
        return 'معلقة';
      case 'cancelled':
        return 'ملغاة';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">جاري تحميل الطلبيات...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">طلبيات نقطة البيع</h1>
        <Button onClick={fetchOrders} variant="outline">
          تحديث
        </Button>
      </div>

      {/* جدول الطلبيات */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  رقم الطلبية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  عدد المنتجات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  المجموع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    #{order.slug?.slice(-8) || order.id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {order.customer?.name || 'زائر'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {order.items_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {parseFloat(order.total).toFixed(2)} دج
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(order.created_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        {order.status !== 'cancelled' && (
                          <DropdownMenuItem
                            onClick={() => openCancelDialog(order)}
                            className="text-red-600 dark:text-red-400"
                            disabled={cancellingOrderId === order.id}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            {cancellingOrderId === order.id ? 'جاري الإلغاء...' : 'إلغاء الطلبية'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              لا توجد طلبيات حالياً
            </div>
          </div>
        )}
      </div>

      {/* نافذة إلغاء الطلبية */}
      <CancelOrderDialog
        order={selectedOrder}
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onConfirm={handleCancelOrder}
      />
    </div>
  );
};

export default POSOrdersWithCancellation;