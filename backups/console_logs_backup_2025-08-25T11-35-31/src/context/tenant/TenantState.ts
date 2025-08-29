/**
 * TenantState - إدارة حالة TenantContext
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import { useState, useRef } from 'react';
import type { Organization } from '@/types/tenant';

export interface TenantState {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
}

export interface TenantStateRefs {
  initialized: React.MutableRefObject<boolean>;
  loadingOrganization: React.MutableRefObject<boolean>;
  abortController: React.MutableRefObject<AbortController | null>;
  startTime: React.MutableRefObject<number>;
  authContextProcessed: React.MutableRefObject<boolean>;
  customDomainProcessed: React.MutableRefObject<boolean>;
  fallbackProcessed: React.MutableRefObject<boolean>;
  eventListenerRef: React.MutableRefObject<((event: CustomEvent) => void) | null>;
}

export function useTenantState(): [TenantState, React.Dispatch<React.SetStateAction<TenantState>>, TenantStateRefs] {
  const [state, setState] = useState<TenantState>({
    organization: null,
    isLoading: true,
    error: null
  });

  // مراجع للتحكم في دورة الحياة
  const initialized = useRef(false);
  const loadingOrganization = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const startTime = useRef(Date.now());
  
  // مراجع لمنع التكرار
  const authContextProcessed = useRef(false);
  const customDomainProcessed = useRef(false);
  const fallbackProcessed = useRef(false);
  const eventListenerRef = useRef<((event: CustomEvent) => void) | null>(null);

  const refs: TenantStateRefs = {
    initialized,
    loadingOrganization,
    abortController,
    startTime,
    authContextProcessed,
    customDomainProcessed,
    fallbackProcessed,
    eventListenerRef
  };

  return [state, setState, refs];
}

// دوال مساعدة لتحديث الحالة
export const updateOrganization = (
  setState: React.Dispatch<React.SetStateAction<TenantState>>,
  organization: Organization | null
) => {
  setState(prev => ({ ...prev, organization, isLoading: false, error: null }));
};

export const setLoading = (
  setState: React.Dispatch<React.SetStateAction<TenantState>>,
  isLoading: boolean
) => {
  setState(prev => ({ ...prev, isLoading }));
};

export const setError = (
  setState: React.Dispatch<React.SetStateAction<TenantState>>,
  error: Error | null
) => {
  setState(prev => ({ ...prev, error, isLoading: false }));
};

export const resetState = (
  setState: React.Dispatch<React.SetStateAction<TenantState>>,
  refs: TenantStateRefs
) => {
  refs.initialized.current = false;
  refs.loadingOrganization.current = false;
  refs.authContextProcessed.current = false;
  refs.customDomainProcessed.current = false;
  refs.fallbackProcessed.current = false;
  refs.eventListenerRef.current = null;

  setState({
    organization: null,
    isLoading: false,
    error: null
  });
};
