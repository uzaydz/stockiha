// Store Components Re-exports for cleaner imports
// This file centralizes all store-related component imports

// Core Store Components
export { default as StoreRouter } from '@/components/routing/StoreRouter';
export { default as StorePage } from '@/components/store/StorePage';
export { default as StoreLayout } from '@/components/store/StoreLayout';
export { default as StoreComponentRenderer } from '@/components/store/StoreComponentRenderer';

// Product Pages
export { default as ProductPurchasePageV3Container } from '@/pages/product-v3/ProductPurchasePageV3Container';

// Shopping Components
export { default as CartPage } from '@/pages/CartPage';
export { default as CartCheckoutPage } from '@/pages/CartCheckoutPage';
export { default as StoreProducts } from '@/pages/StoreProducts';

// Form Components
export { default as ProductFormRenderer } from '@/components/product/ProductFormRenderer';

// Store Pages
export { default as StoreErrorBoundary } from '@/components/store/common/StoreErrorBoundary';
export { default as StoreLoader } from '@/components/store/common/StoreLoader';
export { default as StoreNotFound } from '@/components/store/common/StoreNotFound';

// SEO and Head Components
export { StoreHead } from '@/components/store/StoreHead';
export { default as SEOHead } from '@/components/store/SEOHead';

// Navigation Components
export { default as Navbar } from '@/components/Navbar';
export { default as StoreNavbar } from '@/components/navbar/StoreNavbar';
export { default as MobileBottomNavigation } from '@/components/navbar/MobileBottomNavigation';

// UI Components
export { Button } from '@/components/ui/button';
export { default as PerformanceOptimizedImage } from '@/components/ui/PerformanceOptimizedImage';

// Routing Components
export { default as SmartProviderWrapper } from '@/components/routing/SmartProviderWrapper';
export { default as ConditionalProviders } from '@/components/routing/smart-wrapper/ConditionalProviders';

// Context Providers
export { TenantProvider } from '@/context/tenant/TenantProvider';
export { AuthProvider } from '@/context/AuthContext';
export { UserProvider } from '@/context/UserContext';
export { ThemeProvider } from '@/context/ThemeContext';
export { SafeTranslationProvider } from '@/components/safe-i18n/SafeTranslationProvider';
export { LoadingControllerProvider } from '@/components/LoadingController';
export { GlobalLoadingProvider } from '@/components/store/GlobalLoadingManager';
