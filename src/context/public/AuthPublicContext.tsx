import React, { createContext, useContext } from 'react';
import type { AuthContextType, AuthResult } from '@/context/auth/types/auth';

const AuthPublicContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }>= ({ children }) => {
  const value: AuthContextType = {
    // state
    session: null,
    user: null,
    userProfile: null,
    organization: null,
    currentSubdomain: null,
    isLoading: false,
    isProcessingToken: false,
    isExplicitSignOut: false,
    hasInitialSessionCheck: true,
    authReady: true,
    isLoadingProfile: false,
    isLoadingOrganization: false,
    profileLoaded: false,
    organizationLoaded: false,
    dataLoadingComplete: true,
    // actions (no-ops)
    async signIn() { return { success: false, error: new Error('Auth disabled in store build') } as AuthResult; },
    async signUp() { return { success: false, error: new Error('Auth disabled in store build') } as AuthResult; },
    async signOut() { /* no-op */ },
    async refreshData() { /* no-op */ },
    updateAuthState() { /* no-op */ },
    forceUpdateAuthState() { /* no-op */ },
    async initialize() { /* no-op */ },
  };

  return (
    <AuthPublicContext.Provider value={value}>
      {children}
    </AuthPublicContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthPublicContext);
  if (ctx) return ctx;
  // return a static object to avoid throwing in store build
  return {
    session: null,
    user: null,
    userProfile: null,
    organization: null,
    currentSubdomain: null,
    isLoading: false,
    isProcessingToken: false,
    isExplicitSignOut: false,
    hasInitialSessionCheck: true,
    authReady: true,
    isLoadingProfile: false,
    isLoadingOrganization: false,
    profileLoaded: false,
    organizationLoaded: false,
    dataLoadingComplete: true,
    async signIn() { return { success: false, error: new Error('Auth disabled in store build') } as AuthResult; },
    async signUp() { return { success: false, error: new Error('Auth disabled in store build') } as AuthResult; },
    async signOut() {},
    async refreshData() {},
    updateAuthState() {},
    forceUpdateAuthState() {},
    async initialize() {},
  } as AuthContextType;
}

export default AuthPublicContext;

