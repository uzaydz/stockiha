/**
 * 📖 POSUserGuide - دليل استخدام نقطة البيع
 * ═══════════════════════════════════════════════════════════════════════════
 * دليل تفاعلي بسيط وأنيق مع معاينات حية من الواجهة
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  Search,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  Printer,
  Keyboard,
  WifiOff,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  Layers,
  HelpCircle,
  Settings,
  BarChart3,
  Boxes,
  Play,
  Zap,
  Plus,
  Minus,
  Trash2,
  Barcode,
  User,
  Banknote,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// Mini Components للمعاينة الحية
// ═══════════════════════════════════════════════════════════════════════════

// معاينة شريط البحث
const SearchBarPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-700 shadow-sm">
    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 rounded-xl px-3 py-2">
      <Search className="w-4 h-4 text-zinc-400" />
      <span className="text-sm text-zinc-400">ابحث عن منتج أو امسح الباركود...</span>
      <div className="mr-auto flex items-center gap-1">
        <Barcode className="w-4 h-4 text-zinc-400" />
      </div>
    </div>
  </div>
));

// معاينة بطاقة منتج
const ProductCardPreview = memo<{ selected?: boolean }>(({ selected }) => (
  <div className={cn(
    "bg-white dark:bg-zinc-800 rounded-xl p-3 border-2 transition-all w-32",
    selected
      ? "border-orange-500 shadow-lg shadow-orange-500/20"
      : "border-zinc-200 dark:border-zinc-700"
  )}>
    <div className="w-full h-16 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 rounded-lg mb-2 flex items-center justify-center">
      <Package className="w-6 h-6 text-zinc-400" />
    </div>
    <p className="text-xs font-bold text-zinc-800 dark:text-white truncate">اسم المنتج</p>
    <div className="flex items-center justify-between mt-1">
      <span className="text-xs font-bold text-orange-500">1,500 د.ج</span>
      <span className="text-[10px] text-emerald-500">متوفر</span>
    </div>
  </div>
));

// معاينة عنصر في السلة
const CartItemPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
        <Package className="w-5 h-5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-800 dark:text-white">اسم المنتج</p>
        <p className="text-xs text-zinc-500">1,500 د.ج</p>
      </div>
      <div className="flex items-center gap-1">
        <button className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
          <Minus className="w-3 h-3 text-zinc-500" />
        </button>
        <span className="w-8 text-center text-sm font-bold text-zinc-800 dark:text-white">2</span>
        <button className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
          <Plus className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  </div>
));

// معاينة أزرار الكمية
const QuantityControlPreview = memo(() => (
  <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 w-fit">
    <button className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center hover:bg-zinc-200 transition-colors">
      <Minus className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
    </button>
    <div className="w-12 h-9 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">5</span>
    </div>
    <button className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors">
      <Plus className="w-4 h-4 text-white" />
    </button>
  </div>
));

// معاينة كبسولة الحالة
const StatusCapsulePreview = memo<{ mode: 'sale' | 'return' | 'loss' }>(({ mode }) => {
  const config = {
    sale: { label: 'بيع', color: 'bg-orange-500', icon: ShoppingCart },
    return: { label: 'إرجاع', color: 'bg-blue-500', icon: RotateCcw },
    loss: { label: 'خسائر', color: 'bg-red-500', icon: AlertTriangle }
  };
  const { label, color, icon: Icon } = config[mode];

  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-full text-white text-sm font-bold", color)}>
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
});

// معاينة زر العميل
const CustomerButtonPreview = memo<{ hasCustomer?: boolean }>(({ hasCustomer }) => (
  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 w-full">
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
      hasCustomer
        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600"
        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
    )}>
      {hasCustomer ? 'أ' : <User className="w-4 h-4" />}
    </div>
    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
      {hasCustomer ? 'أحمد محمد' : 'زبون عابر'}
    </span>
    <ChevronLeft className="w-4 h-4 text-zinc-400 mr-auto" />
  </button>
));

// معاينة طرق الدفع
const PaymentMethodsPreview = memo(() => (
  <div className="flex gap-2">
    {[
      { icon: Banknote, label: 'نقدي', active: true },
      { icon: CreditCard, label: 'بطاقة', active: false },
      { icon: RefreshCw, label: 'تحويل', active: false }
    ].map(({ icon: Icon, label, active }) => (
      <button
        key={label}
        className={cn(
          "flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all",
          active
            ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10"
            : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        )}
      >
        <Icon className={cn("w-5 h-5", active ? "text-orange-500" : "text-zinc-400")} />
        <span className={cn("text-xs font-medium", active ? "text-orange-600" : "text-zinc-500")}>{label}</span>
      </button>
    ))}
  </div>
));

// معاينة زر إتمام البيع - التصميم الجديد مع badges
const CheckoutButtonPreview = memo<{ mode?: 'sale' | 'return' | 'loss' }>(({ mode = 'sale' }) => {
  const config = {
    sale: { label: 'إتمام البيع', quickLabel: 'سريع', color: 'bg-orange-500', borderColor: 'border-orange-500', textColor: 'text-orange-500', icon: ShoppingCart },
    return: { label: 'تأكيد الإرجاع', quickLabel: 'إرجاع سريع', color: 'bg-blue-500', borderColor: 'border-blue-500', textColor: 'text-blue-500', icon: RotateCcw },
    loss: { label: 'تسجيل الخسارة', quickLabel: 'تسجيل سريع', color: 'bg-red-500', borderColor: 'border-red-500', textColor: 'text-red-500', icon: AlertTriangle }
  };
  const { label, color, borderColor, textColor, icon: Icon } = config[mode];

  return (
    <div className="flex items-center gap-2">
      {/* زر سريع دائري */}
      <div className="relative shrink-0">
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono bg-zinc-700 text-white px-1.5 py-0.5 rounded-full z-10">
          F12
        </span>
        <button className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center border-2 bg-zinc-100 dark:bg-zinc-800",
          borderColor, textColor
        )}>
          <Zap className="w-5 h-5" />
        </button>
      </div>
      {/* الزر الرئيسي */}
      <div className="relative flex-1">
        <span className="absolute -top-2 left-2 text-[8px] font-mono bg-zinc-700 text-white px-1.5 py-0.5 rounded-full z-10">
          F10
        </span>
        <button className={cn("w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg", color)}>
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </button>
      </div>
    </div>
  );
});

