// Lightweight store-only entry point
// - Initializes i18n
// - Mounts a minimal provider tree
// - Renders only the StoreRouter/StorePage path

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// CSS
import './index.css';
import './App.css';

// i18n initialization مؤجلة لتقليل JS المبدئي

// Minimal providers
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/config/queryClient';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoadingControllerProvider } from '@/components/LoadingController';
import { GlobalLoadingProvider } from '@/components/store/GlobalLoadingManager';
import { ThemeProvider } from '@/context/ThemeContext';
import { SafeTranslationProvider } from '@/components/safe-i18n/SafeTranslationProvider';

// Tenant and Auth providers - required for ProductsPageProvider
import { TenantProvider } from '@/context/TenantContext';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';

// Store app
import StoreApp from '@/store/StoreApp';

// Lightweight early preload similar to main.tsx to hydrate store data quickly
async function startStorePreload() {
  try {
    const { startEarlyPreload } = await import('./utils/earlyPreload');
    const result = await startEarlyPreload();
    if (result?.success) {
      // expose to window for consumers
      (window as any).__EARLY_STORE_DATA__ = {
        data: result.data,
        timestamp: Date.now()
      };
      // notify listeners expecting this event
      window.dispatchEvent(new CustomEvent('storeInitDataReady', {
        detail: {
          data: result.data,
          timestamp: Date.now()
        }
      }));
    }
  } catch (e) {
    // silent
  }
}

// kick off preloading asap
startStorePreload();

// تأجيل تهيئة i18n إلى الخمول لتقليل الطلبات المبكرة
if (typeof window !== 'undefined') {
  const initI18n = () => import('./i18n/index').catch(() => {});
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(initI18n, { timeout: 1000 });
  } else {
    setTimeout(initI18n, 500);
  }
}

const rootEl = document.getElementById('root');
const root = rootEl ? ReactDOM.createRoot(rootEl) : null;

if (root) {
  const routerOptions = {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  } as const;

  root.render(
    <BrowserRouter future={routerOptions.future}>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <LoadingControllerProvider maxConcurrentRequests={3}>
              <GlobalLoadingProvider>
                <ThemeProvider>
                  <SafeTranslationProvider>
                    <AuthProvider>
                      <UserProvider>
                        <TenantProvider>
                          <StoreApp />
                        </TenantProvider>
                      </UserProvider>
                    </AuthProvider>
                  </SafeTranslationProvider>
                </ThemeProvider>
              </GlobalLoadingProvider>
            </LoadingControllerProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </BrowserRouter>
  );
}
