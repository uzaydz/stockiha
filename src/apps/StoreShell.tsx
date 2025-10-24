import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

import SmartProviderWrapper from '@/components/routing/SmartProviderWrapper';
import NetworkErrorHandler from '@/components/NetworkErrorHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import LayoutShiftPrevention from '@/components/performance/LayoutShiftPrevention';
import { AppCore } from '@/app-components/AppComponents';
import { GlobalLoadingProvider } from '@/components/store/GlobalLoadingManager';

const StoreApp = lazy(() => import('@/store/StoreApp'));

const StoreLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">جاري تحميل المتجر</h3>
        <p className="text-sm text-muted-foreground">نجهز تجربة التسوق الخاصة بك...</p>
      </div>
    </div>
  </div>
);

const StoreShell: React.FC = () => (
  <ErrorBoundary>
    <NetworkErrorHandler>
      <LayoutShiftPrevention>
        <AppCore>
          <SmartProviderWrapper>
            <GlobalLoadingProvider>
              <Suspense fallback={<StoreLoader />}>
                <StoreApp />
              </Suspense>
            </GlobalLoadingProvider>
          </SmartProviderWrapper>
        </AppCore>
      </LayoutShiftPrevention>
    </NetworkErrorHandler>
  </ErrorBoundary>
);

export default StoreShell;
