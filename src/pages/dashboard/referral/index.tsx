// =====================================================
// صفحة برنامج الإحالة - Standard Premium Design
// Referral Program Page - Clean & Consistent
// =====================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Share2,
  Sparkles,
  Gift,
  Zap,
  Clock,
  ArrowUpRight,
  Plus,
  Minus,
  Loader2,
  Target,
  Crown,
  TrendingUp,
  Wallet,
  Coins,
  Medal,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useReferralDashboard } from '@/hooks/useReferralDashboard';
import { useReferralPoints, useReferralTransactions } from '@/hooks/useReferralPoints';
import { useReferralRedemption } from '@/hooks/useReferralRedemption';
import { useReferralCode } from '@/hooks/useReferralCode';
import { RedemptionDialog } from '@/components/referral/RedemptionDialog';
import { REFERRAL_POINTS, REFERRED_DISCOUNT } from '@/types/referral';
import { useTenant } from '@/context/tenant';

// ===== المكافآت المتاحة =====
const REWARDS = [
  {
    id: 'free_month',
    title: 'شهر مجاني',
    titleEn: 'Free Month',
    description: 'احصل على شهر اشتراك مجاني كامل',
    points: 1000,
    featured: true,
    icon: Gift
  },
  {
    id: 'ad_5days',
    title: 'إشهار 5 أيام',
    titleEn: '5-Day Ad',
    description: 'إعلان ممول على صفحاتنا الاجتماعية',
    points: 500,
    featured: false,
    icon: Zap
  },
  {
    id: 'ad_month',
    title: 'إشهار شهر',
    titleEn: 'Monthly Ad',
    description: 'حملة إعلانية شاملة لمدة شهر',
    points: 2000,
    featured: false,
    icon: Target
  },
  {
    id: 'barcode_scanner',
    title: 'سكانر باركود',
    titleEn: 'Barcode Scanner',
    description: 'جهاز سكانر احترافي لاسلكي',
    points: 3000,
    featured: true,
    icon: Sparkles
  },
  {
    id: 'full_tracking',
    title: 'تتبع شامل',
    titleEn: 'Full Tracking',
    description: 'نظام تتبع وتحليل متقدم للمبيعات',
    points: 4000,
    featured: false,
    icon: TrendingUp
  }
];

