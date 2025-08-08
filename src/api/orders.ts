import { supabase } from '@/lib/supabase-client';
// import { Database } from '@/lib/supabase-types';

type OnlineOrder = any; // Database['public']['Tables']['online_orders']['Row'];
type OnlineOrderItem = any; // Database['public']['Tables']['online_order_items']['Row'];

// نوع مخصص يجمع بيانات الطلب وعناصره
export interface FullOrderInfo extends OnlineOrder {
  items: OnlineOrderItem[]; 
}

// *** تعريف وتصدير الواجهة هنا ***
export interface DisplayOrderInfo extends FullOrderInfo {
  orderNumber: string; // لضمان وجوده كسلسلة نصية
  productName?: string; // يمكن جلبه لاحقًا أو تمريره
  estimatedDelivery?: string;
}

export async function getOrderByOrderNumber(orderNumber: string): Promise<(FullOrderInfo & { template?: any; organization_settings?: any }) | null> {
  const orderNum = parseInt(orderNumber, 10);
  if (isNaN(orderNum)) return null;

  try {
    // استدعاء RPC الموحد الذي يعيد: order + items + template + organization_settings
    const { data, error } = await (supabase as any).rpc('get_thank_you_page_data', {
      p_customer_order_number: orderNum,
      p_organization_id: null,
    });

    if (error) throw error;
    if (data && data.success === true) {
      const order = (data.order || {}) as OnlineOrder;
      const items = (data.items || []) as OnlineOrderItem[];
  
      const fullOrderInfo: FullOrderInfo & { template?: any; organization_settings?: any } = {
        ...order,
        metadata: (order as any).metadata,
        items,
        template: data.template || undefined,
        organization_settings: data.organization_settings || undefined,
      } as any;
  
      return fullOrderInfo;
    }
    // بدون فولباك لتجنّب تعدد الاستدعاءات
    return null;
  } catch (_) {
    return null;
  }
}
