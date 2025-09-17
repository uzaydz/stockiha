import { useCallback } from 'react';
import { updateOrganizationTheme } from '@/lib/themeManager/index';

interface ThemeSettings {
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  custom_css?: string;
}

interface UseStoreThemeReturn {
  applyOrganizationTheme: (orgId: string, settings: ThemeSettings) => void;
}

export const useStoreTheme = (): UseStoreThemeReturn => {

  const applyOrganizationTheme = useCallback((orgId: string, settings: ThemeSettings) => {
    updateOrganizationTheme(orgId, settings);
  }, []);

  return {
    applyOrganizationTheme
  };
};
