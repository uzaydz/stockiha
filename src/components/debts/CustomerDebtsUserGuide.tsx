/**
 * 📖 CustomerDebtsUserGuide - دليل استخدام مديونيات العملاء
 * ═══════════════════════════════════════════════════════════════════════════
 * دليل تفاعلي شامل لإدارة مديونيات العملاء مع معاينات حية
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  Wallet,
  CreditCard,
  FileText,
  TrendingUp,
  Eye,
  Calendar,
  RefreshCw,
  Keyboard,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Plus,
  DollarSign,
  Clock,
  AlertTriangle,
  Banknote,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Cloud,
  CloudOff,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// Mini Components للمعاينة الحية
// ═══════════════════════════════════════════════════════════════════════════

// معاينة صف عميل مديون
const DebtRowPreview = memo<{ expanded?: boolean }>(({ expanded }) => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
    <div className="flex items-center gap-3 p-3">
      <button className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-800 dark:text-white">أحمد محمد علي</p>
      </div>
      <div className="text-center px-3">
        <p className="text-xs text-zinc-500">الطلبات</p>
        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">3</p>
      </div>
      <div className="text-center px-3">
        <p className="text-xs text-zinc-500">الدين</p>
        <p className="text-sm font-bold text-red-600">45,000 د.ج</p>
      </div>
      <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
        مديون
      </Badge>
      <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
        <Eye className="w-3 h-3" />
        عرض
      </button>
    </div>
    {expanded && (
      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 border-t border-zinc-200 dark:border-zinc-700">
        <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          طلبات أحمد محمد علي
        </p>
        <div className="space-y-2">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-2 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">#ORD-2024-089</span>
              <div className="flex items-center gap-3">
                <span className="text-zinc-500">الإجمالي: <span className="text-zinc-700 dark:text-zinc-200">25,000</span></span>
                <span className="text-zinc-500">المدفوع: <span className="text-emerald-600">15,000</span></span>
                <span className="text-zinc-500">المتبقي: <span className="text-red-600 font-bold">10,000</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
));

// معاينة الإحصائيات
const StatsPreview = memo(() => (
  <div className="grid grid-cols-2 gap-2">
    {[
      { label: 'إجمالي الديون', value: '450,000 د.ج', icon: CreditCard, color: 'red' },
      { label: 'عدد الطلبات', value: '24', icon: FileText, color: 'orange' },
      { label: 'العملاء المدينين', value: '8', icon: Users, color: 'amber' },
      { label: 'متوسط الدين', value: '56,250 د.ج', icon: TrendingUp, color: 'violet' },
    ].map(({ label, value, icon: Icon, color }) => (
      <div key={label} className={cn(
        "p-3 rounded-xl border",
        color === 'red' && "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30",
        color === 'orange' && "bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30",
        color === 'amber' && "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30",
        color === 'violet' && "bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30"
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "w-4 h-4",
            color === 'red' && "text-red-500",
            color === 'orange' && "text-orange-500",
            color === 'amber' && "text-amber-500",
            color === 'violet' && "text-violet-500"
          )} />
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        <p className="text-sm font-bold text-zinc-800 dark:text-white mt-1">{value}</p>
      </div>
    ))}
  </div>
));

// معاينة البحث
const SearchPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 rounded-xl px-3 py-2">
      <Search className="w-4 h-4 text-zinc-400" />
      <span className="text-sm text-zinc-400">ابحث عن عميل بالاسم...</span>
    </div>
  </div>
));

// معاينة تفاصيل الدين
const DebtDetailsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Receipt className="w-5 h-5 text-orange-500" />
        <span className="font-bold text-zinc-800 dark:text-white">#ORD-2024-089</span>
      </div>
      <span className="text-xs text-zinc-500">10/12/2024</span>
    </div>
    <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <p className="text-xs text-zinc-500">الإجمالي</p>
        <p className="text-sm font-bold text-zinc-800 dark:text-white">25,000 د.ج</p>
      </div>
      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
        <p className="text-xs text-zinc-500">المدفوع</p>
        <p className="text-sm font-bold text-emerald-600">15,000 د.ج</p>
      </div>
      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
        <p className="text-xs text-zinc-500">المتبقي</p>
        <p className="text-sm font-bold text-red-600">10,000 د.ج</p>
      </div>
    </div>
  </div>
));

// معاينة تسجيل دفعة
const PaymentFormPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
      <Banknote className="w-5 h-5" />
      <span className="font-bold">تسجيل دفعة</span>
    </div>
    <div className="space-y-2">
      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <label className="text-xs text-zinc-500 block mb-1">المبلغ المتبقي</label>
        <p className="text-lg font-bold text-red-600">10,000 د.ج</p>
      </div>
      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <label className="text-xs text-zinc-500 block mb-1">مبلغ الدفعة</label>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">5,000</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          دفعة جزئية
        </button>
        <button className="flex-1 py-2 rounded-lg bg-emerald-500 text-sm font-medium text-white">
          دفع كامل
        </button>
      </div>
    </div>
  </div>
));

// معاينة إضافة دين
const AddDebtPreview = memo(() => (
  <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-4 border border-orange-200 dark:border-orange-500/30 space-y-3">
    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
      <Plus className="w-5 h-5" />
      <span className="font-bold">إضافة دين جديد</span>
    </div>
    <div className="space-y-2 text-sm">
      <div className="p-2 rounded-lg bg-white dark:bg-zinc-800">
        <label className="text-xs text-zinc-500 block mb-1">العميل</label>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-700 dark:text-zinc-200">اختر عميل...</span>
        </div>
      </div>
      <div className="p-2 rounded-lg bg-white dark:bg-zinc-800">
        <label className="text-xs text-zinc-500 block mb-1">المبلغ</label>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-700 dark:text-zinc-200">0.00 د.ج</span>
        </div>
      </div>
    </div>
  </div>
));

// معاينة شريط التقدم
const ProgressBarPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">نسبة السداد</span>
      <span className="font-bold text-emerald-600">60%</span>
    </div>
    <div className="h-3 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
      <div className="h-full w-3/5 bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full" />
    </div>
    <div className="flex items-center justify-between text-xs text-zinc-500">
      <span>المدفوع: 15,000 د.ج</span>
      <span>المتبقي: 10,000 د.ج</span>
    </div>
  </div>
));

// معاينة المزامنة
const SyncStatusPreview = memo(() => (
  <div className="space-y-2">
    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
      <Cloud className="w-5 h-5 text-emerald-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">متصل - مُزامَن</span>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">جميع الدفعات محدثة</p>
      </div>
      <CheckCircle className="w-5 h-5 text-emerald-500" />
    </div>
    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
      <CloudOff className="w-5 h-5 text-amber-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">وضع أوفلاين</span>
        <p className="text-xs text-amber-600 dark:text-amber-400">2 دفعات في انتظار المزامنة</p>
      </div>
    </div>
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
    id: 'overview',
    title: 'نظرة عامة',
    subtitle: 'فهم واجهة إدارة المديونيات',
    icon: Wallet,
    color: 'red',
    steps: [
      {
        text: 'صفحة المديونيات تعرض جميع العملاء المدينين مع إجمالي ديونهم وعدد الطلبات غير المسددة',
        preview: <DebtRowPreview />
      },
      {
        text: 'الإحصائيات في أعلى الصفحة تعطيك صورة شاملة عن حالة الديون',
        preview: <StatsPreview />
      }
    ],
    tips: [
      'العملاء مرتبون حسب إجمالي الدين (الأعلى أولاً)',
      'اضغط على السهم لعرض تفاصيل طلبات العميل'
    ]
  },
  {
    id: 'view-debts',
    title: 'عرض الديون',
    subtitle: 'استكشاف ديون العملاء',
    icon: Eye,
    color: 'blue',
    steps: [
      {
        text: 'اضغط على زر التوسيع أو "عرض" لمشاهدة جميع الطلبات غير المسددة للعميل',
        preview: <DebtRowPreview expanded />
      },
      {
        text: 'كل طلب يعرض: الإجمالي، المبلغ المدفوع، والمبلغ المتبقي',
        preview: <DebtDetailsPreview />
      }
    ],
    tips: [
      'يمكنك توسيع عميل واحد فقط في كل مرة',
      'الطلبات مرتبة من الأقدم للأحدث'
    ]
  },
  {
    id: 'search',
    title: 'البحث',
    subtitle: 'ابحث عن عميل مديون',
    icon: Search,
    color: 'cyan',
    steps: [
      {
        text: 'استخدم شريط البحث للعثور على عميل مديون بسرعة',
        preview: <SearchPreview />
      }
    ],
    tips: [
      'البحث يتم بالاسم فقط',
      'النتائج تظهر فورياً أثناء الكتابة'
    ],
    shortcuts: [
      { key: 'Ctrl+F', action: 'التركيز على البحث' }
    ]
  },
  {
    id: 'record-payment',
    title: 'تسجيل دفعة',
    subtitle: 'تسجيل سداد من العميل',
    icon: Banknote,
    color: 'emerald',
    steps: [
      {
        text: 'اضغط على زر "دفع" بجانب الطلب لفتح نافذة تسجيل الدفعة',
        preview: <PaymentFormPreview />
      },
      {
        text: 'يمكنك اختيار دفعة جزئية أو سداد كامل المبلغ المتبقي',
        preview: <ProgressBarPreview />
      }
    ],
    tips: [
      'دفعة جزئية: أدخل المبلغ المراد تسجيله',
      'دفع كامل: يسدد كل المبلغ المتبقي',
      'المخزون لا يتأثر بتسجيل الدفعات',
      'يمكنك تسجيل الدفعات حتى بدون اتصال'
    ],
    shortcuts: [
      { key: 'Enter', action: 'تأكيد الدفعة' },
      { key: 'Escape', action: 'إلغاء' }
    ]
  },
  {
    id: 'add-debt',
    title: 'إضافة دين',
    subtitle: 'تسجيل دين جديد يدوياً',
    icon: Plus,
    color: 'orange',
    steps: [
      {
        text: 'اضغط على زر "إضافة دين" لتسجيل دين جديد لعميل',
        preview: <AddDebtPreview />
      }
    ],
    tips: [
      'الديون تُضاف عادةً تلقائياً من الطلبات',
      'استخدم هذه الميزة للديون الخارجية فقط',
      'يجب اختيار عميل موجود في النظام'
    ]
  },
  {
    id: 'stats',
    title: 'الإحصائيات',
    subtitle: 'فهم أرقام المديونيات',
    icon: BarChart3,
    color: 'violet',
    steps: [
      {
        text: 'الإحصائيات تعطيك نظرة شاملة على حالة الديون',
        preview: <StatsPreview />
      }
    ],
    tips: [
      'إجمالي الديون: مجموع كل المبالغ المتبقية',
      'عدد الطلبات: الطلبات التي لم تُسدد بالكامل',
      'العملاء المدينين: عدد العملاء الذين لديهم ديون',
      'متوسط الدين: إجمالي الديون ÷ عدد العملاء'
    ]
  },
  {
    id: 'sync',
    title: 'المزامنة',
    subtitle: 'العمل بدون إنترنت',
    icon: Cloud,
    color: 'green',
    steps: [
      {
        text: 'يمكنك تسجيل الدفعات حتى بدون اتصال بالإنترنت',
        preview: <SyncStatusPreview />
      }
    ],
    tips: [
      'الدفعات تُحفظ محلياً فوراً',
      'المزامنة تتم تلقائياً عند الاتصال',
      'الطلبات غير المتزامنة تظهر بعلامة خاصة'
    ]
  },
  {
    id: 'shortcuts-all',
    title: 'جميع الاختصارات',
    subtitle: 'تصفح سريع بلوحة المفاتيح',
    icon: Keyboard,
    color: 'zinc',
    steps: [
      {
        text: 'استخدم اختصارات لوحة المفاتيح للتنقل السريع'
      }
    ],
    shortcuts: [
      { key: 'Ctrl+F', action: 'البحث عن عميل' },
      { key: 'R', action: 'تحديث البيانات' },
      { key: 'Enter', action: 'توسيع/طي العميل المحدد' },
      { key: '↑ / ↓', action: 'التنقل بين العملاء' },
      { key: 'Escape', action: 'إغلاق النوافذ المنبثقة' },
      { key: '?', action: 'فتح دليل الاستخدام' }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// تكوين الألوان
// ═══════════════════════════════════════════════════════════════════════════

const COLORS: Record<string, { bg: string; light: string; text: string }> = {
  red: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  green: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  zinc: { bg: 'bg-zinc-500', light: 'bg-zinc-50 dark:bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400' }
};

// ═══════════════════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════

interface CustomerDebtsUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomerDebtsUserGuide: React.FC<CustomerDebtsUserGuideProps> = memo(({ open, onOpenChange }) => {
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
        className="max-w-lg h-[85vh] p-0 gap-0 bg-zinc-50 dark:bg-[#0d1117] border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* الرأس */}
        <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="h-1 bg-gradient-to-l from-red-500 via-orange-500 to-amber-500" />

          <div className="p-4 flex items-center gap-3">
            {selectedSection && (
              <button
                onClick={handleBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-500 rotate-180" />
              </button>
            )}

            <div className="flex items-center gap-3 flex-1">
              {currentSection ? (
                <>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", COLORS[currentSection.color].bg)}>
                    <currentSection.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-zinc-800 dark:text-white">{currentSection.title}</h2>
                    <p className="text-xs text-zinc-500">{currentSection.subtitle}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-zinc-800 dark:text-white">دليل المديونيات</h2>
                    <p className="text-xs text-zinc-500">تعلّم كيف تدير ديون العملاء</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 pb-8">
            <AnimatePresence mode="wait">
              {selectedSection && currentSection ? (
                // تفاصيل القسم
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* الخطوات */}
                  {currentSection.steps.map((step, idx) => (
                    <div key={idx} className="bg-white dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-700/50">
                      <div className="flex items-start gap-3 mb-3">
                        <span className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
                          COLORS[currentSection.color].bg
                        )}>
                          {idx + 1}
                        </span>
                        <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed pt-1">
                          {step.text}
                        </p>
                      </div>

                      {step.preview && (
                        <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                          {step.preview}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* النصائح */}
                  {currentSection.tips && currentSection.tips.length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/20">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                        <Lightbulb className="w-4 h-4" />
                        <span className="text-sm font-bold">نصائح</span>
                      </div>
                      <ul className="space-y-1.5">
                        {currentSection.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* الاختصارات */}
                  {currentSection.shortcuts && currentSection.shortcuts.length > 0 && (
                    <div className="bg-violet-50 dark:bg-violet-500/10 rounded-2xl p-4 border border-violet-200 dark:border-violet-500/20">
                      <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-3">
                        <Keyboard className="w-4 h-4" />
                        <span className="text-sm font-bold">اختصارات</span>
                      </div>
                      <div className="grid gap-2">
                        {currentSection.shortcuts.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg px-3 py-2">
                            <span className="text-sm text-zinc-700 dark:text-zinc-200">{s.action}</span>
                            <kbd className="px-2 py-1 text-xs font-mono bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-md border border-violet-200 dark:border-violet-500/30">
                              {s.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                // قائمة الأقسام
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-2"
                >
                  {GUIDE_SECTIONS.map((section, idx) => {
                    const colors = COLORS[section.color];
                    const Icon = section.icon;

                    return (
                      <motion.button
                        key={section.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setSelectedSection(section.id)}
                        className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md transition-all text-right group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", colors.bg)}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-zinc-800 dark:text-white">{section.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{section.subtitle}</p>
                          </div>
                          <ChevronLeft className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* التذييل */}
        <div className="flex-shrink-0 p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 font-mono">?</kbd>
              <span>لفتح الدليل</span>
            </div>
            <span>بازار - إدارة المديونيات</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CustomerDebtsUserGuide.displayName = 'CustomerDebtsUserGuide';

export default CustomerDebtsUserGuide;

// ═══════════════════════════════════════════════════════════════════════════
// زر المساعدة
// ═══════════════════════════════════════════════════════════════════════════

export const CustomerDebtsHelpButton = memo<{ onClick: () => void; className?: string }>(({ onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
      "hover:border-red-300 dark:hover:border-red-500/50 hover:shadow-md",
      "transition-all group",
      className
    )}
    title="دليل المديونيات (?)"
  >
    <HelpCircle className="w-5 h-5 text-zinc-400 group-hover:text-red-500 transition-colors" />
  </button>
));

CustomerDebtsHelpButton.displayName = 'CustomerDebtsHelpButton';
