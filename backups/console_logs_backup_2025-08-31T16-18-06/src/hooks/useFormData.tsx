import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase } from '@/context/SupabaseContext';
import useSWR from 'swr';

interface Form {
  id: string;
  name: string;
  is_active: boolean;
  fields?: any[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface FormDataReturn {
  forms: Form[];
  products: Product[];
  formFields: any[];
  isLoadingForms: boolean;
  isLoadingProducts: boolean;
  isLoadingFields: boolean;
  fetchFormFields: (formId: string) => Promise<any[]>;
  fetchForms: (organizationId: string) => Promise<Form[]>;
  fetchProducts: () => Promise<Product[]>;
  error: any;
}

const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes cache - زيادة مدة التخزين المؤقت

export function useFormData(organizationId?: string, formId?: string): FormDataReturn {
  const { supabase } = useSupabase();
  const [error, setError] = useState<any>(null);

  // Fetch forms using SWR for caching
  const {
    data: forms,
    isLoading: isLoadingForms,
    mutate: mutateForm
  } = useSWR(
    organizationId ? `forms-${organizationId}` : null,
    async () => {
      try {
        const { data, error } = await supabase
          .from('form_settings')
          .select('id, name, is_active, fields')
          .eq('is_active', true)
          .eq('organization_id', organizationId || '')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        setError(error);
        return [];
      }
    },
    { 
      revalidateOnFocus: false,
      dedupingInterval: CACHE_DURATION
    }
  );
  
  // Fetch products using SWR
  const {
    data: products,
    isLoading: isLoadingProducts
  } = useSWR(
    'products',
    async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        setError(error);
        return [];
      }
    },
    { 
      revalidateOnFocus: false,
      dedupingInterval: CACHE_DURATION
    }
  );
  
  // Fetch form fields using SWR
  const {
    data: formFields,
    isLoading: isLoadingFields,
    mutate: mutateFields
  } = useSWR(
    formId ? `form-fields-${formId}` : null,
    async () => {
      try {
        // Try to fetch fields from forms data first
        const formWithFields = forms?.find(form => form.id === formId);
        
        if (formWithFields?.fields && Array.isArray(formWithFields.fields)) {
          return formWithFields.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        
        // If not available, fetch from form_fields table
        const { data, error } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId || '')
          .order('position');
          
        if (error) throw error;
        return data || [];
      } catch (error) {
        setError(error);
        return [];
      }
    },
    { 
      revalidateOnFocus: false,
      dedupingInterval: CACHE_DURATION
    }
  );
  
  // Fetch form fields function (for manual calling)
  const fetchFormFields = useCallback(async (formId: string) => {
    try {
      // Try to fetch fields from forms data first
      const formWithFields = forms?.find(form => form.id === formId);
      
      if (formWithFields?.fields && Array.isArray(formWithFields.fields)) {
        return formWithFields.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
      
      // If not available, fetch from form_fields table
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('position');
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      setError(error);
      return [];
    }
  }, [forms, supabase]);
  
  // Fetch forms function (for manual calling)
  const fetchForms = useCallback(async (organizationId: string) => {
    try {
              const { data, error } = await supabase
          .from('form_settings')
          .select('id, name, is_active, fields')
          .eq('is_active', true)
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        mutateForm(data);
        return data || [];
    } catch (error) {
      setError(error);
      return [];
    }
  }, [supabase, mutateForm]);
  
  // Fetch products function (for manual calling)
  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      setError(error);
      return [];
    }
  }, [supabase]);

  return {
    forms: forms || [],
    products: products || [],
    formFields: formFields || [],
    isLoadingForms,
    isLoadingProducts,
    isLoadingFields,
    fetchFormFields,
    fetchForms,
    fetchProducts,
    error
  };
}
