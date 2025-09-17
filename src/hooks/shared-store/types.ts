// أنواع البيانات للمتجر المشترك
export interface SharedStoreData {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  components?: any[];
  footerSettings?: any | null;
  testimonials?: any[];
  seoMeta?: any | null;
  isLoading: boolean;
  error: string | null;
}

// نوع البيانات المرجعة من الـ hook
export interface SharedStoreDataReturn {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  components: any[];
  footerSettings: any | null;
  testimonials: any[];
  seoMeta: any | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

// خيارات Hook البيانات المشتركة
export interface UseSharedStoreDataOptions {
  includeCategories?: boolean;
  includeProducts?: boolean;
  includeFeaturedProducts?: boolean;
  includeComponents?: boolean;
  includeFooterSettings?: boolean;
  includeTestimonials?: boolean;
  includeSeoMeta?: boolean;
  enableOptimisticUpdates?: boolean;
  cacheStrategy?: 'aggressive' | 'conservative';
  enabled?: boolean;
  forceStoreFetch?: boolean;
}

// أنواع البيانات المخزنة في cache
export interface CachedStoreData extends SharedStoreData {
  cacheTimestamp: string;
}

// أنواع إعدادات cache
export interface CacheConfig {
  key: string;
  data: any;
  ttl?: number;
}
