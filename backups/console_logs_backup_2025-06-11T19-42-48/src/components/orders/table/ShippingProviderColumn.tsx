import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Truck, 
  Package, 
  Send, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  Plane,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useEnabledShippingProviders } from "@/hooks/useEnabledShippingProviders";
import { useShippingOrderData } from "@/hooks/useShippingOrderData";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";

// دالة مساعدة للحصول على ألوان CSS
const getColorClass = (color: string) => {
  const colorClasses = {
    green: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      icon: 'text-green-600'
    },
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-800', 
      border: 'border-blue-300',
      icon: 'text-blue-600'
    },
    emerald: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      icon: 'text-emerald-600'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-300',
      icon: 'text-purple-600'
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      icon: 'text-orange-600'
    },
    cyan: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      border: 'border-cyan-300',
      icon: 'text-cyan-600'
    },
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
      icon: 'text-indigo-600'
    },
    amber: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
      icon: 'text-amber-600'
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      icon: 'text-red-600'
    },
    teal: {
      bg: 'bg-teal-100',
      text: 'text-teal-800',
      border: 'border-teal-300',
      icon: 'text-teal-600'
    },
    gray: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300',
      icon: 'text-gray-600'
    }
  };
  
  return colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;
};

export interface ShippingProviderColumnProps {
  order: {
    id: string;
    status: string;
    yalidine_tracking_id?: string | null;
    zrexpress_tracking_id?: string | null;
    // Add support for Ecotrack providers
    ecotrack_tracking_id?: string | null;
    anderson_tracking_id?: string | null;
    areex_tracking_id?: string | null;
    ba_consult_tracking_id?: string | null;
    conexlog_tracking_id?: string | null;
    coyote_express_tracking_id?: string | null;
    dhd_tracking_id?: string | null;
    distazero_tracking_id?: string | null;
    e48hr_tracking_id?: string | null;
    fretdirect_tracking_id?: string | null;
    golivri_tracking_id?: string | null;
    mono_hub_tracking_id?: string | null;
    msm_go_tracking_id?: string | null;
    imir_express_tracking_id?: string | null;
    packers_tracking_id?: string | null;
    prest_tracking_id?: string | null;
    rb_livraison_tracking_id?: string | null;
    rex_livraison_tracking_id?: string | null;
    rocket_delivery_tracking_id?: string | null;
    salva_delivery_tracking_id?: string | null;
    speed_delivery_tracking_id?: string | null;
    tsl_express_tracking_id?: string | null;
    worldexpress_tracking_id?: string | null;
  };
  onSendToProvider?: (orderId: string, providerCode: string) => void;
  hasUpdatePermission?: boolean;
  className?: string;
}

