/**
 * ReturnsUserGuide - دليل استخدام صفحة إدارة الإرجاعات
 * ============================================================
 * دليل شامل ومفصل لإدارة إرجاع المنتجات بأسلوب Apple
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
  RotateCcw,
  Package,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Eye,
  Plus,
  FileText,
  CreditCard,
  RefreshCw,
  Keyboard,
  TrendingUp,
  Lightbulb,
  ShoppingCart,
  ArrowLeftRight,
  AlertCircle,
  Box,
  Scale,
  Ruler,
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

// Stats Preview
const StatsPreview = memo(() => (
  <div className="grid grid-cols-3 gap-2" dir="rtl">
    {[
      { label: 'إجمالي', value: '47', color: 'orange', icon: Package },
      { label: 'في الانتظار', value: '8', color: 'amber', icon: Clock },
      { label: 'مكتملة', value: '32', color: 'emerald', icon: CheckCircle },
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

// Return Status Preview
const ReturnStatusPreview = memo(() => {
  const statuses = [
    { label: 'في الانتظار', color: 'amber', icon: Clock },
    { label: 'موافق عليه', color: 'emerald', icon: CheckCircle },
    { label: 'مكتمل', color: 'blue', icon: FileText },
    { label: 'مرفوض', color: 'red', icon: XCircle },
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
          <div className="flex-1">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
              `bg-${status.color}-50 text-${status.color}-600 dark:bg-${status.color}-950/40`
            )}>
              {status.label}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
});
ReturnStatusPreview.displayName = 'ReturnStatusPreview';

// Create Return Preview
const CreateReturnPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-2"
    >
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg p-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-zinc-400" />
        <span className="text-xs text-zinc-500">رقم الطلبية: 1234</span>
      </div>
      <Button size="sm" className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
        <Search className="w-3.5 h-3.5" />
      </Button>
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">طلبية #1234</span>
        <span className="text-xs font-bold text-orange-600 font-numeric">2,500 د.ج</span>
      </div>
      <div className="space-y-1.5">
        {['منتج 1', 'منتج 2'].map((item, idx) => (
          <label
            key={idx}
            className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-700 rounded-lg border-2 border-zinc-200 dark:border-zinc-600 cursor-pointer hover:border-orange-300"
          >
            <input type="checkbox" className="w-3.5 h-3.5 rounded text-orange-500" defaultChecked={idx === 0} />
            <span className="text-xs flex-1">{item}</span>
            <span className="text-[10px] text-zinc-500">1x</span>
          </label>
        ))}
      </div>
    </motion.div>
  </div>
));
CreateReturnPreview.displayName = 'CreateReturnPreview';

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
        <span className="text-xs text-zinc-500">البحث برقم الإرجاع...</span>
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

// Return Row Preview
const ReturnRowPreview = memo(() => (
  <div className="space-y-2" dir="rtl">
    {[
      { number: 'RET-001', customer: 'أحمد محمد', amount: '1,200', status: 'pending' },
      { number: 'RET-002', customer: 'سارة علي', amount: '850', status: 'approved' },
    ].map((item, idx) => (
      <motion.div
        key={item.number}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: idx * 0.15 }}
        className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
      >
        <div className="flex-1">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{item.number}</p>
          <p className="text-[10px] text-zinc-500">{item.customer}</p>
        </div>
        <span className="text-xs font-bold text-orange-600 font-numeric">{item.amount} د.ج</span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-semibold",
          item.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
        )}>
          {item.status === 'pending' ? 'في الانتظار' : 'موافق عليه'}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
            <Eye className="w-3 h-3" />
          </Button>
          {item.status === 'pending' && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-orange-600">
              <CheckCircle className="w-3 h-3" />
            </Button>
          )}
        </div>
      </motion.div>
    ))}
  </div>
));
ReturnRowPreview.displayName = 'ReturnRowPreview';

// Process Return Preview
const ProcessReturnPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700"
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-zinc-500">رقم الإرجاع</span>
        <span className="text-xs font-semibold">RET-001</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-zinc-500">المبلغ</span>
        <span className="text-sm font-bold text-orange-600 font-numeric">1,200 د.ج</span>
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
        موافقة
      </Button>
      <Button size="sm" variant="destructive" className="flex-1 h-9 rounded-xl gap-1.5">
        <XCircle className="w-4 h-4" />
        رفض
      </Button>
    </motion.div>
  </div>
));
ProcessReturnPreview.displayName = 'ProcessReturnPreview';

// Return Types Preview
const ReturnTypesPreview = memo(() => {
  const types = [
    { label: 'إرجاع كامل', desc: 'إرجاع كل المنتجات', icon: Box, color: 'blue' },
    { label: 'إرجاع جزئي', desc: 'إرجاع بعض المنتجات', icon: Package, color: 'violet' },
    { label: 'إرجاع مباشر', desc: 'بدون طلبية أصلية', icon: ArrowLeftRight, color: 'orange' },
  ];

  return (
    <div className="space-y-2" dir="rtl">
      {types.map((type, idx) => (
        <motion.div
          key={type.label}
          initial={{ x: -15, opacity: 0 }}
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
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{type.label}</p>
            <p className="text-[10px] text-zinc-500">{type.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
});
ReturnTypesPreview.displayName = 'ReturnTypesPreview';

// Refund Methods Preview
const RefundMethodsPreview = memo(() => {
  const methods = [
    { label: 'نقدي', icon: CreditCard, color: 'emerald' },
    { label: 'بطاقة', icon: CreditCard, color: 'blue' },
    { label: 'رصيد', icon: TrendingUp, color: 'violet' },
    { label: 'استبدال', icon: ArrowLeftRight, color: 'orange' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" dir="rtl">
      {methods.map((method, idx) => (
        <motion.div
          key={method.label}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            `bg-${method.color}-50 dark:bg-${method.color}-950/50`
          )}>
            <method.icon className={cn("w-4 h-4", `text-${method.color}-600`)} />
          </div>
          <span className="text-xs font-medium">{method.label}</span>
        </motion.div>
      ))}
    </div>
  );
});
RefundMethodsPreview.displayName = 'RefundMethodsPreview';

// Return Details Preview
const ReturnDetailsPreview = memo(() => (
  <div className="space-y-3" dir="rtl">
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2"
    >
      {[
        { label: 'الطلبية الأصلية', value: '#1234' },
        { label: 'العميل', value: 'أحمد محمد' },
        { label: 'السبب', value: 'طلب العميل' },
        { label: 'مبلغ الإرجاع', value: '1,200 د.ج', highlight: true },
      ].map((item, idx) => (
        <div key={idx} className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-700 last:border-0">
          <span className="text-xs text-zinc-500">{item.label}</span>
          <span className={cn("text-xs font-medium", item.highlight && "text-orange-600 font-bold font-numeric")}>
            {item.value}
          </span>
        </div>
      ))}
    </motion.div>

    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-zinc-800 rounded-xl p-2.5 border border-zinc-200 dark:border-zinc-700"
    >
      <p className="text-[10px] text-zinc-500 mb-2">المنتجات المرجعة</p>
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-zinc-400" />
        <span className="text-xs">منتج 1</span>
        <span className="text-[10px] text-zinc-400 mr-auto">2 قطعة</span>
      </div>
    </motion.div>
  </div>
));
ReturnDetailsPreview.displayName = 'ReturnDetailsPreview';

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
      <AlertCircle className="w-4 h-4 text-orange-600" />
      <span className="text-[10px] text-orange-600">3 إرجاعات في انتظار المزامنة</span>
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
    subtitle: 'فهم شامل لصفحة إدارة الإرجاعات',
    icon: RotateCcw,
    color: 'orange',
    steps: [
      'تعرض صفحة الإرجاعات جميع طلبات الإرجاع بشكل منظم',
      'بطاقات إحصائية في الأعلى تعرض ملخص الإرجاعات',
      'جدول تفاعلي لعرض وإدارة طلبات الإرجاع',
      'نظام ترقيم الصفحات للتنقل بين الإرجاعات',
    ],
    tips: [
      'الإحصائيات تتحدث تلقائياً مع كل تغيير',
      'يمكنك تصفية الإرجاعات حسب الحالة أو النوع',
      'الجدول يدعم البحث السريع',
    ],
  },
  {
    id: 'create-return',
    title: 'إنشاء طلب إرجاع',
    subtitle: 'كيفية إنشاء طلب إرجاع جديد',
    icon: Plus,
    color: 'emerald',
    steps: [
      'اضغط على زر "طلب إرجاع" في أعلى الصفحة',
      'أدخل رقم الطلبية الأصلية وابحث عنها',
      'اختر المنتجات التي تريد إرجاعها',
      'حدد سبب الإرجاع وطريقة الاسترداد',
      'أضف أي ملاحظات إضافية (اختياري)',
      'اضغط "إنشاء طلب الإرجاع" لحفظ الطلب',
    ],
    tips: [
      'يمكنك البحث بالرقم التسلسلي للطلبية',
      'تأكد من اختيار الكمية الصحيحة للإرجاع',
      'الإرجاعات الكبيرة تحتاج موافقة المدير',
    ],
  },
  {
    id: 'return-status',
    title: 'حالات الإرجاع',
    subtitle: 'فهم مراحل طلب الإرجاع',
    icon: Clock,
    color: 'amber',
    steps: [
      'في الانتظار: الطلب بانتظار المراجعة',
      'موافق عليه: تمت الموافقة على الإرجاع',
      'مكتمل: تم معالجة الإرجاع بالكامل',
      'مرفوض: تم رفض طلب الإرجاع',
    ],
    tips: [
      'الطلبات في الانتظار تظهر زر المعالجة',
      'يمكنك عرض تفاصيل أي طلب بالضغط على أيقونة العين',
      'الطلبات المرفوضة تحتفظ بسبب الرفض',
    ],
  },
  {
    id: 'return-types',
    title: 'أنواع الإرجاع',
    subtitle: 'الأنواع المختلفة لطلبات الإرجاع',
    icon: Box,
    color: 'violet',
    steps: [
      'إرجاع كامل: إرجاع جميع منتجات الطلبية',
      'إرجاع جزئي: إرجاع بعض المنتجات فقط',
      'إرجاع مباشر: إرجاع بدون طلبية أصلية مرتبطة',
    ],
    tips: [
      'الإرجاع الجزئي هو الأكثر شيوعاً',
      'الإرجاع المباشر مفيد للحالات الخاصة',
      'يمكنك تصفية القائمة حسب النوع',
    ],
  },
  {
    id: 'process-return',
    title: 'معالجة الإرجاع',
    subtitle: 'الموافقة أو رفض طلبات الإرجاع',
    icon: CheckCircle,
    color: 'blue',
    steps: [
      'ابحث عن طلب الإرجاع في القائمة',
      'اضغط على زر المعالجة (✓) للطلبات المعلقة',
      'راجع تفاصيل الطلب في النافذة المنبثقة',
      'اختر "موافقة" للقبول أو "رفض" للرفض',
      'سيتم تحديث حالة الطلب تلقائياً',
    ],
    tips: [
      'راجع المبلغ جيداً قبل الموافقة',
      'الموافقة تبدأ عملية استرداد المبلغ',
      'يمكنك إضافة سبب للرفض',
    ],
  },
  {
    id: 'refund-methods',
    title: 'طرق الاسترداد',
    subtitle: 'خيارات رد المبلغ للعميل',
    icon: CreditCard,
    color: 'teal',
    steps: [
      'نقدي: رد المبلغ نقداً مباشرة',
      'بطاقة: إعادة المبلغ للبطاقة البنكية',
      'رصيد: إضافة المبلغ لرصيد العميل',
      'استبدال: استبدال المنتج بمنتج آخر',
    ],
    tips: [
      'الرصيد يشجع العميل على الشراء مجدداً',
      'الاستبدال خيار جيد للمنتجات المعيبة',
      'تأكد من توثيق طريقة الاسترداد',
    ],
  },
  {
    id: 'search-filter',
    title: 'البحث والتصفية',
    subtitle: 'العثور على الإرجاعات بسرعة',
    icon: Search,
    color: 'indigo',
    steps: [
      'استخدم مربع البحث للبحث برقم الإرجاع أو اسم العميل',
      'اختر الحالة من قائمة التصفية (الكل/معلق/موافق/مكتمل/مرفوض)',
      'صفّي حسب النوع (كامل/جزئي/مباشر)',
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
      'تظهر علامة "غير متزامن" على الإرجاعات المحلية',
      'المزامنة تتم تلقائياً عند الاتصال بالإنترنت',
      'يمكنك العمل بدون إنترنت وستتم المزامنة لاحقاً',
    ],
    tips: [
      'الإرجاعات تُحفظ محلياً ثم تُرسل للخادم',
      'تحقق من حالة الاتصال قبل المزامنة',
      'البيانات المحلية آمنة حتى بدون إنترنت',
    ],
  },
  {
    id: 'shortcuts',
    title: 'نصائح سريعة',
    subtitle: 'اختصارات ونصائح مفيدة',
    icon: Keyboard,
    color: 'rose',
    steps: [
      'استخدم التمرير للتنقل بين صفحات الجدول',
      'انقر على أي صف لعرض تفاصيل الإرجاع',
      'الإحصائيات تعطيك نظرة سريعة على الأداء',
      'راقب قيمة الإرجاعات الإجمالية بانتظام',
    ],
    tips: [
      'تابع الإرجاعات المعلقة يومياً',
      'وثّق أسباب الرفض للرجوع إليها',
      'استخدم الفلاتر للتركيز على فئة معينة',
    ],
    shortcuts: [
      { key: 'تمرير', action: 'التنقل بين الصفحات' },
      { key: 'نقر', action: 'عرض التفاصيل' },
      { key: 'تحديث', action: 'مزامنة البيانات' },
    ],
  },
];

// ===============================================================================
// Colors Configuration
// ===============================================================================

const COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
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
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    border: 'border-violet-200 dark:border-violet-800',
    light: 'bg-violet-50 dark:bg-violet-950/30',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-200 dark:border-blue-800',
    light: 'bg-blue-50 dark:bg-blue-950/30',
  },
  teal: {
    bg: 'bg-teal-500',
    text: 'text-teal-600',
    border: 'border-teal-200 dark:border-teal-800',
    light: 'bg-teal-50 dark:bg-teal-950/30',
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
};

// ===============================================================================
// Preview Component Mapper
// ===============================================================================

const getPreviewComponent = (sectionId: string) => {
  switch (sectionId) {
    case 'overview':
      return <StatsPreview />;
    case 'create-return':
      return <CreateReturnPreview />;
    case 'return-status':
      return <ReturnStatusPreview />;
    case 'return-types':
      return <ReturnTypesPreview />;
    case 'process-return':
      return <ProcessReturnPreview />;
    case 'refund-methods':
      return <RefundMethodsPreview />;
    case 'search-filter':
      return <SearchFilterPreview />;
    case 'sync':
      return <SyncPreview />;
    case 'shortcuts':
      return <ReturnRowPreview />;
    default:
      return <ReturnDetailsPreview />;
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
  const colorConfig = COLORS[section.color] || COLORS.orange;
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

          {/* Shortcuts */}
          {section.shortcuts && section.shortcuts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-zinc-400" />
                اختصارات
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {section.shortcuts.map((shortcut, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className="flex items-center gap-2 p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
                  >
                    <kbd className="px-2 py-1 bg-white dark:bg-zinc-700 rounded text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600">
                      {shortcut.key}
                    </kbd>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {shortcut.action}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});
SectionDetail.displayName = 'SectionDetail';

// ===============================================================================
// Main Component
// ===============================================================================

interface ReturnsUserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReturnsUserGuide: React.FC<ReturnsUserGuideProps> = ({
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
                <div className="h-1 bg-gradient-to-l from-orange-500 via-amber-500 to-yellow-500" />
                <div className="p-4 flex items-center gap-3" dir="rtl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="font-bold text-zinc-800 dark:text-white">
                      دليل الإرجاعات
                    </DialogTitle>
                    <p className="text-xs text-zinc-500">
                      تعرف على كيفية إدارة إرجاع المنتجات
                    </p>
                  </div>
                </div>
              </div>

              {/* Sections List */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-4 pb-8 space-y-2" dir="rtl">
                  {GUIDE_SECTIONS.map((section, idx) => {
                    const colorConfig = COLORS[section.color] || COLORS.orange;
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
                  <span>بازار - إدارة الإرجاعات</span>
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

export const ReturnsHelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClick}
    className="h-9 w-9 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 group"
    title="دليل الاستخدام"
  >
    <HelpCircle className="h-4.5 w-4.5 text-zinc-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
  </Button>
);

export default ReturnsUserGuide;
