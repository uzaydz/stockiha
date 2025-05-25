import React, { Suspense, useRef, useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UseFormReturn, FormProvider } from 'react-hook-form';
import { 
  Package, 
  Eye, 
  Truck, 
  Settings, 
  Megaphone, 
  Loader2,
  Info,
  Images,
  Palette,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

// Import components
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
  <div className="flex items-center justify-center py-12">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      </div>
      <p className="text-muted-foreground text-sm">جاري التحميل...</p>
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
  const [activeTab, setActiveTab] = useState("basic");
  
  // Watch form values for validation status
  const watchName = form.watch('name');
  const watchCategoryId = form.watch('category_id');
  const watchSku = form.watch('sku');

  // Calculate completion status for each tab
  const getTabStatus = (tabValue: string) => {
    switch (tabValue) {
      case 'basic':
        return watchName && watchCategoryId && watchSku ? 'complete' : watchName ? 'partial' : 'empty';
      case 'media':
        return watchThumbnailImage ? 'complete' : 'empty';
      case 'pricing_inventory':
        return watchPrice > 0 ? 'complete' : 'empty';
      case 'variants':
        return watchHasVariants && productColors.length > 0 ? 'complete' : 'empty';
      case 'advanced':
        return 'optional';
      default:
        return 'empty';
    }
  };

  // Calculate overall progress
  const calculateProgress = () => {
    const requiredTabs = ['basic', 'media', 'pricing_inventory'];
    const completedTabs = requiredTabs.filter(tab => getTabStatus(tab) === 'complete').length;
    return Math.round((completedTabs / requiredTabs.length) * 100);
  };

  const tabsData = [
    {
      value: "basic",
      label: "المعلومات الأساسية",
      shortLabel: "أساسية",
      icon: Info,
      description: "الاسم، الوصف، والتصنيف",
      required: true,
      tooltip: "أدخل المعلومات الأساسية للمنتج مثل الاسم والوصف والتصنيف"
    },
    {
      value: "media",
      label: "الصور",
      shortLabel: "صور",
      icon: Images,
      description: "صور المنتج الأساسية",
      required: true,
      tooltip: "أضف الصورة الرئيسية والصور الإضافية للمنتج"
    },
    {
      value: "pricing_inventory",
      label: "السعر والمخزون",
      shortLabel: "سعر",
      icon: DollarSign,
      description: "الأسعار وإدارة المخزون",
      required: true,
      tooltip: "حدد سعر المنتج وكمية المخزون"
    },
    ...(watchHasVariants ? [{
      value: "variants",
      label: "المتغيرات",
      shortLabel: "متغيرات",
      icon: Palette,
      description: "الألوان والأحجام",
      required: false,
      tooltip: "أضف متغيرات المنتج مثل الألوان والأحجام"
    }] : []),
    {
      value: "advanced",
      label: "خيارات متقدمة",
      shortLabel: "متقدم",
      icon: Settings,
      description: "الجملة، التوصيل، والتسويق",
      required: false,
      tooltip: "إعدادات الجملة والتوصيل والتسويق"
    }
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'empty':
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  // Navigation functions
  const getCurrentTabIndex = () => tabsData.findIndex(tab => tab.value === activeTab);
  const isFirstTab = () => getCurrentTabIndex() === 0;
  const isLastTab = () => getCurrentTabIndex() === tabsData.length - 1;
  
  const goToPreviousTab = useCallback(() => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex > 0) {
      setActiveTab(tabsData[currentIndex - 1].value);
    }
  }, [activeTab, tabsData]);

  const goToNextTab = useCallback(() => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex < tabsData.length - 1) {
      setActiveTab(tabsData[currentIndex + 1].value);
    }
  }, [activeTab, tabsData]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            goToPreviousTab();
            break;
          case 'ArrowRight':
            event.preventDefault();
            goToNextTab();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousTab, goToNextTab]);

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <div className="space-y-6">
          {/* Progress Header */}
          <Card className="p-4 bg-gradient-to-r from-background to-background/95">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">تفاصيل المنتج</h2>
                  <p className="text-sm text-muted-foreground">
                    أكمل المعلومات المطلوبة لإنشاء منتجك
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{calculateProgress()}%</div>
                  <Badge variant={calculateProgress() === 100 ? "default" : "secondary"} className="text-xs">
                    {calculateProgress() === 100 ? "مكتمل" : "في التقدم"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>التقدم الإجمالي</span>
                <span>{calculateProgress()}/100</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Enhanced Tabs List */}
            <Card className="p-3 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-muted-foreground">
                  التبويب {getCurrentTabIndex() + 1} من {tabsData.length}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>استخدم</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">→</kbd>
                  <span>للتنقل</span>
                </div>
              </div>
              
              <TabsList className="grid w-full h-auto bg-transparent p-0 gap-2" style={{
                gridTemplateColumns: `repeat(${tabsData.length}, 1fr)`
              }}>
                {tabsData.map((tab, index) => {
                  const status = getTabStatus(tab.value);
                  const isActive = activeTab === tab.value;
                  return (
                    <Tooltip key={tab.value}>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value={tab.value}
                          className={`flex flex-col items-center gap-2 p-3 h-auto rounded-lg border transition-all duration-200 relative ${
                            isActive 
                              ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                              : 'bg-background hover:bg-muted/50 border-border/50'
                          }`}
                        >
                          {/* Tab Number */}
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted border text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <tab.icon className="w-4 h-4" />
                            {status !== 'empty' && status !== 'optional' && (
                              <StatusIcon status={status} />
                            )}
                          </div>
                          
                          <div className="text-center">
                            <div className="font-medium text-xs leading-tight">
                              <span className="hidden sm:inline">{tab.label}</span>
                              <span className="sm:hidden">{tab.shortLabel}</span>
                            </div>
                            {tab.required && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                مطلوب
                              </div>
                            )}
                          </div>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{tab.label}</p>
                        <p className="text-xs text-muted-foreground">{tab.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TabsList>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousTab}
                  disabled={isFirstTab()}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextTab}
                  disabled={isLastTab()}
                  className="flex items-center gap-2"
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Content Container */}
            <Card className="min-h-[500px] overflow-hidden">
              <Suspense fallback={<SectionLoader />}>
                <TabsContent value="basic" className="p-6 space-y-6 m-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">المعلومات الأساسية</h3>
                    <Badge variant="outline">مطلوب</Badge>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>املأ جميع الحقول المطلوبة لضمان ظهور المنتج بشكل صحيح</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Separator />
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-6">
                      <BasicProductInfo form={form} />
                    </div>
                    <div className="space-y-6">
                      <ProductCategories
                        form={form}
                        categories={categories}
                        subcategories={subcategories}
                        onCategoryCreated={onCategoryCreated}
                        onSubcategoryCreated={onSubcategoryCreated}
                      />
                      <ProductSellingType form={form} onHasVariantsChange={onHasVariantsChange} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="media" className="p-6 space-y-6 m-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Images className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">صور المنتج</h3>
                    <Badge variant="outline">مطلوب</Badge>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>أضف صورة رئيسية عالية الجودة وصور إضافية لعرض المنتج</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Separator />
                  <ProductImagesManager
                    mainImage={watchThumbnailImage || ''}
                    additionalImages={additionalImages}
                    onMainImageChange={onMainImageChange}
                    onAdditionalImagesChange={onAdditionalImagesChange}
                    thumbnailImageRef={thumbnailImageRef} 
                  />
                </TabsContent>
                
                <TabsContent value="pricing_inventory" className="p-6 space-y-6 m-0">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">السعر والمخزون</h3>
                    <Badge variant="outline">مطلوب</Badge>
                  </div>
                  <Separator />
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-6">
                      <ProductPricing form={form} />
                    </div>
                    <div className="space-y-6">
                      <ProductInventory
                        form={form}
                        organizationId={organizationId}
                        hasVariants={watchHasVariants}
                        productId={form.getValues('id') || productId || ''} 
                      />
                    </div>
                  </div>
                </TabsContent>
                
                {watchHasVariants && (
                  <TabsContent value="variants" className="p-6 space-y-6 m-0">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg">متغيرات المنتج</h3>
                      <Badge variant="secondary">اختياري</Badge>
                    </div>
                    <Separator />
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
                
                <TabsContent value="advanced" className="p-6 space-y-6 m-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">خيارات متقدمة</h3>
                    <Badge variant="secondary">اختياري</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-8">
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        أسعار الجملة
                      </h4>
                      <WholesaleTierManager
                        productId={productId || ''}
                        organizationId={organizationId}
                        onChange={onWholesaleTiersChange} 
                      />
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        التوصيل والنماذج
                      </h4>
                      <ProductShippingAndTemplates
                        form={form}
                        organizationId={organizationId}
                      />
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-primary" />
                        التسويق والمشاركة
                      </h4>
                      <MarketingAndEngagementTabs 
                        form={form} 
                        organizationId={organizationId} 
                        productId={productId} 
                      />
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" />
                        إعدادات متقدمة
                      </h4>
                      <ProductAdvancedSettingsTabs
                        form={form}
                        organizationId={organizationId}
                        productId={productId}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Suspense>
            </Card>
          </Tabs>
        </div>
      </FormProvider>
    </TooltipProvider>
  );
};

export default ProductFormTabs; 