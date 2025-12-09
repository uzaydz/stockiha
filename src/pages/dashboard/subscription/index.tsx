import React, { useState, useEffect } from 'react';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check, Clock, Loader2, RefreshCw,
  Users, Package, Store as StoreIcon, Shield,
  Wifi, WifiOff, Zap, HardDrive, History, Key,
  Receipt, BarChart3, Star, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import ActivateWithCode from './ActivateWithCode';
import OnlineOrdersRechargeModal from '@/components/dashboard/OnlineOrdersRechargeModal';
import SubscriptionDialog from '@/components/subscription/SubscriptionDialog';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { getMySubscriptionRequests } from '@/lib/subscription-requests-service';
import { cn } from '@/lib/utils';
import { useOfflineSubscription } from '@/hooks/useOfflineSubscription';
import { motion } from 'framer-motion';

// --- Types ---
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
    max_branches: number | null;
  };
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
}

interface SubscriptionPageProps extends POSSharedLayoutControls { }

// --- Components ---

const StatItem = ({ label, value, limit, icon: Icon, colorClass = "text-slate-400" }: { label: string, value: number, limit: number | null, icon: any, colorClass?: string }) => {
  const percentage = limit ? Math.min((value / limit) * 100, 100) : 0;
  const isUnlimited = limit === null;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-card dark:bg-[#0a101f] border border-border dark:border-slate-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md bg-muted dark:bg-[#050b15]", colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
        </div>
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
          {isUnlimited ? '∞' : `${value} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 w-full bg-slate-100 dark:bg-[#050b15] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={cn("h-full rounded-full transition-all duration-500",
              percentage > 90 ? "bg-red-500" :
                percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
        </div>
      )}
    </div>
  );
};

const PlanCard = ({
  plan,
  isCurrent,
  billingCycle,
  onSelect
}: {
  plan: SubscriptionPlan,
  isCurrent: boolean,
  billingCycle: 'monthly' | 'yearly',
  onSelect: (plan: SubscriptionPlan) => void
}) => {
  const price = billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price;

  return (
    <div className={cn(
      "relative flex flex-col p-6 rounded-2xl transition-all duration-300 group overflow-hidden",
      "bg-card dark:bg-[#0f172a] border",
      isCurrent
        ? "border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/5 shadow-xl shadow-emerald-500/10"
        : plan.is_popular
          ? "border-orange-500/50 hover:border-orange-500 shadow-xl shadow-orange-500/5 dark:shadow-orange-900/10 scale-[1.02] z-10"
          : "border-border hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700"
    )}>

      {/* Decorative Gradient Background for Popular Plans */}
      {plan.is_popular && !isCurrent && (
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
      )}

      {/* Popular Badge */}
      {plan.is_popular && !isCurrent && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
      )}

      {/* Ribbon for Popular Plan */}
      {plan.is_popular && !isCurrent && (
        <div className="absolute top-5 -right-12 rotate-45 bg-orange-500 text-white text-[9px] font-bold px-10 py-1 shadow-sm z-20">
          الأفضل
        </div>
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          {/* Badges */}
          {isCurrent && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-2 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10">
              <Check className="w-3 h-3" /> الباقة الحالية
            </span>
          )}
          <h3 className={cn(
            "text-xl font-bold transition-colors mt-1",
            isCurrent ? "text-emerald-700 dark:text-emerald-400" :
              plan.is_popular ? "text-foreground dark:text-white group-hover:text-orange-500" :
                "text-foreground dark:text-white"
          )}>
            {plan.name}
          </h3>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-inner",
          isCurrent ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
            plan.is_popular ? "bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500" :
              "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
        )}>
          <StoreIcon className="w-5 h-5" />
        </div>
      </div>

      <div className="mb-6 relative z-10 min-h-[40px]">
        <p className="text-xs text-muted-foreground dark:text-slate-400 line-clamp-2 leading-relaxed">
          {plan.description}
        </p>
      </div>

      <div className="mb-8 flex items-baseline gap-1 relative z-10 pb-6 border-b border-border dark:border-slate-800/50 border-dashed">
        <span className="text-4xl font-black text-foreground dark:text-white tracking-tighter">
          {new Intl.NumberFormat('ar-DZ').format(price)}
        </span>
        <div className="flex flex-col text-xs font-medium text-muted-foreground dark:text-slate-500 mt-1">
          <span>د.ج</span>
          <span>/{billingCycle === 'monthly' ? 'شهر' : 'سنة'}</span>
        </div>
      </div>

      <div className="space-y-4 mb-8 flex-1 relative z-10">
        {plan.features.slice(0, 6).map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3 group/item">
            <div className={cn(
              "mt-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] shadow-sm",
              isCurrent ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover/item:bg-orange-500 group-hover/item:text-white transition-all"
            )}>
              <Check className="w-2.5 h-2.5" />
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight group-hover/item:text-foreground dark:group-hover/item:text-white transition-colors font-medium">
              {feature}
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onSelect(plan)}
        variant={isCurrent ? "outline" : "default"}
        disabled={isCurrent}
        className={cn(
          "w-full h-11 font-bold text-sm shadow-lg transition-all relative z-10",
          isCurrent
            ? "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 shadow-none opacity-90"
            : plan.is_popular
              ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-orange-500/20 dark:shadow-orange-900/20 hover:shadow-orange-500/40 hover:-translate-y-0.5"
              : "bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 hover:-translate-y-0.5"
        )}
      >
        {isCurrent ? 'الخطة المفعلة' : 'اختيار الباقة'}
      </Button>
    </div>
  );
};

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ useStandaloneLayout = true } = {}) => {
  const { organization } = useAuth();
  const { refreshOrganizationData } = useTenant();

  const subscription = useOfflineSubscription({
    organizationId: organization?.id || '',
    autoSync: true,
    syncInterval: 5 * 60 * 1000,
    onExpired: () => toast.error('انتهت صلاحية اشتراكك'),
    onTamperDetected: () => toast.error('تم اكتشاف مشكلة في البيانات')
  });

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Usage Stats State
  const [usageStats, setUsageStats] = useState({
    products: 0,
    users: 0,
    branches: 0,
    pos: 0
  });

  // Fetch Usage Stats
  useEffect(() => {
    const fetchUsage = async () => {
      if (!organization) return;
      try {
        const [products, users, branches] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id),
          supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id),
          supabase.from('branches').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id)
        ]);

        setUsageStats({
          products: products.count || 0,
          users: users.count || 0,
          branches: branches.count || 0,
          pos: 0 // POS requires simpler logic or separate table if tracked
        });
      } catch (e) {
        console.error("Failed to fetch usage stats", e);
      }
    };
    fetchUsage();
  }, [organization]);

  // Fetch Requests
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

  useEffect(() => {
    if (organization) fetchSubscriptionRequests();
  }, [organization]);

  // Fetch Plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .neq('code', 'trial')
          .order('display_order', { ascending: true });

        if (error) return;

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
            max_branches: (plan.limits as any)?.max_branches || null,
          },
          is_active: plan.is_active,
          is_popular: plan.is_popular,
          display_order: plan.display_order
        }));

        setPlans(formattedPlans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const handleRefresh = async () => {
    setRefreshingSubscription(true);
    try {
      await subscription.forceSync();
      toast.success('تم تحديث البيانات');
    } catch {
      toast.error('فشل في التحديث');
    } finally {
      setRefreshingSubscription(false);
    }
  };

  const handlePlanSelection = (plan: SubscriptionPlan, cycle: 'monthly' | 'yearly') => {
    setSelectedPlan(plan);
    setSelectedBillingCycle(cycle);
    setDialogOpen(true);
  };

  const handleSubscriptionCompleted = async () => {
    // Refresh requests to show the new one
    await fetchSubscriptionRequests();
    setActiveTab('history'); // Switch to history tab to show the pending request
  };

  const content = (
    <div className="min-h-screen bg-background dark:bg-[#050b15] text-foreground dark:text-white p-4 lg:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground dark:text-white flex items-center gap-2">
              <Zap className="w-8 h-8 text-orange-500 fill-orange-500" />
              إدارة الاشتراك
            </h1>
            <p className="text-muted-foreground dark:text-slate-400 text-sm">
              تحكم كامل في باقتك، حدود الاستخدام، والمدفوعات.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
              subscription.isOnline
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted dark:bg-slate-800 text-muted-foreground dark:text-slate-400 border-border dark:border-slate-700"
            )}>
              {subscription.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {subscription.isOnline ? 'متصل' : 'غير متصل'}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshingSubscription || !subscription.isOnline}
              className="border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", refreshingSubscription && "animate-spin")} />
              تحديث
            </Button>
          </div>
        </div>

        {/* --- Main Dashboard Grid --- */}
        <div className="grid lg:grid-cols-12 gap-6">

          {/* Left Column: Current Plan Status (4 cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Status Card */}
            <div className="rounded-xl border border-border dark:border-slate-800 bg-card dark:bg-[#0f172a] shadow-xl overflow-hidden relative group">
              {/* Decorative top line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />

              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-1">الباقة الحالية</h2>
                    <div className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
                      {subscription.planName}
                      <Badge variant="outline" className={cn(
                        "ml-2 border-0 text-[10px] px-2 py-0.5",
                        subscription.isValid ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
                      )}>
                        {subscription.status === 'active' ? 'نشط' : subscription.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-muted dark:bg-[#050b15] border border-border dark:border-slate-800 flex items-center justify-center text-orange-500">
                    <Star className="w-5 h-5 fill-orange-500/20" />
                  </div>
                </div>

                {/* Days Left Countdown */}
                {subscription.isValid && (
                  <div className="bg-muted dark:bg-[#050b15] rounded-lg p-4 border border-border dark:border-slate-800/50 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground dark:text-slate-400 mb-1">الوقت المتبقي</p>
                      <p className="text-xl font-bold text-foreground dark:text-white mb-0.5">{subscription.daysLeft} يوم</p>
                      <p className="text-[10px] text-muted-foreground dark:text-slate-500">ينتهي في {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('ar-DZ') : 'غير محدد'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border-4 border-slate-300 dark:border-slate-800 flex items-center justify-center relative">
                      <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="default"
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium shadow-lg shadow-orange-500/20 dark:shadow-orange-900/20"
                    onClick={() => {
                      const element = document.getElementById('plans-section');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    ترقية الباقة
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    سجل الفواتير
                  </Button>
                </div>
              </div>
            </div>

            {/* Usage Stats Widget */}
            <div className="rounded-xl border border-border dark:border-slate-800 bg-card dark:bg-[#0f172a] p-5 shadow-sm">
              <h3 className="text-sm font-bold text-foreground dark:text-slate-200 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                إحصائيات الاستخدام
              </h3>
              <div className="space-y-3">
                <StatItem
                  label="المنتجات"
                  value={usageStats.products}
                  limit={subscription.limits.max_products}
                  icon={Package}
                  colorClass="text-blue-500 dark:text-blue-400"
                />
                <StatItem
                  label="المستخدمين"
                  value={usageStats.users}
                  limit={subscription.limits.max_users}
                  icon={Users}
                  colorClass="text-purple-500 dark:text-purple-400"
                />
                <StatItem
                  label="الفروع"
                  value={usageStats.branches}
                  limit={subscription.limits.max_branches}
                  icon={StoreIcon}
                  colorClass="text-amber-500 dark:text-amber-400"
                />
              </div>
            </div>

            {/* Support Widget */}
            <div className="rounded-xl border border-border dark:border-slate-800 bg-gradient-to-b from-card to-background dark:from-[#0f172a] dark:to-[#050b15] p-5 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-muted dark:bg-slate-800 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-foreground dark:text-slate-200">تحتاج مساعدة ؟</h3>
              <p className="text-xs text-muted-foreground dark:text-slate-500 px-4">فريق الدعم لدينا متاح لمساعدتك في اختيار الباقة المناسبة</p>
              <Button variant="link" className="text-orange-500 text-xs h-auto p-0 hover:text-orange-600 dark:hover:text-orange-400">تواصل معنا</Button>
            </div>

          </div>

          {/* Right Column: Content Tabs (8 cols) */}
          <div className="lg:col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

              <TabsList className="bg-muted dark:bg-[#0f172a] border border-border dark:border-slate-800 p-1 rounded-lg w-full justify-start h-auto">
                <TabsTrigger value="overview" className="data-[state=active]:bg-background dark:data-[state=active]:bg-[#050b15] data-[state=active]:text-foreground dark:data-[state=active]:text-white text-muted-foreground dark:text-slate-400 text-xs px-4 py-2 h-9">
                  <StoreIcon className="w-4 h-4 mr-2" />
                  الباقات المتاحة
                </TabsTrigger>
                <TabsTrigger value="activate" className="data-[state=active]:bg-background dark:data-[state=active]:bg-[#050b15] data-[state=active]:text-foreground dark:data-[state=active]:text-white text-muted-foreground dark:text-slate-400 text-xs px-4 py-2 h-9">
                  <Key className="w-4 h-4 mr-2" />
                  تفعيل بكود
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-background dark:data-[state=active]:bg-[#050b15] data-[state=active]:text-foreground dark:data-[state=active]:text-white text-muted-foreground dark:text-slate-400 text-xs px-4 py-2 h-9">
                  <History className="w-4 h-4 mr-2" />
                  سجل الطلبات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">

                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-center mb-8" id="plans-section">
                  <div className="bg-card dark:bg-[#0f172a] p-1 rounded-full border border-border dark:border-slate-800 flex relative">
                    <button
                      onClick={() => setSelectedBillingCycle('monthly')}
                      className={cn(
                        "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                        selectedBillingCycle === 'monthly' ? "bg-foreground dark:bg-white text-background dark:text-black shadow-lg" : "text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white"
                      )}
                    >
                      شهري
                    </button>
                    <button
                      onClick={() => setSelectedBillingCycle('yearly')}
                      className={cn(
                        "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2",
                        selectedBillingCycle === 'yearly' ? "bg-foreground dark:bg-white text-background dark:text-black shadow-lg" : "text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-white"
                      )}
                    >
                      سنوي
                      <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                        -17%
                      </span>
                    </button>
                  </div>
                </div>

                {loadingPlans ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-[400px] w-full rounded-xl bg-card dark:bg-[#0f172a]" />)}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {plans.map(plan => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isCurrent={subscription.planCode === plan.code}
                        billingCycle={selectedBillingCycle}
                        onSelect={(p) => handlePlanSelection(p, selectedBillingCycle)}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-8 p-4 rounded-lg bg-muted/50 dark:bg-[#0f172a]/50 border border-border dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full"><HardDrive className="w-5 h-5 text-slate-600 dark:text-slate-300" /></div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground dark:text-white">هل تحتاج إلى خطة مخصصة؟</h4>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">للمؤسسات الكبيرة والاحتياجات الخاصة، يمكننا توفير خطة تناسبك.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs">تواصل مع المبيعات</Button>
                </div>
              </TabsContent>

              <TabsContent value="activate" className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="max-w-xl mx-auto">
                  <div className="bg-card dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-muted dark:bg-[#050b15] rounded-2xl flex items-center justify-center mx-auto border border-border dark:border-slate-800 shadow-xl">
                      <Key className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground dark:text-white">تفعيل كود الاشتراك</h3>
                      <p className="text-sm text-muted-foreground dark:text-slate-400 mt-2">أدخل الكود الذي استلمته من الموزع أو فريق المبيعات لتفعيل باقتك فوراً.</p>
                    </div>
                    <ActivateWithCode
                      onActivated={async () => {
                        if (!organization) return;
                        await subscription.forceSync();
                        if (refreshOrganizationData) await refreshOrganizationData();
                        setActiveTab('overview');
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="bg-card dark:bg-[#0f172a] border border-border dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border dark:border-slate-800 bg-muted/50 dark:bg-[#050b15]/50">
                    <h3 className="font-bold text-foreground dark:text-white">سجل طلبات الاشتراك</h3>
                  </div>
                  {loadingRequests ? (
                    <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground dark:text-slate-500" /></div>
                  ) : subscriptionRequests.length > 0 ? (
                    <div className="divide-y divide-border dark:divide-slate-800">
                      {subscriptionRequests.map((req) => (
                        <div key={req.id} className="p-4 flex items-center justify-between hover:bg-muted/50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted dark:bg-[#050b15] border border-border dark:border-slate-800">
                              <Receipt className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground dark:text-white text-sm">{req.plan?.name || 'تجديد باقة'}</p>
                              <p className="text-xs text-muted-foreground dark:text-slate-500">{new Date(req.created_at).toLocaleDateString('ar-DZ')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground dark:text-white text-sm">{new Intl.NumberFormat('ar-DZ').format(req.amount)} د.ج</p>
                            <Badge variant="outline" className={cn(
                              "mt-1 text-[10px] px-2 border-0",
                              req.status === 'approved' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500" :
                                req.status === 'pending' ? "bg-amber-500/10 text-amber-600 dark:text-amber-500" :
                                  "bg-red-500/10 text-red-600 dark:text-red-500"
                            )}>
                              {req.status === 'approved' ? 'ناجحة' : req.status === 'pending' ? 'قيد المراجعة' : 'مرفوضة'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-muted-foreground dark:text-slate-500">
                      <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>لا يوجد سجل طلبات سابق</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>

        {/* Modals */}
        <OnlineOrdersRechargeModal
          isOpen={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
        />

        {organization && selectedPlan && (
          <SubscriptionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            plan={selectedPlan}
            billingCycle={selectedBillingCycle}
            organizationId={organization.id}
            isRenewal={subscription.planCode === selectedPlan.code}
            onSubscriptionComplete={handleSubscriptionCompleted}
          />
        )}
      </div>
    </div>
  );

  const innerContent = loadingPlans || loadingRequests ? (
    <div className="flex items-center justify-center min-h-screen bg-background dark:bg-[#050b15]">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
        <p className="text-muted-foreground dark:text-slate-400">جاري تحميل بيانات الاشتراك...</p>
      </div>
    </div>
  ) : (
    content
  );

  if (useStandaloneLayout) {
    return (
      <POSPureLayout connectionStatus={subscription.isOnline ? 'connected' : 'disconnected'} disableScroll>
        <div className="h-full overflow-y-auto w-full">
          {innerContent}
        </div>
      </POSPureLayout>
    );
  }

  return innerContent;
};

export default SubscriptionPage;
