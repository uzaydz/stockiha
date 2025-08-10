import { 
  Truck, 
  Package, 
  Plane,
  MapPin,
  Clock,
} from "lucide-react";

// دالة مساعدة للحصول على ألوان CSS
export const getColorClass = (color: string) => {
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

// تعريف شركات التوصيل مع معلوماتها
export const SHIPPING_PROVIDERS = {
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
    color: 'orange',
    icon: Clock,
    trackingField: 'e48hr_tracking_id'
  },
  fretdirect: {
    code: 'fretdirect',
    name: 'فريت دايركت',
    nameEn: 'Fretdirect',
    color: 'green',
    icon: Truck,
    trackingField: 'fretdirect_tracking_id'
  },
  golivri: {
    code: 'golivri',
    name: 'غوليفري',
    nameEn: 'Golivri',
    color: 'purple',
    icon: Package,
    trackingField: 'golivri_tracking_id'
  },
  mono_hub: {
    code: 'mono_hub',
    name: 'مونو هاب',
    nameEn: 'Mono Hub',
    color: 'gray',
    icon: MapPin,
    trackingField: 'mono_hub_tracking_id'
  },
  msm_go: {
    code: 'msm_go',
    name: 'إم إس إم غو',
    nameEn: 'MSM Go',
    color: 'red',
    icon: Truck,
    trackingField: 'msm_go_tracking_id'
  },
  imir_express: {
    code: 'imir_express',
    name: 'إمير إكسبرس',
    nameEn: 'Imir Express',
    color: 'blue',
    icon: Package,
    trackingField: 'imir_express_tracking_id'
  },
  packers: {
    code: 'packers',
    name: 'باكرز',
    nameEn: 'Packers',
    color: 'amber',
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

// أنواع البيانات
export interface ShippingOrder {
  id: string;
  status: string;
  yalidine_tracking_id?: string | null;
  zrexpress_tracking_id?: string | null;
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
}

export interface EnabledProvider {
  provider_id: number | null;
  provider_code: string;
  provider_name: string;
  is_enabled: boolean;
  auto_shipping?: boolean;
}

export interface ActiveProvider {
  code: string;
  trackingId: string;
  providerName?: string;
}

export type ShippingProviderCode = keyof typeof SHIPPING_PROVIDERS;
