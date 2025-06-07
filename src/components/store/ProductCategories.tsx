import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Tag, Package, Laptop, Smartphone, Headphones, Monitor, ShoppingBag, FolderRoot, Folder, Layers } from 'lucide-react';
import { Category } from '@/api/store';
import { cn } from '@/lib/utils';
import { getCategories } from '@/lib/api/categories';
import type { Category as CategoryType } from '@/lib/api/categories';
import { useTenant } from '@/context/TenantContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ProductCategoriesProps {
  title?: string;
  description?: string;
  categories?: ExtendedCategory[];
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

const defaultCategories: ExtendedCategory[] = [
  {
    id: '1',
    name: 'إلكترونيات',
    description: 'أحدث الأجهزة الإلكترونية والمنتجات التقنية',
    slug: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=1901',
    icon: 'devices',
    color: 'from-blue-500 to-indigo-600',
    productsCount: 124
  },
  {
    id: '2',
    name: 'أجهزة كمبيوتر',
    description: 'حواسيب محمولة ومكتبية بأحدث المواصفات',
    slug: 'computers',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1471',
    icon: 'laptops',
    color: 'from-sky-500 to-cyan-600',
    productsCount: 76
  },
  {
    id: '3',
    name: 'هواتف ذكية',
    description: 'تشكيلة واسعة من أحدث الهواتف الذكية',
    slug: 'smartphones',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1580',
    icon: 'phones',
    color: 'from-emerald-500 to-teal-600',
    productsCount: 92
  },
  {
    id: '4',
    name: 'سماعات',
    description: 'سماعات سلكية ولاسلكية عالية الجودة',
    slug: 'headphones',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470',
    icon: 'headphones',
    color: 'from-amber-500 to-orange-600',
    productsCount: 53
  },
  {
    id: '5',
    name: 'شاشات',
    description: 'شاشات بأحجام مختلفة ودقة عالية',
    slug: 'monitors',
    imageUrl: 'https://images.unsplash.com/photo-1527219525722-f9767a7f2884?q=80&w=1473',
    icon: 'monitors',
    color: 'from-violet-500 to-purple-600',
    productsCount: 47
  },
  {
    id: '6',
    name: 'إكسسوارات',
    description: 'ملحقات وإكسسوارات متنوعة للأجهزة الإلكترونية',
    slug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1399',
    icon: 'accessories',
    color: 'from-rose-500 to-pink-600',
    productsCount: 118
  }
];

