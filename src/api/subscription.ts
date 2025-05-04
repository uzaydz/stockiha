import { SubscriptionPlan } from '@/types/subscription';

// مجموعة خطط الاشتراك الافتراضية كبديل للحصول عليها من واجهة برمجة التطبيقات
const defaultPlans: SubscriptionPlan[] = [
  {
    id: '1',
    code: 'basic',
    name: 'الخطة الأساسية',
    description: 'مثالية للشركات الصغيرة والناشئة',
    monthly_price: 5990,
    yearly_price: 59900,
    trial_period_days: 5,
    features: [
      'نقطة بيع واحدة',
      'إدارة المخزون الأساسية',
      'تقارير المبيعات الأساسية',
      'إدارة حتى 3 مستخدمين',
      'دعم فني عبر البريد الإلكتروني'
    ],
    limits: {
      max_products: 500,
      max_users: 3,
      max_pos: 1
    },
    is_popular: false,
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    code: 'premium',
    name: 'الخطة المتميزة',
    description: 'الأمثل للشركات المتوسطة والنامية',
    monthly_price: 14990,
    yearly_price: 149900,
    trial_period_days: 5,
    features: [
      'نقاط بيع متعددة',
      'إدارة مخزون متقدمة',
      'تقارير تحليلية مفصلة',
      'إدارة حتى 10 مستخدمين',
      'دعم فني على مدار الساعة'
    ],
    limits: {
      max_products: 5000,
      max_users: 10,
      max_pos: 5
    },
    is_popular: true,
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    code: 'enterprise',
    name: 'خطة المؤسسات',
    description: 'مخصصة للشركات الكبيرة والمتطلبات الخاصة',
    monthly_price: 29990,
    yearly_price: 299900,
    trial_period_days: 5,
    features: [
      'عدد غير محدود من نقاط البيع',
      'إدارة مخزون متقدمة مع تنبؤات',
      'لوحة تحكم تحليلية متكاملة',
      'عدد غير محدود من المستخدمين',
      'مدير حساب مخصص'
    ],
    limits: {
      max_products: null,
      max_users: null,
      max_pos: null
    },
    is_popular: false,
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * استرجاع خطط الاشتراك من واجهة برمجة التطبيقات
 * حالياً يستخدم بيانات ثابتة لأغراض العرض
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  // في بيئة الإنتاج، سنقوم بجلب البيانات من الخادم
  // return await api.get('/subscription/plans').then(res => res.data);
  
  // لأغراض التطوير، نقوم بتأخير تقليدي
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(defaultPlans);
    }, 800);  // محاكاة تأخير الشبكة
  });
};

/**
 * الاشتراك في خطة معينة
 */
export const subscribeToplan = async (planId: string, billingPeriod: 'monthly' | 'yearly'): Promise<any> => {
  // في بيئة الإنتاج، سنرسل البيانات إلى الخادم
  // return await api.post('/subscription/subscribe', { planId, billingPeriod });
  
  // لأغراض التطوير، نقوم بتأخير تقليدي ورجوع بيانات ثابتة
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'تم الاشتراك بنجاح',
        subscriptionId: 'sub_123456789',
        planId,
        billingPeriod
      });
    }, 1000);
  });
}; 