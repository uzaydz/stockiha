/**
 * 🎯 Core Infrastructure Wrapper - مبسط للإلكترون
 * طبقة أساسية مبسطة بدون تعقيدات غير ضرورية
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { SupabaseProvider } from "@/context/SupabaseContext";
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';
import { TenantProvider } from '@/context/TenantContext';
import { AppInitializationProvider } from '@/context/AppInitializationContext';
import { WorkSessionProvider } from '@/context/WorkSessionContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import DesktopTitlebar from '@/components/desktop/DesktopTitlebar';
import { queryClient } from '@/lib/config/queryClient';

interface CoreInfrastructureWrapperProps {
  children: React.ReactNode;
}

export const CoreInfrastructureWrapper: React.FC<CoreInfrastructureWrapperProps> = React.memo(({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SupabaseProvider>
          <AuthProvider>
            <AppInitializationProvider>
              <UserProvider>
                <TenantProvider>
                  <WorkSessionProvider>
                    <NotificationsProvider>
                      <DesktopTitlebar />
                      {children}
                    </NotificationsProvider>
                  </WorkSessionProvider>
                </TenantProvider>
              </UserProvider>
            </AppInitializationProvider>
          </AuthProvider>
        </SupabaseProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
});

CoreInfrastructureWrapper.displayName = 'CoreInfrastructureWrapper';

// 🎯 Minimal wrapper - مبسط للإلكترون
export const MinimalCoreInfrastructureWrapper: React.FC<CoreInfrastructureWrapperProps> = React.memo(({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SupabaseProvider>
          <AuthProvider>
            <AppInitializationProvider>
              <UserProvider>
                <TenantProvider>
                  <WorkSessionProvider>
                    <NotificationsProvider>
                      <DesktopTitlebar />
                      {children}
                    </NotificationsProvider>
                  </WorkSessionProvider>
                </TenantProvider>
              </UserProvider>
            </AppInitializationProvider>
          </AuthProvider>
        </SupabaseProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
});

MinimalCoreInfrastructureWrapper.displayName = 'MinimalCoreInfrastructureWrapper';
