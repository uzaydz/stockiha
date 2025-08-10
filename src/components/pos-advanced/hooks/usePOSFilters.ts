import { useState, useMemo, useCallback, useRef, useTransition, useEffect } from 'react';
import { Product } from '@/types';
import { FilterState, Category, ViewMode, SortBy, SortOrder, StockFilter, ActiveTab } from '../types';
import { useDebounce } from './useDebounce';

// تحسين دالة التصفية باستخدام memoization
const createFilterFunction = (filterState: FilterState) => {
  const { searchQuery, selectedCategory, stockFilter } = filterState;
  const queryLower = searchQuery?.toLowerCase() || '';
  
  return (product: Product) => {
    // تصفية البحث - محسنة
    if (queryLower) {
      const nameMatch = product.name.toLowerCase().includes(queryLower);
      if (!nameMatch) {
        const barcodeMatch = product.barcode?.toLowerCase().includes(queryLower);
        if (!barcodeMatch) {
          const descriptionMatch = product.description?.toLowerCase().includes(queryLower);
          if (!descriptionMatch) return false;
        }
      }
    }

    // تصفية الفئة - محسنة
    if (selectedCategory !== 'all') {
      const productCategoryId = product.category_id || 
                               (product as any).categoryId || 
                               (product as any).product_category_id;
      
      if (productCategoryId !== selectedCategory) return false;
    }

    // تصفية المخزون - محسنة
    if (stockFilter !== 'all') {
      const stock = product.stock_quantity || 0;
      const lowStockThreshold = (product as any).low_stock_threshold || 10;
      
      switch (stockFilter) {
        case 'instock': 
          if (stock <= lowStockThreshold) return false;
          break;
        case 'lowstock': 
          if (stock === 0 || stock > lowStockThreshold) return false;
          break;
        case 'outofstock': 
          if (stock !== 0) return false;
          break;
      }
    }

    return true;
  };
};

// تحسين دالة الترتيب باستخدام memoization
const createSortFunction = (sortBy: SortBy, sortOrder: SortOrder) => {
  const multiplier = sortOrder === 'asc' ? 1 : -1;
  
  return (a: Product, b: Product) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'ar');
        break;
      case 'price':
        comparison = (a.price || 0) - (b.price || 0);
        break;
      case 'stock':
        comparison = (a.stock_quantity || 0) - (b.stock_quantity || 0);
        break;
      case 'category':
        const categoryA = (a.category as any)?.name || (a as any).category_name || '';
        const categoryB = (b.category as any)?.name || (b as any).category_name || '';
        comparison = categoryA.localeCompare(categoryB, 'ar');
        break;
    }
    
    return comparison * multiplier;
  };
};

// استخراج الفئات محسن مع cache
const extractCategories = (
  products: Product[], 
  productCategories: any[], 
  subscriptionCategories: any[]
): Category[] => {
  // استخدم productCategories إذا كانت متوفرة
  if (productCategories && productCategories.length > 0) {
    return productCategories.map((cat: any) => ({
      id: cat.id || cat.category_id,
      name: cat.name || cat.category_name || `فئة ${cat.id || cat.category_id}`
    }));
  }
  
  // استخرج الفئات من المنتجات مع تحسين الأداء
  const categoriesMap = new Map<string, Category>();
  
  // استخدم for loop محسن
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const categoryId = product.category_id || 
                      (product as any).categoryId || 
                      (product as any).product_category_id;
                      
    if (!categoryId || categoriesMap.has(categoryId)) continue;
    
    let categoryName = '';
    
    // البحث عن اسم الفئة بطريقة محسنة
    if ((product as any).category_name) {
      categoryName = (product as any).category_name;
    } else if (product.category && typeof product.category === 'object' && (product.category as any).name) {
      categoryName = (product.category as any).name;
    } else if ((product as any).product_category && typeof (product as any).product_category === 'object' && (product as any).product_category.name) {
      categoryName = (product as any).product_category.name;
    } else if (subscriptionCategories) {
      const foundCategory = subscriptionCategories.find((cat: any) => 
        cat.id === categoryId || cat.category_id === categoryId
      );
      if (foundCategory) {
        categoryName = foundCategory.name || foundCategory.category_name;
      }
    }
    
    categoriesMap.set(categoryId, {
      id: categoryId,
      name: categoryName || `فئة ${categoryId}`
    });
  }

  return Array.from(categoriesMap.values());
};

