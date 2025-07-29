// تصدير المكونات الرئيسية
export { default as FeaturedProducts } from './FeaturedProducts';
export { default as ProductImage } from './ProductImage';
export { default as ProductCard } from './ProductCard';
export { default as ProductListItem } from './ProductListItem';
export { default as ProductsGrid } from './ProductsGrid';
export { default as FeaturedProductsHeader } from './FeaturedProductsHeader';

// تصدير الـ hooks
export { useFeaturedProducts, useViewMode } from './useFeaturedProducts';

// تصدير الـ utilities
export * from './productUtils';

// تصدير الأنواع
export type { DBProduct } from './productUtils';
