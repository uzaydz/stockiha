import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import { useTenant } from '@/context/TenantContext';
import { getStoreProductsPage } from '@/lib/api/store-products';
import { updateLanguageFromSettings } from '@/lib/language/languageManager';

// أنواع البيانات المطلوبة لصفحة المنتجات فقط
interface ProductsPageProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  thumbnail_image?: string;
  images?: string[];
  stock_quantity: number;
  is_featured?: boolean;
  is_new?: boolean;
  category_id?: string;
  slug?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ProductsPageCategory {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  product_count?: number;
  is_active: boolean;
}

interface ProductsPageSubcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface ProductsPageContextType {
  // البيانات الأساسية فقط
  products: ProductsPageProduct[];
  categories: ProductsPageCategory[];
  subcategories: ProductsPageSubcategory[];
  isLoading: boolean;
  error: string | null;
  
  // الفلترة والبحث
  filteredProducts: ProductsPageProduct[];
  searchTerm: string;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  priceRange: { min: number; max: number };
  meta: { total_count: number; total_pages: number; current_page: number; page_size: number } | null;
  currentPage: number;
  pageSize: number;
  sortOption: 'newest' | 'name-asc' | 'name-desc' | 'price-low' | 'price-high';
  
  // دوال محدودة
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setSelectedSubcategory: (subcategoryId: string | null) => void;
  setPriceRange: (range: { min: number; max: number }) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSortOption: (sort: 'newest' | 'name-asc' | 'name-desc' | 'price-low' | 'price-high') => void;
  refreshData: () => void;
}

const ProductsPageContext = createContext<ProductsPageContextType | undefined>(undefined);

