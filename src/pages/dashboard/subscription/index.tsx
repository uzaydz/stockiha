import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Crown, Star, Zap, Clock, AlertTriangle, Loader2, ShoppingCart, RefreshCw, FileText, Calendar, DollarSign, User, Phone, Mail } from 'lucide-react';
import { subscriptionCache, SubscriptionData } from '@/lib/subscription-cache';
import { toast } from 'sonner';
import ActivateWithCode from './ActivateWithCode';
import OnlineOrdersLimitCard from '@/components/subscription/OnlineOrdersLimitCard';
import OnlineOrdersRechargeModal from '@/components/dashboard/OnlineOrdersRechargeModal';
import SubscriptionDialog from '@/components/subscription/SubscriptionDialog';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { getMySubscriptionRequests } from '@/lib/subscription-requests-service';

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
  max_online_orders?: number;
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
}

interface SubscriptionPageProps extends POSSharedLayoutControls {}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ useStandaloneLayout = true } = {}) => {
  const { organization } = useAuth();
  const { refreshOrganizationData } = useTenant();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const refreshSubscriptionData = useCallback(async (
    options: { force?: boolean; showLoader?: boolean } = {}
  ) => {
    if (!organization) return;

    const { force = false, showLoader = true } = options;

    try {
      if (showLoader) setLoading(true);

      let subscription = force
        ? await subscriptionCache.forceRefresh(organization.id)
        : await subscriptionCache.getSubscriptionStatus(organization.id);

      if (organization.subscription_status === 'pending' && subscription.status === 'expired') {
        subscription = {
          ...subscription,
          status: 'pending' as SubscriptionData['status'],
          message: 'طلب الاشتراك قيد المراجعة'
        };
      }

      setSubscriptionData(subscription);
    } catch (error) {
      toast.error('حدث خطأ في جلب بيانات الاشتراك');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [organization]);

  // جلب حالة الاشتراك الحالية
  useEffect(() => {
    refreshSubscriptionData();
  }, [refreshSubscriptionData]);

  // جلب طلبات الاشتراك الخاصة بالمؤسسة
  useEffect(() => {
    const fetchSubscriptionRequests = async () => {
      try {
        setLoadingRequests(true);
        const requests = await getMySubscriptionRequests();
        setSubscriptionRequests(requests);
      } catch (error) {
        console.error('Error fetching subscription requests:', error);
      } finally {
        setLoadingRequests(false);
      }
    };

    if (organization) {
      fetchSubscriptionRequests();
    }
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
          features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : [],
          monthly_price: plan.monthly_price,
          yearly_price: plan.yearly_price,
          trial_period_days: plan.trial_period_days,
          limits: {
            max_pos: (plan.limits as any)?.max_pos || null,
            max_users: (plan.limits as any)?.max_users || null,
            max_products: (plan.limits as any)?.max_products || null,
          },
          max_online_orders: (plan as any).max_online_orders,
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

  const handlePlanSelection = (plan: SubscriptionPlan, billingCycle: 'monthly' | 'yearly') => {
    if (!organization) {
      toast.error('لا توجد مؤسسة نشطة');
      return;
    }

    setSelectedPlan(plan);
    setSelectedBillingCycle(billingCycle);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPlan(null);
    }
  };

  const handleSubscriptionCompleted = async () => {
    if (!organization) {
      handleDialogOpenChange(false);
      return;
    }

    setRefreshingSubscription(true);
    handleDialogOpenChange(false);

    try {
      await refreshSubscriptionData({ force: true, showLoader: false });
      if (refreshOrganizationData) {
        await refreshOrganizationData();
      }
      toast.success('تم تحديث بيانات الاشتراك');
    } catch (error) {
      toast.error('تعذر تحديث بيانات الاشتراك');
    } finally {
      setRefreshingSubscription(false);
    }
  };

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
        return <Badge className="bg-green-600">نشط</Badge>;
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
    if (daysLeft === -1) return 'text-primary';
    if (daysLeft <= 7) return 'text-orange-600';
    if (daysLeft <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">قيد المراجعة</Badge>;
      case 'approved':
        return <Badge className="bg-green-600">تم القبول</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    const loadingContent = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري تحميل بيانات الاشتراك...</p>
        </div>
      </div>
    );

    return useStandaloneLayout ? <Layout>{loadingContent}</Layout> : loadingContent;
  }

  const content = (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">إدارة الاشتراك</h1>
        <p className="text-muted-foreground">اختر الخطة المناسبة لعملك</p>
      </div>

      {/* عرض حالة الاشتراك الحالية */}
      {subscriptionData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                اشتراكك الحالي
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshSubscriptionData({ force: true })}
                disabled={loading || refreshingSubscription}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    تحديث...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    تحديث البيانات
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-xl mb-1">{subscriptionData.plan_name}</h3>
                <p className="text-muted-foreground">{subscriptionData.message}</p>
              </div>
              {getStatusBadge(subscriptionData)}
            </div>

            {subscriptionData.success && subscriptionData.status !== 'expired' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Clock className={`w-6 h-6 mx-auto mb-2 ${getDaysLeftColor(subscriptionData.days_left, subscriptionData.status)}`} />
                  <p className="font-semibold text-lg">
                    {subscriptionData.days_left === -1 ? 'غير محدود' : subscriptionData.days_left}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionData.days_left === -1 ? 'اشتراك دائم' : 'يوم متبقي'}
                  </p>
                </div>

                {subscriptionData.end_date && (
                  <div className="text-center p-4 border rounded-lg">
                    <Star className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">{formatDate(subscriptionData.end_date)}</p>
                    <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                  </div>
                )}

                {subscriptionData.subscription_type === 'paid' && subscriptionData.amount_paid && (
                  <div className="text-center p-4 border rounded-lg">
                    <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="font-semibold">{formatPrice(subscriptionData.amount_paid)}</p>
                    <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
                  </div>
                )}
              </div>
            )}

            {/* عرض حدود الخطة */}
            {subscriptionData.limits && (
              <div className="space-y-4">
                <h4 className="font-semibold">حدود الخطة الحالية:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">نقاط البيع</p>
                      <p className="font-medium">{subscriptionData.limits.max_pos || 'غير متاحة'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">المستخدمين</p>
                      <p className="font-medium">{subscriptionData.limits.max_users || 'غير محدود'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Star className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">المنتجات</p>
                      <p className="font-medium">{subscriptionData.limits.max_products || 'غير محدود'}</p>
                    </div>
                  </div>
                </div>

                {/* عرض حدود الطلبيات الإلكترونية */}
                {subscriptionData.subscription_type === 'paid' && subscriptionData.plan_code === 'ecommerce_starter' && (
                  <div className="space-y-4">
                    <OnlineOrdersLimitCard compact />

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">إعادة شحن الطلبيات الإلكترونية</h4>
                          <p className="text-sm text-muted-foreground">أضف المزيد من الطلبيات لخطتك الحالية</p>
                        </div>
                      </div>
                      <Button onClick={() => setShowRechargeModal(true)}>
                        إعادة الشحن الآن
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* تحذير انتهاء الاشتراك */}
            {subscriptionData.success &&
             subscriptionData.status !== 'expired' &&
             subscriptionData.days_left !== -1 &&
             subscriptionData.days_left <= 7 && (
              <div className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-orange-900">
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

      {/* قسم سجل طلبات الاشتراك */}
      {subscriptionRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              سجل طلبات الاشتراك
            </CardTitle>
            <CardDescription>
              عرض جميع طلبات الاشتراك الخاصة بمؤسستك وحالتها
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="mr-2 text-muted-foreground">جاري تحميل الطلبات...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptionRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">
                            {request.plan?.name || 'باقة غير محددة'}
                          </h4>
                          {getRequestStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>{formatPrice(request.amount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* معلومات الاتصال */}
                    {(request.contact_name || request.contact_email || request.contact_phone) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
                        {request.contact_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{request.contact_name}</span>
                          </div>
                        )}
                        {request.contact_email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{request.contact_email}</span>
                          </div>
                        )}
                        {request.contact_phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{request.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* معلومات الدفع */}
                    {request.payment_method && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground mb-1">طريقة الدفع:</p>
                        <p className="text-sm font-medium">{request.payment_method}</p>
                        {request.payment_reference && (
                          <p className="text-xs text-muted-foreground mt-1">
                            الرقم المرجعي: {request.payment_reference}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ملاحظات العميل */}
                    {request.customer_notes && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground mb-1">ملاحظاتك:</p>
                        <p className="text-sm">{request.customer_notes}</p>
                      </div>
                    )}

                    {/* ملاحظات الإدارة */}
                    {request.admin_notes && (
                      <div className="pt-3 border-t bg-primary/5 p-3 rounded">
                        <p className="text-sm font-medium mb-1">رد الإدارة:</p>
                        <p className="text-sm">{request.admin_notes}</p>
                      </div>
                    )}

                    {/* سبب الرفض */}
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="pt-3 border-t bg-red-50 p-3 rounded">
                        <p className="text-sm text-red-900 font-medium mb-1">سبب الرفض:</p>
                        <p className="text-sm text-red-800">{request.rejection_reason}</p>
                      </div>
                    )}

                    {/* تاريخ المراجعة */}
                    {request.reviewed_at && (
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          تمت المراجعة في: {formatDate(request.reviewed_at)}
                          {request.reviewed_by_user?.name && ` بواسطة: ${request.reviewed_by_user.name}`}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* قسم تفعيل بكود */}
      <Card>
        <CardHeader>
          <CardTitle>تفعيل بكود التفعيل</CardTitle>
          <CardDescription>
            إذا كان لديك كود تفعيل، يمكنك استخدامه لتفعيل اشتراكك مباشرة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivateWithCode
            onActivated={async () => {
              if (!organization) return;
              await refreshSubscriptionData({ force: true, showLoader: false });
              if (refreshOrganizationData) {
                await refreshOrganizationData();
              }
            }}
          />
        </CardContent>
      </Card>

      {/* عرض الخطط المتاحة */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">الاشتراك الشهري</TabsTrigger>
          <TabsTrigger value="yearly">الاشتراك السنوي</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary border-2' : ''}`}>
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
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}

                    {plan.code === 'ecommerce_starter' && plan.max_online_orders && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingCart className="w-4 h-4" />
                          <span className="text-sm font-medium">مثالية للتجارة الإلكترونية</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {plan.max_online_orders} طلبية إلكترونية شهرياً
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    variant={plan.is_popular ? 'default' : 'outline'}
                    onClick={() => handlePlanSelection(plan, 'monthly')}
                    disabled={
                      refreshingSubscription ||
                      (subscriptionData?.plan_code === plan.code && subscriptionData?.billing_cycle === 'monthly')
                    }
                  >
                    {subscriptionData?.plan_code === plan.code && subscriptionData?.billing_cycle === 'monthly'
                      ? 'الخطة الحالية'
                      : 'اختر هذه الخطة'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="yearly" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? 'border-primary border-2' : ''}`}>
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
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    variant={plan.is_popular ? 'default' : 'outline'}
                    onClick={() => handlePlanSelection(plan, 'yearly')}
                    disabled={
                      refreshingSubscription ||
                      (subscriptionData?.plan_code === plan.code && subscriptionData?.billing_cycle === 'yearly')
                    }
                  >
                    {subscriptionData?.plan_code === plan.code && subscriptionData?.billing_cycle === 'yearly'
                      ? 'الخطة الحالية'
                      : 'اختر هذه الخطة'}
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

      {/* نافذة إعادة الشحن */}
      <OnlineOrdersRechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
      />

      {organization && selectedPlan && (
        <SubscriptionDialog
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
          plan={selectedPlan}
          billingCycle={selectedBillingCycle}
          organizationId={organization.id}
          isRenewal={
            subscriptionData?.plan_code === selectedPlan.code &&
            subscriptionData?.billing_cycle === selectedBillingCycle
          }
          onSubscriptionComplete={handleSubscriptionCompleted}
        />
      )}
    </div>
  );

  return useStandaloneLayout ? <Layout>{content}</Layout> : content;
};

export default SubscriptionPage;
