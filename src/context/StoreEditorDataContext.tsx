import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type StoreEditorComponent = {
  id: string;
  type: string;
  settings: any;
  is_active: boolean;
  order_index: number;
};

type StoreEditorInitData = {
  organization_details: any | null;
  organization_settings: any | null;
  categories: any[];
  subcategories: any[];
  featured_products: any[];
  store_layout_components: StoreEditorComponent[];
  testimonials?: any[];
  shipping_info: { has_shipping_providers: boolean; default_shipping_zone_id: string | null; default_shipping_zone_details: any | null } | null;
  performance_info?: any;
  error?: string;
};

type Ctx = {
  data: StoreEditorInitData | null;
  isLoading: boolean;
  error: string | null;
};

const StoreEditorDataContext = createContext<Ctx | undefined>(undefined);

export function useStoreEditorData(): Ctx {
  const ctx = useContext(StoreEditorDataContext);
  if (!ctx) throw new Error('useStoreEditorData must be used within StoreEditorDataProvider');
  return ctx;
}

export const StoreEditorDataProvider: React.FC<{ organizationId: string; children: React.ReactNode }> = ({ organizationId, children }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['store-editor-init', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_store_editor_init_data', { p_organization_id: organizationId });
      if (error) throw new Error(error.message);
      return (data || null) as StoreEditorInitData | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo<Ctx>(() => ({
    data: data || null,
    isLoading,
    error: (data && (data as any).error) ? (data as any).error as string : null,
  }), [data, isLoading]);

  return (
    <StoreEditorDataContext.Provider value={value}>
      {children}
    </StoreEditorDataContext.Provider>
  );
};
