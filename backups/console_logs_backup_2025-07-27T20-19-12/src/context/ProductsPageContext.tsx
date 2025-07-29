import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';

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
  const { products, categories, isLoading, error, refreshData } = useSharedStoreData();
  
  // فلترة وبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });

  // حساب المنتجات المفلترة
  const filteredProducts = React.useMemo(() => {
    let filtered = [...products];

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
  }, [products, searchTerm, selectedCategory, priceRange]);

  const contextValue: ProductsPageContextType = {
    products,
    categories,
    isLoading,
    error,
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