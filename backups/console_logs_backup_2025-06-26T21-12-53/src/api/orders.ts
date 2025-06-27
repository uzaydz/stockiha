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
  console.log(`🔍 [getOrderByOrderNumber] بدء البحث عن الطلب رقم: ${orderNumber}`);
  
  const orderNum = parseInt(orderNumber, 10);
  if (isNaN(orderNum)) {
    console.error(`❌ [getOrderByOrderNumber] رقم الطلب غير صالح: ${orderNumber}`);
    return null;
  }

  try {
    console.log(`📊 [getOrderByOrderNumber] جلب الطلب من قاعدة البيانات: customer_order_number=${orderNum}`);
    
    // جلب الطلب الرئيسي مع بيانات metadata
    const { data: orderDataArray, error: orderError } = await supabase
      .from('online_orders')
      .select('*' /* نحدد جميع الأعمدة بما في ذلك metadata */)
      .eq('customer_order_number', orderNum)
      .order('created_at', { ascending: false }) // أحدث طلب أولاً
      .limit(1);

    const orderData = orderDataArray?.[0] || null;

    console.log(`📊 [getOrderByOrderNumber] نتيجة الاستعلام:`, { 
      foundOrders: orderDataArray?.length || 0,
      hasData: !!orderData, 
      error: orderError ? { code: orderError.code, message: orderError.message } : null 
    });

    if (orderError) {
      console.error(`❌ [getOrderByOrderNumber] خطأ في جلب الطلب:`, orderError);
      // إذا كان الخطأ هو عدم العثور على صف (PGRST116)، فهذا ليس خطأ فعليًا، فقط لم يتم العثور عليه
      if (orderError.code === 'PGRST116') {
        console.log(`ℹ️ [getOrderByOrderNumber] لم يتم العثور على الطلب (PGRST116)`);
        return null;
      }
      throw orderError;
    }

    if (!orderData) {
      console.warn(`⚠️ [getOrderByOrderNumber] الطلب فارغ رغم عدم وجود خطأ`);
      return null;
    }

    console.log(`✅ [getOrderByOrderNumber] تم جلب الطلب بنجاح:`, {
      id: (orderData as any).id,
      customer_order_number: (orderData as any).customer_order_number,
      organization_id: (orderData as any).organization_id,
      amount: (orderData as any).amount
    });

    // جلب عناصر الطلب المرتبطة
    console.log(`📦 [getOrderByOrderNumber] جلب عناصر الطلب لـ order_id: ${(orderData as any).id}`);
    
    const { data: itemData, error: itemError } = await supabase
      .from('online_order_items')
      .select('*')
      .eq('order_id', (orderData as any).id);

    console.log(`📦 [getOrderByOrderNumber] نتيجة عناصر الطلب:`, { 
      itemsCount: itemData?.length || 0, 
      error: itemError ? { code: itemError.code, message: itemError.message } : null 
    });

    if (itemError) {
      console.error(`❌ [getOrderByOrderNumber] خطأ في جلب عناصر الطلب:`, itemError);
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

    console.log(`🎉 [getOrderByOrderNumber] تم إنشاء FullOrderInfo بنجاح:`, {
      orderNumber: (fullOrderInfo as any).customer_order_number,
      itemsCount: fullOrderInfo.items.length,
      hasMetadata: !!(fullOrderInfo as any).metadata
    });

    return fullOrderInfo;

  } catch (error) {
    console.error(`💥 [getOrderByOrderNumber] خطأ عام:`, error);
    return null;
  }
}
