import { useState, useCallback } from 'react';
import { useSupabase } from '@/context/SupabaseContext';

interface UpdateLandingPageParams {
  pageId: string;
  name?: string;
  title?: string;
  description?: string;
  keywords?: string;
  isPublished?: boolean;
  settings?: Record<string, any>;
}

interface UpdateResult {
  success: boolean;
  data?: any;
  message?: string;
}

export function useLandingPageMutation() {
  const { supabase } = useSupabase();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para actualizar una landing page usando la RPC segura
  const updateLandingPage = useCallback(async ({
    pageId,
    name,
    title,
    description,
    keywords,
    isPublished,
    settings,
  }: UpdateLandingPageParams): Promise<UpdateResult> => {
    setIsUpdating(true);
    setError(null);

    try {
      // Usar la función RPC segura para actualizar la landing page
      const { data, error } = await supabase.rpc('update_landing_page', {
        page_id: pageId,
        page_name: name,
        page_title: title,
        page_description: description,
        page_keywords: keywords,
        page_is_published: isPublished,
        page_settings: settings,
      });

      if (error) {
        throw error;
      }

      return data as UpdateResult;
    } catch (err: any) {
      console.error('Error al actualizar la landing page:', err);
      
      // Formatear mensaje de error para el usuario
      const errorMessage = err.message || 'Ha ocurrido un error al actualizar la página.';
      setError(errorMessage);
      
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setIsUpdating(false);
    }
  }, [supabase]);

  return {
    updateLandingPage,
    isUpdating,
    error
  };
} 