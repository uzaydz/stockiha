import { useState, useCallback, useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues, ProductColor, WholesaleTier } from '@/types/product';
import { useLocalStorage } from './useLocalStorage';
import { useDebounce } from './useDebounce';

export type FormStep = 'basic' | 'images' | 'variants' | 'advanced' | 'review';
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface FormProgress {
  completed: FormStep[];
  current: FormStep;
  isValid: boolean;
  completionPercentage: number;
}

interface DraftData {
  formData: Partial<ProductFormValues>;
  timestamp: number;
  step: FormStep;
  additionalImages: string[];
  productColors: ProductColor[];
  wholesaleTiers: WholesaleTier[];
}

interface ValidationSummary {
  totalFields: number;
  validFields: number;
  errorFields: string[];
  warningFields: string[];
}

interface UseProductFormStateProps {
  form: UseFormReturn<ProductFormValues>;
  isEditMode: boolean;
  organizationId?: string;
  initialStep?: FormStep;
}

export const useProductFormState = ({
  form,
  isEditMode,
  organizationId,
  initialStep = 'basic'
}: UseProductFormStateProps) => {
  // Local state management
  const [currentStep, setCurrentStep] = useState<FormStep>(initialStep);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  
  // User preferences
  const [autoSaveDrafts, setAutoSaveDrafts] = useLocalStorage('product-form-autosave', true);
  const [viewportMode, setViewportMode] = useLocalStorage<ViewportMode>('product-form-viewport', 'desktop');
  const [collapsedSections, setCollapsedSections] = useLocalStorage<string[]>('product-form-collapsed', []);

  // Form data state
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);
  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTier[]>([]);
  const [useVariantPrices, setUseVariantPrices] = useState(false);
  const [useSizes, setUseSizes] = useState(false);
  const [hasVariantsState, setHasVariantsState] = useState(false);

  // Watch form values for auto-save and real-time validation
  const watchedValues = form.watch();
  const debouncedFormData = useDebounce(watchedValues, 2000);
  const formErrors = form.formState.errors;
  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;

  // Form progress calculation
  const formProgress = useMemo<FormProgress>(() => {
    const stepRequirements: Record<FormStep, string[]> = {
      basic: ['name', 'description', 'price', 'category_id'],
      images: ['thumbnail_image'],
      variants: hasVariantsState ? ['colors'] : [],
      advanced: [],
      review: []
    };

    const completed: FormStep[] = [];
    let totalRequiredFields = 0;
    let completedRequiredFields = 0;

    Object.entries(stepRequirements).forEach(([step, fields]) => {
      totalRequiredFields += fields.length;
      
      const stepValid = fields.every(field => {
        const value = form.getValues(field as keyof ProductFormValues);
        const isFieldValid = value !== undefined && value !== null && value !== '';
        if (isFieldValid) completedRequiredFields++;
        return isFieldValid;
      });

      if (stepValid) {
        completed.push(step as FormStep);
      }
    });

    // Special handling for variants step
    if (hasVariantsState && productColors.length > 0) {
      completed.push('variants');
    } else if (!hasVariantsState) {
      completed.push('variants');
    }

    const completionPercentage = totalRequiredFields > 0 
      ? Math.round((completedRequiredFields / totalRequiredFields) * 100)
      : 0;

    return {
      completed,
      current: currentStep,
      isValid: completed.length >= 3, // At least basic, images, and variants
      completionPercentage
    };
  }, [watchedValues, hasVariantsState, productColors, currentStep, form]);

  // Validation summary
  const validationSummary = useMemo<ValidationSummary>(() => {
    const allFields = [
      'name', 'description', 'price', 'purchase_price', 'category_id', 
      'stock_quantity', 'thumbnail_image', 'sku'
    ];
    
    const errorFields: string[] = [];
    const warningFields: string[] = [];
    let validFields = 0;

    allFields.forEach(field => {
      const value = form.getValues(field as keyof ProductFormValues);
      const hasError = formErrors[field as keyof ProductFormValues];
      
      if (hasError) {
        errorFields.push(field);
      } else if (value !== undefined && value !== null && value !== '') {
        validFields++;
        
        // Check for warnings
        if (field === 'price' && Number(value) <= 0) {
          warningFields.push(field);
        }
        if (field === 'stock_quantity' && Number(value) <= 0) {
          warningFields.push(field);
        }
      }
    });

    return {
      totalFields: allFields.length,
      validFields,
      errorFields,
      warningFields
    };
  }, [watchedValues, formErrors, form]);

  // Auto-save draft functionality
  const saveDraft = useCallback(async (data: Partial<ProductFormValues>) => {
    if (!autoSaveDrafts || isEditMode || !organizationId) return;
    
    setIsSavingDraft(true);
    
    try {
      const draftData: DraftData = {
        formData: data,
        timestamp: Date.now(),
        step: currentStep,
        additionalImages,
        productColors,
        wholesaleTiers
      };
      
      const draftKey = `product-draft-${organizationId}`;
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      
      // Auto-hide saving indicator after a delay
      setTimeout(() => setIsSavingDraft(false), 800);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setIsSavingDraft(false);
    }
  }, [
    autoSaveDrafts, 
    isEditMode, 
    organizationId, 
    currentStep, 
    additionalImages, 
    productColors, 
    wholesaleTiers
  ]);

  // Load draft on component mount
  const loadDraft = useCallback(() => {
    if (!isEditMode && autoSaveDrafts && organizationId) {
      try {
        const draftKey = `product-draft-${organizationId}`;
        const savedDraft = localStorage.getItem(draftKey);
        
        if (savedDraft) {
          const draftData: DraftData = JSON.parse(savedDraft);
          const timeDiff = Date.now() - draftData.timestamp;
          
          // Load draft if it's less than 24 hours old
          if (timeDiff < 24 * 60 * 60 * 1000) {
            // Restore form data
            Object.entries(draftData.formData).forEach(([key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
                form.setValue(key as keyof ProductFormValues, value, { shouldDirty: false });
              }
            });
            
            // Restore additional state
            setAdditionalImages(draftData.additionalImages || []);
            setProductColors(draftData.productColors || []);
            setWholesaleTiers(draftData.wholesaleTiers || []);
            setCurrentStep(draftData.step || 'basic');
            
            return true; // Draft loaded
          }
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
    return false; // No draft loaded
  }, [isEditMode, autoSaveDrafts, organizationId, form]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (organizationId) {
      const draftKey = `product-draft-${organizationId}`;
      localStorage.removeItem(draftKey);
    }
  }, [organizationId]);

  // Auto-save effect
  useEffect(() => {
    if (isDirty && !isEditMode && autoSaveDrafts) {
      saveDraft(debouncedFormData);
    }
  }, [debouncedFormData, isDirty, isEditMode, autoSaveDrafts, saveDraft]);

  // Section collapse handlers
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, [setCollapsedSections]);

  const isSectionCollapsed = useCallback((sectionId: string) => {
    return collapsedSections.includes(sectionId);
  }, [collapsedSections]);

  // Step navigation
  const goToStep = useCallback((step: FormStep) => {
    setCurrentStep(step);
  }, []);

  const goToNextStep = useCallback(() => {
    const steps: FormStep[] = ['basic', 'images', 'variants', 'advanced', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    const steps: FormStep[] = ['basic', 'images', 'variants', 'advanced', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  // Optimized handlers
  const handleMainImageChange = useCallback((url: string) => {
    form.setValue('thumbnail_image', url, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleAdditionalImagesChange = useCallback((urls: string[]) => {
    setAdditionalImages(urls);
  }, []);

  const handleProductColorsChange = useCallback((colors: ProductColor[]) => {
    setProductColors(colors);
  }, []);

  const handleWholesaleTiersChange = useCallback((tiers: WholesaleTier[]) => {
    setWholesaleTiers(tiers);
  }, []);

  const handleHasVariantsChange = useCallback((hasVariantsValue: boolean) => {
    form.setValue('has_variants', hasVariantsValue, { shouldValidate: true, shouldDirty: true });
    setHasVariantsState(hasVariantsValue);
    if (!hasVariantsValue) {
      setProductColors([]);
      setUseVariantPrices(false);
    }
  }, [form]);

  const handleUseVariantPricesChange = useCallback((use: boolean) => {
    setUseVariantPrices(use);
  }, []);

  const handleUseSizesChange = useCallback((use: boolean) => {
    setUseSizes(use);
    form.setValue('use_sizes', use, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  // Viewport and UI handlers
  const handleViewportModeChange = useCallback((mode: ViewportMode) => {
    setViewportMode(mode);
  }, [setViewportMode]);

  const handlePreviewToggle = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  const handleValidationSummaryToggle = useCallback(() => {
    setShowValidationSummary(prev => !prev);
  }, []);

  // Data preparation for submission
  const prepareSubmissionData = useCallback((data: ProductFormValues) => {
    const imagesToSubmit = additionalImages.filter(url => typeof url === 'string' && url.length > 0);
    const colorsToSubmit = productColors.map(color => ({
      ...color,
      quantity: Number(color.quantity),
      price: color.price !== undefined ? Number(color.price) : undefined,
      purchase_price: color.purchase_price !== undefined ? Number(color.purchase_price) : undefined,
    }));
    const wholesaleTiersToSubmit = wholesaleTiers.map(tier => ({
      ...tier,
      min_quantity: Number(tier.min_quantity),
      price_per_unit: Number(tier.price_per_unit),
    }));

    return {
      ...data,
      images: imagesToSubmit,
      colors: colorsToSubmit,
      wholesale_tiers: wholesaleTiersToSubmit,
      price: Number(data.price),
      purchase_price: Number(data.purchase_price),
      stock_quantity: Number(data.stock_quantity),
      additional_images: imagesToSubmit,
    };
  }, [additionalImages, productColors, wholesaleTiers]);

  return {
    // State
    currentStep,
    isSavingDraft,
    showPreview,
    showValidationSummary,
    autoSaveDrafts,
    viewportMode,
    
    // Form data
    additionalImages,
    productColors,
    wholesaleTiers,
    useVariantPrices,
    useSizes,
    hasVariantsState,
    
    // Computed values
    formProgress,
    validationSummary,
    isDirty,
    isValid,
    
    // Actions
    setAutoSaveDrafts,
    saveDraft,
    loadDraft,
    clearDraft,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    toggleSection,
    isSectionCollapsed,
    
    // Handlers
    handleMainImageChange,
    handleAdditionalImagesChange,
    handleProductColorsChange,
    handleWholesaleTiersChange,
    handleHasVariantsChange,
    handleUseVariantPricesChange,
    handleUseSizesChange,
    handleViewportModeChange,
    handlePreviewToggle,
    handleValidationSummaryToggle,
    
    // Utilities
    prepareSubmissionData
  };
}; 