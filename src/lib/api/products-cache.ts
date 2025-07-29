import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

// نوع البيانات المخزنة في الـ cache
interface ProductsCacheData {
  products: Product[];
  timestamp: number;
  organizationId: string;
}

// مدة صلاحية الـ cache (5 دقائق)
const CACHE_DURATION = 5 * 60 * 1000;

// الـ cache المحلي
const productsCache = new Map<string, ProductsCacheData>();

// دالة لتنظيف الـ cache المنتهي الصلاحية
const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, data] of productsCache.entries()) {
    if (now - data.timestamp > CACHE_DURATION) {
      productsCache.delete(key);
    }
  }
};

// دالة لجلب جميع المنتجات وتخزينها في الـ cache
export const fetchAllProductsToCache = async (organizationId: string): Promise<Product[]> => {
  const cacheKey = `all-products-${organizationId}`;
  
  // تنظيف الـ cache المنتهي الصلاحية
  cleanupExpiredCache();
  
  // فحص الـ cache أولاً
  const cachedData = productsCache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.products;
  }
  
  try {
    // جلب جميع المنتجات النشطة من قاعدة البيانات
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:category_id(id, name, slug, image_url),
        subcategory:subcategory_id(id, name, slug)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      return [];
    }
    
    const products = (data as any[]) || [];
    
    // تخزين في الـ cache
    productsCache.set(cacheKey, {
      products,
      timestamp: Date.now(),
      organizationId
    });
    
    return products;
    
  } catch (error) {
    return [];
  }
};

// دالة البحث المحلي السريع
export const searchProductsLocally = (
  products: Product[],
  searchQuery: string,
  options: {
    categoryFilter?: string;
    stockFilter?: string;
    sortOption?: string;
    page?: number;
    limit?: number;
  } = {}
): {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} => {
  const {
    categoryFilter = '',
    stockFilter = 'all',
    sortOption = 'newest',
    page = 1,
    limit = 12
  } = options;
  
  let filteredProducts = [...products];
  
  // تطبيق فلتر البحث
  if (searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    
    // تقسيم النص إلى كلمات للبحث الذكي
    const searchWords = query
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 0);
    
    filteredProducts = filteredProducts.filter(product => {
      const searchableText = [
        product.name || '',
        product.sku || '',
        product.barcode || '',
        product.description || ''
      ].join(' ').toLowerCase();
      
      // البحث الذكي: يجب أن تحتوي على جميع الكلمات
      return searchWords.every(word => 
        searchableText.includes(word)
      );
    });
  }
  
  // تطبيق فلتر الفئة
  if (categoryFilter) {
    filteredProducts = filteredProducts.filter(product => 
      product.category_id === categoryFilter
    );
  }
  
  // تطبيق فلتر المخزون
  switch (stockFilter) {
    case 'in-stock':
      filteredProducts = filteredProducts.filter(product => 
        (product.stock_quantity || 0) > 0
      );
      break;
    case 'out-of-stock':
      filteredProducts = filteredProducts.filter(product => 
        (product.stock_quantity || 0) === 0
      );
      break;
    case 'low-stock':
      filteredProducts = filteredProducts.filter(product => 
        (product.stock_quantity || 0) > 0 && (product.stock_quantity || 0) <= 5
      );
      break;
  }
  
  // تطبيق الترتيب
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'oldest':
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '', 'ar');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '', 'ar');
      case 'stock-high':
        return (b.stock_quantity || 0) - (a.stock_quantity || 0);
      case 'stock-low':
        return (a.stock_quantity || 0) - (b.stock_quantity || 0);
      default:
        return 0;
    }
  });
  
  // حساب الـ pagination
  const totalCount = sortedProducts.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);
  
  return {
    products: paginatedProducts,
    totalCount,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
};

// دالة لتحديث منتج واحد في الـ cache
export const updateProductInCache = (organizationId: string, updatedProduct: Product) => {
  const cacheKey = `all-products-${organizationId}`;
  const cachedData = productsCache.get(cacheKey);
  
  if (cachedData) {
    const productIndex = cachedData.products.findIndex(p => p.id === updatedProduct.id);
    if (productIndex !== -1) {
      cachedData.products[productIndex] = updatedProduct;
    } else {
      cachedData.products.push(updatedProduct);
    }
    
    // إعادة ترتيب المنتجات
    cachedData.products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  }
};

// دالة لحذف منتج من الـ cache
export const removeProductFromCache = (organizationId: string, productId: string) => {
  const cacheKey = `all-products-${organizationId}`;
  const cachedData = productsCache.get(cacheKey);
  
  if (cachedData) {
    cachedData.products = cachedData.products.filter(p => p.id !== productId);
  }
};

// دالة لإضافة منتج جديد إلى الـ cache
export const addProductToCache = (organizationId: string, newProduct: Product) => {
  const cacheKey = `all-products-${organizationId}`;
  const cachedData = productsCache.get(cacheKey);
  
  if (cachedData) {
    cachedData.products.push(newProduct);
    // إعادة ترتيب المنتجات
    cachedData.products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  }
};

// دالة لمسح الـ cache يدوياً
export const clearProductsCache = (organizationId?: string) => {
  if (organizationId) {
    const cacheKey = `all-products-${organizationId}`;
    productsCache.delete(cacheKey);
  } else {
    productsCache.clear();
  }
};

// دالة للحصول على إحصائيات الـ cache
export const getCacheStats = (organizationId: string) => {
  const cacheKey = `all-products-${organizationId}`;
  const cachedData = productsCache.get(cacheKey);
  
  if (!cachedData) {
    return {
      isCached: false,
      productsCount: 0,
      cacheAge: 0
    };
  }
  
  return {
    isCached: true,
    productsCount: cachedData.products.length,
    cacheAge: Date.now() - cachedData.timestamp
  };
};
