/**
 * ==========================================
 * 🎨 تكوينات نظام اقتراحات الميزات
 * ==========================================
 * تحتوي على جميع التكوينات الخاصة بالفئات، الحالات، والأولويات
 */

import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Box,
  Settings,
  MoreHorizontal,
  Clock,
  Eye,
  Lightbulb,
  Code,
  CheckCircle,
  XCircle,
  Copy,
  AlertCircle,
  TrendingUp,
  Flag
} from 'lucide-react';
import type {
  CategoryConfig,
  StatusConfig,
  PriorityConfig,
  SuggestionCategory,
  SuggestionStatus,
  SuggestionPriority
} from '@/types/feature-suggestions';

/**
 * ==========================================
 * 🎨 تكوينات الفئات
 * ==========================================
 */
export const CATEGORIES: Record<SuggestionCategory, CategoryConfig> = {
  pos: {
    id: 'pos',
    label: 'نقطة البيع',
    icon: 'ShoppingCart',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'اقتراحات متعلقة بنظام نقطة البيع'
  },
  inventory: {
    id: 'inventory',
    label: 'المخزون',
    icon: 'Package',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'اقتراحات متعلقة بإدارة المخزون'
  },
  analytics: {
    id: 'analytics',
    label: 'التحليلات',
    icon: 'BarChart3',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'اقتراحات متعلقة بالتقارير والتحليلات'
  },
  customers: {
    id: 'customers',
    label: 'العملاء',
    icon: 'Users',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'اقتراحات متعلقة بإدارة العملاء'
  },
  products: {
    id: 'products',
    label: 'المنتجات',
    icon: 'Box',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: 'اقتراحات متعلقة بالمنتجات'
  },
  settings: {
    id: 'settings',
    label: 'الإعدادات',
    icon: 'Settings',
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    description: 'اقتراحات متعلقة بالإعدادات العامة'
  },
  other: {
    id: 'other',
    label: 'أخرى',
    icon: 'MoreHorizontal',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    description: 'اقتراحات أخرى'
  }
};

/**
 * ==========================================
 * 🎨 تكوينات الحالات
 * ==========================================
 */
export const STATUSES: Record<SuggestionStatus, StatusConfig> = {
  pending: {
    id: 'pending',
    label: 'قيد الانتظار',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    icon: 'Clock',
    description: 'الاقتراح قيد الانتظار ولم تتم مراجعته بعد'
  },
  under_review: {
    id: 'under_review',
    label: 'قيد المراجعة',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: 'Eye',
    description: 'الاقتراح قيد المراجعة من قبل الفريق'
  },
  planned: {
    id: 'planned',
    label: 'مخطط لها',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: 'Lightbulb',
    description: 'الاقتراح مخطط للتنفيذ في المستقبل'
  },
  in_progress: {
    id: 'in_progress',
    label: 'قيد التنفيذ',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    icon: 'Code',
    description: 'الاقتراح قيد التنفيذ حالياً'
  },
  completed: {
    id: 'completed',
    label: 'مكتملة',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: 'CheckCircle',
    description: 'تم تنفيذ الاقتراح بنجاح'
  },
  rejected: {
    id: 'rejected',
    label: 'مرفوضة',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    icon: 'XCircle',
    description: 'تم رفض الاقتراح'
  },
  duplicate: {
    id: 'duplicate',
    label: 'مكررة',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: 'Copy',
    description: 'الاقتراح مكرر ويوجد اقتراح مشابه'
  }
};

/**
 * ==========================================
 * 🎨 تكوينات الأولويات
 * ==========================================
 */
export const PRIORITIES: Record<SuggestionPriority, PriorityConfig> = {
  low: {
    id: 'low',
    label: 'منخفضة',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    icon: 'Flag'
  },
  medium: {
    id: 'medium',
    label: 'متوسطة',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: 'TrendingUp'
  },
  high: {
    id: 'high',
    label: 'عالية',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: 'AlertCircle'
  },
  urgent: {
    id: 'urgent',
    label: 'عاجلة',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    icon: 'AlertCircle'
  }
};

/**
 * ==========================================
 * 🔧 دوال المساعدة
 * ==========================================
 */

/**
 * الحصول على تكوين فئة معينة
 */
export function getCategoryConfig(category: SuggestionCategory): CategoryConfig {
  return CATEGORIES[category] || CATEGORIES.other;
}

/**
 * الحصول على تكوين حالة معينة
 */
export function getStatusConfig(status: SuggestionStatus): StatusConfig {
  return STATUSES[status] || STATUSES.pending;
}

/**
 * الحصول على تكوين أولوية معينة
 */
export function getPriorityConfig(priority: SuggestionPriority): PriorityConfig {
  return PRIORITIES[priority] || PRIORITIES.medium;
}

/**
 * الحصول على جميع الفئات كمصفوفة
 */
export function getAllCategories(): CategoryConfig[] {
  return Object.values(CATEGORIES);
}

/**
 * الحصول على جميع الحالات كمصفوفة
 */
export function getAllStatuses(): StatusConfig[] {
  return Object.values(STATUSES);
}

/**
 * الحصول على جميع الأولويات كمصفوفة
 */
export function getAllPriorities(): PriorityConfig[] {
  return Object.values(PRIORITIES);
}

/**
 * الحصول على الحالات النشطة فقط (غير مكتملة أو مرفوضة)
 */
export function getActiveStatuses(): StatusConfig[] {
  return Object.values(STATUSES).filter(
    s => !['completed', 'rejected', 'duplicate'].includes(s.id)
  );
}

/**
 * ==========================================
 * 📊 إحصائيات افتراضية
 * ==========================================
 */
export const DEFAULT_STATS = {
  total: 0,
  pending: 0,
  under_review: 0,
  planned: 0,
  in_progress: 0,
  completed: 0,
  rejected: 0,
  total_votes: 0,
  total_comments: 0,
  top_category: null,
  trending: []
};

/**
 * ==========================================
 * 🎨 ألوان العلامة (Badge) حسب الحالة
 * ==========================================
 */
export function getStatusBadgeClasses(status: SuggestionStatus): string {
  const config = getStatusConfig(status);
  return `${config.color} ${config.bgColor} border border-current/20`;
}

/**
 * ==========================================
 * 🔤 نصوص المساعدة
 * ==========================================
 */
export const HELP_TEXT = {
  title: 'عنوان واضح ومختصر للاقتراح (5-200 حرف)',
  description: 'وصف تفصيلي للاقتراح وفوائده (10 أحرف على الأقل)',
  category: 'اختر الفئة المناسبة للاقتراح',
  priority: 'مدى أهمية وإلحاح هذا الاقتراح',
  image: 'صورة توضيحية (اختياري)'
};
