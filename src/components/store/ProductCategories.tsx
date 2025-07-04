import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Tag, Laptop, Smartphone, Headphones, Monitor, ShoppingBag, FolderRoot, Folder, Layers } from 'lucide-react';
import { Category } from '@/api/store';
import { cn } from '@/lib/utils';
import type { Category as CategoryType } from '@/lib/api/categories';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { optimizeStoreImage, addPreloadLinks } from '@/lib/imageOptimization';

// مكون محسن لتحميل الصور مع placeholder
const OptimizedImage = ({ 
  src, 
  alt, 
  className, 
  fallbackColor 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  fallbackColor?: string; 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (src) {
      const img = new Image();
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageError(true);
      img.src = src;
    }
  }, [src]);

  if (imageError || !src) {
    return (
      <div className={cn(
        "w-full h-full bg-gradient-to-br flex items-center justify-center",
        fallbackColor || 'from-primary/20 to-secondary/20'
      )}>
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
          <Layers className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-muted/20 to-muted/5 flex items-center justify-center p-3 sm:p-4">
      {/* Skeleton placeholder أثناء التحميل */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/40 to-muted/20 animate-pulse rounded-t-2xl flex items-center justify-center">
          <div className="w-16 h-16 bg-muted/60 rounded-full animate-pulse"></div>
        </div>
      )}
      
      {/* الصورة الفعلية */}
      <img 
        src={src} 
        alt={alt}
        className={cn(
          "w-full h-full object-contain transition-all duration-500 drop-shadow-sm",
          imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
          className
        )}
        loading="eager" // تغيير من lazy إلى eager للصور المهمة
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  );
};

interface ProductCategoriesProps {
  title?: string;
  description?: string;
  categories?: ExtendedCategory[]; // استخدام البيانات المحسنة من الخدمة
  useRealCategories?: boolean;
  selectedCategoryId?: string | null;
  // إعدادات من المحرر
  settings?: {
    selectionMethod?: 'automatic' | 'manual' | 'popular' | 'newest';
    selectedCategories?: string[];
    displayCount?: number;
    maxCategories?: number;
    showDescription?: boolean;
    showImages?: boolean;
    displayStyle?: string;
    backgroundStyle?: string;
    showViewAllButton?: boolean;
    _previewCategories?: string[] | ExtendedCategory[];
  };
}

// تعديل واجهة الفئة لتشمل حقل صورة الغلاف والأيقونة
interface ExtendedCategory extends Omit<Category, 'product_count'> {
  imageUrl: string;
  icon?: keyof typeof categoryIcons;
  color?: string;
}

// أيقونات الفئات
const categoryIcons = {
  devices: Layers,
  laptops: Laptop,
  phones: Smartphone,
  headphones: Headphones,
  monitors: Monitor,
  accessories: ShoppingBag,
  FolderRoot: FolderRoot,
  folder: Folder,
  layers: Layers,
};

// استخدام مكتبة تحسين الصور الموحدة
const optimizeImageUrl = (url: string): string => {
  return optimizeStoreImage(url, 'category');
};

// إنشاء الفئات الافتراضية مع استخدام الترجمة
const getDefaultCategories = (t: any): ExtendedCategory[] => [
  {
    id: '1',
    name: t('productCategories.defaultCategories.electronics.name'),
    description: t('productCategories.defaultCategories.electronics.description'),
    slug: 'electronics',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=1901'),
    icon: 'devices',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: '2',
    name: t('productCategories.defaultCategories.computers.name'),
    description: t('productCategories.defaultCategories.computers.description'),
    slug: 'computers',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1471'),
    icon: 'laptops',
    color: 'from-sky-500 to-cyan-600'
  },
  {
    id: '3',
    name: t('productCategories.defaultCategories.smartphones.name'),
    description: t('productCategories.defaultCategories.smartphones.description'),
    slug: 'smartphones',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1580'),
    icon: 'phones',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: '4',
    name: t('productCategories.defaultCategories.headphones.name'),
    description: t('productCategories.defaultCategories.headphones.description'),
    slug: 'headphones',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470'),
    icon: 'headphones',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: '5',
    name: t('productCategories.defaultCategories.monitors.name'),
    description: t('productCategories.defaultCategories.monitors.description'),
    slug: 'monitors',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1527219525722-f9767a7f2884?q=80&w=1473'),
    icon: 'monitors',
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: '6',
    name: t('productCategories.defaultCategories.accessories.name'),
    description: t('productCategories.defaultCategories.accessories.description'),
    slug: 'accessories',
    imageUrl: optimizeImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1399'),
    icon: 'accessories',
    color: 'from-rose-500 to-pink-600'
  }
];

