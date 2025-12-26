/**
 * 📖 ProductsUserGuide - دليل استخدام صفحة المنتجات
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
  Package,
  Plus,
  Edit,
  Trash2,
  Filter,
  Grid,
  List,
  Image,
  Tag,
  DollarSign,
  Layers,
  BarChart3,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Upload,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Barcode,
  FolderTree,
  Palette,
  Settings,
  Boxes,
  FileText,
  Archive,
  Clock,
  Percent,
  Printer,
  Download,
  ScanLine
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// Mini Components للمعاينة الحية
// ═══════════════════════════════════════════════════════════════════════════

// معاينة شريط البحث
const SearchBarPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-700 shadow-sm">
    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 rounded-xl px-3 py-2">
      <Search className="w-4 h-4 text-zinc-400" />
      <span className="text-sm text-zinc-400">ابحث عن منتج بالاسم أو الباركود...</span>
      <div className="mr-auto flex items-center gap-1">
        <ScanLine className="w-4 h-4 text-zinc-400" />
      </div>
    </div>
  </div>
));

// معاينة بطاقة منتج
const ProductCardPreview = memo<{ selected?: boolean; viewMode?: 'grid' | 'list' }>(({ selected, viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className={cn(
        "bg-white dark:bg-zinc-800 rounded-xl p-3 border-2 transition-all flex items-center gap-4",
        selected
          ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
          : "border-zinc-200 dark:border-zinc-700"
      )}>
        <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 rounded-lg flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-800 dark:text-white truncate">اسم المنتج</p>
          <p className="text-xs text-zinc-500">SKU: PRD-001</p>
        </div>
        <div className="text-left">
          <span className="text-sm font-bold text-emerald-500">1,500 د.ج</span>
          <p className="text-xs text-emerald-500">150 في المخزون</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-800 rounded-xl p-3 border-2 transition-all w-36",
      selected
        ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
        : "border-zinc-200 dark:border-zinc-700"
    )}>
      <div className="w-full h-20 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 rounded-lg mb-2 flex items-center justify-center">
        <Package className="w-8 h-8 text-zinc-400" />
      </div>
      <p className="text-xs font-bold text-zinc-800 dark:text-white truncate">اسم المنتج</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-bold text-emerald-500">1,500 د.ج</span>
        <span className="text-[10px] text-emerald-500">متوفر</span>
      </div>
    </div>
  );
});

// معاينة الفلاتر
const FiltersPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm">
        <FolderTree className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-zinc-600 dark:text-zinc-300">جميع الفئات</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-sm">
        <Boxes className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-emerald-700 dark:text-emerald-300">متوفر</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm">
        <Clock className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-zinc-600 dark:text-zinc-300">الأحدث</span>
      </div>
    </div>
  </div>
));

// معاينة أزرار العرض
const ViewModePreview = memo(() => (
  <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl p-1 border border-zinc-200 dark:border-zinc-700 w-fit">
    <button className="p-2 rounded-lg bg-emerald-500 text-white">
      <Grid className="w-4 h-4" />
    </button>
    <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500">
      <List className="w-4 h-4" />
    </button>
  </div>
));

// معاينة زر إضافة منتج
const AddProductButtonPreview = memo(() => (
  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
    <Plus className="w-4 h-4" />
    <span>إنشاء منتج جديد</span>
  </button>
));

// معاينة حالات المخزون
const StockStatusPreview = memo(() => (
  <div className="flex flex-wrap gap-2">
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">متوفر (150)</span>
    </div>
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">منخفض (5)</span>
    </div>
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/20">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-xs font-medium text-red-600 dark:text-red-400">نفد (0)</span>
    </div>
  </div>
));

// معاينة حالات النشر
const PublicationStatusPreview = memo(() => (
  <div className="flex flex-wrap gap-2">
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
      منشور
    </Badge>
    <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
      مسودة
    </Badge>
    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
      مجدول
    </Badge>
    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
      مؤرشف
    </Badge>
  </div>
));

// معاينة تبويبات نموذج المنتج - محدثة لتعكس التبويبات الفعلية
const ProductFormTabsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
    <div className="flex border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
      {[
        { icon: Package, label: 'أساسية', active: true, required: true },
        { icon: Image, label: 'صور', active: false, required: true },
        { icon: DollarSign, label: 'سعر', active: false, required: true },
        { icon: Palette, label: 'متغيرات', active: false, required: false },
      ].map(({ icon: Icon, label, active, required }) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors relative",
            active
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          {required && <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-2 right-2" />}
        </div>
      ))}
    </div>
    <div className="p-2 bg-zinc-50 dark:bg-zinc-700/50">
      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span>مطلوب</span>
        <span className="mx-2">|</span>
        <span>8 تبويبات: أساسية، صور، سعر، متغيرات، توصيل، بيع متقدم، عامة، تحويلات</span>
      </div>
    </div>
  </div>
));

// معاينة تبويب أنواع البيع المتقدمة
const AdvancedSellingTypesPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex flex-wrap gap-1.5">
      {[
        { icon: '⚖️', label: 'الوزن', active: true },
        { icon: '📦', label: 'الكرتون', active: false },
        { icon: '📏', label: 'المتر', active: false },
        { icon: '📅', label: 'الصلاحية', active: false },
        { icon: '#️⃣', label: 'تسلسلي', active: false },
        { icon: '🛡️', label: 'الضمان', active: false },
      ].map(({ icon, label, active }) => (
        <button
          key={label}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
            active
              ? "bg-emerald-500 text-white"
              : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
          )}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
    <div className="p-2 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg text-xs text-zinc-500">
      البيع بالوزن: حدد الوزن بالكيلو والسعر لكل كيلو
    </div>
  </div>
));

// معاينة تتبع التحويلات
const ConversionTrackingPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2">
    <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      <BarChart3 className="w-4 h-4 text-indigo-500" />
      <span>تتبع التحويلات</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { name: 'Facebook', color: 'bg-blue-500', icon: '📘' },
        { name: 'Google', color: 'bg-red-500', icon: '🔍' },
        { name: 'TikTok', color: 'bg-black', icon: '🎵' },
      ].map(({ name, color, icon }) => (
        <div key={name} className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600">
          <span className={cn("w-6 h-6 rounded flex items-center justify-center text-white text-xs", color)}>
            {icon}
          </span>
          <span className="text-xs text-zinc-600 dark:text-zinc-300">{name}</span>
        </div>
      ))}
    </div>
  </div>
));

// معاينة التوصيل والنماذج
const ShippingTemplatesPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <RefreshCw className="w-4 h-4 text-green-500" />
        <span>التوصيل والنماذج</span>
      </div>
      <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-[10px]">
        مفعّل
      </Badge>
    </div>
    <div className="space-y-1.5">
      <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <span className="text-xs text-zinc-600 dark:text-zinc-300">نموذج الطلب الافتراضي</span>
        <span className="text-xs text-emerald-600">مرتبط</span>
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
        <span className="text-xs text-zinc-600 dark:text-zinc-300">تكلفة التوصيل</span>
        <span className="text-xs text-zinc-500">حسب الولاية</span>
      </div>
    </div>
  </div>
));

// معاينة الإعدادات العامة
const GeneralSettingsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="space-y-2">
      {[
        { icon: '🎁', label: 'العروض الخاصة', desc: 'خصومات على الباقات' },
        { icon: '💰', label: 'أسعار الجملة', desc: 'خصومات الكميات الكبيرة' },
        { icon: '📢', label: 'التسويق', desc: 'أدوات المشاركة' },
        { icon: '⚙️', label: 'إعدادات متقدمة', desc: 'خيارات إضافية' },
      ].map(({ icon, label, desc }) => (
        <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
          <span className="text-lg">{icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">{label}</span>
            <span className="text-[10px] text-zinc-500">{desc}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
));

// معاينة إدارة الصور
const ImageManagerPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex gap-2">
      <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg flex items-center justify-center border-2 border-emerald-500">
        <Image className="w-6 h-6 text-emerald-500" />
      </div>
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-600">
        <Upload className="w-5 h-5 text-zinc-400" />
      </div>
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-600">
        <Plus className="w-5 h-5 text-zinc-400" />
      </div>
    </div>
  </div>
));

// معاينة المتغيرات
const VariantsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-300">الألوان:</span>
      <div className="flex gap-1.5">
        <div className="w-6 h-6 rounded-full bg-red-500 ring-2 ring-emerald-500 ring-offset-2" />
        <div className="w-6 h-6 rounded-full bg-blue-500" />
        <div className="w-6 h-6 rounded-full bg-black" />
        <div className="w-6 h-6 rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center">
          <Plus className="w-3 h-3 text-zinc-400" />
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-300">المقاسات:</span>
      <div className="flex gap-1.5">
        {['S', 'M', 'L', 'XL'].map((size, idx) => (
          <span
            key={size}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium",
              idx === 1
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            )}
          >
            {size}
          </span>
        ))}
      </div>
    </div>
  </div>
));

// معاينة التسعير
const PricingPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-500">سعر البيع</span>
      <span className="text-lg font-bold text-emerald-600">2,500 د.ج</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-500">سعر الشراء</span>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">1,800 د.ج</span>
    </div>
    <div className="h-px bg-zinc-200 dark:bg-zinc-700" />
    <div className="flex justify-between items-center">
      <span className="text-sm text-zinc-500">هامش الربح</span>
      <span className="text-sm font-bold text-emerald-500">+38.9%</span>
    </div>
  </div>
));

// معاينة أسعار الجملة
const WholesalePricingPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2">
    <div className="flex items-center gap-2 text-sm">
      <Layers className="w-4 h-4 text-green-500" />
      <span className="text-zinc-600 dark:text-zinc-300">أسعار الجملة</span>
    </div>
    <div className="space-y-1.5">
      {[
        { qty: '10+', price: '2,200 د.ج', discount: '-12%' },
        { qty: '50+', price: '2,000 د.ج', discount: '-20%' },
        { qty: '100+', price: '1,800 د.ج', discount: '-28%' },
      ].map(({ qty, price, discount }) => (
        <div key={qty} className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-700/50 rounded-lg px-2.5 py-1.5">
          <span className="text-zinc-500">{qty}</span>
          <span className="font-medium text-green-600">{price}</span>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-[10px]">
            {discount}
          </Badge>
        </div>
      ))}
    </div>
  </div>
));

// معاينة الباركود
const BarcodePreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Barcode className="w-4 h-4 text-zinc-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">الباركود</span>
      </div>
      <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700">
        <Printer className="w-4 h-4 text-zinc-500" />
      </button>
    </div>
    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg px-3 py-2">
      <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300 flex-1">6281234567890</code>
      <button className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600">
        <Copy className="w-3.5 h-3.5 text-zinc-500" />
      </button>
    </div>
  </div>
));

// معاينة إجراءات المنتج
const ProductActionsPreview = memo(() => (
  <div className="flex items-center gap-2">
    <button className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors">
      <Eye className="w-4 h-4" />
    </button>
    <button className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors">
      <Edit className="w-4 h-4" />
    </button>
    <button className="p-2 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/30 transition-colors">
      <Copy className="w-4 h-4" />
    </button>
    <button className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors">
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
));

// معاينة الترقيم
const PaginationPreview = memo(() => (
  <div className="flex items-center justify-center gap-1">
    <button className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm text-zinc-500">السابق</button>
    <button className="w-8 h-8 rounded-lg bg-emerald-500 text-white text-sm font-medium">1</button>
    <button className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm text-zinc-600 dark:text-zinc-300">2</button>
    <button className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm text-zinc-600 dark:text-zinc-300">3</button>
    <span className="px-2 text-zinc-400">...</span>
    <button className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-sm text-zinc-600 dark:text-zinc-300">10</button>
    <button className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm">التالي</button>
  </div>
));

// معاينة الطباعة السريعة
const QuickPrintPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Printer className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">الطباعة السريعة</span>
      </div>
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs">
        جاهز
      </Badge>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <button className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-zinc-200 dark:border-zinc-600 transition-colors">
        <Barcode className="w-5 h-5 text-zinc-500" />
        <span className="text-xs text-zinc-600 dark:text-zinc-300">باركود</span>
      </button>
      <button className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-zinc-200 dark:border-zinc-600 transition-colors">
        <Tag className="w-5 h-5 text-zinc-500" />
        <span className="text-xs text-zinc-600 dark:text-zinc-300">ملصق سعر</span>
      </button>
      <button className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-zinc-200 dark:border-zinc-600 transition-colors">
        <FileText className="w-5 h-5 text-zinc-500" />
        <span className="text-xs text-zinc-600 dark:text-zinc-300">تقرير</span>
      </button>
    </div>
  </div>
));

// معاينة خيارات طباعة الباركود
const BarcodePrintOptionsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-2 text-sm">
      <Settings className="w-4 h-4 text-zinc-500" />
      <span className="text-zinc-600 dark:text-zinc-300">خيارات الطباعة</span>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-700/50 rounded-lg px-3 py-2">
        <span className="text-xs text-zinc-600 dark:text-zinc-300">عدد النسخ</span>
        <div className="flex items-center gap-1.5">
          <button className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300 text-sm">-</button>
          <span className="w-8 text-center text-sm font-medium text-zinc-700 dark:text-zinc-200">10</span>
          <button className="w-6 h-6 rounded bg-emerald-500 text-white text-sm">+</button>
        </div>
      </div>
      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-700/50 rounded-lg px-3 py-2">
        <span className="text-xs text-zinc-600 dark:text-zinc-300">حجم الباركود</span>
        <div className="flex items-center gap-1">
          {['S', 'M', 'L'].map((size, idx) => (
            <button
              key={size}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                idx === 1
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-700/50 rounded-lg px-3 py-2">
        <span className="text-xs text-zinc-600 dark:text-zinc-300">إظهار السعر</span>
        <div className="w-8 h-5 rounded-full bg-emerald-500 relative">
          <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
        </div>
      </div>
    </div>
  </div>
));

// معاينة طباعة متعددة
const BatchPrintPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-2 mb-3">
      <Boxes className="w-4 h-4 text-violet-500" />
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">طباعة مجمعة</span>
    </div>
    <div className="space-y-2">
      {[
        { name: 'قميص أبيض', qty: 20, checked: true },
        { name: 'بنطلون جينز', qty: 15, checked: true },
        { name: 'حذاء رياضي', qty: 10, checked: false },
      ].map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg px-3 py-2">
          <div className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center",
            item.checked
              ? "bg-emerald-500 border-emerald-500"
              : "border-zinc-300 dark:border-zinc-600"
          )}>
            {item.checked && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="flex-1 text-xs text-zinc-600 dark:text-zinc-300">{item.name}</span>
          <Badge className="bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300 text-[10px]">
            {item.qty} نسخة
          </Badge>
        </div>
      ))}
    </div>
    <button className="w-full mt-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium flex items-center justify-center gap-2">
      <Printer className="w-4 h-4" />
      <span>طباعة المحدد (35 نسخة)</span>
    </button>
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
    subtitle: 'تعرف على صفحة المنتجات',
    icon: Package,
    color: 'emerald',
    steps: [
      {
        text: 'صفحة المنتجات تعرض جميع منتجاتك بشكل منظم مع إمكانية البحث والتصفية',
        preview: (
          <div className="flex gap-2">
            <ProductCardPreview />
            <ProductCardPreview selected />
          </div>
        )
      },
      {
        text: 'يمكنك التبديل بين عرض الشبكة والقائمة حسب تفضيلك',
        preview: <ViewModePreview />
      }
    ],
    tips: ['الصفحة تدعم العمل أوفلاين وتُحمّل البيانات محلياً', 'يتم حفظ تفضيلات العرض تلقائياً']
  },
  {
    id: 'search',
    title: 'البحث عن المنتجات',
    subtitle: 'ابحث وصفّي بسرعة',
    icon: Search,
    color: 'blue',
    steps: [
      {
        text: 'استخدم شريط البحث للبحث بالاسم، الباركود، أو رمز SKU',
        preview: <SearchBarPreview />
      },
      {
        text: 'استخدم الفلاتر لتصفية المنتجات حسب الفئة، المخزون، أو الترتيب',
        preview: <FiltersPreview />
      }
    ],
    tips: [
      'البحث يعمل فورياً أثناء الكتابة',
      'يمكنك مسح الباركود مباشرة للبحث السريع',
      'الفلاتر تُحفظ في رابط الصفحة لمشاركتها'
    ],
    shortcuts: [
      { key: 'Ctrl+F', action: 'التركيز على البحث' },
      { key: 'Escape', action: 'مسح البحث' }
    ]
  },
  {
    id: 'filters',
    title: 'التصفية والترتيب',
    subtitle: 'تنظيم المنتجات بسهولة',
    icon: Filter,
    color: 'violet',
    steps: [
      {
        text: 'صفّي حسب حالة المخزون: متوفر، منخفض، أو نفد المخزون',
        preview: <StockStatusPreview />
      },
      {
        text: 'صفّي حسب حالة النشر: منشور، مسودة، مجدول، أو مؤرشف',
        preview: <PublicationStatusPreview />
      }
    ],
    tips: [
      'اختر "جميع الفئات" لعرض كل المنتجات',
      'رتّب حسب الأحدث، الأقدم، السعر، أو المخزون'
    ]
  },
  {
    id: 'add-product',
    title: 'إضافة منتج جديد',
    subtitle: 'أنشئ منتجاً بخطوات بسيطة',
    icon: Plus,
    color: 'green',
    steps: [
      {
        text: 'اضغط على زر "إنشاء منتج جديد" لفتح نموذج الإضافة',
        preview: <AddProductButtonPreview />
      },
      {
        text: 'النموذج مقسم إلى 8 تبويبات: 3 مطلوبة (أساسية، صور، سعر) و 5 اختيارية',
        preview: <ProductFormTabsPreview />
      }
    ],
    tips: [
      'التبويبات المطلوبة: المعلومات الأساسية، الصور، السعر والمخزون',
      'التبويبات الاختيارية: المتغيرات، التوصيل، أنواع البيع، إعدادات عامة، تتبع التحويلات',
      'يمكنك حفظ المنتج كمسودة وإكماله لاحقاً',
      'جدولة النشر متاحة لتحديد وقت النشر',
      'تحتاج صلاحية manageProducts لإضافة المنتجات'
    ],
    shortcuts: [
      { key: 'Ctrl+→', action: 'الانتقال للتبويب التالي' },
      { key: 'Ctrl+←', action: 'الانتقال للتبويب السابق' },
      { key: 'Ctrl+1-5', action: 'الانتقال لتبويب محدد' }
    ]
  },
  {
    id: 'product-info',
    title: 'معلومات المنتج',
    subtitle: 'البيانات الأساسية للمنتج',
    icon: FileText,
    color: 'sky',
    steps: [
      {
        text: 'أدخل اسم المنتج والوصف والفئة',
        preview: (
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">اسم المنتج</label>
              <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-3 flex items-center">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">قميص رجالي أنيق</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">الفئة</label>
              <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-3 flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">ملابس رجالية</span>
                <ChevronLeft className="w-4 h-4 text-zinc-400 rotate-90" />
              </div>
            </div>
          </div>
        )
      },
      {
        text: 'الباركود ورمز SKU يُنشآن تلقائياً أو يمكنك إدخالهما يدوياً',
        preview: <BarcodePreview />
      }
    ],
    tips: [
      'الوصف يساعد في ظهور المنتج في نتائج البحث',
      'يمكن تغيير الفئة بعد الإنشاء'
    ]
  },
  {
    id: 'pricing',
    title: 'التسعير والمخزون',
    subtitle: 'إدارة الأسعار والكميات',
    icon: DollarSign,
    color: 'amber',
    steps: [
      {
        text: 'حدد سعر البيع وسعر الشراء، وسيُحسب هامش الربح تلقائياً',
        preview: <PricingPreview />
      },
      {
        text: 'فعّل أسعار الجملة لتقديم خصومات على الكميات الكبيرة',
        preview: <WholesalePricingPreview />
      }
    ],
    tips: [
      'سعر البيع: السعر الذي يدفعه العميل (مطلوب)',
      'سعر الشراء: تكلفة شراء المنتج (لحساب الربح)',
      'السعر الأصلي: لإظهار نسبة التوفير مشطوباً',
      'تحليل الربحية يظهر تلقائياً: هامش الربح، نسبة الربح، حالة المنتج',
      'أسعار الجملة تُطبق تلقائياً في نقطة البيع',
      'يمكن تحديد كمية المخزون وحد التنبيه للمخزون المنخفض'
    ]
  },
  {
    id: 'images',
    title: 'الصور',
    subtitle: 'رفع وإدارة صور المنتج',
    icon: Image,
    color: 'pink',
    steps: [
      {
        text: 'ارفع الصورة الرئيسية والصور الإضافية بالسحب والإفلات',
        preview: <ImageManagerPreview />
      }
    ],
    tips: [
      'الصورة الأولى تكون الصورة الرئيسية',
      'يُفضل استخدام صور بدقة 1000×1000 بكسل',
      'يمكنك إعادة ترتيب الصور بالسحب'
    ]
  },
  {
    id: 'variants',
    title: 'المتغيرات',
    subtitle: 'الألوان والمقاسات',
    icon: Palette,
    color: 'purple',
    steps: [
      {
        text: 'أضف ألواناً ومقاسات مختلفة للمنتج مع صور خاصة لكل لون',
        preview: <VariantsPreview />
      },
      {
        text: 'يمكنك تفعيل أو تعطيل المتغيرات من زر "تفعيل المتغيرات"',
      }
    ],
    tips: [
      'يمكن تحديد مخزون منفصل لكل متغير',
      'أسعار مختلفة لكل متغير متاحة',
      'الألوان تظهر كدوائر ملونة في المتجر',
      'المتغيرات اختيارية - فعّلها فقط إذا كان منتجك يأتي بألوان أو مقاسات مختلفة'
    ]
  },
  {
    id: 'shipping-templates',
    title: 'التوصيل والنماذج',
    subtitle: 'إعدادات التوصيل',
    icon: RefreshCw,
    color: 'green',
    steps: [
      {
        text: 'ربط المنتج بنموذج طلب معين وتحديد خيارات التوصيل',
        preview: <ShippingTemplatesPreview />
      }
    ],
    tips: [
      'يمكنك استخدام نموذج الطلب الافتراضي أو إنشاء نموذج مخصص',
      'تكلفة التوصيل يمكن تحديدها حسب الولاية',
      'خيار التوصيل المجاني متاح للمنتجات المحددة'
    ]
  },
  {
    id: 'selling-types',
    title: 'أنواع البيع المتقدمة',
    subtitle: 'الوزن، الكرتون، المتر',
    icon: Boxes,
    color: 'teal',
    steps: [
      {
        text: 'إعدادات البيع بالوزن والكرتون والمتر والتتبع والضمان',
        preview: <AdvancedSellingTypesPreview />
      }
    ],
    tips: [
      'البيع بالوزن: مثالي للخضروات والفواكه واللحوم',
      'البيع بالكرتون: حدد عدد الوحدات في الكرتون',
      'البيع بالمتر: للأقمشة والحبال وغيرها',
      'الصلاحية: تتبع تواريخ انتهاء الصلاحية',
      'الأرقام التسلسلية: لتتبع كل وحدة على حدة',
      'الضمان: تحديد فترة ضمان المنتج'
    ]
  },
  {
    id: 'general-settings',
    title: 'الإعدادات العامة',
    subtitle: 'العروض والجملة والتسويق',
    icon: Settings,
    color: 'amber',
    steps: [
      {
        text: 'إعدادات العروض الخاصة وأسعار الجملة والتسويق',
        preview: <GeneralSettingsPreview />
      }
    ],
    tips: [
      'العروض الخاصة: قدم خصومات على باقات أو كميات معينة',
      'أسعار الجملة: خصومات تلقائية للكميات الكبيرة',
      'التسويق: أدوات المشاركة الاجتماعية ونقاط الولاء',
      'إعدادات متقدمة: خيارات إضافية للمنتج'
    ]
  },
  {
    id: 'conversion-tracking',
    title: 'تتبع التحويلات',
    subtitle: 'فيسبوك، جوجل، تيك توك',
    icon: BarChart3,
    color: 'indigo',
    steps: [
      {
        text: 'ربط المنتج ببكسلات التتبع لقياس أداء الإعلانات',
        preview: <ConversionTrackingPreview />
      }
    ],
    tips: [
      'Facebook Pixel: تتبع التحويلات من إعلانات فيسبوك',
      'Google Analytics: تتبع الزيارات والتحويلات',
      'TikTok Pixel: تتبع إعلانات تيك توك',
      'يمكنك ربط عدة بكسلات بنفس المنتج'
    ]
  },
  {
    id: 'inventory',
    title: 'المخزون',
    subtitle: 'تتبع الكميات المتاحة',
    icon: Boxes,
    color: 'teal',
    steps: [
      {
        text: 'حدد كمية المخزون الحالية وحد التنبيه للمخزون المنخفض',
        preview: <StockStatusPreview />
      }
    ],
    tips: [
      'المخزون يتحدث تلقائياً عند البيع',
      'تنبيهات المخزون المنخفض تُرسل للمدير',
      'يمكن تعطيل تتبع المخزون للمنتجات الرقمية'
    ]
  },
  {
    id: 'actions',
    title: 'إجراءات المنتج',
    subtitle: 'عرض، تعديل، نسخ، حذف',
    icon: Settings,
    color: 'slate',
    steps: [
      {
        text: 'كل منتج له مجموعة إجراءات سريعة',
        preview: <ProductActionsPreview />
      }
    ],
    tips: [
      'العين: معاينة المنتج كما يراه العميل',
      'القلم: تعديل بيانات المنتج',
      'النسخ: إنشاء نسخة من المنتج',
      'سلة المهملات: حذف المنتج (يتطلب تأكيد)'
    ]
  },
  {
    id: 'pagination',
    title: 'الترقيم والتنقل',
    subtitle: 'التنقل بين الصفحات',
    icon: Layers,
    color: 'indigo',
    steps: [
      {
        text: 'استخدم أزرار الترقيم للتنقل بين صفحات المنتجات',
        preview: <PaginationPreview />
      }
    ],
    tips: [
      'يمكن تغيير عدد المنتجات في الصفحة (6, 12, 24, 48)',
      'الانتقال للصفحة يحافظ على الفلاتر المحددة'
    ]
  },
  {
    id: 'quick-print',
    title: 'الطباعة السريعة',
    subtitle: 'طباعة الباركود والملصقات',
    icon: Printer,
    color: 'cyan',
    steps: [
      {
        text: 'اطبع باركودات، ملصقات الأسعار، أو تقارير المنتجات بضغطة واحدة',
        preview: <QuickPrintPreview />
      },
      {
        text: 'خصص خيارات الطباعة: عدد النسخ، الحجم، وإظهار السعر',
        preview: <BarcodePrintOptionsPreview />
      },
      {
        text: 'اطبع عدة منتجات دفعة واحدة باستخدام الطباعة المجمعة',
        preview: <BatchPrintPreview />
      }
    ],
    tips: [
      'تأكد من توصيل طابعة الباركود قبل الطباعة',
      'يمكنك طباعة باركودات متعددة المنتجات دفعة واحدة',
      'ملصقات الأسعار تشمل الباركود والسعر واسم المنتج',
      'احفظ إعدادات الطباعة المفضلة لاستخدامها لاحقاً',
      'الطباعة متاحة من صفحة المنتج أو القائمة'
    ],
    shortcuts: [
      { key: 'Ctrl+P', action: 'طباعة سريعة للمنتج المحدد' },
      { key: 'Ctrl+Shift+P', action: 'طباعة مجمعة' }
    ]
  },
  {
    id: 'shortcuts',
    title: 'نصائح وحيل',
    subtitle: 'استخدم المنتجات باحترافية',
    icon: Lightbulb,
    color: 'orange',
    steps: [
      {
        text: 'اختصارات ونصائح لتسريع عملك',
      }
    ],
    tips: [
      'استخدم البحث السريع بدلاً من التصفح',
      'حدد الفئة قبل إضافة منتجات جديدة',
      'راجع المخزون المنخفض دورياً',
      'استخدم النسخ لإضافة منتجات متشابهة بسرعة',
      'جدولة النشر مفيدة للعروض الموسمية'
    ],
    shortcuts: [
      { key: 'Ctrl+F', action: 'البحث السريع' },
      { key: 'Ctrl+N', action: 'منتج جديد (إذا متاح)' },
      { key: 'Escape', action: 'إغلاق النوافذ' }
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// تكوين الألوان
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
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' }
};

// ═══════════════════════════════════════════════════════════════════════════
// المكون الرئيسي - تصميم Sidebar مطابق لدليل الفئات
// ═══════════════════════════════════════════════════════════════════════════

interface ProductsUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProductsUserGuide: React.FC<ProductsUserGuideProps> = memo(({ open, onOpenChange }) => {
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
                <DialogTitle className="text-lg font-bold">دليل استخدام المنتجات</DialogTitle>
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
});

ProductsUserGuide.displayName = 'ProductsUserGuide';

export default ProductsUserGuide;

// ═══════════════════════════════════════════════════════════════════════════
// زر المساعدة
// ═══════════════════════════════════════════════════════════════════════════

export const ProductsHelpButton = memo<{ onClick: () => void; className?: string }>(({ onClick, className }) => (
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

ProductsHelpButton.displayName = 'ProductsHelpButton';
