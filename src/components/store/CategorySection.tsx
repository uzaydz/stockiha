import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Tag, Package, Laptop, Smartphone, Headphones, Monitor, ShoppingBag, FolderRoot, Folder, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/context/TenantContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/supabase-client';

// واجهة الفئة الممتدة للعرض
interface ExtendedCategory {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  imageUrl?: string;
  icon?: string;
  color?: string;
  productsCount?: number;
}

// واجهة إعدادات المكون
interface CategorySectionProps {
  title?: string;
  description?: string;
  selectionMethod?: 'random' | 'bestselling' | 'manual';
  maxCategories?: number;
  showProductCount?: boolean;
  showDescription?: boolean;
  selectedCategories?: string[];
  displayStyle?: 'cards' | 'grid' | 'list';
  enableViewAll?: boolean;
  backgroundStyle?: 'light' | 'dark' | 'brand';
}

// أيقونات الفئات
const categoryIcons: Record<string, any> = {
  devices: Package,
  laptops: Laptop,
  phones: Smartphone,
  headphones: Headphones,
  monitors: Monitor,
  accessories: ShoppingBag,
  folder: Folder,
  layers: Layers,
  folderRoot: FolderRoot,
};

// دالة للحصول على تدرج لوني عشوائي
const getRandomGradient = () => {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-sky-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-gray-500 to-slate-600',
    'from-green-500 to-lime-600'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};

