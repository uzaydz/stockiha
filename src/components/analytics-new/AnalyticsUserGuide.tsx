/**
 * 📊 AnalyticsUserGuide - دليل استخدام صفحة التحليلات
 * ═══════════════════════════════════════════════════════════════════════════
 * دليل تفاعلي شامل للتحليلات والتقارير المالية
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  Wallet,
  Users,
  Calculator,
  Calendar,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Target,
  AlertTriangle,
  Percent,
  CreditCard,
  Coins,
  Heart,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 MINI PREVIEW COMPONENTS - معاينات مصغرة من الواجهة
// ═══════════════════════════════════════════════════════════════════════════

// معاينة بطاقات KPI
const KPICardsPreview = memo(() => (
  <div className="grid grid-cols-2 gap-2">
    {[
      { label: 'إجمالي المبيعات', value: '15,250', icon: ShoppingCart, color: 'text-emerald-500', trend: '+12%', up: true },
      { label: 'صافي الربح', value: '3,450', icon: TrendingUp, color: 'text-blue-500', trend: '+8%', up: true },
      { label: 'عدد الطلبات', value: '324', icon: Package, color: 'text-violet-500', trend: '+5%', up: true },
      { label: 'المصاريف', value: '2,100', icon: Wallet, color: 'text-red-500', trend: '-3%', up: false },
    ].map(({ label, value, icon: Icon, color, trend, up }) => (
      <div key={label} className="bg-white dark:bg-zinc-800 rounded-xl p-2.5 border border-zinc-100 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("w-3.5 h-3.5", color)} />
          <span className="text-[10px] text-zinc-500">{label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{value} دج</span>
          <span className={cn("text-[10px] flex items-center gap-0.5", up ? "text-green-500" : "text-red-500")}>
            {up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {trend}
          </span>
        </div>
      </div>
    ))}
  </div>
));

// معاينة التبويبات
const TabsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-2 border border-zinc-100 dark:border-zinc-700">
    <div className="flex flex-wrap gap-1.5">
      {[
        { icon: LayoutDashboard, label: 'نظرة عامة', active: true },
        { icon: ShoppingCart, label: 'المبيعات', active: false },
        { icon: TrendingUp, label: 'الأرباح', active: false },
        { icon: Package, label: 'المخزون', active: false },
      ].map(({ icon: Icon, label, active }) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium",
            active
              ? "bg-orange-500 text-white"
              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
      ))}
    </div>
  </div>
));

// معاينة فلتر التاريخ
const DateFilterPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700 space-y-2">
    <div className="flex items-center gap-2 mb-2">
      <Calendar className="w-4 h-4 text-orange-500" />
      <span className="text-xs font-medium">فترة التقرير</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {['اليوم', 'أمس', '7 أيام', '30 يوم', 'هذا الشهر', 'مخصص'].map((preset, idx) => (
        <button
          key={preset}
          className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
            idx === 3
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm border"
              : "text-zinc-500 bg-zinc-100 dark:bg-zinc-700"
          )}
        >
          {preset}
        </button>
      ))}
    </div>
  </div>
));

// معاينة رسم بياني للمبيعات
const SalesChartPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium">اتجاه المبيعات</span>
      <LineChart className="w-4 h-4 text-emerald-500" />
    </div>
    <div className="h-20 flex items-end justify-between gap-1">
      {[40, 65, 45, 80, 55, 90, 70].map((height, idx) => (
        <div
          key={idx}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-500 to-emerald-300"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
    <div className="flex justify-between mt-2">
      <span className="text-[9px] text-zinc-400">السبت</span>
      <span className="text-[9px] text-zinc-400">الجمعة</span>
    </div>
  </div>
));

// معاينة أفضل المنتجات
const TopProductsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center gap-2 mb-3">
      <Target className="w-4 h-4 text-violet-500" />
      <span className="text-xs font-medium">أفضل المنتجات</span>
    </div>
    <div className="space-y-2">
      {[
        { name: 'منتج 1', sales: 85 },
        { name: 'منتج 2', sales: 65 },
        { name: 'منتج 3', sales: 45 },
      ].map((product, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-zinc-600 dark:text-zinc-400">{product.name}</span>
            <span className="font-medium">{product.sales}%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
              style={{ width: `${product.sales}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
));

// معاينة تحليل الربح
const ProfitAnalysisPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium">تحليل الربحية</span>
      <Badge className="bg-green-100 text-green-700 text-[9px]">ربح</Badge>
    </div>
    <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-lg p-2.5 mb-2">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-blue-600">الإيرادات</span>
        <span>-</span>
        <span className="text-red-600">التكاليف</span>
        <span>=</span>
        <span className="text-green-600 font-bold">الربح</span>
      </div>
      <div className="flex items-center justify-between text-xs font-bold mt-1">
        <span className="text-blue-700">15,250</span>
        <span>-</span>
        <span className="text-red-700">11,800</span>
        <span>=</span>
        <span className="text-green-700">3,450</span>
      </div>
    </div>
    <div className="flex items-center gap-2 text-[10px]">
      <Percent className="w-3 h-3 text-emerald-500" />
      <span className="text-zinc-500">هامش الربح:</span>
      <span className="font-bold text-emerald-600">22.6%</span>
    </div>
  </div>
));

// معاينة مقياس الأرباح
const ProfitGaugePreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute inset-0 border-[6px] border-zinc-200 dark:border-zinc-700 rounded-t-full" />
        <div
          className="absolute inset-0 border-[6px] border-green-500 rounded-t-full"
          style={{
            clipPath: 'polygon(0 100%, 70% 100%, 70% 0, 0 0)',
          }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 dark:bg-white rounded-full" />
      </div>
      <div className="text-center mt-1">
        <div className="text-lg font-bold text-green-600">+22.6%</div>
        <div className="text-[9px] text-zinc-500">هامش الربح</div>
      </div>
    </div>
  </div>
));

// معاينة حالة المخزون
const InventoryStatusPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center gap-2 mb-3">
      <Package className="w-4 h-4 text-blue-500" />
      <span className="text-xs font-medium">حالة المخزون</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'متوفر', value: 120, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
        { label: 'منخفض', value: 25, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        { label: 'نفذ', value: 8, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
      ].map(({ label, value, color, bg }) => (
        <div key={label} className={cn("rounded-lg p-2 text-center", bg)}>
          <div className={cn("text-lg font-bold", color)}>{value}</div>
          <div className="text-[9px] text-zinc-500">{label}</div>
        </div>
      ))}
    </div>
  </div>
));

// معاينة تنبيهات المخزون
const InventoryAlertsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="w-4 h-4 text-amber-500" />
      <span className="text-xs font-medium">تنبيهات المخزون</span>
    </div>
    <div className="space-y-1.5">
      {[
        { name: 'منتج أ', qty: 5, status: 'منخفض', color: 'bg-amber-500' },
        { name: 'منتج ب', qty: 0, status: 'نفذ', color: 'bg-red-500' },
      ].map((item, idx) => (
        <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
          <span className="text-[10px] text-zinc-600 dark:text-zinc-300">{item.name}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500">{item.qty} قطعة</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[8px] text-white", item.color)}>{item.status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
));

// معاينة المصاريف
const ExpenseChartPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium">توزيع المصاريف</span>
      <PieChart className="w-4 h-4 text-red-500" />
    </div>
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="40 100" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="30 100" strokeDashoffset="-40" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="20 100" strokeDashoffset="-70" />
        </svg>
      </div>
      <div className="flex-1 space-y-1">
        {[
          { label: 'إيجار', percent: 40, color: 'bg-red-500' },
          { label: 'رواتب', percent: 30, color: 'bg-amber-500' },
          { label: 'متنوع', percent: 20, color: 'bg-blue-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[10px]">
            <div className={cn("w-2 h-2 rounded-full", item.color)} />
            <span className="text-zinc-500">{item.label}</span>
            <span className="font-medium mr-auto">{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  </div>
));

// معاينة نمو العملاء
const CustomerGrowthPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium">نمو العملاء</span>
      <Users className="w-4 h-4 text-violet-500" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-2 text-center">
        <div className="text-lg font-bold text-violet-600">245</div>
        <div className="text-[9px] text-zinc-500">إجمالي العملاء</div>
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2 text-center">
        <div className="text-lg font-bold text-emerald-600">+28</div>
        <div className="text-[9px] text-zinc-500">عملاء جدد</div>
      </div>
    </div>
  </div>
));

// معاينة الديون
const DebtPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center gap-2 mb-2">
      <CreditCard className="w-4 h-4 text-amber-500" />
      <span className="text-xs font-medium">الديون والمستحقات</span>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between items-center p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
        <span className="text-[10px] text-red-600">ديون علينا</span>
        <span className="text-xs font-bold text-red-700">5,200 دج</span>
      </div>
      <div className="flex justify-between items-center p-2 rounded-lg bg-green-50 dark:bg-green-500/10">
        <span className="text-[10px] text-green-600">ديون لنا</span>
        <span className="text-xs font-bold text-green-700">8,750 دج</span>
      </div>
    </div>
  </div>
));

// معاينة حساب الزكاة
const ZakatCalculationPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center gap-2 mb-3">
      <Heart className="w-4 h-4 text-teal-500" />
      <span className="text-xs font-medium">حساب الزكاة</span>
    </div>
    <div className="space-y-2">
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 rounded-lg p-2.5">
        <div className="text-[10px] text-zinc-500 mb-1">الوعاء الزكوي</div>
        <div className="text-lg font-bold text-teal-700">125,000 دج</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
          <div className="text-[9px] text-zinc-500">النصاب</div>
          <div className="text-xs font-bold">22,680 دج</div>
        </div>
        <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-500/10">
          <div className="text-[9px] text-teal-600">الزكاة المستحقة</div>
          <div className="text-xs font-bold text-teal-700">3,125 دج</div>
        </div>
      </div>
    </div>
  </div>
));

// معاينة عناصر الزكاة
const ZakatItemsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="text-xs font-medium mb-2">عناصر الزكاة</div>
    <div className="space-y-1.5">
      {[
        { label: 'قيمة المخزون', value: '85,000', icon: Package },
        { label: 'النقد والأرصدة', value: '30,000', icon: Coins },
        { label: 'الديون المستحقة', value: '10,000', icon: CreditCard },
      ].map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3 h-3 text-teal-500" />
            <span className="text-[10px] text-zinc-600 dark:text-zinc-300">{label}</span>
          </div>
          <span className="text-[10px] font-bold">{value} دج</span>
        </div>
      ))}
    </div>
  </div>
));

// معاينة زر التحديث
const RefreshPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700">
    <div className="flex items-center gap-3">
      <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
        <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>
      <div>
        <div className="text-xs font-medium">تحديث البيانات</div>
        <div className="text-[10px] text-zinc-500">آخر تحديث: الآن</div>
      </div>
    </div>
  </div>
));

// ═══════════════════════════════════════════════════════════════════════════
// 📋 GUIDE SECTIONS DATA - بيانات أقسام الدليل
// ═══════════════════════════════════════════════════════════════════════════

const COLORS: Record<string, { bg: string; light: string; text: string }> = {
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  green: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  red: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  amber: { bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  teal: { bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  slate: { bg: 'bg-slate-500', light: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
};

interface GuideStep {
  text: string;
  preview?: React.ReactNode;
}

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  steps: GuideStep[];
  tips?: string[];
  shortcuts?: { key: string; action: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'overview',
    title: 'نظرة عامة',
    subtitle: 'ملخص شامل لأداء متجرك',
    icon: LayoutDashboard,
    color: 'orange',
    steps: [
      {
        text: 'تعرض صفحة النظرة العامة ملخصاً شاملاً لأداء متجرك يشمل المبيعات والأرباح والمخزون والعملاء',
        preview: <KPICardsPreview />
      },
      {
        text: 'استخدم التبويبات للتنقل بين أقسام التحليلات المختلفة: المبيعات، الأرباح، المخزون، المصاريف، العملاء، والزكاة',
        preview: <TabsPreview />
      }
    ],
    tips: [
      'بطاقات KPI تظهر المؤشرات الرئيسية بنظرة سريعة',
      'الأسهم الخضراء تعني تحسن، والحمراء تعني تراجع',
      'النسب المئوية تقارن بالفترة السابقة',
      'اضغط على أي تبويب للتفاصيل الكاملة'
    ]
  },
  {
    id: 'date-filter',
    title: 'فلتر التاريخ',
    subtitle: 'تحديد فترة التقرير',
    icon: Calendar,
    color: 'blue',
    steps: [
      {
        text: 'اختر الفترة الزمنية للتقارير من الخيارات المتاحة: اليوم، أمس، 7 أيام، 30 يوم، هذا الشهر، أو الشهر الماضي',
        preview: <DateFilterPreview />
      },
      {
        text: 'للفترات المخصصة، اختر "مخصص" وحدد تاريخ البداية والنهاية يدوياً',
      }
    ],
    tips: [
      'الفترة الافتراضية هي آخر 30 يوم',
      'تتغير جميع البيانات والرسوم البيانية تلقائياً عند تغيير الفترة',
      'يمكنك مقارنة فترات مختلفة لمعرفة اتجاه النمو',
      'التواريخ المخصصة مفيدة للتقارير الموسمية'
    ]
  },
  {
    id: 'sales',
    title: 'المبيعات',
    subtitle: 'تحليل شامل للمبيعات',
    icon: ShoppingCart,
    color: 'emerald',
    steps: [
      {
        text: 'تعرض بطاقات المبيعات: إجمالي المبيعات، عدد الطلبات، متوسط قيمة الطلب، والمعدل اليومي',
        preview: <KPICardsPreview />
      },
      {
        text: 'رسم بياني يوضح اتجاه المبيعات خلال الفترة المحددة',
        preview: <SalesChartPreview />
      },
      {
        text: 'قائمة بأفضل المنتجات مبيعاً ونسبة مساهمتها',
        preview: <TopProductsPreview />
      }
    ],
    tips: [
      'الرسم البياني يوضح الأيام الأكثر نشاطاً',
      'أفضل المنتجات تساعد في معرفة ما يطلبه العملاء',
      'المبيعات حسب الفئة توضح القطاعات الناجحة',
      'يمكنك التصفية حسب نوع البيع: تجزئة أو جملة',
      'مقارنة المبيعات مع الأهداف تساعد في التخطيط'
    ]
  },
  {
    id: 'profit',
    title: 'الأرباح',
    subtitle: 'تحليل الربحية وهوامش الربح',
    icon: TrendingUp,
    color: 'green',
    steps: [
      {
        text: 'معادلة الربح البسيطة: الإيرادات - التكاليف = الربح، مع حالة الربحية (ربح/خسارة/تعادل)',
        preview: <ProfitAnalysisPreview />
      },
      {
        text: 'مقياس هامش الربح يوضح نسبة الربح من المبيعات بشكل مرئي',
        preview: <ProfitGaugePreview />
      }
    ],
    tips: [
      'هامش الربح الصحي عادة بين 15-30%',
      'الرسم الشلالي يوضح كيف تتحول الإيرادات لربح',
      'راقب اتجاه الربح عبر الزمن',
      'الربح حسب الفئة يوضح المنتجات الأكثر ربحية',
      'تحسين هامش الربح يكون بزيادة الأسعار أو تقليل التكاليف'
    ]
  },
  {
    id: 'inventory',
    title: 'المخزون',
    subtitle: 'حالة المخزون ورأس المال',
    icon: Package,
    color: 'violet',
    steps: [
      {
        text: 'نظرة عامة على حالة المخزون: المتوفر، المنخفض، والنافذ',
        preview: <InventoryStatusPreview />
      },
      {
        text: 'تنبيهات تلقائية للمنتجات التي تحتاج إعادة تزويد',
        preview: <InventoryAlertsPreview />
      }
    ],
    tips: [
      'المنتجات المنخفضة تحتاج طلب جديد قريباً',
      'المنتجات النافذة تؤثر على المبيعات مباشرة',
      'رأس المال المجمد في المخزون يظهر قيمة البضاعة',
      'دوران المخزون يوضح سرعة البيع',
      'راجع التنبيهات يومياً لتجنب نفاد المخزون'
    ]
  },
  {
    id: 'expenses',
    title: 'المصاريف',
    subtitle: 'تتبع وتحليل المصاريف',
    icon: Wallet,
    color: 'red',
    steps: [
      {
        text: 'توزيع المصاريف حسب الفئة مع نسبة كل فئة من الإجمالي',
        preview: <ExpenseChartPreview />
      }
    ],
    tips: [
      'راقب المصاريف الثابتة (إيجار، رواتب) والمتغيرة',
      'حدد أهدافاً للمصاريف الشهرية',
      'المصاريف المرتفعة تؤثر على الربح',
      'سجّل جميع المصاريف للحصول على صورة دقيقة',
      'قارن المصاريف بين الفترات لمعرفة الاتجاه'
    ]
  },
  {
    id: 'customers',
    title: 'العملاء',
    subtitle: 'تحليل قاعدة العملاء',
    icon: Users,
    color: 'violet',
    steps: [
      {
        text: 'إحصائيات العملاء: إجمالي العملاء، العملاء الجدد، ونسبة النمو',
        preview: <CustomerGrowthPreview />
      },
      {
        text: 'تتبع الديون والمستحقات: ما لك وما عليك',
        preview: <DebtPreview />
      }
    ],
    tips: [
      'العملاء المتكررون أكثر قيمة من الجدد',
      'تتبع متوسط قيمة العميل',
      'الديون المتأخرة تحتاج متابعة',
      'رضا العملاء يؤدي لمبيعات أكثر',
      'أفضل العملاء يستحقون عروضاً خاصة'
    ]
  },
  {
    id: 'zakat',
    title: 'الزكاة',
    subtitle: 'حساب زكاة عروض التجارة',
    icon: Calculator,
    color: 'teal',
    steps: [
      {
        text: 'حساب الزكاة تلقائياً من قيمة المخزون والنقد والديون المستحقة',
        preview: <ZakatCalculationPreview />
      },
      {
        text: 'تفصيل عناصر الوعاء الزكوي',
        preview: <ZakatItemsPreview />
      }
    ],
    tips: [
      'الزكاة واجبة إذا بلغ المال النصاب وحال عليه الحول',
      'النصاب يُحسب بناءً على سعر الذهب الحالي',
      'نسبة الزكاة 2.5% من الوعاء الزكوي',
      'المخزون يُقيّم بسعر البيع',
      'الديون المشكوك في تحصيلها لا تُزكى'
    ]
  },
  {
    id: 'tips',
    title: 'نصائح عامة',
    subtitle: 'استخدم التحليلات باحترافية',
    icon: Lightbulb,
    color: 'amber',
    steps: [
      {
        text: 'نصائح لاستخدام صفحة التحليلات بكفاءة',
        preview: <RefreshPreview />
      }
    ],
    tips: [
      'راجع التحليلات يومياً لمعرفة أداء المتجر',
      'قارن الفترات المتماثلة (شهر بشهر، أسبوع بأسبوع)',
      'استخدم البيانات لاتخاذ قرارات الشراء',
      'حدد أهدافاً واقعية بناءً على البيانات التاريخية',
      'شارك التقارير مع فريق العمل',
      'استخدم زر التحديث للحصول على أحدث البيانات'
    ],
    shortcuts: [
      { key: 'Tab', action: 'التنقل بين التبويبات' },
      { key: 'Escape', action: 'العودة للنظرة العامة' }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface AnalyticsUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AnalyticsUserGuide: React.FC<AnalyticsUserGuideProps> = ({ open, onOpenChange }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const section = GUIDE_SECTIONS[currentSection];
  const colors = COLORS[section.color] || COLORS.orange;

  const totalSteps = section.steps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isLastSection = currentSection === GUIDE_SECTIONS.length - 1;

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
    } else if (!isLastSection) {
      setCurrentSection(prev => prev + 1);
      setCurrentStep(0);
    }
  }, [isLastStep, isLastSection]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      setCurrentStep(GUIDE_SECTIONS[currentSection - 1].steps.length - 1);
    }
  }, [currentStep, currentSection]);

  const handleSectionSelect = useCallback((index: number) => {
    setCurrentSection(index);
    setCurrentStep(0);
  }, []);

  const progress = useMemo(() => {
    const totalSections = GUIDE_SECTIONS.length;
    const completedSections = currentSection;
    const currentProgress = (currentStep + 1) / totalSteps;
    return ((completedSections + currentProgress) / totalSections) * 100;
  }, [currentSection, currentStep, totalSteps]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">دليل استخدام التحليلات</DialogTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {currentSection + 1} من {GUIDE_SECTIONS.length} - {section.title}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", colors.bg)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </DialogHeader>

        <div className="flex h-[500px]">
          {/* Sidebar - Sections List */}
          <div className="w-48 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2 overflow-y-auto hidden sm:block">
            <div className="space-y-1">
              {GUIDE_SECTIONS.map((sec, idx) => {
                const secColors = COLORS[sec.color] || COLORS.orange;
                const Icon = sec.icon;
                const isActive = idx === currentSection;
                const isCompleted = idx < currentSection;

                return (
                  <button
                    key={sec.id}
                    onClick={() => handleSectionSelect(idx)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-right transition-all text-xs",
                      isActive
                        ? cn(secColors.light, secColors.text, "font-medium")
                        : isCompleted
                        ? "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                      isActive ? secColors.bg : "bg-zinc-200 dark:bg-zinc-700"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-zinc-500")} />
                      )}
                    </div>
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentSection}-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto p-4"
              >
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colors.light)}>
                    <section.icon className={cn("w-6 h-6", colors.text)} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{section.title}</h3>
                    <p className="text-sm text-zinc-500">{section.subtitle}</p>
                  </div>
                </div>

                {/* Step Content */}
                <div className="space-y-4">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2">
                    {section.steps.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          idx === currentStep
                            ? cn("w-8", colors.bg)
                            : idx < currentStep
                            ? "w-4 bg-zinc-300 dark:bg-zinc-600"
                            : "w-4 bg-zinc-200 dark:bg-zinc-700"
                        )}
                      />
                    ))}
                  </div>

                  {/* Step text */}
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {section.steps[currentStep].text}
                  </p>

                  {/* Preview */}
                  {section.steps[currentStep].preview && (
                    <div className="flex justify-center py-4">
                      {section.steps[currentStep].preview}
                    </div>
                  )}

                  {/* Tips (show on last step of section) */}
                  {isLastStep && section.tips && (
                    <div className={cn("rounded-xl p-3 space-y-2", colors.light)}>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className={cn("w-4 h-4", colors.text)} />
                        <span className={cn("text-sm font-medium", colors.text)}>نصائح</span>
                      </div>
                      <ul className="space-y-1.5">
                        {section.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <CheckCircle2 className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", colors.text)} />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Shortcuts (if any) */}
                  {isLastStep && section.shortcuts && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Keyboard className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">اختصارات</span>
                      </div>
                      <div className="grid gap-2">
                        {section.shortcuts.map((shortcut, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <kbd className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                              {shortcut.key}
                            </kbd>
                            <span className="text-xs text-zinc-500">{shortcut.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Footer Navigation */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrev}
                  disabled={currentSection === 0 && currentStep === 0}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    currentSection === 0 && currentStep === 0
                      ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                  السابق
                </button>

                <div className="flex items-center gap-1">
                  {GUIDE_SECTIONS.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all cursor-pointer",
                        idx === currentSection ? colors.bg : "bg-zinc-300 dark:bg-zinc-600"
                      )}
                      onClick={() => handleSectionSelect(idx)}
                    />
                  ))}
                </div>

                <button
                  onClick={isLastStep && isLastSection ? () => onOpenChange(false) : handleNext}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all",
                    colors.bg,
                    "hover:opacity-90"
                  )}
                >
                  {isLastStep && isLastSection ? 'إنهاء' : 'التالي'}
                  {!(isLastStep && isLastSection) && <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default memo(AnalyticsUserGuide);

// ═══════════════════════════════════════════════════════════════════════════
// 🔘 HELP BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const AnalyticsHelpButton = memo<{ onClick: () => void; className?: string }>(({ onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
      "hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-md",
      "transition-all group",
      className
    )}
    title="دليل الاستخدام (?)"
  >
    <HelpCircle className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transition-colors" />
  </button>
));

AnalyticsHelpButton.displayName = 'AnalyticsHelpButton';
