import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, ChevronRight, Star, ArrowRight, GripHorizontal, Layers, TrendingUp, Sparkles, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Product } from '@/api/store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTenant } from '@/context/TenantContext';
import { useShop } from '@/context/ShopContext';
import { getProducts } from '@/lib/api/products';
import { useTranslation } from 'react-i18next';

// مرجع ثابت لمصفوفة فارغة لتجنب إعادة الإنشاء غير الضروري
const STABLE_EMPTY_ARRAY = Object.freeze([]);

// تعريف النوع لبيانات المنتج من قاعدة البيانات
interface DBProduct {
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
  category?: any; // يمكن أن يكون كائن أو نص
  category_id?: string;
  slug?: string;
  organization_id: string;
  [key: string]: any; // للتوافق مع أي خصائص إضافية
}

interface FeaturedProductsProps {
  title?: string;
  description?: string;
  products?: Product[]; // استخدام البيانات المحسنة من الخدمة
  selectionMethod?: 'automatic' | 'manual';
  selectionCriteria?: 'featured' | 'best_selling' | 'newest' | 'discounted';
  selectedProducts?: string[];
  displayCount?: number;
  displayType?: 'grid' | 'list';
  organizationId?: string;
}

// إنشاء المنتجات الافتراضية مع استخدام الترجمة
const getDefaultProducts = (t: any): Product[] => [
  {
    id: '1',
    name: t('featuredProducts.defaultProducts.headphones.name'),
    price: 299,
    discount_price: 199,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470',
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
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1471',
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
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1399',
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
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1470',
    category: t('productCategories.defaultCategories.electronics.name'),
    stock_quantity: 30,
    slug: 'professional-camera',
    description: t('featuredProducts.defaultProducts.camera.description'),
    rating: 4.8
  }
];

// وظيفة لتحويل منتج من قاعدة البيانات إلى منتج للواجهة
const convertDatabaseProductToStoreProduct = (dbProduct: DBProduct): Product => {
  
  let categoryName = '';
  // تحقق من أن category موجود وله نوع
  if (dbProduct.category) {
    if (typeof dbProduct.category === 'object' && dbProduct.category.name) {
      categoryName = dbProduct.category.name;
    } else if (typeof dbProduct.category === 'string') {
      categoryName = dbProduct.category;
    }
  } else if (dbProduct.category_name) {
    // استخدام category_name إذا كان موجودًا (من API الجديد)
    categoryName = dbProduct.category_name;
  }
  
  // معالجة روابط الصور وتصحيحها
  let imageUrl = '';
  
  // تحقق من وجود thumbnail_url أولاً (يأتي من API الجديد)
  if (dbProduct.thumbnail_url) {
    imageUrl = dbProduct.thumbnail_url.trim();
  } 
  // ثم تحقق من thumbnail_image كخيار ثاني (للتوافق مع البيانات القديمة)
  else if (dbProduct.thumbnail_image) {
    imageUrl = dbProduct.thumbnail_image.trim();
  }
  
  // التحقق من صحة هيكل الرابط وإصلاحه إذا لزم الأمر
  if (imageUrl) {
    // إزالة الاقتباسات إذا كانت موجودة (في حالة تخزين الرابط كسلسلة نصية JSON)
    if (imageUrl.startsWith('"') && imageUrl.endsWith('"')) {
      imageUrl = imageUrl.substring(1, imageUrl.length - 1);
    }
    
    // تصحيح الرابط إذا لم يحتوي على بروتوكول
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`;
      } else if (imageUrl.startsWith('/')) {
        // إضافة بروتوكول وموقع الخادم للمسارات النسبية
        const baseUrl = window.location.origin;
        imageUrl = `${baseUrl}${imageUrl}`;
      } else {
        // إضافة بروتوكول HTTPS للروابط الأخرى
        imageUrl = `https://${imageUrl}`;
      }
    }
    
    // تأكد من أن الرابط لا يحتوي على مسافات داخلية
    imageUrl = imageUrl.replace(/\s+/g, '%20');
  } else {
    // استخدم صورة افتراضية إذا لم تكن هناك صورة مصغرة
    imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
  }

  const product = {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: Number(dbProduct.price || 0),
    discount_price: dbProduct.compare_at_price ? Number(dbProduct.compare_at_price) : undefined,
    imageUrl: imageUrl,
    category: categoryName,
    is_new: !!dbProduct.is_new,
    stock_quantity: Number(dbProduct.stock_quantity || 0),
    slug: typeof dbProduct.slug === 'string' ? dbProduct.slug : dbProduct.id,
    rating: 4.5 // قيمة افتراضية
  };
  
  return product;
};

