import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, ChevronRight, Star, ArrowRight, GripHorizontal, Layers, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Product } from '@/api/store';
import { getProducts } from '@/lib/api/products';
import { getFeaturedProducts as libGetFeaturedProducts } from '@/lib/api/products';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTenant } from '@/context/TenantContext';

// تعريف النوع لبيانات المنتج من قاعدة البيانات
interface DBProduct {
  id: string;
  name: string;
  description: string;
  price: string | number;
  compare_at_price?: string | number | null;
  thumbnail_image: string;
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
  products?: Product[];
  selectionMethod?: 'automatic' | 'manual';
  selectionCriteria?: 'featured' | 'best_selling' | 'newest' | 'discounted';
  selectedProducts?: string[]; // تحديث الاسم ليطابق إعدادات محرر المتجر
  displayCount?: number;
  displayType?: 'grid' | 'list'; // إضافة نوع العرض لمطابقة إعدادات محرر المتجر
  organizationId?: string; // إضافة معرف المؤسسة
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
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: Number(dbProduct.price || 0),
    discount_price: dbProduct.compare_at_price ? Number(dbProduct.compare_at_price) : undefined,
    imageUrl: dbProduct.thumbnail_image || '',
    category: categoryName,
    is_new: !!dbProduct.is_new,
    stock_quantity: Number(dbProduct.stock_quantity || 0),
    slug: typeof dbProduct.slug === 'string' ? dbProduct.slug : dbProduct.id,
    rating: 4.5 // قيمة افتراضية
  };
};

