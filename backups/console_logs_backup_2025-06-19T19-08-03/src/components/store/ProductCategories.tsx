import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Tag, Package, Laptop, Smartphone, Headphones, Monitor, ShoppingBag, FolderRoot, Folder, Layers } from 'lucide-react';
import { Category } from '@/api/store';
import { cn } from '@/lib/utils';
import type { Category as CategoryType } from '@/lib/api/categories';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

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
    showProductCount?: boolean;
    showImages?: boolean;
    displayStyle?: string;
    backgroundStyle?: string;
    showViewAllButton?: boolean;
    _previewCategories?: string[];
  };
}

// تعديل واجهة الفئة لتشمل حقل صورة الغلاف والأيقونة
interface ExtendedCategory extends Omit<Category, 'product_count'> {
  imageUrl: string;
  icon?: keyof typeof categoryIcons;
  color?: string;
  productsCount: number;
}

// أيقونات الفئات
const categoryIcons = {
  devices: Package,
  laptops: Laptop,
  phones: Smartphone,
  headphones: Headphones,
  monitors: Monitor,
  accessories: ShoppingBag,
  FolderRoot: FolderRoot,
  folder: Folder,
  layers: Layers,
};

// إنشاء الفئات الافتراضية مع استخدام الترجمة
const getDefaultCategories = (t: any): ExtendedCategory[] => [
  {
    id: '1',
    name: t('productCategories.defaultCategories.electronics.name'),
    description: t('productCategories.defaultCategories.electronics.description'),
    slug: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=1901',
    icon: 'devices',
    color: 'from-blue-500 to-indigo-600',
    productsCount: 124
  },
  {
    id: '2',
    name: t('productCategories.defaultCategories.computers.name'),
    description: t('productCategories.defaultCategories.computers.description'),
    slug: 'computers',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1471',
    icon: 'laptops',
    color: 'from-sky-500 to-cyan-600',
    productsCount: 76
  },
  {
    id: '3',
    name: t('productCategories.defaultCategories.smartphones.name'),
    description: t('productCategories.defaultCategories.smartphones.description'),
    slug: 'smartphones',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1580',
    icon: 'phones',
    color: 'from-emerald-500 to-teal-600',
    productsCount: 92
  },
  {
    id: '4',
    name: t('productCategories.defaultCategories.headphones.name'),
    description: t('productCategories.defaultCategories.headphones.description'),
    slug: 'headphones',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470',
    icon: 'headphones',
    color: 'from-amber-500 to-orange-600',
    productsCount: 53
  },
  {
    id: '5',
    name: t('productCategories.defaultCategories.monitors.name'),
    description: t('productCategories.defaultCategories.monitors.description'),
    slug: 'monitors',
    imageUrl: 'https://images.unsplash.com/photo-1527219525722-f9767a7f2884?q=80&w=1473',
    icon: 'monitors',
    color: 'from-violet-500 to-purple-600',
    productsCount: 47
  },
  {
    id: '6',
    name: t('productCategories.defaultCategories.accessories.name'),
    description: t('productCategories.defaultCategories.accessories.description'),
    slug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1399',
    icon: 'accessories',
    color: 'from-rose-500 to-pink-600',
    productsCount: 118
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
      
      // استخراج عدد المنتجات من الفئة المستلمة من API
      const productsCount = category.product_count || category.productsCount || 0;

      return {
        id: category.id,
        name: category.name,
        description: category.description || t('productCategories.fallbackDescription'),
        slug: category.slug,
        imageUrl: category.image_url || category.imageUrl || '', 
        icon: iconKey,
        color: getRandomGradient(),
        productsCount: productsCount
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
    showProductCount: true,
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

  // 🚀 استخدام البيانات المحسنة مباشرة بدلاً من طلبات API إضافية
  const displayedCategories = useMemo(() => {
    
    // 🎯 إعطاء أولوية لبيانات المعاينة من المحرر
    let categoriesToUse = optimizedCategories;
    // إذا كانت هناك فئات معاينة، تصفية الفئات المحسنة حسب المعاينة
    if (settings._previewCategories && settings._previewCategories.length > 0 && optimizedCategories.length > 0) {
      categoriesToUse = optimizedCategories.filter(cat => 
        settings._previewCategories!.includes(cat.id)
      );
    }
    
    // إذا كانت هناك فئات محسنة، استخدمها مباشرة
    if (useRealCategories && categoriesToUse && categoriesToUse.length > 0) {
      let processedCategories = mapRealCategoriesToExtended(categoriesToUse, t);

      // تطبيق الفلترة حسب الإعدادات
      if (settings.selectionMethod === 'manual' && settings.selectedCategories && settings.selectedCategories.length > 0) {
        
        processedCategories = processedCategories.filter(cat => {
          const isSelected = settings.selectedCategories!.includes(cat.id);
          return isSelected;
        });
        
      } else if (settings.selectionMethod === 'popular') {
        processedCategories = processedCategories.sort((a, b) => b.productsCount - a.productsCount);
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
        className="block group rounded-xl overflow-hidden shadow-sm border border-border/30 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-300 ease-in-out relative"
        aria-current={isActive ? 'page' : undefined}
      >
        <motion.div 
          className={cn(
            "h-full flex flex-col bg-card",
            isActive && "ring-2 ring-primary/80 ring-inset"
          )}
          whileHover={{ 
            y: -4,
            transition: { duration: 0.25 }
          }}
        >
          {/* قسم الصورة / الأيقونة */}
          {(settings.showImages ?? true) && (
          <div 
            className={cn(
              "relative aspect-[16/10] overflow-hidden",
              !category.imageUrl && "bg-gradient-to-br flex items-center justify-center",
              !category.imageUrl && category.color
            )}
          >
            {category.imageUrl ? (
              <img 
                src={category.imageUrl} 
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
              />
            ) : (
              <IconComponent className="h-16 w-16 text-white/90 drop-shadow-lg" /> 
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent"></div>
            
              {/* شارة عدد المنتجات */}
              {(settings.showProductCount ?? true) && (
            <Badge 
              variant="secondary" 
              className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm text-foreground text-xs font-medium"
            >
              {category.productsCount} {t('productCategories.products')}
            </Badge>
              )}
          </div>
          )}
          
          {/* قسم النص */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1 text-foreground group-hover:text-primary transition-colors duration-200">{category.name}</h3>
              {(settings.showDescription ?? true) && (
              <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{category.description}</p>
              )}
            </div>
            <div className="mt-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-primary opacity-80 group-hover:opacity-100 group-hover:bg-primary/10 transition-all duration-200 px-0 hover:px-2"
                tabIndex={-1}
              >
                {t('productCategories.browseNow')}
                <ArrowRight className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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
    <section className="py-12 md:py-16 lg:py-20 bg-muted/30 dark:bg-muted/10">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
            {title || t('productCategories.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {description || t('productCategories.description')}
          </p>
          {/* عرض رسالة توضيحية عند استخدام البيانات التجريبية */}
          {!isLoading && optimizedCategories.length === 0 && displayedCategories.length > 0 && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                <span className="font-medium">{t('productCategories.demoMessage')}</span> {t('productCategories.demoDescription')}
              </p>
            </div>
          )}
        </div>
        
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ 
            visible: { transition: { staggerChildren: 0.08 } } 
          }}
        >
          {displayedCategories.map((category) => (
            <motion.div key={category.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
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
