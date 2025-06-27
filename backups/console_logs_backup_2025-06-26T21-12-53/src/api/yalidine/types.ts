/**
 * أنواع وواجهات بيانات لمزود الشحن ياليدين
 */

// واجهة الولايات
export interface Province {
  id: number;
  name: string;
  zone?: number;
  is_deliverable?: number;
}

// واجهة البلديات
export interface Municipality {
  id: number;
  name: string;
  wilaya_id: number;
  wilaya_name: string;
  has_stop_desk: number;
  is_deliverable: number;
  delivery_time_parcel?: number;
  delivery_time_payment?: number;
  // حقول إضافية لدعم عرض المكاتب مع البلديات
  display_name?: string; // اسم العرض الذي يشمل معلومات إضافية
  centers?: Center[]; // قائمة المكاتب في البلدية
}

// واجهة مراكز الاستلام
export interface Center {
  center_id: number;
  name: string;
  address: string;
  gps: string;
  commune_id: number;
  commune_name: string;
  wilaya_id: number;
  wilaya_name: string;
}

// واجهة رسوم التوصيل
export interface DeliveryFee {
  from_wilaya_name: string;
  to_wilaya_name: string;
  zone: number;
  retour_fee: number;
  cod_percentage: number;
  insurance_percentage: number;
  oversize_fee: number;
  per_commune: {
    [communeId: string]: {
      commune_id: number;
      commune_name: string;
      express_home: number | null;
      express_desk: number | null;
      economic_home: number | null;
      economic_desk: number | null;
    }
  }
}

// واجهة معلومات التوصيل المرتجعة
export interface ShippingInfo {
  provinces: Province[];
  municipalities: Municipality[];
  centers: Center[];
  deliveryPrice?: number;
}

// نوع التوصيل
export type DeliveryType = 'home' | 'desk';

// واجهة بيانات اعتماد ياليدين
export interface YalidineCredentials {
  api_id: string;
  api_token: string;
}
