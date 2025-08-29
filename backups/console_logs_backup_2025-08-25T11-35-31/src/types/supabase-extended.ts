// تمديد أنواع Supabase لتشمل merchant_type
import { Database } from './database.types';

// تمديد نوع organization_settings لتشمل merchant_type
export interface ExtendedOrganizationSettings extends Database['public']['Tables']['organization_settings']['Row'] {
  merchant_type?: 'traditional' | 'ecommerce' | 'both' | null;
}

export interface ExtendedOrganizationSettingsUpdate extends Database['public']['Tables']['organization_settings']['Update'] {
  merchant_type?: 'traditional' | 'ecommerce' | 'both' | null;
}

export interface ExtendedOrganizationSettingsInsert extends Database['public']['Tables']['organization_settings']['Insert'] {
  merchant_type?: 'traditional' | 'ecommerce' | 'both' | null;
}

// إعادة تصدير الأنواع الأساسية
export type { Database } from './database.types';
