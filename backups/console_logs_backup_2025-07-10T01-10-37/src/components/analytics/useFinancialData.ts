import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import type { FinancialData, DateRange, AnalyticsFilters } from './types';

interface UseFinancialDataProps {
  dateRange: DateRange;
  selectedEmployee: string;
  filters?: AnalyticsFilters;
  enabled?: boolean;
}

export const useFinancialData = ({ 
  dateRange, 
  selectedEmployee, 
  filters = {},
  enabled = true 
}: UseFinancialDataProps) => {
  const { user } = useAuth();
  const { tenant } = useTenant();

  return useQuery({
    queryKey: [
      'financial-analytics-optimized', 
      tenant?.id, 
      dateRange.from.getTime(), // استخدام timestamp بدلاً من ISO string
      dateRange.to.getTime(),   // لضمان التعرف على التغييرات الدقيقة
      selectedEmployee,
      JSON.stringify(filters), // تسلسل الفلاتر لضمان التعرف على التغييرات
      `${dateRange.from.getTime()}-${dateRange.to.getTime()}` // إضافة مفتاح إضافي للتأكد
    ],
    queryFn: async (): Promise<FinancialData> => {

      if (!tenant?.id) {
        throw new Error('معرف المؤسسة غير موجود');
      }

      // بناء معاملات الفلتر
      const filterParams = {
        p_organization_id: tenant.id,
        p_start_date: dateRange.from.toISOString(),
        p_end_date: dateRange.to.toISOString(),
        p_employee_id: selectedEmployee === 'all' ? null : selectedEmployee,
        // فلاتر متقدمة
        p_branch_id: filters.branchId && filters.branchId !== 'all' ? filters.branchId : null,
        p_transaction_type: filters.transactionType && filters.transactionType !== 'all' ? filters.transactionType : null,
        p_payment_method: filters.paymentMethod && filters.paymentMethod !== 'all' ? filters.paymentMethod : null,
        p_min_amount: filters.minAmount || null,
        p_max_amount: filters.maxAmount || null,
        p_include_partial_payments: filters.includePartialPayments || false,
        p_include_refunds: filters.includeRefunds || false
      };

      const { data, error } = await supabase.rpc('get_complete_financial_analytics' as any, filterParams);

      if (error) {
        throw new Error(`خطأ في جلب البيانات: ${error.message}`);
      }

      if (!data || data.length === 0) {
        // إرجاع بيانات فارغة بدلاً من رمي خطأ
        return {
          total_revenue: 0,
          total_cost: 0,
          total_gross_profit: 0,
          total_expenses: 0,
          total_net_profit: 0,
          profit_margin_percentage: 0,
          pos_sales_revenue: 0,
          pos_sales_cost: 0,
          pos_sales_profit: 0,
          pos_orders_count: 0,
          online_sales_revenue: 0,
          online_sales_cost: 0,
          online_sales_profit: 0,
          online_orders_count: 0,
          repair_services_revenue: 0,
          repair_services_profit: 0,
          repair_orders_count: 0,
          game_downloads_revenue: 0,
          game_downloads_profit: 0,
          game_downloads_count: 0,
          subscription_services_revenue: 0,
          subscription_services_profit: 0,
          subscription_transactions_count: 0,
          total_debt_amount: 0,
          debt_impact_on_capital: 0,
          paid_debt_amount: 0,
          total_losses_cost: 0,
          total_losses_selling_value: 0,
          total_returns_amount: 0,
          one_time_expenses: 0,
          recurring_expenses_annual: 0,
          avg_order_value: 0,
          total_transactions_count: 0
        };
      }

      const result = data[0] as FinancialData;

      return result;
    },
    enabled: enabled && !!tenant?.id && !!user?.id,
    staleTime: 0, // البيانات دائماً stale لضمان التحديث الفوري
    gcTime: 5 * 60 * 1000, // 5 دقائق (كان cacheTime سابقاً)
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false, // عدم التحديث التلقائي
    retry: (failureCount, error: any) => {
      // إعادة المحاولة 3 مرات فقط للأخطاء المؤقتة
      if (failureCount >= 3) return false;
      if (error?.message?.includes('معرف المؤسسة غير موجود')) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook مساعد للحصول على بيانات مُحضرة للرسوم البيانية
export const useChartData = (financialData: FinancialData | undefined) => {

  const salesData = financialData ? [
    { 
      name: 'نقطة البيع', 
      value: financialData.pos_sales_revenue, 
      profit: financialData.pos_sales_profit 
    },
    { 
      name: 'المتجر الإلكتروني', 
      value: financialData.online_sales_revenue, 
      profit: financialData.online_sales_profit 
    },
    { 
      name: 'خدمات التصليح', 
      value: financialData.repair_services_revenue, 
      profit: financialData.repair_services_profit 
    },
    { 
      name: 'تحميل الألعاب', 
      value: financialData.game_downloads_revenue, 
      profit: financialData.game_downloads_profit 
    },
    { 
      name: 'الاشتراكات', 
      value: financialData.subscription_services_revenue, 
      profit: financialData.subscription_services_profit 
    }
  ].filter(item => item.value > 0) : [];

  const profitData = financialData ? [
    { name: 'الإيرادات الإجمالية', value: financialData.total_revenue, amount: financialData.total_revenue },
    { name: 'التكلفة الإجمالية', value: financialData.total_cost, amount: financialData.total_cost },
    { name: 'الربح الإجمالي', value: financialData.total_gross_profit, amount: financialData.total_gross_profit },
    { name: 'المصروفات', value: financialData.total_expenses, amount: financialData.total_expenses },
    { name: 'الربح الصافي', value: financialData.total_net_profit, amount: financialData.total_net_profit }
  ] : [];

  return { salesData, profitData };
};
