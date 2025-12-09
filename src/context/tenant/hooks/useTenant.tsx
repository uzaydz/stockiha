/**
 * useTenant Hook - محسن للوصول إلى TenantContext
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import { useContext } from 'react';
import type { TenantContextType } from '@/types/tenant';
import { TenantContext } from '../TenantProvider';

// Hook محسن لاستخدام السياق
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);

  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }

  return context;
}
