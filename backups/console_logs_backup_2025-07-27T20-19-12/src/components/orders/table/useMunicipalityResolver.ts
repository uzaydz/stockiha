import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getMunicipalityName } from "@/utils/addressHelpers";

interface MunicipalityCache {
  [key: string]: string;
}

export const useMunicipalityResolver = () => {
  const [municipalityCache, setMunicipalityCache] = useState<MunicipalityCache>({});
  const cacheRef = useRef<MunicipalityCache>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  // Helper function to resolve municipality name
  const resolveMunicipalityName = async (
    municipalityId: string | number, 
    provinceId?: string | number
  ): Promise<string> => {
    if (!municipalityId) return 'غير محدد';

    const id = municipalityId.toString();
    const cacheKey = `${id}-${provinceId || 'no_province'}`;

    // Check cache first
    if (cacheRef.current[cacheKey]) {
      return cacheRef.current[cacheKey];
    }

    // Check if already fetching to avoid duplicate requests
    if (fetchingRef.current.has(cacheKey)) {
      return id; // Return ID temporarily while fetching
    }

    const numericId = typeof municipalityId === 'string' ? parseInt(municipalityId) : municipalityId;

    // For small IDs, use the existing addressHelpers function
    if (numericId <= 100) {
      const result = getMunicipalityName(municipalityId, provinceId);
      cacheRef.current[cacheKey] = result;
      return result;
    }

    // For larger IDs, fetch from database
    fetchingRef.current.add(cacheKey);
    
    try {
      const { data, error } = await supabase
        .from('yalidine_municipalities_global')
        .select('name, name_ar')
        .eq('id', numericId)
        .single();

      if (error) {
        console.warn('Error fetching municipality name:', error);
        // Fallback to ID
        cacheRef.current[cacheKey] = id;
        return id;
      }

      if (data) {
        // Prefer Arabic name if available, otherwise use English name
        const municipalityName = data.name_ar || data.name || id;
        cacheRef.current[cacheKey] = municipalityName;
        
        // Update React state to trigger re-render
        setMunicipalityCache(prev => ({
          ...prev,
          [cacheKey]: municipalityName
        }));
        
        return municipalityName;
      }
    } catch (error) {
      console.warn('Exception while fetching municipality name:', error);
    } finally {
      fetchingRef.current.delete(cacheKey);
    }

    // Fallback to ID
    cacheRef.current[cacheKey] = id;
    return id;
  };

  // Synchronous function that returns cached value or triggers async resolution
  const getMunicipalityDisplayName = (
    municipalityId: string | number, 
    provinceId?: string | number
  ): string => {
    if (!municipalityId) return 'غير محدد';

    const id = municipalityId.toString();
    const cacheKey = `${id}-${provinceId || 'no_province'}`;

    // Return cached value if available
    if (cacheRef.current[cacheKey]) {
      return cacheRef.current[cacheKey];
    }

    // If in cache state, return it
    if (municipalityCache[cacheKey]) {
      return municipalityCache[cacheKey];
    }

    // Trigger async resolution
    resolveMunicipalityName(municipalityId, provinceId);

    // Return ID temporarily while resolving
    return id;
  };

  // Batch resolve multiple municipalities
  const batchResolveMunicipalities = async (
    municipalities: Array<{ id: string | number; provinceId?: string | number }>
  ) => {
    const promises = municipalities.map(({ id, provinceId }) => 
      resolveMunicipalityName(id, provinceId)
    );
    
    await Promise.all(promises);
  };

  return {
    getMunicipalityDisplayName,
    resolveMunicipalityName,
    batchResolveMunicipalities,
    municipalityCache: cacheRef.current,
  };
}; 