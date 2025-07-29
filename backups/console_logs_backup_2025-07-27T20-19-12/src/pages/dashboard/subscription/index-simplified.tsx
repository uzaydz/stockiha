import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Crown, Star, Zap, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { subscriptionCache, SubscriptionData } from '@/lib/subscription-cache';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: string[];
  monthly_price: number;
  yearly_price: number;
  trial_period_days: number;
  limits: {
    max_pos: number | null;
    max_users: number | null;
    max_products: number | null;
  };
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
}

const SubscriptionPage: React.FC = () => {
  const { organization } = useTenant();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activating, setActivating] = useState<string | null>(null);

  // جلب حالة الاشتراك الحالية
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!organization) return;

      try {
        setLoading(true);
        
        // استخدام الخدمة المحسنة للحصول على حالة الاشتراك
        const subscription = await subscriptionCache.getSubscriptionStatus(organization.id);
        setSubscriptionData(subscription);

      } catch (error) {
        toast.error('حدث خطأ في جلب بيانات الاشتراك');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [organization]);

  // جلب خطط الاشتراك المتاحة
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          return;
        }

        // تحويل البيانات لتطابق الواجهة
        const formattedPlans: SubscriptionPlan[] = (data || []).map(plan => ({
          id: plan.id,
          name: plan.name,
          code: plan.code,
          description: plan.description || '',
          features: Array.isArray(plan.features) ? plan.features : [],
          monthly_price: plan.monthly_price,
          yearly_price: plan.yearly_price,
          trial_period_days: plan.trial_period_days,
          limits: {
            max_pos: plan.limits?.max_pos || null,
            max_users: plan.limits?.max_users || null,
            max_products: plan.limits?.max_products || null,
          },
          is_active: plan.is_active,
          is_popular: plan.is_popular,
          display_order: plan.display_order
        }));

        setPlans(formattedPlans);
      } catch (error) {
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (subscription: SubscriptionData) => {
    if (!subscription.success) {
      return <Badge variant="destructive">خطأ</Badge>;
    }

    switch (subscription.status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600">نشط</Badge>;
      case 'trial':
        return <Badge variant="secondary">تجريبي</Badge>;
      case 'expired':
        return <Badge variant="destructive">منتهي الصلاحية</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const getDaysLeftColor = (daysLeft: number, status: string) => {
    if (status === 'expired') return 'text-red-600';
    if (daysLeft <= 7) return 'text-orange-600';
    if (daysLeft <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل بيانات الاشتراك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">إدارة الاشتراك</h1>
        <p className="text-muted-foreground">اختر الخطة المناسبة لعملك</p>
      </div>

      {/* عرض حالة الاشتراك الحالية */}
      {subscriptionData && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              اشتراكك الحالي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{subscriptionData.plan_name}</h3>
                <p className="text-muted-foreground">{subscriptionData.message}</p>
              </div>
              {getStatusBadge(subscriptionData)}
            </div>

            {subscriptionData.success && subscriptionData.status !== 'expired' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className={`w-6 h-6 mx-auto mb-2 ${getDaysLeftColor(subscriptionData.days_left, subscriptionData.status)}`} />
                  <p className="font-semibold text-lg">{subscriptionData.days_left}</p>
                  <p className="text-sm text-muted-foreground">يوم متبقي</p>
                </div>

                {subscriptionData.end_date && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Star className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">{formatDate(subscriptionData.end_date)}</p>
                    <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                  </div>
                )}

                {subscriptionData.subscription_type === 'paid' && subscriptionData.amount_paid && (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Zap className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold">{formatPrice(subscriptionData.amount_paid)}</p>
                    <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
                  </div>
                )}
              </div>
            )}

            {/* عرض حدود الخطة */}
            {subscriptionData.limits && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">حدود الخطة الحالية:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    نقاط البيع: {subscriptionData.limits.max_pos ? subscriptionData.limits.max_pos : 'غير محدود'}
                  </div>
                  <div>
                    المستخدمين: {subscriptionData.limits.max_users ? subscriptionData.limits.max_users : 'غير محدود'}
                  </div>
                  <div>
                    المنتجات: {subscriptionData.limits.max_products ? subscriptionData.limits.max_products : 'غير محدود'}
                  </div>
                </div>
              </div>
            )}

            {/* تحذير إذا كان الاشتراك سينتهي قريباً */}
            {subscriptionData.success && 
             subscriptionData.status !== 'expired' && 
             subscriptionData.days_left <= 7 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm">
                  {subscriptionData.status === 'trial' 
                    ? 'فترتك التجريبية ستنتهي قريباً. يرجى الاشتراك للمتابعة.'
                    : 'اشتراكك سينتهي قريباً. يرجى التجديد لتجنب انقطاع الخدمة.'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* عرض الخطط المتاحة */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">الاشتراك الشهري</TabsTrigger>
          <TabsTrigger value="yearly">الاشتراك السنوي</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary shadow-lg' : ''}`}>
                {plan.is_popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    الأكثر شعبية
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{formatPrice(plan.monthly_price)}</span>
                    <span className="text-muted-foreground">/شهر</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full" 
                    variant={plan.is_popular ? "default" : "outline"}
                    disabled={activating === plan.id}
                  >
                    {activating === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        جاري التفعيل...
                      </>
                    ) : (
                      subscriptionData?.plan_code === plan.code ? 'الخطة الحالية' : 'اختر هذه الخطة'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="yearly" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary shadow-lg' : ''}`}>
                {plan.is_popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    الأكثر شعبية
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{formatPrice(plan.yearly_price)}</span>
                    <span className="text-muted-foreground">/سنة</span>
                    {plan.yearly_price < plan.monthly_price * 12 && (
                      <div className="text-sm text-green-600 mt-1">
                        وفر {formatPrice(plan.monthly_price * 12 - plan.yearly_price)} سنوياً
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full" 
                    variant={plan.is_popular ? "default" : "outline"}
                    disabled={activating === plan.id}
                  >
                    {activating === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        جاري التفعيل...
                      </>
                    ) : (
                      subscriptionData?.plan_code === plan.code ? 'الخطة الحالية' : 'اختر هذه الخطة'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات هامة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• جميع الخطط تشمل فترة تجريبية مجانية لمدة 5 أيام</p>
          <p>• يمكنك ترقية أو تخفيض خطتك في أي وقت</p>
          <p>• الدعم الفني متاح عبر البريد الإلكتروني لجميع الخطط</p>
          <p>• الاشتراك السنوي يوفر عليك حتى شهرين مجاناً</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPage;
