import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
import OrderDetails from '@/components/orders/OrderDetails';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { getOnlineOrderById, getOnlineOrderItems } from '@/lib/api/invoices';

// جلب تفاصيل طلبية واحدة عبر RPC واحد سريع
async function fetchOrderDetailsByNumber(orderNumber: number, organizationId?: string | null) {
  // الدالة الموحدة تعيد order + items + template + organization_settings
  const { data, error } = await (supabase as any).rpc('get_thank_you_page_data', {
    p_customer_order_number: orderNumber,
    p_organization_id: organizationId ?? null,
  });

  if (error) throw error;
  if (!data || data.success !== true) throw new Error(data?.message || 'لم يتم العثور على الطلب');
  // الدالة تعيد الحقول مباشرة ضمن data (order/items/...)
  const order = (data.order || {}) as any;
  const items = (data.items || []) as any[];
  return { ...order, order_items: items } as any;
}

const OrderDetailsV2: React.FC = () => {
  const params = useParams<{ orderNumber: string }>();
  const { currentOrganization } = useTenant();
  const orderNumber = useMemo(() => {
    const raw = params.orderNumber || '';
    // دعم مسارات تُمرّر id نصي: سنحاول تحويله إلى رقم؛ إن فشل نرمي خطأ مبكر
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : NaN;
  }, [params.orderNumber]);

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order-details-v2', params.orderNumber, currentOrganization?.id],
    queryFn: async () => {
      if (Number.isFinite(orderNumber)) {
        return fetchOrderDetailsByNumber(orderNumber, currentOrganization?.id);
      }
      // Fallback: جلب حسب المعرّف النصي (غير مُفضّل لكنه يحل الحالات النادرة)
      const id = params.orderNumber as string;
      const base = await getOnlineOrderById(id);
      const items = await getOnlineOrderItems(id);
      return { ...base, order_items: items } as any;
    },
    enabled: Boolean(params.orderNumber),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard/orders-v2" className="hover:underline flex items-center gap-1">
            <ArrowRight className="h-4 w-4 rotate-180" />
            رجوع إلى الطلبات
          </Link>
        </div>
        <div className="text-xs text-muted-foreground">صفحة تفاصيل سريعة (RPC واحد)</div>
      </div>

      <Card className="rounded-xl bg-background/80 border border-border/30 shadow-sm">
        <CardContent className="p-4">
          {isLoading && (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="text-sm text-destructive">حدث خطأ أثناء جلب تفاصيل الطلب</div>
              <Button variant="outline" onClick={() => refetch()}>إعادة المحاولة</Button>
            </div>
          )}

          {!isLoading && !error && order && (
            <OrderDetails
              order={order}
              updateOrderStatus={() => Promise.resolve()}
              updateShippingInfo={() => {}}
              updateCustomerInfo={() => {}}
              hasUpdatePermission={true}
              hasCancelPermission={true}
            />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default OrderDetailsV2;
