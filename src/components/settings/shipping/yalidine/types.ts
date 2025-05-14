import { yalidineRateLimiter } from '@/api/yalidine/rate-limiter';
import { ShippingProviderSettings } from '@/api/shippingSettingsService';

export interface YalidineSettingsType {
  is_enabled: boolean;
  api_token?: string;
  api_key?: string;
  auto_shipping: boolean;
  track_updates: boolean;
  origin_wilaya_id?: number;
}

export interface TestResultType {
  success: boolean;
  message: string;
}

export interface SyncProgressType {
  provinces: { total: number; added: number; status: 'pending' | 'syncing' | 'success' | 'failed' };
  municipalities: { total: number; added: number; status: 'pending' | 'syncing' | 'success' | 'failed' };
  centers: { total: number; added: number; status: 'pending' | 'syncing' | 'success' | 'failed' };
  fees: { total: number; added: number; status: 'pending' | 'syncing' | 'success' | 'failed' };
}

export interface RateLimiterStatsType {
  perSecond: number;
  perMinute: number;
  perHour: number;
  perDay: number;
}

export interface YalidineProviderProps {
  settings: ShippingProviderSettings | null;
  isEnabled: boolean;
  apiToken: string;
  apiKey: string;
  autoShipping: boolean;
  trackUpdates: boolean;
  originWilayaId?: number;
  setIsEnabled: (value: boolean) => void;
  setApiToken: (value: string) => void;
  setApiKey: (value: string) => void;
  setAutoShipping: (value: boolean) => void;
  setTrackUpdates: (value: boolean) => void;
  setOriginWilayaId?: (value: number) => void;
  saveSettings: (settings: Partial<ShippingProviderSettings>) => Promise<void>;
  refetch: () => void;
  currentOrganizationId?: string;
  toast: any;
}

export interface YalidineWilaya {
  id: number;
  name: string;
  zone: number;
  is_deliverable: boolean;
} 