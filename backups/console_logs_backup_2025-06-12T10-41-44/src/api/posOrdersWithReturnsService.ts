import { supabase } from '../lib/supabase'

export interface POSOrderWithReturns {
  id: string
  customer_order_number: number
  slug: string
  customer_id: string | null
  customer_name: string
  customer_phone: string | null
  employee_id: string | null
  status: string
  effective_status: string
  payment_method: string
  payment_status: string
  original_total: number
  effective_total: number
  items_count: number
  has_returns: boolean
  is_fully_returned: boolean
  total_returned_amount: number
  created_at: string
  updated_at: string
}

// دالة للحصول على طلبيات نقطة البيع مع حسابات المرتجعات
export const getPOSOrdersWithReturns = async (
  organizationId: string,
  filters: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<{ 
  orders: POSOrderWithReturns[]; 
  totalCount: number; 
  hasMore: boolean; 
}> => {
  try {
    const currentUser = supabase.auth.getUser()
    const user = (await currentUser).data.user
    
    if (!user) {
      throw new Error('غير مصرح لك بالوصول')
    }

    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة')
    }

    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      employeeId,
      dateFrom,
      dateTo
    } = filters

    // استخدام الدالة المحسنة من قاعدة البيانات
    const { data: orders, error } = await supabase
      .rpc('get_pos_orders_with_returns_optimized' as any, {
        p_organization_id: organizationId,
        p_page: page,
        p_limit: limit,
        p_status: status || null,
        p_customer_id: customerId || null,
        p_employee_id: employeeId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      })

    if (error) {
      throw error
    }

    // جلب العدد الإجمالي
    const { data: totalCountData, error: countError } = await supabase
      .rpc('get_pos_orders_count_with_returns' as any, {
        p_organization_id: organizationId
      })

    if (countError) {
      throw countError
    }

    const totalCount = Number(totalCountData) || 0
    const hasMore = (page * limit) < totalCount

    // تحويل البيانات لضمان التوافق مع النوع المطلوب
    const formattedOrders: POSOrderWithReturns[] = Array.isArray(orders) ? orders.map((order: any) => ({
      id: order.id,
      customer_order_number: order.customer_order_number,
      slug: order.slug,
      customer_id: order.customer_id,
      customer_name: order.customer_name || 'زائر',
      customer_phone: order.customer_phone,
      employee_id: order.employee_id,
      status: order.status,
      effective_status: order.effective_status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      original_total: parseFloat(order.original_total || '0'),
      effective_total: parseFloat(order.effective_total || '0'),
      items_count: parseInt(order.items_count || '0'),
      has_returns: Boolean(order.has_returns),
      is_fully_returned: Boolean(order.is_fully_returned),
      total_returned_amount: parseFloat(order.total_returned_amount || '0'),
      created_at: order.created_at,
      updated_at: order.updated_at
    })) : []

    return {
      orders: formattedOrders,
      totalCount,
      hasMore
    }

  } catch (error) {
    throw error
  }
}
