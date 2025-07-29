import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { useEffect, useRef } from 'react';

// أنواع البيانات
interface ProductsPageContextType {
  // البيانات الأساسية
  products: any[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  
  // البحث والفلترة
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (categoryId: string | null) => void;
  
  // نطاق السعر
  priceRange: { min: number; max: number };
  setPriceRange: (range: { min: number; max: number }) => void;
  
  // المنتجات المفلترة
  filteredProducts: any[];
  
  // وظائف إضافية
  refreshData: () => void;
}

// السياق
const ProductsPageContext = createContext<ProductsPageContextType | null>(null);

// مزود السياق المحسن لصفحة المنتجات
export const ProductsPageProvider: React.FC<{ 
  children: ReactNode;
  organizationId?: string;
}> = ({ children, organizationId: propOrganizationId }) => {
  // تتبع عدد التحديثات
  const renderCount = useRef(0);
  renderCount.current += 1;

  // تتبع التغييرات في البيانات
  const previousData = useRef<any>({});

  // استخدام البيانات المشتركة من السياق المركزي
  const { products, categories, isLoading, error, refreshData } = useSharedStoreDataContext();
  
  // فلترة وبحث - استخدام useState مع optimization
  const [searchTerm, setSearchTermState] = useState('');
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [priceRange, setPriceRangeState] = useState({ min: 0, max: 1000000 });

  // تحسين: استخدام useCallback لمنع إعادة الإنشاء
  const setSearchTerm = useCallback((term: string) => {
    console.log(`🔍 [ProductsPageProvider] Search term changing: "${searchTerm}" → "${term}"`);
    setSearchTermState(term);
  }, [searchTerm]);

  const setSelectedCategory = useCallback((categoryId: string | null) => {
    console.log(`🏷️ [ProductsPageProvider] Selected category changing: ${selectedCategory} → ${categoryId}`);
    setSelectedCategoryState(categoryId);
  }, [selectedCategory]);

  const setPriceRange = useCallback((range: { min: number; max: number }) => {
    console.log(`💰 [ProductsPageProvider] Price range changing: ${JSON.stringify(priceRange)} → ${JSON.stringify(range)}`);
    setPriceRangeState(range);
  }, [priceRange]);

  useEffect(() => {
    console.log(`🔄 [ProductsPageProvider] Render #${renderCount.current} - تحديث ProductsPageProvider`);
    
    // تتبع التغييرات في البيانات
    const currentData = {
      productsCount: products?.length || 0,
      categoriesCount: categories?.length || 0,
      isLoading,
      hasError: !!error,
      searchTerm,
      selectedCategory
    };

    const prev = previousData.current;
    
    if (prev.productsCount !== currentData.productsCount) {
      console.log(`📦 [ProductsPageProvider] Products changed: ${prev.productsCount} → ${currentData.productsCount}`);
    }
    
    if (prev.categoriesCount !== currentData.categoriesCount) {
      console.log(`📊 [ProductsPageProvider] Categories changed: ${prev.categoriesCount} → ${currentData.categoriesCount}`);
    }
    
    if (prev.isLoading !== currentData.isLoading) {
      console.log(`⏳ [ProductsPageProvider] Loading state changed: ${prev.isLoading} → ${currentData.isLoading}`);
    }
    
    if (prev.hasError !== currentData.hasError) {
      console.log(`❌ [ProductsPageProvider] Error state changed: ${prev.hasError} → ${currentData.hasError}`);
    }
    
    if (prev.searchTerm !== currentData.searchTerm) {
      console.log(`🔍 [ProductsPageProvider] Search term changed: "${prev.searchTerm}" → "${currentData.searchTerm}"`);
    }
    
    if (prev.selectedCategory !== currentData.selectedCategory) {
      console.log(`🏷️ [ProductsPageProvider] Selected category changed: ${prev.selectedCategory} → ${currentData.selectedCategory}`);
    }
    
    previousData.current = currentData;
    
    // تحذير من التحديثات المتكررة
    if (renderCount.current > 3) {
      console.warn(`⚠️ [ProductsPageProvider] تحديث متكرر (#${renderCount.current}) - Stack trace:`);
      console.trace();
    }
  });

  // تسجيل الحالة الحالية
  useEffect(() => {
    const currentState = {
      productsCount: products?.length || 0,
      categoriesCount: categories?.length || 0,
      isLoading,
      hasError: !!error,
      searchTerm,
      selectedCategory,
      renderCount: renderCount.current
    };

    console.log(`📋 [ProductsPageProvider] Current state:`, currentState);
  }, [products, categories, isLoading, error, searchTerm, selectedCategory]);

  // تحسين: حساب المنتجات المفلترة مع useMemo
  const filteredProducts = useMemo(() => {
    console.log(`🔄 [ProductsPageProvider] Recalculating filtered products...`);
    
    if (!products || products.length === 0) {
      return [];
    }

    let filtered = [...products];

    // فلترة حسب الفئة
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category_id === selectedCategory ||
        product.product_category_id === selectedCategory ||
        product.category?.id === selectedCategory
      );
    }

    // فلترة حسب السعر
    if (priceRange.min > 0 || priceRange.max < 1000000) {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        return price >= priceRange.min && price <= priceRange.max;
      });
    }

    // فلترة حسب النص
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.name?.toLowerCase().includes(searchLower)
      );
    }

    console.log(`✅ [ProductsPageProvider] Filtered products: ${filtered.length} from ${products?.length || 0}`);
    return filtered;
  }, [products, selectedCategory, searchTerm, priceRange]);

  // تحسين: قيمة السياق مع useMemo
  const contextValue = useMemo(() => ({
    products: products || [],
    categories: categories || [],
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    filteredProducts,
    refreshData
  }), [
    products,
    categories,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    filteredProducts,
    refreshData
  ]);

  return (
    <ProductsPageContext.Provider value={contextValue}>
      {children}
    </ProductsPageContext.Provider>
  );
};

// Hook لاستخدام السياق
export const useProductsPage = (): ProductsPageContextType => {
  const context = useContext(ProductsPageContext);
  if (!context) {
    throw new Error('useProductsPage must be used within a ProductsPageProvider');
  }
  return context;
};
