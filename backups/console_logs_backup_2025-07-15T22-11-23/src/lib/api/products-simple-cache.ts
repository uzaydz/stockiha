import { supabase } from '@/lib/supabase';

// نوع بسيط للمنتج
interface SimpleProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  is_active: boolean;
  created_at: string;
  [key: string]: any; // للحقول الأخرى
}

// الـ cache البسيط
let productsCache: SimpleProduct[] = [];
let cacheTimestamp = 0;
let cachedOrganizationId = '';

// مدة صلاحية الـ cache (3 دقائق)
const CACHE_DURATION = 3 * 60 * 1000;

// دالة لجلب جميع المنتجات وحفظها في الـ cache
export const loadProductsToCache = async (organizationId: string): Promise<void> => {
  const now = Date.now();
  
  // فحص إذا كان الـ cache صالح
  if (
    cachedOrganizationId === organizationId &&
    productsCache.length > 0 &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return; // الـ cache صالح
  }
  
  try {
    
    // جلب جميع المنتجات النشطة
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, sku, barcode, description, price, stock_quantity,
        category_id, is_active, created_at, thumbnail_image, images
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      return;
    }
    
    // حفظ في الـ cache
    productsCache = data || [];
    cacheTimestamp = now;
    cachedOrganizationId = organizationId;

  } catch (error) {
  }
};

// دالة البحث المحلي السريع
export const searchProductsInCache = (
  searchQuery: string,
  options: {
    categoryFilter?: string;
    stockFilter?: string;
    sortOption?: string;
    page?: number;
    limit?: number;
  } = {}
): {
  products: SimpleProduct[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} => {
  const {
    categoryFilter = '',
    stockFilter = 'all',
    sortOption = 'name-asc',
    page = 1,
    limit = 12
  } = options;
  
  let filteredProducts = [...productsCache];
  
  // تطبيق البحث
  if (searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    
    filteredProducts = filteredProducts.filter(product => {
      const searchableText = [
        product.name || '',
        product.sku || '',
        product.barcode || '',
        product.description || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(query);
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
  filteredProducts.sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
        return (a.name || '').localeCompare(b.name || '', 'ar');
    }
  });
  
  // حساب الـ pagination
  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  return {
    products: paginatedProducts,
    totalCount,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
};

// دالة للحصول على إحصائيات الـ cache
export const getCacheInfo = () => {
  const now = Date.now();
  const isExpired = now - cacheTimestamp > CACHE_DURATION;
  
  return {
    productsCount: productsCache.length,
    isExpired,
    ageInMinutes: Math.floor((now - cacheTimestamp) / (60 * 1000)),
    organizationId: cachedOrganizationId
  };
};

// دالة لمسح الـ cache
export const clearCache = () => {
  productsCache = [];
  cacheTimestamp = 0;
  cachedOrganizationId = '';
};

// دالة لتحديث منتج في الـ cache
export const updateProductInCache = (productId: string, updates: Partial<SimpleProduct>) => {
  const index = productsCache.findIndex(p => p.id === productId);
  if (index !== -1) {
    productsCache[index] = { ...productsCache[index], ...updates };
  }
};

// دالة لإضافة منتج جديد إلى الـ cache
export const addProductToCache = (product: SimpleProduct) => {
  productsCache.push(product);
  // إعادة ترتيب
  productsCache.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
};

// دالة لحذف منتج من الـ cache
export const removeProductFromCache = (productId: string) => {
  const initialLength = productsCache.length;
  productsCache = productsCache.filter(p => p.id !== productId);
  
  if (productsCache.length < initialLength) {
  }
};
