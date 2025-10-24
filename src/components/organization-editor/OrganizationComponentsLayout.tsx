import React from 'react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ComponentMeta } from '@/components/organization-editor/types';
import ComponentsSidebar from './ComponentsSidebar';
import MainContentArea from './MainContentArea';
import ActionButtons from './ActionButtons';
import OrganizationComponentsHeader from './OrganizationComponentsHeader';

interface OrganizationComponentsLayoutProps {
  // Header props
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Components data
  orderedComponents: ComponentMeta[];
  selectedComponentId: string;
  selectedComponent: ComponentMeta | undefined;
  
  // Settings
  heroSettings: any;
  categorySettings: any;
  featuredSettings: any;
  aboutSettings: any;
  footerSettings: any;
  testimonialSettings: any;
  
  // Handlers
  onSelect: (componentId: string) => void;
  onToggleVisibility: (componentId: string, value: boolean) => void;
  onMove: (componentId: string, direction: 'up' | 'down') => void;
  onSaveLayout: () => void;
  onHeroChange: (changes: any) => void;
  onCategoryChange: (changes: any) => void;
  onFeaturedChange: (key: any, value: any) => void;
  onAboutChange: (key: any, value: any) => void;
  onFooterChange: (key: any, value: any) => void;
  onTestimonialChange: (changes: any) => void;
  onSave: () => void;
  onReset: () => void;
  
  // States
  hasUnsavedChanges: boolean;
  hasLayoutChanges: boolean;
  isSavingLayout: boolean;
  isSaving: boolean;
  
  // Organization
  organizationId?: string;
}

const OrganizationComponentsLayout: React.FC<OrganizationComponentsLayoutProps> = ({
  isMobile,
  isTablet,
  isDesktop,
  orderedComponents,
  selectedComponentId,
  selectedComponent,
  heroSettings,
  categorySettings,
  featuredSettings,
  aboutSettings,
  footerSettings,
  testimonialSettings,
  onSelect,
  onToggleVisibility,
  onMove,
  onSaveLayout,
  onHeroChange,
  onCategoryChange,
  onFeaturedChange,
  onAboutChange,
  onFooterChange,
  onTestimonialChange,
  onSave,
  onReset,
  hasUnsavedChanges,
  hasLayoutChanges,
  isSavingLayout,
  isSaving,
  organizationId
}) => {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* Header Section */}
      <OrganizationComponentsHeader
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      />

      {/* Main Layout */}
      <div className={cn(
        "flex flex-col gap-4",
        isTablet && "gap-6",
        isDesktop && "lg:flex-row lg:gap-8"
      )}>
        {/* Sidebar */}
        <ComponentsSidebar
          components={orderedComponents}
          selectedComponentId={selectedComponentId}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
          onMove={onMove}
          onSaveLayout={onSaveLayout}
          hasUnsavedChanges={hasUnsavedChanges}
          hasLayoutChanges={hasLayoutChanges}
          isSavingLayout={isSavingLayout}
          isMobile={isMobile}
          isTablet={isTablet}
          isDesktop={isDesktop}
        />

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          <MainContentArea
            selectedComponent={selectedComponent}
            heroSettings={heroSettings}
            categorySettings={categorySettings}
            featuredSettings={featuredSettings}
            aboutSettings={aboutSettings}
            footerSettings={footerSettings}
            testimonialSettings={testimonialSettings}
            onHeroChange={onHeroChange}
            onCategoryChange={onCategoryChange}
            onFeaturedChange={onFeaturedChange}
            onAboutChange={onAboutChange}
            onFooterChange={onFooterChange}
            onTestimonialChange={onTestimonialChange}
            organizationId={organizationId}
            isMobile={isMobile}
            isTablet={isTablet}
            isDesktop={isDesktop}
          />

          {/* Action Buttons */}
          <ActionButtons
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={onSave}
            onReset={onReset}
            isMobile={isMobile}
            isTablet={isTablet}
            isDesktop={isDesktop}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(OrganizationComponentsLayout);
