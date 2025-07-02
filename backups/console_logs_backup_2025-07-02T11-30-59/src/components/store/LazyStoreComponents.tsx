import { lazy, Suspense } from 'react';

// مكون للعرض أثناء التحميل
export const StoreComponentLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
);

// تحميل كسول لمكونات المتجر
export const LazyStoreBanner = lazy(() => import('./StoreBanner'));
export const LazyProductCategories = lazy(() => import('./ProductCategories'));
export const LazyFeaturedProducts = lazy(() => import('./FeaturedProducts'));
export const LazyCustomerTestimonials = lazy(() => import('./CustomerTestimonials'));
export const LazyStoreAbout = lazy(() => import('./StoreAbout'));
export const LazyCountdownOffersSection = lazy(() => import('./CountdownOffersSection'));
export const LazyStoreContact = lazy(() => import('./StoreContact'));
export const LazyStoreFooter = lazy(() => import('./CustomizableStoreFooter'));
export const LazyComponentPreview = lazy(() => import('./LazyComponentPreviewWrapper'));

// مكون LazyLoad لتبسيط استخدام التحميل الكسول
export const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<StoreComponentLoader />}>
    {children}
  </Suspense>
);
