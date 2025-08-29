import React, { Suspense } from 'react';

// Lazy loading للمكونات الثقيلة
const LazyCategoryCard = React.lazy(() => import('./CategoryCard').then(module => ({ default: module.CategoryCard })));
const LazyCategoryCardOptimized = React.lazy(() => import('./CategoryCardOptimized').then(module => ({ default: module.CategoryCardOptimized })));
const LazyCategoryGrid = React.lazy(() => import('./CategoryGrid').then(module => ({ default: module.CategoryGrid })));

// مكون Loading سريع للكارت
const CategoryCardSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-card rounded-3xl overflow-hidden shadow-lg border border-border/20 ${className}`}>
    <div className="aspect-[5/4] bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-muted/40 rounded animate-pulse" />
      <div className="h-4 bg-muted/30 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-muted/30 rounded animate-pulse w-1/2" />
      <div className="h-10 bg-muted/20 rounded-xl animate-pulse mt-4" />
    </div>
  </div>
);

// مكون Loading للشبكة
const CategoryGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
    {Array.from({ length: count }, (_, i) => (
      <CategoryCardSkeleton key={i} />
    ))}
  </div>
);

// مكونات محسّنة مع Suspense
export const CategoryCardLazy: React.FC<React.ComponentProps<typeof LazyCategoryCard>> = (props) => (
  <Suspense fallback={<CategoryCardSkeleton />}>
    <LazyCategoryCard {...props} />
  </Suspense>
);

export const CategoryCardOptimizedLazy: React.FC<React.ComponentProps<typeof LazyCategoryCardOptimized>> = (props) => (
  <Suspense fallback={<CategoryCardSkeleton />}>
    <LazyCategoryCardOptimized {...props} />
  </Suspense>
);

export const CategoryGridLazy: React.FC<React.ComponentProps<typeof LazyCategoryGrid>> = (props) => (
  <Suspense fallback={<CategoryGridSkeleton count={props.categories?.length || 6} />}>
    <LazyCategoryGrid {...props} />
  </Suspense>
);

// تصدير Skeletons للاستخدام المباشر
export { CategoryCardSkeleton, CategoryGridSkeleton };

// تصدير المكونات العادية أيضاً
export { CategoryCard } from './CategoryCard';
export { CategoryCardOptimized } from './CategoryCardOptimized';
export { CategoryGrid } from './CategoryGrid';
