import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface FacebookPixelData {
  pixel_id: string;
  conversion_api_enabled: boolean;
  access_token?: string;
  test_event_code?: string;
  product_count: number;
  last_used: string;
  created_at: string;
}

export interface GoogleTrackingData {
  gtag_id?: string;
  conversion_id?: string;
  conversion_label?: string;
  enhanced_conversions?: boolean;
  product_count: number;
  last_used: string;
  created_at: string;
}

export interface TikTokPixelData {
  pixel_id: string;
  events_api_enabled: boolean;
  access_token?: string;
  test_event_code?: string;
  product_count: number;
  last_used: string;
  created_at: string;
}

export interface PreviousPixelsData {
  facebook_pixels: FacebookPixelData[];
  google_tracking: GoogleTrackingData[];
  tiktok_pixels: TikTokPixelData[];
  organization_id: string;
  fetched_at: string;
}

/**
 * Hook لجلب جميع البكسلات والـ Conversion APIs السابقة للمؤسسة
 */
export function usePreviousPixels(organizationId: string) {
  const [data, setData] = useState<PreviousPixelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreviousPixels = async () => {
    if (!organizationId) {
      setError('معرف المؤسسة مطلوب');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error: dbError } = await supabase
        .rpc('get_organization_previous_tracking_pixels', {
          p_organization_id: organizationId
        });

      if (dbError) {
        throw new Error(dbError.message);
      }

      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل في جلب البكسلات السابقة';
      setError(errorMessage);
      console.error('خطأ في جلب البكسلات السابقة:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreviousPixels();
  }, [organizationId]);

  return {
    data,
    loading,
    error,
    refetch: fetchPreviousPixels
  };
}

/**
 * Hook مبسط لجلب البكسلات السابقة بدون تحميل تلقائي
 */
export function usePreviousPixelsLazy() {
  const [data, setData] = useState<PreviousPixelsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreviousPixels = async (organizationId: string) => {
    if (!organizationId) {
      setError('معرف المؤسسة مطلوب');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error: dbError } = await supabase
        .rpc('get_organization_previous_tracking_pixels', {
          p_organization_id: organizationId
        });

      if (dbError) {
        throw new Error(dbError.message);
      }

      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل في جلب البكسلات السابقة';
      setError(errorMessage);
      console.error('خطأ في جلب البكسلات السابقة:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchPreviousPixels
  };
}

