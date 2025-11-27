import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { StoreDataProvider } from './context/StoreDataContext';
import './theme-globals.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CategorySection from './components/CategorySection';
import ProductGrid from './components/ProductGrid';
import FeaturedProducts from './components/FeaturedProducts';
import AboutSection from './components/AboutSection';
import Footer from './components/Footer';

import CartDrawer from './components/CartDrawer';
import ProductDetailModal from './components/ProductDetailModal';
import VisionTeaser from './components/VisionTeaser';
import CustomCursor from './components/CustomCursor';
import NoiseOverlay from './components/NoiseOverlay';
import IntroLoader from './components/IntroLoader';
import MarqueeStrip from './components/MarqueeStrip';
import VisualManifesto from './components/VisualManifesto';
import { Product, CartItem } from './types';

// Lazy Load Heavy Components for Performance Code Splitting
const Checkout = lazy(() => import('./components/Checkout'));
const CollectionPage = lazy(() => import('./components/CollectionPage'));
const VisionPage = lazy(() => import('./components/VisionPage'));
const ProductPage = lazy(() => import('./components/ProductPage'));

// Loading Fallback for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg">
    <div className="w-12 h-12 border-2 border-gray-200 dark:border-white/20 border-t-black dark:border-t-white rounded-full animate-spin"></div>
  </div>
);

type ViewState = 'home' | 'shop' | 'collection' | 'vision' | 'checkout' | 'product-page';

const AppContent: React.FC = () => {
  const { direction, language } = useLanguage();
  // Global State
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('home');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Shop Filter State (passed to ProductGrid)
  const [initialCategory, setInitialCategory] = useState<string | null>(null);

  // Product Modal State (Quick Add)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Product Page State (Full Experience)
  const [currentProductPage, setCurrentProductPage] = useState<Product | null>(null);

  // Handle Loading Logic
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [loading]);

  const handleIntroComplete = () => {
    setLoading(false);
  };

  // Navigation Handlers
  const handleNavigate = (newView: ViewState) => {
    setView(newView);
    window.scrollTo(0, 0);
  };

  const handleExploreCollection = () => {
    setView('collection');
    window.scrollTo(0, 0);
  };

  const handleEnterVision = () => {
    setView('vision');
    window.scrollTo(0, 0);
  };

  const handleShopCategory = (category: string) => {
    setInitialCategory(category);
    setView('shop');
    window.scrollTo(0, 0);
  };

  // Opens the "Quick Add" modal
  const handleOpenProductModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Navigates to the full Product Page
  const handleNavigateToProductPage = (product: Product) => {
    setCurrentProductPage(product);
    setView('product-page');
    window.scrollTo(0, 0);
  };

  // Optimized Add To Cart (Supports Single Item OR Batch/Bundle)
  const handleAddToCart = (input: CartItem | CartItem[]) => {
    const itemsToAdd = Array.isArray(input) ? input : [input];

    setCartItems(prev => {
      const newCart = [...prev];

      itemsToAdd.forEach(newItem => {
        const existingIndex = newCart.findIndex(
          i => i.id === newItem.id &&
            i.selectedSize === newItem.selectedSize &&
            i.selectedColor === newItem.selectedColor &&
            i.price === newItem.price // Distinguish free bundle items from paid ones
        );

        if (existingIndex > -1) {
          newCart[existingIndex].quantity += newItem.quantity;
        } else {
          newCart.push(newItem);
        }
      });

      return newCart;
    });
    // Don't auto-open cart, let user decide
  };

  const handleUpdateQuantity = (id: number, size: string, color: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === id && item.selectedSize === size && item.selectedColor === color) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : { ...item, quantity: 0 };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handlePlaceOrder = () => {
    setCartItems([]);
  };

  // Determine if Navbar/Footer should be visible
  const showNavbar = view !== 'checkout' && view !== 'vision';
  const showFooter = view !== 'checkout' && view !== 'vision';

  return (
    <div
      key={language}
      dir={direction}
      className={`font-sans scroll-smooth bg-white dark:bg-dark-bg text-aura-black dark:text-gray-100 transition-colors duration-700 ${language === 'ar' ? 'font-alexandria' : 'font-inter'} animate-fade-in-up`}
    >
      {/* 1. Cinematic Loader */}
      {loading && <IntroLoader onComplete={handleIntroComplete} />}

      {/* 2. Global Overlays */}
      <CustomCursor />
      <NoiseOverlay />

      {showNavbar && (
        <Navbar
          cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
          onCartClick={() => setIsCartOpen(true)}
          onNavigate={handleNavigate}
        />
      )}

      <main className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000'}>
        {view === 'home' && (
          <>
            <Hero onExplore={handleExploreCollection} />
            <MarqueeStrip />
            <CategorySection onCategoryClick={handleShopCategory} />
            <VisionTeaser onEnterVision={handleEnterVision} />
            <FeaturedProducts
              onOpenModal={handleOpenProductModal}
              onNavigateToPage={handleNavigateToProductPage}
              onViewAll={() => handleNavigate('shop')}
            />
            <AboutSection />
            <VisualManifesto />
          </>
        )}

        {view === 'shop' && (
          <ProductGrid
            onOpenModal={handleOpenProductModal}
            onNavigateToPage={handleNavigateToProductPage}
            initialCategory={initialCategory}
          />
        )}

        {/* Code Split Components Wrapped in Suspense */}
        <Suspense fallback={<PageLoader />}>
          {view === 'collection' && (
            <CollectionPage onShopCategory={handleShopCategory} />
          )}

          {view === 'vision' && (
            <VisionPage onBack={() => handleNavigate('home')} onOpenProduct={handleNavigateToProductPage} />
          )}

          {view === 'product-page' && currentProductPage && (
            <ProductPage
              product={currentProductPage}
              onBack={() => handleNavigate('shop')}
              onAddToCart={handleAddToCart}
              onNavigateToPage={handleNavigateToProductPage}
              onOpenModal={handleOpenProductModal}
            />
          )}

          {view === 'checkout' && (
            <Checkout
              cartItems={cartItems}
              onBack={() => setView('shop')}
              onPlaceOrder={handlePlaceOrder}
            />
          )}
        </Suspense>
      </main>

      {showFooter && <Footer />}



      {/* Overlays */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={() => setView('checkout')}
      />
    </div>
  );
};

const ModernGridTheme: React.FC<{ storeData?: any }> = ({ storeData }) => {
  return (
    <StoreDataProvider storeData={storeData}>
      <LanguageProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </LanguageProvider>
    </StoreDataProvider>
  );
};

export default ModernGridTheme;