export const usePOSFilters = (
  products: Product[],
  productCategories: any[],
  subscriptionCategories: any[]
) => {
  // استخدام useTransition لتحسين الأداء
  const [isPending, startTransition] = useTransition();
  
  // حالات التصفية والبحث
  const [filterState, setFilterState] = useState<FilterState>({
    searchQuery: '',
    selectedCategory: 'all',
    viewMode: 'grid',
    sortBy: 'name',
    sortOrder: 'asc',
    stockFilter: 'all',
    activeTab: 'products'
  });

  // استخدام debounce للبحث
  const debouncedSearchQuery = useDebounce(filterState.searchQuery, 300);
  
  // استخدام refs لتجنب إعادة الحساب غير الضرورية
  const lastResultRef = useRef<Product[]>([]);
  const lastFilterStateRef = useRef<FilterState>(filterState);
  const lastProductsHashRef = useRef<string>('');
  const categoriesCacheRef = useRef<{
    hash: string;
    categories: Category[];
  }>({ hash: '', categories: [] });

  // دالة محسنة لتحديث حالة التصفية
  const updateFilterState = useCallback((updates: Partial<FilterState>) => {
    startTransition(() => {
      setFilterState(prev => {
        // تجنب التحديث إذا لم تتغير القيم
        const hasChanges = Object.keys(updates).some(key => 
          prev[key as keyof FilterState] !== updates[key as keyof FilterState]
        );
        
        if (!hasChanges) return prev;
        
        return { ...prev, ...updates };
      });
    });
  }, []);

  // دوال مخصصة محسنة لكل نوع تصفية
  const setSearchQuery = useCallback((searchQuery: string) => {
    updateFilterState({ searchQuery });
  }, [updateFilterState]);

  const setSelectedCategory = useCallback((selectedCategory: string) => {
    updateFilterState({ selectedCategory });
  }, [updateFilterState]);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    updateFilterState({ viewMode });
  }, [updateFilterState]);

  const setSortBy = useCallback((sortBy: SortBy) => {
    updateFilterState({ sortBy });
  }, [updateFilterState]);

  const setSortOrder = useCallback((sortOrder: SortOrder) => {
    updateFilterState({ sortOrder });
  }, [updateFilterState]);

  const setStockFilter = useCallback((stockFilter: StockFilter) => {
    updateFilterState({ stockFilter });
  }, [updateFilterState]);

  const setActiveTab = useCallback((activeTab: ActiveTab) => {
    updateFilterState({ activeTab });
  }, [updateFilterState]);

  // استخراج الفئات المتاحة محسن مع cache قوي
  const availableCategories = useMemo(() => {
    // إنشاء hash للبيانات
    const categoriesHash = `${products.length}-${productCategories?.length || 0}-${subscriptionCategories?.length || 0}`;
    
    // استخدام الـ cache إذا لم تتغير البيانات
    if (categoriesCacheRef.current.hash === categoriesHash) {
      return categoriesCacheRef.current.categories;
    }
    
    // استخراج الفئات
    const categories = extractCategories(products, productCategories, subscriptionCategories);
    
    // حفظ في الـ cache
    categoriesCacheRef.current = {
      hash: categoriesHash,
      categories
    };
    
    return categories;
  }, [products, productCategories, subscriptionCategories]);

  // تحميل مسبق للفئات
  useEffect(() => {
    // تحميل مسبق للفئات بشكل غير متزامن
    if (availableCategories.length > 0) {
      // تأخير بسيط لمنع حجب الـ UI
      const applyCategories = () => {
        // الفئات جاهزة للاستخدام
      };

      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(applyCategories);
      } else {
        // fallback للمتصفحات التي لا تدعم requestIdleCallback
        setTimeout(applyCategories, 0);
      }
    }
  }, [availableCategories]);

  // تصفية وترتيب المنتجات محسن مع memoization متقدم
  const filteredAndSortedProducts = useMemo(() => {
    if (products.length === 0) return [];
    
    // إنشاء hash للمنتجات للتحقق من التغييرات
    const productsHash = `${products.length}-${products[0]?.id}-${products[0]?.stock_quantity}`;
    
    // دمج debouncedSearchQuery مع filterState
    const effectiveFilterState = {
      ...filterState,
      searchQuery: debouncedSearchQuery
    };
    
    // تحقق من وجود تغييرات فعلية
    const filterStateChanged = JSON.stringify(lastFilterStateRef.current) !== JSON.stringify(effectiveFilterState);
    const productsChanged = lastProductsHashRef.current !== productsHash;
    
    if (!filterStateChanged && !productsChanged && lastResultRef.current.length > 0) {
      return lastResultRef.current;
    }
    
    // حفظ الحالة الحالية
    lastFilterStateRef.current = effectiveFilterState;
    lastProductsHashRef.current = productsHash;
    
    // إنشاء دوال التصفية والترتيب
    const filterFn = createFilterFunction(effectiveFilterState);
    const sortFn = createSortFunction(effectiveFilterState.sortBy, effectiveFilterState.sortOrder);
    
    // التصفية والترتيب المحسن
    const filtered = products.filter(filterFn);
    const sorted = filtered.sort(sortFn);
    
    // حفظ النتيجة
    lastResultRef.current = sorted;
    
    return sorted;
  }, [products, debouncedSearchQuery, filterState]);

  return {
    filterState,
    updateFilterState,
    setSearchQuery,
    setSelectedCategory,
    setViewMode,
    setSortBy,
    setSortOrder,
    setStockFilter,
    setActiveTab,
    filteredAndSortedProducts,
    availableCategories,
    isPending
  };
};
