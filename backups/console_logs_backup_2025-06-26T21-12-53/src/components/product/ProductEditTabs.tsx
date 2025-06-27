import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues, ProductColor, WholesaleTier } from "@/types/product";
import BasicProductInfo from './BasicProductInfo';
import ProductCategories from './ProductCategories';
import ProductPricing from './ProductPricing';
import ProductInventory from './ProductInventory';
import ProductVariants from './ProductVariants';
import ProductSKUBarcode from './ProductSKUBarcode';
import ProductSellingType from './ProductSellingType';
import ProductColorManager from './ProductColorManager';
import ProductImagesManager from './ProductImagesManager';
import WholesaleTierManager from './WholesaleTierManager';

interface ProductEditTabsProps {
  form: UseFormReturn<ProductFormValues>;
  categories: any[];
  subcategories: any[];
  productColors: ProductColor[];
  additionalImages: string[];
  wholesaleTiers: WholesaleTier[];
  useVariantPrices: boolean;
  productId: string;
  organizationId: string;
  useSizes: boolean;
  thumbnailImageRef: React.RefObject<any>;
  onProductColorsChange: (colors: ProductColor[]) => void;
  onAdditionalImagesChange: (urls: string[]) => void;
  onHasVariantsChange: (hasVariants: boolean) => void;
  onMainImageChange: (url: string) => void;
  onWholesaleTiersChange: (tiers: WholesaleTier[]) => void;
}

const ProductEditTabs: React.FC<ProductEditTabsProps> = ({
  form,
  categories,
  subcategories,
  productColors,
  additionalImages,
  wholesaleTiers,
  useVariantPrices,
  productId,
  organizationId,
  useSizes,
  thumbnailImageRef,
  onProductColorsChange,
  onAdditionalImagesChange,
  onHasVariantsChange,
  onMainImageChange,
  onWholesaleTiersChange
}) => {
  const hasVariants = form.watch('has_variants');
  
  // Console logs للتتبع
  console.log('📋 ProductEditTabs - Rendering with values:', {
    productId,
    organizationId,
    hasVariants,
    currentStockQuantity: form.getValues('stock_quantity'),
    watchedStockQuantity: form.watch('stock_quantity'),
    formValues: form.getValues()
  });
  
  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid grid-cols-7 mb-6">
        <TabsTrigger value="basic">أساسي</TabsTrigger>
        <TabsTrigger value="variants" disabled={!hasVariants}>
          المتغيرات
        </TabsTrigger>
        <TabsTrigger value="pricing">التسعير</TabsTrigger>
        <TabsTrigger value="inventory">المخزون</TabsTrigger>
        <TabsTrigger value="images">الصور</TabsTrigger>
        <TabsTrigger value="categories">الفئات</TabsTrigger>
        <TabsTrigger value="advanced">متقدم</TabsTrigger>
      </TabsList>

      {/* المعلومات الأساسية */}
      <TabsContent value="basic" className="space-y-6">
        <BasicProductInfo form={form} />
        <ProductSKUBarcode 
          form={form} 
          productId={productId} 
          organizationId={organizationId} 
        />
        <ProductSellingType 
          form={form} 
          onHasVariantsChange={onHasVariantsChange}
        />
      </TabsContent>

      {/* المتغيرات */}
      <TabsContent value="variants" className="space-y-6">
        <ProductColorManager
          colors={productColors}
          onChange={onProductColorsChange}
          basePrice={form.watch('price')}
          basePurchasePrice={form.watch('purchase_price')}
          useVariantPrices={useVariantPrices}
          onUseVariantPricesChange={(value) => form.setValue('use_variant_prices', value)}
          useSizes={useSizes}
          onUseSizesChange={(value) => form.setValue('use_sizes', value)}
          productId={productId}
        />
      </TabsContent>

      {/* التسعير */}
      <TabsContent value="pricing" className="space-y-6">
        <ProductPricing form={form} />
        {form.watch('allow_wholesale') && (
          <WholesaleTierManager
            productId={productId}
            organizationId={organizationId}
            defaultPrice={form.watch('price')}
            onChange={onWholesaleTiersChange}
            readOnly={false}
          />
        )}
      </TabsContent>

      {/* المخزون */}
      <TabsContent value="inventory" className="space-y-6">
        <ProductInventory 
          form={form} 
          hasVariants={form.watch('has_variants')}
          organizationId={organizationId}
          productId={productId}
        />
      </TabsContent>

      {/* الصور */}
      <TabsContent value="images" className="space-y-6">
        <ProductImagesManager
          mainImage={form.watch('thumbnail_image')}
          additionalImages={additionalImages}
          onAdditionalImagesChange={onAdditionalImagesChange}
          onMainImageChange={onMainImageChange}
          thumbnailImageRef={thumbnailImageRef}
          productId={productId}
        />
      </TabsContent>

      {/* الفئات */}
      <TabsContent value="categories" className="space-y-6">
        <ProductCategories
          form={form}
          categories={categories}
          subcategories={subcategories}
          onCategoryCreated={(category) => {}}
          onSubcategoryCreated={(subcategory) => {}}
        />
      </TabsContent>

      {/* إعدادات متقدمة */}
      <TabsContent value="advanced" className="space-y-6">
        <ProductVariants 
          form={form} 
          useVariantPrices={useVariantPrices}
          productColors={productColors}
          onProductColorsChange={onProductColorsChange}
          mainImageUrl={form.watch('thumbnail_image')}
          productId={productId}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ProductEditTabs;
