import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, ChevronRight, Star, ArrowRight, GripHorizontal, Layers, TrendingUp, Sparkles } from 'lucide-react';
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

const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'سماعات لاسلكية احترافية',
    price: 299,
    discount_price: 199,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470',
    category: 'إلكترونيات',
    is_new: true,
    stock_quantity: 100,
    slug: 'wireless-headphones',
    description: 'سماعات لاسلكية احترافية بجودة صوت عالية',
    rating: 4.5
  },
  {
    id: '2',
    name: 'حاسوب محمول فائق السرعة',
    price: 1499,
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1471',
    category: 'أجهزة كمبيوتر',
    is_new: true,
    stock_quantity: 50,
    slug: 'high-speed-laptop',
    description: 'حاسوب محمول فائق السرعة مع معالج قوي',
    rating: 5
  },
  {
    id: '3',
    name: 'ساعة ذكية متطورة',
    price: 499,
    discount_price: 399,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1399',
    category: 'إكسسوارات',
    stock_quantity: 200,
    slug: 'smart-watch',
    description: 'ساعة ذكية متطورة مع العديد من المميزات',
    rating: 4.2
  },
  {
    id: '4',
    name: 'كاميرا احترافية عالية الدقة',
    price: 899,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1470',
    category: 'إلكترونيات',
    stock_quantity: 30,
    slug: 'professional-camera',
    description: 'كاميرا احترافية عالية الدقة لالتقاط أفضل الصور',
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
  title = 'منتجاتنا المميزة',
  description = 'اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك',
  products: initialProducts = [], // استخدام البيانات المحسنة من الخدمة
  selectionMethod = 'automatic',
  selectionCriteria = 'featured',
  selectedProducts = [],
  displayCount = 4,
  displayType = 'grid',
  organizationId
}: FeaturedProductsProps) => {
  const [viewType, setViewType] = useState<'grid' | 'list'>(displayType);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const { products: shopProducts } = useShop();

  // جلب المنتجات المحددة يدوياً إذا لم تكن البيانات مُمررة
  useEffect(() => {
    const fetchSelectedProducts = async () => {
      if (
        selectionMethod === 'manual' && 
        selectedProducts.length > 0 && 
        initialProducts.length === 0 && 
        organizationId
      ) {
        setLoading(true);
        try {
          const allProducts = await getProducts(organizationId);
          const filteredProducts = allProducts.filter(product => 
            selectedProducts.includes(product.id)
          );
          setFetchedProducts(filteredProducts.map(convertDatabaseProductToStoreProduct));
        } catch (error) {
          setFetchedProducts([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSelectedProducts();
  }, [selectionMethod, selectedProducts, initialProducts.length, organizationId]);

  // 🚀 استخدام البيانات المحسنة مباشرة بدلاً من طلبات API إضافية
  const displayedProducts = useMemo(() => {
    
    // فحص بيانات الصور في المنتجات المستلمة
    if (initialProducts && initialProducts.length > 0) {
      initialProducts.slice(0, 3).forEach((product, index) => {
      });
    }
    
    // تحديد مصدر البيانات - تجنب استخدام ShopContext إلا في الحالات الضرورية
    let sourceProducts: Product[] = [];
    
    if (initialProducts && initialProducts.length > 0) {
      // استخدام البيانات المُمررة (من المتجر الحقيقي)
      sourceProducts = initialProducts;
    } else if (fetchedProducts.length > 0) {
      // استخدام البيانات المجلبة (من محرر المتجر)
      sourceProducts = fetchedProducts;
    } else if (selectionMethod === 'automatic' && shopProducts && shopProducts.length > 0 && !organizationId) {
      // استخدام بيانات ShopContext فقط للاختيار التلقائي وعندما لا تتوفر بيانات أخرى ولا يوجد organizationId
      sourceProducts = shopProducts.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
        discount_price: product.compareAtPrice ? 
          (typeof product.compareAtPrice === 'string' ? parseFloat(product.compareAtPrice) : product.compareAtPrice) : 
          undefined,
        imageUrl: product.thumbnailImage || '',
        category: product.category,
        stock_quantity: product.stockQuantity || 0,
        is_featured: product.isFeatured || false,
        is_new: product.isNew || false,
        slug: product.name.toLowerCase().replace(/\s+/g, '-'),
        rating: 4.5 // قيمة افتراضية
      }));
    }
    
    if (sourceProducts.length > 0) {
      let filteredProducts = [...sourceProducts];
      
      // تطبيق الفلترة حسب طريقة الاختيار
      if (selectionMethod === 'manual') {
        // إذا كان الاختيار يدوي، فالمنتجات المُمررة هي بالفعل المنتجات المحددة
        // لا نحتاج لفلترة إضافية
      } else if (selectionMethod === 'automatic') {
        switch (selectionCriteria) {
          case 'featured':
            filteredProducts = filteredProducts.filter(p => p.is_featured);
            break;
          case 'newest':
            filteredProducts = filteredProducts.filter(p => p.is_new);
            break;
          case 'discounted':
            filteredProducts = filteredProducts.filter(p => p.discount_price && p.discount_price < p.price);
            break;
          case 'best_selling':
            // يمكن إضافة منطق للمنتجات الأكثر مبيعاً هنا
            break;
        }
      }
      
      // تحديد العدد المناسب للعرض
      const finalDisplayCount = selectionMethod === 'manual' && selectedProducts.length > 0 
        ? Math.max(selectedProducts.length, displayCount) // عرض جميع المنتجات المحددة يدوياً
        : displayCount;
      
      const finalProducts = filteredProducts.slice(0, finalDisplayCount);
      return finalProducts;
    }
    
    // إذا لم تتوفر أي بيانات، إرجاع مصفوفة فارغة بدلاً من المنتجات الافتراضية
    // هذا يمنع عرض منتجات وهمية عندما لا تتوفر بيانات حقيقية
    return [];
  }, [initialProducts, fetchedProducts, shopProducts, selectionMethod, selectionCriteria, selectedProducts, displayCount]);

  // دالة مساعدة لاختبار صحة روابط الصور
  const validateImageUrl = useCallback((url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url || url.trim() === '') {
        resolve(false);
        return;
      }
      
      // تجنب اختبار الصور المؤقتة مثل blob أو data URLs
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        resolve(true);
        return;
      }
      
      // تصحيح الرابط إذا لم يكن يحتوي على بروتوكول
      let testUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('//')) {
          testUrl = `https:${url}`;
        } else if (!url.startsWith('/')) {
          testUrl = `https://${url}`;
        } else {
          // المسارات النسبية تحتاج إلى أصل (origin)
          testUrl = `${window.location.origin}${url}`;
        }
      }
      
      // استبدال المسافات بـ %20
      testUrl = testUrl.replace(/\s+/g, '%20');
      
      // فحص الصورة بطريقة أبسط باستخدام طلب HEAD لتجنب مشاكل CORS
      fetch(testUrl, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          resolve(true);
        })
        .catch(() => {
          resolve(false);
        });
      
      // تعيين مهلة للرد في حال لم يستجب الخادم
      setTimeout(() => {
        resolve(false);
      }, 3000);
    });
  }, []);

  useEffect(() => {
    // إضافة معالجة للصور غير القابلة للتحميل
    const handleBrokenImages = () => {
      try {
        // البحث عن جميع صور المنتجات في الصفحة
        const productImages = document.querySelectorAll('.product-image');
        
        productImages.forEach((img, index) => {
          const imgElement = img as HTMLImageElement;
          
          // التحقق من أن الصورة لم تحمل بعد أو فشل تحميلها
          if (imgElement.complete && imgElement.naturalWidth === 0) {
            imgElement.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
            // تأكد من أن الصورة فوق الخلفية
            imgElement.style.zIndex = '25';
            imgElement.style.opacity = '1';
          }
          
          // إضافة معالج أخطاء لكل صورة
          imgElement.addEventListener('error', function(e) {
            // استبدل المصدر بصورة افتراضية
            imgElement.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
            // تأكد من أن الصورة فوق الخلفية
            imgElement.style.zIndex = '25';
            imgElement.style.opacity = '1';
          });
        });
      } catch (error) {
      }
    };

    // تشغيل معالجة الصور بعد تحميل المكون
    const timer = setTimeout(handleBrokenImages, 1000);
    
    return () => clearTimeout(timer);
  }, [displayedProducts]);

  useEffect(() => {
    setViewType(displayType);
  }, [displayType]);
  
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
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const calculateDiscount = (original: number, discounted?: number) => {
    if (!discounted) return null;
    const percentage = Math.round(((original - discounted) / original) * 100);
    return `-${percentage}%`;
  };
  
  return (
    <section className="py-24 bg-gradient-to-b from-background via-muted/10 to-background relative overflow-hidden">
      {/* زخارف خلفية */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/5 to-transparent"></div>
      <div className="absolute -left-24 top-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"></div>
      <div className="absolute -right-24 bottom-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"></div>
      
      <div className="container px-4 mx-auto relative">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 mb-6 bg-primary/10 rounded-full text-sm text-primary font-medium">
            <Sparkles className="w-4 h-4 inline-block mr-2" />
            منتجات مميزة
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{title}</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground">{description}</p>
        </div>
        
        <div className="flex flex-wrap items-center justify-between mb-10 bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 shadow-sm">
          <div className="flex items-center mb-4 md:mb-0">
            <TrendingUp className="h-5 w-5 text-primary mr-2" />
            <Link to="/products" className="text-primary font-medium text-sm hover:underline flex items-center group">
              كل المنتجات
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={viewType === 'grid' ? 'default' : 'outline'} 
                    size="icon" 
                    className="h-9 w-9 rounded-lg" 
                    onClick={() => setViewType('grid')}
                  >
                    <GripHorizontal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>عرض شبكي</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={viewType === 'list' ? 'default' : 'outline'} 
                    size="icon" 
                    className="h-9 w-9 rounded-lg" 
                    onClick={() => setViewType('list')}
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>عرض قائمة</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {loading ? (
          // عرض حالة التحميل
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        ) : displayedProducts && displayedProducts.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className={viewType === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" 
              : "space-y-6"
            }
          >
            {displayedProducts.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                {viewType === 'grid' ? (
                  <Card className="group h-full overflow-hidden border border-border/50 hover:border-primary/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl">
                    <div className="relative overflow-hidden aspect-square bg-gray-100 border border-gray-200">
                      <Link to={`/products/${product.slug}`} className="block w-full h-full">
                        {product.imageUrl ? (
                          <>
                            {/* الصورة الرئيسية */}
                            <img 
                              key={`product-image-${product.id}`}
                              src={product.imageUrl}
                              alt={product.name}
                              className="product-image w-full h-full object-cover absolute inset-0 z-20 transition-opacity duration-300"
                              onLoad={(e) => {
                                // عند تحميل الصورة بنجاح، تأكد من أنها فوق الخلفية
                                e.currentTarget.style.zIndex = '25';
                              }}
                              onError={(e) => {
                                // استبدل المصدر بصورة افتراضية
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
                                e.currentTarget.style.zIndex = '25';
                              }}
                              loading="lazy"
                            />
                            
                            {/* أيقونة احتياطية في الخلفية */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                              <div className="text-gray-400 flex flex-col items-center justify-center p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-center">{product.name}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          // عرض أيقونة للمنتجات التي ليس لها صورة
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                            <div className="text-gray-400 flex flex-col items-center justify-center p-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-center">{product.name}</span>
                            </div>
                          </div>
                        )}
                      </Link>
                      
                      {/* العلامات */}
                      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                        {product.discount_price && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200 font-medium">
                            {calculateDiscount(Number(product.price), Number(product.discount_price))}
                          </Badge>
                        )}
                        {product.is_new && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium">
                            جديد
                          </Badge>
                        )}
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/50 to-transparent">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white/90 hover:bg-white">
                              <ShoppingCart className="h-4 w-4 text-black" />
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-9 w-9 rounded-full bg-white/90 hover:bg-white"
                              onClick={() => toggleFavorite(product.id)}
                            >
                              <Heart className={`h-4 w-4 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-black'}`} />
                            </Button>
                          </div>
                          <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white/90 hover:bg-white">
                            <Eye className="h-4 w-4 text-black" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <Link to={`/products/${product.slug}`} className="block mb-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                        {typeof product.category === 'object' && product.category !== null
                          ? (product.category as { name: string }).name
                          : product.category}
                      </Link>
                      <Link to={`/products/${product.slug}`} className="block font-semibold mb-3 hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </Link>
                      
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.floor(product.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{product.rating?.toFixed(1)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        {product.discount_price ? (
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-primary">
                              {product.discount_price.toLocaleString()} د.ج
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {product.price.toLocaleString()} د.ج
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-bold text-primary">
                            {product.price.toLocaleString()} د.ج
                          </span>
                        )}
                        
                        <div className={`text-xs px-3 py-1 rounded-full ${
                          product.stock_quantity <= 0 ? "bg-red-100 text-red-800" : 
                          product.stock_quantity < 10 ? "bg-amber-100 text-amber-800" : 
                          "bg-green-100 text-green-800"
                        }`}>
                          {product.stock_quantity <= 0 ? "نفذ" : 
                           product.stock_quantity < 10 ? "كمية محدودة" : 
                           "متوفر"}
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-4 pt-0">
                      <Button asChild className="w-full" variant="outline">
                        <Link to={`/products/${product.slug}`} className="flex items-center justify-center gap-2">
                          عرض المنتج
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <div className="relative flex flex-col sm:flex-row items-stretch border border-border/50 hover:border-primary/50 rounded-xl overflow-hidden bg-background/80 hover:shadow-md transition-all duration-300">
                    <div className="relative w-full sm:w-40 aspect-square">
                      <Link to={`/products/${product.slug}`} className="block w-full h-full">
                        {product.imageUrl ? (
                          <>
                            {/* الصورة الرئيسية */}
                            <img 
                              key={`product-image-${product.id}`}
                              src={product.imageUrl}
                              alt={product.name}
                              className="product-image w-full h-full object-cover absolute inset-0 z-20 transition-opacity duration-300"
                              onLoad={(e) => {
                                // عند تحميل الصورة بنجاح، تأكد من أنها فوق الخلفية
                                e.currentTarget.style.zIndex = '25';
                              }}
                              onError={(e) => {
                                // استبدل المصدر بصورة افتراضية
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
                                e.currentTarget.style.zIndex = '25';
                              }}
                              loading="lazy"
                            />
                            
                            {/* أيقونة احتياطية في الخلفية */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                              <div className="text-gray-400 flex flex-col items-center justify-center p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-center">{product.name}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          // عرض أيقونة للمنتجات التي ليس لها صورة
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                            <div className="text-gray-400 flex flex-col items-center justify-center p-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-center">{product.name}</span>
                            </div>
                          </div>
                        )}
                      </Link>
                      
                      {/* العلامات */}
                      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                        {product.discount_price && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200 font-medium">
                            {calculateDiscount(Number(product.price), Number(product.discount_price))}
                          </Badge>
                        )}
                        {product.is_new && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium">
                            جديد
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <Link to={`/products/${product.slug}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                          {typeof product.category === 'object' && product.category !== null
                            ? (product.category as { name: string }).name
                            : product.category}
                        </Link>
                        <Link to={`/products/${product.slug}`} className="block font-semibold mb-2 hover:text-primary transition-colors">
                          {product.name}
                        </Link>
                        
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {product.description}
                        </p>
                        
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-3.5 h-3.5 ${i < Math.floor(product.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">{product.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex flex-col">
                          {product.discount_price ? (
                            <>
                              <span className="text-base font-bold text-primary">
                                {product.discount_price.toLocaleString()} د.ج
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                {product.price.toLocaleString()} د.ج
                              </span>
                            </>
                          ) : (
                            <span className="text-base font-bold text-primary">
                              {product.price.toLocaleString()} د.ج
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button asChild variant="secondary" size="sm" className="h-9 rounded-lg">
                            <Link to={`/products/${product.slug}`} className="flex items-center gap-2">
                              <Eye className="h-4 w-4 mr-1" />
                              عرض المنتج
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-lg"
                            onClick={() => toggleFavorite(product.id)}
                          >
                            <Heart className={`h-4 w-4 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
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
          // عرض حالة عدم وجود منتجات
          <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
            <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">لا توجد منتجات متاحة</h3>
            <p className="text-muted-foreground">لم يتم العثور على منتجات مميزة في هذا القسم.</p>
          </div>
        )}
        
        <div className="text-center mt-16">
          <Button asChild variant="outline" size="lg" className="rounded-full px-8">
            <Link to="/products" className="flex items-center gap-2">
              تصفح جميع المنتجات
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
