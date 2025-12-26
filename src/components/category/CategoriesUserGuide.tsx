/**
 * 📖 CategoriesUserGuide - دليل استخدام صفحة الفئات
 * ═══════════════════════════════════════════════════════════════════════════
 * دليل تفاعلي شامل لإدارة الفئات والفئات الفرعية
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
  Edit,
  Trash2,
  Filter,
  Grid,
  List,
  Image,
  Tag,
  Layers,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Eye,
  FolderRoot,
  FolderTree,
  FolderPlus,
  FolderCog,
  Settings,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  MoreVertical,
  Upload,
  Clock
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

// معاينة شريط البحث
const SearchBarPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
    <Search className="w-4 h-4 text-zinc-400" />
    <span className="text-sm text-zinc-500">البحث عن فئة...</span>
  </div>
));

// معاينة بطاقة الفئة
const CategoryCardPreview = memo(({ selected = false }: { selected?: boolean }) => (
  <div className={cn(
    "bg-white dark:bg-zinc-800 rounded-xl p-3 border-2 transition-all w-36",
    selected ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-zinc-200 dark:border-zinc-700"
  )}>
    <div className="w-full h-16 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-500/20 dark:to-emerald-600/20 flex items-center justify-center mb-2">
      <FolderRoot className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
    </div>
    <div className="space-y-1">
      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
    </div>
    <div className="flex items-center justify-between mt-2">
      <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
        نشط
      </Badge>
      <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
        منتجات
      </Badge>
    </div>
  </div>
));

// معاينة الفلاتر
const FiltersPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-2">
    <div className="flex items-center gap-2">
      <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
      <span className="text-xs text-zinc-600 dark:text-zinc-300">فلترة متقدمة</span>
      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">2</Badge>
    </div>
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary" className="text-[10px] gap-1">
        الحالة: نشطة
        <X className="w-2.5 h-2.5" />
      </Badge>
      <Badge variant="secondary" className="text-[10px] gap-1">
        النوع: منتجات
        <X className="w-2.5 h-2.5" />
      </Badge>
    </div>
  </div>
));

// معاينة أوضاع العرض
const ViewModePreview = memo(() => (
  <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg p-1">
    <button className="px-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-600 shadow-sm flex items-center gap-1 text-xs">
      <Grid className="w-3.5 h-3.5 text-emerald-500" />
      <span className="text-zinc-700 dark:text-zinc-200">شبكة</span>
    </button>
    <button className="px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 text-zinc-500">
      <List className="w-3.5 h-3.5" />
      <span>جدول</span>
    </button>
  </div>
));

// معاينة زر الإضافة
const AddCategoryButtonPreview = memo(() => (
  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all">
    <Plus className="w-4 h-4" />
    <span>إضافة فئة جديدة</span>
  </button>
));

// معاينة نموذج الفئة
const CategoryFormPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="space-y-1">
      <label className="text-xs text-zinc-500">اسم الفئة*</label>
      <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-3 flex items-center">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">ملابس رجالية</span>
      </div>
    </div>
    <div className="space-y-1">
      <label className="text-xs text-zinc-500">الوصف</label>
      <div className="h-16 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-3 py-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">أدخل وصفاً للفئة...</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">النوع*</label>
        <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-3 flex items-center justify-between">
          <span className="text-xs text-zinc-600 dark:text-zinc-300">منتجات</span>
          <ChevronLeft className="w-3 h-3 text-zinc-400 rotate-90" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">الحالة</label>
        <div className="h-9 bg-zinc-100 dark:bg-zinc-700 rounded-lg px-3 flex items-center justify-between">
          <span className="text-xs text-emerald-600">نشط</span>
          <div className="w-8 h-5 bg-emerald-500 rounded-full relative">
            <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  </div>
));

// معاينة أيقونة الفئة
const IconSelectorPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <label className="text-xs text-zinc-500 block mb-2">أيقونة الفئة</label>
    <div className="grid grid-cols-6 gap-1.5">
      {[FolderRoot, Tag, Settings, FolderTree, Grid, Layers].map((Icon, i) => (
        <button
          key={i}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            i === 0
              ? "bg-emerald-500 text-white"
              : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
          )}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  </div>
));

// معاينة رفع الصورة
const ImageUploadPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <label className="text-xs text-zinc-500 block mb-2">صورة الفئة</label>
    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-4 flex flex-col items-center gap-2">
      <Upload className="w-6 h-6 text-zinc-400" />
      <span className="text-xs text-zinc-500">اسحب الصورة أو اضغط للرفع</span>
    </div>
  </div>
));

// معاينة حالة الفئة
const CategoryStatusPreview = memo(() => (
  <div className="flex gap-2">
    <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-xs">
      نشط
    </Badge>
    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400 text-xs">
      غير نشط
    </Badge>
  </div>
));

// معاينة نوع الفئة
const CategoryTypePreview = memo(() => (
  <div className="flex gap-2">
    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-xs border border-blue-200">
      فئة منتجات
    </Badge>
    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 text-xs border border-purple-200">
      فئة خدمات
    </Badge>
  </div>
));

// معاينة إجراءات الفئة
const CategoryActionsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">إجراءات الفئة</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs hover:bg-zinc-200 transition-colors">
        <Eye className="w-3.5 h-3.5" />
        عرض
      </button>
      <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs hover:bg-zinc-200 transition-colors">
        <Edit className="w-3.5 h-3.5" />
        تعديل
      </button>
      <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs hover:bg-zinc-200 transition-colors">
        <FolderCog className="w-3.5 h-3.5" />
        تعطيل
      </button>
      <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs hover:bg-red-200 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
        حذف
      </button>
    </div>
  </div>
));

// معاينة تفاصيل الفئة
const CategoryDetailsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
        <FolderRoot className="w-6 h-6 text-emerald-600" />
      </div>
      <div>
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ملابس رجالية</h4>
        <Badge className="bg-green-100 text-green-700 text-[10px] mt-1">نشط</Badge>
      </div>
    </div>
    <div className="space-y-2 text-xs">
      <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-700">
        <span className="text-zinc-500">الرابط:</span>
        <code className="text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-1.5 rounded">mens-clothing</code>
      </div>
      <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-700">
        <span className="text-zinc-500">تاريخ الإنشاء:</span>
        <span className="text-zinc-600 dark:text-zinc-400">Dec 10, 2024</span>
      </div>
    </div>
  </div>
));

// معاينة الفئات الفرعية
const SubcategoriesPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">الفئات الفرعية</span>
      </div>
      <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 text-xs">
        <Plus className="w-3 h-3" />
        إضافة
      </button>
    </div>
    <div className="space-y-1.5">
      {['قمصان', 'بناطيل', 'أحذية'].map((name, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-600 dark:text-zinc-300">{name}</span>
          </div>
          <button className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600">
            <MoreVertical className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
      ))}
    </div>
  </div>
));

// معاينة وضع أوفلاين
const OfflineModePreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">حالة الاتصال</span>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
        <Wifi className="w-4 h-4 text-green-600" />
        <span className="text-xs text-green-700 dark:text-green-400">متصل - المزامنة نشطة</span>
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30">
        <WifiOff className="w-4 h-4 text-orange-600" />
        <span className="text-xs text-orange-700 dark:text-orange-400">أوفلاين - حفظ محلي</span>
      </div>
    </div>
  </div>
));

// معاينة الترتيب
const SortOptionsPreview = memo(() => (
  <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <label className="text-xs text-zinc-500 block mb-2">ترتيب حسب</label>
    <div className="space-y-1">
      {[
        { label: 'الاسم: أ-ي', active: true },
        { label: 'الاسم: ي-أ', active: false },
        { label: 'الأحدث', active: false },
        { label: 'الأقدم', active: false },
      ].map((opt, i) => (
        <div
          key={i}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors",
            opt.active
              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          )}
        >
          {opt.label}
        </div>
      ))}
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
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' }
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
    subtitle: 'تعرف على صفحة الفئات',
    icon: FolderRoot,
    color: 'emerald',
    steps: [
      {
        text: 'صفحة الفئات تعرض جميع فئاتك بشكل منظم مع إمكانية البحث والتصفية',
        preview: (
          <div className="flex gap-2">
            <CategoryCardPreview />
            <CategoryCardPreview selected />
          </div>
        )
      },
      {
        text: 'يمكنك التبديل بين عرض الشبكة والجدول حسب تفضيلك',
        preview: <ViewModePreview />
      }
    ],
    tips: [
      'الصفحة تدعم العمل أوفلاين مع PowerSync',
      'البيانات تتحدث تلقائياً عند الاتصال بالإنترنت',
      'يتم حفظ تفضيلات العرض تلقائياً'
    ]
  },
  {
    id: 'search',
    title: 'البحث عن الفئات',
    subtitle: 'ابحث وصفّي بسرعة',
    icon: Search,
    color: 'blue',
    steps: [
      {
        text: 'استخدم شريط البحث للبحث بالاسم أو الوصف',
        preview: <SearchBarPreview />
      },
      {
        text: 'استخدم الفلاتر المتقدمة لتصفية الفئات حسب الحالة والنوع',
        preview: <FiltersPreview />
      }
    ],
    tips: [
      'البحث يعمل فورياً أثناء الكتابة',
      'يمكنك مسح البحث بضغطة زر واحدة',
      'الفلاتر النشطة تظهر كشارات يمكن إزالتها'
    ]
  },
  {
    id: 'filters',
    title: 'التصفية والترتيب',
    subtitle: 'تنظيم الفئات بسهولة',
    icon: Filter,
    color: 'violet',
    steps: [
      {
        text: 'صفّي حسب الحالة: جميع الفئات، نشطة، أو غير نشطة',
        preview: <CategoryStatusPreview />
      },
      {
        text: 'صفّي حسب النوع: فئات منتجات أو فئات خدمات',
        preview: <CategoryTypePreview />
      },
      {
        text: 'رتّب الفئات حسب الاسم أو التاريخ',
        preview: <SortOptionsPreview />
      }
    ],
    tips: [
      'اختر "جميع الفئات" لعرض كل الفئات',
      'يمكن تطبيق أكثر من فلتر في نفس الوقت',
      'عدد الفلاتر النشطة يظهر على زر الفلترة'
    ]
  },
  {
    id: 'add-category',
    title: 'إضافة فئة جديدة',
    subtitle: 'أنشئ فئة بخطوات بسيطة',
    icon: Plus,
    color: 'green',
    steps: [
      {
        text: 'اضغط على زر "إضافة فئة جديدة" لفتح نموذج الإضافة',
        preview: <AddCategoryButtonPreview />
      },
      {
        text: 'أدخل اسم الفئة والوصف والنوع',
        preview: <CategoryFormPreview />
      },
      {
        text: 'اختر أيقونة للفئة من مكتبة الأيقونات',
        preview: <IconSelectorPreview />
      },
      {
        text: 'ارفع صورة للفئة (اختياري)',
        preview: <ImageUploadPreview />
      }
    ],
    tips: [
      'اسم الفئة مطلوب ويجب أن يكون فريداً',
      'الرابط (slug) يُنشأ تلقائياً من اسم الفئة',
      'يمكنك تغيير حالة الفئة (نشط/غير نشط) من النموذج',
      'تحتاج صلاحية manageProductCategories لإضافة الفئات'
    ]
  },
  {
    id: 'category-types',
    title: 'أنواع الفئات',
    subtitle: 'فئات المنتجات والخدمات',
    icon: Tag,
    color: 'sky',
    steps: [
      {
        text: 'اختر نوع الفئة: منتجات أو خدمات',
        preview: <CategoryTypePreview />
      }
    ],
    tips: [
      'فئات المنتجات: للسلع المادية والرقمية',
      'فئات الخدمات: للخدمات التي تقدمها',
      'النوع يساعد في تنظيم وتصنيف عروضك',
      'يمكن تغيير النوع بعد إنشاء الفئة'
    ]
  },
  {
    id: 'category-details',
    title: 'تفاصيل الفئة',
    subtitle: 'عرض معلومات الفئة',
    icon: Eye,
    color: 'amber',
    steps: [
      {
        text: 'اضغط على "عرض" لمشاهدة تفاصيل الفئة الكاملة',
        preview: <CategoryDetailsPreview />
      }
    ],
    tips: [
      'التفاصيل تشمل: الاسم، الوصف، الرابط، التاريخ',
      'يمكنك التعديل مباشرة من صفحة التفاصيل',
      'تبويب الفئات الفرعية متاح من صفحة التفاصيل'
    ]
  },
  {
    id: 'subcategories',
    title: 'الفئات الفرعية',
    subtitle: 'تنظيم هرمي للفئات',
    icon: FolderTree,
    color: 'purple',
    steps: [
      {
        text: 'أضف فئات فرعية لكل فئة رئيسية لتنظيم أفضل',
        preview: <SubcategoriesPreview />
      }
    ],
    tips: [
      'الفئات الفرعية تساعد في تصنيف المنتجات بدقة',
      'يمكنك إضافة عدد غير محدود من الفئات الفرعية',
      'لا يمكن حذف فئة رئيسية تحتوي على فئات فرعية',
      'كل فئة فرعية لها اسم ووصف ورابط خاص بها'
    ],
    shortcuts: [
      { key: 'Tab التفاصيل', action: 'عرض الفئات الفرعية' },
    ]
  },
  {
    id: 'actions',
    title: 'إجراءات الفئة',
    subtitle: 'عرض، تعديل، تفعيل، حذف',
    icon: Settings,
    color: 'slate',
    steps: [
      {
        text: 'كل فئة لها مجموعة إجراءات سريعة',
        preview: <CategoryActionsPreview />
      }
    ],
    tips: [
      'عرض: مشاهدة تفاصيل الفئة والفئات الفرعية',
      'تعديل: تغيير بيانات الفئة',
      'تفعيل/تعطيل: تغيير حالة الفئة',
      'حذف: إزالة الفئة نهائياً (يتطلب تأكيد)'
    ]
  },
  {
    id: 'offline',
    title: 'العمل أوفلاين',
    subtitle: 'دعم العمل بدون إنترنت',
    icon: WifiOff,
    color: 'orange',
    steps: [
      {
        text: 'يمكنك إضافة وتعديل الفئات حتى بدون اتصال بالإنترنت',
        preview: <OfflineModePreview />
      }
    ],
    tips: [
      'البيانات تُحفظ محلياً عند انقطاع الاتصال',
      'المزامنة تحدث تلقائياً عند عودة الاتصال',
      'الصور تُحفظ محلياً وتُرفع لاحقاً',
      'مؤشر حالة الاتصال يظهر في النموذج'
    ]
  },
  {
    id: 'tips',
    title: 'نصائح وحيل',
    subtitle: 'استخدم الفئات باحترافية',
    icon: Lightbulb,
    color: 'cyan',
    steps: [
      {
        text: 'نصائح لإدارة الفئات بكفاءة',
      }
    ],
    tips: [
      'استخدم أسماء واضحة ووصفية للفئات',
      'أضف صوراً جذابة لتحسين تجربة العملاء',
      'نظّم المنتجات في فئات فرعية للوصول السريع',
      'راجع الفئات غير النشطة بشكل دوري',
      'استخدم الأيقونات لتمييز الفئات بصرياً',
      'حافظ على هيكل فئات بسيط وسهل الفهم'
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface CategoriesUserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategoriesUserGuide: React.FC<CategoriesUserGuideProps> = ({ open, onOpenChange }) => {
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
                <DialogTitle className="text-lg font-bold">دليل استخدام الفئات</DialogTitle>
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

export default CategoriesUserGuide;
