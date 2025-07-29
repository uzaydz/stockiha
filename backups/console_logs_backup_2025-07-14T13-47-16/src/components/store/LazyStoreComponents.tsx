import { lazy, Suspense } from 'react';

// تحميل كسول لمكونات المتجر
export const LazyStoreBanner = lazy(() => import('./StoreBanner'));
export const LazyProductCategories = lazy(() => import('./ProductCategoriesOptimized'));
export const LazyFeaturedProducts = lazy(() => import('./FeaturedProducts'));
export const LazyCustomerTestimonials = lazy(() => import('./CustomerTestimonials'));
export const LazyStoreAbout = lazy(() => import('./StoreAbout'));
export const LazyCountdownOffersSection = lazy(() => import('./CountdownOffersSection'));
export const LazyStoreContact = lazy(() => import('./StoreContact'));
export const LazyStoreFooter = lazy(() => import('./CustomizableStoreFooter'));
export const LazyComponentPreview = lazy(() => import('./LazyComponentPreviewWrapper'));

// مكون LazyLoad مبسط بدون مؤشر تحميل إضافي
export const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>
    {children}
  </Suspense>
);
