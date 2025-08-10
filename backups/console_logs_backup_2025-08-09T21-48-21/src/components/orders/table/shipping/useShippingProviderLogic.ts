import { useMemo, useCallback, useState } from 'react';
import { SHIPPING_PROVIDERS, ActiveProvider, ShippingOrder, EnabledProvider } from './ShippingProviderConstants';

interface UseShippingProviderLogicProps {
  order: ShippingOrder;
  enabledProviders: EnabledProvider[];
  onSendToProvider?: (orderId: string, providerCode: string) => void;
}

export const useShippingProviderLogic = ({ 
  order, 
  enabledProviders, 
  onSendToProvider 
}: UseShippingProviderLogicProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // تحديد الشركة النشطة والحقل المناسب للتتبع
  const getActiveProvider = useCallback((): ActiveProvider | null => {
    const orderData = order as any;

    // أولاً: التحقق من tracking_info (من RPC أو التحديث المحلي)
    if (orderData.tracking_info) {
      const trackingInfo = orderData.tracking_info;
      
      if (trackingInfo.yalidine_tracking_id && orderData.shipping_provider === 'yalidine') {
        return { 
          code: 'yalidine', 
          trackingId: trackingInfo.yalidine_tracking_id,
          providerName: 'ياليدين'
        };
      }
      if (trackingInfo.zrexpress_tracking_id && orderData.shipping_provider === 'zrexpress') {
        return { 
          code: 'zrexpress', 
          trackingId: trackingInfo.zrexpress_tracking_id,
          providerName: 'ZR Express'
        };
      }
      if (trackingInfo.maystro_tracking_id && orderData.shipping_provider === 'maystro_delivery') {
        return { 
          code: 'maystro_delivery', 
          trackingId: trackingInfo.maystro_tracking_id,
          providerName: 'مايسترو ديليفري'
        };
      }
      if (trackingInfo.ecotrack_tracking_id && orderData.shipping_provider) {
        const provider = SHIPPING_PROVIDERS[orderData.shipping_provider as keyof typeof SHIPPING_PROVIDERS];
        return { 
          code: orderData.shipping_provider, 
          trackingId: trackingInfo.ecotrack_tracking_id,
          providerName: provider?.name || orderData.shipping_provider
        };
      }
    }
    
    // ثانياً: التحقق من حقل shipping_provider مع رقم التتبع المناسب (للتوافق العكسي)
    if (orderData.shipping_provider) {
      const providerCode = orderData.shipping_provider;
      let trackingId = null;
      
      // تحديد رقم التتبع المناسب حسب المزود
      if (providerCode === 'yalidine' && orderData.yalidine_tracking_id) {
        trackingId = orderData.yalidine_tracking_id;
      } else if (providerCode === 'zrexpress' && orderData.zrexpress_tracking_id) {
        trackingId = orderData.zrexpress_tracking_id;
      } else if (providerCode === 'maystro_delivery' && orderData.maystro_tracking_id) {
        trackingId = orderData.maystro_tracking_id;
      } else if (orderData.ecotrack_tracking_id) {
        trackingId = orderData.ecotrack_tracking_id;
      }
      
      if (trackingId) {
        const provider = SHIPPING_PROVIDERS[providerCode as keyof typeof SHIPPING_PROVIDERS];
        return {
          code: providerCode,
          trackingId: trackingId,
          providerName: provider?.name || providerCode
        };
      }
    }
    
    // التحقق من الحقول الفردية للتوافق العكسي
    if (order.yalidine_tracking_id) {
      return { code: 'yalidine', trackingId: order.yalidine_tracking_id };
    }
    if (order.zrexpress_tracking_id) {
      return { code: 'zrexpress', trackingId: order.zrexpress_tracking_id };
    }
    if (orderData.maystro_tracking_id) {
      return { code: 'maystro_delivery', trackingId: orderData.maystro_tracking_id };
    }
    
    // التحقق من حقل ecotrack_tracking_id وتحديد المزود بناءً على رقم التتبع
    const ecotrackId = (order as any).ecotrack_tracking_id;
    if (ecotrackId) {
      // تحديد المزود بناءً على بداية رقم التتبع
      if (ecotrackId.startsWith('IMR')) {
        return { code: 'imir_express', trackingId: ecotrackId, providerName: 'إمير إكسبرس' };
      } else if (ecotrackId.startsWith('ECO')) {
        return { code: 'ecotrack', trackingId: ecotrackId, providerName: 'إيكوتراك' };
      } else if (ecotrackId.startsWith('AND')) {
        return { code: 'anderson_delivery', trackingId: ecotrackId, providerName: 'أندرسون ديليفري' };
      } else if (ecotrackId.startsWith('ARE')) {
        return { code: 'areex', trackingId: ecotrackId, providerName: 'أريكس' };
      } else if (ecotrackId.startsWith('BAC')) {
        return { code: 'ba_consult', trackingId: ecotrackId, providerName: 'بي إي كونسلت' };
      } else if (ecotrackId.startsWith('CON')) {
        return { code: 'conexlog', trackingId: ecotrackId, providerName: 'كونكسلوغ' };
      } else if (ecotrackId.startsWith('COY')) {
        return { code: 'coyote_express', trackingId: ecotrackId, providerName: 'كويوت إكسبرس' };
      } else {
        // افتراضي للمزودين الآخرين
        return { code: 'ecotrack', trackingId: ecotrackId, providerName: 'إيكوتراك' };
      }
    }
    
    // التحقق من حقول التتبع الخاصة بكل مزود (إذا كانت متوفرة)
    const trackingFields = {
      'imir_express': (order as any).imir_express_tracking_id,
      'anderson_delivery': (order as any).anderson_tracking_id,
      'areex': (order as any).areex_tracking_id,
      'ba_consult': (order as any).ba_consult_tracking_id,
      'conexlog': (order as any).conexlog_tracking_id,
      'coyote_express': (order as any).coyote_express_tracking_id,
      'dhd': (order as any).dhd_tracking_id,
      'distazero': (order as any).distazero_tracking_id,
      'e48hr_livraison': (order as any).e48hr_tracking_id,
      'fretdirect': (order as any).fretdirect_tracking_id,
      'golivri': (order as any).golivri_tracking_id,
      'mono_hub': (order as any).mono_hub_tracking_id,
      'msm_go': (order as any).msm_go_tracking_id,
      'packers': (order as any).packers_tracking_id,
      'prest': (order as any).prest_tracking_id,
      'rb_livraison': (order as any).rb_livraison_tracking_id,
      'rex_livraison': (order as any).rex_livraison_tracking_id,
      'rocket_delivery': (order as any).rocket_delivery_tracking_id,
      'salva_delivery': (order as any).salva_delivery_tracking_id,
      'speed_delivery': (order as any).speed_delivery_tracking_id,
      'tsl_express': (order as any).tsl_express_tracking_id,
      'worldexpress': (order as any).worldexpress_tracking_id,
    };
    
    for (const [providerCode, trackingId] of Object.entries(trackingFields)) {
      if (trackingId) {
        return { code: providerCode, trackingId };
      }
    }
    
    return null;
  }, [order]);

  const activeProvider = useMemo(() => getActiveProvider(), [getActiveProvider]);

  // يمكن الشحن فقط للطلبات المعلقة أو قيد المعالجة، وليس للطلبات الملغاة أو المكتملة
  const canSendToShipping = useMemo(() => 
    ['pending', 'processing'].includes(order.status) && 
    !['cancelled', 'delivered'].includes(order.status), 
    [order.status]
  );

  const showShippingOptions = useMemo(() => 
    canSendToShipping && !activeProvider, 
    [canSendToShipping, activeProvider]
  );

  // معالجة إرسال الطلب إلى مزود الشحن - مع تحسين الأداء
  const handleSendToProvider = useCallback(async (providerCode: string) => {
    console.log('handleSendToProvider called:', { providerCode, orderId: order.id, hasOnSendToProvider: !!onSendToProvider, isLoading });
    
    if (!onSendToProvider || isLoading) {
      console.log('handleSendToProvider: Early return', { hasOnSendToProvider: !!onSendToProvider, isLoading });
      return;
    }
    
    // استخدام requestAnimationFrame لتأجيل العمليات الثقيلة
    requestAnimationFrame(() => {
      setIsLoading(true);
      setSelectedProvider(providerCode);
    });
    
    try {
      console.log('handleSendToProvider: Calling onSendToProvider...');
      await onSendToProvider(order.id, providerCode);
      console.log('handleSendToProvider: Success');
    } catch (error) {
      console.error('handleSendToProvider: Error', error);
    } finally {
      // تأجيل إعادة تعيين الحالة لتجنب re-renders متعددة
      requestAnimationFrame(() => {
        setIsLoading(false);
        setSelectedProvider(null);
      });
    }
  }, [onSendToProvider, isLoading, order.id]);

  // دالة للحصول على اسم الشركة
  const getProviderDisplayName = useCallback((code: string): string => {
    const provider = SHIPPING_PROVIDERS[code as keyof typeof SHIPPING_PROVIDERS];
    return provider ? provider.name : code;
  }, []);

  // تصفية وإزالة التكرار للمزودين
  const uniqueProviders = useMemo(() => {
    return enabledProviders.filter((provider, index, self) => 
      index === self.findIndex(p => p.provider_code === provider.provider_code)
    );
  }, [enabledProviders]);

  return {
    activeProvider,
    canSendToShipping,
    showShippingOptions,
    isLoading,
    selectedProvider,
    uniqueProviders,
    handleSendToProvider,
    getProviderDisplayName
  };
};
