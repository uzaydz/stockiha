import { useState, useCallback, useEffect } from 'react';
import { useSupabase } from '@/context/SupabaseContext';

/**
 * Hook personalizado para gestionar los detalles de la página de aterrizaje
 * Optimizado para reducir consultas a la base de datos y almacenar en caché
 */
export function useLandingPage(landingPageId?: string, slug?: string) {
  const { supabase } = useSupabase();
  const [landingPageDetails, setLandingPageDetails] = useState<{ id: string, organization_id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Clave para almacenamiento local
  const cachedLandingPageKey = `landing_page_${slug || landingPageId}`;
  
  // Cargar datos desde caché al inicio
  useEffect(() => {
    const cached = localStorage.getItem(cachedLandingPageKey);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        setLandingPageDetails(parsedData);
        setIsLoading(false);
      } catch (e) {
        console.error('Error al analizar los datos en caché:', e);
      }
    }
  }, [cachedLandingPageKey]);
  
  // Función para obtener detalles de la página de aterrizaje
  const fetchLandingPageDetails = useCallback(async () => {
    // Si ya tenemos los detalles o no podemos identificar la página, detenemos
    if (landingPageDetails || (!landingPageId && !slug)) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      let result = null;
      
      // Usar ID si está disponible (más eficiente)
      if (landingPageId) {
        const { data, error } = await supabase
          .from('landing_pages')
          .select('id, organization_id')
          .eq('id', landingPageId)
          .single();
          
        if (error) throw error;
        result = data;
      } 
      // Usar slug si está disponible
      else if (slug) {
        const { data, error } = await supabase
          .from('landing_pages')
          .select('id, organization_id')
          .eq('slug', slug)
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      if (result) {
        setLandingPageDetails(result);
        // Guardar en caché
        localStorage.setItem(cachedLandingPageKey, JSON.stringify(result));
      }
    } catch (error) {
      console.error('Error al obtener detalles de la página de aterrizaje:', error);
    } finally {
      setIsLoading(false);
    }
  }, [landingPageId, slug, supabase, landingPageDetails, cachedLandingPageKey]);
  
  return {
    landingPageDetails,
    isLoading,
    fetchLandingPageDetails
  };
} 