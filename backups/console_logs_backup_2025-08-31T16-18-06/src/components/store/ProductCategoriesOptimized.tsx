import { useSearchParams } from 'react-router-dom';
import { 
  CategoryGridOptimized, 
  CategoryHeader, 
  CategoryLoadingEnhanced,
  useCategoryDataOptimized,
  type ExtendedCategory,
  type CategorySettings
} from './category';

interface ProductCategoriesOptimizedProps {
  title?: string;
  description?: string;
  categories?: ExtendedCategory[];
  useRealCategories?: boolean;
  selectedCategoryId?: string | null;
  settings?: CategorySettings;
  enableVirtualization?: boolean;
}

/**
 * مكون فئات المنتجات المحسّن
 * يتضمن جميع تحسينات الأداء والسرعة
 */
const ProductCategoriesOptimized = ({
  title,
  description,
  categories: propCategories = [],
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
    enableLazyLoading: true,
    enableVirtualization: false,
    imageQuality: 'auto',
    animationSpeed: 'normal',
    _previewCategories: []
  },
  enableVirtualization = false
}: ProductCategoriesOptimizedProps) => {

  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get('category');
  const activeCategoryId = selectedCategoryId || urlCategoryId;

  // استخدام الـ hook المحسّن لإدارة بيانات الفئات
  const { 
    displayedCategories, 
    isLoading, 
    isError,
    error,
    showDemoMessage,
    refresh
  } = useCategoryDataOptimized({
    propCategories,
    useRealCategories,
    settings: {
      ...settings,
      enableVirtualization: enableVirtualization || settings.enableVirtualization
    }
  });

  // عرض حالة التحميل المحسّنة
  if (isLoading && useRealCategories) {
    return <CategoryLoadingEnhanced count={settings.displayCount || 6} />;
  }

  // عرض حالة الخطأ
  if (isError && error) {
    return (
      <section className="py-16 md:py-20 lg:py-24 relative overflow-hidden">
        <div className="container px-4 mx-auto relative z-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              حدث خطأ أثناء تحميل الفئات
            </h2>
            <p className="text-muted-foreground mb-6">{error.message}</p>
            <button
              onClick={refresh}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-14 md:py-20 lg:py-24">
      <div className="container px-3 sm:px-4 mx-auto">
        {/* رأس القسم */}
        <CategoryHeader 
          title={title}
          description={description}
          showDemoMessage={showDemoMessage}
          animated={typeof window !== 'undefined' && window.innerWidth >= 768 && settings.animationSpeed !== 'none'}
          centered={true}
        />
        
        {/* شبكة الفئات المحسّنة */}
        <CategoryGridOptimized 
          categories={displayedCategories}
          activeCategoryId={activeCategoryId}
          useRealCategories={useRealCategories}
          showImages={settings.showImages}
          showDescription={settings.showDescription}
          enableVirtualization={enableVirtualization || settings.enableVirtualization}
          itemsPerRow={typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 3}
          gap={typeof window !== 'undefined' && window.innerWidth < 640 ? 'small' : 'medium'}
        />
      </div>
    </section>
  );
};

export default ProductCategoriesOptimized;