// ===== بيانات المستويات =====
const TIERS = [
  { level: 1, name: 'برونزي', nameEn: 'Bronze', min: 0, max: 999, bonus: 0, color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' },
  { level: 2, name: 'فضي', nameEn: 'Silver', min: 1000, max: 2999, bonus: 5, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700' },
  { level: 3, name: 'ذهبي', nameEn: 'Gold', min: 3000, max: 5999, bonus: 10, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' },
  { level: 4, name: 'ماسي', nameEn: 'Diamond', min: 6000, max: 11999, bonus: 15, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-200 dark:border-cyan-800' },
  { level: 5, name: 'ملكي', nameEn: 'Royal', min: 12000, max: null, bonus: 20, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' }
];

interface ReferralPageProps extends POSSharedLayoutControls { }

const ReferralPage: React.FC<ReferralPageProps> = ({ useStandaloneLayout = true }) => {
  const { isOnline } = useNetworkStatus();
  const { dashboard, isLoading } = useReferralDashboard();
  const { tierLevel, availablePoints } = useReferralPoints();
  const { transactions } = useReferralTransactions();
  const { selectedReward, isDialogOpen, openRedemptionDialog, handleClose } = useReferralRedemption();

  const {
    code: codeFromHook,
    isLoading: isCodeLoading,
    createCode,
    hasCode
  } = useReferralCode();
  const { organization } = useTenant();

  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const code = dashboard?.code?.code || codeFromHook || null;
  const isLoadingCode = isLoading || isCodeLoading;
  const totalPoints = dashboard?.points?.total || 0;
  const availablePointsCount = dashboard?.points?.available || 0;
  const referralsCount = dashboard?.points?.lifetime_referrals || 0;
  const currentTierLevel = (dashboard?.tier?.level || 1) as number;
  const currentTier = TIERS.find(t => t.level === currentTierLevel) || TIERS[0];
  const nextTier = TIERS.find(t => t.level === currentTierLevel + 1);

  const progress = useMemo(() => {
    if (!nextTier) return 100;
    const range = nextTier.min - currentTier.min;
    const current = totalPoints - currentTier.min;
    return Math.min(Math.max((current / range) * 100, 0), 100);
  }, [totalPoints, currentTier, nextTier]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('تم نسخ الكود بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!code) return;
    const shareData = {
      title: 'سطوكيها',
      text: `انضم لسطوكيها واحصل على خصم ${REFERRED_DISCOUNT * 100}% باستخدام كود: ${code}`,
      url: 'https://stockiha.com'
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { handleCopy(); }
    } else {
      handleCopy();
    }
  };

  const faqs = [
    { q: 'كيف يعمل برنامج الإحالة؟', a: 'ببساطة، شارك كود الإحالة الخاص بك مع أصدقائك. عندما يشتركون في سطوكيها باستخدام كودك، ستحصل أنت على نقاط مكافأة وهم يحصلون على خصم فوري.' },
    { q: 'ما هي قيمة النقاط التي أحصل عليها؟', a: `تحصل على ${REFERRAL_POINTS.monthly} نقطة لكل مشترك يشترك في الباقة الشهرية، و ${REFERRAL_POINTS.yearly} نقطة لكل اشتراك سنوي.` },
    { q: 'هل للنقاط تاريخ انتهاء؟', a: 'لا، نقاطك في سطوكيها لا تنتهي صلاحيتها أبداً. يمكنك تجميعها واستخدامها في أي وقت.' },
    { q: 'كيف يمكنني استبدال النقاط؟', a: 'عندما يكون لديك رصيد كافٍ من النقاط، سيظهر زر "استبدال" مفعل أمام المكافأة. اضغط عليه وسيتم تحويل النقاط فوراً.' }
  ];

  const innerContent = (
    <div className="min-h-full bg-zinc-50/50 dark:bg-zinc-950/50 pb-20 font-sans selection:bg-orange-500/20">

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ===== Header Section ===== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              <span>لوحة التحكم</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-orange-600 dark:text-orange-500 font-medium">برنامج الشركاء</span>
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
              برنامج الإحالة
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              شارك سطوكيها مع الآخرين واكسب نقاط ومكافآت قيمة
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 flex items-center gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">النظام نشط</span>
              </div>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-sm font-medium text-zinc-900 dark:text-white dir-ltr">
                v2.1
              </span>
            </div>
          </div>
        </motion.div>

        {/* ===== Stats Grid ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
        >
          {/* Card 1: Available Points */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05]">
              <Wallet className="h-40 w-40 text-orange-500 -mr-10 -mt-10" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500">
                  <Coins className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">النقاط المتاحة</span>
              </div>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 font-mono tracking-tight">
                {availablePointsCount.toLocaleString('ar-DZ')}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                تستخدم لاستبدال المكافآت
              </p>
            </div>
          </div>

          {/* Card 2: Total Referrals */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05]">
              <Users className="h-40 w-40 text-blue-500 -mr-10 -mt-10" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500">
                  <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">إجمالي الإحالات</span>
              </div>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 font-mono tracking-tight">
                {referralsCount}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                شريك انضم عن طريقك
              </p>
            </div>
          </div>

          {/* Card 3: Current Tier */}
          <div className={cn(
            "rounded-2xl border p-6 shadow-sm relative overflow-hidden transition-all",
            currentTier.bg,
            currentTier.border
          )}>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-lg bg-white/50 dark:bg-black/20", currentTier.color)}>
                    <Crown className="h-5 w-5" />
                  </div>
                  <span className={cn("text-sm font-medium", currentTier.color)}>المستوى الحالي</span>
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-full bg-white/50 dark:bg-black/20", currentTier.color)}>
                  +{currentTier.bonus}% مكافأة
                </span>
              </div>

              <div>
                <h3 className={cn("text-3xl font-bold mb-4 font-mono tracking-tight", currentTier.color)}>
                  {currentTier.name}
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium opacity-80 decoration-zinc-500">
                    <span className="text-zinc-700 dark:text-zinc-300">التقدم للمستوى التالي</span>
                    <span className="text-zinc-900 dark:text-white">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/50 dark:bg-black/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={cn("h-full rounded-full", currentTier.level === 4 || currentTier.level === 5 ? "bg-purple-600" : "bg-orange-500")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===== Main Content Grid ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Code & Rewards */}
          <div className="lg:col-span-2 space-y-8">

            {/* Referral Code Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 text-center md:text-right"
            >
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">كود الإحالة الخاص بك</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    شارك هذا الكود مع التجار الآخرين. سيحصلون على خصم فوري، وستحصل أنت على نقاط تستبدلها بمكافآت.
                  </p>
                </div>

                {/* عرض الكود أو زر الإنشاء */}
                {isLoadingCode ? (
                  <div className="flex items-center justify-center gap-2 max-w-md mx-auto md:mx-0">
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-xl px-4 py-3">
                      <Loader2 className="animate-spin mx-auto h-6 w-6 text-zinc-400" />
                    </div>
                  </div>
                ) : code ? (
                  <div className="flex items-center gap-2 max-w-md mx-auto md:mx-0">
                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-xl px-4 py-3 font-mono text-xl font-bold text-zinc-900 dark:text-white tracking-widest text-center select-all">
                      {code}
                    </div>
                    <Button
                      onClick={handleCopy}
                      size="icon"
                      variant="outline"
                      className={cn("h-12 w-12 rounded-xl shrink-0 transition-all", copied && "text-green-600 border-green-200 bg-green-50")}
                    >
                      {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 max-w-md mx-auto md:mx-0">
                    <Button
                      onClick={() => createCode()}
                      className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-orange-500/20 font-medium text-base"
                    >
                      <Sparkles className="h-5 w-5 ml-2" />
                      إنشاء كود الإحالة الخاص بك
                    </Button>
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto flex flex-col gap-3 min-w-[200px]">
                {code ? (
                  <>
                    <Button
                      onClick={handleShare}
                      className="h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 font-medium text-base w-full"
                    >
                      <Share2 className="h-4 w-4 ml-2" />
                      مشاركة الرابط
                    </Button>
                    <div className="text-xs text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg py-2 border border-zinc-100 dark:border-zinc-800">
                      خصم {REFERRED_DISCOUNT * 100}% عند الاشتراك
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg py-3 px-4 border border-zinc-100 dark:border-zinc-800">
                    أنشئ كودك الآن وابدأ بكسب النقاط!
                  </div>
                )}
              </div>
            </motion.div>

            {/* Steps - Clean Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "شارك الكود", desc: "أرسل الكود لأصدقائك وتجار آخرين", icon: Share2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
                { title: "اشتراك صديقك", desc: `يحصلون عى خصم فوري ${REFERRED_DISCOUNT * 100}%`, icon: UserCheck, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/10" },
                { title: "استلم نقاطك", desc: "اجمع النقاط واستبدلها بمكافآت", icon: Gift, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/10" },
              ].map((step, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center text-center hover:border-orange-300 dark:hover:border-orange-700/50 transition-colors group">
                  <div className={cn("h-12 w-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110", step.bg)}>
                    {React.createElement(step.icon as any, { className: `h-6 w-6 ${step.color}` })}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">الخطوة {i + 1}</span>
                  <h4 className="font-bold text-zinc-900 dark:text-white mb-1.5">{step.title}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{step.desc}</p>
                </div>
              ))}
            </div>

            {/* Rewards Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Medal className="h-5 w-5 text-orange-500" />
                  مكافآت المتجر
                </h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {REWARDS.length} مكافآت متاحة
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REWARDS.map((reward, i) => {
                  const canRedeem = availablePointsCount >= reward.points;
                  const percentage = Math.min((availablePointsCount / reward.points) * 100, 100);

                  return (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + (i * 0.05) }}
                      className={cn(
                        "group relative bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-300",
                        canRedeem
                          ? "border-orange-200 dark:border-orange-900/30 hover:border-orange-400 hover:shadow-md"
                          : "border-zinc-200 dark:border-zinc-800 opacity-90"
                      )}
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                            canRedeem ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          )}>
                            <reward.icon className="h-5 w-5" />
                          </div>
                          {reward.featured && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-500 dark:border-amber-900/30">
                              مميز
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-zinc-900 dark:text-white mb-1">{reward.title}</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 h-8 leading-relaxed">{reward.description}</p>

                        <div className="mt-auto">
                          <div className="flex justify-between items-end mb-2">
                            <span className={cn("text-sm font-bold font-mono", canRedeem ? "text-orange-600 dark:text-orange-500" : "text-zinc-400")}>
                              {reward.points.toLocaleString('ar-DZ')} <span className="text-xs font-normal opacity-70">نقطة</span>
                            </span>
                            {canRedeem ? (
                              <Button
                                size="sm"
                                onClick={() => openRedemptionDialog({
                                  id: reward.id,
                                  name_ar: reward.title,
                                  name_en: reward.titleEn,
                                  description_ar: reward.description,
                                  description_en: reward.description,
                                  points_required: reward.points,
                                  type: 'discount',
                                  icon: reward.id,
                                  is_active: true,
                                  created_at: new Date().toISOString(),
                                  updated_at: new Date().toISOString()
                                })}
                                className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                              >
                                استبدال
                              </Button>
                            ) : (
                              <span className="text-[10px] text-zinc-400">{Math.round(percentage)}%</span>
                            )}
                          </div>
                          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", canRedeem ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600")}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Sidebar (Transactions & FAQ) */}
          <div className="space-y-6">

            {/* Recent Activity */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[400px] shadow-sm">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">آخر النشاطات</h3>
                <Clock className="h-4 w-4 text-zinc-400" />
              </div>

              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-1">
                    {transactions.slice(0, 10).map((tx: any, i: number) => (
                      <div key={tx.id || i} className="p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between group border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center border",
                            tx.points > 0
                              ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20 text-green-600"
                              : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400"
                          )}>
                            {tx.points > 0 ? <ArrowUpRight className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{tx.description || 'عملية إحالة'}</p>
                            <p className="text-[10px] text-zinc-400">{new Date(tx.created_at).toLocaleDateString('ar-DZ')}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-mono font-bold",
                          tx.points > 0 ? "text-green-600 dark:text-green-500" : "text-zinc-400"
                        )}>
                          {tx.points > 0 ? '+' : ''}{tx.points}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="h-16 w-16 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-3">
                      <Clock className="h-6 w-6 text-zinc-300" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">لا يوجد نشاط</p>
                  </div>
                )}
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">أسئلة شائعة</h3>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {faqs.map((faq, i) => (
                  <div key={i} className="group">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-right hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
                        {faq.q}
                      </span>
                      {expandedFaq === i ? (
                        <Minus className="h-3 w-3 text-orange-500" />
                      ) : (
                        <Plus className="h-3 w-3 text-zinc-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0">
                            <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                              {faq.a}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* حوار الاستبدال */}
      <RedemptionDialog
        reward={selectedReward}
        isOpen={isDialogOpen}
        onClose={handleClose}
        availablePoints={availablePointsCount}
      />
    </div>
  );

  if (useStandaloneLayout) {
    return (
      <POSPureLayout connectionStatus={isOnline ? 'connected' : 'disconnected'} disableScroll>
        <div className="h-full overflow-y-auto w-full bg-zinc-50/50 dark:bg-zinc-950/50 scrollbar-thin">
          {innerContent}
        </div>
      </POSPureLayout>
    );
  }

  return innerContent;
};

// SVG Icon Helpers
function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UserCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  )
}

export default ReferralPage;
