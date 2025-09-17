import React from 'react';
import { StoreComponent } from '@/types/store-editor';
import { StoreLazySection } from './common/StoreLazySection';
import {
  LazyStoreBanner,
  LazyProductCategories,
  LazyFeaturedProducts,
  LazyCustomerTestimonials,
  LazyStoreAbout,
  LazyStoreContact
} from './LazyStoreComponents';
import StoreServices from './StoreServices';
import StoreTracking from './StoreTracking';

interface StoreComponentsRendererProps {
  componentsToRender: StoreComponent[];
  storeData: any;
  extendedCategories: any[];
  storeName: string;
  storeSettings: any;
}

export const StoreComponentsRenderer = React.memo(({
  componentsToRender,
  storeData,
  extendedCategories,
  storeName,
  storeSettings
}: StoreComponentsRendererProps) => {
  if (!storeSettings) {
    return null;
  }

  return (
    <>
      {storeSettings?.maintenance_mode ? (
        <div className="container py-10 text-center">
          <h1 className="text-3xl font-bold mb-4">المتجر تحت الصيانة</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {storeSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريبًا. شكرًا لصبركم!'}
          </p>
        </div>
      ) : (
        <>
          <StoreLazySection fallback={<div className="h-0" />}>
            <StoreTracking />
          </StoreLazySection>

          {componentsToRender.map((component, index) => {
            const isFirstComponent = index === 0;
            const fallbackHeight = isFirstComponent ? "min-h-[60vh]" : "min-h-[40vh]";

            return (
              <StoreLazySection
                key={component.id || `component-${index}`}
                fallback={
                  <div className={`${fallbackHeight} animate-pulse bg-gray-100 rounded-lg mx-4 mb-4`} />
                }
                threshold={isFirstComponent ? 0 : 0.1}
                rootMargin={isFirstComponent ? "0px" : "200px"}
              >
                {component.type === 'hero' && (
                  <LazyStoreBanner heroData={component.settings as any} />
                )}

                {component.type === 'product_categories' && (
                  <LazyProductCategories
                    title={component.settings?.title}
                    description={component.settings?.description}
                    useRealCategories={component.settings?.useRealCategories ?? true}
                    categories={extendedCategories}
                    settings={component.settings}
                  />
                )}

                {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
                  <LazyFeaturedProducts
                    {...(component.settings as any)}
                    organizationId={storeData.organization_details?.id}
                  />
                )}

                {component.type === 'testimonials' && (
                  <LazyCustomerTestimonials
                    {...(component.settings as any)}
                    organizationId={storeData?.organization_details?.id}
                  />
                )}

                {component.type === 'about' && (
                  <LazyStoreAbout
                    {...(component.settings as any)}
                    storeName={storeName}
                  />
                )}

                {component.type === 'contact' && (
                  <LazyStoreContact
                    {...(component.settings as any)}
                    email={storeData.organization_details?.contact_email}
                  />
                )}

                {component.type === 'services' && (
                  <StoreServices {...(component.settings as any)} />
                )}
              </StoreLazySection>
            );
          })}
        </>
      )}
    </>
  );
});

StoreComponentsRenderer.displayName = 'StoreComponentsRenderer';
