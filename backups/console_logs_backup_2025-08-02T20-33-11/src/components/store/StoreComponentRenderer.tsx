import React from 'react';
import { StoreComponent } from '@/types/store-editor';
import { 
  LazyStoreBanner, 
  LazyProductCategories, 
  LazyFeaturedProducts,
  LazyCustomerTestimonials,
  LazyStoreAbout,
  LazyStoreContact,
  LazyComponentPreview
} from './LazyStoreComponents';
import StoreServices from './StoreServices';
import StoreTracking from './StoreTracking';
import { SimpleErrorBoundary } from './StoreErrorBoundary';

interface StoreComponentRendererProps {
  components: StoreComponent[];
  centralOrgId: string;
  storeName: string;
  categories: any[];
  featuredProducts: any[];
  organizationSettings: any;
  contactEmail?: string;
  unifiedLoading: any; // تبسيط النوع
}

const StoreComponentRenderer: React.FC<StoreComponentRendererProps> = ({
  components,
  centralOrgId,
  storeName,
  categories,
  featuredProducts,
  organizationSettings,
  contactEmail,
  unifiedLoading
}) => {
  // فحص وضع الصيانة
  if (organizationSettings?.maintenance_mode) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-3xl font-bold mb-4">المتجر تحت الصيانة</h1>
        <p className="text-xl text-muted-foreground">
          {organizationSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريبًا. شكرًا لصبركم!'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* تتبع المتجر */}
      {organizationSettings && <StoreTracking />}
      
      {/* عرض المكونات */}
      {components.map((component, index) => (
        <SimpleErrorBoundary key={component.id || `component-${index}`}>
          <ComponentSwitch
            component={component}
            centralOrgId={centralOrgId}
            storeName={storeName}
            categories={categories}
            featuredProducts={featuredProducts}
            contactEmail={contactEmail}
          />
        </SimpleErrorBoundary>
      ))}
    </>
  );
};

// مكون منفصل لتبديل المكونات
const ComponentSwitch: React.FC<{
  component: StoreComponent;
  centralOrgId: string;
  storeName: string;
  categories: any[];
  featuredProducts: any[];
  contactEmail?: string;
}> = React.memo(({ component, centralOrgId, storeName, categories, featuredProducts, contactEmail }) => {
  switch (component.type) {
    case 'hero':
      return <LazyStoreBanner heroData={component.settings as any} />;
    
    case 'product_categories':
      
      return (
        <LazyProductCategories 
          title={component.settings?.title}
          description={component.settings?.description}
          useRealCategories={true} // تأكد من استخدام الفئات الحقيقية دائماً في المتجر
          categories={categories}
          settings={{
            ...component.settings,
            useRealCategories: true // تأكيد إضافي
          }}
        />
      );
    
    case 'featured_products':
    case 'featuredproducts':
      return (
        <LazyFeaturedProducts 
          {...(component.settings as any)} 
          organizationId={centralOrgId}
          products={featuredProducts}
          displayCount={featuredProducts.length || component.settings?.displayCount || 4}
        />
      );
    
    case 'testimonials':
      return (
        <LazyCustomerTestimonials 
          {...(component.settings as any)} 
          organizationId={centralOrgId}
          // ✅ تفعيل جلب البيانات من قاعدة البيانات تلقائياً
          useDbTestimonials={component.settings?.useDbTestimonials !== undefined ? component.settings.useDbTestimonials : !!centralOrgId}
        />
      );
    
    case 'about':
      return (
        <LazyStoreAbout 
          {...(component.settings as any)} 
          storeName={storeName} 
        />
      );
    
    case 'contact':
      return (
        <LazyStoreContact 
          {...(component.settings as any)} 
          email={contactEmail} 
        />
      );
    
    case 'services':
      return <StoreServices {...(component.settings as any)} />;
    
    case 'countdownoffers':
      return (
        <LazyComponentPreview 
          component={component} 
        />
      );
    
    default:
      return null;
  }
});

ComponentSwitch.displayName = 'ComponentSwitch';

export default React.memo(StoreComponentRenderer);
