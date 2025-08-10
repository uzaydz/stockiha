import React, { Suspense } from 'react';

// Lazy loading للمكونات الفرعية
const LazyBannerContent = React.lazy(() => import('./BannerContent'));
const LazyBannerImage = React.lazy(() => import('./BannerImage'));

// مكون Loading بسيط وسريع
const QuickLoader = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-muted/30 rounded-2xl ${className}`} />
);

// مكونات محسّنة مع Suspense
export const BannerContentLazy: React.FC<React.ComponentProps<typeof LazyBannerContent>> = (props) => (
  <Suspense fallback={<QuickLoader className="h-64 w-full" />}>
    <LazyBannerContent {...props} />
  </Suspense>
);

export const BannerImageLazy: React.FC<React.ComponentProps<typeof LazyBannerImage>> = (props) => (
  <Suspense fallback={<QuickLoader className="aspect-square w-full max-w-md mx-auto" />}>
    <LazyBannerImage {...props} />
  </Suspense>
);

// تصدير المكونات العادية أيضاً للاستخدام المباشر
export { default as BannerContent } from './BannerContent';
export { default as BannerImage } from './BannerImage';
