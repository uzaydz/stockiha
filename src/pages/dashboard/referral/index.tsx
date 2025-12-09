// =====================================================
// صفحة برنامج الإحالة - تصميم Linear-Inspired Premium
// Referral Program Page - Ultra Premium Design
// =====================================================

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Share2,
  Users,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Gift,
  Zap,
  Clock,
  ArrowRight,
  Plus,
  Minus,
  Loader2,
  RefreshCw
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
    featured: true
  },
  {
    id: 'ad_5days',
    title: 'إشهار 5 أيام',
    titleEn: '5-Day Ad',
    description: 'إعلان على صفحاتنا الاجتماعية',
    points: 500,
    featured: false
  },
  {
    id: 'ad_month',
    title: 'إشهار شهر',
    titleEn: 'Monthly Ad',
    description: 'إعلان على كل منصاتنا',
    points: 2000,
    featured: false
  },
  {
    id: 'barcode_scanner',
    title: 'سكانر باركود',
    titleEn: 'Barcode Scanner',
    description: 'جهاز سكانر احترافي',
    points: 3000,
    featured: true
  },
  {
    id: 'full_tracking',
    title: 'تتبع شامل',
    titleEn: 'Full Tracking',
    description: 'نظام تتبع متقدم',
    points: 4000,
    featured: false
  }
];

// ===== بيانات المستويات =====
const TIERS = [
  { level: 1, name: 'برونزي', nameEn: 'Bronze', min: 0, max: 999, bonus: 0, color: '#CD7F32' },
  { level: 2, name: 'فضي', nameEn: 'Silver', min: 1000, max: 2999, bonus: 5, color: '#C0C0C0' },
  { level: 3, name: 'ذهبي', nameEn: 'Gold', min: 3000, max: 5999, bonus: 10, color: '#FFD700' },
  { level: 4, name: 'ماسي', nameEn: 'Diamond', min: 6000, max: 11999, bonus: 15, color: '#B9F2FF' },
  { level: 5, name: 'ملكي', nameEn: 'Royal', min: 12000, max: null, bonus: 20, color: '#9B59B6' }
];

interface ReferralPageProps extends POSSharedLayoutControls {}

