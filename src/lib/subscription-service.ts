import { supabase } from '@/lib/supabase';
import type {
  SubscriptionPlanLimits,
  SubscriptionPlanPermissions,
  PlanCode,
  LimitCheckResult,
  SubscriptionSummary
} from '@/types/subscription';

// ============ أنواع الخطط الجديدة ============
export const PLAN_CODES = {
  TRIAL: 'trial',
  STARTER: 'starter_v2',
  GROWTH: 'growth_v2',
  BUSINESS: 'business_v2',
  ENTERPRISE: 'enterprise_v2',
  UNLIMITED: 'unlimited_v2'
} as const;

// ============ الحدود الافتراضية للخطط ============
export const DEFAULT_PLAN_LIMITS: Record<PlanCode, SubscriptionPlanLimits> = {
  trial: {
    max_products: 100,
    max_users: 1,
    max_pos: 1,
    max_branches: 1,
    max_staff: 1,
    max_customers: 100,
    max_suppliers: 10
  },
  starter_v2: {
    max_products: 600,
    max_users: 1,
    max_pos: 1,
    max_branches: 1,
    max_staff: 2,
    max_customers: 500,
    max_suppliers: 50
  },
  growth_v2: {
    max_products: 1000,
    max_users: 3,
    max_pos: 2,
    max_branches: 1,
    max_staff: 5,
    max_customers: 1000,
    max_suppliers: 100
  },
  business_v2: {
    max_products: 5000,
    max_users: 7,
    max_pos: 5,
    max_branches: 2,
    max_staff: 15,
    max_customers: 5000,
    max_suppliers: 300
  },
  enterprise_v2: {
    max_products: null, // غير محدود
    max_users: 15,
    max_pos: 10,
    max_branches: 5,
    max_staff: 50,
    max_customers: null,
    max_suppliers: null
  },
  unlimited_v2: {
    max_products: null,
    max_users: null,
    max_pos: null,
    max_branches: null,
    max_staff: null,
    max_customers: null,
    max_suppliers: null
  }
};

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: PlanCode;
  description: string;
  features: string[];
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits: SubscriptionPlanLimits;
  permissions?: SubscriptionPlanPermissions;
  is_active: boolean;
  is_popular?: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id?: string;
  organization_id: string;
  plan_id: string;
  status?: string;
  billing_cycle?: string;
  start_date?: string;
  end_date: string;
  payment_method?: string; // Matches Supabase database schema
  payment_method_id?: string;
  payment_details?: Record<string, any>;
  payment_reference?: string;
  amount?: number;
  amount_paid?: number;
  currency?: string;
  is_auto_renew?: boolean;
  created_at?: string;
  updated_at?: string;
  plan?: any; // Supabase returns partial plan data
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description: string;
  instructions: string;
  icon: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  fields: any; // Supabase returns Json type
}

interface SubscriptionValidationResult {
  isValid: boolean;
  status: 'active' | 'trial' | 'expired' | 'error';
  message: string;
  daysLeft?: number;
  planName?: string;
  source: 'subscription' | 'trial' | 'cache' | 'organization';
}

// تخزين مؤقت محسّن لنتائج حساب الأيام المتبقية
let daysLeftCache: { [key: string]: { data: any, timestamp: number } } = {};
const DAYS_LEFT_CACHE_DURATION = 15 * 60 * 1000; // 15 دقيقة بدلاً من دقيقتين

// تخزين مؤقت إضافي لنتائج RPC function
let subscriptionDetailsCache: { [key: string]: { data: any, timestamp: number } } = {};
const SUBSCRIPTION_DETAILS_CACHE_DURATION = 20 * 60 * 1000; // 20 دقيقة لتقليل استدعاءات RPC

/**
 * تنظيف الكاش المنتهي الصلاحية
 */
const cleanExpiredCache = () => {
  const now = Date.now();

  // تنظيف كاش الأيام المتبقية
  Object.keys(daysLeftCache).forEach(key => {
    if (now - daysLeftCache[key].timestamp > DAYS_LEFT_CACHE_DURATION) {
      delete daysLeftCache[key];
    }
  });

  // تنظيف كاش تفاصيل الاشتراك
  Object.keys(subscriptionDetailsCache).forEach(key => {
    if (now - subscriptionDetailsCache[key].timestamp > SUBSCRIPTION_DETAILS_CACHE_DURATION) {
      delete subscriptionDetailsCache[key];
    }
  });
};

