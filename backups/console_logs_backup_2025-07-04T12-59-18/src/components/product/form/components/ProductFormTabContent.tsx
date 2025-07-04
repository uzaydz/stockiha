import React, { memo, Suspense, lazy, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { UseFormReturn } from 'react-hook-form';
import { Loader2, Info, Images, DollarSign, Palette, Settings, Package, Truck, Megaphone, AlertTriangle } from 'lucide-react';

import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
import { Category, Subcategory } from '@/lib/api/categories';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';
import TabSectionHeader from './TabSectionHeader';

// Error Fallback Component
const ErrorFallback = memo<{ error?: Error }>(({ error }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6">
    <div className="flex flex-col items-center gap-4 max-w-md text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-2">جاري التحميل</h3>
        <p className="text-sm text-muted-foreground">
          يتم تحميل المحتوى...
        </p>
        {error && (
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">تفاصيل الخطأ</summary>
            <code className="mt-2 block text-left">{error.message}</code>
          </details>
        )}
      </div>
    </div>
  </div>
));

ErrorFallback.displayName = 'ErrorFallback';

// Enhanced lazy loading with error handling
const createLazyComponent = (importFn: () => Promise<any>, displayName: string) => {
  const LazyComponent = lazy(async () => {
    try {
      const module = await importFn();
      return module;
    } catch (error) {
      // Return a fallback component instead of throwing
      return {
        default: () => <ErrorFallback error={error as Error} />
      };
    }
  });
  
  return LazyComponent;
};

// Lazy load heavy components with error handling
const BasicProductInfo = createLazyComponent(
  () => import('@/components/product/BasicProductInfo'), 
  'BasicProductInfo'
);
const ProductCategories = createLazyComponent(
  () => import('@/components/product/ProductCategories'), 
  'ProductCategories'
);
const ProductImagesManager = createLazyComponent(
  () => import('@/components/product/ProductImagesManager'), 
  'ProductImagesManager'
);
const ProductSellingType = createLazyComponent(
  () => import('@/components/product/ProductSellingType'), 
  'ProductSellingType'
);
const ProductColorManager = createLazyComponent(
  () => import('@/components/product/ProductColorManager'), 
  'ProductColorManager'
);
const ProductPricing = createLazyComponent(
  () => import('@/components/product/ProductPricing'), 
  'ProductPricing'
);
const ProductInventory = createLazyComponent(
  () => import('@/components/product/ProductInventory'), 
  'ProductInventory'
);
const WholesaleTierManager = createLazyComponent(
  () => import('@/components/product/WholesaleTierManager'), 
  'WholesaleTierManager'
);
const ProductShippingAndTemplates = createLazyComponent(
  () => import('@/components/product/ProductShippingAndTemplates'), 
  'ProductShippingAndTemplates'
);
const MarketingAndEngagementTabs = createLazyComponent(
  () => import('../MarketingAndEngagementTabs'), 
  'MarketingAndEngagementTabs'
);
const ProductAdvancedSettingsTabs = createLazyComponent(
  () => import('../ProductAdvancedSettingsTabs'), 
  'ProductAdvancedSettingsTabs'
);

interface SectionLoaderProps {
  message?: string;
}

const SectionLoader = memo<SectionLoaderProps>(({ message = "جاري التحميل..." }) => (
  <div className="flex items-center justify-center py-12">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping"></div>
      </div>
      <p className="text-muted-foreground text-sm animate-pulse">{message}</p>
    </div>
  </div>
));

SectionLoader.displayName = 'SectionLoader';

// Wrapper component for safe suspense loading
const SafeSuspense = memo<{ children: React.ReactNode; fallback?: React.ReactNode }>(({ 
  children, 
  fallback = <SectionLoader /> 
}) => {
  // Force stable fallback to prevent UNSAFE_componentWillMount warnings
  const stableFallback = React.useMemo(() => fallback, []);
  
  return (
    <Suspense fallback={stableFallback}>
      {children}
    </Suspense>
  );
});

SafeSuspense.displayName = 'SafeSuspense';

interface ProductFormTabContentProps {
  activeTab: string;
  isTransitioning: boolean;
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
  additionalImages: string[];
  productColors: ProductColor[];
  wholesaleTiers: WholesaleTier[];
  categories: Category[];
  subcategories: Subcategory[];
  useVariantPrices: boolean;
  useSizes: boolean;
  watchHasVariants: boolean;
  watchPrice: number;
  watchPurchasePrice: number;
  watchThumbnailImage: string | undefined;
  thumbnailImageRef: React.RefObject<ImageUploaderRef>;
  onMainImageChange: (url: string) => void;
  onAdditionalImagesChange: (urls: string[]) => void;
  onProductColorsChange: (colors: ProductColor[]) => void;
  onWholesaleTiersChange: (tiers: WholesaleTier[]) => void;
  onCategoryCreated: (category: Category) => void;
  onSubcategoryCreated: (subcategory: Subcategory) => void;
  onHasVariantsChange: (hasVariants: boolean) => void;
  onUseVariantPricesChange: (use: boolean) => void;
  onUseSizesChange: (use: boolean) => void;
}

const ProductFormTabContent = memo<ProductFormTabContentProps>(({
  activeTab,
  isTransitioning,
  form,
  organizationId,
  productId,
  additionalImages,
  productColors,
  wholesaleTiers,
  categories,
  subcategories,
  useVariantPrices,
  useSizes,
  watchHasVariants,
  watchPrice,
  watchPurchasePrice,
  watchThumbnailImage,
  thumbnailImageRef,
  onMainImageChange,
  onAdditionalImagesChange,
  onProductColorsChange,
  onWholesaleTiersChange,
  onCategoryCreated,
  onSubcategoryCreated,
  onHasVariantsChange,
  onUseVariantPricesChange,
  onUseSizesChange,
}) => {
  return (
    <Card className={`min-h-[500px] overflow-hidden shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm border-border/50 transition-all duration-300 ${isTransitioning ? 'opacity-75' : 'opacity-100'}`}>
      <SafeSuspense fallback={<SectionLoader />}>
        {/* Basic Information Tab */}
        <TabsContent value="basic" className="p-6 space-y-6 m-0">
          <TabSectionHeader
            icon={Info}
            title="المعلومات الأساسية"
            color="primary"
            required
            tooltip="املأ جميع الحقول المطلوبة لضمان ظهور المنتج بشكل صحيح"
            description="الاسم، الوصف، والتصنيف الأساسي للمنتج"
          />
          
          {/* Main Content Grid */}
          <div className="space-y-8">
            {/* Basic Product Information */}
            <SafeSuspense fallback={<SectionLoader message="تحميل المعلومات الأساسية..." />}>
              <div className="bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/10 dark:to-muted/5 rounded-xl p-6 border border-border/30">
                <BasicProductInfo form={form} />
              </div>
            </SafeSuspense>
            
            {/* Categories and Selling Type */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <SafeSuspense fallback={<SectionLoader message="تحميل التصنيفات..." />}>
                <div className="bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/10 dark:to-muted/5 rounded-xl p-6 border border-border/30">
                  <ProductCategories
                    form={form}
                    categories={categories}
                    subcategories={subcategories}
                    organizationId={organizationId}
                    onCategoryCreated={onCategoryCreated}
                    onSubcategoryCreated={onSubcategoryCreated}
                  />
                </div>
              </SafeSuspense>
              
              <SafeSuspense fallback={<SectionLoader message="تحميل نوع البيع..." />}>
                <div className="bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/10 dark:to-muted/5 rounded-xl p-6 border border-border/30">
                  <ProductSellingType form={form} onHasVariantsChange={onHasVariantsChange} />
                </div>
              </SafeSuspense>
            </div>
          </div>
        </TabsContent>
        
        {/* Media Tab */}
        <TabsContent value="media" className="p-6 space-y-6 m-0">
          <TabSectionHeader
            icon={Images}
            title="صور المنتج"
            color="blue"
            required
            tooltip="أضف صورة رئيسية عالية الجودة وصور إضافية لعرض المنتج"
            description="الصورة الرئيسية والصور الإضافية للمنتج"
          />
          
          <SafeSuspense fallback={<SectionLoader message="تحميل مدير الصور..." />}>
            <div className="bg-gradient-to-r from-blue-50/30 to-indigo-50/20 dark:from-blue-950/20 dark:to-indigo-950/10 rounded-xl p-6 border border-blue-200/30 dark:border-blue-800/20">
              <ProductImagesManager
                mainImage={watchThumbnailImage || ''}
                additionalImages={additionalImages}
                onMainImageChange={onMainImageChange}
                onAdditionalImagesChange={onAdditionalImagesChange}
                thumbnailImageRef={thumbnailImageRef} 
              />
            </div>
          </SafeSuspense>
        </TabsContent>
        
        {/* Pricing & Inventory Tab */}
        <TabsContent value="pricing_inventory" className="p-6 space-y-6 m-0">
          <TabSectionHeader
            icon={DollarSign}
            title="السعر والمخزون"
            color="green"
            required
            tooltip="حدد أسعار المنتج وكمية المخزون المتوفرة"
            description="إدارة الأسعار والكميات والمخزون"
          />
          
          {/* Main Content - Responsive Layout */}
          <div className="space-y-8">
            {/* Pricing Section */}
            <SafeSuspense fallback={<SectionLoader message="تحميل إدارة الأسعار..." />}>
              <div className="bg-gradient-to-r from-green-50/30 to-emerald-50/20 dark:from-green-950/20 dark:to-emerald-950/10 rounded-xl p-6 border border-green-200/30 dark:border-green-800/20">
                <ProductPricing form={form} />
              </div>
            </SafeSuspense>
            
            {/* Inventory Section */}
            <SafeSuspense fallback={<SectionLoader message="تحميل إدارة المخزون..." />}>
              <div className="bg-gradient-to-r from-green-50/30 to-emerald-50/20 dark:from-green-950/20 dark:to-emerald-950/10 rounded-xl p-6 border border-green-200/30 dark:border-green-800/20">
                <ProductInventory
                  form={form}
                  organizationId={organizationId}
                  hasVariants={watchHasVariants}
                  productId={form.getValues('id') || productId || ''} 
                />
              </div>
            </SafeSuspense>
          </div>
        </TabsContent>
        
        {/* Variants Tab */}
        {watchHasVariants && (
          <TabsContent value="variants" className="p-6 space-y-6 m-0">
            <TabSectionHeader
              icon={Palette}
              title="متغيرات المنتج"
              color="purple"
              required={false}
              tooltip="أضف متغيرات المنتج مثل الألوان والأحجام"
              description="إدارة الألوان والأحجام والمتغيرات"
            />
            
            <SafeSuspense fallback={<SectionLoader message="تحميل مدير المتغيرات..." />}>
              <div className="bg-gradient-to-r from-purple-50/30 to-indigo-50/20 dark:from-purple-950/20 dark:to-indigo-950/10 rounded-xl p-6 border border-purple-200/30 dark:border-purple-800/20">
                <ProductColorManager
                  colors={productColors}
                  onChange={onProductColorsChange}
                  basePrice={watchPrice}
                  basePurchasePrice={watchPurchasePrice}
                  useVariantPrices={useVariantPrices}
                  onUseVariantPricesChange={onUseVariantPricesChange}
                  useSizes={useSizes}
                  onUseSizesChange={onUseSizesChange}
                  productId={productId || ''}
                />
              </div>
            </SafeSuspense>
          </TabsContent>
        )}
        
        {/* Advanced Settings Tab */}
        <TabsContent value="advanced" className="p-6 space-y-6 m-0">
          <TabSectionHeader
            icon={Settings}
            title="خيارات متقدمة"
            color="amber"
            required={false}
            tooltip="إعدادات الجملة والتوصيل والتسويق"
            description="الخيارات المتقدمة والإعدادات الإضافية"
          />
          
          <div className="space-y-8">
            {/* Wholesale Tiers */}
            <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
              <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-2 rounded-lg shadow-sm">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                أسعار الجملة
              </h4>
              <SafeSuspense fallback={<SectionLoader message="تحميل إدارة الجملة..." />}>
                <WholesaleTierManager
                  productId={productId || ''}
                  organizationId={organizationId}
                  onChange={onWholesaleTiersChange} 
                />
              </SafeSuspense>
            </div>
            
            {/* Shipping & Templates */}
            <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
              <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 p-2 rounded-lg shadow-sm">
                  <Truck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                التوصيل والنماذج
              </h4>
              <SafeSuspense fallback={<SectionLoader message="تحميل إعدادات التوصيل..." />}>
                <ProductShippingAndTemplates
                  form={form}
                  organizationId={organizationId}
                />
              </SafeSuspense>
            </div>
            
            {/* Marketing & Engagement */}
            <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
              <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/60 dark:to-purple-800/60 p-2 rounded-lg shadow-sm">
                  <Megaphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                التسويق والمشاركة
              </h4>
              <SafeSuspense fallback={<SectionLoader message="تحميل أدوات التسويق..." />}>
                <MarketingAndEngagementTabs 
                  form={form} 
                  organizationId={organizationId} 
                  productId={productId} 
                />
              </SafeSuspense>
            </div>
            
            {/* Advanced Settings */}
            <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
              <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-2 rounded-lg shadow-sm">
                  <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                إعدادات متقدمة
              </h4>
              <SafeSuspense fallback={<SectionLoader message="تحميل الإعدادات المتقدمة..." />}>
                <ProductAdvancedSettingsTabs
                  form={form}
                  organizationId={organizationId}
                  productId={productId}
                />
              </SafeSuspense>
            </div>
          </div>
        </TabsContent>
      </SafeSuspense>
    </Card>
  );
});

ProductFormTabContent.displayName = 'ProductFormTabContent';

export default ProductFormTabContent;
