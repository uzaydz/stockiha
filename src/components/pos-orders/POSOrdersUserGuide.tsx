/**
 * 📖 POSOrdersUserGuide - دليل استخدام طلبيات نقطة البيع
 * ═══════════════════════════════════════════════════════════════════════════
 * دليل تفاعلي شامل لإدارة الطلبيات مع معاينات حية من الواجهة
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
  RefreshCw,
  Eye,
  Edit3,
  FileText,
  Filter,
  Calendar,
  Download,
  Upload,
  XCircle,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Receipt,
  ClipboardList,
  Hash,
  DollarSign,
  Wallet,
  ArrowUpDown,
  MoreVertical,
  Copy,
  ExternalLink,
  Cloud,
  CloudOff,
  History,
  Tag,
  Percent,
  Scale,
  Ruler,
  Box
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// Mini Components للمعاينة الحية
// ═══════════════════════════════════════════════════════════════════════════

// معاينة صف طلب في الجدول
const OrderRowPreview = memo<{ status: 'completed' | 'pending' | 'cancelled'; paymentStatus: 'paid' | 'partial' | 'pending' }>(
  ({ status, paymentStatus }) => {
    const statusConfig = {
      completed: { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
      pending: { label: 'معلق', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
      cancelled: { label: 'ملغى', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' }
    };
    const paymentConfig = {
      paid: { label: 'مدفوع', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
      partial: { label: 'جزئي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
      pending: { label: 'معلق', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400' }
    };

    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-800 dark:text-white">#ORD-2024001</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusConfig[status].color)}>
                {statusConfig[status].label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
              <span>أحمد محمد</span>
              <span>•</span>
              <span>3 منتجات</span>
            </div>
          </div>
          <div className="text-left">
            <p className="font-bold text-orange-500">4,500 د.ج</p>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", paymentConfig[paymentStatus].color)}>
              {paymentConfig[paymentStatus].label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center">
              <Eye className="w-4 h-4 text-zinc-400" />
            </button>
            <button className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center">
              <Printer className="w-4 h-4 text-zinc-400" />
            </button>
            <button className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center">
              <MoreVertical className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

// معاينة حالات الطلب
const OrderStatusPreview = memo(() => (
  <div className="flex flex-wrap gap-2">
    {[
      { label: 'معلق', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', icon: Clock },
      { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', icon: RefreshCw },
      { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: CheckCircle },
      { label: 'ملغى', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: XCircle },
    ].map(({ label, color, icon: Icon }) => (
      <span key={label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", color)}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    ))}
  </div>
));

// معاينة حالات الدفع
const PaymentStatusPreview = memo(() => (
  <div className="flex flex-wrap gap-2">
    {[
      { label: 'مدفوع', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: CheckCircle2 },
      { label: 'دفع جزئي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', icon: Wallet },
      { label: 'معلق', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400', icon: Clock },
      { label: 'مسترجع', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', icon: RotateCcw },
    ].map(({ label, color, icon: Icon }) => (
      <span key={label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", color)}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    ))}
  </div>
));

// معاينة الفلاتر
const FiltersPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex flex-wrap gap-2">
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm">
        <Calendar className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-600 dark:text-zinc-300">اليوم</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-sm border-2 border-orange-500">
        <Filter className="w-4 h-4 text-orange-500" />
        <span className="text-orange-600 dark:text-orange-400">مكتمل</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm">
        <CreditCard className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-600 dark:text-zinc-300">مدفوع</span>
      </button>
      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm">
        <Search className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-400">بحث...</span>
      </button>
    </div>
  </div>
));

// معاينة البحث
const SearchOrderPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 rounded-xl px-3 py-2">
      <Search className="w-4 h-4 text-zinc-400" />
      <span className="text-sm text-zinc-400">ابحث برقم الطلب، اسم العميل، أو رقم الهاتف...</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-1">
      <Badge variant="outline" className="text-xs">#ORD-2024</Badge>
      <Badge variant="outline" className="text-xs">أحمد</Badge>
      <Badge variant="outline" className="text-xs">0550123456</Badge>
    </div>
  </div>
));

// معاينة تفاصيل الطلب
const OrderDetailsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Hash className="w-4 h-4 text-orange-500" />
        <span className="font-bold text-zinc-800 dark:text-white">ORD-2024001</span>
      </div>
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">مكتمل</Badge>
    </div>
    <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-zinc-500">العميل</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-200">أحمد محمد</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-500">عدد المنتجات</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-200">3 منتجات</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-500">طريقة الدفع</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-200">نقدي</span>
      </div>
    </div>
    <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
    <div className="flex justify-between text-lg">
      <span className="font-bold text-zinc-800 dark:text-white">الإجمالي</span>
      <span className="font-black text-orange-500">4,500 د.ج</span>
    </div>
  </div>
));

// معاينة عناصر الطلب
const OrderItemsPreview = memo(() => (
  <div className="space-y-2">
    {[
      { name: 'قميص رجالي أزرق', qty: 2, price: 1500, color: 'أزرق', size: 'L' },
      { name: 'بنطلون جينز', qty: 1, price: 2000, color: 'أسود', size: '32' },
    ].map((item, idx) => (
      <div key={idx} className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-800 dark:text-white">{item.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{item.color}</Badge>
              <Badge variant="outline" className="text-xs">{item.size}</Badge>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-zinc-800 dark:text-white">{item.qty} × {item.price}</p>
            <p className="text-xs text-orange-500 font-bold">{item.qty * item.price} د.ج</p>
          </div>
        </div>
      </div>
    ))}
  </div>
));

// معاينة إجراءات الطلب
const OrderActionsPreview = memo(() => (
  <div className="flex flex-wrap gap-2">
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium">
      <Eye className="w-4 h-4" />
      عرض
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
      <Printer className="w-4 h-4" />
      طباعة
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium">
      <Edit3 className="w-4 h-4" />
      تعديل
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-medium">
      <RotateCcw className="w-4 h-4" />
      إرجاع
    </button>
    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
      <Trash2 className="w-4 h-4" />
      حذف
    </button>
  </div>
));

// معاينة الإرجاع السريع
const QuickReturnPreview = memo(() => (
  <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/30 space-y-3">
    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
      <RotateCcw className="w-5 h-5" />
      <span className="font-bold">إرجاع سريع</span>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-800">
        <div className="flex items-center gap-2">
          <input type="checkbox" className="w-4 h-4 accent-purple-500" defaultChecked />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">قميص رجالي أزرق</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">الكمية:</span>
          <input type="number" defaultValue="1" className="w-12 text-center text-sm border rounded px-1" />
          <span className="text-xs text-zinc-500">/ 2</span>
        </div>
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-800">
        <div className="flex items-center gap-2">
          <input type="checkbox" className="w-4 h-4 accent-purple-500" />
          <span className="text-sm text-zinc-700 dark:text-zinc-200">بنطلون جينز</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">الكمية:</span>
          <input type="number" defaultValue="0" className="w-12 text-center text-sm border rounded px-1" />
          <span className="text-xs text-zinc-500">/ 1</span>
        </div>
      </div>
    </div>
    <div className="pt-2 border-t border-purple-200 dark:border-purple-500/30">
      <div className="flex justify-between text-sm">
        <span className="text-purple-600 dark:text-purple-400">مبلغ الإرجاع:</span>
        <span className="font-bold text-purple-700 dark:text-purple-300">1,500 د.ج</span>
      </div>
    </div>
  </div>
));

// معاينة الإحصائيات
const StatsPreview = memo(() => (
  <div className="grid grid-cols-2 gap-2">
    {[
      { label: 'إجمالي الطلبات', value: '156', icon: ClipboardList, color: 'blue' },
      { label: 'الإيرادات', value: '450,000 د.ج', icon: DollarSign, color: 'emerald' },
      { label: 'المدفوع', value: '380,000 د.ج', icon: CheckCircle2, color: 'green' },
      { label: 'المعلق', value: '70,000 د.ج', icon: Clock, color: 'amber' },
    ].map(({ label, value, icon: Icon, color }) => (
      <div key={label} className={cn(
        "p-3 rounded-xl border",
        color === 'blue' && "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30",
        color === 'emerald' && "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30",
        color === 'green' && "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30",
        color === 'amber' && "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "w-4 h-4",
            color === 'blue' && "text-blue-500",
            color === 'emerald' && "text-emerald-500",
            color === 'green' && "text-green-500",
            color === 'amber' && "text-amber-500"
          )} />
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        <p className="text-sm font-bold text-zinc-800 dark:text-white mt-1">{value}</p>
      </div>
    ))}
  </div>
));

// معاينة طرق الدفع
const PaymentMethodsPreview = memo(() => (
  <div className="flex gap-2">
    {[
      { icon: Banknote, label: 'نقدي', active: true, color: 'emerald' },
      { icon: CreditCard, label: 'بطاقة', active: false },
      { icon: RefreshCw, label: 'تحويل', active: false },
      { icon: Wallet, label: 'ائتمان', active: false },
    ].map(({ icon: Icon, label, active, color }) => (
      <button
        key={label}
        className={cn(
          "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all text-xs",
          active
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
            : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        )}
      >
        <Icon className={cn("w-4 h-4", active ? "text-emerald-500" : "text-zinc-400")} />
        <span className={cn("font-medium", active ? "text-emerald-600" : "text-zinc-500")}>{label}</span>
      </button>
    ))}
  </div>
));

// معاينة أنواع البيع
const SaleTypesPreview = memo(() => (
  <div className="space-y-2">
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
      <Package className="w-5 h-5 text-blue-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">بيع بالقطعة</span>
        <p className="text-xs text-zinc-500">الكمية × السعر</p>
      </div>
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">5 × 1000</Badge>
    </div>
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
      <Scale className="w-5 h-5 text-purple-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">بيع بالوزن</span>
        <p className="text-xs text-zinc-500">الوزن × سعر الكيلو</p>
      </div>
      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">2.5 كغ</Badge>
    </div>
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
      <Ruler className="w-5 h-5 text-teal-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">بيع بالمتر</span>
        <p className="text-xs text-zinc-500">الطول × سعر المتر</p>
      </div>
      <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400">3.5 متر</Badge>
    </div>
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
      <Box className="w-5 h-5 text-amber-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">بيع بالصندوق</span>
        <p className="text-xs text-zinc-500">عدد الصناديق × السعر</p>
      </div>
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">2 صندوق</Badge>
    </div>
  </div>
));

// معاينة الطباعة
const PrintPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 max-w-[200px] mx-auto">
    <div className="text-center space-y-2">
      <div className="w-12 h-12 mx-auto bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center">
        <Receipt className="w-6 h-6 text-orange-500" />
      </div>
      <p className="font-bold text-sm text-zinc-800 dark:text-white">بازار</p>
      <div className="h-px bg-dashed bg-zinc-300 dark:bg-zinc-600" />
      <div className="text-xs text-zinc-500 space-y-1">
        <p>#ORD-2024001</p>
        <p>12/12/2024 - 14:30</p>
      </div>
      <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
      <div className="text-xs text-right space-y-1">
        <div className="flex justify-between">
          <span>قميص ×2</span>
          <span>3,000</span>
        </div>
        <div className="flex justify-between">
          <span>بنطلون ×1</span>
          <span>2,000</span>
        </div>
      </div>
      <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
      <div className="flex justify-between text-sm font-bold">
        <span>الإجمالي</span>
        <span className="text-orange-500">5,000 د.ج</span>
      </div>
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
        <p className="text-xs text-emerald-600 dark:text-emerald-400">آخر مزامنة: منذ دقيقة</p>
      </div>
      <CheckCircle className="w-5 h-5 text-emerald-500" />
    </div>
    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
      <CloudOff className="w-5 h-5 text-amber-500" />
      <div className="flex-1">
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">غير متصل</span>
        <p className="text-xs text-amber-600 dark:text-amber-400">3 طلبات في انتظار المزامنة</p>
      </div>
      <RefreshCw className="w-5 h-5 text-amber-500" />
    </div>
  </div>
));

// معاينة تعديل الطلب
const EditOrderPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
      <Edit3 className="w-5 h-5" />
      <span className="font-bold">تعديل الطلب</span>
    </div>
    <div className="space-y-2">
      <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <label className="text-xs text-zinc-500 block mb-1">الحالة</label>
        <select className="w-full bg-transparent text-sm text-zinc-700 dark:text-zinc-200">
          <option>مكتمل</option>
          <option>معلق</option>
          <option>ملغى</option>
        </select>
      </div>
      <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <label className="text-xs text-zinc-500 block mb-1">الملاحظات</label>
        <input
          type="text"
          placeholder="أضف ملاحظة..."
          className="w-full bg-transparent text-sm text-zinc-700 dark:text-zinc-200"
        />
      </div>
    </div>
  </div>
));

// معاينة إلغاء الطلب
const CancelOrderPreview = memo(() => (
  <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30 space-y-3">
    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
      <AlertTriangle className="w-5 h-5" />
      <span className="font-bold">إلغاء الطلب</span>
    </div>
    <p className="text-sm text-red-700 dark:text-red-300">
      هل أنت متأكد من إلغاء هذا الطلب؟ سيتم استرجاع المخزون تلقائياً.
    </p>
    <div className="flex gap-2">
      <button className="flex-1 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200">
        تراجع
      </button>
      <button className="flex-1 py-2 rounded-lg bg-red-500 text-sm font-medium text-white">
        تأكيد الإلغاء
      </button>
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
    title: 'نظرة عامة على الطلبيات',
    subtitle: 'فهم واجهة إدارة الطلبيات',
    icon: ClipboardList,
    color: 'blue',
    steps: [
      {
        text: 'صفحة الطلبيات تعرض جميع طلبات نقطة البيع في جدول منظم مع معلومات مهمة',
        preview: <OrderRowPreview status="completed" paymentStatus="paid" />
      },
      {
        text: 'كل طلب يعرض: رقم الطلب، الحالة، العميل، الإجمالي، وأزرار الإجراءات السريعة'
      }
    ],
    tips: [
      'الطلبات مرتبة من الأحدث للأقدم',
      'اضغط على أي صف لعرض التفاصيل الكاملة'
    ]
  },
  {
    id: 'statuses',
    title: 'حالات الطلب',
    subtitle: 'فهم مراحل الطلب المختلفة',
    icon: RefreshCw,
    color: 'purple',
    steps: [
      {
        text: 'كل طلب له حالة تمثل مرحلته الحالية في دورة الحياة',
        preview: <OrderStatusPreview />
      },
      {
        text: 'حالة الدفع منفصلة عن حالة الطلب وتتبع المبالغ المدفوعة',
        preview: <PaymentStatusPreview />
      }
    ],
    tips: [
      'معلق: الطلب بانتظار المعالجة',
      'قيد المعالجة: جاري تحضير الطلب',
      'مكتمل: تم تسليم الطلب بنجاح',
      'ملغى: تم إلغاء الطلب'
    ]
  },
  {
    id: 'search-filter',
    title: 'البحث والتصفية',
    subtitle: 'ابحث عن طلباتك بسهولة',
    icon: Search,
    color: 'cyan',
    steps: [
      {
        text: 'استخدم شريط البحث للعثور على طلب برقمه، اسم العميل، أو رقم الهاتف',
        preview: <SearchOrderPreview />
      },
      {
        text: 'استخدم الفلاتر لتضييق النتائج حسب التاريخ، الحالة، أو طريقة الدفع',
        preview: <FiltersPreview />
      }
    ],
    tips: [
      'يمكنك الجمع بين عدة فلاتر',
      'اضغط "مسح" لإزالة جميع الفلاتر'
    ],
    shortcuts: [
      { key: 'Ctrl+F', action: 'التركيز على البحث' },
      { key: 'Escape', action: 'مسح البحث' }
    ]
  },
  {
    id: 'order-details',
    title: 'تفاصيل الطلب',
    subtitle: 'عرض المعلومات الكاملة',
    icon: FileText,
    color: 'indigo',
    steps: [
      {
        text: 'اضغط على زر "عرض" أو على الصف لفتح تفاصيل الطلب الكاملة',
        preview: <OrderDetailsPreview />
      },
      {
        text: 'عرض جميع المنتجات في الطلب مع الكميات والأسعار',
        preview: <OrderItemsPreview />
      }
    ],
    tips: [
      'يمكنك طباعة الفاتورة من صفحة التفاصيل',
      'معلومات العميل والملاحظات تظهر في التفاصيل'
    ]
  },
  {
    id: 'actions',
    title: 'إجراءات الطلب',
    subtitle: 'تعديل، طباعة، إرجاع، وإدارة الطلبات',
    icon: Settings,
    color: 'orange',
    steps: [
      {
        text: 'كل طلب له مجموعة من الإجراءات المتاحة: عرض، طباعة، تعديل، إرجاع، حذف',
        preview: <OrderActionsPreview />
      },
      {
        text: 'تعديل الطلب يتيح تغيير الحالة والملاحظات',
        preview: <EditOrderPreview />
      },
      {
        text: 'الإرجاع السريع: اختر المنتجات والكميات المراد إرجاعها من الطلب',
        preview: <QuickReturnPreview />
      },
      {
        text: 'إلغاء الطلب يسترجع المخزون تلقائياً',
        preview: <CancelOrderPreview />
      }
    ],
    tips: [
      'زر الإرجاع (بنفسجي): لإرجاع منتجات من طلب مكتمل',
      'يمكنك إرجاع جزء من المنتجات أو الكمية',
      'المخزون يُحدّث تلقائياً عند الإرجاع',
      'لا يمكن إرجاع طلبية ملغاة',
      'الحذف نهائي - استخدم الإلغاء بدلاً منه'
    ],
    shortcuts: [
      { key: 'P', action: 'طباعة الطلب المحدد' },
      { key: 'E', action: 'تعديل الطلب المحدد' },
      { key: 'R', action: 'إرجاع من الطلب المحدد' },
      { key: 'Delete', action: 'حذف الطلب المحدد' }
    ]
  },
  {
    id: 'sale-types',
    title: 'أنواع البيع',
    subtitle: 'قطعة، وزن، متر، صندوق',
    icon: Layers,
    color: 'violet',
    steps: [
      {
        text: 'النظام يدعم أربعة أنواع من البيع لتناسب طبيعة المنتجات المختلفة',
        preview: <SaleTypesPreview />
      }
    ],
    tips: [
      'البيع بالقطعة: للمنتجات المعدودة',
      'البيع بالوزن: للمنتجات الموزونة (كغ)',
      'البيع بالمتر: للأقمشة والمواد الطولية',
      'البيع بالصندوق: للبيع بالجملة'
    ]
  },
  {
    id: 'payment',
    title: 'طرق الدفع',
    subtitle: 'نقد، بطاقة، تحويل، ائتمان',
    icon: CreditCard,
    color: 'emerald',
    steps: [
      {
        text: 'يدعم النظام عدة طرق للدفع',
        preview: <PaymentMethodsPreview />
      }
    ],
    tips: [
      'النقدي: دفع فوري نقداً',
      'البطاقة: بطاقة ائتمان أو خصم',
      'التحويل: تحويل بنكي',
      'الائتمان: حساب آجل للعملاء الموثوقين'
    ]
  },
  {
    id: 'stats',
    title: 'الإحصائيات',
    subtitle: 'تتبع أداء المبيعات',
    icon: BarChart3,
    color: 'teal',
    steps: [
      {
        text: 'شاهد إحصائيات الطلبات في لمحة سريعة',
        preview: <StatsPreview />
      }
    ],
    tips: [
      'الإحصائيات تتحدث حسب الفلاتر المحددة',
      'اضغط على أي إحصائية لعرض التفاصيل'
    ]
  },
  {
    id: 'printing',
    title: 'الطباعة',
    subtitle: 'طباعة الفواتير والإيصالات',
    icon: Printer,
    color: 'sky',
    steps: [
      {
        text: 'اطبع إيصالات احترافية بضغطة زر',
        preview: <PrintPreview />
      }
    ],
    tips: [
      'يدعم أحجام ورق: 48mm، 58mm، 80mm',
      'قوالب متعددة: Apple، Modern، Classic',
      'فتح درج النقود تلقائياً'
    ],
    shortcuts: [
      { key: 'Ctrl+P', action: 'طباعة سريعة' }
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
      'الطلبات تُحفظ محلياً فوراً',
      'المزامنة تتم تلقائياً في الخلفية',
      'لا تفقد أي بيانات حتى بدون اتصال'
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
      { key: 'Ctrl+F', action: 'البحث في الطلبيات' },
      { key: 'Ctrl+P', action: 'طباعة الطلب المحدد' },
      { key: 'Ctrl+N', action: 'طلب جديد (الذهاب لـ POS)' },
      { key: 'E', action: 'تعديل الطلب المحدد' },
      { key: 'Delete', action: 'حذف الطلب المحدد' },
      { key: 'Enter', action: 'عرض تفاصيل الطلب' },
      { key: '↑ / ↓', action: 'التنقل بين الطلبات' },
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
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  teal: { bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
  sky: { bg: 'bg-sky-500', light: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
  green: { bg: 'bg-green-500', light: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  zinc: { bg: 'bg-zinc-500', light: 'bg-zinc-50 dark:bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400' }
};

// ═══════════════════════════════════════════════════════════════════════════
// المكون الرئيسي
// ═══════════════════════════════════════════════════════════════════════════

interface POSOrdersUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POSOrdersUserGuide: React.FC<POSOrdersUserGuideProps> = memo(({ open, onOpenChange }) => {
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
          <div className="h-1 bg-gradient-to-l from-blue-500 via-purple-500 to-pink-500" />

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
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-zinc-800 dark:text-white">دليل الطلبيات</h2>
                    <p className="text-xs text-zinc-500">تعلّم كيف تدير طلبات نقطة البيع</p>
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
            <span>بازار - إدارة الطلبيات</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

POSOrdersUserGuide.displayName = 'POSOrdersUserGuide';

export default POSOrdersUserGuide;

// ═══════════════════════════════════════════════════════════════════════════
// زر المساعدة
// ═══════════════════════════════════════════════════════════════════════════

export const POSOrdersHelpButton = memo<{ onClick: () => void; className?: string }>(({ onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center",
      "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
      "hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md",
      "transition-all group",
      className
    )}
    title="دليل الطلبيات (?)"
  >
    <HelpCircle className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
  </button>
));

POSOrdersHelpButton.displayName = 'POSOrdersHelpButton';
