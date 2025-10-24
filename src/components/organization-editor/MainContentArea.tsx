import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { EnhancedHeroEditor } from '@/components/store-editor/improved/components/editors/EnhancedHeroEditor';
import { FeaturedProductsEditor } from '@/components/store-editor/improved/components/editors/FeaturedProductsEditor';
import { AboutEditor } from '@/components/store-editor/improved/components/editors/AboutEditor';
import { FooterEditor } from '@/components/store-editor/improved/components/editors/FooterEditor';
import CategoryPropertiesForm from './CategoryPropertiesForm';
import { TestimonialPropertiesForm } from './TestimonialPropertiesForm';
import { MainContentAreaProps, AboutSectionSettings, FooterSectionSettings, FeaturedProductsSettings } from './types';

const SUPPORTED_COMPONENT_TYPES = ['hero', 'product_categories', 'featured_products', 'about', 'footer', 'testimonials'] as const;

const MainContentArea: React.FC<MainContentAreaProps> = ({
  selectedComponent,
  heroSettings,
  categorySettings,
  featuredSettings,
  aboutSettings,
  footerSettings,
  testimonialSettings,
  onHeroChange,
  onCategoryChange,
  onFeaturedChange,
  onAboutChange,
  onFooterChange,
  onTestimonialChange,
  organizationId,
  isMobile,
  isTablet,
  isDesktop
}) => {
  return (
    <main className={cn(
      'flex-1 space-y-4',
      isTablet && 'space-y-5',
      isDesktop && 'space-y-6'
    )}>
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b bg-muted/40 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg">
                {selectedComponent ? selectedComponent.name : 'اختر مكوّناً'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {selectedComponent
                  ? selectedComponent.description
                  : 'اختر أي مكوّن من القائمة الجانبية لعرض خصائصه.'}
              </CardDescription>
            </div>
            {selectedComponent && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Switch
                  checked={selectedComponent?.isActive ?? true}
                  disabled
                  aria-label="حالة التفعيل"
                  className="scale-90 sm:scale-100"
                />
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {selectedComponent?.isActive ? 'المكوّن ظاهر' : 'المكوّن مخفي'}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {selectedComponent?.type === 'hero' && (
            <EnhancedHeroEditor
              settings={heroSettings}
              onUpdate={(key, value) => onHeroChange({ [key]: value })}
              onUpdateNested={(path, value) => {
                const changes: Record<string, any> = {};
                let current = changes;
                for (let i = 0; i < path.length - 1; i++) {
                  current[path[i]] = {};
                  current = current[path[i]];
                }
                current[path[path.length - 1]] = value;
                onHeroChange(changes);
              }}
              organizationId={organizationId}
              isMobile={isMobile}
              isTablet={isTablet}
              isDesktop={isDesktop}
            />
          )}

          {selectedComponent?.type === 'product_categories' && (
            <CategoryPropertiesForm
              settings={categorySettings}
              onChange={onCategoryChange}
              isMobile={isMobile}
              isTablet={isTablet}
              isDesktop={isDesktop}
            />
          )}

          {selectedComponent?.type === 'featured_products' && (
            <FeaturedProductsEditor
              settings={featuredSettings}
              onUpdate={(key, value) => onFeaturedChange(key as keyof FeaturedProductsSettings, value)}
              organizationId={organizationId}
            />
          )}

          {selectedComponent?.type === 'about' && (
            <AboutEditor
              settings={aboutSettings}
              onUpdate={(key, value) => onAboutChange(key as keyof AboutSectionSettings, value)}
            />
          )}

          {selectedComponent?.type === 'footer' && (
            <FooterEditor
              settings={footerSettings}
              onUpdate={(key, value) => onFooterChange(key as keyof FooterSectionSettings, value)}
            />
          )}

          {selectedComponent?.type === 'testimonials' && (
            <TestimonialPropertiesForm
              settings={testimonialSettings}
              onChange={onTestimonialChange}
              isMobile={isMobile}
              isTablet={isTablet}
              isDesktop={isDesktop}
            />
          )}

          {selectedComponent && !SUPPORTED_COMPONENT_TYPES.includes(selectedComponent.type as any) && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground sm:p-10 sm:text-sm">
              سيتم توفير محرر خصائص كامل لهذا المكوّن قريباً. حالياً نركز على قسم البانر الرئيسي، الفئات، المنتجات المميزة، عن المؤسسة، التذييل، بالإضافة إلى الشهادات.
            </div>
          )}

          {!selectedComponent && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground sm:p-10 sm:text-sm">
              اختر مكوّناً من القائمة الجانبية لعرض خصائصه.
            </div>
          )}
        </CardContent>
      </Card>

    </main>
  );
};

export default React.memo(MainContentArea);
