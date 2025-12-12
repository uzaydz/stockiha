/**
 * LossesUserGuide - دليل استخدام صفحة تصاريح الخسائر
 * ============================================================
 * دليل شامل ومفصل لإدارة تصاريح الخسائر بأسلوب Apple
 * ============================================================
 */

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  Package,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  FileText,
  TrendingDown,
  RefreshCw,
  Eye,
  Lightbulb,
  Flame,
  Droplets,
  Bug,
  Calendar,
  Trash2,
  ShieldAlert,
  Filter,
  ChevronLeft as ChevronLeftIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===============================================================================
// Types
// ===============================================================================

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  steps: string[];
  tips: string[];
  shortcuts?: { key: string; action: string }[];
}

// ===============================================================================
// Mini Preview Components
// ===============================================================================

// Stats Preview
const StatsPreview = memo(() => (
  <div className="grid grid-cols-3 gap-2" dir="rtl">
    {[
      { label: 'إجمالي', value: '23', color: 'orange', icon: Package },
      { label: 'في الانتظار', value: '5', color: 'amber', icon: Clock },
      { label: 'معتمدة', value: '15', color: 'emerald', icon: CheckCircle },
    ].map((stat, idx) => (
      <motion.div
        key={stat.label}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: idx * 0.1 }}
        className="bg-white dark:bg-zinc-800 rounded-xl p-2.5 border border-zinc-200 dark:border-zinc-700"
      >
        <div className="flex items-center justify-between mb-1">
          <div className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center",
            `bg-${stat.color}-50 dark:bg-${stat.color}-950/50`
          )}>
            <stat.icon className={cn("w-3.5 h-3.5", `text-${stat.color}-600`)} />
          </div>
          <p className={cn("text-lg font-bold font-numeric", `text-${stat.color}-600`)}>
            {stat.value}
          </p>
        </div>
        <p className="text-[10px] text-zinc-500">{stat.label}</p>
      </motion.div>
    ))}
  </div>
));
StatsPreview.displayName = 'StatsPreview';

// Loss Types Preview
const LossTypesPreview = memo(() => {
  const types = [
    { label: 'تلف', icon: AlertTriangle, color: 'orange' },
    { label: 'سرقة', icon: ShieldAlert, color: 'purple' },
    { label: 'انتهاء صلاحية', icon: Calendar, color: 'amber' },
    { label: 'حريق', icon: Flame, color: 'red' },
    { label: 'فيضان', icon: Droplets, color: 'blue' },
    { label: 'أخرى', icon: Bug, color: 'zinc' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2" dir="rtl">
      {types.map((type, idx) => (
        <motion.div
          key={type.label}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
        >
          <type.icon className={cn("w-4 h-4", `text-${type.color}-500`)} />
          <span className="text-[10px] font-medium">{type.label}</span>
        </motion.div>
      ))}
    </div>
  );
});
LossTypesPreview.displayName = 'LossTypesPreview';

// Loss Status Preview
const LossStatusPreview = memo(() => {
  const statuses = [
    { label: 'في الانتظار', color: 'amber', icon: Clock },
    { label: 'معتمد', color: 'emerald', icon: CheckCircle },
    { label: 'مرفوض', color: 'red', icon: XCircle },
    { label: 'قيد التحقيق', color: 'blue', icon: Search },
  ];

  return (
    <div className="space-y-2" dir="rtl">
      {statuses.map((status, idx) => (
        <motion.div
          key={status.label}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            `bg-${status.color}-50 dark:bg-${status.color}-950/50`
          )}>
            <status.icon className={cn("w-4 h-4", `text-${status.color}-600`)} />
          </div>
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
            `bg-${status.color}-50 text-${status.color}-600 dark:bg-${status.color}-950/40`
          )}>
            {status.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
});
LossStatusPreview.displayName = 'LossStatusPreview';

// Create Loss Preview
const CreateLossPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500">نوع الخسارة:</span>
        <span className="text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded">تلف</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500">الوصف:</span>
        <span className="text-xs">تلف بضاعة بسبب الرطوبة</span>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-zinc-800 rounded-xl p-2.5 border border-zinc-200 dark:border-zinc-700"
    >
      <p className="text-[10px] text-zinc-500 mb-2">المنتجات المضافة</p>
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-zinc-400" />
        <span className="text-xs">منتج 1</span>
        <span className="text-[10px] text-zinc-400 mr-auto">3 قطعة</span>
        <span className="text-xs font-bold text-red-600">-1,500 د.ج</span>
      </div>
    </motion.div>
  </div>
));
CreateLossPreview.displayName = 'CreateLossPreview';