const ReferralPage: React.FC<ReferralPageProps> = ({ useStandaloneLayout = true }) => {
  const { isOnline } = useNetworkStatus();
  const { dashboard, isLoading } = useReferralDashboard();
  const { tierLevel, availablePoints } = useReferralPoints();
  const { transactions } = useReferralTransactions();
  const { selectedReward, isDialogOpen, openRedemptionDialog, handleClose } = useReferralRedemption();

  // استخدام hook كود الإحالة كمصدر احتياطي
  const {
    code: codeFromHook,
    isLoading: isCodeLoading,
    createCode,
    hasCode
  } = useReferralCode();
  const { organization } = useTenant();

  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // البيانات - استخدام dashboard أولاً، ثم hook كمصدر احتياطي
  const code = dashboard?.code?.code || codeFromHook || null;
  const isLoadingCode = isLoading || isCodeLoading;
  const totalPoints = dashboard?.points?.total || 0;
  const availablePointsCount = dashboard?.points?.available || 0;
  const referralsCount = dashboard?.points?.lifetime_referrals || 0;
  const currentTierLevel = (dashboard?.tier?.level || 1) as number;
  const currentTier = TIERS.find(t => t.level === currentTierLevel) || TIERS[0];
  const nextTier = TIERS.find(t => t.level === currentTierLevel + 1);

  // حساب التقدم
  const progress = useMemo(() => {
    if (!nextTier) return 100;
    const range = nextTier.min - currentTier.min;
    const current = totalPoints - currentTier.min;
    return Math.min(Math.max((current / range) * 100, 0), 100);
  }, [totalPoints, currentTier, nextTier]);

  const pointsToNext = nextTier ? nextTier.min - totalPoints : 0;

  // نسخ الكود
  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('تم نسخ الكود');
    setTimeout(() => setCopied(false), 2000);
  };

  // مشاركة الكود
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

  // الأسئلة الشائعة
  const faqs = [
    { q: 'كيف يعمل برنامج الإحالة؟', a: 'شارك كود الإحالة مع أصدقائك. عند اشتراكهم، تحصل على نقاط وهم يحصلون على خصم.' },
    { q: 'كم نقطة أحصل عليها؟', a: `${REFERRAL_POINTS.monthly} نقطة للاشتراك الشهري و ${REFERRAL_POINTS.yearly} نقطة للسنوي.` },
    { q: 'هل تنتهي صلاحية النقاط؟', a: 'لا، نقاطك محفوظة للأبد ولا تنتهي صلاحيتها.' },
    { q: 'كيف أستبدل نقاطي؟', a: 'اختر المكافأة المناسبة من القائمة واضغط على "استبدال".' }
  ];

  const innerContent = (
    <div className="min-h-full bg-[#FAFAFA] dark:bg-[#0A0A0B]">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* ===== Header Section ===== */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-orange-600 dark:text-orange-400">برنامج الإحالة</span>
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            برنامج الإحالة
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">
            شارك سطوكيها واكسب مكافآت حصرية
          </p>
        </motion.div>

        {/* ===== Stats Cards ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { label: 'النقاط المتاحة', value: availablePointsCount, suffix: 'نقطة', highlight: true },
            { label: 'إجمالي الإحالات', value: referralsCount, suffix: 'إحالة', highlight: false },
            { label: 'المستوى الحالي', value: currentTier.name, suffix: '', highlight: false }
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl p-5 border transition-all",
                stat.highlight
                  ? "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/60 dark:border-orange-800/40"
                  : "bg-white dark:bg-[#141415] border-neutral-200/60 dark:border-neutral-800"
              )}
            >
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                {stat.label}
              </p>
              <p className={cn(
                "text-2xl font-semibold",
                stat.highlight ? "text-orange-600 dark:text-orange-400" : "text-neutral-900 dark:text-white"
              )}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString('ar-DZ') : stat.value}
                {stat.suffix && (
                  <span className="text-sm font-normal text-neutral-400 mr-1.5">{stat.suffix}</span>
                )}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ===== Referral Code Card ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#141415] rounded-2xl border border-neutral-200/60 dark:border-neutral-800 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">كود الإحالة</h2>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                شارك هذا الكود مع أصدقائك. سيحصلون على خصم {REFERRED_DISCOUNT * 100}% وأنت تكسب {REFERRAL_POINTS.monthly} نقطة.
              </p>

              {/* Code Display */}
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-xs">
                  <div className="relative">
                    {isLoadingCode ? (
                      <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-5 py-3.5 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                        <span className="mr-2 text-sm text-neutral-500">جاري التحميل...</span>
                      </div>
                    ) : code ? (
                      <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-5 py-3.5 font-mono text-xl font-semibold tracking-[0.2em] text-center text-neutral-900 dark:text-white select-all">
                        {code}
                      </div>
                    ) : (
                      <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-5 py-3.5 flex items-center justify-center">
                        <span className="text-sm text-neutral-500">لا يوجد كود</span>
                        <Button
                          onClick={() => createCode()}
                          size="sm"
                          className="mr-2 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          إنشاء كود
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="lg"
                  disabled={!code || isLoadingCode}
                  className={cn(
                    "h-[54px] px-5 rounded-xl border-neutral-200 dark:border-neutral-700 transition-all",
                    copied && "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-600"
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={handleShare}
                  size="lg"
                  disabled={!code || isLoadingCode}
                  className="h-[54px] px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4 ml-2" />
                  مشاركة
                </Button>
              </div>
            </div>

            {/* Progress to Next Tier */}
            {nextTier && (
              <div className="lg:w-64 lg:border-r lg:border-neutral-200 lg:dark:border-neutral-800 lg:pr-6">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                  التقدم نحو {nextTier.name}
                </p>
                <div className="relative h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute inset-y-0 right-0 bg-gradient-to-l from-orange-500 to-orange-400 rounded-full"
                  />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  <span className="font-medium text-orange-600 dark:text-orange-400">{pointsToNext.toLocaleString('ar-DZ')}</span> نقطة متبقية
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ===== How It Works ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-12"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5">
            كيف يعمل البرنامج
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: 'شارك الكود',
                description: 'أرسل كود الإحالة لأصدقائك'
              },
              {
                step: '02',
                title: 'صديقك يشترك',
                description: `يحصل على خصم ${REFERRED_DISCOUNT * 100}% فوري`
              },
              {
                step: '03',
                title: 'اكسب النقاط',
                description: 'استبدلها بمكافآت قيمة'
              }
            ].map((item, i) => (
              <div
                key={i}
                className="group relative bg-white dark:bg-[#141415] rounded-xl border border-neutral-200/60 dark:border-neutral-800 p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <span className="text-4xl font-bold text-neutral-100 dark:text-neutral-800 absolute top-4 left-4">
                  {item.step}
                </span>
                <div className="relative">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ===== Rewards Section ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              المكافآت المتاحة
            </h2>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {availablePointsCount.toLocaleString('ar-DZ')} نقطة متاحة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REWARDS.map((reward, i) => {
              const canRedeem = availablePointsCount >= reward.points;
              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.03 }}
                  className={cn(
                    "group relative bg-white dark:bg-[#141415] rounded-xl border p-5 transition-all",
                    canRedeem
                      ? "border-neutral-200/60 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm"
                      : "border-neutral-100 dark:border-neutral-900 opacity-60"
                  )}
                >
                  {reward.featured && (
                    <div className="absolute -top-2 -left-2">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        مميز
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                        {reward.title}
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {reward.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {reward.points.toLocaleString('ar-DZ')}
                      </span>
                      <span className="text-neutral-400 mr-1">نقطة</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={!canRedeem}
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
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-medium transition-all",
                        canRedeem
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                      )}
                    >
                      استبدال
                      {canRedeem && <ArrowRight className="h-3 w-3 mr-1" />}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ===== Tiers Section ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5">
            مستويات العضوية
          </h2>

          <div className="bg-white dark:bg-[#141415] rounded-xl border border-neutral-200/60 dark:border-neutral-800 overflow-hidden">
            <div className="grid grid-cols-5 divide-x divide-x-reverse divide-neutral-100 dark:divide-neutral-800">
              {TIERS.map((tier, i) => {
                const isCurrent = tier.level === currentTierLevel;
                const isUnlocked = tier.level <= currentTierLevel;

                return (
                  <div
                    key={tier.level}
                    className={cn(
                      "p-4 text-center relative transition-colors",
                      isCurrent && "bg-neutral-50 dark:bg-neutral-900",
                      !isUnlocked && "opacity-40"
                    )}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400" />
                    )}
                    <div
                      className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isUnlocked ? tier.color : 'transparent',
                        border: `2px solid ${tier.color}`,
                        color: isUnlocked ? '#fff' : tier.color,
                        textShadow: isUnlocked ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                      }}
                    >
                      {tier.level}
                    </div>
                    <p className="font-medium text-sm text-neutral-900 dark:text-white mb-0.5">
                      {tier.name}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {tier.min.toLocaleString('ar-DZ')}+
                    </p>
                    {tier.bonus > 0 && (
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-1">
                        +{tier.bonus}% مكافأة
                      </p>
                    )}
                    {isCurrent && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-neutral-500 bg-white dark:bg-[#141415] px-2 rounded">
                        أنت هنا
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ===== Recent Activity ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-12"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5">
            آخر النشاطات
          </h2>

          <div className="bg-white dark:bg-[#141415] rounded-xl border border-neutral-200/60 dark:border-neutral-800">
            {transactions && transactions.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {transactions.slice(0, 5).map((tx: any, i: number) => (
                  <div
                    key={tx.id || i}
                    className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        tx.points > 0
                          ? "bg-orange-50 dark:bg-orange-950 text-orange-600"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                      )}>
                        {tx.points > 0 ? <ArrowUpRight className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {tx.description || 'معاملة'}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(tx.created_at).toLocaleDateString('ar-DZ', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-sm font-semibold",
                      tx.points > 0 ? "text-orange-600" : "text-neutral-500"
                    )}>
                      {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString('ar-DZ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-5 w-5 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                  لا توجد نشاطات
                </p>
                <p className="text-xs text-neutral-400">
                  ابدأ بمشاركة كود الإحالة
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ===== FAQ Section ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-5">
            أسئلة شائعة
          </h2>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#141415] rounded-xl border border-neutral-200/60 dark:border-neutral-800 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-right hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <span className="font-medium text-neutral-900 dark:text-white text-sm">
                    {faq.q}
                  </span>
                  <div className={cn(
                    "h-6 w-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center transition-transform",
                    expandedFaq === i && "rotate-180"
                  )}>
                    {expandedFaq === i ? (
                      <Minus className="h-3 w-3 text-neutral-500" />
                    ) : (
                      <Plus className="h-3 w-3 text-neutral-500" />
                    )}
                  </div>
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

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
        <div className="h-full overflow-y-auto w-full">
          {innerContent}
        </div>
      </POSPureLayout>
    );
  }

  return innerContent;
};

export default ReferralPage;