// تعريف شركات التوصيل مع معلوماتها
const SHIPPING_PROVIDERS = {
  yalidine: {
    code: 'yalidine',
    name: 'ياليدين',
    nameEn: 'Yalidine',
    color: 'green',
    icon: Truck,
    trackingField: 'yalidine_tracking_id'
  },
  zrexpress: {
    code: 'zrexpress',
    name: 'زر إكسبرس',
    nameEn: 'ZR Express',
    color: 'blue',
    icon: Truck,
    trackingField: 'zrexpress_tracking_id'
  },
  maystro_delivery: {
    code: 'maystro_delivery',
    name: 'مايسترو ديليفري',
    nameEn: 'Maystro Delivery',
    color: 'indigo',
    icon: Plane,
    trackingField: null // يستخدم shipping_orders table
  },
  // Ecotrack providers
  ecotrack: {
    code: 'ecotrack',
    name: 'إيكوتراك',
    nameEn: 'Ecotrack',
    color: 'emerald',
    icon: Plane,
    trackingField: 'ecotrack_tracking_id'
  },
  anderson_delivery: {
    code: 'anderson_delivery',
    name: 'أندرسون ديليفري',
    nameEn: 'Anderson Delivery',
    color: 'purple',
    icon: Package,
    trackingField: 'anderson_tracking_id'
  },
  areex: {
    code: 'areex',
    name: 'أريكس',
    nameEn: 'Areex',
    color: 'orange',
    icon: MapPin,
    trackingField: 'areex_tracking_id'
  },
  ba_consult: {
    code: 'ba_consult',
    name: 'بي إي كونسلت',
    nameEn: 'BA Consult',
    color: 'cyan',
    icon: Truck,
    trackingField: 'ba_consult_tracking_id'
  },
  conexlog: {
    code: 'conexlog',
    name: 'كونكسلوغ',
    nameEn: 'Conexlog',
    color: 'indigo',
    icon: Package,
    trackingField: 'conexlog_tracking_id'
  },
  coyote_express: {
    code: 'coyote_express',
    name: 'كويوت إكسبرس',
    nameEn: 'Coyote Express',
    color: 'amber',
    icon: Truck,
    trackingField: 'coyote_express_tracking_id'
  },
  dhd: {
    code: 'dhd',
    name: 'دي إتش دي',
    nameEn: 'DHD',
    color: 'red',
    icon: Package,
    trackingField: 'dhd_tracking_id'
  },
  distazero: {
    code: 'distazero',
    name: 'ديستازيرو',
    nameEn: 'Distazero',
    color: 'teal',
    icon: MapPin,
    trackingField: 'distazero_tracking_id'
  },
  e48hr_livraison: {
    code: 'e48hr_livraison',
    name: 'إي 48 أتش آر',
    nameEn: 'E48HR Livraison',
    color: 'pink',
    icon: Clock,
    trackingField: 'e48hr_tracking_id'
  },
  fretdirect: {
    code: 'fretdirect',
    name: 'فريت دايركت',
    nameEn: 'Fretdirect',
    color: 'lime',
    icon: Truck,
    trackingField: 'fretdirect_tracking_id'
  },
  golivri: {
    code: 'golivri',
    name: 'غوليفري',
    nameEn: 'Golivri',
    color: 'violet',
    icon: Package,
    trackingField: 'golivri_tracking_id'
  },
  mono_hub: {
    code: 'mono_hub',
    name: 'مونو هاب',
    nameEn: 'Mono Hub',
    color: 'slate',
    icon: MapPin,
    trackingField: 'mono_hub_tracking_id'
  },
  msm_go: {
    code: 'msm_go',
    name: 'إم إس إم غو',
    nameEn: 'MSM Go',
    color: 'rose',
    icon: Truck,
    trackingField: 'msm_go_tracking_id'
  },
  imir_express: {
    code: 'imir_express',
    name: 'إمير إكسبرس',
    nameEn: 'Imir Express',
    color: 'sky',
    icon: Package,
    trackingField: 'imir_express_tracking_id'
  },
  packers: {
    code: 'packers',
    name: 'باكرز',
    nameEn: 'Packers',
    color: 'yellow',
    icon: Package,
    trackingField: 'packers_tracking_id'
  },
  prest: {
    code: 'prest',
    name: 'بريست',
    nameEn: 'Prest',
    color: 'emerald',
    icon: Truck,
    trackingField: 'prest_tracking_id'
  },
  rb_livraison: {
    code: 'rb_livraison',
    name: 'آر بي ليفريزون',
    nameEn: 'RB Livraison',
    color: 'blue',
    icon: MapPin,
    trackingField: 'rb_livraison_tracking_id'
  },
  rex_livraison: {
    code: 'rex_livraison',
    name: 'ريكس ليفريزون',
    nameEn: 'Rex Livraison',
    color: 'purple',
    icon: Truck,
    trackingField: 'rex_livraison_tracking_id'
  },
  rocket_delivery: {
    code: 'rocket_delivery',
    name: 'روكيت ديليفري',
    nameEn: 'Rocket Delivery',
    color: 'orange',
    icon: Plane,
    trackingField: 'rocket_delivery_tracking_id'
  },
  salva_delivery: {
    code: 'salva_delivery',
    name: 'سالفا ديليفري',
    nameEn: 'Salva Delivery',
    color: 'green',
    icon: Package,
    trackingField: 'salva_delivery_tracking_id'
  },
  speed_delivery: {
    code: 'speed_delivery',
    name: 'سبيد ديليفري',
    nameEn: 'Speed Delivery',
    color: 'red',
    icon: Plane,
    trackingField: 'speed_delivery_tracking_id'
  },
  tsl_express: {
    code: 'tsl_express',
    name: 'تي إس إل إكسبرس',
    nameEn: 'TSL Express',
    color: 'indigo',
    icon: Truck,
    trackingField: 'tsl_express_tracking_id'
  },
  worldexpress: {
    code: 'worldexpress',
    name: 'ورلد إكسبرس',
    nameEn: 'World Express',
    color: 'cyan',
    icon: Plane,
    trackingField: 'worldexpress_tracking_id'
  }
} as const;