// Search & Filter Preview
const SearchFilterPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative"
    >
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <div className="w-full h-9 bg-zinc-100 dark:bg-zinc-700 rounded-lg pr-9 flex items-center">
        <span className="text-xs text-zinc-500">البحث برقم التصريح...</span>
      </div>
    </motion.div>

    <div className="flex gap-2">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 h-8 bg-white dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600 flex items-center justify-between px-2"
      >
        <span className="text-[10px] text-zinc-500">الحالة</span>
        <ChevronRight className="w-3 h-3 text-zinc-400 rotate-90" />
      </motion.div>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 h-8 bg-white dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600 flex items-center justify-between px-2"
      >
        <span className="text-[10px] text-zinc-500">النوع</span>
        <ChevronRight className="w-3 h-3 text-zinc-400 rotate-90" />
      </motion.div>
    </div>
  </div>
));
SearchFilterPreview.displayName = 'SearchFilterPreview';

// Loss Row Preview
const LossRowPreview = memo(() => (
  <div className="space-y-2" dir="rtl">
    {[
      { number: 'LOSS-001', type: 'تلف', cost: '3,500', status: 'pending' },
      { number: 'LOSS-002', type: 'سرقة', cost: '12,000', status: 'approved' },
    ].map((item, idx) => (
      <motion.div
        key={item.number}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: idx * 0.15 }}
        className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
      >
        <div className="flex-1">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{item.number}</p>
          <p className="text-[10px] text-zinc-500">{item.type}</p>
        </div>
        <span className="text-xs font-bold text-red-600 font-numeric">{item.cost} د.ج</span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-semibold",
          item.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
        )}>
          {item.status === 'pending' ? 'في الانتظار' : 'معتمد'}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </motion.div>
    ))}
  </div>
));
LossRowPreview.displayName = 'LossRowPreview';

// Process Loss Preview
const ProcessLossPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-zinc-500">رقم التصريح</span>
        <span className="text-xs font-semibold font-mono">LOSS-001</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-zinc-500">قيمة الخسارة</span>
        <span className="text-sm font-bold text-red-600 font-numeric">3,500 د.ج</span>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex gap-2"
    >
      <Button size="sm" className="flex-1 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
        <CheckCircle className="w-4 h-4" />
        اعتماد
      </Button>
      <Button size="sm" variant="destructive" className="flex-1 h-9 rounded-xl gap-1.5">
        <XCircle className="w-4 h-4" />
        رفض
      </Button>
    </motion.div>
  </div>
));
ProcessLossPreview.displayName = 'ProcessLossPreview';

// Delete Loss Preview
const DeleteLossPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800"
    >
      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
        <Trash2 className="w-5 h-5 text-red-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-red-700 dark:text-red-400">حذف التصريح</p>
        <p className="text-[10px] text-red-600 dark:text-red-500">LOSS-001</p>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex gap-2"
    >
      <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl">
        إلغاء
      </Button>
      <Button size="sm" variant="destructive" className="flex-1 h-9 rounded-xl">
        حذف
      </Button>
    </motion.div>
  </div>
));
DeleteLossPreview.displayName = 'DeleteLossPreview';

// Loss Details Preview
const LossDetailsPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2"
    >
      {[
        { label: 'النوع', value: 'تلف' },
        { label: 'الوصف', value: 'تلف بضاعة بسبب الرطوبة' },
        { label: 'عدد المنتجات', value: '5' },
        { label: 'قيمة التكلفة', value: '3,500 د.ج', highlight: true },
      ].map((item, idx) => (
        <div key={idx} className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-700 last:border-0">
          <span className="text-xs text-zinc-500">{item.label}</span>
          <span className={cn("text-xs font-medium", item.highlight && "text-red-600 font-bold font-numeric")}>
            {item.value}
          </span>
        </div>
      ))}
    </motion.div>
  </div>
));
LossDetailsPreview.displayName = 'LossDetailsPreview';

