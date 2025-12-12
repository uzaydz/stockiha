/**
 * 📖 CustomersUserGuide - دليل استخدام إدارة العملاء
 * ═══════════════════════════════════════════════════════════════════════════
 * دليل تفاعلي شامل لإدارة العملاء مع معاينات حية من الواجهة
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  X,
  ChevronLeft,
  Search,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit3,
  Trash2,
  Eye,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Keyboard,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Settings,
  BarChart3,
  Clock,
  Calendar,
  DollarSign,
  CreditCard,
  Wallet,
  AlertTriangle,
  Cloud,
  CloudOff,
  Hash,
  Building,
  Receipt,
  TrendingUp,
  Shield,
  Star,
  Tag,
  MoreVertical,
  Plus,
  Save,
  XCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// Mini Components للمعاينة الحية
// ═══════════════════════════════════════════════════════════════════════════

// معاينة صف عميل في الجدول
const CustomerRowPreview = memo<{ hasDebt?: boolean }>(({ hasDebt }) => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 text-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
        أ
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-800 dark:text-white">أحمد محمد علي</span>
          {hasDebt && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs">
              مدين
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            0550123456
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            ahmed@email.com
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center">
          <Eye className="w-4 h-4 text-zinc-400" />
        </button>
        <button className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center">
          <Edit3 className="w-4 h-4 text-zinc-400" />
        </button>
        <button className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center">
          <MoreVertical className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </div>
  </div>
));

// معاينة البحث
const SearchCustomerPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 rounded-xl px-3 py-2">
      <Search className="w-4 h-4 text-zinc-400" />
      <span className="text-sm text-zinc-400">ابحث بالاسم، الهاتف، أو البريد الإلكتروني...</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-1">
      <Badge variant="outline" className="text-xs">أحمد</Badge>
      <Badge variant="outline" className="text-xs">0550</Badge>
      <Badge variant="outline" className="text-xs">@gmail</Badge>
    </div>
  </div>
));

// معاينة الفلاتر
const FiltersPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex flex-wrap gap-2">
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm">
        <Calendar className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-600 dark:text-zinc-300">هذا الشهر</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-sm border-2 border-blue-500">
        <Phone className="w-4 h-4 text-blue-500" />
        <span className="text-blue-600 dark:text-blue-400">لديهم هاتف</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm">
        <Mail className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-600 dark:text-zinc-300">لديهم بريد</span>
      </button>
    </div>
  </div>
));

// معاينة الإحصائيات
const StatsPreview = memo(() => (
  <div className="grid grid-cols-2 gap-2">
    {[
      { label: 'إجمالي العملاء', value: '256', icon: Users, color: 'blue' },
      { label: 'عملاء جدد', value: '12', icon: UserPlus, color: 'emerald' },
      { label: 'لديهم ديون', value: '8', icon: Wallet, color: 'amber' },
      { label: 'إجمالي الديون', value: '45,000 د.ج', icon: DollarSign, color: 'red' },
    ].map(({ label, value, icon: Icon, color }) => (
      <div key={label} className={cn(
        "p-3 rounded-xl border",
        color === 'blue' && "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30",
        color === 'emerald' && "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30",
        color === 'amber' && "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30",
        color === 'red' && "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30"
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "w-4 h-4",
            color === 'blue' && "text-blue-500",
            color === 'emerald' && "text-emerald-500",
            color === 'amber' && "text-amber-500",
            color === 'red' && "text-red-500"
          )} />
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        <p className="text-sm font-bold text-zinc-800 dark:text-white mt-1">{value}</p>
      </div>
    ))}
  </div>
));

// معاينة نموذج إضافة عميل
const AddCustomerFormPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-3">
      <UserPlus className="w-5 h-5" />
      <span className="font-bold">إضافة عميل جديد</span>
    </div>
    <div className="space-y-2">
      <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <label className="text-xs text-zinc-500 block mb-1">اسم العميل *</label>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">أحمد محمد علي</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
          <label className="text-xs text-zinc-500 block mb-1">رقم الهاتف</label>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-200">0550123456</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
          <label className="text-xs text-zinc-500 block mb-1">البريد الإلكتروني</label>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-700 dark:text-zinc-200">ahmed@mail.com</span>
          </div>
        </div>
      </div>
      <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <label className="text-xs text-zinc-500 block mb-1">العنوان</label>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">الجزائر، وهران</span>
        </div>
      </div>
    </div>
  </div>
));

// معاينة البيانات الضريبية
const TaxInfoPreview = memo(() => (
  <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/30 space-y-3">
    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
      <FileText className="w-5 h-5" />
      <span className="font-bold">البيانات الضريبية</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="p-2 rounded-lg bg-white dark:bg-zinc-800">
        <label className="text-xs text-zinc-500 block">NIF - الرقم الجبائي</label>
        <span className="font-mono text-zinc-700 dark:text-zinc-200">001234567890123</span>
      </div>
      <div className="p-2 rounded-lg bg-white dark:bg-zinc-800">
        <label className="text-xs text-zinc-500 block">RC - السجل التجاري</label>
        <span className="font-mono text-zinc-700 dark:text-zinc-200">16/00-0123456B00</span>
      </div>
    </div>
  </div>
));

// معاينة تفاصيل العميل
const CustomerDetailsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
        أ
      </div>
      <div>
        <h3 className="font-bold text-zinc-800 dark:text-white">أحمد محمد علي</h3>
        <p className="text-xs text-zinc-500">عميل منذ: 15 يناير 2024</p>
      </div>
    </div>
    <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-zinc-400" />
        <span className="text-zinc-700 dark:text-zinc-200">0550123456</span>
      </div>
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-zinc-400" />
        <span className="text-zinc-700 dark:text-zinc-200">ahmed@mail.com</span>
      </div>
      <div className="flex items-center gap-2 col-span-2">
        <MapPin className="w-4 h-4 text-zinc-400" />
        <span className="text-zinc-700 dark:text-zinc-200">الجزائر، وهران، حي السلام</span>
      </div>
    </div>
    <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
        <p className="text-lg font-bold text-blue-600">24</p>
        <p className="text-xs text-zinc-500">طلبية</p>
      </div>
      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
        <p className="text-lg font-bold text-emerald-600">156,000</p>
        <p className="text-xs text-zinc-500">د.ج مصروف</p>
      </div>
      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
        <p className="text-lg font-bold text-amber-600">5,000</p>
        <p className="text-xs text-zinc-500">د.ج دين</p>
      </div>
    </div>
  </div>
));

// معاينة سجل المشتريات
const PurchaseHistoryPreview = memo(() => (
  <div className="space-y-2">
    {[
      { id: '#ORD-001', date: '12/12/2024', total: 15000, status: 'مدفوع' },
      { id: '#ORD-002', date: '10/12/2024', total: 8500, status: 'جزئي' },
    ].map((order) => (
      <div key={order.id} className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-zinc-800 dark:text-white">{order.id}</span>
            <p className="text-xs text-zinc-500">{order.date}</p>
          </div>
          <div className="text-left">
            <span className="font-bold text-orange-500">{order.total.toLocaleString()} د.ج</span>
            <Badge className={cn(
              "block mt-1 text-xs",
              order.status === 'مدفوع'
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
            )}>
              {order.status}
            </Badge>
          </div>
        </div>
      </div>
    ))}
  </div>
));

// معاينة الديون
const DebtPreview = memo(() => (
  <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <Wallet className="w-5 h-5" />
        <span className="font-bold">ديون العميل</span>
      </div>
      <span className="text-xl font-bold text-red-600">15,000 د.ج</span>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-800 text-sm">
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-200">#ORD-2024-089</span>
          <p className="text-xs text-zinc-500">10/12/2024</p>
        </div>
        <div className="text-left">
          <span className="text-red-600 font-bold">10,000 د.ج</span>
          <p className="text-xs text-zinc-500">من 25,000</p>
        </div>
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-800 text-sm">
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-200">#ORD-2024-092</span>
          <p className="text-xs text-zinc-500">11/12/2024</p>
        </div>
        <div className="text-left">
          <span className="text-red-600 font-bold">5,000 د.ج</span>
          <p className="text-xs text-zinc-500">من 12,000</p>
        </div>
      </div>
    </div>
  </div>
));

// معاينة إجراءات العميل
const CustomerActionsPreview = memo(() => (
  <div className="flex flex-wrap gap-2">
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium">
      <Eye className="w-4 h-4" />
      عرض
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium">
      <Edit3 className="w-4 h-4" />
      تعديل
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
      <Receipt className="w-4 h-4" />
      المشتريات
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-medium">
      <Wallet className="w-4 h-4" />
      الديون
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
      <Trash2 className="w-4 h-4" />
      حذف
    </button>
  </div>
));

// معاينة التصدير
const ExportPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
      <Download className="w-5 h-5" />
      <span className="font-bold">تصدير البيانات</span>
    </div>
    <div className="flex gap-2">
      <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
        <FileText className="w-5 h-5" />
        Excel
      </button>
      <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-700 text-zinc-500 font-medium">
        <FileText className="w-5 h-5" />
        PDF
      </button>
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
        <p className="text-xs text-emerald-600 dark:text-emerald-400">جميع البيانات محدثة</p>
      </div>
      <CheckCircle className="w-5 h-5 text-emerald-500" />
    </div>
    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
      <CloudOff className="w-5 h-5 text-amber-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">وضع أوفلاين</span>
        <p className="text-xs text-amber-600 dark:text-amber-400">البيانات محفوظة محلياً</p>
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
    subtitle: 'فهم واجهة إدارة العملاء',
    icon: Users,
    color: 'blue',
    steps: [
      {
        text: 'صفحة العملاء تعرض جميع العملاء في جدول منظم مع معلومات الاتصال والإحصائيات',
        preview: <CustomerRowPreview />
      },
      {
        text: 'الإحصائيات في أعلى الصفحة تعطيك نظرة سريعة على حالة العملاء',
        preview: <StatsPreview />
      }
    ],
    tips: [
      'العملاء مرتبون حسب تاريخ الإضافة (الأحدث أولاً)',
      'الأيقونة الملونة تُظهر الحرف الأول من اسم العميل'
    ]
  },
  {
    id: 'add-customer',
    title: 'إضافة عميل جديد',
    subtitle: 'تسجيل عميل في النظام',
    icon: UserPlus,
    color: 'emerald',
    steps: [
      {
        text: 'اضغط على زر "إضافة عميل" لفتح نموذج الإضافة',
        preview: <AddCustomerFormPreview />
      },
      {
        text: 'للعملاء التجاريين، يمكنك إضافة البيانات الضريبية (NIF, RC)',
        preview: <TaxInfoPreview />
      }
    ],
    tips: [
      'اسم العميل هو الحقل الوحيد المطلوب',
      'رقم الهاتف يساعد في البحث السريع',
      'البيانات الضريبية مهمة للفواتير الرسمية'
    ],
    shortcuts: [
      { key: 'Ctrl+N', action: 'إضافة عميل جديد' }
    ]
  },
  {
    id: 'search-filter',
    title: 'البحث والتصفية',
    subtitle: 'ابحث عن عملائك بسرعة',
    icon: Search,
    color: 'cyan',
    steps: [
      {
        text: 'استخدم شريط البحث للعثور على عميل بالاسم، رقم الهاتف، أو البريد الإلكتروني',
        preview: <SearchCustomerPreview />
      },
      {
        text: 'استخدم الفلاتر لتضييق النتائج حسب معايير محددة',
        preview: <FiltersPreview />
      }
    ],
    tips: [
      'البحث يبدأ تلقائياً بعد كتابة 2 حروف',
      'يمكنك الجمع بين عدة فلاتر',
      'اضغط "مسح" لإزالة جميع الفلاتر'
    ],
    shortcuts: [
      { key: 'Ctrl+F', action: 'التركيز على البحث' },
      { key: 'Escape', action: 'مسح البحث' }
    ]
  },
  {
    id: 'customer-details',
    title: 'تفاصيل العميل',
    subtitle: 'عرض المعلومات الكاملة',
    icon: Eye,
    color: 'indigo',
    steps: [
      {
        text: 'اضغط على زر "عرض" أو على اسم العميل لفتح صفحة التفاصيل',
        preview: <CustomerDetailsPreview />
      },
      {
        text: 'سجل المشتريات يظهر جميع طلبات العميل السابقة',
        preview: <PurchaseHistoryPreview />
      }
    ],
    tips: [
      'يمكنك التعديل مباشرة من صفحة التفاصيل',
      'الإحصائيات تُحسب تلقائياً من الطلبات'
    ]
  },
  {
    id: 'actions',
    title: 'إجراءات العميل',
    subtitle: 'تعديل، حذف، وإدارة العملاء',
    icon: Settings,
    color: 'orange',
    steps: [
      {
        text: 'كل عميل له مجموعة من الإجراءات المتاحة',
        preview: <CustomerActionsPreview />
      }
    ],
    tips: [
      'عرض: فتح صفحة تفاصيل العميل',
      'تعديل: تحديث بيانات العميل',
      'المشتريات: عرض سجل الطلبات',
      'الديون: عرض وإدارة ديون العميل',
      'حذف: حذف العميل (يتطلب عدم وجود طلبات)'
    ],
    shortcuts: [
      { key: 'E', action: 'تعديل العميل المحدد' },
      { key: 'Delete', action: 'حذف العميل المحدد' }
    ]
  },
  {
    id: 'debts',
    title: 'إدارة الديون',
    subtitle: 'تتبع مستحقات العملاء',
    icon: Wallet,
    color: 'red',
    steps: [
      {
        text: 'العملاء المدينون يظهرون بعلامة "مدين" في الجدول',
        preview: <CustomerRowPreview hasDebt />
      },
      {
        text: 'صفحة الديون تعرض تفاصيل كل دين والطلبات المرتبطة',
        preview: <DebtPreview />
      }
    ],
    tips: [
      'الدين = المبلغ المتبقي من الطلبات غير المدفوعة',
      'يمكنك تسجيل دفعات جزئية',
      'المخزون يُحدّث فور اكتمال الدفع'
    ]
  },
  {
    id: 'export',
    title: 'التصدير',
    subtitle: 'تصدير بيانات العملاء',
    icon: Download,
    color: 'emerald',
    steps: [
      {
        text: 'يمكنك تصدير قائمة العملاء بصيغة Excel',
        preview: <ExportPreview />
      }
    ],
    tips: [
      'التصدير يشمل جميع العملاء المفلترين',
      'الملف يدعم اللغة العربية',
      'يمكن فتحه في Excel أو Google Sheets'
    ],
    shortcuts: [
      { key: 'Ctrl+E', action: 'تصدير Excel' }
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
        text: 'النظام يعمل بدون إنترنت ويزامن تلقائياً عند الاتصال',
        preview: <SyncStatusPreview />
      }
    ],
    tips: [
      'جميع العمليات تتم محلياً فوراً',
      'المزامنة تتم في الخلفية',
      'لن تفقد أي بيانات حتى بدون اتصال'
    ]
  },
  {
    id: 'shortcuts-all',
    title: 'جميع الاختصارات',
    subtitle: 'تصفح سريع بلوحة المفاتيح',
    icon: Keyboard,
    color: 'violet',
    steps: [
      {
        text: 'استخدم اختصارات لوحة المفاتيح للتنقل السريع'
      }
    ],
    shortcuts: [
      { key: 'Ctrl+N', action: 'إضافة عميل جديد' },
      { key: 'Ctrl+F', action: 'البحث في العملاء' },
      { key: 'Ctrl+E', action: 'تصدير Excel' },
      { key: 'E', action: 'تعديل العميل المحدد' },
      { key: 'Delete', action: 'حذف العميل المحدد' },
      { key: 'Enter', action: 'عرض تفاصيل العميل' },
      { key: '↑ / ↓', action: 'التنقل بين العملاء' },
      { key: 'Escape', action: 'إغلاق النوافذ المنبثقة' },
      { key: 'R', action: 'تحديث القائمة' }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// تكوين الألوان
// ═══════════════════════════════════════════════════════════════════════════

const COLORS: Record<string, { bg: string; light: string; text: string }> = {
  blue: { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
  indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  red: { bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  green: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' }
};

// ═══════════════════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════

interface CustomersUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomersUserGuide: React.FC<CustomersUserGuideProps> = memo(({ open, onOpenChange }) => {
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
          <div className="h-1 bg-gradient-to-l from-blue-500 via-cyan-500 to-teal-500" />

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
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-zinc-800 dark:text-white">دليل العملاء</h2>
                    <p className="text-xs text-zinc-500">تعلّم كيف تدير عملاءك</p>
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
            <span>بازار - إدارة العملاء</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CustomersUserGuide.displayName = 'CustomersUserGuide';

export default CustomersUserGuide;

// ═══════════════════════════════════════════════════════════════════════════
// زر المساعدة
// ═══════════════════════════════════════════════════════════════════════════

export const CustomersHelpButton = memo<{ onClick: () => void; className?: string }>(({ onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
      "hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md",
      "transition-all group",
      className
    )}
    title="دليل العملاء (?)"
  >
    <HelpCircle className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
  </button>
));

CustomersHelpButton.displayName = 'CustomersHelpButton';