// تحويل الفئات الحقيقية إلى الصيغة المطلوبة للعرض
const mapRealCategoriesToExtended = (categories: any[], t: any): ExtendedCategory[] => {
  return categories
    .filter(cat => cat.is_active !== false) // عرض الفئات النشطة فقط
    .map(category => {
      let iconKey: keyof typeof categoryIcons = 'layers'; // استخدام layers كافتراضي
      if (category.icon && category.icon in categoryIcons) {
        iconKey = category.icon as keyof typeof categoryIcons;
      }
      
      return {
        id: category.id,
        name: category.name,
        description: category.description || t('productCategories.fallbackDescription'),
        slug: category.slug,
        imageUrl: category.image_url || category.imageUrl ? optimizeImageUrl(category.image_url || category.imageUrl) : '', 
        icon: iconKey,
        color: getRandomGradient()
      };
    });
};

// الحصول على تدرج لوني عشوائي للفئات التي ليس لها صور
const getRandomGradient = (): string => {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-sky-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-red-500 to-red-600',
    'from-green-500 to-green-600',
  ];
  
  return gradients[Math.floor(Math.random() * gradients.length)];
};

const ProductCategories = ({
  title,
  description,
  categories: optimizedCategories = [], // استخدام البيانات المحسنة من الخدمة
  useRealCategories = true,
  selectedCategoryId = null,
  settings = {
    selectionMethod: 'automatic',
    selectedCategories: [],
    displayCount: 6,
    maxCategories: 6,
    showDescription: true,
    showImages: true,
    displayStyle: 'cards',
    backgroundStyle: 'light',
    showViewAllButton: true,
    _previewCategories: []
  }
}: ProductCategoriesProps) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get('category');
  const [isLoading, setIsLoading] = useState(false);
  
  const activeCategoryId = selectedCategoryId || urlCategoryId;

  // Preload صور الفئات المهمة
  useEffect(() => {
    if (optimizedCategories && optimizedCategories.length > 0) {
      const imageUrls = optimizedCategories
        .slice(0, 6)
        .map(category => category.imageUrl)
        .filter(Boolean);
      
      if (imageUrls.length > 0) {
        addPreloadLinks(imageUrls);
      }
    }
  }, [optimizedCategories]);

  // 🚀 استخدام البيانات المحسنة مباشرة بدلاً من طلبات API إضافية
  const displayedCategories = useMemo(() => {
    
    // 🎯 إعطاء أولوية لبيانات المعاينة من المحرر
    let categoriesToUse = optimizedCategories;
    
    // 🚀 معالجة محسنة لبيانات المعاينة من المحرر
    if (settings._previewCategories && settings._previewCategories.length > 0) {
      // التحقق من نوع البيانات - إذا كانت objects بدلاً من IDs
      if (typeof settings._previewCategories[0] === 'object') {
        categoriesToUse = settings._previewCategories as ExtendedCategory[];
      } else if (optimizedCategories.length > 0) {
        // إذا كانت IDs، فلتر الفئات المحسنة
        categoriesToUse = optimizedCategories.filter(cat => 
          (settings._previewCategories as string[]).includes(cat.id)
        );
      }
    }
    
    // إذا كانت هناك فئات محسنة أو فئات من props، استخدمها مباشرة
    if (useRealCategories && categoriesToUse && categoriesToUse.length > 0) {
      let processedCategories = mapRealCategoriesToExtended(categoriesToUse, t);

      // تطبيق الفلترة حسب الإعدادات
      if (settings.selectionMethod === 'manual' && settings.selectedCategories && settings.selectedCategories.length > 0) {
        
        processedCategories = processedCategories.filter(cat => {
          const isSelected = settings.selectedCategories!.includes(cat.id);
          return isSelected;
        });
        
      } else if (settings.selectionMethod === 'popular') {
        // الترتيب حسب الشعبية - يمكن إضافة منطق ترتيب آخر لاحقاً
        processedCategories = processedCategories;
      } else if (settings.selectionMethod === 'newest') {
        // يمكن إضافة ترتيب حسب تاريخ الإنشاء لاحقاً
        processedCategories = processedCategories.reverse();
      } else {
      }
      
      // تحديد العدد المطلوب عرضه
      const displayCount = settings.displayCount || settings.maxCategories || 6;
      
      const finalCategories = processedCategories.slice(0, displayCount);
      
      return finalCategories;
    }
    
    // استخدام الفئات الافتراضية كخيار أخير
    const displayCount = settings.displayCount || settings.maxCategories || 6;
    const defaultResult = getDefaultCategories(t).slice(0, displayCount);
    
    return defaultResult;
  }, [optimizedCategories, useRealCategories, settings, t]);

  // إزالة useEffect للطلبات الإضافية - نستخدم البيانات المحسنة فقط
  useEffect(() => {
    // لا حاجة لطلبات API إضافية - البيانات تأتي من الخدمة المحسنة
    setIsLoading(false);
  }, [optimizedCategories]);

  // بطاقة الفئة المحسّنة
  const CategoryCard = ({ category }: { category: ExtendedCategory }) => {
    const isActive = category.id === activeCategoryId;
    let IconComponent = categoryIcons[category.icon || 'layers'];
    
    return (
      <Link 
        to={optimizedCategories.length > 0 ? `/products?category=${category.id}` : `/products?demo_category=${category.slug}`}
        className="block group rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-border/60 hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-300 ease-out relative bg-card hover:bg-card/95"
        aria-current={isActive ? 'page' : undefined}
      >
        <motion.div 
          className={cn(
            "h-full flex flex-col relative overflow-hidden",
            isActive && "ring-2 ring-primary/60 ring-inset"
          )}
          whileHover={{ 
            y: -3,
            transition: { duration: 0.2, ease: "easeOut" }
          }}
          whileTap={{ scale: 0.995 }}
        >
          {/* قسم الصورة / الأيقونة المحسن */}
          {(settings.showImages ?? true) && (
          <div 
            className={cn(
              "relative aspect-[3/2] sm:aspect-[4/3] overflow-hidden rounded-t-2xl",
              !category.imageUrl && "bg-gradient-to-br flex items-center justify-center",
              !category.imageUrl && category.color
            )}
          >
            {category.imageUrl ? (
              <>
                <OptimizedImage 
                  src={category.imageUrl} 
                  alt={category.name}
                  className="group-hover:scale-102"
                  fallbackColor={category.color}
                />
                {/* تأثير subtle للـ hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </>
            ) : (
              <>
                {/* دائرة خلفية بسيطة للأيقونة */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:bg-white/35 group-hover:border-white/30 transition-all duration-300">
                  <IconComponent className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-105" />
                </div>
                
                {/* تأثير subtle للخلفية */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </>
            )}
            
            {/* تحسين التدرج */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

          </div>
          )}
          
          {/* قسم النص المحسن */}
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between relative">
            <div className="relative z-10">
                            <div className="mb-3">
                <h3 className="font-bold text-base sm:text-xl mb-1 text-foreground group-hover:text-primary/80 dark:group-hover:text-primary transition-colors duration-300 line-clamp-2 tracking-wide">{category.name}</h3>
              </div>
              
              {(settings.showDescription ?? true) && (
              <p className="text-muted-foreground text-sm sm:text-base line-clamp-2 mb-4 hidden sm:block leading-relaxed">{category.description}</p>
              )}
            </div>
            
            <div className="mt-auto relative z-10">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-muted-foreground group-hover:text-primary/80 dark:group-hover:text-primary group-hover:bg-primary/5 dark:group-hover:bg-primary/10 transition-all duration-300 px-3 py-2 text-sm font-medium rounded-lg"
                tabIndex={-1}
              >
                <span className="flex items-center">
                  <span className="hidden sm:inline">{t('productCategories.browseNow')}</span>
                  <span className="sm:hidden">{t('productCategories.browse')}</span>
                </span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  };

  // عرض هياكل عظمية أثناء التحميل
  if (isLoading && useRealCategories) {
    return (
      <section className="py-12 md:py-16 lg:py-20 bg-muted/30 dark:bg-muted/10">
        <div className="container px-4 mx-auto">
          <Skeleton className="h-8 w-1/3 mx-auto mb-4" />
          <Skeleton className="h-5 w-1/2 mx-auto mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/30 overflow-hidden bg-card">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-5/6 mb-4" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 lg:py-24 relative overflow-hidden">
      {/* خلفية متدرجة ديناميكية */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-secondary/5"></div>
      
      {/* عناصر زخرفية */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-tr from-secondary/10 to-primary/10 rounded-full blur-3xl"></div>
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-300% animate-gradient-x">
              {title || t('productCategories.title')}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary mx-auto mb-6 rounded-full"></div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {description || t('productCategories.description')}
            </p>
          </motion.div>
          {/* عرض رسالة توضيحية محسنة عند استخدام البيانات التجريبية */}
          {!isLoading && optimizedCategories.length === 0 && displayedCategories.length > 0 && (
            <motion.div 
              className="mt-8 mx-auto max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl backdrop-blur-sm shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center mr-3">
                    <Tag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="font-semibold text-amber-800 dark:text-amber-200">{t('productCategories.demoMessage')}</span>
                </div>
                <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed text-center">
                  {t('productCategories.demoDescription')}
                </p>
              </div>
            </motion.div>
          )}
        </div>
        
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ 
            visible: { transition: { staggerChildren: 0.12 } } 
          }}
        >
          {displayedCategories.map((category, index) => (
            <motion.div 
              key={category.id} 
              variants={{ 
                hidden: { opacity: 0, y: 30, scale: 0.9 }, 
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    duration: 0.6,
                    ease: "easeOut",
                    delay: index * 0.1
                  }
                }
              }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <CategoryCard category={category} />
            </motion.div>
          ))}
        </motion.div>
        
        {/* زر اختياري لعرض كل الفئات إذا كان العدد كبيرًا */}
        {/* 
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            عرض كل الفئات <ArrowRight className="h-4 w-4 mr-2" />
          </Button>
        </div> 
        */}
      </div>
    </section>
  );
};

export default ProductCategories;
