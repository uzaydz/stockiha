/**
 * ProductDataTypes - أنواع وواجهات بيانات المنتج
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

/**
 * البيانات الموحدة لصفحة المنتج
 */
export interface UnifiedProductPageData {
  product: any;
  organization: any;
  organizationSettings: any;
  visitorAnalytics: any;
  categories: any[];
  provinces: any[];
  trackingData: any;
}

/**
 * خصائص Hook البيانات الموحدة
 */
export interface UseUnifiedProductPageDataProps {
  productId?: string;
  organizationId?: string;
  enabled?: boolean;
  dataScope?: 'basic' | 'ultra' | 'full';
  // بيانات أولية جاهزة للحقن (من DOM/worker) لتسريع الظهور الأول
  initialData?: UnifiedProductPageData;
  initialDataUpdatedAt?: number;
}

/**
 * عنصر Cache
 */
export interface ProductCacheItem {
  data: UnifiedProductPageData;
  timestamp: number;
}

/**
 * مفتاح Cache
 */
export type ProductCacheKey = string;

/**
 * حالة الطلب
 */
export interface ProductRequestState {
  isLoading: boolean;
  error: Error | null;
  data: UnifiedProductPageData | null;
}

/**
 * خيارات جلب البيانات
 */
export interface ProductFetchOptions {
  organizationId?: string;
  dataScope?: 'basic' | 'ultra' | 'full';
  forceRefresh?: boolean;
}

/**
 * استجابة API المنتج
 */
export interface ProductApiResponse {
  success: boolean;
  data?: {
    product: any;
    stats?: any;
  };
  product?: any; // للتوافق مع الإصدارات القديمة
  stats?: any;   // للتوافق مع الإصدارات القديمة
  error?: string;
}

/**
 * إحصائيات المنتج
 */
export interface ProductStats {
  views: number;
  likes: number;
  shares: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * إعدادات المؤسسة
 */
export interface OrganizationSettings {
  theme: string;
  language: string;
  currency: string;
  timezone: string;
  features: Record<string, boolean>;
}

/**
 * تحليلات الزوار
 */
export interface VisitorAnalytics {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  averageTimeOnPage: number;
  bounceRate: number;
}
