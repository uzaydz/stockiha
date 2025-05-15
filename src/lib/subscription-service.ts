import { supabase } from '@/lib/supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: string[];
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits: {
    max_users?: number;
    max_products?: number;
    max_pos?: number;
  };
  is_active: boolean;
  is_popular?: boolean;
  display_order?: number;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  billing_cycle: 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  payment_method_id: string;
  payment_details: Record<string, any>;
  amount: number;
  plan?: SubscriptionPlan;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description: string;
  instructions: string;
  icon: string;
  fields: {
    name: string;
    type: string;
    label: string;
    required: boolean;
    placeholder: string;
  }[];
}

/**
 * خدمة إدارة الاشتراكات
 */
export const SubscriptionService = {
  /**
   * جلب جميع خطط الاشتراك النشطة
   */
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
    
    return data || [];
  },
  
  /**
   * جلب الاشتراك الحالي للمؤسسة
   */
  async getCurrentSubscription(organizationId: string, subscriptionId: string | null): Promise<Subscription | null> {
    if (!subscriptionId) return null;
    
    const { data, error } = await supabase
      .from('organization_subscriptions')
      .select(`
        *,
        plan:plan_id (
          id, name, code, description, features, 
          monthly_price, yearly_price, trial_period_days, limits
        )
      `)
      .eq('id', subscriptionId)
      .eq('organization_id', organizationId)
      .single();
    
    if (error) {
      console.error('Error fetching current subscription:', error);
      return null;
    }
    
    return data;
  },
  
  /**
   * جلب جميع طرق الدفع المتاحة
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
    
    return data || [];
  },
  
  /**
   * إنشاء اشتراك جديد
   */
  async createSubscription(subscriptionData: {
    organization_id: string;
    plan_id: string;
    billing_cycle: 'monthly' | 'yearly';
    payment_method_id: string;
    payment_details: Record<string, any>;
    amount: number;
  }): Promise<{ id: string }> {
    // حساب تواريخ الاشتراك
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    const endDate = new Date(today);
    if (subscriptionData.billing_cycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    const { data, error } = await supabase
      .from('organization_subscriptions')
      .insert([
        {
          ...subscriptionData,
          status: 'pending',
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0]
        }
      ])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
    
    return data;
  },
  
  /**
   * تفعيل الاشتراك باستخدام كود التفعيل
   */
  async activateWithCode(organizationId: string, code: string): Promise<any> {
    const { data, error } = await supabase.rpc('activate_subscription_with_code', {
      org_id: organizationId,
      code: code.trim()
    });
    
    if (error) {
      console.error('Error activating subscription with code:', error);
      throw error;
    }
    
    return data;
  },
  
  /**
   * التحقق من حالة الفترة التجريبية
   */
  checkTrialStatus(createdAt: string): { isTrialActive: boolean; daysLeft: number } {
    const createdDate = new Date(createdAt);
    const today = new Date();
    
    // تعيين ساعات التاريخين للمقارنة بدون اعتبار الوقت
    const createdDateOnly = new Date(createdDate);
    createdDateOnly.setHours(0, 0, 0, 0);
    
    const todayDateOnly = new Date(today);
    todayDateOnly.setHours(0, 0, 0, 0);
    
    // حساب الفرق بالأيام بين التاريخين
    const diffTime = todayDateOnly.getTime() - createdDateOnly.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // الفترة التجريبية 5 أيام
    const trialDays = 5;
    const remainingDays = trialDays - diffDays;
    
    
    
    return {
      isTrialActive: remainingDays > 0,
      daysLeft: Math.max(0, remainingDays)
    };
  },
  
  /**
   * حساب الأيام المتبقية في الاشتراك
   */
  calculateDaysLeft(endDate: string): number {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  },
  
  /**
   * جلب سجل الاشتراكات للمؤسسة
   */
  async getSubscriptionHistory(organizationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching subscription history:', error);
      throw error;
    }
    
    return data || [];
  }
}; 