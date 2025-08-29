import { useCallback, useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { ProductColor, WholesaleTier } from '@/types/product';
import { toast } from 'sonner';

interface UseProductFormAutoSaveProps {
  form: UseFormReturn<ProductFormValues>;
  autoSaveDrafts: boolean;
  isEditMode: boolean;
  organizationId?: string;
  additionalImages: string[];
  productColors: ProductColor[];
  wholesaleTiers: WholesaleTier[];
  isSavingDraft: boolean;
  setIsSavingDraft: (saving: boolean) => void;
}

interface DraftData {
  formData: Partial<ProductFormValues>;
  timestamp: number;
  additionalImages: string[];
  productColors: ProductColor[];
  wholesaleTiers: WholesaleTier[];
}

export const useProductFormAutoSave = ({
  form,
  autoSaveDrafts,
  isEditMode,
  organizationId,
  additionalImages,
  productColors,
  wholesaleTiers,
  isSavingDraft,
  setIsSavingDraft,
}: UseProductFormAutoSaveProps) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<Partial<ProductFormValues>>({});

  // Save draft function
  const saveDraft = useCallback(async () => {
    if (!autoSaveDrafts || isEditMode || !organizationId) return;
    
    setIsSavingDraft(true);
    try {
      const currentValues = form.getValues();
      
      // Check if there are actual changes to save
      const hasChanges = Object.keys(currentValues).some(key => {
        const currentValue = currentValues[key as keyof ProductFormValues];
        const lastValue = lastSaveRef.current[key as keyof ProductFormValues];
        return JSON.stringify(currentValue) !== JSON.stringify(lastValue);
      });

      if (!hasChanges) {
        setIsSavingDraft(false);
        return;
      }

      const draftData: DraftData = {
        formData: currentValues,
        timestamp: Date.now(),
        additionalImages,
        productColors,
        wholesaleTiers,
      };
      
      localStorage.setItem(`product-draft-${organizationId}`, JSON.stringify(draftData));
      
      // Update last save reference
      lastSaveRef.current = { ...currentValues };
      
      // Show saving indicator briefly
      setTimeout(() => setIsSavingDraft(false), 800);
    } catch (error) {
      console.error('Failed to save draft:', error);
      setIsSavingDraft(false);
    }
  }, [
    autoSaveDrafts, 
    isEditMode, 
    organizationId, 
    form, 
    additionalImages, 
    productColors, 
    wholesaleTiers, 
    setIsSavingDraft
  ]);

  // Load draft function
  const loadDraft = useCallback(() => {
    if (!autoSaveDrafts || isEditMode || !organizationId) return false;
    
    try {
      const savedDraft = localStorage.getItem(`product-draft-${organizationId}`);
      if (!savedDraft) return false;
      
      const draftData: DraftData = JSON.parse(savedDraft);
      const timeDiff = Date.now() - draftData.timestamp;
      
      // Check if draft is less than 24 hours old
      if (timeDiff < 24 * 60 * 60 * 1000) {
        // Restore form values
        Object.entries(draftData.formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            form.setValue(key as keyof ProductFormValues, value, { shouldDirty: false });
          }
        });
        
        // Update last save reference
        lastSaveRef.current = { ...draftData.formData };
        
        toast.info('تم استرجاع المسودة المحفوظة');
        return true;
      } else {
        // Remove expired draft
        localStorage.removeItem(`product-draft-${organizationId}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
      return false;
    }
  }, [autoSaveDrafts, isEditMode, organizationId, form]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    if (!organizationId) return;
    
    try {
      localStorage.removeItem(`product-draft-${organizationId}`);
      lastSaveRef.current = {};
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [organizationId]);

  // Auto-save effect
  useEffect(() => {
    if (form.formState.isDirty && !isEditMode && autoSaveDrafts) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout for auto-save
      timeoutRef.current = setTimeout(saveDraft, 2000);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [form.watch(), form.formState.isDirty, isEditMode, autoSaveDrafts, saveDraft]);

  // Load draft on component mount
  useEffect(() => {
    if (!isEditMode && autoSaveDrafts && organizationId) {
      loadDraft();
    }
  }, [isEditMode, autoSaveDrafts, organizationId, loadDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    isSavingDraft,
  };
};
