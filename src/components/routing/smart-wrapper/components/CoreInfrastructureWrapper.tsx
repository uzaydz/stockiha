/**
 * 🎯 Core Infrastructure Wrapper - مبسط للإلكترون
 * طبقة أساسية مبسطة بدون تعقيدات غير ضرورية
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { SupabaseProvider } from "@/context/SupabaseContext";
import { PowerSyncProvider } from "@/context/PowerSyncProvider";
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';
import { TenantProvider } from '@/context/tenant';
import { AppInitializationProvider } from '@/context/AppInitializationContext';
import { WorkSessionProvider } from '@/context/WorkSessionContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { BusinessProfileProvider } from '@/context/BusinessProfileContext';
import { POSModeProvider } from '@/context/POSModeContext';
import { POSActionsProvider } from '@/context/POSActionsContext';
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
                  <BusinessProfileProvider>
                    <WorkSessionProvider>
                      <NotificationsProvider>
                        <PowerSyncProvider>
                          <POSModeProvider>
                            <POSActionsProvider>
                              <DesktopTitlebar />
                              {children}
                            </POSActionsProvider>
                          </POSModeProvider>
                        </PowerSyncProvider>
                      </NotificationsProvider>
                    </WorkSessionProvider>
                  </BusinessProfileProvider>
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
                  <BusinessProfileProvider>
                    <WorkSessionProvider>
                      <NotificationsProvider>
                        <POSModeProvider>
                          <POSActionsProvider>
                            <DesktopTitlebar />
                            {children}
                          </POSActionsProvider>
                        </POSModeProvider>
                      </NotificationsProvider>
                    </WorkSessionProvider>
                  </BusinessProfileProvider>
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