// Sync Preview
const SyncPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800"
    >
      <RefreshCw className="w-5 h-5 text-emerald-600" />
      <div>
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">متصل</p>
        <p className="text-[10px] text-emerald-600 dark:text-emerald-500">البيانات محدثة</p>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center gap-2 p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800"
    >
      <Clock className="w-4 h-4 text-orange-600" />
      <span className="text-[10px] text-orange-600">2 تصريحات في انتظار المزامنة</span>
    </motion.div>
  </div>
));
SyncPreview.displayName = 'SyncPreview';

// ===============================================================================
// Guide Sections Data
// ===============================================================================

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'overview',
    title: 'نظرة عامة',
    subtitle: 'فهم شامل لصفحة تصاريح الخسائر',
    icon: AlertTriangle,
    color: 'red',
    steps: [
      'تعرض صفحة الخسائر جميع تصاريح الخسائر المسجلة',
      'بطاقات إحصائية في الأعلى تعرض ملخص الخسائر',
      'جدول تفاعلي لعرض وإدارة التصاريح',
      'نظام ترقيم الصفحات للتنقل بين التصاريح',
    ],
    tips: [
      'الإحصائيات تتحدث تلقائياً مع كل تغيير',
      'يمكنك تصفية التصاريح حسب الحالة أو النوع',
      'الجدول يدعم البحث السريع',
    ],
  },
  {
    id: 'loss-types',
    title: 'أنواع الخسائر',
    subtitle: 'الأنواع المختلفة للخسائر',
    icon: Flame,
    color: 'orange',
    steps: [
      'تلف: منتجات تالفة بسبب سوء التخزين أو النقل',
      'سرقة: منتجات مفقودة بسبب السرقة',
      'انتهاء صلاحية: منتجات انتهت صلاحيتها',
      'حريق: خسائر ناتجة عن حريق',
      'فيضان: خسائر ناتجة عن مياه أو رطوبة',
      'أخرى: أي نوع آخر من الخسائر',
    ],
    tips: [
      'اختر النوع المناسب للحصول على تقارير دقيقة',
      'يمكنك تصفية القائمة حسب النوع',
      'كل نوع له أيقونة مميزة للتعرف السريع',
    ],
  },
  {
    id: 'create-loss',
    title: 'إنشاء تصريح خسارة',
    subtitle: 'كيفية تسجيل خسارة جديدة',
    icon: Plus,
    color: 'emerald',
    steps: [
      'اضغط على زر "تصريح جديد" في أعلى الصفحة',
      'اختر نوع الخسارة من القائمة المنسدلة',
      'اكتب وصفاً مختصراً للخسارة',
      'حدد تاريخ الحادث',
      'ابحث عن المنتجات وأضفها للتصريح',
      'حدد الكمية المفقودة لكل منتج',
      'اضغط "إنشاء التصريح" لحفظه',
    ],
    tips: [
      'تأكد من دقة الكميات المدخلة',
      'أضف وصفاً واضحاً للرجوع إليه لاحقاً',
      'التصريح يُحفظ محلياً ثم يُرسل للخادم',
    ],
  },
  {
    id: 'loss-status',
    title: 'حالات التصريح',
    subtitle: 'فهم مراحل تصريح الخسارة',
    icon: Clock,
    color: 'amber',
    steps: [
      'في الانتظار: التصريح بانتظار المراجعة والاعتماد',
      'معتمد: تم اعتماد التصريح وتعديل المخزون',
      'مرفوض: تم رفض التصريح',
      'قيد التحقيق: التصريح قيد التحقيق (للسرقات)',
    ],
    tips: [
      'التصاريح المعلقة تظهر أزرار المعالجة',
      'الاعتماد يؤثر على المخزون تلقائياً',
      'يمكنك حذف التصاريح المعلقة فقط',
    ],
  },
  {
    id: 'process-loss',
    title: 'معالجة التصريح',
    subtitle: 'اعتماد أو رفض تصاريح الخسائر',
    icon: CheckCircle,
    color: 'blue',
    steps: [
      'ابحث عن التصريح المعلق في القائمة',
      'اضغط على زر المعالجة (✓) الأخضر',
      'راجع تفاصيل التصريح في النافذة المنبثقة',
      'اختر "اعتماد" للموافقة أو "رفض" للرفض',
      'سيتم تحديث المخزون تلقائياً عند الاعتماد',
    ],
    tips: [
      'راجع قيمة الخسارة جيداً قبل الاعتماد',
      'الاعتماد يخصم من المخزون نهائياً',
      'يمكنك إضافة سبب للرفض',
    ],
  },
  {
    id: 'delete-loss',
    title: 'حذف التصريح',
    subtitle: 'حذف تصاريح الخسائر المعلقة',
    icon: Trash2,
    color: 'rose',
    steps: [
      'ابحث عن التصريح المعلق في القائمة',
      'اضغط على زر الحذف (🗑️) الأحمر',
      'راجع تفاصيل التصريح في نافذة التأكيد',
      'اضغط "حذف" لتأكيد الحذف',
      'لا يمكن التراجع عن هذا الإجراء',
    ],
    tips: [
      'يمكن حذف التصاريح المعلقة فقط',
      'التصاريح المعتمدة لا يمكن حذفها',
      'تأكد من صحة التصريح قبل الحذف',
    ],
  },
  {
    id: 'search-filter',
    title: 'البحث والتصفية',
    subtitle: 'العثور على التصاريح بسرعة',
    icon: Search,
    color: 'indigo',
    steps: [
      'استخدم مربع البحث للبحث برقم التصريح أو الوصف',
      'اختر الحالة من قائمة التصفية (الكل/معلق/معتمد/مرفوض)',
      'صفّي حسب النوع (تلف/سرقة/انتهاء صلاحية...)',
      'النتائج تتحدث فورياً مع الكتابة',
    ],
    tips: [
      'البحث يبدأ بعد حرفين على الأقل',
      'يمكنك دمج البحث مع التصفية',
      'زر التحديث يجلب أحدث البيانات',
    ],
  },
  {
    id: 'sync',
    title: 'المزامنة',
    subtitle: 'مزامنة البيانات مع الخادم',
    icon: RefreshCw,
    color: 'cyan',
    steps: [
      'اضغط على زر التحديث لمزامنة البيانات',
      'تظهر علامة "جاري المزامنة" على التصاريح المحلية',
      'المزامنة تتم تلقائياً عند الاتصال بالإنترنت',
      'يمكنك العمل بدون إنترنت وستتم المزامنة لاحقاً',
    ],
    tips: [
      'التصاريح تُحفظ محلياً ثم تُرسل للخادم',
      'تحقق من حالة الاتصال قبل المزامنة',
      'البيانات المحلية آمنة حتى بدون إنترنت',
    ],
  },
  {
    id: 'reports',
    title: 'التقارير والإحصائيات',
    subtitle: 'فهم إحصائيات الخسائر',
    icon: TrendingDown,
    color: 'violet',
    steps: [
      'قيمة التكلفة: إجمالي تكلفة الخسائر بسعر الشراء',
      'قيمة البيع: المبيعات المفقودة بسعر البيع',
      'عدد التصاريح: إجمالي عدد تصاريح الخسائر',
      'التصاريح المعلقة: التصاريح بانتظار المراجعة',
    ],
    tips: [
      'راقب الإحصائيات لاكتشاف الأنماط',
      'قارن بين فترات مختلفة لتحليل الاتجاهات',
      'استخدم البيانات لتحسين إدارة المخزون',
    ],
  },
];

