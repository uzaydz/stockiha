import { useState, useCallback, useMemo } from 'react';
import { ProductColor, WholesaleTier } from '@/types/product';

interface UseProductFormStateReturn {
  // State
  additionalImages: string[];
  productColors: ProductColor[];
  wholesaleTiers: WholesaleTier[];
  useVariantPrices: boolean;
  useSizes: boolean;
  hasVariantsState: boolean;
  autoSaveDrafts: boolean;
  isSavingDraft: boolean;
  isManualSubmit: boolean;
  
  // Setters
  setAdditionalImages: (images: string[]) => void;
  setProductColors: (colors: ProductColor[]) => void;
  setWholesaleTiers: (tiers: WholesaleTier[]) => void;
  setUseVariantPrices: (use: boolean) => void;
  setUseSizes: (use: boolean) => void;
  setHasVariantsState: (has: boolean) => void;
  setAutoSaveDrafts: (enabled: boolean) => void;
  setIsSavingDraft: (saving: boolean) => void;
  setIsManualSubmit: (manual: boolean) => void;
  
  // Computed values
  hasImages: boolean;
  hasColors: boolean;
  hasWholesaleTiers: boolean;
  totalImagesCount: number;
}

export const useProductFormState = (): UseProductFormStateReturn => {
  // Enhanced state management
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTier[]>([]);
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [useSizes, setUseSizes] = useState(false);
  const [hasVariantsState, setHasVariantsState] = useState(false);
  const [autoSaveDrafts, setAutoSaveDrafts] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isManualSubmit, setIsManualSubmit] = useState(false);

  // Memoized computed values for performance
  const hasImages = useMemo(() => additionalImages.length > 0, [additionalImages]);
  const hasColors = useMemo(() => productColors.length > 0, [productColors]);
  const hasWholesaleTiers = useMemo(() => wholesaleTiers.length > 0, [wholesaleTiers]);
  const totalImagesCount = useMemo(() => additionalImages.length, [additionalImages]);

  // Optimized setters with useCallback
  const setAdditionalImagesOptimized = useCallback((images: string[]) => {
    console.log('🔍 [useProductFormState] setAdditionalImagesOptimized called with:', {
      images,
      imagesCount: images.length
    });
    setAdditionalImages(images);
  }, []);

  const setProductColorsOptimized = useCallback((colors: ProductColor[]) => {
    console.log('🔍 [useProductFormState] setProductColors called with:', colors);
    console.log('🔍 [useProductFormState] colors.length:', colors?.length || 0);
    setProductColors(colors);
  }, []);

  const setWholesaleTiersOptimized = useCallback((tiers: WholesaleTier[]) => {
    setWholesaleTiers(tiers);
  }, []);

  const setUseVariantPricesOptimized = useCallback((use: boolean) => {
    setUseVariantPrices(use);
  }, []);

  const setUseSizesOptimized = useCallback((use: boolean) => {
    setUseSizes(use);
  }, []);

  const setHasVariantsStateOptimized = useCallback((has: boolean) => {
    setHasVariantsState(has);
  }, []);

  const setAutoSaveDraftsOptimized = useCallback((enabled: boolean) => {
    setAutoSaveDrafts(enabled);
  }, []);

  const setIsSavingDraftOptimized = useCallback((saving: boolean) => {
    setIsSavingDraft(saving);
  }, []);

  const setIsManualSubmitOptimized = useCallback((manual: boolean) => {
    setIsManualSubmit(manual);
  }, []);

  return {
    // State
    additionalImages,
    productColors,
    wholesaleTiers,
    useVariantPrices,
    useSizes,
    hasVariantsState,
    autoSaveDrafts,
    isSavingDraft,
    isManualSubmit,
    
    // Setters
    setAdditionalImages: setAdditionalImagesOptimized,
    setProductColors: setProductColorsOptimized,
    setWholesaleTiers: setWholesaleTiersOptimized,
    setUseVariantPrices: setUseVariantPricesOptimized,
    setUseSizes: setUseSizesOptimized,
    setHasVariantsState: setHasVariantsStateOptimized,
    setAutoSaveDrafts: setAutoSaveDraftsOptimized,
    setIsSavingDraft: setIsSavingDraftOptimized,
    setIsManualSubmit: setIsManualSubmitOptimized,
    
    // Computed values
    hasImages,
    hasColors,
    hasWholesaleTiers,
    totalImagesCount,
  };
};
