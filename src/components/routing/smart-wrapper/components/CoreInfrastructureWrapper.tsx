/**
 * 🎯 Core Infrastructure Wrapper
 * الطبقة الأساسية للبنية التحتية (بدون NotificationsProvider)
 * مكون منفصل لتحسين الأداء وسهولة الصيانة
 */

import React, { memo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingControllerProvider } from '@/components/LoadingController';
import { SupabaseProvider } from "@/context/SupabaseContext";
import { GlobalLoadingProvider } from '@/components/store/GlobalLoadingManager';
import AppWrapper from '@/components/AppWrapper';
import { PERFORMANCE_CONFIG } from '../constants';
import { queryClient } from '@/lib/config/queryClient';

interface CoreInfrastructureWrapperProps {
  children: React.ReactNode;
}

export const CoreInfrastructureWrapper = memo<CoreInfrastructureWrapperProps>(({ children }) => {
  
  // تفعيل التحميل المبكر
  React.useEffect(() => {
    // إرسال event للكشف عن البنية التحتية
    window.dispatchEvent(new CustomEvent('bazaar:infrastructure-ready', {
      detail: { timestamp: Date.now() }
    }));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LoadingControllerProvider maxConcurrentRequests={PERFORMANCE_CONFIG.maxConcurrentRequests}>
          <SupabaseProvider>
            <GlobalLoadingProvider>
              <AppWrapper>
                {children}
              </AppWrapper>
            </GlobalLoadingProvider>
          </SupabaseProvider>
        </LoadingControllerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
});

CoreInfrastructureWrapper.displayName = 'CoreInfrastructureWrapper';

// 🎯 Minimal wrapper for public store routes — no SupabaseProvider at bootstrap
export const MinimalCoreInfrastructureWrapper = memo<CoreInfrastructureWrapperProps>(({ children }) => {
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('bazaar:infrastructure-ready', {
      detail: { timestamp: Date.now(), minimal: true }
    }));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LoadingControllerProvider maxConcurrentRequests={PERFORMANCE_CONFIG.maxConcurrentRequests}>
          <GlobalLoadingProvider>
            <AppWrapper>
              {children}
            </AppWrapper>
          </GlobalLoadingProvider>
        </LoadingControllerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
});

MinimalCoreInfrastructureWrapper.displayName = 'MinimalCoreInfrastructureWrapper';
