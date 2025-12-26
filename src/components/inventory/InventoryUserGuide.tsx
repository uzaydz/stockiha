/**
 * 📖 InventoryUserGuide - دليل استخدام صفحة المخزون
 * ═══════════════════════════════════════════════════════════════════════════
 * دليل تفاعلي شامل لإدارة المخزون المتقدمة
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  Search,
  Plus,
  Minus,
  Edit,
  Filter,
  Package,
  Scale,
  Box,
  Ruler,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Eye,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Palette,
  Settings,
  BarChart3,
  ArrowUpDown,
  Layers,
  History,
  TrendingUp,
  ClipboardList
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

// معاينة إحصائيات المخزون
const StatsPreview = memo(() => (
  <div className="grid grid-cols-4 gap-2">
    {[
      { label: 'إجمالي', value: '150', icon: Package, color: 'border-l-slate-400' },
      { label: 'متوفر', value: '120', icon: CheckCircle2, color: 'border-l-green-500' },
      { label: 'منخفض', value: '20', icon: AlertTriangle, color: 'border-l-amber-500' },
      { label: 'نفذ', value: '10', icon: XCircle, color: 'border-l-red-500' },
    ].map(({ label, value, icon: Icon, color }) => (
      <div key={label} className={cn("bg-white dark:bg-zinc-800 rounded-lg p-2 border-l-4", color)}>
        <Icon className="w-3.5 h-3.5 text-zinc-400 mb-1" />
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    ))}
  </div>
));

// معاينة شريط البحث
const SearchBarPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
    <Search className="w-4 h-4 text-zinc-400" />
    <span className="text-sm text-zinc-500">ابحث عن منتج بالاسم أو الباركود...</span>
  </div>
));

// معاينة فلاتر حالة المخزون
const StockFiltersPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex flex-wrap gap-1.5">
      {[
        { label: 'الكل', active: false },
        { label: 'متوفر', active: true, color: 'bg-green-50 text-green-700 border-green-200' },
        { label: 'منخفض', active: false },
        { label: 'نفذ', active: false },
      ].map((filter) => (
        <button
          key={filter.label}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
            filter.active
              ? filter.color || "bg-slate-100 border-slate-300"
              : "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600 text-zinc-600"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  </div>
));

// معاينة فلتر نوع البيع
const SellingTypeFilterPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-2 mb-2">
      <Filter className="w-4 h-4 text-zinc-500" />
      <span className="text-xs text-zinc-600 dark:text-zinc-300">نوع البيع</span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {[
        { icon: Package, label: 'قطعة', active: true },
        { icon: Scale, label: 'وزن', active: false },
        { icon: Box, label: 'كرتون', active: false },
        { icon: Ruler, label: 'متر', active: false },
      ].map(({ icon: Icon, label, active }) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs",
            active
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20"
              : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
          )}
        >
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  </div>
));

// معاينة بطاقة منتج المخزون
const ProductCardPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
    <div className="p-3 flex gap-3">
      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500/20 dark:to-emerald-600/20 flex items-center justify-center">
        <Package className="w-6 h-6 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold truncate">اسم المنتج</h3>
            <p className="text-[10px] text-zinc-500">SKU: PRD-001</p>
          </div>
          <Badge className="bg-green-50 text-green-700 text-[10px] border border-green-200">
            متوفر
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
            <Package className="w-2.5 h-2.5" />
            <span className="font-bold">100</span>
            <span className="text-zinc-500">قطعة</span>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded text-[10px]">
            <Scale className="w-2.5 h-2.5 text-emerald-600" />
            <span className="font-bold text-emerald-700">25.5</span>
            <span className="text-emerald-600">kg</span>
          </div>
        </div>
      </div>
    </div>
    <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-700 flex gap-2">
      <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-xs">
        <Edit className="w-3 h-3" />
        تحديث
      </button>
      <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-xs">
        <Eye className="w-3 h-3" />
        تفاصيل
      </button>
    </div>
  </div>
));

// معاينة نوع العملية
const OperationTypePreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="text-xs text-zinc-500 mb-2">نوع العملية</div>
    <div className="grid grid-cols-3 gap-2">
      <button className="flex flex-col items-center gap-1 py-2 rounded-lg bg-green-500 text-white">
        <Plus className="w-4 h-4" />
        <span className="text-xs">إضافة</span>
      </button>
      <button className="flex flex-col items-center gap-1 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600">
        <Minus className="w-4 h-4" />
        <span className="text-xs">خصم</span>
      </button>
      <button className="flex flex-col items-center gap-1 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600">
        <RefreshCw className="w-4 h-4" />
        <span className="text-xs">تحديد</span>
      </button>
    </div>
  </div>
));

// معاينة اختيار نوع الوحدة
const UnitTypePreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="text-xs text-zinc-500">نوع الوحدة</div>
    <div className="grid grid-cols-4 gap-1.5">
      {[
        { icon: Package, label: 'قطعة', active: true },
        { icon: Scale, label: 'وزن', active: false },
        { icon: Box, label: 'كرتون', active: false },
        { icon: Ruler, label: 'متر', active: false },
      ].map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          className={cn(
            "flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-colors",
            active
              ? "bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2"
              : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600"
          )}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  </div>
));

// معاينة الإجراءات السريعة
const QuickActionsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="text-xs text-zinc-500 mb-2">إجراءات سريعة</div>
    <div className="grid grid-cols-6 gap-1.5">
      {[1, 5, 10, 20, 50, 100].map((num) => (
        <button
          key={num}
          className={cn(
            "py-1.5 rounded-lg text-xs font-medium border transition-colors",
            num === 10
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700"
          )}
        >
          +{num}
        </button>
      ))}
    </div>
  </div>
));

// معاينة الألوان والمقاسات
const VariantsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-2">
      <Palette className="w-4 h-4 text-violet-500" />
      <span className="text-xs text-zinc-600 dark:text-zinc-300">الألوان والمقاسات</span>
    </div>
    <div className="flex gap-2">
      {[
        { color: '#e53935', name: 'أحمر', qty: 25 },
        { color: '#1e88e5', name: 'أزرق', qty: 30 },
        { color: '#000000', name: 'أسود', qty: 45 },
      ].map((c) => (
        <div key={c.color} className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-700 px-2 py-1 rounded-full">
          <div
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: c.color }}
          />
          <span className="text-xs">{c.name}</span>
          <span className="text-[10px] text-zinc-500">({c.qty})</span>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap gap-1.5">
      {['S', 'M', 'L', 'XL'].map((size, idx) => (
        <span
          key={size}
          className={cn(
            "px-2 py-1 rounded-lg text-xs font-medium border",
            idx === 1
              ? "bg-green-50 text-green-700 border-green-200"
              : idx === 3
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-zinc-50 dark:bg-zinc-700 border-zinc-200"
          )}
        >
          {size}: {idx === 3 ? 0 : 10 + idx * 5}
        </span>
      ))}
    </div>
  </div>
));

// معاينة معاينة المخزون
const StockPreviewPreview = memo(() => (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-zinc-500">المخزون الحالي</span>
      <span className="text-sm font-semibold">100 قطعة</span>
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
      <span className="text-xs font-medium">سيصبح المخزون</span>
      <span className="text-lg font-bold text-green-600">110 قطعة</span>
    </div>
    <div className="text-center mt-1">
      <span className="text-xs text-green-600">+10 قطعة</span>
    </div>
  </div>
));

// معاينة حالة الاتصال
const ConnectionStatusPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2">
    <div className="text-xs text-zinc-500 mb-2">حالة الاتصال</div>
    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
      <Wifi className="w-4 h-4 text-green-600" />
      <span className="text-xs text-green-700 dark:text-green-400">متصل - المزامنة نشطة</span>
    </div>
    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
      <WifiOff className="w-4 h-4 text-amber-600" />
      <span className="text-xs text-amber-700 dark:text-amber-400">أوفلاين - حفظ محلي</span>
    </div>
  </div>
));

// معاينة المزامنة
const SyncPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-emerald-500" />
        <span className="text-xs text-zinc-600 dark:text-zinc-300">المزامنة</span>
      </div>
      <Badge className="bg-orange-100 text-orange-700 text-[10px]">
        3 معلقة
      </Badge>
    </div>
    <div className="space-y-1.5">
      <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-xs">
        <RefreshCw className="w-3 h-3" />
        تحديث
      </button>
      <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-orange-500 text-white text-xs">
        <RefreshCw className="w-3 h-3" />
        مزامنة المخزون (3)
      </button>
    </div>
  </div>
));

// معاينة أنواع البيع المتقدمة
const AdvancedSellingTypesPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
        <div className="flex items-center gap-1.5 mb-1">
          <Scale className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">البيع بالوزن</span>
        </div>
        <div className="text-[10px] text-emerald-600">25.5 kg متوفر</div>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
        <div className="flex items-center gap-1.5 mb-1">
          <Box className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">البيع بالكرتون</span>
        </div>
        <div className="text-[10px] text-blue-600">10 كرتون متوفر</div>
      </div>
      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200">
        <div className="flex items-center gap-1.5 mb-1">
          <Ruler className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-xs font-medium text-purple-700">البيع بالمتر</span>
        </div>
        <div className="text-[10px] text-purple-600">150.5 م متوفر</div>
      </div>
      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/30 border border-slate-200">
        <div className="flex items-center gap-1.5 mb-1">
          <Package className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-xs font-medium text-slate-700">البيع بالقطعة</span>
        </div>
        <div className="text-[10px] text-slate-600">100 قطعة متوفر</div>
      </div>
    </div>
  </div>
));

// معاينة وحدات القياس
const MeasurementUnitsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="text-xs text-zinc-500">وحدات القياس</div>
    <div className="space-y-2">
      <div>
        <div className="text-[10px] text-zinc-400 mb-1">الوزن:</div>
        <div className="flex gap-1.5">
          <button className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs">كيلوغرام</button>
          <button className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-xs">غرام</button>
        </div>
      </div>
      <div>
        <div className="text-[10px] text-zinc-400 mb-1">الطول:</div>
        <div className="flex gap-1.5">
          <button className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-xs">متر</button>
          <button className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-xs">سنتيمتر</button>
        </div>
      </div>
    </div>
  </div>
));

// ═══════════════════════════════════════════════════════════════════════════
// 📋 GUIDE SECTIONS DATA - بيانات أقسام الدليل
// ═══════════════════════════════════════════════════════════════════════════

const COLORS: Record<string, { bg: string; light: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  green: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  sky: { bg: 'bg-sky-500', light: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
  amber: { bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  pink: { bg: 'bg-pink-500', light: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  teal: { bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  slate: { bg: 'bg-slate-500', light: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
  indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
  red: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' }
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
    subtitle: 'تعرف على نظام المخزون',
    icon: Package,
    color: 'emerald',
    steps: [
      {
        text: 'نظام المخزون المتقدم يدعم جميع أنواع البيع: القطعة، الوزن، الكرتون، والمتر',
        preview: <StatsPreview />
      },
      {
        text: 'يمكنك مشاهدة حالة المخزون بلمحة سريعة: متوفر، منخفض، أو نفذ',
        preview: <ProductCardPreview />
      }
    ],
    tips: [
      'الصفحة تدعم العمل أوفلاين مع المزامنة التلقائية',
      'الإحصائيات تتحدث فورياً عند تحديث المخزون',
      'يمكنك تصفية المنتجات حسب حالة المخزون أو نوع البيع'
    ]
  },
  {
    id: 'search',
    title: 'البحث عن المنتجات',
    subtitle: 'ابحث وصفّي بسرعة',
    icon: Search,
    color: 'blue',
    steps: [
      {
        text: 'استخدم شريط البحث للبحث بالاسم أو الباركود أو رمز SKU',
        preview: <SearchBarPreview />
      },
      {
        text: 'البحث يعمل مع debounce تلقائي لتحسين الأداء',
      }
    ],
    tips: [
      'البحث يعمل فورياً بعد 400ms من التوقف عن الكتابة',
      'يمكنك مسح البحث بضغطة واحدة',
      'البحث يشمل الاسم والباركود ورمز SKU'
    ]
  },
  {
    id: 'filters',
    title: 'التصفية والفلاتر',
    subtitle: 'تنظيم المنتجات بسهولة',
    icon: Filter,
    color: 'violet',
    steps: [
      {
        text: 'صفّي حسب حالة المخزون: الكل، متوفر، منخفض، أو نفذ',
        preview: <StockFiltersPreview />
      },
      {
        text: 'صفّي حسب نوع البيع: قطعة، وزن، كرتون، أو متر',
        preview: <SellingTypeFilterPreview />
      }
    ],
    tips: [
      'يمكن تطبيق أكثر من فلتر في نفس الوقت',
      'فلتر "منخفض" يظهر المنتجات التي تحتاج إعادة تزويد',
      'فلتر "نفذ" يظهر المنتجات التي انتهى مخزونها'
    ]
  },
  {
    id: 'selling-types',
    title: 'أنواع البيع',
    subtitle: 'قطعة، وزن، كرتون، متر',
    icon: Layers,
    color: 'teal',
    steps: [
      {
        text: 'يدعم النظام أربعة أنواع بيع مختلفة لكل منتج',
        preview: <AdvancedSellingTypesPreview />
      },
      {
        text: 'لكل نوع بيع وحدات قياس خاصة به',
        preview: <MeasurementUnitsPreview />
      }
    ],
    tips: [
      'البيع بالقطعة: للمنتجات المفردة (ملابس، أجهزة)',
      'البيع بالوزن: كيلوغرام أو غرام (خضروات، لحوم)',
      'البيع بالكرتون: للبيع بالجملة',
      'البيع بالمتر: متر أو سنتيمتر (أقمشة، حبال)',
      'يمكن تفعيل أكثر من نوع بيع للمنتج الواحد'
    ]
  },
  {
    id: 'update-stock',
    title: 'تحديث المخزون',
    subtitle: 'إضافة، خصم، تحديد',
    icon: Edit,
    color: 'green',
    steps: [
      {
        text: 'اختر نوع العملية: إضافة للزيادة، خصم للنقص، أو تحديد لتعيين قيمة جديدة',
        preview: <OperationTypePreview />
      },
      {
        text: 'اختر نوع الوحدة المناسب للمنتج',
        preview: <UnitTypePreview />
      },
      {
        text: 'استخدم الإجراءات السريعة لإدخال الكميات الشائعة',
        preview: <QuickActionsPreview />
      },
      {
        text: 'شاهد معاينة المخزون قبل التأكيد',
        preview: <StockPreviewPreview />
      }
    ],
    tips: [
      'إضافة: لإضافة كمية جديدة للمخزون (شراء، إرجاع)',
      'خصم: لخصم كمية من المخزون (بيع، تلف)',
      'تحديد: لتعيين قيمة محددة مباشرة (جرد)',
      'المعاينة تظهر الكمية الجديدة قبل التأكيد',
      'يمكنك إضافة ملاحظة لكل عملية'
    ],
    shortcuts: [
      { key: 'Tab', action: 'التنقل بين الحقول' },
      { key: 'Enter', action: 'تأكيد العملية' },
    ]
  },
  {
    id: 'variants',
    title: 'الألوان والمقاسات',
    subtitle: 'إدارة المتغيرات',
    icon: Palette,
    color: 'purple',
    steps: [
      {
        text: 'المنتجات التي لها ألوان ومقاسات يمكن تحديث مخزون كل متغير على حدة',
        preview: <VariantsPreview />
      }
    ],
    tips: [
      'اختر اللون أولاً ثم المقاس إذا كان متاحاً',
      'يمكنك تحديث مخزون "جميع الألوان" دفعة واحدة',
      'المقاسات التي نفد مخزونها تظهر باللون الأحمر',
      'المقاسات المنخفضة تظهر باللون البرتقالي',
      'إجمالي اللون يظهر مجموع كل المقاسات'
    ]
  },
  {
    id: 'offline',
    title: 'العمل أوفلاين',
    subtitle: 'بدون اتصال بالإنترنت',
    icon: WifiOff,
    color: 'orange',
    steps: [
      {
        text: 'يمكنك تحديث المخزون حتى بدون اتصال بالإنترنت',
        preview: <ConnectionStatusPreview />
      },
      {
        text: 'العمليات المعلقة تُزامن تلقائياً عند عودة الاتصال',
        preview: <SyncPreview />
      }
    ],
    tips: [
      'العمليات تُحفظ محلياً عند انقطاع الاتصال',
      'المزامنة تحدث تلقائياً كل 30 ثانية عند الاتصال',
      'يمكنك مزامنة المخزون يدوياً بزر "مزامنة المخزون"',
      'عدد العمليات المعلقة يظهر على الزر البرتقالي',
      'مؤشر حالة الاتصال يظهر في أعلى الصفحة'
    ]
  },
  {
    id: 'sync',
    title: 'المزامنة',
    subtitle: 'تحديث ومزامنة البيانات',
    icon: RefreshCw,
    color: 'cyan',
    steps: [
      {
        text: 'استخدم أزرار التحديث والمزامنة لضمان دقة البيانات',
        preview: <SyncPreview />
      }
    ],
    tips: [
      'زر "تحديث": لتحديث عرض البيانات من الذاكرة المحلية',
      'زر "مزامنة المنتجات": لجلب أحدث بيانات المنتجات من الخادم',
      'زر "مزامنة المخزون": لإرسال العمليات المعلقة للخادم',
      'المزامنة التلقائية تعمل كل 30 ثانية'
    ]
  },
  {
    id: 'batch-info',
    title: 'معلومات الدفعة',
    subtitle: 'تتبع الدفعات والتكاليف',
    icon: ClipboardList,
    color: 'indigo',
    steps: [
      {
        text: 'عند إضافة مخزون جديد، يمكنك تسجيل معلومات الدفعة',
      }
    ],
    tips: [
      'رقم الدفعة: لتتبع مصدر البضاعة',
      'سعر الوحدة: لحساب تكلفة المخزون',
      'الملاحظات: لتوثيق سبب العملية',
      'معلومات الدفعة اختيارية ولكنها مفيدة للتتبع'
    ]
  },
  {
    id: 'tips',
    title: 'نصائح وحيل',
    subtitle: 'استخدم المخزون باحترافية',
    icon: Lightbulb,
    color: 'amber',
    steps: [
      {
        text: 'نصائح لإدارة المخزون بكفاءة',
      }
    ],
    tips: [
      'راجع المخزون المنخفض يومياً',
      'استخدم الجرد الدوري لضمان دقة البيانات',
      'سجّل ملاحظات واضحة لكل عملية تعديل',
      'استخدم أرقام الدفعات لتتبع المصادر',
      'زامن البيانات قبل نهاية يوم العمل',
      'استخدم التصفية لعرض المنتجات التي تحتاج اهتمام'
    ],
    shortcuts: [
      { key: 'Ctrl+F', action: 'التركيز على البحث' },
      { key: 'Escape', action: 'إغلاق النوافذ' }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface InventoryUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InventoryUserGuide: React.FC<InventoryUserGuideProps> = ({ open, onOpenChange }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const section = GUIDE_SECTIONS[currentSection];
  const colors = COLORS[section.color] || COLORS.emerald;

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
                <DialogTitle className="text-lg font-bold">دليل استخدام المخزون</DialogTitle>
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
                const secColors = COLORS[sec.color] || COLORS.emerald;
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

export default memo(InventoryUserGuide);

// ═══════════════════════════════════════════════════════════════════════════
// 🔘 HELP BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const InventoryHelpButton = memo<{ onClick: () => void; className?: string }>(({ onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
      "hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md",
      "transition-all group",
      className
    )}
    title="دليل الاستخدام (?)"
  >
    <HelpCircle className="w-5 h-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
  </button>
));

InventoryHelpButton.displayName = 'InventoryHelpButton';
