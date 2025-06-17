import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues, ProductColor } from '@/types/product';

export interface TabData {
  value: string;
  label: string;
  shortLabel: string;
  icon: any;
  description: string;
  required: boolean;
  tooltip: string;
  color?: string;
}

export type TabStatus = 'complete' | 'partial' | 'empty' | 'optional';

interface UseProductFormTabsProps {
  form: UseFormReturn<ProductFormValues>;
  watchHasVariants: boolean;
  watchPrice: number;
  watchPurchasePrice: number;
  watchIsActive: boolean;
  watchThumbnailImage: string | undefined;
  productColors: ProductColor[];
  organizationId: string;
}

export const useProductFormTabs = ({
  form,
  watchHasVariants,
  watchPrice,
  watchPurchasePrice,
  watchIsActive,
  watchThumbnailImage,
  productColors,
  organizationId,
}: UseProductFormTabsProps) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Watch form values for validation status
  const watchName = form.watch('name');
  const watchCategory = form.watch('category_id');
  const watchSku = form.watch('sku');
  const watchBarcode = form.watch('barcode');
  const watchDescription = form.watch('description');
  
  // Get form state for auto-save
  const formState = form.formState;

  // Enhanced tab status calculation
  const getTabStatus = useCallback((tabValue: string): TabStatus => {
    switch (tabValue) {
      case 'basic': {
        const requiredFields = [watchName, watchCategory, watchSku];
        const optionalFields = [watchBarcode, watchDescription];
        const completedRequired = requiredFields.filter(Boolean).length;
        const completedOptional = optionalFields.filter(Boolean).length;
        
        if (completedRequired === requiredFields.length) {
          return completedOptional > 0 ? 'complete' : 'partial';
        }
        return completedRequired > 0 ? 'partial' : 'empty';
      }
      case 'media':
        return watchThumbnailImage ? 'complete' : 'empty';
      case 'pricing_inventory':
        return watchPrice > 0 ? 'complete' : 'empty';
      case 'variants':
        if (!watchHasVariants) return 'optional';
        return productColors.length > 0 ? 'complete' : 'empty';
      case 'advanced':
        return 'optional';
      default:
        return 'empty';
    }
  }, [watchName, watchCategory, watchSku, watchBarcode, watchDescription, watchThumbnailImage, watchPrice, watchHasVariants, productColors]);

  // Tab configuration with enhanced data
  const tabsData = useMemo((): TabData[] => [
    {
      value: "basic",
      label: "المعلومات الأساسية",
      shortLabel: "أساسية",
      icon: "Info",
      description: "الاسم، الوصف، والتصنيف",
      required: true,
      tooltip: "أدخل المعلومات الأساسية للمنتج مثل الاسم والوصف والتصنيف",
      color: "primary"
    },
    {
      value: "media",
      label: "الصور",
      shortLabel: "صور",
      icon: "Images",
      description: "صور المنتج الأساسية",
      required: true,
      tooltip: "أضف الصورة الرئيسية والصور الإضافية للمنتج",
      color: "blue"
    },
    {
      value: "pricing_inventory",
      label: "السعر والمخزون",
      shortLabel: "سعر",
      icon: "DollarSign",
      description: "الأسعار وإدارة المخزون",
      required: true,
      tooltip: "حدد سعر المنتج وكمية المخزون",
      color: "green"
    },
    ...(watchHasVariants ? [{
      value: "variants",
      label: "المتغيرات",
      shortLabel: "متغيرات",
      icon: "Palette",
      description: "الألوان والأحجام",
      required: false,
      tooltip: "أضف متغيرات المنتج مثل الألوان والأحجام",
      color: "purple"
    }] : []),
    {
      value: "advanced",
      label: "خيارات متقدمة",
      shortLabel: "متقدم",
      icon: "Settings",
      description: "الجملة، التوصيل، والتسويق",
      required: false,
      tooltip: "إعدادات الجملة والتوصيل والتسويق",
      color: "amber"
    }
  ], [watchHasVariants]);

  // Enhanced progress calculation
  const calculateProgress = useCallback(() => {
    const requiredTabs = tabsData.filter(tab => tab.required);
    const completedTabs = requiredTabs.filter(tab => {
      const status = getTabStatus(tab.value);
      return status === 'complete' || status === 'partial';
    }).length;
    
    const partialWeight = 0.7; // Partial completion counts as 70%
    const partialTabs = requiredTabs.filter(tab => getTabStatus(tab.value) === 'partial').length;
    const completeTabs = requiredTabs.filter(tab => getTabStatus(tab.value) === 'complete').length;
    
    const totalProgress = (completeTabs + (partialTabs * partialWeight)) / requiredTabs.length;
    return Math.round(totalProgress * 100);
  }, [tabsData, getTabStatus]);

  // Enhanced navigation functions
  const getCurrentTabIndex = useCallback(() => 
    tabsData.findIndex(tab => tab.value === activeTab), [tabsData, activeTab]);

  const isFirstTab = useCallback(() => getCurrentTabIndex() === 0, [getCurrentTabIndex]);
  const isLastTab = useCallback(() => getCurrentTabIndex() === tabsData.length - 1, [getCurrentTabIndex, tabsData]);

  const changeTab = useCallback(async (newTab: string) => {
    if (newTab === activeTab) return;
    
    setIsTransitioning(true);
    
    // Add transition delay for smooth UX
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setActiveTab(newTab);
    setIsTransitioning(false);
  }, [activeTab]);

  const goToPreviousTab = useCallback(async () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex > 0) {
      await changeTab(tabsData[currentIndex - 1].value);
    }
  }, [getCurrentTabIndex, tabsData, changeTab]);

  const goToNextTab = useCallback(async () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex < tabsData.length - 1) {
      await changeTab(tabsData[currentIndex + 1].value);
    }
  }, [getCurrentTabIndex, tabsData, changeTab]);

  const goToFirstIncompleteTab = useCallback(async () => {
    const incompleteTab = tabsData
      .filter(tab => tab.required)
      .find(tab => getTabStatus(tab.value) === 'empty');
    
    if (incompleteTab) {
      await changeTab(incompleteTab.value);
    }
  }, [tabsData, getTabStatus, changeTab]);

  // Enhanced keyboard navigation
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
          case '1':
          case '2':
          case '3':
          case '4':
          case '5': {
            event.preventDefault();
            const index = parseInt(event.key) - 1;
            if (tabsData[index]) {
              changeTab(tabsData[index].value);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousTab, goToNextTab, changeTab, tabsData]);

  // Auto-save every 2 seconds with debounce
  useEffect(() => {
    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only auto-save if form has meaningful data
    if (formState.isDirty && !formState.isSubmitting) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        const formData = form.getValues();
        const hasMinimalData = formData.name?.trim() || formData.description?.trim();
        
        if (hasMinimalData) {
          try {
            localStorage.setItem(`product-form-draft-${organizationId}`, JSON.stringify({
              ...formData,
              lastSaved: new Date().toISOString()
            }));
            setAutoSaveStatus('حُفظت المسودة تلقائياً');
            
            setTimeout(() => setAutoSaveStatus(''), 2000);
          } catch (error) {
            console.warn('Failed to auto-save draft:', error);
          }
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formState.isDirty, formState.isSubmitting, form, organizationId]);

  // Prevent memory leaks and UNSAFE lifecycle warnings
  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Auto-save integration
  useEffect(() => {
    const progress = calculateProgress();
    
    // Store progress in localStorage for persistence
    localStorage.setItem('product-form-progress', JSON.stringify({
      activeTab,
      progress,
      timestamp: Date.now()
    }));
  }, [activeTab, calculateProgress]);

  // Validation summary
  const validationSummary = useMemo(() => {
    const requiredTabs = tabsData.filter(tab => tab.required);
    const errors = requiredTabs.filter(tab => getTabStatus(tab.value) === 'empty');
    const warnings = requiredTabs.filter(tab => getTabStatus(tab.value) === 'partial');
    
    return {
      totalRequired: requiredTabs.length,
      completed: requiredTabs.filter(tab => getTabStatus(tab.value) === 'complete').length,
      errors: errors.length,
      warnings: warnings.length,
      errorTabs: errors.map(tab => tab.label),
      warningTabs: warnings.map(tab => tab.label)
    };
  }, [tabsData, getTabStatus]);

  return {
    // State
    activeTab,
    isTransitioning,
    tabsData,
    
    // Functions
    setActiveTab: changeTab,
    goToPreviousTab,
    goToNextTab,
    goToFirstIncompleteTab,
    getTabStatus,
    
    // Computed values
    currentTabIndex: getCurrentTabIndex(),
    isFirstTab: isFirstTab(),
    isLastTab: isLastTab(),
    progress: calculateProgress(),
    validationSummary,
    
    // Current tab info
    currentTab: tabsData[getCurrentTabIndex()],
    
    // Auto-save status
    autoSaveStatus,
  };
}; 