// ===============================================================================
// Colors Configuration
// ===============================================================================

const COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-200 dark:border-red-800',
    light: 'bg-red-50 dark:bg-red-950/30',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    border: 'border-orange-200 dark:border-orange-800',
    light: 'bg-orange-50 dark:bg-orange-950/30',
  },
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-200 dark:border-emerald-800',
    light: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-200 dark:border-amber-800',
    light: 'bg-amber-50 dark:bg-amber-950/30',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-200 dark:border-blue-800',
    light: 'bg-blue-50 dark:bg-blue-950/30',
  },
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    border: 'border-rose-200 dark:border-rose-800',
    light: 'bg-rose-50 dark:bg-rose-950/30',
  },
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600',
    border: 'border-indigo-200 dark:border-indigo-800',
    light: 'bg-indigo-50 dark:bg-indigo-950/30',
  },
  cyan: {
    bg: 'bg-cyan-500',
    text: 'text-cyan-600',
    border: 'border-cyan-200 dark:border-cyan-800',
    light: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    border: 'border-violet-200 dark:border-violet-800',
    light: 'bg-violet-50 dark:bg-violet-950/30',
  },
};

// ===============================================================================
// Preview Component Mapper
// ===============================================================================

const getPreviewComponent = (sectionId: string) => {
  switch (sectionId) {
    case 'overview':
      return <StatsPreview />;
    case 'loss-types':
      return <LossTypesPreview />;
    case 'create-loss':
      return <CreateLossPreview />;
    case 'loss-status':
      return <LossStatusPreview />;
    case 'process-loss':
      return <ProcessLossPreview />;
    case 'delete-loss':
      return <DeleteLossPreview />;
    case 'search-filter':
      return <SearchFilterPreview />;
    case 'sync':
      return <SyncPreview />;
    case 'reports':
      return <LossRowPreview />;
    default:
      return <LossDetailsPreview />;
  }
};

