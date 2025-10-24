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
  subcategory_id?: string; // إضافة دعم الفئات الفرعية
  is_active: boolean;
  created_at: string;
  thumbnail_image?: string;
  images?: string[];
  slug?: string;
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
    // جلب عدد المنتجات الفعلي أولاً
    const totalProductsCount = await getProductsCount(organizationId);
    console.log(`إجمالي المنتجات في قاعدة البيانات: ${totalProductsCount}`);
    
    let allProducts: SimpleProduct[] = [];
    let page = 0;
    const pageSize = 1000; // حجم الصفحة
    let hasMore = true;
    
    // جلب جميع المنتجات باستخدام pagination لتجاوز حد 1000
    while (hasMore) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku, barcode, description, price, stock_quantity,
          category_id, subcategory_id, is_active, created_at, thumbnail_image, images, slug
        `)
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error('خطأ في جلب المنتجات:', error);
        break;
      }
      
      if (data && data.length > 0) {
        allProducts = allProducts.concat(data);
        hasMore = data.length === pageSize; // إذا كان العدد أقل من pageSize، فهذا يعني أننا وصلنا للنهاية
        page++;
        
        // إضافة تأخير صغير لتجنب الضغط على قاعدة البيانات
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        hasMore = false;
      }
      
      // حد أقصى للصفحات لتجنب الحلقات اللانهائية (10000 منتج كحد أقصى)
      if (page > 10) {
        console.warn('تم الوصول للحد الأقصى من الصفحات (10000 منتج)');
        break;
      }
    }
    
    // حفظ في الـ cache
    productsCache = allProducts;
    cacheTimestamp = now;
    cachedOrganizationId = organizationId;
    
    console.log(`تم جلب ${allProducts.length} منتج بنجاح من أصل ${totalProductsCount} منتج`);
    
    // التحقق من أننا جلبنا جميع المنتجات
    if (allProducts.length < totalProductsCount) {
      console.warn(`تحذير: تم جلب ${allProducts.length} منتج فقط من أصل ${totalProductsCount} منتج. قد تكون هناك مشكلة في pagination.`);
    }

  } catch (error) {
    console.error('خطأ في تحميل المنتجات:', error);
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
    // فلاتر الفئات المتقدمة
    selectedCategories?: string[];
    selectedSubcategories?: string[];
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
    limit = 12,
    // فلاتر الفئات المتقدمة
    selectedCategories = [],
    selectedSubcategories = []
  } = options;
  
  let filteredProducts = [...(productsCache || [])];
  
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

  // تطبيق فلاتر الفئات المتقدمة
  if (selectedCategories.length > 0) {
    filteredProducts = filteredProducts.filter(product =>
      product.category_id && selectedCategories.includes(product.category_id)
    );
  }

  // تطبيق فلاتر الفئات الفرعية
  if (selectedSubcategories.length > 0) {
    filteredProducts = filteredProducts.filter(product =>
      product.subcategory_id && selectedSubcategories.includes(product.subcategory_id)
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

// دالة للحصول على عدد المنتجات في قاعدة البيانات
export const getProductsCount = async (organizationId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: false })
      .eq('organization_id', organizationId)
      .limit(1);
    
    if (error) {
      console.error('خطأ في جلب عدد المنتجات:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('خطأ في جلب عدد المنتجات:', error);
    return 0;
  }
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
