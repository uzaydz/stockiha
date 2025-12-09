import React, { memo, Suspense, lazy, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { UseFormReturn } from 'react-hook-form';
import { Loader2, Info, Images, DollarSign, Palette, Settings, Package, Truck, Megaphone, AlertTriangle, BarChart2, Gift, ChevronDown, Boxes } from 'lucide-react';

import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
import { Category, Subcategory } from '@/lib/api/categories';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';
import TabSectionHeader from './TabSectionHeader';

// Error Fallback Component
const ErrorFallback = memo<{ error?: Error }>(({ error }) => (
  <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
    <div className="flex flex-col items-center gap-3 sm:gap-4 max-w-md text-center">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">جاري التحميل</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          يتم تحميل المحتوى...
        </p>
        {error && (
          <details className="mt-2 sm:mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">تفاصيل الخطأ</summary>
            <code className="mt-2 block text-left text-xs">{error.message}</code>
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
const ProductSettings = createLazyComponent(
  () => import('@/components/product/ProductSettings'), 
  'ProductSettings'
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
const ConversionTrackingTab = createLazyComponent(
  () => import('../marketing-and-engagement/ConversionTrackingTab'), 
  'ConversionTrackingTab'
);
const SpecialOffersTab = createLazyComponent(
  () => import('../special-offers/SpecialOffersTab'),
  'SpecialOffersTab'
);
const AdvancedProductSettings = createLazyComponent(
  () => import('../AdvancedProductSettings'),
  'AdvancedProductSettings'
);

interface SectionLoaderProps {
  message?: string;
}

const SectionLoader = memo<SectionLoaderProps>(({ message = "جاري التحميل..." }) => (
  <div className="flex items-center justify-center py-8 sm:py-12">
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <div className="relative">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping"></div>
      </div>
      <p className="text-muted-foreground text-xs sm:text-sm animate-pulse">{message}</p>
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
  onAddColor?: (e?: React.MouseEvent) => void;
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
  onAddColor,
}) => {
  useEffect(() => {
  }, [watchHasVariants, productColors]);

  // Additional logging for variants tab visibility
  useEffect(() => {
    if (watchHasVariants) {
    } else {
    }
  }, [watchHasVariants, productColors]);

  return (
    <Card className={`min-h-[350px] sm:min-h-[400px] lg:min-h-[500px] overflow-hidden shadow-sm sm:shadow-md bg-card border border-border/50 transition-opacity duration-200 ${isTransitioning ? 'opacity-80' : 'opacity-100'}`}>
      <SafeSuspense fallback={<SectionLoader />}>
        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
        <TabsContent value="basic" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
          <TabSectionHeader
            icon={Info}
            title="المعلومات الأساسية"
            color="primary"
            required
            tooltip="املأ جميع الحقول المطلوبة لضمان ظهور المنتج بشكل صحيح"
            description="الاسم، الوصف، والتصنيف الأساسي للمنتج"
          />
          
          {/* Main Content Grid */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Basic Product Information */}
            <SafeSuspense fallback={<SectionLoader message="تحميل المعلومات الأساسية..." />}>
              <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
                <BasicProductInfo form={form} />
              </div>
            </SafeSuspense>
            
            {/* Categories - Vertical Layout (Removed Selling Type from Basic) */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              {/* Main Categories */}
              <SafeSuspense fallback={<SectionLoader message="تحميل الفئات الرئيسية..." />}>
                <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
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
              
              {/* Product Settings */}
              <SafeSuspense fallback={<SectionLoader message="تحميل إعدادات المنتج..." />}>
                <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
                  <ProductSettings form={form} />
                </div>
              </SafeSuspense>
            </div>
          </div>
        </TabsContent>
        )}
        
        {/* Media Tab */}
        {activeTab === 'media' && (
        <TabsContent value="media" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
          <TabSectionHeader
            icon={Images}
            title="صور المنتج"
            color="blue"
            required
            tooltip="أضف صورة رئيسية عالية الجودة وصور إضافية لعرض المنتج"
            description="الصورة الرئيسية والصور الإضافية للمنتج"
          />
          
          <SafeSuspense fallback={<SectionLoader message="تحميل مدير الصور..." />}>
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
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
        )}
        
        {/* Pricing & Inventory Tab */}
        {activeTab === 'pricing_inventory' && (
        <TabsContent value="pricing_inventory" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
          <TabSectionHeader
            icon={DollarSign}
            title="السعر والمخزون"
            color="green"
            required
            tooltip="حدد أسعار المنتج وكمية المخزون المتوفرة"
            description="إدارة الأسعار والكميات والمخزون"
          />
          
          {/* Main Content - Responsive Layout */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Pricing Section */}
            <SafeSuspense fallback={<SectionLoader message="تحميل إدارة الأسعار..." />}>
              <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
                <ProductPricing form={form} />
              </div>
            </SafeSuspense>
            
            {/* Inventory Section */}
            <SafeSuspense fallback={<SectionLoader message="تحميل إدارة المخزون..." />}>
              <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
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
        )}
        
        {/* Variants Tab */}
        {/* Variants Tab: always visible; shows enable UI if disabled */}
        {activeTab === 'variants' && (
        <TabsContent value="variants" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
            <TabSectionHeader
              icon={Palette}
              title="متغيرات المنتج"
              color="purple"
            required={false}
            tooltip="أضف متغيرات المنتج مثل الألوان والأحجام"
            description="إدارة الألوان والأحجام والمتغيرات"
            />
          {!watchHasVariants ? (
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
              <p className="text-xs sm:text-sm text-muted-foreground mb-3">المتغيرات غير مفعّلة لهذا المنتج.</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 rounded-lg border text-xs sm:text-sm hover:bg-primary/5 transition-colors"
                  onClick={() => onHasVariantsChange(true)}
                >
                  تفعيل المتغيرات
                </button>
                <span className="text-[10px] sm:text-xs text-muted-foreground">يمكنك تفعيل المتغيرات لإضافة الألوان والأحجام.</span>
              </div>
            </div>
          ) : (
            <SafeSuspense fallback={<SectionLoader message="تحميل مدير المتغيرات..." />}>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div className="text-xs sm:text-sm text-muted-foreground">المتغيرات مفعّلة</div>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 rounded-lg border text-xs sm:text-sm hover:bg-destructive/5 transition-colors"
                    onClick={() => onHasVariantsChange(false)}
                  >
                    تعطيل المتغيرات
                  </button>
                </div>
                <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
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
                    onAddColor={onAddColor}
                  />
                </div>
              </div>
            </SafeSuspense>
          )}
        </TabsContent>
        )}
        
        {/* Special Offers moved into Advanced tab below */}
        
        {/* Shipping & Templates Tab */}
        {activeTab === 'shipping_templates' && (
        <TabsContent value="shipping_templates" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
          <TabSectionHeader
            icon={Truck}
            title="التوصيل والنماذج"
            color="green"
            required={false}
            tooltip="إعداد خيارات التوصيل والنماذج المختلفة"
            description="خيارات التوصيل والنماذج"
          />

          <SafeSuspense fallback={<SectionLoader message="تحميل إعدادات التوصيل..." />}>
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
              <ProductShippingAndTemplates
                form={form}
                organizationId={organizationId}
              />
            </div>
          </SafeSuspense>
        </TabsContent>
        )}

        {/* Advanced Selling Types Tab */}
        {activeTab === 'selling_types' && (
        <TabsContent value="selling_types" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
          <TabSectionHeader
            icon={Boxes}
            title="أنواع البيع المتقدمة"
            color="green"
            required={false}
            tooltip="إعدادات البيع بالوزن والكرتون والمتر والتتبع والضمان ومستويات الأسعار"
            description="الوزن، الكرتون، المتر، الصلاحية، الأرقام التسلسلية، الضمان"
          />

          <SafeSuspense fallback={<SectionLoader message="تحميل الإعدادات المتقدمة..." />}>
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
              <AdvancedProductSettings form={form} />
            </div>
          </SafeSuspense>
        </TabsContent>
        )}

        {/* Conversion Tracking Tab */}
        {activeTab === 'conversion_tracking' && (
        <TabsContent value="conversion_tracking" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
          <TabSectionHeader
            icon={BarChart2}
            title="تحليلات التسويق وتتبع التحويلات"
            color="purple"
            required={false}
            tooltip="إعداد تتبع التحويلات عبر المنصات"
            description="فيسبوك، جوجل، وتيك توك"
          />
          
          <SafeSuspense fallback={<SectionLoader message="تحميل إعدادات التتبع..." />}>
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-background/50 backdrop-blur-sm">
              <ConversionTrackingTab
                form={form}
                organizationId={organizationId}
                productId={productId}
              />
            </div>
          </SafeSuspense>
        </TabsContent>
        )}
        
        {/* Advanced Settings Tab (now includes Special Offers and Conversion Tracking) */}
        {activeTab === 'advanced' && (
        <TabsContent value="advanced" className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 m-0">
          <TabSectionHeader
            icon={Settings}
            title="الإعدادات العامة"
            color="amber"
            required={false}
            tooltip="إعدادات الجملة والتوصيل والإعدادات العامة"
            description="الجملة، التوصيل، والإعدادات الإضافية"
          />
          
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Collapsible - Special Offers */}
            <details className="group rounded-lg sm:rounded-xl border border-border/60 bg-gradient-to-r from-background/50 to-background/30 dark:from-background/30 dark:to-background/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300" open>
              <summary className="cursor-pointer select-none p-3 sm:p-4 lg:p-5 flex items-center justify-between hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/3 transition-all duration-300 rounded-lg sm:rounded-xl">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm flex-shrink-0">
                    <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary dark:text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-medium text-xs sm:text-sm text-foreground truncate">العروض الخاصة</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground hidden md:inline truncate">(تقديم خصومات على باقات وكميات)</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      إعداد عروض خاصة وخصومات على الكميات
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <span className="text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full border border-primary/20 text-primary group-open:hidden">انقر للفتح</span>
                  <span className="text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full border border-primary/20 text-primary hidden group-open:inline">انقر للإغلاق</span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </div>
              </summary>
              <div className="p-3 sm:p-4 lg:p-5 pt-0">
                <SafeSuspense fallback={<SectionLoader message="تحميل مدير العروض الخاصة..." />}>
                  <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-gradient-to-r from-background/50 to-background/30 dark:from-background/30 dark:to-background/20 backdrop-blur-sm">
                    <SpecialOffersTab
                      productName={form.watch('name') || 'المنتج'}
                      basePrice={watchPrice}
                      productId={productId}
                      productImage={watchThumbnailImage}
                      initialConfig={form.watch('special_offers_config')}
                      onChange={productId ? (config) => {
                        form.setValue('special_offers_config', config);
                      } : undefined}
                    />
                  </div>
                </SafeSuspense>
              </div>
            </details>

            {/* Conversion Tracking moved to its own tab above */}
            {/* Wholesale Tiers */}
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-gradient-to-r from-background/50 to-background/30 dark:from-background/30 dark:to-background/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm text-foreground">أسعار الجملة</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">إعداد أسعار خاصة للكميات الكبيرة</p>
                </div>
              </div>
              <SafeSuspense fallback={<SectionLoader message="تحميل إدارة الجملة..." />}>
                <WholesaleTierManager
                  productId={productId || ''}
                  organizationId={organizationId}
                  onChange={onWholesaleTiersChange} 
                />
              </SafeSuspense>
            </div>
            
            {/* Marketing & Engagement */}
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-gradient-to-r from-background/50 to-background/30 dark:from-background/30 dark:to-background/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/60 dark:to-purple-800/60 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
                  <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm text-foreground">التسويق والمشاركة</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">أدوات التسويق والمشاركة الاجتماعية</p>
                </div>
              </div>
              <SafeSuspense fallback={<SectionLoader message="تحميل أدوات التسويق..." />}>
                <MarketingAndEngagementTabs 
                  form={form} 
                  organizationId={organizationId} 
                  productId={productId} 
                />
              </SafeSuspense>
            </div>
            
            {/* Advanced Settings */}
            <div className="rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-border/60 bg-gradient-to-r from-background/50 to-background/30 dark:from-background/30 dark:to-background/20 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-medium text-xs sm:text-sm text-foreground">إعدادات متقدمة</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">إعدادات إضافية ومتقدمة للمنتج</p>
                </div>
              </div>
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
        )}
      </SafeSuspense>
    </Card>
  );
});

ProductFormTabContent.displayName = 'ProductFormTabContent';

export default ProductFormTabContent;
