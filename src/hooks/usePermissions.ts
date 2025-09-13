import { useContext } from 'react';
import { PermissionsContext } from '@/context/PermissionsContext';

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  
  // إذا لم يكن PermissionsProvider متوفراً، إرجاع قيم افتراضية
  if (!context) {
    return {
      loading: false,
      ready: true,
      error: null,
      data: null,
      has: () => false,
      anyOf: () => false,
      allOf: () => false,
      isOrgAdmin: false,
      isSuperAdmin: false,
      role: null,
      refresh: async () => {}
    };
  }
  
  return context;
};

