import React, { useMemo, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTenant } from '@/context/TenantContext';
import { ComponentMeta } from '@/components/organization-editor/types';
import { useOrganizationComponents } from '@/hooks/useOrganizationComponents';
import { useComponentSettings } from '@/hooks/useComponentSettings';
import { clearStoreCache } from '@/utils/storeCache';
import LoadingState from './LoadingState';
import OrganizationComponentsLayout from './OrganizationComponentsLayout';

const OrganizationComponentsContainer: React.FC = () => {
  const { currentOrganization } = useTenant();
  
  // Media queries for responsive design
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  // Organization components hook
  const {
    componentsState,
    hasLayoutChanges,
    isSavingLayout,
    getDefaultOrderIndex,
    updateComponentMeta,
    getComponentMetaByType,
    handleToggleVisibility,
    handleMoveComponent,
    loadComponentsLayout,
    saveLayoutChanges
  } = useOrganizationComponents(currentOrganization?.id || '');

  // Component settings hook
  const {
    heroSettings,
    categorySettings,
    featuredSettings,
    aboutSettings,
    footerSettings,
    testimonialSettings,
    isLoading,
    isSaving,
    hasUnsavedChanges,
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
  } = useComponentSettings(currentOrganization?.id || '');

  // State management
  const [selectedComponentId, setSelectedComponentId] = React.useState<string>('hero');

  // Computed values
  const orderedComponents = useMemo(
    () => [...componentsState].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [componentsState]
  );

  useEffect(() => {
    if (
      orderedComponents.length > 0 &&
      !orderedComponents.some((component) => component.id === selectedComponentId)
    ) {
      setSelectedComponentId(orderedComponents[0].id);
    }
  }, [orderedComponents, selectedComponentId]);

  const selectedComponent = useMemo(
    () =>
      orderedComponents.find((component) => component.id === selectedComponentId) ??
      orderedComponents[0],
    [orderedComponents, selectedComponentId]
  );


  // Event handlers
  const handleSelect = React.useCallback((componentId: string) => {
    setSelectedComponentId(componentId);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!selectedComponent) return;
    
    const componentMeta = getComponentMetaByType(selectedComponent.type);
    await saveComponentSettings(selectedComponent.type, componentMeta, getDefaultOrderIndex);
    
    // مسح الكاش لتحديث المتجر
    clearStoreCache(currentOrganization?.id || '');
  }, [selectedComponent, getComponentMetaByType, saveComponentSettings, getDefaultOrderIndex, currentOrganization?.id]);

  const handleResetComponent = React.useCallback(() => {
    if (!selectedComponent) return;
    handleReset(selectedComponent.type);
  }, [selectedComponent, handleReset]);

  const handleSaveLayout = React.useCallback(async () => {
    await saveLayoutChanges();
    
    // مسح الكاش لتحديث المتجر
    clearStoreCache(currentOrganization?.id || '');
  }, [saveLayoutChanges, currentOrganization?.id]);

  // Effects
  useEffect(() => {
    if (currentOrganization?.id) {
      loadComponentsLayout();
      loadComponentSettings('hero');
      loadComponentSettings('product_categories');
      loadComponentSettings('featured_products');
      loadComponentSettings('about');
      loadComponentSettings('footer');
      loadComponentSettings('testimonials');
    }
  }, [currentOrganization?.id, loadComponentsLayout, loadComponentSettings]);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <OrganizationComponentsLayout
      isMobile={isMobile}
      isTablet={isTablet}
      isDesktop={isDesktop}
      orderedComponents={orderedComponents}
      selectedComponentId={selectedComponentId}
      selectedComponent={selectedComponent}
      heroSettings={heroSettings}
      categorySettings={categorySettings}
      featuredSettings={featuredSettings}
      aboutSettings={aboutSettings}
      footerSettings={footerSettings}
      testimonialSettings={testimonialSettings}
      onSelect={handleSelect}
      onToggleVisibility={handleToggleVisibility}
      onMove={handleMoveComponent}
      onSaveLayout={handleSaveLayout}
      onHeroChange={handleHeroChange}
      onCategoryChange={handleCategoryChange}
      onFeaturedChange={handleFeaturedChange}
      onAboutChange={handleAboutChange}
      onFooterChange={handleFooterChange}
      onTestimonialChange={handleTestimonialChange}
      onSave={handleSave}
      onReset={handleResetComponent}
      hasUnsavedChanges={hasUnsavedChanges}
      hasLayoutChanges={hasLayoutChanges}
      isSavingLayout={isSavingLayout}
      isSaving={isSaving}
      organizationId={currentOrganization?.id}
    />
  );
};

export default React.memo(OrganizationComponentsContainer);