// تحويل الفئات الحقيقية إلى الصيغة المطلوبة للعرض
const mapRealCategoriesToExtended = (categories: CategoryType[]): ExtendedCategory[] => {
  return categories
    .filter(cat => cat.is_active) // عرض الفئات النشطة فقط
    .map(category => {
      let iconKey: keyof typeof categoryIcons = 'layers'; // استخدام layers كافتراضي
      if (category.icon && category.icon in categoryIcons) {
        iconKey = category.icon as keyof typeof categoryIcons;
      }
      
      // استخراج عدد المنتجات من الفئة المستلمة من API
      // @ts-ignore - نتجاهل خطأ TypeScript لأن واجهة Category قد تختلف بين الملفات
      const productsCount = category.product_count || 0;

      return {
        id: category.id,
        name: category.name,
        description: category.description || 'تصفح المنتجات في هذه الفئة', // وصف افتراضي أفضل
        slug: category.slug,
        imageUrl: category.image_url || '', 
        icon: iconKey,
        color: getRandomGradient(),
        productsCount: productsCount // استخدام القيمة الفعلية بدلاً من الصفر الافتراضي
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
  title = 'تصفح فئات منتجاتنا',
  description = 'أفضل الفئات المختارة لتلبية احتياجاتك',
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
    showViewAllButton: true
  }
}: ProductCategoriesProps) => {
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get('category');
  const [realCategories, setRealCategories] = useState<ExtendedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrganization } = useTenant();
  
  const activeCategoryId = selectedCategoryId || urlCategoryId;

  // جلب الفئات الحقيقية فقط
  useEffect(() => {
    if (useRealCategories && currentOrganization?.id) {
      const fetchCategoriesData = async () => {
        try {
          setIsLoading(true);
          const organizationId = currentOrganization.id;
          const fetchedCategories = await getCategories(organizationId);
          const mappedCategories = mapRealCategoriesToExtended(fetchedCategories);
          setRealCategories(mappedCategories);
          
          console.log('📦 تم تحميل', mappedCategories.length, 'فئة في ProductCategories');
          if (Object.keys(settings).length > 0) {
            console.log('⚙️ إعدادات المكون:', settings);
          } else {
            console.log('⚠️ إعدادات المكون فارغة - سيتم استخدام الافتراضية');
          }
        } catch (error) {
          console.error('خطأ في تحميل الفئات في ProductCategories:', error);
          setRealCategories([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCategoriesData();
    }
  }, [useRealCategories, currentOrganization?.id]);

  // تطبيق منطق الاختيار والفلترة مع useMemo لتجنب اللوب
  const displayCategories = useMemo(() => {
    if (!useRealCategories) return [];
    
    const currentSettings = {
      selectionMethod: settings.selectionMethod || 'automatic',
      selectedCategories: settings.selectedCategories || [],
      displayCount: settings.displayCount || settings.maxCategories || 6
    };
    
    console.log('🔍 إعادة حساب الفئات - المتاحة:', realCategories.length, 'الإعدادات:', currentSettings);
    
    let filteredCategories = [...realCategories];
    
    // تطبيق منطق الاختيار
    switch (currentSettings.selectionMethod) {
      case 'manual':
        if (currentSettings.selectedCategories.length > 0) {
          console.log('✅ اختيار يدوي - فئات محددة:', currentSettings.selectedCategories);
          filteredCategories = currentSettings.selectedCategories
            .map(id => realCategories.find(cat => cat.id === id))
            .filter(Boolean) as ExtendedCategory[];
          console.log('📦 النتيجة:', filteredCategories.map(c => c.name));
        } else {
          console.log('⚠️ اختيار يدوي لكن لا توجد فئات محددة');
          filteredCategories = [];
        }
        break;
      case 'popular':
        filteredCategories = [...realCategories].sort((a, b) => b.productsCount - a.productsCount);
        break;
      case 'newest':
        // ترتيب حسب الأحدث (يمكن إضافة حقل تاريخ الإنشاء لاحقاً)
        filteredCategories = [...realCategories];
        break;
      case 'automatic':
      default:
        // الترتيب الافتراضي
        filteredCategories = [...realCategories];
        break;
    }
    
    // تطبيق حد العرض
    filteredCategories = filteredCategories.slice(0, currentSettings.displayCount);
    
    console.log('✅ الفئات النهائية:', filteredCategories.length, filteredCategories.map(c => c.name));
    return filteredCategories;
  }, [useRealCategories, realCategories, settings.selectionMethod, settings.selectedCategories, settings.displayCount, settings.maxCategories]);

  // بطاقة الفئة المحسّنة
  const CategoryCard = ({ category }: { category: ExtendedCategory }) => {
    const isActive = category.id === activeCategoryId;
    let IconComponent = categoryIcons[category.icon || 'layers'];
    
    return (
      <Link 
        to={`/products?category=${category.id}`}
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
              {category.productsCount} منتج
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
                تصفح الآن
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

  // عرض رسالة إذا لم توجد فئات
  if (!isLoading && displayCategories.length === 0 && useRealCategories) {
    return (
      <section className="py-12 md:py-16 lg:py-20 bg-muted/30 dark:bg-muted/10 text-center">
        <div className="container px-4 mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">لا توجد فئات لعرضها حاليًا</h2>
          <p className="text-muted-foreground">يرجى المحاولة مرة أخرى لاحقًا أو إضافة فئات جديدة من لوحة التحكم.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-muted/30 dark:bg-muted/10">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">{title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
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
          {displayCategories.map((category) => (
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
