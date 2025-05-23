import React, { Suspense, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UseFormReturn, FormProvider } from 'react-hook-form';
import { 
  Package, 
  Eye, 
  Truck, 
  Settings, 
  Megaphone, 
  Loader2,
  Info,
  FolderTree,
  Images,
  ShoppingBag,
  Palette,
  DollarSign,
  Warehouse,
  TrendingUp,
  Sparkles
} from 'lucide-react';

// Import components (assuming they exist)
import BasicProductInfo from '../BasicProductInfo';
import ProductCategories from '../ProductCategories';
import ProductImagesManager from '../ProductImagesManager';
import ProductSellingType from '../ProductSellingType';
import ProductColorManager from '../ProductColorManager';
import ProductPricing from '../ProductPricing';
import ProductInventory from '../ProductInventory';
import WholesaleTierManager from '../WholesaleTierManager';
import ProductShippingAndTemplates from '../ProductShippingAndTemplates';
import MarketingAndEngagementTabs from './MarketingAndEngagementTabs';
import ProductAdvancedSettingsTabs from './ProductAdvancedSettingsTabs';

import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
import { Category, Subcategory } from '@/lib/api/categories';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';

const SectionLoader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
      </div>
      <p className="text-muted-foreground font-medium">جاري التحميل...</p>
    </div>
  </div>
);

interface ProductFormTabsProps {
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

const ProductFormTabs: React.FC<ProductFormTabsProps> = ({
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
  const thumbnailImageRef = useRef<ImageUploaderRef>(null);

  const tabsData = [
    {
      value: "basic",
      label: "الأساسية",
      icon: Info,
      color: "from-blue-500/20 to-blue-600/20",
      description: "المعلومات الأساسية للمنتج"
    },
    {
      value: "categories",
      label: "التصنيفات",
      icon: FolderTree,
      color: "from-green-500/20 to-green-600/20",
      description: "تصنيف المنتج"
    },
    {
      value: "images",
      label: "الصور",
      icon: Images,
      color: "from-purple-500/20 to-purple-600/20",
      description: "صور المنتج"
    },
    {
      value: "selling_type",
      label: "نوع البيع",
      icon: ShoppingBag,
      color: "from-orange-500/20 to-orange-600/20",
      description: "إعدادات البيع"
    },
    ...(watchHasVariants ? [{
      value: "variants",
      label: "النماذج",
      icon: Palette,
      color: "from-pink-500/20 to-pink-600/20",
      description: "متغيرات المنتج"
    }] : []),
    {
      value: "pricing",
      label: "الأسعار",
      icon: DollarSign,
      color: "from-emerald-500/20 to-emerald-600/20",
      description: "تسعير المنتج"
    },
    {
      value: "inventory",
      label: "المخزون",
      icon: Warehouse,
      color: "from-cyan-500/20 to-cyan-600/20",
      description: "إدارة المخزون"
    },
    {
      value: "wholesale",
      label: "الجملة",
      icon: TrendingUp,
      color: "from-indigo-500/20 to-indigo-600/20",
      description: "أسعار الجملة"
    },
    {
      value: "shipping_templates",
      label: "التوصيل والنماذج",
      icon: Truck,
      color: "from-teal-500/20 to-teal-600/20",
      description: "إعدادات التوصيل"
    },
    {
      value: "marketing_engagement",
      label: "التسويق والمشاركة",
      icon: Megaphone,
      color: "from-red-500/20 to-red-600/20",
      description: "أدوات التسويق"
    },
    {
      value: "advanced_settings",
      label: "إعدادات متقدمة",
      icon: Settings,
      color: "from-gray-500/20 to-gray-600/20",
      description: "إعدادات إضافية"
    }
  ];

  return (
    <FormProvider {...form}>
      <Tabs defaultValue="basic" className="w-full">
        {/* Header with sparkles effect */}
        <div className="relative mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/10">
          <div className="absolute top-4 right-4 opacity-30">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="absolute bottom-4 left-4 opacity-20">
            <Package className="w-8 h-8 text-secondary" />
          </div>
          
          <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-2">
            تفاصيل المنتج
          </h2>
          <p className="text-muted-foreground">
            قم بملء جميع التبويبات لإنشاء منتج متكامل
          </p>
        </div>

        {/* Enhanced Tabs List */}
        <TabsList className="flex flex-wrap gap-2 bg-gradient-to-r from-muted/80 to-muted/60 backdrop-blur-sm p-3 rounded-2xl border border-border/20 shadow-lg mb-8">
          {tabsData.map((tab) => (
            <TabsTrigger 
              key={tab.value}
              value={tab.value} 
              className="group relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-background/80 min-w-0"
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.color} opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-300`} />
              <tab.icon className="w-4 h-4 relative z-10 group-data-[state=active]:scale-110 transition-transform duration-200" />
              <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
              {/* Active indicator */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary rounded-full group-data-[state=active]:w-8 transition-all duration-300" />
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content Container */}
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 to-background/80 rounded-3xl" />
          <div className="absolute top-8 right-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-8 left-8 w-24 h-24 bg-secondary/5 rounded-full blur-2xl" />
          
          <div className="relative bg-card/50 backdrop-blur-xl border border-border/20 rounded-3xl p-8 shadow-2xl min-h-[500px]">
            <Suspense fallback={<SectionLoader />}>
              <TabsContent value="basic" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <BasicProductInfo form={form} />
              </TabsContent>
              
              <TabsContent value="categories" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <ProductCategories
                  form={form}
                  categories={categories}
                  subcategories={subcategories}
                  onCategoryCreated={onCategoryCreated}
                  onSubcategoryCreated={onSubcategoryCreated}
                />
              </TabsContent>
              
              <TabsContent value="images" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <ProductImagesManager
                  mainImage={watchThumbnailImage || ''}
                  additionalImages={additionalImages}
                  onMainImageChange={onMainImageChange}
                  onAdditionalImagesChange={onAdditionalImagesChange}
                  thumbnailImageRef={thumbnailImageRef} 
                />
              </TabsContent>
              
              <TabsContent value="selling_type" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <ProductSellingType form={form} onHasVariantsChange={onHasVariantsChange} />
              </TabsContent>
              
              {watchHasVariants && (
                <TabsContent value="variants" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
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
                </TabsContent>
              )}
              
              <TabsContent value="pricing" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <ProductPricing form={form} />
              </TabsContent>
              
              <TabsContent value="inventory" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <ProductInventory
                  form={form}
                  organizationId={organizationId}
                  hasVariants={watchHasVariants}
                  productId={form.getValues('id') || productId || ''} 
                />
              </TabsContent>
              
              <TabsContent value="wholesale" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <WholesaleTierManager
                  productId={productId || ''}
                  organizationId={organizationId}
                  onChange={onWholesaleTiersChange} 
                />
              </TabsContent>
              
              <TabsContent value="shipping_templates" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <ProductShippingAndTemplates
                  form={form}
                  organizationId={organizationId}
                />
              </TabsContent>
              
              <TabsContent value="marketing_engagement" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <MarketingAndEngagementTabs 
                  form={form} 
                  organizationId={organizationId} 
                  productId={productId} 
                />
              </TabsContent>
              
              <TabsContent value="advanced_settings" className="space-y-6 focus:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                <ProductAdvancedSettingsTabs
                  form={form}
                  organizationId={organizationId}
                  productId={productId}
                />
              </TabsContent>
            </Suspense>
          </div>
        </div>
      </Tabs>
    </FormProvider>
  );
};

export default ProductFormTabs; 