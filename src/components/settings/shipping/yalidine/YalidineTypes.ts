/**
 * أنواع البيانات المشتركة لمكونات ياليدين
 */

// أنواع حالة المزامنة
export type SyncStatusType = "pending" | "syncing" | "success" | "failed" | "canceled";

export type SyncStatusItem = {
  total: number;
  added: number;
  status: SyncStatusType;
};

export type SyncStatus = {
  provinces: SyncStatusItem;
  municipalities: SyncStatusItem;
  centers: SyncStatusItem;
  fees: SyncStatusItem;
};

// نوع خصائص مزود ياليدين
export interface YalidineProviderProps {
  isEnabled: boolean;
  apiToken?: string;
  apiKey?: string;
  originWilayaId?: string | number;
  currentOrganizationId?: string;
  toast: any;
}

// نوع حالة جداول ياليدين
export interface YalidineTableStatus {
  yalidine_fees: number;
  yalidine_fees_new: number;
  trigger_status: string;
  fk_constraint: string;
}

// نوع بيانات الولاية
export interface Province {
  id: number;
  name: string;
  zone?: number;
  is_deliverable?: boolean;
}