// مكون بطاقة الفئة
const CategoryCard = ({ category }: { category: ExtendedCategory }) => {
  // اختيار الأيقونة المناسبة
  let IconComponent = Tag;
  if (category.icon && category.icon in categoryIcons) {
    IconComponent = categoryIcons[category.icon];
  }
  
  // إنشاء رابط الفئة
  const categoryLink = category.slug ? `/products?category=${category.id}` : `/products?category=${category.id}`;
  
  return (
    <Link to={categoryLink} className="block">
      <div className="group relative h-full overflow-hidden rounded-xl border bg-background shadow-md transition-all hover:shadow-lg">
        {/* خلفية الصورة أو التدرج */}
        {category.imageUrl ? (
          <div className="absolute inset-0 z-0">
            <img 
              src={category.imageUrl} 
              alt={category.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>
          </div>
        ) : (
          <div className={`absolute inset-0 z-0 bg-gradient-to-br ${category.color || getRandomGradient()} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
        )}
        
        {/* المحتوى */}
        <div className="relative z-10 p-5 flex flex-col h-full min-h-[180px] text-white">
          <div className="mb-2">
            <IconComponent className="h-8 w-8 mb-3 text-white/90" />
            <h3 className="text-lg font-semibold">{category.name}</h3>
            
            {category.description && (
              <p className="mt-2 text-sm text-white/80 line-clamp-2">{category.description}</p>
            )}
          </div>
          
          <div className="mt-auto flex items-center justify-between">
            {category.productsCount !== undefined && (
              <Badge 
                variant="secondary" 
                className="bg-white/20 hover:bg-white/30 text-white border-transparent text-xs"
              >
                {category.productsCount} منتج
              </Badge>
            )}
            
            <span className="text-sm text-white flex items-center gap-1 group-hover:gap-2 transition-all">
              تصفح <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// مكون شبكة مربعات الفئات
const CategoryGrid = ({ category }: { category: ExtendedCategory }) => {
  let IconComponent = Tag;
  if (category.icon && category.icon in categoryIcons) {
    IconComponent = categoryIcons[category.icon];
  }
  
  return (
    <Link to={`/products?category=${category.id}`}>
      <div className="relative overflow-hidden rounded-lg border bg-background p-4 transition-all hover:border-primary hover:shadow-sm flex flex-col items-center text-center h-full">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 bg-gradient-to-br ${category.color || getRandomGradient()} text-white`}>
          <IconComponent className="h-6 w-6" />
        </div>
        
        <h3 className="font-medium text-foreground">{category.name}</h3>
        
        {category.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{category.description}</p>
        )}
        
        {category.productsCount !== undefined && (
          <Badge variant="outline" className="mt-2 text-xs">
            {category.productsCount} منتج
          </Badge>
        )}
      </div>
    </Link>
  );
};

// مكون قائمة الفئات
const CategoryList = ({ category }: { category: ExtendedCategory }) => {
  let IconComponent = Tag;
  if (category.icon && category.icon in categoryIcons) {
    IconComponent = categoryIcons[category.icon];
  }
  
  return (
    <Link to={`/products?category=${category.id}`} className="block w-full">
      <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br ${category.color || getRandomGradient()} text-white`}>
            <IconComponent className="h-5 w-5" />
          </div>
          
          <div>
            <h3 className="font-medium text-foreground">{category.name}</h3>
            {category.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{category.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {category.productsCount !== undefined && (
            <Badge variant="outline" className="text-xs">
              {category.productsCount} منتج
            </Badge>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
};

// المكون الرئيسي لقسم الفئات
const CategorySection = ({
  title = "تصفح فئات منتجاتنا",
  description = "أفضل الفئات المختارة لتلبية احتياجاتك",
  selectionMethod = "random",
  maxCategories = 6,
  showProductCount = true,
  showDescription = true,
  selectedCategories = [],
  displayStyle = "cards",
  enableViewAll = true,
  backgroundStyle = "light"
}: CategorySectionProps) => {
  const { currentOrganization } = useTenant();
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // تطبيق نمط الخلفية
  const backgroundClass = {
    'light': 'bg-muted/30 dark:bg-muted/10',
    'dark': 'bg-gray-900 text-white',
    'brand': 'bg-primary/10 dark:bg-primary/20',
  }[backgroundStyle];
  
  // جلب الفئات من قاعدة البيانات
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentOrganization?.id) return;
      
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        // تحويل البيانات إلى الصيغة المطلوبة
        const mappedCategories = (data || []).map(cat => {
          let iconKey: string = 'layers';
          if (cat.icon && cat.icon in categoryIcons) {
            iconKey = cat.icon;
          }
          
          return {
            id: cat.id,
            name: cat.name,
            description: showDescription ? cat.description : undefined,
            slug: cat.slug,
            imageUrl: cat.image_url,
            icon: iconKey,
            color: getRandomGradient(),
            productsCount: showProductCount ? (cat.order_count || 0) : undefined
          };
        });
        
        // فلترة وترتيب الفئات حسب طريقة الاختيار
        let filteredCategories = [...mappedCategories];
        
        // تطبيق طريقة الاختيار
        if (selectionMethod === 'bestselling') {
          filteredCategories.sort((a, b) => (b.productsCount || 0) - (a.productsCount || 0));
        } else if (selectionMethod === 'manual' && selectedCategories.length > 0) {
          // ترتيب الفئات حسب ترتيب الاختيار اليدوي
          filteredCategories = filteredCategories.filter(cat => selectedCategories.includes(cat.id));
          filteredCategories.sort((a, b) => {
            return selectedCategories.indexOf(a.id) - selectedCategories.indexOf(b.id);
          });
        } else {
          // الترتيب العشوائي
          filteredCategories.sort(() => Math.random() - 0.5);
        }
        
        // تحديد العدد الأقصى للفئات
        filteredCategories = filteredCategories.slice(0, maxCategories);
        
        setCategories(filteredCategories);
      } catch (error) {
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, [
    currentOrganization?.id, 
    selectionMethod, 
    maxCategories, 
    showProductCount, 
    showDescription, 
    selectedCategories
  ]);
  
  // مكون التحميل
  if (isLoading) {
    return (
      <section className={`py-12 md:py-16 lg:py-20 ${backgroundClass}`}>
        <div className="container px-4 mx-auto">
          <div className="text-center mb-10">
            <Skeleton className="h-10 w-64 mx-auto mb-3" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {Array(maxCategories).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }
  
  // رسالة في حالة عدم وجود فئات
  if (!isLoading && categories.length === 0) {
    return (
      <section className={`py-12 md:py-16 lg:py-20 ${backgroundClass}`}>
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">لا توجد فئات لعرضها حاليًا</h2>
          <p className="text-muted-foreground">يرجى إضافة فئات من لوحة التحكم أولاً.</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className={`py-12 md:py-16 lg:py-20 ${backgroundClass}`}>
      <div className="container px-4 mx-auto">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{title}</h2>
          <p className="text-lg md:text-xl text-muted-foreground dark:text-muted-foreground/80 max-w-2xl mx-auto">{description}</p>
        </div>
        
        <motion.div 
          className={cn(
            "grid gap-6 lg:gap-8",
            displayStyle === 'cards' && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            displayStyle === 'grid' && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
            displayStyle === 'list' && "grid-cols-1 md:grid-cols-2"
          )}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ 
            visible: { transition: { staggerChildren: 0.08 } } 
          }}
        >
          {categories.map((category) => (
            <motion.div 
              key={category.id} 
              variants={{ 
                hidden: { opacity: 0, y: 20 }, 
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } 
              }}
            >
              {displayStyle === 'cards' && <CategoryCard category={category} />}
              {displayStyle === 'grid' && <CategoryGrid category={category} />}
              {displayStyle === 'list' && <CategoryList category={category} />}
            </motion.div>
          ))}
        </motion.div>
        
        {/* زر عرض كل الفئات */}
        {enableViewAll && (
          <div className="text-center mt-12">
            <Link to="/products">
              <Button variant="outline" size="lg">
                عرض كل الفئات <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategorySection;