export const ShippingProviderColumn: React.FC<ShippingProviderColumnProps> = ({ 
  order, 
  onSendToProvider,
  className 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const { currentOrganization } = useTenant();
  const { enabledProviders, isLoading: providersLoading, error: providersError } = useEnabledShippingProviders(currentOrganization?.id || '');
  const { shippingData, loading: shippingLoading } = useShippingOrderData(order.id);

  // تحديد الشركة النشطة والحقل المناسب للتتبع
  const getActiveProvider = () => {
    console.log('🔍 [ShippingProviderColumn] فحص معلومات الطلب:', {
      orderId: order.id,
      shippingData,
      yalidine_tracking_id: order.yalidine_tracking_id,
      zrexpress_tracking_id: order.zrexpress_tracking_id,
      ecotrack_tracking_id: (order as any).ecotrack_tracking_id
    });

    // أولاً، التحقق من جدول shipping_orders
    if (shippingData && shippingData.tracking_number && shippingData.provider) {
      console.log('✅ [ShippingProviderColumn] تم العثور على بيانات من shipping_orders:', shippingData);
      return { 
        code: shippingData.provider.code, 
        trackingId: shippingData.tracking_number,
        providerName: shippingData.provider.name 
      };
    }
    
    // التحقق من الحقول القديمة للتوافق العكسي
    if (order.yalidine_tracking_id) {
      console.log('✅ [ShippingProviderColumn] تم العثور على yalidine_tracking_id:', order.yalidine_tracking_id);
      return { code: 'yalidine', trackingId: order.yalidine_tracking_id };
    }
    if (order.zrexpress_tracking_id) {
      console.log('✅ [ShippingProviderColumn] تم العثور على zrexpress_tracking_id:', order.zrexpress_tracking_id);
      return { code: 'zrexpress', trackingId: order.zrexpress_tracking_id };
    }
    
    // التحقق من حقل ecotrack_tracking_id وتحديد المزود بناءً على رقم التتبع
    const ecotrackId = (order as any).ecotrack_tracking_id;
    if (ecotrackId) {
      console.log('✅ [ShippingProviderColumn] تم العثور على ecotrack_tracking_id:', ecotrackId);
      
      // تحديد المزود بناءً على بداية رقم التتبع
      if (ecotrackId.startsWith('IMR')) {
        console.log('🎯 [ShippingProviderColumn] تم تحديد المزود: إمير إكسبرس');
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
  };

  const activeProvider = getActiveProvider();
  console.log('🎯 [ShippingProviderColumn] النتيجة النهائية:', {
    orderId: order.id,
    activeProvider,
    canSendToShipping: order.status === 'pending' || order.status === 'processing',
    showShippingOptions: (order.status === 'pending' || order.status === 'processing') && !activeProvider
  });
  
  const canSendToShipping = order.status === 'pending' || order.status === 'processing';
  const showShippingOptions = canSendToShipping && !activeProvider;

  // معالجة إرسال الطلب إلى مزود الشحن
  const handleSendToProvider = async (providerCode: string) => {
    if (!onSendToProvider || isLoading) return;
    
    try {
      setIsLoading(true);
      setSelectedProvider(providerCode);
      await onSendToProvider(order.id, providerCode);
    } catch (error) {
      console.error('خطأ في إرسال الطلب:', error);
    } finally {
      setIsLoading(false);
      setSelectedProvider(null);
    }
  };

  // دالة للحصول على اسم الشركة
  const getProviderDisplayName = (code: string): string => {
    const provider = SHIPPING_PROVIDERS[code as keyof typeof SHIPPING_PROVIDERS];
    return provider ? provider.name : code;
  };

  // إذا كان هناك مزود نشط، عرض معلوماته
  if (activeProvider) {
    const provider = SHIPPING_PROVIDERS[activeProvider.code as keyof typeof SHIPPING_PROVIDERS];
    const Icon = provider?.icon || Package;
    const colorClass = getColorClass(provider?.color || 'gray');
    const displayName = provider?.name || (activeProvider as any).providerName || activeProvider.code;

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
                colorClass.bg,
                colorClass.text,
                colorClass.border
              )}>
                <Icon className="h-3.5 w-3.5" />
                <span>{displayName}</span>
                <CheckCircle className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">شركة التوصيل: {displayName}</p>
                <p className="text-xs">رقم التتبع: {activeProvider.trackingId}</p>
                <p className="text-xs">الحالة: تم الإرسال ✓</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // إذا لم يكن بإمكان إرسال الطلب، عرض رسالة
  if (!canSendToShipping) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          <Package className="h-3.5 w-3.5" />
          <span>لم يتم الشحن</span>
        </div>
      </div>
    );
  }

  // إذا كان يتم تحميل الشركات أو بيانات الشحن
  if (providersLoading || shippingLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  // إذا كان هناك خطأ في تحميل الشركات
  if (providersError) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>خطأ</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>خطأ في تحميل شركات التوصيل</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // إذا لم تكن هناك شركات مفعلة
  if (!enabledProviders.length) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-600 border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>غير متاح</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>لا توجد شركات توصيل مفعلة</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // عرض خيارات الشحن المتاحة
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2.5 py-0.5 text-xs hover:bg-accent transition-colors rounded-full border-dashed"
            disabled={isLoading}
          >
            {isLoading && selectedProvider ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 ml-1.5" />
                <span>اختر شركة التوصيل</span>
                <ChevronDown className="h-3 w-3 mr-0.5" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56 rounded-lg border shadow-lg">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5 flex items-center gap-2">
            <Truck className="h-3.5 w-3.5" />
            شركات التوصيل المتاحة ({enabledProviders.length})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
                     {enabledProviders.map((provider) => {
             const providerInfo = SHIPPING_PROVIDERS[provider.provider_code as keyof typeof SHIPPING_PROVIDERS];
             const Icon = providerInfo?.icon || Package;
             const isCurrentlyLoading = isLoading && selectedProvider === provider.provider_code;
             
             return (
               <DropdownMenuItem
                 key={provider.provider_code}
                 onClick={() => handleSendToProvider(provider.provider_code)}
                 disabled={isLoading}
                 className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
               >
                 {isCurrentlyLoading ? (
                   <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                 ) : (
                   <Icon className={cn(
                     "h-4 w-4",
                     getColorClass(providerInfo?.color || 'gray').icon
                   )} />
                 )}
                 
                 <div className="flex-1">
                   <div className="flex items-center gap-2">
                     <span className="font-medium">{providerInfo?.name || provider.provider_name}</span>
                     {provider.auto_shipping && (
                       <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                         تلقائي
                       </span>
                     )}
                   </div>
                   {providerInfo?.nameEn && (
                     <div className="text-xs text-muted-foreground">
                       {providerInfo.nameEn}
                     </div>
                   )}
                 </div>
                 
                 {isCurrentlyLoading && (
                   <span className="text-xs text-blue-600">جاري الإرسال...</span>
                 )}
               </DropdownMenuItem>
             );
           })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ShippingProviderColumn; 