// معاينة الإجمالي
const TotalPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500">المجموع الفرعي</span>
      <span className="font-medium text-zinc-700 dark:text-zinc-200">4,500 د.ج</span>
    </div>
    <div className="flex justify-between text-sm text-amber-600">
      <span>خصم 10%</span>
      <span>- 450 د.ج</span>
    </div>
    <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-2" />
    <div className="flex justify-between">
      <span className="font-bold text-zinc-800 dark:text-white">الإجمالي</span>
      <span className="text-xl font-black text-orange-500">4,050 د.ج</span>
    </div>
  </div>
));

// معاينة مؤشر المخزون
const StockIndicatorPreview = memo(() => (
  <div className="flex gap-3">
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">150 متوفر</span>
    </div>
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">5 منخفض</span>
    </div>
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-500/20">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-xs font-medium text-red-600 dark:text-red-400">0 نفد</span>
    </div>
  </div>
));

// معاينة شارة الجملة
const WholesaleBadgePreview = memo(() => (
  <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500 line-through">2,000 د.ج</span>
      <span className="text-lg font-bold text-green-600">1,500 د.ج</span>
    </div>
    <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-xs">
      جملة -25%
    </Badge>
  </div>
));

// معاينة الجلسة
const SessionIndicatorPreview = memo(() => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30">
    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">جلسة نشطة</span>
    <span className="text-xs text-emerald-600 dark:text-emerald-400">3:45:22</span>
  </div>
));

