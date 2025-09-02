import { LucideIcon } from 'lucide-react';

// الواجهة الأساسية للفئة
export interface ExtendedCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
  imageUrl: string;
  icon?: string;
  color?: string;
  priority?: boolean; // لترتيب أولوية التحميل
  isNew?: boolean; // لعرض علامة "جديد"
  productCount?: number; // عدد المنتجات في الفئة
}

// إعدادات عرض الفئات
export interface CategorySettings {
  selectionMethod?: 'automatic' | 'manual' | 'popular' | 'newest';
  selectedCategories?: string[];
  displayCount?: number;
  maxCategories?: number;
  showDescription?: boolean;
  showImages?: boolean;
  displayStyle?: 'cards' | 'grid' | 'list' | 'masonry';
  backgroundStyle?: 'light' | 'dark' | 'gradient' | 'transparent';
  showViewAllButton?: boolean;
  enableLazyLoading?: boolean; // تفعيل التحميل التدريجي
  enableVirtualization?: boolean; // تفعيل المحاكاة الافتراضية للقوائم الطويلة
  imageQuality?: 'low' | 'medium' | 'high' | 'auto'; // جودة الصور
  animationSpeed?: 'slow' | 'normal' | 'fast' | 'none'; // سرعة الانيميشن
  useRealCategories?: boolean; // لاستخدام الفئات الحقيقية أم التجريبية
  _previewCategories?: string[] | ExtendedCategory[];
}

// خصائص مكون CategoryCard
export interface CategoryCardProps {
  category: ExtendedCategory;
  activeCategoryId?: string | null;
  useRealCategories?: boolean;
  showImages?: boolean;
  showDescription?: boolean;
  priority?: boolean;
  lazy?: boolean; // للتحميل التدريجي
  onLoad?: () => void; // callback عند التحميل
  onError?: (error: Error) => void; // callback عند الخطأ
}

// خصائص مكون CategoryGrid
export interface CategoryGridProps {
  categories: ExtendedCategory[];
  activeCategoryId?: string | null;
  useRealCategories?: boolean;
  showImages?: boolean;
  showDescription?: boolean;
  enableVirtualization?: boolean;
  itemsPerRow?: number; // عدد العناصر في الصف
  gap?: 'small' | 'medium' | 'large'; // المسافة بين العناصر
}

// خصائص مكون CategoryHeader
export interface CategoryHeaderProps {
  title?: string;
  description?: string;
  showDemoMessage?: boolean;
  animated?: boolean; // تفعيل الانيميشن
  centered?: boolean; // محاذاة وسط
}

// خصائص الصورة المحسّنة
export interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackColor?: string;
  priority?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  lazy?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  placeholder?: 'blur' | 'skeleton' | 'color';
  aspectRatio?: string; // مثل "16/9" أو "1/1"
}

// حالة التحميل
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  progress?: number; // نسبة التقدم (0-100)
}

// إعدادات الأداء
export interface PerformanceSettings {
  enableImagePreloading?: boolean;
  maxConcurrentImages?: number;
  cacheSize?: number;
  enableIntersectionObserver?: boolean;
  throttleDelay?: number; // تأخير throttling بالميلي ثانية
  debounceDelay?: number; // تأخير debouncing بالميلي ثانية
}

// خصائص hook البيانات
export interface UseCategoryDataProps {
  propCategories: ExtendedCategory[];
  useRealCategories?: boolean;
  settings: CategorySettings;
  performanceSettings?: PerformanceSettings;
}

// نتيجة hook البيانات
export interface UseCategoryDataResult {
  displayedCategories: ExtendedCategory[];
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  showDemoMessage: boolean;
  loadMore?: () => void; // لتحميل المزيد
  hasMore?: boolean; // هل يوجد المزيد
  refresh?: () => void; // إعادة تحميل
  _debug?: {
    performanceStats: any;
    loadingProgress: number;
    currentPage: number;
    totalCategories: number;
  };
}

// أنواع الأيقونات
export type IconType = LucideIcon | string;

// أنواع الانيميشن
export type AnimationType = 'fade' | 'slide' | 'scale' | 'bounce' | 'none';

// أنواع الاتجاه
export type DirectionType = 'ltr' | 'rtl';

// أنواع الحجم
export type SizeType = 'small' | 'medium' | 'large' | 'xlarge';

// أنواع الوضع
export type ThemeType = 'light' | 'dark' | 'auto';
