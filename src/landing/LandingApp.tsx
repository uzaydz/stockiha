
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { LazySection } from './components/LazySection';

// Lazy load components
const Features = lazy(() => import('./components/Features').then(module => ({ default: module.Features })));
const Comparison = lazy(() => import('./components/Comparison').then(module => ({ default: module.Comparison })));
const Courses = lazy(() => import('./components/Courses').then(module => ({ default: module.Courses })));
const LiveSupport = lazy(() => import('./components/LiveSupport').then(module => ({ default: module.LiveSupport })));
const Integrations = lazy(() => import('./components/Integrations').then(module => ({ default: module.Integrations })));
const Automation = lazy(() => import('./components/Automation').then(module => ({ default: module.Automation })));
const Sera = lazy(() => import('./components/Sera').then(module => ({ default: module.Sera })));
const StaffManagement = lazy(() => import('./components/StaffManagement').then(module => ({ default: module.StaffManagement })));
const RepairTracking = lazy(() => import('./components/RepairTracking').then(module => ({ default: module.RepairTracking })));
const Pricing = lazy(() => import('./components/Pricing').then(module => ({ default: module.Pricing })));
const WhatWeOffer = lazy(() => import('./components/WhatWeOffer').then(module => ({ default: module.WhatWeOffer })));
const FeaturesPage = lazy(() => import('./components/FeaturesPage').then(module => ({ default: module.FeaturesPage })));
const PricingPage = lazy(() => import('./components/PricingPage').then(module => ({ default: module.PricingPage })));
const DownloadPage = lazy(() => import('./components/DownloadPage').then(module => ({ default: module.DownloadPage })));
const POSPage = lazy(() => import('./components/POSPage').then(module => ({ default: module.POSPage })));
const EcommercePage = lazy(() => import('./components/EcommercePage').then(module => ({ default: module.EcommercePage })));
const SuccessPartnership = lazy(() => import('./components/SuccessPartnership').then(module => ({ default: module.SuccessPartnership })));
const ContactPage = lazy(() => import('./components/ContactPage').then(module => ({ default: module.ContactPage })));
const UnifiedSystem = lazy(() => import('./components/UnifiedSystem').then(module => ({ default: module.UnifiedSystem })));
const CoursesPage = lazy(() => import('./components/CoursesPage').then(module => ({ default: module.CoursesPage })));
const TermsPage = lazy(() => import('./components/TermsPage').then(module => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import('./components/PrivacyPage').then(module => ({ default: module.PrivacyPage })));

// Loader
const SectionLoader = () => (
  <div className="py-24 flex justify-center items-center bg-light-bg dark:bg-dark-bg transition-colors">
    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
  </div>
);

type Page = 'home' | 'features' | 'pricing' | 'download' | 'pos' | 'ecommerce' | 'contact' | 'courses' | 'terms' | 'privacy';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'dark'; // Default fallback
  });

  // تم إزالة useEffect والتأخير الاصطناعي

  // Helper to get valid page from path
  const getPageFromPath = (): Page => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.slice(1); // remove leading slash
    const validPages: Page[] = ['home', 'features', 'pricing', 'download', 'pos', 'ecommerce', 'contact', 'courses', 'terms', 'privacy'];
    return validPages.includes(path as Page) ? (path as Page) : 'home';
  };

  const [currentPage, setCurrentPage] = useState<Page>(getPageFromPath);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const navigateTo = (page: Page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
    const url = page === 'home' ? '/' : `/${page}`;
    window.history.pushState({}, '', url);
  };

  return (
    <div className="min-h-screen w-full selection:bg-brand selection:text-white bg-[#020202]">
      <Navbar theme={theme} toggleTheme={toggleTheme} onNavigate={navigateTo} currentPage={currentPage} />

      <main className="w-full">
        {currentPage === 'home' && (
          <>
            <Hero onNavigate={navigateTo} />

            <LazySection height="min-h-[80vh]" className="content-auto">
              <UnifiedSystem onNavigate={navigateTo} />
            </LazySection>

            <LazySection height="min-h-[60vh]" className="content-auto">
              <WhatWeOffer onNavigate={navigateTo} />
            </LazySection>

            <LazySection height="min-h-[80vh]" className="content-auto">
              <Features />
            </LazySection>

            <LazySection height="min-h-[60vh]" className="content-auto">
              <Comparison onNavigate={navigateTo} />
            </LazySection>

            <LazySection height="min-h-[50vh]" className="content-auto">
              <Courses onNavigate={navigateTo} />
            </LazySection>

            <LazySection height="min-h-[40vh]" className="content-auto">
              <LiveSupport />
            </LazySection>

            <LazySection height="min-h-[40vh]" className="content-auto">
              <Integrations />
            </LazySection>

            <LazySection height="min-h-[50vh]" className="content-auto">
              <Automation />
            </LazySection>

            <LazySection height="min-h-[50vh]" className="content-auto">
              <Sera />
            </LazySection>

            <LazySection height="min-h-[50vh]" className="content-auto">
              <StaffManagement />
            </LazySection>

            <LazySection height="min-h-[50vh]" className="content-auto">
              <RepairTracking />
            </LazySection>

            <LazySection height="min-h-[80vh]" className="content-auto">
              <Pricing onNavigate={navigateTo} />
            </LazySection>

            <LazySection height="min-h-[40vh]" className="content-auto">
              <SuccessPartnership onNavigate={navigateTo} />
            </LazySection>
          </>
        )}

        {currentPage === 'features' && (
          <Suspense fallback={<SectionLoader />}>
            <FeaturesPage />
          </Suspense>
        )}

        {currentPage === 'pricing' && (
          <Suspense fallback={<SectionLoader />}>
            <PricingPage />
          </Suspense>
        )}

        {currentPage === 'download' && (
          <Suspense fallback={<SectionLoader />}>
            <DownloadPage />
          </Suspense>
        )}

        {currentPage === 'pos' && (
          <Suspense fallback={<SectionLoader />}>
            <POSPage />
          </Suspense>
        )}

        {currentPage === 'ecommerce' && (
          <Suspense fallback={<SectionLoader />}>
            <EcommercePage />
          </Suspense>
        )}

        {currentPage === 'contact' && (
          <Suspense fallback={<SectionLoader />}>
            <ContactPage />
          </Suspense>
        )}

        {currentPage === 'courses' && (
          <Suspense fallback={<SectionLoader />}>
            <CoursesPage />
          </Suspense>
        )}

        {currentPage === 'terms' && (
          <Suspense fallback={<SectionLoader />}>
            <TermsPage />
          </Suspense>
        )}

        {currentPage === 'privacy' && (
          <Suspense fallback={<SectionLoader />}>
            <PrivacyPage />
          </Suspense>
        )}
      </main>

      <Footer onNavigate={navigateTo} />
      <ScrollToTop />
    </div>
  );
}