// مزود السياق المحسن لصفحة المنتجات
export const ProductsPageProvider: React.FC<{ 
  children: ReactNode;
  organizationId?: string;
}> = ({ children, organizationId: propOrganizationId }) => {
  const contextStartTime = useRef(performance.now());
  
  console.log('📦 [PRODUCTS-CONTEXT] تهيئة مزود سياق المنتجات', {
    organizationId: propOrganizationId,
    startTime: contextStartTime.current,
    url: window.location.href
  });
  
  // استخدام البيانات المشتركة أولاً - تفعيل جلب المنتجات الكاملة
  const { products: sharedProducts, categories, isLoading: sharedLoading, error: sharedError, refreshData } = useSharedStoreData({
    includeProducts: true, // ✅ تفعيل جلب المنتجات الكاملة من البداية
    includeFeaturedProducts: true,
    includeCategories: true,
    enabled: true,
    forceStoreFetch: true, // ✅ إجبار الجلب حتى على النطاقات العامة عندما نكون في صفحة المتجر
    // إعطاء الأولوية للبيانات المحملة مسبقاً
    staleTime: 5 * 60 * 1000, // 5 دقائق
    cacheTime: 10 * 60 * 1000, // 10 دقائق
  } as any);
  const { currentOrganization } = useTenant();

  // جلب إضافي فقط إذا لم تكن البيانات متوفرة من useSharedStoreData
  const [fullProducts, setFullProducts] = useState<ProductsPageProduct[]>([]);
  const [rpcCategories, setRpcCategories] = useState<ProductsPageCategory[]>([]);
  const [rpcSubcategories, setRpcSubcategories] = useState<ProductsPageSubcategory[]>([]);
  const [fullLoading, setFullLoading] = useState<boolean>(false);
  const [fullError, setFullError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total_count: number; total_pages: number; current_page: number; page_size: number } | null>(null);

  // تتبع ديناميكي لمعرف المؤسسة: من props، context، أو localStorage أو حدث system
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(
    propOrganizationId || currentOrganization?.id || (typeof window !== 'undefined' ? localStorage.getItem('bazaar_organization_id') : null) || null
  );

  // استمع لتحديثات المؤسسة القادمة من useSharedStoreData (organizationDataUpdated)
  useEffect(() => {
    const handleOrgUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { organization?: { id?: string } } | undefined;
      const newId = detail?.organization?.id;
      if (newId && newId !== resolvedOrgId) {
        setResolvedOrgId(newId);
      }
    };
    window.addEventListener('organizationDataUpdated' as any, handleOrgUpdate);
    return () => window.removeEventListener('organizationDataUpdated' as any, handleOrgUpdate);
  }, [resolvedOrgId]);

  // حدّث المعرف عندما يتوفر من السياق أو من props
  useEffect(() => {
    const idFromContext = propOrganizationId || currentOrganization?.id;
    if (idFromContext && idFromContext !== resolvedOrgId) {
      setResolvedOrgId(idFromContext);
    }
  }, [propOrganizationId, currentOrganization?.id, resolvedOrgId]);

  // تتبع حالة الجلب لمنع التكرار - استخدام ref للحماية من StrictMode
  const hasInitializedRef = React.useRef(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const fetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultCacheRef = React.useRef<Map<string, { ts: number; data: any }>>(new Map());
  const CACHE_TTL_MS = 60 * 1000; // 60s

  // تهيئة أولية سريعة: استخدم بيانات useSharedStoreData إن كانت متاحة لتجنّب الفراغ الأولي
  useEffect(() => {
    try {
      if (hasInitializedRef.current) return;
      // لا فلاتر مفعلة؟
      const noFilters = !searchTerm && !selectedCategory && !selectedSubcategory && priceRange.min === 0;
      if (!noFilters) return;
      if (fullProducts && fullProducts.length > 0) return;
      if (!sharedProducts || sharedProducts.length === 0) return;

      const converted = (sharedProducts as any[]).map((p: any) => ({
        id: p.id,
        name: p.name || '',
        description: p.description || '',
        price: Number(p.price || 0),
        compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : undefined,
        thumbnail_image: p.thumbnail_image || p.thumbnail_url || '',
        images: Array.isArray(p.images) ? p.images : [],
        stock_quantity: Number(p.stock_quantity || 0),
        is_featured: !!p.is_featured,
        is_new: !!p.is_new,
        category_id: p.category_id,
        slug: p.slug || p.id,
        category: p.product_categories ? { id: p.category_id, name: p.product_categories?.[0]?.name || '', slug: p.product_categories?.[0]?.slug || '' } : undefined
      })) as ProductsPageProduct[];

      if (converted.length > 0) {
        setFullProducts(converted);
        // تعليم كمهيأ لتجنّب الجلب الفوري التالي
        hasInitializedRef.current = true;
        setHasInitialized(true);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedProducts]);

  // إعداد حالة الفلاتر والصفحة والترتيب للجلب من الخادم مباشرة
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useSearchDebounce(searchTerm, 350);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [sortOption, setSortOption] = useState<'newest' | 'name-asc' | 'name-desc' | 'price-low' | 'price-high'>('newest');

  // جلب المنتجات من الخادم بحسب الفلاتر/الترتيب/الصفحة مع منع التكرار
  useEffect(() => {
    const orgId = resolvedOrgId;
    if (!orgId) {
      console.log('⏳ [PRODUCTS-CONTEXT] في انتظار معرف المؤسسة');
      return;
    }

    console.log('🔄 [PRODUCTS-CONTEXT] بدء جلب المنتجات مع الفلاتر', {
      orgId,
      debouncedSearch,
      selectedCategory,
      selectedSubcategory,
      currentPage,
      pageSize,
      sortOption
    });

    // إلغاء أي مؤقت/طلب سابق
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // تأجيل الجلب قليلاً لتجميع تغييرات الفلتر وتقليل الضغط على القاعدة
    fetchTimeoutRef.current = setTimeout(async () => {
      // إذا كانت التهيئة تمت من بيانات مشتركة ولا توجد فلاتر، تخطَّ أول جلب لتجنّب التبديل المرئي
      const noFilters = !debouncedSearch && !selectedCategory && !selectedSubcategory && priceRange.min === 0 && priceRange.max === 1000000 && currentPage === 1;
      if (hasInitializedRef.current && noFilters) {
        setFullLoading(false);
        return;
      }
      setFullLoading(true);
      setFullError(null);

      abortControllerRef.current = new AbortController();
      try {
        // تحديد المعرّف للنطاقات المخصصة أو subdomain
        let orgIdentifier = orgId;
        try {
          const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
          const isLocal = hostname.includes('localhost') || hostname.startsWith('127.');
          if (!isLocal && hostname) {
            if (hostname.includes('stockiha.com')) {
              const parts = hostname.split('.');
              if (parts.length >= 3) orgIdentifier = parts[0];
            } else {
              orgIdentifier = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
            }
          }
        } catch {}

        const sortMap: Record<string, 'newest' | 'name_asc' | 'name_desc' | 'price_low' | 'price_high'> = {
          'newest': 'newest',
          'name-asc': 'name_asc',
          'name-desc': 'name_desc',
          'price-low': 'price_low',
          'price-high': 'price_high'
        };

        const options = {
          page: currentPage,
          pageSize,
          includeInactive: false,
          search: debouncedSearch || null,
          categoryId: selectedCategory || null,
          subcategoryId: selectedSubcategory || null,
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          sort: sortMap[sortOption]
        } as const;

        const cacheKey = JSON.stringify({ orgIdentifier, ...options });
        const cached = resultCacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          const pageData = cached.data;
          const result = pageData?.products || [];
          setFullProducts(result as any);
          if (Array.isArray(pageData?.categories)) setRpcCategories(pageData.categories as any);
          if (Array.isArray(pageData?.subcategories)) setRpcSubcategories(pageData.subcategories as any);
          setMeta(pageData?.meta || null);
          setFullError(null);
          setFullLoading(false);
          return;
        }

        const pageData = await getStoreProductsPage(orgIdentifier, options as any);

        const result = pageData?.products || [];

        if (!abortControllerRef.current?.signal.aborted) {
          setFullProducts(result as any);
          if (Array.isArray(pageData?.categories)) setRpcCategories(pageData.categories as any);
          if (Array.isArray(pageData?.subcategories)) setRpcSubcategories(pageData.subcategories as any);
          setMeta(pageData?.meta || null);
          setFullError(null);
          // حفظ في الكاش
          resultCacheRef.current.set(cacheKey, { ts: Date.now(), data: pageData });

          // تطبيق اللغة من إعدادات المتجر (مرة واحدة)
          try {
            if (!hasInitializedRef.current) {
              const lang = (window as any).__SHARED_STORE_ORG_SETTINGS__?.default_language;
              if (lang && ['ar', 'en', 'fr'].includes(lang)) updateLanguageFromSettings(lang);
              hasInitializedRef.current = true;
              setHasInitialized(true);
            }
          } catch {}
        }
      } catch (error: any) {
        if (!abortControllerRef.current?.signal.aborted) {
          setFullError(error?.message || 'خطأ في تحميل المنتجات');
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setFullLoading(false);
        }
      }
    }, 250);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [resolvedOrgId, debouncedSearch, selectedCategory, selectedSubcategory, priceRange.min, priceRange.max, currentPage, pageSize, sortOption]);

  // حساب المنتجات المفلترة
  const filteredProducts = React.useMemo(() => {
    // النتائج الآن مصفاة بالكامل من الخادم
    return fullProducts || [];
  }, [fullProducts]);

  // دالة إعادة تحميل البيانات
  const handleRefreshData = () => {
    hasInitializedRef.current = false;
    setHasInitialized(false);
    setFullProducts([]);
    setFullLoading(false);
    setFullError(null);
    refreshData(); // استدعاء دالة إعادة التحميل من useSharedStoreData
  };


  const contextValue: ProductsPageContextType = {
    products: fullProducts || [],
    categories: (rpcCategories && rpcCategories.length > 0) ? rpcCategories : (categories || []),
    subcategories: rpcSubcategories || [],
    // التحميل فقط أثناء الجلب الفعلي
    isLoading: fullLoading,
    error: fullError || sharedError,
    filteredProducts,
    searchTerm,
    selectedCategory,
    selectedSubcategory,
    priceRange,
    meta,
    currentPage,
    pageSize,
    sortOption,
    setSearchTerm,
    setSelectedCategory,
    setSelectedSubcategory,
    setPriceRange,
    setCurrentPage,
    setPageSize,
    setSortOption,
    refreshData: handleRefreshData,
  };

  return (
    <ProductsPageContext.Provider value={contextValue}>
      {children}
    </ProductsPageContext.Provider>
  );
};

// Hook للاستخدام
export const useProductsPage = (): ProductsPageContextType => {
  const context = useContext(ProductsPageContext);
  
  if (context === undefined) {
    console.warn('⚠️ [ProductsPageContext] useProductsPage used outside ProductsPageProvider, using fallback');
    
    // ✅ إرجاع قيم افتراضية بدلاً من رمي خطأ
    return {
      products: [],
      categories: [],
      subcategories: [],
      isLoading: false,
      error: null,
      filteredProducts: [],
      searchTerm: '',
      selectedCategory: null,
      selectedSubcategory: null,
      priceRange: { min: 0, max: 0 },
      meta: null,
      currentPage: 1,
      pageSize: 12,
      sortOption: 'newest',
      // Actions with safe no-op functions
      setSearchTerm: () => {},
      setSelectedCategory: () => {},
      setSelectedSubcategory: () => {},
      setPriceRange: () => {},
      setCurrentPage: () => {},
      setPageSize: () => {},
      setSortOption: () => {},
      refreshData: () => {}
    };
  }
  
  return context;
};