// تنظيف الكاش المنتهي الصلاحية كل 10 دقائق
setInterval(cleanExpiredCache, 10 * 60 * 1000);

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
    billing_cycle?: string;
    payment_method: string;
    payment_details?: Record<string, any>;
    amount_paid: number;
    payment_reference?: string;
    currency?: string;
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
          organization_id: subscriptionData.organization_id,
          plan_id: subscriptionData.plan_id,
          billing_cycle: subscriptionData.billing_cycle,
          payment_method: subscriptionData.payment_method,
          payment_details: subscriptionData.payment_details || {},
          amount_paid: subscriptionData.amount_paid,
          payment_reference: subscriptionData.payment_reference || '',
          currency: subscriptionData.currency || 'USD',
          status: 'pending',
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0],
          is_auto_renew: true
        }
      ])
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data;
  },
  
  /**
   * تفعيل الاشتراك باستخدام كود التفعيل
   */
  async activateWithCode(organizationId: string, code: string): Promise<any> {
    const { data, error } = await (supabase as any).rpc('activate_subscription_with_code', {
      org_id: organizationId,
      code: code.trim()
    });

    if (error) {
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
      throw error;
    }
    
    return data || [];
  },

  /**
   * التحقق من صحة الاشتراك بشكل موثوق مع عدة مصادر
   */
  async validateSubscriptionReliably(
    organizationId: string,
    organizationData: any,
    cachedSubscriptions?: any[],
    fallbackToCache: boolean = true
  ): Promise<SubscriptionValidationResult> {
    try {
      // المحاولة الأولى: استخدام الدالة المحسنة الجديدة
      try {
        const { data, error } = await (supabase as any).rpc('check_organization_subscription_enhanced', {
          org_id: organizationId
        });

        if (!error && data && data.success) {
          const daysLeft = data.days_left || 0;
          return {
            isValid: data.status === 'active' || data.status === 'trial',
            status: data.status,
            message: data.message,
            daysLeft,
            planName: data.plan_name,
            source: 'subscription'
          };
        }
      } catch (enhancedError) {
      }

      // المحاولة الثانية: استخدام البيانات المرسلة (cachedSubscriptions)
      if (cachedSubscriptions && cachedSubscriptions.length > 0) {
        const subscription = cachedSubscriptions[0];
        const endDate = new Date(subscription.end_date);
        const now = new Date();
        
        if (endDate > now) {
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            isValid: true,
            status: 'active',
            message: `اشتراك نشط في الخطة ${subscription.plan?.name || 'غير محدد'}`,
            daysLeft,
            planName: subscription.plan?.name,
            source: 'subscription'
          };
        }
      }

      // المحاولة الثالثة: التحقق مباشرة من قاعدة البيانات
      const { data: directSubscriptions, error: directError } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          plan:plan_id(id, name, code)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!directError && directSubscriptions && directSubscriptions.length > 0) {
        const subscription = directSubscriptions[0];
        const endDate = new Date(subscription.end_date);
        const now = new Date();
        
        if (endDate > now) {
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            isValid: true,
            status: 'active',
            message: `اشتراك نشط في الخطة ${subscription.plan?.name || 'غير محدد'}`,
            daysLeft,
            planName: subscription.plan?.name,
            source: 'subscription'
          };
        }
      }

      // المحاولة الثالثة: التحقق من الفترة التجريبية
      if (organizationData) {
        let isTrialActive = false;
        let daysLeft = 0;
        
        // التحقق من تاريخ انتهاء الفترة التجريبية المخزن في settings
        if (organizationData.settings?.trial_end_date) {
          const trialEndDate = new Date(organizationData.settings.trial_end_date);
          const now = new Date();
          
          const trialEndDateOnly = new Date(trialEndDate.setHours(23, 59, 59));
          const nowDateOnly = new Date(now.setHours(0, 0, 0));
          
          isTrialActive = trialEndDateOnly >= nowDateOnly;
          daysLeft = Math.ceil((trialEndDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          // استخدام الطريقة القديمة كاحتياط
          const trialResult = this.checkTrialStatus(organizationData.created_at);
          isTrialActive = trialResult.isTrialActive;
          daysLeft = trialResult.daysLeft;
        }
        
        if (isTrialActive) {
          return {
            isValid: true,
            status: 'trial',
            message: `الفترة التجريبية سارية (${daysLeft} يوم متبقية)`,
            daysLeft,
            source: 'trial'
          };
        }
      }

      // المحاولة الرابعة: التحقق من البيانات الموجودة في المؤسسة كـ fallback
      if (organizationData?.subscription_status === 'active' && organizationData?.subscription_id) {
        return {
          isValid: true,
          status: 'active',
          message: 'اشتراك نشط (بناءً على بيانات المؤسسة)',
          source: 'organization'
        };
      }

      // المحاولة الخامسة: التحقق من التخزين المؤقت
      if (fallbackToCache) {
        try {
          const cachedData = localStorage.getItem('bazaar_auth_subscription');
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (parsed.isActive && parsed.endDate) {
              const endDate = new Date(parsed.endDate);
              const now = new Date();
              
              if (endDate > now) {
                return {
                  isValid: true,
                  status: 'active',
                  message: 'اشتراك نشط (من البيانات المحفوظة)',
                  source: 'cache'
                };
              }
            }
          }
        } catch (cacheError) {
        }
      }

      // لا يوجد اشتراك صالح
      return {
        isValid: false,
        status: 'expired',
        message: 'لا يوجد اشتراك نشط أو انتهت الفترة التجريبية',
        source: 'subscription'
      };

    } catch (error) {
      
      // في حالة الخطأ، تحقق من بيانات المؤسسة كحل أخير
      if (organizationData?.subscription_status === 'active' || organizationData?.subscription_status === 'trial') {
        return {
          isValid: true,
          status: organizationData.subscription_status,
          message: 'تم السماح بالوصول بناءً على بيانات المؤسسة (خطأ في التحقق)',
          source: 'organization'
        };
      }

      return {
        isValid: false,
        status: 'error',
        message: 'خطأ في التحقق من الاشتراك',
        source: 'subscription'
      };
    }
  },

  /**
   * حساب الأيام المتبقية الإجمالية للمؤسسة (فترة تجريبية + اشتراك)
   * الحل النهائي الشامل مع إصلاح مشكلة Cache
   */
  async calculateTotalDaysLeft(
    organizationData: any,
    currentSubscription?: any
  ): Promise<{
    totalDaysLeft: number;
    trialDaysLeft: number;
    subscriptionDaysLeft: number;
    status: 'trial' | 'active' | 'expired';
    message: string;
  }> {
    
    // فحص التخزين المؤقت أولاً
    const cacheKey = `days_left_${organizationData.id}`;
    const cachedResult = daysLeftCache[cacheKey];
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < DAYS_LEFT_CACHE_DURATION) {
      return cachedResult.data;
    }
    
    let trialDaysLeft = 0;
    let subscriptionDaysLeft = 0;
    let status: 'trial' | 'active' | 'expired' = 'expired';
    let message = '';

    // أولاً: التحقق من وجود اشتراك نشط باستخدام RPC function مع كاش محسّن
    try {
      // فحص الكاش أولاً لتجنب استدعاء RPC المتكرر
      const subscriptionCacheKey = `subscription_details_${organizationData.id}`;
      const cachedSubscription = subscriptionDetailsCache[subscriptionCacheKey];

      let subscriptionData, error;

      if (cachedSubscription && (Date.now() - cachedSubscription.timestamp) < SUBSCRIPTION_DETAILS_CACHE_DURATION) {
        // استخدام البيانات من الكاش
        subscriptionData = cachedSubscription.data;
        error = null;
      } else {
        // استدعاء RPC function إذا لم تكن البيانات في الكاش أو انتهت صلاحيتها
        const result = await (supabase as any).rpc('get_organization_subscription_details', {
          org_id: organizationData.id
        });
        subscriptionData = result.data;
        error = result.error;

        // حفظ النتيجة في الكاش إذا كانت ناجحة
        if (!error && subscriptionData) {
          subscriptionDetailsCache[subscriptionCacheKey] = {
            data: subscriptionData,
            timestamp: Date.now()
          };
        }
      }

      // التحقق من وجود اشتراك نشط صحيح
      if (error) {
      } else if (subscriptionData && subscriptionData.subscription_id) {
        const endDate = new Date(subscriptionData.end_date);
        const now = new Date();
        
        if (endDate > now && subscriptionData.status === 'active') {
          subscriptionDaysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // إذا كان هناك اشتراك نشط، فهو الأولوية
          const result = {
            totalDaysLeft: subscriptionDaysLeft,
            trialDaysLeft: 0,
            subscriptionDaysLeft,
            status: 'active' as const,
            message: `اشتراك نشط - ${subscriptionDaysLeft} يوم متبقية`
          };
          
          // حفظ في التخزين المؤقت
          daysLeftCache[cacheKey] = {
            data: result,
            timestamp: Date.now()
          };
          
          return result;
        }
      } else {
      }
    } catch (error) {
    }

    // ثانياً: حساب أيام الفترة التجريبية إذا لم يكن هناك اشتراك نشط
    if (organizationData?.settings?.trial_end_date) {
      const trialEndDate = new Date(organizationData.settings.trial_end_date);
      const now = new Date();
      
      const trialEndDateOnly = new Date(trialEndDate.setHours(23, 59, 59));
      const nowDateOnly = new Date(now.setHours(0, 0, 0, 0));
      
      if (trialEndDateOnly >= nowDateOnly) {
        trialDaysLeft = Math.ceil((trialEndDateOnly.getTime() - nowDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // تحديد الحالة والرسالة النهائية
    if (subscriptionDaysLeft > 0) {
      status = 'active';
      message = `اشتراك نشط - ${subscriptionDaysLeft} يوم متبقية`;
    } else if (trialDaysLeft > 0) {
      status = 'trial';
      message = `فترة تجريبية - ${trialDaysLeft} يوم متبقية`;
    } else {
      status = 'expired';
      message = 'انتهت صلاحية الاشتراك';
    }

    const result = {
      totalDaysLeft: Math.max(subscriptionDaysLeft, trialDaysLeft),
      trialDaysLeft,
      subscriptionDaysLeft,
      status,
      message
    };

    // حفظ في التخزين المؤقت
    daysLeftCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    return result;
  },

  /**
   * دالة مساعدة للتحقق من حالة الاشتراك مباشرة من قاعدة البيانات
   * تُستخدم كـ fallback في حالة فشل الطريقة الأساسية
   */
  async getActiveSubscriptionDirect(organizationId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  // ============ دوال الحدود الجديدة ============

  /**
   * جلب حدود المؤسسة من الخطة الحالية
   */
  async getOrganizationLimits(organizationId: string): Promise<SubscriptionPlanLimits | null> {
    try {
      const { data, error } = await (supabase as any).rpc('get_organization_limits', {
        org_id: organizationId
      });

      if (error) {
        console.error('Error fetching organization limits:', error);
        return null;
      }

      return data as SubscriptionPlanLimits;
    } catch (error) {
      console.error('Exception fetching organization limits:', error);
      return null;
    }
  },

  /**
   * التحقق من حد المنتجات
   */
  async checkProductLimit(organizationId: string): Promise<LimitCheckResult> {
    try {
      const { data, error } = await (supabase as any).rpc('check_product_limit', {
        org_id: organizationId
      });

      if (error) {
        console.error('Error checking product limit:', error);
        return {
          allowed: false,
          current: 0,
          limit: 0,
          unlimited: false
        };
      }

      return {
        allowed: data.allowed,
        current: data.current_count,
        limit: data.max_limit,
        remaining: data.remaining,
        unlimited: data.unlimited
      };
    } catch (error) {
      console.error('Exception checking product limit:', error);
      return {
        allowed: false,
        current: 0,
        limit: 0,
        unlimited: false
      };
    }
  },

  /**
   * التحقق من حد المستخدمين
   */
  async checkUserLimit(organizationId: string): Promise<LimitCheckResult> {
    try {
      const { data, error } = await (supabase as any).rpc('check_user_limit', {
        org_id: organizationId
      });

      if (error) {
        console.error('Error checking user limit:', error);
        return {
          allowed: false,
          current: 0,
          limit: 0,
          unlimited: false
        };
      }

      return {
        allowed: data.allowed,
        current: data.current_count,
        limit: data.max_limit,
        remaining: data.remaining,
        unlimited: data.unlimited
      };
    } catch (error) {
      console.error('Exception checking user limit:', error);
      return {
        allowed: false,
        current: 0,
        limit: 0,
        unlimited: false
      };
    }
  },

  /**
   * جلب ملخص الاشتراك مع الاستخدام الحالي
   */
  async getSubscriptionSummary(organizationId: string): Promise<SubscriptionSummary | null> {
    try {
      const { data, error } = await (supabase as any).rpc('get_subscription_summary', {
        org_id: organizationId
      });

      if (error) {
        console.error('Error fetching subscription summary:', error);
        return null;
      }

      return {
        plan_name: data.plan_name,
        status: data.status,
        end_date: data.end_date,
        days_remaining: data.days_remaining,
        limits: data.limits,
        usage: {
          products: data.usage?.products || 0,
          users: data.usage?.users || 0
        }
      };
    } catch (error) {
      console.error('Exception fetching subscription summary:', error);
      return null;
    }
  },

  /**
   * التحقق من حد معين (generic)
   */
  async checkLimit(
    organizationId: string,
    limitType: keyof SubscriptionPlanLimits,
    currentCount: number
  ): Promise<LimitCheckResult> {
    const limits = await this.getOrganizationLimits(organizationId);

    if (!limits) {
      return {
        allowed: false,
        current: currentCount,
        limit: 0,
        unlimited: false
      };
    }

    const maxLimit = limits[limitType];
    const unlimited = maxLimit === null;
    const allowed = unlimited || currentCount < (maxLimit || 0);
    const remaining = unlimited ? undefined : Math.max(0, (maxLimit || 0) - currentCount);

    return {
      allowed,
      current: currentCount,
      limit: maxLimit,
      remaining,
      unlimited
    };
  },

  /**
   * جلب الحدود من كود الخطة مباشرة (للاستخدام المحلي/Offline)
   */
  getLimitsFromPlanCode(planCode: PlanCode): SubscriptionPlanLimits {
    return DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial;
  },

  /**
   * التحقق من إمكانية إضافة منتج جديد محلياً
   */
  canAddProduct(planCode: PlanCode, currentProductCount: number): LimitCheckResult {
    const limits = this.getLimitsFromPlanCode(planCode);
    const maxProducts = limits.max_products;
    const unlimited = maxProducts === null;
    const allowed = unlimited || currentProductCount < (maxProducts || 0);

    return {
      allowed,
      current: currentProductCount,
      limit: maxProducts,
      remaining: unlimited ? undefined : Math.max(0, (maxProducts || 0) - currentProductCount),
      unlimited
    };
  },

  /**
   * التحقق من إمكانية إضافة مستخدم جديد محلياً
   */
  canAddUser(planCode: PlanCode, currentUserCount: number): LimitCheckResult {
    const limits = this.getLimitsFromPlanCode(planCode);
    const maxUsers = limits.max_users;
    const unlimited = maxUsers === null;
    const allowed = unlimited || currentUserCount < (maxUsers || 0);

    return {
      allowed,
      current: currentUserCount,
      limit: maxUsers,
      remaining: unlimited ? undefined : Math.max(0, (maxUsers || 0) - currentUserCount),
      unlimited
    };
  },

  /**
   * الحصول على رسالة الحد المناسبة بالعربية
   */
  getLimitMessage(limitType: string, result: LimitCheckResult): string {
    const limitNames: Record<string, string> = {
      max_products: 'المنتجات',
      max_users: 'المستخدمين',
      max_pos: 'نقاط البيع',
      max_branches: 'الفروع',
      max_staff: 'الموظفين',
      max_customers: 'العملاء',
      max_suppliers: 'الموردين'
    };

    const name = limitNames[limitType] || limitType;

    if (result.unlimited) {
      return `عدد ${name} غير محدود`;
    }

    if (result.allowed) {
      return `يمكنك إضافة ${result.remaining} ${name} إضافية (${result.current}/${result.limit})`;
    }

    return `لقد وصلت للحد الأقصى من ${name} (${result.limit}). يرجى ترقية خطتك.`;
  }
};
