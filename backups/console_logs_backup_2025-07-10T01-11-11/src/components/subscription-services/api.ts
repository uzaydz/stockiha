import { supabase } from '@/lib/supabase';
import { 
  SubscriptionService, 
  SubscriptionServiceCategory, 
  SubscriptionTransaction,
  ServiceStats,
  TransactionStats 
} from './types';

export class SubscriptionServicesAPI {
  static async fetchCategories(organizationId: string): Promise<SubscriptionServiceCategory[]> {
    const { data, error } = await supabase
      .from('subscription_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async fetchServices(organizationId: string): Promise<SubscriptionService[]> {
    // جلب الخدمات
    const { data: servicesData, error: servicesError } = await supabase
      .from('subscription_services')
      .select(`
        *,
        category:subscription_categories(*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (servicesError) throw servicesError;

    // جلب أسعار كل خدمة
    const servicesWithPricing = await Promise.all(
      (servicesData || []).map(async (service) => {
        const { data: pricingData } = await supabase
          .from('subscription_service_pricing')
          .select('*')
          .eq('subscription_service_id', service.id)
          .eq('is_active', true)
          .order('display_order');

        return {
          ...service,
          pricing_options: pricingData || []
        };
      })
    );

    return servicesWithPricing;
  }

  static async fetchTransactions(organizationId: string): Promise<SubscriptionTransaction[]> {
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('subscription_transactions')
      .select(`
        *,
        subscription_services (
          name,
          provider,
          logo_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (transactionsError) throw transactionsError;

    // تنسيق البيانات
    const formattedTransactions = (transactionsData || []).map(transaction => ({
      ...transaction,
      service_name: transaction.subscription_services?.name || 'خدمة محذوفة',
      provider: transaction.subscription_services?.provider || 'غير محدد',
      logo_url: transaction.subscription_services?.logo_url || ''
    }));

    return formattedTransactions;
  }

  static calculateServiceStats(services: SubscriptionService[]): ServiceStats {
    const totalCount = services.length;
    const availableCount = services.filter(s => s.is_active && s.available_quantity > 0).length;
    const soldCount = services.filter(s => s.sold_quantity > 0).length;
    const expiredCount = services.filter(s => !s.is_active).length;
    
    // حساب الإيرادات من خيارات الأسعار
    let totalRevenue = 0;
    let totalProfit = 0;
    
    services.forEach(service => {
      if (service.pricing_options && service.pricing_options.length > 0) {
        service.pricing_options.forEach(pricing => {
          totalRevenue += pricing.selling_price * pricing.sold_quantity;
          totalProfit += pricing.profit_amount * pricing.sold_quantity;
        });
      } else {
        totalRevenue += service.selling_price * service.sold_quantity;
        totalProfit += service.profit_amount * service.sold_quantity;
      }
    });

    const avgProfitMargin = soldCount > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      total_count: totalCount,
      available_count: availableCount,
      sold_count: soldCount,
      expired_count: expiredCount,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      avg_profit_margin: avgProfitMargin
    };
  }

  static calculateTransactionStats(transactions: SubscriptionTransaction[]): TransactionStats {
    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter(t => t.payment_status === 'completed').length;
    const pendingTransactions = transactions.filter(t => t.payment_status === 'pending').length;
    
    const totalRevenue = transactions
      .filter(t => t.payment_status === 'completed' && t.transaction_type === 'sale')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalProfit = transactions
      .filter(t => t.payment_status === 'completed' && t.transaction_type === 'sale')
      .reduce((sum, t) => sum + (t.profit || 0), 0);

    // معاملات اليوم
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => 
      t.created_at.startsWith(today)
    ).length;
    
    const todayRevenue = transactions
      .filter(t => t.created_at.startsWith(today) && t.payment_status === 'completed' && t.transaction_type === 'sale')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      total_transactions: totalTransactions,
      completed_transactions: completedTransactions,
      pending_transactions: pendingTransactions,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      today_transactions: todayTransactions,
      today_revenue: todayRevenue
    };
  }
}
