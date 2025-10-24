import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { 
  HeroSettings, 
  CategorySectionSettings, 
  FeaturedProductsSettings, 
  AboutSectionSettings, 
  FooterSectionSettings, 
  TestimonialSectionSettings,
  ComponentType 
} from '@/components/organization-editor/types';
import { 
  DEFAULT_HERO_SETTINGS, 
  DEFAULT_CATEGORY_SETTINGS, 
  DEFAULT_FEATURED_PRODUCTS_SETTINGS, 
  DEFAULT_ABOUT_SETTINGS, 
  DEFAULT_FOOTER_SETTINGS, 
  DEFAULT_TESTIMONIAL_SETTINGS 
} from '@/components/organization-editor/components-list';

// دالة لتطبيع أسماء المكونات للحفظ في قاعدة البيانات
const normalizeComponentTypeForDB = (type: string): string => {
  const dbTypeMap: Record<string, string> = {
    'product_categories': 'categories',
    'featured_products': 'featuredproducts',
    'hero': 'hero',
    'about': 'about',
    'testimonials': 'testimonials',
    'footer': 'footer'
  };
  return dbTypeMap[type] || type;
};

export const useComponentSettings = (organizationId: string) => {
  const { toast } = useToast();
  
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(() => ({
    ...DEFAULT_HERO_SETTINGS,
    organization_id: organizationId || ''
  }));
  
  const [categorySettings, setCategorySettings] = useState<CategorySectionSettings>(() => ({
    ...DEFAULT_CATEGORY_SETTINGS,
    organization_id: organizationId || ''
  }));
  
  const [featuredSettings, setFeaturedSettings] = useState<FeaturedProductsSettings>(() => ({
    ...DEFAULT_FEATURED_PRODUCTS_SETTINGS,
    organization_id: organizationId || ''
  }));
  
  const [aboutSettings, setAboutSettings] = useState<AboutSectionSettings>(() => ({
    ...DEFAULT_ABOUT_SETTINGS,
    organization_id: organizationId || ''
  }));
  
  const [footerSettings, setFooterSettings] = useState<FooterSectionSettings>(() => ({
    ...DEFAULT_FOOTER_SETTINGS,
    organization_id: organizationId || ''
  }));
  
  const [testimonialSettings, setTestimonialSettings] = useState<TestimonialSectionSettings>(() => ({
    ...DEFAULT_TESTIMONIAL_SETTINGS,
    organization_id: organizationId || ''
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const getSettingsForComponent = useCallback(
    (type: ComponentType) => {
      switch (type) {
        case 'hero':
          return heroSettings;
        case 'product_categories':
          return categorySettings;
        case 'featured_products':
          return featuredSettings;
        case 'about':
          return aboutSettings;
        case 'footer':
          return footerSettings;
        case 'testimonials':
          return testimonialSettings;
        default:
          return {};
      }
    },
    [heroSettings, categorySettings, featuredSettings, aboutSettings, footerSettings, testimonialSettings]
  );

  // Event handlers
  const handleHeroChange = useCallback((changes: Partial<HeroSettings>) => {
    setHeroSettings((prev) => ({
      ...prev,
      ...changes,
      primaryButton: {
        ...prev.primaryButton,
        ...(changes.primaryButton ?? {})
      },
      secondaryButton: {
        ...prev.secondaryButton,
        ...(changes.secondaryButton ?? {})
      },
      trustBadges: changes.trustBadges
        ? changes.trustBadges.map((badge) => ({ ...badge }))
        : prev.trustBadges
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleCategoryChange = useCallback((changes: Partial<CategorySectionSettings>) => {
    setCategorySettings((prev) => ({
      ...prev,
      ...changes
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleFeaturedChange = useCallback((key: keyof FeaturedProductsSettings, value: FeaturedProductsSettings[keyof FeaturedProductsSettings]) => {
    setFeaturedSettings((prev) => ({
      ...prev,
      [key]: Array.isArray(value) ? [...(value as any[])] : value
    }) as FeaturedProductsSettings);
    setHasUnsavedChanges(true);
  }, []);

  const handleAboutChange = useCallback((key: keyof AboutSectionSettings, value: AboutSectionSettings[keyof AboutSectionSettings]) => {
    setAboutSettings(prev => {
      let nextValue: any = value;
      if (Array.isArray(value)) {
        nextValue = [...value];
      } else if (typeof value === 'object' && value !== null) {
        nextValue = { ...(value as Record<string, any>) };
      }
      return {
        ...prev,
        [key]: nextValue
      } as AboutSectionSettings;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleFooterChange = useCallback((key: keyof FooterSectionSettings, value: FooterSectionSettings[keyof FooterSectionSettings]) => {
    setFooterSettings(prev => {
      let nextValue: any = value;
      if (Array.isArray(value)) {
        nextValue = [...value];
      } else if (typeof value === 'object' && value !== null) {
        nextValue = { ...(value as Record<string, any>) };
      }
      return {
        ...prev,
        [key]: nextValue
      } as FooterSectionSettings;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleTestimonialChange = useCallback((changes: Partial<TestimonialSectionSettings>) => {
    setTestimonialSettings((prev) => ({
      ...prev,
      ...changes
    }));
    setHasUnsavedChanges(true);
  }, []);

  const handleReset = useCallback((componentType: ComponentType) => {
    if (componentType === 'hero') {
      setHeroSettings(() => ({
        ...DEFAULT_HERO_SETTINGS,
        organization_id: organizationId || ''
      }));
    } else if (componentType === 'product_categories') {
      setCategorySettings(() => ({
        ...DEFAULT_CATEGORY_SETTINGS,
        organization_id: organizationId || ''
      }));
    } else if (componentType === 'featured_products') {
      setFeaturedSettings(() => ({
        ...DEFAULT_FEATURED_PRODUCTS_SETTINGS,
        organization_id: organizationId || ''
      }));
    } else if (componentType === 'about') {
      setAboutSettings(() => ({
        ...DEFAULT_ABOUT_SETTINGS,
        organization_id: organizationId || ''
      }));
    } else if (componentType === 'footer') {
      setFooterSettings(() => ({
        ...DEFAULT_FOOTER_SETTINGS,
        organization_id: organizationId || ''
      }));
    } else if (componentType === 'testimonials') {
      setTestimonialSettings(() => ({
        ...DEFAULT_TESTIMONIAL_SETTINGS,
        organization_id: organizationId || ''
      }));
    }
    setHasUnsavedChanges(false);
  }, [organizationId]);

  // Database operations
  const loadComponentSettings = useCallback(async (componentType: ComponentType) => {
    if (!organizationId) return;
    
    setIsLoading(true);
    try {
      const dbComponentType = normalizeComponentTypeForDB(componentType);
      
      const { data, error } = await supabase
        .from('store_settings')
        .select('settings, is_active, order_index')
        .eq('organization_id', organizationId)
        .eq('component_type', dbComponentType)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings) {
        const loadedSettings = data.settings as any;
        
        switch (componentType) {
          case 'hero':
            setHeroSettings(prev => ({
              ...prev,
              ...loadedSettings,
              organization_id: organizationId
            }));
            break;
          case 'product_categories':
            setCategorySettings(prev => ({
              ...prev,
              ...loadedSettings,
              organization_id: organizationId,
              selectedCategories: loadedSettings.categoryOrder || loadedSettings.selectedCategories || []
            }));
            break;
          case 'featured_products':
            setFeaturedSettings(prev => ({
              ...prev,
              ...loadedSettings,
              selectedProducts: Array.isArray(loadedSettings.selectedProducts) ? loadedSettings.selectedProducts : [],
              organization_id: organizationId
            }));
            break;
          case 'about':
            setAboutSettings(prev => ({
              ...prev,
              ...loadedSettings,
              features: Array.isArray(loadedSettings.features) ? [...loadedSettings.features] : (prev.features || []),
              storeInfo: loadedSettings.storeInfo ? { ...loadedSettings.storeInfo } : prev.storeInfo,
              organization_id: organizationId
            }));
            break;
          case 'footer':
            setFooterSettings(prev => ({
              ...prev,
              ...loadedSettings,
              socialLinks: Array.isArray(loadedSettings.socialLinks) ? [...loadedSettings.socialLinks] : prev.socialLinks,
              footerSections: Array.isArray(loadedSettings.footerSections) ? [...loadedSettings.footerSections] : prev.footerSections,
              features: Array.isArray(loadedSettings.features) ? [...loadedSettings.features] : prev.features,
              paymentMethods: Array.isArray(loadedSettings.paymentMethods) ? [...loadedSettings.paymentMethods] : prev.paymentMethods,
              legalLinks: Array.isArray(loadedSettings.legalLinks) ? [...loadedSettings.legalLinks] : prev.legalLinks,
              newsletterSettings: loadedSettings.newsletterSettings ? { ...loadedSettings.newsletterSettings } : prev.newsletterSettings,
              contactInfo: loadedSettings.contactInfo ? { ...loadedSettings.contactInfo } : prev.contactInfo,
              organization_id: organizationId
            }));
            break;
          case 'testimonials':
            setTestimonialSettings(prev => ({
              ...prev,
              ...loadedSettings,
              organization_id: organizationId,
              selectedTestimonials: loadedSettings.testimonialOrder || loadedSettings.selectedTestimonials || []
            }));
            break;
        }
      }
    } catch (error) {
      console.error(`خطأ في جلب إعدادات ${componentType}:`, error);
      toast({
        title: "خطأ في التحميل",
        description: `حدث خطأ أثناء جلب إعدادات مكون ${componentType}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, toast]);

  const saveComponentSettings = useCallback(async (
    componentType: ComponentType,
    componentMeta: any,
    getDefaultOrderIndex: (type: ComponentType) => number
  ) => {
    if (!organizationId) return;
    
    setIsSaving(true);
    try {
      const settings = getSettingsForComponent(componentType);
      const settingsToSave = {
        ...settings,
        organization_id: organizationId,
        lastUpdated: new Date().toISOString()
      };

      // إضافة معلومات الترتيب الخاصة للمكونات
      if (componentType === 'product_categories') {
        (settingsToSave as any).categoryOrder = (settings as CategorySectionSettings).selectedCategories;
      } else if (componentType === 'testimonials') {
        (settingsToSave as any).testimonialOrder = (settings as TestimonialSectionSettings).selectedTestimonials;
      }

      const dbComponentType = normalizeComponentTypeForDB(componentType);

      const { data: existingComponent, error: checkError } = await supabase
        .from('store_settings')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('component_type', dbComponentType)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingComponent) {
        const { error: updateError } = await supabase
          .from('store_settings')
          .update({
            settings: settingsToSave,
            is_active: componentMeta?.isActive ?? true,
            order_index: componentMeta?.orderIndex ?? getDefaultOrderIndex(componentType),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingComponent.id)
          .eq('organization_id', organizationId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { data: existingComponents, error: countError } = await supabase
          .from('store_settings')
          .select('order_index')
          .eq('organization_id', organizationId)
          .order('order_index', { ascending: false })
          .limit(1);

        if (countError) {
          throw countError;
        }

        const nextOrderIndex = existingComponents && existingComponents.length > 0
          ? (existingComponents[0].order_index || 0) + 1
          : 1;

        const { error: insertError } = await supabase
          .from('store_settings')
          .insert({
            organization_id: organizationId,
            component_type: dbComponentType,
            settings: settingsToSave,
            is_active: componentMeta?.isActive ?? true,
            order_index: componentMeta?.orderIndex ?? nextOrderIndex,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      setHasUnsavedChanges(false);
      
      toast({
        title: "✅ تم الحفظ بنجاح",
        description: "سيتم تحديث المتجر تلقائياً خلال ثوانٍ...",
        variant: "default"
      });
    } catch (error) {
      console.error(`خطأ في حفظ إعدادات ${componentType}:`, error);
      toast({
        title: "خطأ في الحفظ",
        description: `حدث خطأ أثناء حفظ إعدادات ${componentType}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [organizationId, getSettingsForComponent, toast]);

  return {
    // State
    heroSettings,
    categorySettings,
    featuredSettings,
    aboutSettings,
    footerSettings,
    testimonialSettings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    
    // Methods
    getSettingsForComponent,
    handleHeroChange,
    handleCategoryChange,
    handleFeaturedChange,
    handleAboutChange,
    handleFooterChange,
    handleTestimonialChange,
    handleReset,
    loadComponentSettings,
    saveComponentSettings
  };
};
