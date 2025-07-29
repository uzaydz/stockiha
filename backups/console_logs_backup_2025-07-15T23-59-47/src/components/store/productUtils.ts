import { Product } from '@/api/store';
import { optimizeStoreImage } from '@/lib/imageOptimization';

// تعريف النوع لبيانات المنتج من قاعدة البيانات
export interface DBProduct {
  id: string;
  name: string;
  description: string;
  price: string | number;
  compare_at_price?: string | number | null;
  thumbnail_image?: string;
  thumbnail_url?: string;
  stock_quantity: number;
  is_new?: boolean;
  is_featured?: boolean;
  category?: any;
  category_id?: string;
  slug?: string;
  organization_id: string;
  category_name?: string;
  [key: string]: any;
}

// دالة مساعدة لإنشاء slug من اسم المنتج
export const generateSlugFromName = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '') // إزالة الرموز الخاصة مع الحفاظ على العربية
    .replace(/\s+/g, '-') // استبدال المسافات بشرطات
    .trim();
};

// دالة للحصول على slug المنتج
export const getProductSlug = (product: Product): string => {
  return product.slug || generateSlugFromName(product.name);
};

// دالة حساب نسبة الخصم
export const calculateDiscount = (original: number, discounted?: number): string | null => {
  if (!discounted || discounted >= original) return null;
  const percentage = Math.round(((original - discounted) / original) * 100);
  return `-${percentage}%`;
};

// دالة تحسين روابط الصور الافتراضية
export const optimizeDefaultImageUrl = (url: string): string => {
  return optimizeStoreImage(url, 'product');
};

// إنشاء المنتجات الافتراضية مع استخدام الترجمة
export const getDefaultProducts = (t: any): Product[] => [
  {
    id: '1',
    name: t('featuredProducts.defaultProducts.headphones.name'),
    price: 299,
    discount_price: 199,
    imageUrl: optimizeDefaultImageUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470'),
    category: t('productCategories.defaultCategories.electronics.name'),
    is_new: true,
    stock_quantity: 100,
    slug: 'wireless-headphones',
    description: t('featuredProducts.defaultProducts.headphones.description'),
    rating: 4.5
  },
  {
    id: '2',
    name: t('featuredProducts.defaultProducts.laptop.name'),
    price: 1499,
    imageUrl: optimizeDefaultImageUrl('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1471'),
    category: t('productCategories.defaultCategories.computers.name'),
    is_new: true,
    stock_quantity: 50,
    slug: 'high-speed-laptop',
    description: t('featuredProducts.defaultProducts.laptop.description'),
    rating: 5
  },
  {
    id: '3',
    name: t('featuredProducts.defaultProducts.smartwatch.name'),
    price: 499,
    discount_price: 399,
    imageUrl: optimizeDefaultImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1399'),
    category: t('productCategories.defaultCategories.accessories.name'),
    stock_quantity: 200,
    slug: 'smart-watch',
    description: t('featuredProducts.defaultProducts.smartwatch.description'),
    rating: 4.2
  },
  {
    id: '4',
    name: t('featuredProducts.defaultProducts.camera.name'),
    price: 899,
    imageUrl: optimizeDefaultImageUrl('https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1470'),
    category: t('productCategories.defaultCategories.electronics.name'),
    stock_quantity: 30,
    slug: 'professional-camera',
    description: t('featuredProducts.defaultProducts.camera.description'),
    rating: 4.8
  }
];

// وظيفة لتحويل منتج من قاعدة البيانات إلى منتج للواجهة
export const convertDatabaseProductToStoreProduct = (dbProduct: DBProduct): Product => {
  let categoryName = '';
  
  // تحقق من أن category موجود وله نوع
  if (dbProduct.category) {
    if (typeof dbProduct.category === 'object' && dbProduct.category.name) {
      categoryName = dbProduct.category.name;
    } else if (typeof dbProduct.category === 'string') {
      categoryName = dbProduct.category;
    }
  } else if (dbProduct.category_name) {
    categoryName = dbProduct.category_name;
  }
  
  // معالجة روابط الصور وتصحيحها مع التحسين
  let imageUrl = '';
  
  if (dbProduct.thumbnail_url) {
    imageUrl = dbProduct.thumbnail_url.trim();
  } else if (dbProduct.thumbnail_image) {
    imageUrl = dbProduct.thumbnail_image.trim();
  }
  
  // التحقق من صحة هيكل الرابط وإصلاحه إذا لزم الأمر
  if (imageUrl) {
    // إزالة الاقتباسات إذا كانت موجودة
    if (imageUrl.startsWith('"') && imageUrl.endsWith('"')) {
      imageUrl = imageUrl.substring(1, imageUrl.length - 1);
    }
    
    // تصحيح الرابط إذا لم يحتوي على بروتوكول
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        const baseUrl = window.location.origin;
        imageUrl = `${baseUrl}${imageUrl}`;
      } else {
        imageUrl = `https://${imageUrl}`;
      }
    }
    
    // تأكد من أن الرابط لا يحتوي على مسافات داخلية
    imageUrl = imageUrl.replace(/\s+/g, '%20');
    
    // تحسين الصورة إذا كانت من Unsplash
    imageUrl = optimizeDefaultImageUrl(imageUrl);
  } else {
    // استخدم صورة افتراضية محسنة إذا لم تكن هناك صورة مصغرة
    imageUrl = optimizeDefaultImageUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470');
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: Number(dbProduct.price || 0),
    discount_price: dbProduct.compare_at_price ? Number(dbProduct.compare_at_price) : undefined,
    imageUrl: imageUrl,
    category: categoryName,
    is_new: !!dbProduct.is_new,
    stock_quantity: Number(dbProduct.stock_quantity || 0),
    slug: typeof dbProduct.slug === 'string' && dbProduct.slug ? dbProduct.slug : (dbProduct.id || `product-${Date.now()}`),
    rating: 4.5 // قيمة افتراضية
  };
};

// دالة للحصول على نص حالة المخزون
export const getStockStatusText = (stockQuantity: number, t: any) => {
  if (stockQuantity <= 0) {
    return {
      text: t('featuredProducts.stock.outOfStock'),
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    };
  } else if (stockQuantity < 10) {
    return {
      text: t('featuredProducts.stock.limitedQuantity'),
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    };
  } else {
    return {
      text: t('featuredProducts.stock.available'),
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    };
  }
};

// دالة للحصول على اسم الفئة
export const getCategoryName = (category: any): string => {
  if (typeof category === 'object' && category !== null && category.name) {
    return category.name;
  } else if (typeof category === 'string') {
    return category;
  }
  return '';
};