const FeaturedProducts = ({
  title,
  description,
  products: initialProducts = [], // استخدام البيانات المحسنة من الخدمة
  selectionMethod = 'automatic',
  selectionCriteria = 'featured',
  selectedProducts = [],
  displayCount = 4,
  displayType = 'grid',
  organizationId
}: FeaturedProductsProps) => {
  const { t } = useTranslation();
  const [viewType, setViewType] = useState<'grid' | 'list'>(displayType);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const { products: shopProducts } = useShop();

  // جلب المنتجات المحددة يدوياً إذا لم تكن البيانات مُمررة
  useEffect(() => {

    const fetchSelectedProducts = async () => {
      if (selectionMethod === 'manual' && selectedProducts.length > 0 && initialProducts.length === 0) {
        setLoading(true);
        try {
          // إذا كانت هناك منتجات مختارة يدوياً، اجلبها
          const response = await getProducts(organizationId || '');
          
          if (response && Array.isArray(response)) {
            const filteredProducts = response.filter(product => 
              selectedProducts.includes(product.id)
            );
            const convertedProducts = filteredProducts.map(convertDatabaseProductToStoreProduct);
            setFetchedProducts(convertedProducts);
          } else {
            setFetchedProducts([]);
          }
        } catch (error) {
          console.error('خطأ في جلب المنتجات المختارة:', error);
          setFetchedProducts([]);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchSelectedProducts();
  }, [selectionMethod, selectedProducts, organizationId, initialProducts.length]);

  // منطق عرض المنتجات المحسن
  const displayedProducts = useMemo(() => {
    // إذا كانت هناك منتجات محددة من الخدمة، استخدمها
    if (initialProducts && initialProducts.length > 0) {
      const products = initialProducts.slice(0, displayCount);
      return products;
    }
    
    // استخدم المنتجات المجلبة إذا كانت موجودة
    if (fetchedProducts && fetchedProducts.length > 0) {
      return fetchedProducts.slice(0, displayCount);
    }
    
    // استخدم منتجات المتجر إذا كانت متاحة
    if (shopProducts && shopProducts.length > 0) {
      let filtered = [...shopProducts];
      
      if (selectionCriteria === 'featured') {
        filtered = filtered.filter(p => p.isFeatured);
      } else if (selectionCriteria === 'newest') {
        filtered = filtered.filter(p => p.isNew);
      } else if (selectionCriteria === 'discounted') {
        filtered = filtered.filter(p => p.compareAtPrice && p.compareAtPrice < p.price);
      }
      
      return filtered.slice(0, displayCount);
    }
    
    // استخدم المنتجات الافتراضية كخيار أخير
    return getDefaultProducts(t).slice(0, displayCount);
  }, [initialProducts, fetchedProducts, shopProducts, displayCount, selectionCriteria, t]);

  // معالجة الصور التالفة
  useEffect(() => {
    const handleBrokenImages = () => {
      const images = document.querySelectorAll('.product-image');
      images.forEach((img: Element) => {
        const imgElement = img as HTMLImageElement;
        
        // إزالة مستمعي الأحداث الموجودين لتجنب التكرار
        imgElement.onload = null;
        imgElement.onerror = null;
        
        imgElement.onload = () => {
          imgElement.style.zIndex = '25';
        };
        
        imgElement.onerror = () => {
          imgElement.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
          imgElement.style.zIndex = '25';
        };
      });
    };

    // تأخير معالجة الصور قليلاً للسماح للعناصر بالتحميل
    const timer = setTimeout(handleBrokenImages, 100);
    
    return () => {
      clearTimeout(timer);
      // تنظيف مستمعي الأحداث عند الإزالة
      const images = document.querySelectorAll('.product-image');
      images.forEach((img: Element) => {
        const imgElement = img as HTMLImageElement;
        imgElement.onload = null;
        imgElement.onerror = null;
      });
    };
  }, [displayedProducts]);

  // وظيفة إضافة/إزالة من المفضلة
  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // تأثيرات الحركة للعناصر
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const calculateDiscount = (original: number, discounted?: number) => {
    if (!discounted) return null;
    const percentage = Math.round(((original - discounted) / original) * 100);
    return `-${percentage}%`;
  };
  
  return (
    <section className="py-16 md:py-20 lg:py-24 relative overflow-hidden bg-background">
      {/* خلفية متدرجة محسنة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-secondary/3"></div>
      <div className="absolute top-20 -left-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-20 -right-40 w-80 h-80 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-full blur-3xl opacity-60"></div>
      
      {/* نقاط زخرفية */}
      <div className="absolute top-32 right-20 w-2 h-2 bg-primary/20 rounded-full"></div>
      <div className="absolute top-48 right-32 w-1 h-1 bg-secondary/30 rounded-full"></div>
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-primary/15 rounded-full"></div>
      
      <div className="container px-4 mx-auto relative z-10">
        {/* العنوان الرئيسي المحسن */}
        <motion.div 
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm rounded-full text-primary font-medium text-sm border border-primary/20"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Sparkles className="w-4 h-4" />
            {t('featuredProducts.featuredLabel')}
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-300% animate-gradient-x">
            {title || t('featuredProducts.title')}
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-6 rounded-full"></div>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            {description || t('featuredProducts.description')}
          </p>
        </motion.div>
        
        {/* شريط التحكم المحسن */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-between mb-12 bg-card/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full">
              <TrendingUp className="h-5 w-5 text-primary" />
              <Link to="/products" className="text-primary font-medium text-sm hover:text-primary/80 transition-colors flex items-center group">
                {t('featuredProducts.allProducts')}
                <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{t('featuredProducts.viewMode')}:</span>
            <TooltipProvider>
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={viewType === 'grid' ? 'default' : 'ghost'} 
                      size="sm"
                      className="h-9 px-3 rounded-lg transition-all duration-200" 
                      onClick={() => setViewType('grid')}
                    >
                      <GripHorizontal className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{t('featuredProducts.grid')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('featuredProducts.gridView')}</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={viewType === 'list' ? 'default' : 'ghost'} 
                      size="sm"
                      className="h-9 px-3 rounded-lg transition-all duration-200" 
                      onClick={() => setViewType('list')}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{t('featuredProducts.list')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('featuredProducts.listView')}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </motion.div>
        
        {loading ? (
          // عرض حالة التحميل المحسن
          <motion.div 
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-medium mb-2">{t('featuredProducts.loading')}</h3>
            <p className="text-muted-foreground">{t('featuredProducts.loadingMessage')}</p>
          </motion.div>
        ) : displayedProducts && displayedProducts.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className={viewType === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8" 
              : "space-y-6"
            }
          >
            {displayedProducts.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                {viewType === 'grid' ? (
                  <Card className="group h-full overflow-hidden border border-border/50 hover:border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 rounded-3xl relative">
                    {/* تأثير الوهج عند الـ hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                    
                    <div className="relative overflow-hidden aspect-[4/3] bg-gradient-to-br from-muted/20 to-muted/5 rounded-t-3xl">
                      <Link to={`/products/${product.slug}`} className="block w-full h-full">
                        {product.imageUrl ? (
                          <>
                            <img 
                              key={`product-image-${product.id}`}
                              src={product.imageUrl}
                              alt={product.name}
                              className="product-image w-full h-full object-contain p-4 transition-all duration-500 group-hover:scale-105"
                              onLoad={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
                              }}
                              loading="lazy"
                              style={{ opacity: 0 }}
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-muted-foreground/50 flex flex-col items-center p-4">
                              <Package className="h-16 w-16 mb-3" />
                              <span className="text-sm font-medium text-center line-clamp-2">{product.name}</span>
                            </div>
                          </div>
                        )}
                      </Link>
                      
                      {/* العلامات المحسنة */}
                      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
                        {product.discount_price && (
                          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg backdrop-blur-sm font-bold">
                            {calculateDiscount(Number(product.price), Number(product.discount_price))}
                          </Badge>
                        )}
                        {product.is_new && (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg backdrop-blur-sm font-bold">
                            {t('featuredProducts.new')}
                          </Badge>
                        )}
                      </div>
                      
                      {/* أزرار الإجراءات السريعة */}
                      <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button 
                              size="icon" 
                              className="h-10 w-10 rounded-full bg-background/90 hover:bg-background text-foreground shadow-lg backdrop-blur-sm border border-border/50"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              className="h-10 w-10 rounded-full bg-background/90 hover:bg-background text-foreground shadow-lg backdrop-blur-sm border border-border/50"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(product.id);
                              }}
                            >
                              <Heart className={`h-4 w-4 transition-colors ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                            </Button>
                          </div>
                          <Button 
                            size="icon" 
                            className="h-10 w-10 rounded-full bg-background/90 hover:bg-background text-foreground shadow-lg backdrop-blur-sm border border-border/50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 lg:p-6 relative z-10">
                      <Link to={`/products/${product.slug}`} className="block mb-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        {typeof product.category === 'object' && product.category !== null
                          ? (product.category as { name: string }).name
                          : product.category}
                      </Link>
                      <Link to={`/products/${product.slug}`} className="block font-bold text-lg mb-3 hover:text-primary transition-colors line-clamp-2 leading-tight">
                        {product.name}
                      </Link>
                      
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-2 font-medium">{product.rating?.toFixed(1)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {product.discount_price ? (
                          <div className="flex flex-col">
                            <span className="text-xl font-bold text-primary">
                              {product.discount_price.toLocaleString()} {t('featuredProducts.currency')}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {product.price.toLocaleString()} {t('featuredProducts.currency')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {product.price.toLocaleString()} {t('featuredProducts.currency')}
                          </span>
                        )}
                        
                        <div className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                          product.stock_quantity <= 0 ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : 
                          product.stock_quantity < 10 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : 
                          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        }`}>
                          {product.stock_quantity <= 0 ? t('featuredProducts.stock.outOfStock') : 
                           product.stock_quantity < 10 ? t('featuredProducts.stock.limitedQuantity') : 
                           t('featuredProducts.stock.available')}
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-4 lg:p-6 pt-0 relative z-10">
                      <Button asChild className="w-full h-12 rounded-xl font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300">
                        <Link to={`/products/${product.slug}`} className="flex items-center justify-center gap-2">
                          {t('featuredProducts.viewProduct')}
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  // تصميم القائمة المحسن
                  <div className="relative flex flex-col sm:flex-row items-stretch border border-border/50 hover:border-primary/40 rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/2 to-secondary/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative w-full sm:w-48 aspect-square sm:aspect-[4/3]">
                      <Link to={`/products/${product.slug}`} className="block w-full h-full">
                        {product.imageUrl ? (
                          <>
                            <img 
                              key={`product-image-${product.id}`}
                              src={product.imageUrl}
                              alt={product.name}
                              className="product-image w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                              onLoad={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
                              }}
                              loading="lazy"
                              style={{ opacity: 0 }}
                                                         />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                            <div className="text-muted-foreground/50 flex flex-col items-center p-4">
                              <Package className="h-12 w-12 mb-2" />
                              <span className="text-sm text-center line-clamp-2">{product.name}</span>
                            </div>
                          </div>
                        )}
                      </Link>
                      
                      {/* العلامات */}
                      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
                        {product.discount_price && (
                          <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md">
                            {calculateDiscount(Number(product.price), Number(product.discount_price))}
                          </Badge>
                        )}
                        {product.is_new && (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md">
                            {t('featuredProducts.new')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 p-6 flex flex-col justify-between relative z-10">
                      <div>
                        <Link to={`/products/${product.slug}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
                          {typeof product.category === 'object' && product.category !== null
                            ? (product.category as { name: string }).name
                            : product.category}
                        </Link>
                        <Link to={`/products/${product.slug}`} className="block font-bold text-xl mb-3 hover:text-primary transition-colors line-clamp-2">
                          {product.name}
                        </Link>
                        
                        <p className="text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                            />
                          ))}
                          <span className="text-sm text-muted-foreground ml-2 font-medium">{product.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex flex-col">
                          {product.discount_price ? (
                            <>
                              <span className="text-2xl font-bold text-primary">
                                {product.discount_price.toLocaleString()} {t('featuredProducts.currency')}
                              </span>
                              <span className="text-lg text-muted-foreground line-through">
                                {product.price.toLocaleString()} {t('featuredProducts.currency')}
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-primary">
                              {product.price.toLocaleString()} {t('featuredProducts.currency')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Button asChild className="h-11 px-6 rounded-xl font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300">
                            <Link to={`/products/${product.slug}`} className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              {t('featuredProducts.viewProduct')}
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-11 w-11 rounded-xl border-2 hover:bg-primary/5 transition-all duration-300"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFavorite(product.id);
                            }}
                          >
                            <Heart className={`h-5 w-5 transition-colors ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          // عرض حالة عدم وجود منتجات المحسن
          <motion.div 
            className="text-center py-20 bg-gradient-to-br from-muted/30 to-muted/10 rounded-3xl border-2 border-dashed border-muted-foreground/20"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <ShoppingCart className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">{t('featuredProducts.noProducts')}</h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">{t('featuredProducts.noProductsMessage')}</p>
          </motion.div>
        )}
        
        {/* زر عرض جميع المنتجات المحسن */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button asChild size="lg" className="h-14 px-8 rounded-2xl font-medium bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 group">
            <Link to="/products" className="flex items-center gap-3">
              {t('featuredProducts.browseAllProducts')}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