const FeaturedProducts = ({
  title = 'منتجاتنا المميزة',
  description = 'اكتشف أفضل منتجاتنا المختارة بعناية لتناسب احتياجاتك',
  products: initialProducts,
  selectionMethod = 'automatic',
  selectionCriteria = 'featured',
  selectedProducts = [], // تحديث الاسم ليطابق الواجهة
  displayCount = 4,
  displayType = 'grid', // استخدام نوع العرض من الإعدادات
  organizationId // معرف المؤسسة
}: FeaturedProductsProps) => {
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [viewType, setViewType] = useState<'grid' | 'list'>(displayType);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // استخدام سياق المؤسسة للحصول على معرف المؤسسة إذا لم يتم تمريره
  const { currentOrganization, isLoading: isTenantLoading } = useTenant();
  const effectiveOrgId = organizationId || currentOrganization?.id;
  
  // جلب المنتجات من قاعدة البيانات عند الحاجة
  useEffect(() => {
    // إذا كان سياق المؤسسة لا يزال يتم تحميله، انتظر
    if (isTenantLoading) {
      console.log('تحميل سياق المؤسسة، انتظار...');
      return;
    }
    
    // إذا تم تمرير المنتجات مباشرة، استخدمها
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
      return;
    }
    
    // التحقق من وجود معرف المؤسسة
    if (!effectiveOrgId) {
      console.warn('لم يتم تمرير معرف المؤسسة إلى مكون المنتجات المميزة. سيتم استخدام المنتجات الافتراضية.');
      setProducts(defaultProducts.slice(0, displayCount));
      return;
    }
    
    // تحديد معرف المؤسسة للتأكيد
    console.log('FeaturedProducts: استخدام معرف المؤسسة:', effectiveOrgId);
    
    // جلب المنتجات حسب الطريقة المحددة
    const fetchProductData = async () => {
      setLoading(true);
      try {
        if (selectionMethod === 'manual' && selectedProducts.length > 0) {
          // جلب المنتجات المحددة يدويًا
          const allProducts = await getProducts(effectiveOrgId);
          // تصفية المنتجات حسب المعرفات المحددة
          const selectedFilteredProducts = allProducts.filter(p => selectedProducts.includes(p.id));
          // تحويل البيانات إلى تنسيق المتجر
          const formattedProducts = selectedFilteredProducts.map(p => convertDatabaseProductToStoreProduct(p as unknown as DBProduct));
          setProducts(formattedProducts.slice(0, displayCount));
        } else {
          // جلب المنتجات حسب المعيار
          let productData: Product[] = [];
          
          if (selectionCriteria === 'featured') {
            // استخدام الوظيفة التي تم إعادة تسميتها
            const featuredProducts = await libGetFeaturedProducts(false, effectiveOrgId);
            // تحويل البيانات إلى تنسيق المتجر
            productData = featuredProducts.map(p => convertDatabaseProductToStoreProduct(p as unknown as DBProduct));
          } else if (selectionCriteria === 'newest') {
            // يمكن تنفيذ طلب خاص للمنتجات الجديدة
            const allProducts = await getProducts(effectiveOrgId);
            // ترتيب المنتجات حسب تاريخ الإنشاء (الأحدث أولاً)
            const sortedProducts = [...allProducts].sort((a, b) => {
              // افتراض أن created_at موجود كخاصية في البيانات
              const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
              const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
            productData = sortedProducts.map(p => convertDatabaseProductToStoreProduct(p as unknown as DBProduct));
          } else if (selectionCriteria === 'discounted') {
            // يمكن تنفيذ طلب خاص للمنتجات ذات الخصومات
            const allProducts = await getProducts(effectiveOrgId);
            // تصفية المنتجات التي لها خصم
            const discountedProducts = allProducts.filter(p => 
              p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
            );
            productData = discountedProducts.map(p => convertDatabaseProductToStoreProduct(p as unknown as DBProduct));
          } else if (selectionCriteria === 'best_selling') {
            // هذا يتطلب بيانات المبيعات ولا يمكن تنفيذه هنا بدون طلب مخصص
            // استخدام البيانات الافتراضية كمثال
            const allProducts = await getProducts(effectiveOrgId);
            productData = allProducts.map(p => convertDatabaseProductToStoreProduct(p as unknown as DBProduct));
          } else {
            // في حالة عدم وجود منتجات حقيقية، استخدم البيانات الافتراضية
            productData = defaultProducts;
          }
          
          setProducts(productData.slice(0, displayCount));
        }
      } catch (error) {
        console.error('خطأ في جلب المنتجات المميزة:', error);
        // في حالة الخطأ، استخدم البيانات الافتراضية
        setProducts(defaultProducts.slice(0, displayCount));
      } finally {
        setLoading(false);
      }
    };
    
    fetchProductData();
  }, [initialProducts, selectionMethod, selectionCriteria, selectedProducts, displayCount, effectiveOrgId, isTenantLoading]);
  
  // تحديث نوع العرض عندما تتغير الإعدادات
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
        ) : products && products.length > 0 ? (
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
            {products.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                {viewType === 'grid' ? (
                  <Card className="group h-full overflow-hidden border border-border/50 hover:border-primary/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl">
                    <div className="relative overflow-hidden aspect-square">
                      <Link to={`/products/${product.slug}`}>
                        <img 
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        />
                      </Link>
                      
                      {/* العلامات */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                        {product.is_new && (
                          <Badge className="bg-blue-500/90 hover:bg-blue-600 backdrop-blur-sm rounded-lg text-[10px] px-3 py-1 font-semibold shadow-md">جديد</Badge>
                        )}
                        {product.discount_price && (
                          <Badge className="bg-red-500/90 hover:bg-red-600 backdrop-blur-sm rounded-lg text-[10px] px-3 py-1 font-semibold shadow-md">
                            {calculateDiscount(product.price, product.discount_price)}
                          </Badge>
                        )}
                      </div>
                      
                      {/* أزرار الإجراءات */}
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                        {product.category}
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
                      <Link to={`/products/${product.slug}`}>
                        <img 
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      
                      {/* العلامات */}
                      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                        {product.is_new && (
                          <Badge className="bg-blue-500/90 hover:bg-blue-600 backdrop-blur-sm rounded-lg text-[10px] px-3 py-1 font-semibold shadow-md">جديد</Badge>
                        )}
                        {product.discount_price && (
                          <Badge className="bg-red-500/90 hover:bg-red-600 backdrop-blur-sm rounded-lg text-[10px] px-3 py-1 font-semibold shadow-md">
                            {calculateDiscount(product.price, product.discount_price)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <Link to={`/products/${product.slug}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                          {product.category}
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