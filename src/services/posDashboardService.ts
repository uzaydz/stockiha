/**
 * خدمة لوحة تحكم نقطة البيع
 * تستخدم RPC واحد محسّن لجلب جميع البيانات
 */

import { supabase } from '@/lib/supabase';

// ====================================================================
// Types
// ====================================================================

export interface POSSalesStats {
  total_sales: number;
  today_sales: number;
  week_sales: number;
  month_sales: number;
  growth_rate: number;
}

export interface POSOrdersStats {
  total_orders: number;
  today_orders: number;
  week_orders: number;
  month_orders: number;
  avg_order_value: number;
}

export interface POSCustomersStats {
  total_customers: number;
  new_customers_month: number;
}

export interface POSProductsStats {
  total_products: number;
  low_stock_products: number;
}

export interface TopProduct {
  id: string;
  name: string;
  image: string;
  category: string;
  sales_count: number;
  revenue: number;
  price: number;
}

export interface RecentOrder {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string | null;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  items_count: number;
  created_at: string;
  created_by_staff_name: string | null;
}

export interface DailySale {
  date: string;
  sales: number;
  orders: number;
}

export interface ActiveSession {
  id: string;
  staff_id: string;
  staff_name: string;
  status: string;
  opening_cash: number;
  total_sales: number;
  total_orders: number;
  cash_sales: number;
  card_sales: number;
  started_at: string;
  paused_at: string | null;
  pause_count: number;
}

/**
 * بيانات موظف واحد
 */
export interface StaffMember {
  id: string;
  name: string;
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  hours_worked: number;
  status: 'active' | 'paused' | 'closed';
  session_started_at?: string;
}

/**
 * إحصائيات الموظفين
 */
export interface StaffStats {
  total_staff: number;
  active_staff: number;
  active_sessions: number;
  staff_list: StaffMember[];
}

export interface POSDashboardData {
  success: boolean;
  timestamp: string;
  sales_stats: POSSalesStats;
  orders_stats: POSOrdersStats;
  customers_stats: POSCustomersStats;
  products_stats: POSProductsStats;
  top_products: TopProduct[];
  recent_orders: RecentOrder[];
  daily_sales: DailySale[];
  active_session: ActiveSession | null;
  staff_stats: StaffStats;
}

// ====================================================================
// Service Functions
// ====================================================================

/**
 * جلب جميع بيانات لوحة تحكم نقطة البيع
 * @param organizationId - معرف المؤسسة
 * @returns بيانات لوحة التحكم الكاملة
 */
export async function getPOSDashboardData(
  organizationId: string
): Promise<POSDashboardData> {
  try {
    // التحقق من صلاحية الجلسة أولاً
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ [POS Dashboard] الجلسة منتهية أو غير موجودة');
      throw new Error('الجلسة منتهية. الرجاء تسجيل الدخول مرة أخرى');
    }

    const { data, error } = await supabase.rpc('get_pos_dashboard_data' as any, {
      p_organization_id: organizationId
    });

    if (error) {
      // معالجة خاصة لـ JWT المنتهي
      if (error.code === 'PGRST301' || error.message?.includes('JWT expired')) {
        console.error('❌ [POS Dashboard] JWT منتهي الصلاحية');
        // محاولة تحديث الجلسة
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error('انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى');
        }
        // إعادة المحاولة بعد التحديث
        return getPOSDashboardData(organizationId);
      }
      
      console.error('❌ [POS Dashboard] خطأ في جلب البيانات:', error);
      throw error;
    }

    const result = data as any;
    if (!result || !result.success) {
      throw new Error(result?.error || 'فشل في جلب بيانات لوحة التحكم');
    }

    console.log('✅ [POS Dashboard] تم جلب البيانات بنجاح');
    return result as POSDashboardData;
  } catch (error) {
    console.error('❌ [POS Dashboard] خطأ غير متوقع:', error);
    throw error;
  }
}

/**
 * تحديث بيانات لوحة التحكم (للاستخدام مع React Query)
 */
export const posDashboardQueryKey = (organizationId: string) => [
  'pos-dashboard',
  organizationId
];

/**
 * خيارات React Query للوحة التحكم
 */
export const posDashboardQueryOptions = {
  staleTime: 30000, // 30 ثانية
  cacheTime: 300000, // 5 دقائق
  refetchOnWindowFocus: true,
  refetchOnMount: true,
  retry: 2
};
