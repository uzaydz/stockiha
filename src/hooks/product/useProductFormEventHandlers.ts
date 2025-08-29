import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';

interface UseProductFormEventHandlersProps {
  form: UseFormReturn<ProductFormValues>;
  setProductColors: (colors: ProductColor[]) => void;
  setAdditionalImages: (images: string[]) => void;
  setWholesaleTiers: (tiers: WholesaleTier[]) => void;
  setUseVariantPrices: (use: boolean) => void;
  setUseSizes: (use: boolean) => void;
  setHasVariantsState: (has: boolean) => void;
}

interface UseProductFormEventHandlersReturn {
  handleMainImageChange: (url: string) => void;
  handleAdditionalImagesChange: (urls: string[]) => void;
  handleProductColorsChange: (colors: ProductColor[]) => void;
  handleWholesaleTiersChange: (tiers: WholesaleTier[]) => void;
  handleHasVariantsChange: (hasVariantsValue: boolean) => void;
  handleUseVariantPricesChange: (use: boolean) => void;
  handleUseSizesChange: (use: boolean) => void;
}

export const useProductFormEventHandlers = ({
  form,
  setProductColors,
  setAdditionalImages,
  setWholesaleTiers,
  setUseVariantPrices,
  setUseSizes,
  setHasVariantsState,
}: UseProductFormEventHandlersProps): UseProductFormEventHandlersReturn => {
  
  // Optimized handlers with useCallback
  const handleMainImageChange = useCallback((url: string) => {
    form.setValue('thumbnail_image', url, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleAdditionalImagesChange = useCallback((urls: string[]) => {
    setAdditionalImages(urls);
  }, [setAdditionalImages]);

  const handleProductColorsChange = useCallback((colors: ProductColor[]) => {
    // Clean colors from null values before setting them
    const cleanedColors = colors.map(color => ({
      ...color,
      barcode: color.barcode === null || color.barcode === 'null' ? undefined : color.barcode,
      price: color.price === null ? undefined : color.price,
      purchase_price: color.purchase_price === null ? undefined : color.purchase_price,
      variant_number: color.variant_number === null ? undefined : color.variant_number,
      image_url: color.image_url === null ? undefined : color.image_url,
      sizes: color.sizes ? color.sizes.map(size => ({
        ...size,
        barcode: size.barcode === null || size.barcode === 'null' ? undefined : size.barcode,
        price: size.price === null ? undefined : size.price,
        purchase_price: size.purchase_price === null ? undefined : size.purchase_price,
      })) : undefined
    }));
    
    setProductColors(cleanedColors);
    // Update form as well
    form.setValue('colors', cleanedColors, { shouldValidate: true, shouldDirty: true });
  }, [form, setProductColors]);

  const handleWholesaleTiersChange = useCallback((tiers: WholesaleTier[]) => {
    setWholesaleTiers(tiers);
  }, [setWholesaleTiers]);

  const handleHasVariantsChange = useCallback((hasVariantsValue: boolean) => {
    form.setValue('has_variants', hasVariantsValue, { shouldValidate: true, shouldDirty: true });
    setHasVariantsState(hasVariantsValue);
    if (!hasVariantsValue) {
      setProductColors([]);
      setUseVariantPrices(false);
    }
  }, [form, setHasVariantsState, setProductColors, setUseVariantPrices]);

  const handleUseVariantPricesChange = useCallback((use: boolean) => {
    setUseVariantPrices(use);
  }, [setUseVariantPrices]);

  const handleUseSizesChange = useCallback((use: boolean) => {
    setUseSizes(use);
    form.setValue('use_sizes', use, { shouldValidate: true, shouldDirty: true });
  }, [form, setUseSizes]);

  return {
    handleMainImageChange,
    handleAdditionalImagesChange,
    handleProductColorsChange,
    handleWholesaleTiersChange,
    handleHasVariantsChange,
    handleUseVariantPricesChange,
    handleUseSizesChange,
  };
};
