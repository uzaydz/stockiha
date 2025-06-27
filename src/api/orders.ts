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

export async function getOrderByOrderNumber(orderNumber: string): Promise<FullOrderInfo | null> {
  
  const orderNum = parseInt(orderNumber, 10);
  if (isNaN(orderNum)) {
    return null;
  }

  try {
    
    // جلب الطلب الرئيسي مع بيانات metadata
    const { data: orderDataArray, error: orderError } = await supabase
      .from('online_orders')
      .select('*' /* نحدد جميع الأعمدة بما في ذلك metadata */)
      .eq('customer_order_number', orderNum)
      .order('created_at', { ascending: false }) // أحدث طلب أولاً
      .limit(1);

    const orderData = orderDataArray?.[0] || null;

    if (orderError) {
      // إذا كان الخطأ هو عدم العثور على صف (PGRST116)، فهذا ليس خطأ فعليًا، فقط لم يتم العثور عليه
      if (orderError.code === 'PGRST116') {
        return null;
      }
      throw orderError;
    }

    if (!orderData) {
      return null;
    }

    // جلب عناصر الطلب المرتبطة
    
    const { data: itemData, error: itemError } = await supabase
      .from('online_order_items')
      .select('*')
      .eq('order_id', (orderData as any).id);

    if (itemError) {
      throw itemError;
    }

    // دمج بيانات الطلب وعناصره
    const fullOrderInfo: FullOrderInfo = {
      ...orderData,
      // Supabase type generation might not be picking up the metadata column correctly,
      // but it should be present in the actual data. Casting to any to bypass linter.
      metadata: (orderData as any).metadata, 
      items: itemData || [],
    } as any;

    return fullOrderInfo;

  } catch (error) {
    return null;
  }
}