// ═══════════════════════════════════════════════════════════════════════════
// بيانات الدليل
// ═══════════════════════════════════════════════════════════════════════════

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
    id: 'search',
    title: 'البحث عن المنتجات',
    subtitle: 'ابحث وأضف المنتجات بسرعة',
    icon: Search,
    color: 'blue',
    steps: [
      {
        text: 'اكتب اسم المنتج في شريط البحث أو امسح الباركود مباشرة. يظهر اختصار البحث في الحقل',
        preview: <SearchBarPreview />
      },
      {
        text: 'اضغط على المنتج لإضافته للسلة',
        preview: (
          <div className="flex gap-2">
            <ProductCardPreview />
            <ProductCardPreview selected />
          </div>
        )
      }
    ],
    tips: ['البحث يعمل بالاسم والباركود ورمز SKU', 'الاختصار يظهر ديناميكياً حسب إعداداتك'],
    shortcuts: [
      { key: 'F2', action: 'التركيز على البحث' },
      { key: 'F4', action: 'التركيز على الباركود' },
      { key: 'F3', action: 'مسح البحث' }
    ]
  },
  {
    id: 'cart',
    title: 'إدارة السلة',
    subtitle: 'تعديل الكمية والسعر',
    icon: ShoppingCart,
    color: 'orange',
    steps: [
      {
        text: 'استخدم أزرار + و - لتعديل الكمية، أو اضغط على الرقم لإدخال كمية محددة',
        preview: <QuantityControlPreview />
      },
      {
        text: 'اضغط على السعر لتعديله (يتطلب صلاحية)',
        preview: <CartItemPreview />
      }
    ],
    tips: ['اضغط على سلة المهملات لحذف المنتج', 'الاختصارات تظهر فوق الأزرار كـ badges'],
    shortcuts: [
      { key: 'Ctrl+N', action: 'سلة جديدة' },
      { key: 'Alt+X', action: 'حذف السلة' }
    ]
  },
  {
    id: 'customer',
    title: 'اختيار العميل',
    subtitle: 'ربط الفاتورة بعميل',
    icon: Users,
    color: 'purple',
    steps: [
      {
        text: 'اضغط على "زبون عابر" لاختيار أو إضافة عميل',
        preview: <CustomerButtonPreview />
      },
      {
        text: 'بعد الاختيار يظهر اسم العميل',
        preview: <CustomerButtonPreview hasCustomer />
      }
    ],
    tips: ['يمكنك إضافة عميل جديد من نفس النافذة']
  },
  {
    id: 'checkout',
    title: 'إتمام البيع',
    subtitle: 'اختر طريقة الدفع وأكمل',
    icon: CreditCard,
    color: 'indigo',
    steps: [
      {
        text: 'راجع الإجمالي والخصومات',
        preview: <TotalPreview />
      },
      {
        text: 'اختر طريقة الدفع المناسبة',
        preview: <PaymentMethodsPreview />
      },
      {
        text: 'الزر الدائري للبيع السريع، والمستطيل لإتمام البيع. الاختصارات تظهر فوق الأزرار',
        preview: <CheckoutButtonPreview mode="sale" />
      }
    ],
    tips: [
      'F10 لفتح نافذة الدفع مع اختيار الطريقة',
      'F12 للبيع السريع المباشر (نقدي)',
      'الأزرار تتغير حسب الوضع (بيع/إرجاع/خسارة)'
    ],
    shortcuts: [
      { key: 'F10', action: 'إتمام البيع / الإرجاع / الخسارة' },
      { key: 'F12', action: 'سريع (يعمل في جميع الأوضاع)' },
      { key: 'Alt+C', action: 'دفع نقدي سريع' },
      { key: 'Alt+K', action: 'دفع بطاقة سريع' }
    ]
  },
  {
    id: 'modes',
    title: 'أوضاع العمل',
    subtitle: 'تبديل سريع بالاختصارات',
    icon: RefreshCw,
    color: 'sky',
    steps: [
      {
        text: 'استخدم الاختصارات Alt+1/2/3 للتبديل السريع بين الأوضاع',
        preview: (
          <div className="flex flex-wrap gap-2">
            <StatusCapsulePreview mode="sale" />
            <StatusCapsulePreview mode="return" />
            <StatusCapsulePreview mode="loss" />
          </div>
        )
      },
      {
        text: 'أزرار الدفع تتكيف تلقائياً مع كل وضع',
        preview: (
          <div className="space-y-3">
            <CheckoutButtonPreview mode="sale" />
            <CheckoutButtonPreview mode="return" />
            <CheckoutButtonPreview mode="loss" />
          </div>
        )
      }
    ],
    tips: [
      'وضع البيع (برتقالي): للمبيعات العادية',
      'وضع الإرجاع (أزرق): لقبول المرتجعات',
      'وضع الخسائر (أحمر): لتسجيل التلفيات - يتطلب إدخال السبب'
    ],
    shortcuts: [
      { key: 'Alt+1', action: 'وضع البيع' },
      { key: 'Alt+2', action: 'وضع الإرجاع' },
      { key: 'Alt+3', action: 'وضع الخسارة' },
      { key: 'F7', action: 'تبديل وضع الإرجاع' }
    ]
  },
  {
    id: 'wholesale',
    title: 'أسعار الجملة',
    subtitle: 'خصومات تلقائية للكميات',
    icon: Layers,
    color: 'green',
    steps: [
      {
        text: 'عند إضافة كمية كبيرة، يُطبق سعر الجملة تلقائياً ويظهر التوفير',
        preview: <WholesaleBadgePreview />
      }
    ],
    tips: ['شارة "جملة" خضراء تظهر مع نسبة التوفير']
  },
  {
    id: 'inventory',
    title: 'المخزون',
    subtitle: 'تتبع الكميات المتاحة',
    icon: Boxes,
    color: 'teal',
    steps: [
      {
        text: 'يظهر المخزون بألوان مختلفة حسب التوفر',
        preview: <StockIndicatorPreview />
      }
    ],
    tips: [
      'أخضر = مخزون كافٍ',
      'برتقالي = مخزون منخفض',
      'أحمر = نفد المخزون'
    ]
  },
  {
    id: 'session',
    title: 'جلسة العمل',
    subtitle: 'تتبع مبيعاتك اليومية',
    icon: Clock,
    color: 'emerald',
    steps: [
      {
        text: 'ابدأ جلسة جديدة عند بداية العمل، وأغلقها عند الانتهاء',
        preview: <SessionIndicatorPreview />
      }
    ],
    tips: ['أدخل المبلغ الافتتاحي عند بدء الجلسة', 'تقرير مفصل يظهر عند الإغلاق']
  },
  {
    id: 'shortcuts',
    title: 'الاختصارات',
    subtitle: 'قابلة للتخصيص',
    icon: Keyboard,
    color: 'violet',
    steps: [
      {
        text: 'يمكنك تخصيص الاختصارات من إعدادات POS. اضغط F8 لفتح الإعدادات'
      }
    ],
    tips: [
      'اضغط على أي اختصار في مدير الاختصارات لتغييره',
      'الاختصارات تُحفظ وتُطبق فوراً في كل مكان',
      'اضغط "استعادة الافتراضي" للعودة للاختصارات الأصلية'
    ],
    shortcuts: [
      { key: 'F1', action: 'فتح الدليل' },
      { key: 'F2', action: 'البحث عن منتج' },
      { key: 'F3', action: 'مسح البحث' },
      { key: 'F4', action: 'التركيز على الباركود' },
      { key: 'F5', action: 'تحديث البيانات' },
      { key: 'F6', action: 'فتح/إغلاق السلة' },
      { key: 'F7', action: 'تبديل وضع الإرجاع' },
      { key: 'F8', action: 'إعدادات POS' },
      { key: 'F9', action: 'آلة حاسبة' },
      { key: 'F10', action: 'إتمام الطلب' },
      { key: 'F11', action: 'شاشة كاملة' },
      { key: 'F12', action: 'سريع (بيع/إرجاع/خسارة)' },
      { key: 'Alt+1', action: 'وضع البيع' },
      { key: 'Alt+2', action: 'وضع الإرجاع' },
      { key: 'Alt+3', action: 'وضع الخسارة' },
      { key: 'Alt+C', action: 'دفع نقدي سريع' },
      { key: 'Alt+K', action: 'دفع بطاقة سريع' },
      { key: 'Alt+X', action: 'حذف السلة' },
      { key: 'Ctrl+N', action: 'سلة جديدة' },
      { key: 'Ctrl+S', action: 'حفظ الطلب' },
      { key: 'Ctrl+P', action: 'طباعة' },
      { key: 'Escape', action: 'إغلاق / إلغاء' }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// تكوين الألوان
// ═══════════════════════════════════════════════════════════════════════════

const COLORS: Record<string, { bg: string; light: string; text: string }> = {
  blue: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
  sky: { bg: 'bg-sky-500', light: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
  green: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  teal: { bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' }
};

// ═══════════════════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════

interface POSUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POSUserGuide: React.FC<POSUserGuideProps> = memo(({ open, onOpenChange }) => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const currentSection = useMemo(() =>
    GUIDE_SECTIONS.find(s => s.id === selectedSection),
    [selectedSection]
  );

  const handleClose = useCallback(() => {
    setSelectedSection(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleBack = useCallback(() => {
    setSelectedSection(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg h-[85vh] p-0 gap-0 bg-background border-border flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* الرأس - بسيط */}
        <div className="flex-shrink-0 border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              {currentSection ? (
                <>
                  <div className="text-left">
                    <h2 className="font-semibold text-foreground">{currentSection.title}</h2>
                    <p className="text-xs text-muted-foreground">{currentSection.subtitle}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <currentSection.icon className="w-5 h-5 text-orange-500" />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-left">
                    <h2 className="font-semibold text-foreground">دليل الاستخدام</h2>
                    <p className="text-xs text-muted-foreground">تعلّم كيف تستخدم نقطة البيع</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-orange-500" />
                  </div>
                </>
              )}
            </div>

            {selectedSection ? (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>
            ) : (
              <div className="w-9" /> // placeholder للمحافظة على التوازن
            )}
          </div>
        </div>

        {/* المحتوى - باستخدام overflow-y-auto مباشرة */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 pb-8">
            <AnimatePresence mode="wait">
              {selectedSection && currentSection ? (
                // تفاصيل القسم - تصميم بسيط
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* الخطوات */}
                  {currentSection.steps.map((step, idx) => (
                    <div key={idx} className="bg-card rounded-lg p-4 border border-border">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-orange-500 text-white shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-foreground leading-relaxed pt-0.5">
                          {step.text}
                        </p>
                      </div>

                      {step.preview && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-dashed border-border">
                          {step.preview}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* النصائح */}
                  {currentSection.tips && currentSection.tips.length > 0 && (
                    <div className="bg-orange-500/5 rounded-lg p-4 border border-orange-500/20">
                      <div className="flex items-center gap-2 text-orange-500 mb-2">
                        <Lightbulb className="w-4 h-4" />
                        <span className="text-sm font-medium">نصائح</span>
                      </div>
                      <ul className="space-y-1.5">
                        {currentSection.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* الاختصارات */}
                  {currentSection.shortcuts && currentSection.shortcuts.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-3">
                        <Keyboard className="w-4 h-4" />
                        <span className="text-sm font-medium">اختصارات</span>
                      </div>
                      <div className="grid gap-2">
                        {currentSection.shortcuts.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border">
                            <span className="text-sm text-foreground">{s.action}</span>
                            <kbd className="px-2 py-1 text-xs font-mono bg-muted text-muted-foreground rounded border border-border">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                // قائمة الأقسام - تصميم بسيط
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {GUIDE_SECTIONS.map((section, idx) => {
                    const Icon = section.icon;

                    return (
                      <motion.button
                        key={section.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelectedSection(section.id)}
                        className="w-full p-3 rounded-lg border border-border hover:border-orange-500/50 bg-card hover:bg-muted/50 transition-all text-right group"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{section.title}</p>
                            <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                          </div>
                          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-orange-500" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* التذييل - بسيط */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>بازار</span>
            <div className="flex items-center gap-1.5">
              <span>لفتح الدليل</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">F1</kbd>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

POSUserGuide.displayName = 'POSUserGuide';

export default POSUserGuide;

// ═══════════════════════════════════════════════════════════════════════════
// زر المساعدة
// ═══════════════════════════════════════════════════════════════════════════

export const POSHelpButton = memo<{ onClick: () => void; className?: string }>(({ onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
      "hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-md",
      "transition-all group",
      className
    )}
    title="دليل الاستخدام (F1)"
  >
    <HelpCircle className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transition-colors" />
  </button>
));

POSHelpButton.displayName = 'POSHelpButton';
