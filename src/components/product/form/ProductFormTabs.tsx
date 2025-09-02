import React, { memo, useRef } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UseFormReturn, FormProvider } from 'react-hook-form';

// Import new modular components
import { useProductFormTabs } from '@/hooks/useProductFormTabs';

import ProductFormTabsList from './components/ProductFormTabsList';
import ProductFormTabContent from './components/ProductFormTabContent';

import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
import { Category, Subcategory } from '@/lib/api/categories';
import { ImageUploaderRef } from '@/components/ui/ImageUploader';

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
  onAddColor?: (e?: React.MouseEvent) => void;
}

const ProductFormTabs = memo<ProductFormTabsProps>(({
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
  onAddColor,
}) => {
  const thumbnailImageRef = useRef<ImageUploaderRef>(null);

  // Use the enhanced tabs hook
  const {
    activeTab,
    isTransitioning,
    tabsData,
    setActiveTab,
    goToPreviousTab,
    goToNextTab,
    goToFirstIncompleteTab,
    getTabStatus,
    currentTabIndex,
    isFirstTab,
    isLastTab,
    progress,
    validationSummary,
    currentTab,
  } = useProductFormTabs({
    form,
    watchHasVariants,
    watchPrice,
    watchPurchasePrice,
    watchThumbnailImage,
    productColors,
    organizationId: organizationId || '',
  });

  // Debug logging

  return (
    <TooltipProvider>
      <FormProvider {...form}>
        <div className="space-y-6">


          {/* Enhanced Tabs Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Enhanced Tabs List */}
            <ProductFormTabsList
              tabsData={tabsData}
              activeTab={activeTab}
              currentTabIndex={currentTabIndex}
              isFirstTab={isFirstTab}
              isLastTab={isLastTab}
              isTransitioning={isTransitioning}
              onTabChange={setActiveTab}
              onPreviousTab={goToPreviousTab}
              onNextTab={goToNextTab}
              getTabStatus={getTabStatus}
            />

            {/* Enhanced Tab Content */}
            <ProductFormTabContent
              activeTab={activeTab}
              isTransitioning={isTransitioning}
              form={form}
              organizationId={organizationId}
              productId={productId}
              additionalImages={additionalImages}
              productColors={productColors}
              wholesaleTiers={wholesaleTiers}
              categories={categories}
              subcategories={subcategories}
              useVariantPrices={useVariantPrices}
              useSizes={useSizes}
              watchHasVariants={watchHasVariants}
              watchPrice={watchPrice}
              watchPurchasePrice={watchPurchasePrice}
              watchThumbnailImage={watchThumbnailImage}
              thumbnailImageRef={thumbnailImageRef}
              onMainImageChange={onMainImageChange}
              onAdditionalImagesChange={onAdditionalImagesChange}
              onProductColorsChange={onProductColorsChange}
              onWholesaleTiersChange={onWholesaleTiersChange}
              onCategoryCreated={onCategoryCreated}
              onSubcategoryCreated={onSubcategoryCreated}
              onHasVariantsChange={onHasVariantsChange}
              onUseVariantPricesChange={onUseVariantPricesChange}
              onUseSizesChange={onUseSizesChange}
              onAddColor={onAddColor}
            />
          </Tabs>
        </div>
      </FormProvider>
    </TooltipProvider>
  );
});

ProductFormTabs.displayName = 'ProductFormTabs';

export default ProductFormTabs;
