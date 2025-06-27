export interface GameCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  platform: string;
  size_gb?: number;
  requirements?: any;
  images?: string[];
  price: number;
  is_featured: boolean;
  category?: GameCategory;
}

export interface StoreSettings {
  business_name?: string;
  business_logo?: string;
  welcome_message?: string;
  terms_conditions?: string;
  contact_info?: any;
  social_links?: any;
  working_hours?: any;
  is_active?: boolean;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_mode?: 'light' | 'dark' | 'auto';
  custom_css?: string;
}

export interface GameOrder {
  tracking_number: string;
  status: string;
  game_name?: string;
  created_at: string;
  status_history?: any[];
}

export interface CartItem {
  game: Game;
  quantity: number;
}

export interface PublicGameStoreProps {
  organizationId: string;
}

export const platforms = [
  { value: 'PC', label: 'كمبيوتر شخصي', icon: 'Monitor' },
  { value: 'PlayStation', label: 'بلايستيشن', icon: 'Gamepad2' },
  { value: 'Xbox', label: 'إكس بوكس', icon: 'Gamepad2' },
  { value: 'Mobile', label: 'موبايل', icon: 'Phone' },
];

export const statusInfo = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-500', icon: 'Clock' },
  processing: { label: 'قيد المعالجة', color: 'bg-blue-500', icon: 'Package' },
  ready: { label: 'جاهز للتسليم', color: 'bg-purple-500', icon: 'CheckCircle' },
  delivered: { label: 'تم التسليم', color: 'bg-green-500', icon: 'Truck' },
  cancelled: { label: 'ملغي', color: 'bg-red-500', icon: 'XCircle' },
};
