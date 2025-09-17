import React, { Suspense } from 'react';
import { StoreComponent } from '@/types/store-editor';
import {
  LazyStoreBanner,
  LazyProductCategories,
  LazyFeaturedProducts,
  LazyCustomerTestimonials,
  LazyStoreAbout,
  LazyStoreContact,
  LazyStoreFooter,
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

const StoreComponentRenderer: React.FC<StoreComponentRendererProps> = React.memo(({
  components,
  centralOrgId,
  storeName,
  categories,
  featuredProducts,
  organizationSettings,
  contactEmail,
  unifiedLoading
}) => {
  // تقليل رسائل التصحيح - عرض كل 7 renders فقط
  const renderCount = React.useRef(0);
  renderCount.current++;

  const shouldLogRenderer = renderCount.current === 1 || renderCount.current % 7 === 0;
  if (shouldLogRenderer) {
    console.log('🔍 [StoreComponentRenderer] بدء العرض:', {
      renderCount: renderCount.current,
      componentsCount: components?.length || 0,
      componentsTypes: components?.slice(0, 3).map(c => ({ type: c.type, id: c.id })) || [], // عرض أول 3 فقط
      centralOrgId,
      storeName,
      categoriesCount: categories?.length || 0,
      featuredProductsCount: featuredProducts?.length || 0,
      hasOrganizationSettings: !!organizationSettings,
      maintenanceMode: organizationSettings?.maintenance_mode,
      unifiedLoading: unifiedLoading?.shouldShowGlobalLoader
    });
  }

  // تحذير للـ renders المتكررة جداً
  if (renderCount.current > 30) {
    console.warn('⚠️ [StoreComponentRenderer] عدد renders مرتفع جداً:', renderCount.current);
  }

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
      {components.map((component, index) => {
        // تقليل رسائل التصحيح - عرض كل 10 renders فقط
        const shouldLogComponent = renderCount.current === 1 || renderCount.current % 10 === 0;
        if (shouldLogComponent) {
          console.log(`🔍 [StoreComponentRenderer] عرض مكون ${index + 1}:`, {
            renderCount: renderCount.current,
            type: component.type,
            id: component.id,
            isActive: component.isActive,
            orderIndex: component.orderIndex
          });
        }

        return (
          <SimpleErrorBoundary key={component.id || `component-${index}`}>
            <Suspense fallback={null}>
              <ComponentSwitch
                component={component}
                centralOrgId={centralOrgId}
                storeName={storeName}
                categories={categories}
                featuredProducts={featuredProducts}
                contactEmail={contactEmail}
              />
            </Suspense>
          </SimpleErrorBoundary>
        );
      })}
    </>
  );
});

// مكون منفصل لتبديل المكونات
const ComponentSwitch: React.FC<{
  component: StoreComponent;
  centralOrgId: string;
  storeName: string;
  categories: any[];
  featuredProducts: any[];
  contactEmail?: string;
}> = React.memo(({ component, centralOrgId, storeName, categories, featuredProducts, contactEmail }) => {

  // تقليل رسائل التصحيح - عرض كل 20 renders فقط
  const componentSwitchRenderCount = React.useRef(0);
  componentSwitchRenderCount.current++;

  const shouldLogSwitch = componentSwitchRenderCount.current === 1 || componentSwitchRenderCount.current % 20 === 0;
  if (shouldLogSwitch) {
    console.log('🔍 [ComponentSwitch] معالجة مكون:', {
      renderCount: componentSwitchRenderCount.current,
      type: component.type,
      id: component.id,
      hasCategories: categories?.length > 0,
      hasFeaturedProducts: featuredProducts?.length > 0,
      centralOrgId,
      storeName
    });
  }

  // 🚀 إضافة fallback من window object إذا لم تكن البيانات متوفرة
  const windowEarlyData = (window as any).__EARLY_STORE_DATA__ || (window as any).__PREFETCHED_STORE_DATA__;
  const windowStoreData = (window as any).__CURRENT_STORE_DATA__;
  
  const effectiveCategories = categories?.length > 0 ? categories : 
    (windowEarlyData?.data?.categories || []);
    
  const effectiveFeaturedProducts = featuredProducts?.length > 0 ? featuredProducts : 
    (windowEarlyData?.data?.featured_products || []);
    
  const effectiveStoreName = storeName || 
    windowStoreData?.organization?.name || 
    windowEarlyData?.data?.organization_details?.name || 
    'المتجر';
  
  // تقليل رسائل التصحيح - عرض كل 20 renders فقط
  if (process.env.NODE_ENV === 'development' && shouldLogSwitch) {
    console.log('🎯 [ComponentSwitch] البيانات المستخدمة:', {
      renderCount: componentSwitchRenderCount.current,
      componentType: component.type,
      categoriesCount: effectiveCategories.length,
      featuredProductsCount: effectiveFeaturedProducts.length,
      storeName: effectiveStoreName
    });
  }
  switch (component.type) {
    case 'hero':
      console.log('🔍 [ComponentSwitch] عرض مكون hero');
      return <LazyStoreBanner heroData={component.settings as any} featuredProducts={effectiveFeaturedProducts} />;

    case 'product_categories':
    case 'categories':
      console.log('🔍 [ComponentSwitch] عرض مكون categories');
      
      return (
        <LazyProductCategories 
          title={component.settings?.title}
          description={component.settings?.description}
          useRealCategories={true} // تأكد من استخدام الفئات الحقيقية دائماً في المتجر
          categories={effectiveCategories}
          settings={{
            ...component.settings,
            useRealCategories: true // تأكيد إضافي
          }}
        />
      );
    
    case 'featured_products':
    case 'featuredproducts':
      console.log('🔍 [ComponentSwitch] عرض مكون featured_products');
      return (
        <LazyFeaturedProducts
          {...(component.settings as any)}
          organizationId={centralOrgId}
          // إزالة products prop للسماح للمكون بجلب منتجاته الخاصة حسب الإعدادات
          displayCount={component.settings?.displayCount || 4}
        />
      );

    case 'testimonials':
      console.log('🔍 [ComponentSwitch] عرض مكون testimonials');
      return (
        <LazyCustomerTestimonials
          {...(component.settings as any)}
          organizationId={centralOrgId}
          // ✅ تفعيل جلب البيانات من قاعدة البيانات تلقائياً
          useDbTestimonials={component.settings?.useDbTestimonials !== undefined ? component.settings.useDbTestimonials : !!centralOrgId}
        />
      );

    case 'about':
      console.log('🔍 [ComponentSwitch] عرض مكون about');
      return (
        <LazyStoreAbout 
          {...(component.settings as any)} 
          storeName={storeName} 
        />
      );
    
    case 'contact':
      console.log('🔍 [ComponentSwitch] عرض مكون contact');
      return (
        <LazyStoreContact
          {...(component.settings as any)}
          email={contactEmail}
        />
      );

    case 'services':
      console.log('🔍 [ComponentSwitch] عرض مكون services');
      return <StoreServices {...(component.settings as any)} />;

    case 'countdownoffers':
      console.log('🔍 [ComponentSwitch] عرض مكون countdownoffers');
      return (
        <LazyComponentPreview
          component={component}
        />
      );

    case 'footer':
      console.log('🔍 [ComponentSwitch] عرض مكون footer');
      return (
        <LazyStoreFooter
          {...component.settings}
          centralOrgId={centralOrgId}
        />
      );

    default:
      console.log('🔍 [ComponentSwitch] مكون غير معروف:', component.type);
      return null;
  }
});

ComponentSwitch.displayName = 'ComponentSwitch';

export default React.memo(StoreComponentRenderer);
