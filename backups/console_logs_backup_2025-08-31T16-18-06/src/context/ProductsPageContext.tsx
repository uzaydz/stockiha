import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import { useTenant } from '@/context/TenantContext';
import { getProducts } from '@/lib/api/products';

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

interface ProductsPageContextType {
  // البيانات الأساسية فقط
  products: ProductsPageProduct[];
  categories: ProductsPageCategory[];
  isLoading: boolean;
  error: string | null;
  
  // الفلترة والبحث
  filteredProducts: ProductsPageProduct[];
  searchTerm: string;
  selectedCategory: string | null;
  priceRange: { min: number; max: number };
  
  // دوال محدودة
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setPriceRange: (range: { min: number; max: number }) => void;
  refreshData: () => void;
}

const ProductsPageContext = createContext<ProductsPageContextType | undefined>(undefined);

// مزود السياق المحسن لصفحة المنتجات
export const ProductsPageProvider: React.FC<{ 
  children: ReactNode;
  organizationId?: string;
}> = ({ children, organizationId: propOrganizationId }) => {
  // استخدام البيانات المشتركة بدلاً من جلب منفصل
  const { products: sharedProducts, categories, isLoading: sharedLoading, error: sharedError, refreshData } = useSharedStoreData({
    includeProducts: false,
    includeFeaturedProducts: true, // ✅ إصلاح: تفعيل المنتجات المميزة لضمان ظهورها في البانر
    includeCategories: true,
    enabled: true,
  } as any);
  const { currentOrganization } = useTenant();

  // جلب كامل للمنتجات في وضع الساب دومين/النطاق العام لصفحة المنتجات
  const [fullProducts, setFullProducts] = useState<ProductsPageProduct[]>([]);
  const [fullLoading, setFullLoading] = useState<boolean>(false);
  const [fullError, setFullError] = useState<string | null>(null);

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

  // منع الجلب المكرر لنفس معرف المؤسسة
  const lastFetchedOrgIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const orgId = resolvedOrgId || '';
    if (!orgId) return;

    let isMounted = true;
    const loadAllProducts = async () => {
      // تجنب إعادة الجلب لنفس معرف المؤسسة
      if (lastFetchedOrgIdRef.current === orgId) {
        return;
      }
      lastFetchedOrgIdRef.current = orgId;

      try {
        setFullLoading(true);
        setFullError(null);
        const result = await getProducts(orgId, false);
        if (!isMounted) return;
        setFullProducts(result as any);
      } catch (e: any) {
        if (!isMounted) return;
        setFullError(e?.message || 'خطأ في تحميل المنتجات');
      } finally {
        if (!isMounted) return;
        setFullLoading(false);
      }
    };

    loadAllProducts();
    return () => { isMounted = false; };
  }, [resolvedOrgId]);
  
  // فلترة وبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });

  // حساب المنتجات المفلترة
  const filteredProducts = React.useMemo(() => {
    // أولوية لنتائج الجلب الكامل إن وُجدت، وإلا استخدم بيانات السياق المشتركة
    const baseProducts = (fullProducts && fullProducts.length > 0) ? fullProducts : sharedProducts;
    let filtered = [...baseProducts];

    // فلترة بالبحث
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // فلترة بالفئة
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // فلترة بالسعر
    filtered = filtered.filter(product => 
      product.price >= priceRange.min && product.price <= priceRange.max
    );

    return filtered;
  }, [fullProducts, sharedProducts, searchTerm, selectedCategory, priceRange]);

  const contextValue: ProductsPageContextType = {
    products: (fullProducts && fullProducts.length > 0) ? fullProducts : (sharedProducts || []),
    categories,
    // اعتبر تحميل الصفحة فقط عند تحميل المنتجات الكاملة أو عند غيابها ومازال shared في حالة تحميل
    isLoading: fullLoading || (sharedLoading && fullProducts.length === 0),
    error: sharedError || fullError,
    filteredProducts,
    searchTerm,
    selectedCategory,
    priceRange,
    setSearchTerm,
    setSelectedCategory,
    setPriceRange,
    refreshData,
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
    throw new Error('useProductsPage must be used within a ProductsPageProvider');
  }
  
  return context;
};
