import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase-client";

interface StopDeskDetails {
  name?: string;
  commune_name?: string;
}

interface UseStopDeskDetailsProps {
  order: {
    shipping_option?: string;
    stop_desk_id?: string;
    form_data?: {
      deliveryOption?: string;
      stopDeskId?: string;
    };
    metadata?: {
      shipping_details?: {
        municipality_name?: string;
      };
    };
  };
}

export const useStopDeskDetails = ({ order }: UseStopDeskDetailsProps) => {
  const [stopDeskDetails, setStopDeskDetails] = useState<StopDeskDetails | null>(null);
  const [loading, setLoading] = useState(false);

  // Memoize the conditions to prevent unnecessary effect runs
  const shouldFetchDetails = useMemo(() => {
    return (
      order.shipping_option === 'desk' || 
      order.form_data?.deliveryOption === 'desk'
    );
  }, [order.shipping_option, order.form_data?.deliveryOption]);

  const stopDeskId = useMemo(() => {
    return order.stop_desk_id || order.form_data?.stopDeskId;
  }, [order.stop_desk_id, order.form_data?.stopDeskId]);

  const hasMetadataDetails = useMemo(() => {
    return !!(
      order.metadata && 
      typeof order.metadata === 'object' && 
      'shipping_details' in order.metadata &&
      (order.metadata as any).shipping_details?.municipality_name
    );
  }, [order.metadata]);

  useEffect(() => {
    const fetchStopDeskDetails = async () => {
      if (!shouldFetchDetails) {
        setStopDeskDetails(null);
        return;
      }

      // تحقق أولاً من وجود معلومات الشحن في metadata
      if (hasMetadataDetails) {
        const shippingDetails = (order.metadata as any).shipping_details;
        setStopDeskDetails({
          name: `مكتب في ${shippingDetails.municipality_name}`,
          commune_name: shippingDetails.municipality_name
        });
        return;
      }

      // إذا لم توجد معلومات في metadata وكان لدينا stopDeskId، ابحث في قاعدة البيانات
      if (!stopDeskId) {
        setStopDeskDetails(null);
        return;
      }

      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('yalidine_centers_global')
          .select('center_id, name, commune_id, wilaya_id, commune_name')
          .eq('center_id', stopDeskId)
          .single();

        if (!error && data) {
          setStopDeskDetails({
            name: data.name,
            commune_name: data.commune_name
          });
        } else {
          setStopDeskDetails(null);
        }
      } catch (error) {
        setStopDeskDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStopDeskDetails();
  }, [shouldFetchDetails, hasMetadataDetails, stopDeskId, order.metadata]);

  return {
    stopDeskDetails,
    loading,
    hasDetails: !!stopDeskDetails
  };
};
