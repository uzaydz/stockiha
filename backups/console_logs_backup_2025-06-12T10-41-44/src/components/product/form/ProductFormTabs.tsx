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
  const watchBarcode = form.watch('barcode');

  // Calculate completion status for each tab
  const getTabStatus = (tabValue: string) => {
    switch (tabValue) {
      case 'basic':
        return watchName && watchCategoryId && watchSku && watchBarcode ? 'complete' : watchName ? 'partial' : 'empty';
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
          <Card className="p-6 bg-gradient-to-r from-background/95 via-background to-background/95 dark:from-background/90 dark:via-background dark:to-background/90 shadow-lg dark:shadow-2xl dark:shadow-black/20 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 flex items-center justify-center shadow-md">
                  <Package className="w-5 h-5 text-primary dark:text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-foreground">تفاصيل المنتج</h2>
                  <p className="text-sm text-muted-foreground">
                    أكمل المعلومات المطلوبة لإنشاء منتجك
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{calculateProgress()}%</div>
                  <Badge variant={calculateProgress() === 100 ? "default" : "secondary"} className="text-xs shadow-sm">
                    {calculateProgress() === 100 ? "مكتمل" : "في التقدم"}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>التقدم الإجمالي</span>
                <span>{calculateProgress()}/100</span>
              </div>
              <Progress value={calculateProgress()} className="h-2 bg-muted/50 dark:bg-muted/30" />
            </div>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Enhanced Tabs List */}
            <Card className="p-4 mb-6 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  التبويب {getCurrentTabIndex() + 1} من {tabsData.length}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 dark:bg-muted/20 px-3 py-1.5 rounded-lg">
                  <span>استخدم</span>
                  <kbd className="px-2 py-1 bg-background dark:bg-background/80 border border-border/50 rounded text-xs shadow-sm">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-background dark:bg-background/80 border border-border/50 rounded text-xs shadow-sm">→</kbd>
                  <span>للتنقل</span>
                </div>
              </div>
              
              <TabsList className="grid w-full h-auto bg-gradient-to-r from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 p-2 gap-2 rounded-xl backdrop-blur-sm" style={{
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
                          className={`flex flex-col items-center gap-2 p-3 h-auto rounded-xl border transition-all duration-300 relative overflow-hidden group ${
                            isActive 
                              ? 'bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground border-primary/50 shadow-lg shadow-primary/25 scale-[1.02]' 
                              : 'bg-background/80 dark:bg-background/60 hover:bg-gradient-to-br hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 border-border/50 hover:border-primary/30 hover:shadow-md backdrop-blur-sm'
                          }`}
                        >
                          {/* Tab Number */}
                          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 text-xs flex items-center justify-center font-medium transition-all duration-300 ${
                            isActive 
                              ? 'bg-primary-foreground text-primary border-primary-foreground shadow-sm' 
                              : 'bg-muted text-muted-foreground border-border group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <tab.icon className={`w-4 h-4 transition-all duration-300 ${
                              isActive ? 'scale-110' : 'group-hover:scale-105'
                            }`} />
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
                              <div className={`text-xs mt-1 transition-colors duration-300 ${
                                isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                              }`}>
                                مطلوب
                              </div>
                            )}
                          </div>
                          
                          {/* Hover effect overlay */}
                          <div className={`absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 transition-opacity duration-300 pointer-events-none rounded-xl ${
                            !isActive ? 'group-hover:opacity-100' : ''
                          }`} />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl">
                        <p className="font-medium text-foreground text-sm">{tab.label}</p>
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
                  className="flex items-center gap-2 h-9 px-3 text-sm border-border/60 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  السابق
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextTab}
                  disabled={isLastTab()}
                  className="flex items-center gap-2 h-9 px-3 text-sm border-border/60 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 dark:hover:from-muted/30 dark:hover:to-muted/15 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  التالي
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>

            {/* Content Container */}
            <Card className="min-h-[500px] overflow-hidden shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm border-border/50">
              <Suspense fallback={<SectionLoader />}>
                <TabsContent value="basic" className="p-6 space-y-6 m-0">
                  <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-xl border border-primary/20 dark:border-primary/30">
                    <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 rounded-lg shadow-sm">
                      <Info className="w-4 h-4 text-primary dark:text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">المعلومات الأساسية</h3>
                    <Badge variant="destructive" className="text-xs shadow-sm">مطلوب</Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl z-50"
                        side="top"
                        sideOffset={5}
                      >
                        <p className="text-sm">املأ جميع الحقول المطلوبة لضمان ظهور المنتج بشكل صحيح</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                  
                  {/* Main Content Grid */}
                  <div className="space-y-8">
                    {/* Basic Product Information */}
                    <div>
                      <BasicProductInfo form={form} />
                    </div>
                    
                    {/* Categories and Selling Type */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <ProductCategories
                          form={form}
                          categories={categories}
                          subcategories={subcategories}
                          organizationId={organizationId}
                          onCategoryCreated={onCategoryCreated}
                          onSubcategoryCreated={onSubcategoryCreated}
                        />
                      </div>
                      <div className="space-y-6">
                        <ProductSellingType form={form} onHasVariantsChange={onHasVariantsChange} />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="media" className="p-6 space-y-6 m-0">
                  <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2 rounded-lg shadow-sm">
                      <Images className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">صور المنتج</h3>
                    <Badge variant="destructive" className="text-xs shadow-sm">مطلوب</Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl z-50"
                        side="top"
                        sideOffset={5}
                      >
                        <p className="text-sm">أضف صورة رئيسية عالية الجودة وصور إضافية لعرض المنتج</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                  <ProductImagesManager
                    mainImage={watchThumbnailImage || ''}
                    additionalImages={additionalImages}
                    onMainImageChange={onMainImageChange}
                    onAdditionalImagesChange={onAdditionalImagesChange}
                    thumbnailImageRef={thumbnailImageRef} 
                  />
                </TabsContent>
                
                <TabsContent value="pricing_inventory" className="p-6 space-y-6 m-0">
                  <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-green-50/60 via-emerald-50/40 to-transparent dark:from-green-950/30 dark:via-emerald-950/20 dark:to-transparent rounded-xl border border-green-200/50 dark:border-green-800/30">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 p-2 rounded-lg shadow-sm">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">السعر والمخزون</h3>
                    <Badge variant="destructive" className="text-xs shadow-sm">مطلوب</Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl z-50"
                        side="top"
                        sideOffset={5}
                      >
                        <p className="text-sm">حدد أسعار المنتج وكمية المخزون المتوفرة</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                  
                  {/* Main Content - Responsive Layout */}
                  <div className="space-y-8">
                    {/* Pricing Section */}
                    <div className="w-full">
                      <ProductPricing form={form} />
                    </div>
                    
                    {/* Inventory Section */}
                    <div className="w-full">
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
                    <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-transparent dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-xl border border-purple-200/50 dark:border-purple-800/30">
                      <div className="bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 p-2 rounded-lg shadow-sm">
                        <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="font-bold text-base text-foreground">متغيرات المنتج</h3>
                      <Badge variant="secondary" className="text-xs shadow-sm">اختياري</Badge>
                    </div>
                    <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
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
                  <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent rounded-xl border border-amber-200/50 dark:border-amber-800/30">
                    <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 p-2 rounded-lg shadow-sm">
                      <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">خيارات متقدمة</h3>
                    <Badge variant="secondary" className="text-xs shadow-sm">اختياري</Badge>
                  </div>
                  <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
                      <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-2 rounded-lg shadow-sm">
                          <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        أسعار الجملة
                      </h4>
                      <WholesaleTierManager
                        productId={productId || ''}
                        organizationId={organizationId}
                        onChange={onWholesaleTiersChange} 
                      />
                    </div>
                    
                    <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
                      <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                        <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 p-2 rounded-lg shadow-sm">
                          <Package className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        التوصيل والنماذج
                      </h4>
                      <ProductShippingAndTemplates
                        form={form}
                        organizationId={organizationId}
                      />
                    </div>
                    
                    <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
                      <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                        <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/60 dark:to-purple-800/60 p-2 rounded-lg shadow-sm">
                          <Megaphone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        التسويق والمشاركة
                      </h4>
                      <MarketingAndEngagementTabs 
                        form={form} 
                        organizationId={organizationId} 
                        productId={productId} 
                      />
                    </div>
                    
                    <div className="bg-gradient-to-r from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/10 rounded-xl p-6 border border-border/50 backdrop-blur-sm shadow-sm">
                      <h4 className="font-medium mb-4 flex items-center gap-3 text-foreground text-sm">
                        <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-2 rounded-lg shadow-sm">
                          <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
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
