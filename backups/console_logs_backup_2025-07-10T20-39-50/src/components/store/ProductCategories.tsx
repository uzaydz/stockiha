import { useSearchParams } from 'react-router-dom';
import { 
  CategoryGrid, 
  CategoryHeader, 
  CategoryLoading,
  useCategoryData,
  type ExtendedCategory,
  type CategorySettings
} from './category';

interface ProductCategoriesProps {
  title?: string;
  description?: string;
  categories?: ExtendedCategory[];
  useRealCategories?: boolean;
  selectedCategoryId?: string | null;
  settings?: CategorySettings;
}

const ProductCategories = ({
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
    _previewCategories: []
  }
}: ProductCategoriesProps) => {
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get('category');
  const activeCategoryId = selectedCategoryId || urlCategoryId;

  // استخدام الـ hook المخصص لإدارة بيانات الفئات
  const { displayedCategories, isLoading, showDemoMessage } = useCategoryData({
    propCategories,
      useRealCategories,
    settings
  });

  // عرض حالة التحميل
  if (isLoading && useRealCategories) {
    return <CategoryLoading />;
  }

  return (
    <section className="py-16 md:py-20 lg:py-24 relative overflow-hidden">
      {/* خلفية متدرجة محسنة */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/10 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-transparent to-secondary/3" />
      
      {/* عناصر زخرفية بسيطة */}
      <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-2xl" />
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-gradient-to-tr from-secondary/5 to-primary/5 rounded-full blur-2xl" />
      
      <div className="container px-4 mx-auto relative z-10">
        {/* رأس القسم */}
        <CategoryHeader 
          title={title}
          description={description}
          showDemoMessage={showDemoMessage}
        />
        
        {/* شبكة الفئات */}
        <CategoryGrid 
          categories={displayedCategories}
          activeCategoryId={activeCategoryId}
          useRealCategories={useRealCategories}
          showImages={settings.showImages}
          showDescription={settings.showDescription}
        />
      </div>
    </section>
  );
};

export default ProductCategories;
