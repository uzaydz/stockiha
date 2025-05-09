import { useState, useCallback, useEffect } from 'react';
import { useSupabase } from '@/context/SupabaseContext';

/**
 * Hook personalizado para gestionar los campos del formulario con caché
 * Optimizado para reducir solicitudes a la base de datos
 */
export function useFormFields(formId?: string) {
  const { supabase } = useSupabase();
  const [formFields, setFormFields] = useState<any[]>([]);
  const [isFieldsLoading, setIsFieldsLoading] = useState(true);
  
  // Clave para almacenamiento local
  const cachedFieldsKey = formId ? `form_fields_${formId}` : null;
  
  // Cargar datos desde caché al inicio
  useEffect(() => {
    if (cachedFieldsKey) {
      const cached = localStorage.getItem(cachedFieldsKey);
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          setFormFields(parsedData);
          setIsFieldsLoading(false);
        } catch (e) {
          console.error('Error al analizar los datos en caché:', e);
        }
      }
    }
  }, [cachedFieldsKey]);
  
  // Función para obtener campos del formulario
  const fetchFormFields = useCallback(async () => {
    if (!formId || formFields.length > 0) {
      setIsFieldsLoading(false);
      return;
    }
    
    setIsFieldsLoading(true);
    
    try {
      // Intentar obtener de form_settings primero (más eficiente)
      const { data: formData, error: formError } = await supabase
        .from('form_settings')
        .select('fields')
        .eq('id', formId)
        .single();
      
      if (formError) throw formError;
      
      // Usar campos directamente de los datos si están disponibles
      if (formData && formData.fields && Array.isArray(formData.fields)) {
        const sortedFields = [...formData.fields].sort((a, b) => 
          (a.order || 0) - (b.order || 0)
        );
        
        setFormFields(sortedFields);
        
        // Guardar en caché
        if (cachedFieldsKey) {
          localStorage.setItem(cachedFieldsKey, JSON.stringify(sortedFields));
        }
        
        setIsFieldsLoading(false);
        return;
      }
      
      // Obtener de form_fields si no están disponibles en form_settings
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('position');
      
      if (fieldsError) throw fieldsError;
      
      setFormFields(fieldsData || []);
      
      // Guardar en caché
      if (cachedFieldsKey) {
        localStorage.setItem(cachedFieldsKey, JSON.stringify(fieldsData || []));
      }
      
    } catch (error) {
      console.error('Error al obtener los campos del formulario:', error);
    } finally {
      setIsFieldsLoading(false);
    }
  }, [formId, supabase, formFields.length, cachedFieldsKey]);
  
  return {
    formFields,
    isFieldsLoading,
    fetchFormFields
  };
} 