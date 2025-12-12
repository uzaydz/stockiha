/**
 * InvoicesUserGuide - دليل استخدام صفحة الفواتير
 * ============================================================
 * دليل شامل ومفصل لإدارة الفواتير بأسلوب Apple
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
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Printer,
  Download,
  Edit,
  Eye,
  Lightbulb,
  ShoppingCart,
  FileCheck,
  Filter,
  CreditCard,
  RefreshCw,
  Store,
  Settings,
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

// Invoice Types Preview
const InvoiceTypesPreview = memo(() => {
  const types = [
    { label: 'فاتورة', prefix: 'INV-', color: 'blue', icon: FileText },
    { label: 'فاتورة شكلية', prefix: 'PRO-', color: 'orange', icon: FileCheck },
    { label: 'أمر شراء', prefix: 'BC-', color: 'green', icon: ShoppingCart },
  ];

  return (
    <div className="space-y-2" dir="rtl">
      {types.map((type, idx) => (
        <motion.div
          key={type.label}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
        >
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            `bg-${type.color}-50 dark:bg-${type.color}-950/50`
          )}>
            <type.icon className={cn("w-4.5 h-4.5", `text-${type.color}-600`)} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{type.label}</p>
            <p className="text-[10px] text-zinc-500 font-mono">{type.prefix}XXXX</p>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[9px] font-semibold",
            `bg-${type.color}-50 text-${type.color}-600`
          )}>
            {type.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
});
InvoiceTypesPreview.displayName = 'InvoiceTypesPreview';

// Invoice Status Preview
const InvoiceStatusPreview = memo(() => {
  const statuses = [
    { label: 'مدفوعة', color: 'emerald', icon: CheckCircle },
    { label: 'معلقة', color: 'amber', icon: Clock },
    { label: 'متأخرة', color: 'red', icon: XCircle },
    { label: 'ملغاة', color: 'zinc', icon: XCircle },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" dir="rtl">
      {statuses.map((status, idx) => (
        <motion.div
          key={status.label}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
        >
          <status.icon className={cn("w-4 h-4", `text-${status.color}-500`)} />
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-semibold",
            `bg-${status.color}-50 text-${status.color}-600 dark:bg-${status.color}-950/40`
          )}>
            {status.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
});
InvoiceStatusPreview.displayName = 'InvoiceStatusPreview';

// Source Types Preview
const SourceTypesPreview = memo(() => {
  const sources = [
    { label: 'نقاط البيع', icon: Store, color: 'blue' },
    { label: 'متجر إلكتروني', icon: ShoppingCart, color: 'violet' },
    { label: 'خدمات', icon: Settings, color: 'orange' },
    { label: 'مدمجة', icon: FileText, color: 'emerald' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" dir="rtl">
      {sources.map((source, idx) => (
        <motion.div
          key={source.label}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            `bg-${source.color}-50 dark:bg-${source.color}-950/50`
          )}>
            <source.icon className={cn("w-4 h-4", `text-${source.color}-600`)} />
          </div>
          <span className="text-xs font-medium">{source.label}</span>
        </motion.div>
      ))}
    </div>
  );
});
SourceTypesPreview.displayName = 'SourceTypesPreview';

// Create Invoice Menu Preview
const CreateInvoiceMenuPreview = memo(() => (
  <div className="space-y-1.5" dir="rtl">
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
    >
      <Plus className="w-4 h-4 text-blue-500" />
      <span className="text-xs font-medium flex-1">إنشاء فاتورة</span>
      <ChevronRight className="w-3 h-3 text-zinc-400 rotate-90" />
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-2 space-y-1"
    >
      {[
        { label: 'فاتورة جديدة', icon: FileText },
        { label: 'من طلب نقاط البيع', icon: Store },
        { label: 'فاتورة شكلية', icon: FileCheck },
        { label: 'أمر شراء', icon: ShoppingCart },
      ].map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors">
          <item.icon className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px]">{item.label}</span>
        </div>
      ))}
    </motion.div>
  </div>
));
CreateInvoiceMenuPreview.displayName = 'CreateInvoiceMenuPreview';

// Invoice Row Preview
const InvoiceRowPreview = memo(() => (
  <div className="space-y-2" dir="rtl">
    {[
      { number: 'INV-001', customer: 'أحمد محمد', amount: '15,000', status: 'paid' },
      { number: 'PRO-002', customer: 'شركة النور', amount: '45,000', status: 'pending' },
    ].map((item, idx) => (
      <motion.div
        key={item.number}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: idx * 0.15 }}
        className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
      >
        <FileText className="w-4 h-4 text-zinc-400" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{item.number}</p>
          <p className="text-[10px] text-zinc-500">{item.customer}</p>
        </div>
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-numeric">{item.amount} د.ج</span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-semibold",
          item.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        )}>
          {item.status === 'paid' ? 'مدفوعة' : 'معلقة'}
        </span>
      </motion.div>
    ))}
  </div>
));
InvoiceRowPreview.displayName = 'InvoiceRowPreview';

// Invoice Actions Preview
const InvoiceActionsPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-zinc-500">رقم الفاتورة</span>
        <span className="text-xs font-semibold font-mono">INV-001</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-zinc-500">المبلغ</span>
        <span className="text-sm font-bold text-blue-600 font-numeric">15,000 د.ج</span>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex gap-2"
    >
      <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl gap-1.5">
        <Eye className="w-4 h-4" />
        عرض
      </Button>
      <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl gap-1.5">
        <Edit className="w-4 h-4" />
        تعديل
      </Button>
      <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl gap-1.5">
        <Printer className="w-4 h-4" />
        طباعة
      </Button>
    </motion.div>
  </div>
));
InvoiceActionsPreview.displayName = 'InvoiceActionsPreview';

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
        <span className="text-xs text-zinc-500">بحث عن رقم الفاتورة...</span>
      </div>
    </motion.div>

    <div className="flex gap-2">
      {['الحالة', 'نوع المستند', 'المصدر'].map((filter, idx) => (
        <motion.div
          key={filter}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 + idx * 0.1 }}
          className="flex-1 h-8 bg-white dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600 flex items-center justify-between px-2"
        >
          <span className="text-[10px] text-zinc-500">{filter}</span>
          <ChevronRight className="w-3 h-3 text-zinc-400 rotate-90" />
        </motion.div>
      ))}
    </div>
  </div>
));
SearchFilterPreview.displayName = 'SearchFilterPreview';

// Print & Download Preview
const PrintDownloadPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-semibold">معاينة الفاتورة</span>
        </div>
        <span className="text-xs text-zinc-500 font-mono">INV-001</span>
      </div>

      <div className="h-20 bg-zinc-100 dark:bg-zinc-700/50 rounded-lg flex items-center justify-center mb-3">
        <span className="text-xs text-zinc-400">محتوى الفاتورة</span>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex gap-2"
    >
      <Button size="sm" className="flex-1 h-9 rounded-xl gap-1.5 bg-blue-500 hover:bg-blue-600 text-white">
        <Printer className="w-4 h-4" />
        طباعة
      </Button>
      <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl gap-1.5">
        <Download className="w-4 h-4" />
        تنزيل PDF
      </Button>
    </motion.div>
  </div>
));
PrintDownloadPreview.displayName = 'PrintDownloadPreview';

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
        <p className="text-[10px] text-emerald-600 dark:text-emerald-500">الفواتير محدثة</p>
      </div>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center gap-2 p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800"
    >
      <Clock className="w-4 h-4 text-orange-600" />
      <span className="text-[10px] text-orange-600">فاتورة واحدة في انتظار المزامنة</span>
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
    subtitle: 'فهم شامل لصفحة الفواتير',
    icon: FileText,
    color: 'blue',
    steps: [
      'تعرض صفحة الفواتير جميع المستندات المالية',
      'يمكنك إنشاء فواتير عادية، شكلية، وأوامر شراء',
      'جدول تفاعلي لعرض وإدارة الفواتير',
      'إمكانية البحث والتصفية حسب معايير متعددة',
    ],
    tips: [
      'البيانات تتحدث تلقائياً مع PowerSync',
      'يمكنك العمل بدون إنترنت',
      'الفواتير تُحفظ محلياً ثم تُرسل للخادم',
    ],
  },
  {
    id: 'invoice-types',
    title: 'أنواع المستندات',
    subtitle: 'الفواتير والمستندات المتاحة',
    icon: FileCheck,
    color: 'orange',
    steps: [
      'فاتورة (INV-): مستند بيع رسمي للعميل',
      'فاتورة شكلية (PRO-): عرض سعر قبل البيع',
      'أمر شراء (BC-): طلب شراء من المورد',
    ],
    tips: [
      'الفاتورة الشكلية مفيدة للعروض والتقديرات',
      'أمر الشراء للتعامل مع الموردين',
      'كل نوع له بادئة خاصة للتمييز',
    ],
  },
  {
    id: 'create-invoice',
    title: 'إنشاء فاتورة',
    subtitle: 'كيفية إنشاء فاتورة جديدة',
    icon: Plus,
    color: 'emerald',
    steps: [
      'اضغط على زر "إنشاء فاتورة" في أعلى الصفحة',
      'اختر نوع المستند من القائمة المنسدلة',
      'أدخل بيانات العميل (الاسم، العنوان، الهاتف)',
      'أضف المنتجات أو الخدمات للفاتورة',
      'حدد الكميات والأسعار',
      'أضف الخصومات أو الضرائب إن وجدت',
      'اضغط "حفظ" لإنشاء الفاتورة',
    ],
    tips: [
      'يمكنك إنشاء فاتورة من طلب موجود',
      'تأكد من صحة بيانات العميل',
      'راجع المبلغ الإجمالي قبل الحفظ',
    ],
  },
  {
    id: 'invoice-sources',
    title: 'مصادر الفواتير',
    subtitle: 'من أين تأتي الفواتير',
    icon: Store,
    color: 'violet',
    steps: [
      'نقاط البيع: فواتير من طلبات نقاط البيع',
      'متجر إلكتروني: فواتير من الطلبات الإلكترونية',
      'خدمات: فواتير الخدمات المقدمة',
      'مدمجة: فواتير تجمع عدة طلبات',
    ],
    tips: [
      'يمكنك تصفية الفواتير حسب المصدر',
      'الفواتير المدمجة تسهل إدارة العملاء',
      'كل مصدر له خصائص مميزة',
    ],
  },
  {
    id: 'invoice-status',
    title: 'حالات الفاتورة',
    subtitle: 'فهم حالات الدفع المختلفة',
    icon: CreditCard,
    color: 'amber',
    steps: [
      'مدفوعة: تم استلام المبلغ بالكامل',
      'معلقة: الفاتورة في انتظار الدفع',
      'متأخرة: تجاوزت تاريخ الاستحقاق',
      'ملغاة: تم إلغاء الفاتورة',
    ],
    tips: [
      'راقب الفواتير المتأخرة بانتظام',
      'يمكنك تصفية الفواتير حسب الحالة',
      'الفواتير الملغاة تبقى في السجل للمراجعة',
    ],
  },
  {
    id: 'invoice-actions',
    title: 'إجراءات الفاتورة',
    subtitle: 'عرض، تعديل، طباعة الفواتير',
    icon: Settings,
    color: 'indigo',
    steps: [
      'عرض: اضغط على أيقونة العين لمعاينة الفاتورة',
      'تعديل: اضغط على أيقونة القلم لتعديل البيانات',
      'طباعة: اضغط على أيقونة الطابعة للطباعة',
      'تنزيل: اضغط على أيقونة التنزيل لحفظ PDF',
    ],
    tips: [
      'التعديل متاح فقط للفواتير غير المدفوعة',
      'يمكنك طباعة نسخ متعددة',
      'ملف PDF يحتوي على كل التفاصيل',
    ],
  },
  {
    id: 'search-filter',
    title: 'البحث والتصفية',
    subtitle: 'العثور على الفواتير بسرعة',
    icon: Search,
    color: 'cyan',
    steps: [
      'استخدم مربع البحث للبحث برقم الفاتورة أو اسم العميل',
      'صفّي حسب الحالة (مدفوعة/معلقة/متأخرة/ملغاة)',
      'صفّي حسب نوع المستند (فاتورة/شكلية/أمر شراء)',
      'صفّي حسب المصدر (نقاط البيع/متجر/خدمات)',
      'رتّب حسب التاريخ أو المبلغ أو الرقم',
    ],
    tips: [
      'يمكنك دمج عدة فلاتر معاً',
      'البحث يعمل فورياً مع الكتابة',
      'الترتيب يسهل العثور على الفواتير',
    ],
  },
  {
    id: 'print-download',
    title: 'الطباعة والتنزيل',
    subtitle: 'طباعة وتصدير الفواتير',
    icon: Printer,
    color: 'rose',
    steps: [
      'افتح معاينة الفاتورة بالضغط على "عرض"',
      'اضغط على زر "طباعة" لفتح نافذة الطباعة',
      'اختر الطابعة والإعدادات المناسبة',
      'أو اضغط "تنزيل PDF" لحفظ نسخة رقمية',
    ],
    tips: [
      'استخدم PDF للإرسال عبر البريد',
      'تأكد من توصيل الطابعة قبل الطباعة',
      'يمكنك تخصيص تصميم الفاتورة',
    ],
  },
  {
    id: 'sync',
    title: 'المزامنة',
    subtitle: 'مزامنة الفواتير مع الخادم',
    icon: RefreshCw,
    color: 'teal',
    steps: [
      'الفواتير تُحفظ محلياً أولاً',
      'المزامنة تتم تلقائياً عند الاتصال',
      'علامة "غير متزامن" تظهر للفواتير المحلية',
      'يمكنك العمل بدون إنترنت بأمان',
    ],
    tips: [
      'تحقق من حالة الاتصال قبل المزامنة',
      'الفواتير المحلية آمنة حتى بدون إنترنت',
      'PowerSync يضمن تزامن البيانات',
    ],
  },
];

// ===============================================================================
// Colors Configuration
// ===============================================================================

const COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-200 dark:border-blue-800',
    light: 'bg-blue-50 dark:bg-blue-950/30',
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
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    border: 'border-violet-200 dark:border-violet-800',
    light: 'bg-violet-50 dark:bg-violet-950/30',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-200 dark:border-amber-800',
    light: 'bg-amber-50 dark:bg-amber-950/30',
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
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    border: 'border-rose-200 dark:border-rose-800',
    light: 'bg-rose-50 dark:bg-rose-950/30',
  },
  teal: {
    bg: 'bg-teal-500',
    text: 'text-teal-600',
    border: 'border-teal-200 dark:border-teal-800',
    light: 'bg-teal-50 dark:bg-teal-950/30',
  },
};

// ===============================================================================
// Preview Component Mapper
// ===============================================================================

const getPreviewComponent = (sectionId: string) => {
  switch (sectionId) {
    case 'overview':
      return <InvoiceRowPreview />;
    case 'invoice-types':
      return <InvoiceTypesPreview />;
    case 'create-invoice':
      return <CreateInvoiceMenuPreview />;
    case 'invoice-sources':
      return <SourceTypesPreview />;
    case 'invoice-status':
      return <InvoiceStatusPreview />;
    case 'invoice-actions':
      return <InvoiceActionsPreview />;
    case 'search-filter':
      return <SearchFilterPreview />;
    case 'print-download':
      return <PrintDownloadPreview />;
    case 'sync':
      return <SyncPreview />;
    default:
      return <InvoiceRowPreview />;
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
  const colorConfig = COLORS[section.color] || COLORS.blue;
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

interface InvoicesUserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const InvoicesUserGuide: React.FC<InvoicesUserGuideProps> = ({
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
                <div className="h-1 bg-gradient-to-l from-blue-500 via-indigo-500 to-violet-500" />
                <div className="p-4 flex items-center gap-3" dir="rtl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="font-bold text-zinc-800 dark:text-white">
                      دليل الفواتير
                    </DialogTitle>
                    <p className="text-xs text-zinc-500">
                      تعرف على كيفية إدارة الفواتير والمستندات
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections List */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-4 pb-8 space-y-2" dir="rtl">
                  {GUIDE_SECTIONS.map((section, idx) => {
                    const colorConfig = COLORS[section.color] || COLORS.blue;
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
                  <span>بازار - إدارة الفواتير</span>
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

export const InvoicesHelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    variant="outline"
    size="icon"
    onClick={onClick}
    className="h-9 w-9 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 group"
    title="دليل الاستخدام"
  >
    <HelpCircle className="h-4.5 w-4.5 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
  </Button>
);

export default InvoicesUserGuide;