// ===============================================================================
// Section Detail Component
// ===============================================================================

interface SectionDetailProps {
  section: GuideSection;
  onBack: () => void;
}

const SectionDetail = memo<SectionDetailProps>(({ section, onBack }) => {
  const colorConfig = COLORS[section.color] || COLORS.red;
  const Icon = section.icon;

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900" dir="rtl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-3 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          <span>رجوع للقائمة</span>
        </button>

        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            colorConfig.bg
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {section.title}
            </h2>
            <p className="text-sm text-zinc-500">{section.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain" dir="rtl">
        <div className="p-5 pb-8 space-y-6">
          {/* Live Preview */}
          <div className={cn(
            "rounded-2xl p-4 border",
            colorConfig.light,
            colorConfig.border
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Eye className={cn("w-4 h-4", colorConfig.text)} />
              <span className={cn("text-xs font-semibold", colorConfig.text)}>
                معاينة حية
              </span>
            </div>
            {getPreviewComponent(section.id)}
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              الخطوات
            </h3>
            <div className="space-y-2">
              {section.steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                    colorConfig.bg
                  )}>
                    {idx + 1}
                  </span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 pt-0.5">
                    {step}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              نصائح
            </h3>
            <div className="space-y-2">
              {section.tips.map((tip, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50"
                >
                  <span className="text-amber-500">💡</span>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {tip}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
SectionDetail.displayName = 'SectionDetail';

// ===============================================================================
// Main Component
// ===============================================================================

interface LossesUserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const LossesUserGuide: React.FC<LossesUserGuideProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedSection, setSelectedSection] = useState<GuideSection | null>(null);

  const handleClose = () => {
    setSelectedSection(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg h-[85vh] p-0 gap-0 bg-zinc-50 dark:bg-[#0d1117] border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedSection ? (
            <motion.div
              key="detail"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              <SectionDetail
                section={selectedSection}
                onBack={() => setSelectedSection(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {/* Header */}
              <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <div className="h-1 bg-gradient-to-l from-red-500 via-orange-500 to-amber-500" />
                <div className="p-4 flex items-center gap-3" dir="rtl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="font-bold text-zinc-800 dark:text-white">
                      دليل تصاريح الخسائر
                    </DialogTitle>
                    <p className="text-xs text-zinc-500">
                      تعرف على كيفية إدارة تصاريح الخسائر
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections List */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-4 pb-8 space-y-2" dir="rtl">
                  {GUIDE_SECTIONS.map((section, idx) => {
                    const colorConfig = COLORS[section.color] || COLORS.red;
                    const Icon = section.icon;

                    return (
                      <motion.button
                        key={section.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setSelectedSection(section)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200",
                          "bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                          "border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md",
                          "group text-right"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                          colorConfig.bg
                        )}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-zinc-800 dark:text-white">
                            {section.title}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                            {section.subtitle}
                          </p>
                        </div>

                        <ChevronLeftIcon className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800" dir="rtl">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 font-mono">?</kbd>
                    <span>لفتح الدليل</span>
                  </div>
                  <span>بازار - تصاريح الخسائر</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

// ===============================================================================
// Help Button Component
// ===============================================================================

export const LossesHelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    className="h-9 w-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 group"
    title="دليل الاستخدام"
  >
    <HelpCircle className="h-4.5 w-4.5 text-zinc-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
  </Button>
);

export default LossesUserGuide;
