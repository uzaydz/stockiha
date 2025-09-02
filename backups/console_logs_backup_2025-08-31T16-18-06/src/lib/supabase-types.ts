import { SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/call-center.types';

// تصدير عميل Supabase مع الأنواع المحلية
export type SupabaseClient = BaseSupabaseClient<Database>;

// أنواع محلية للتطوير
export interface CallCenterAgentInsert {
  user_id: string;
  organization_id: string;
  assigned_regions?: string[];
  assigned_stores?: string[];
  max_daily_orders?: number;
  is_available?: boolean;
  is_active?: boolean;
  last_activity?: string;
  performance_metrics?: any;
  specializations?: string[];
  work_schedule?: any;
}

export interface CallCenterAgentRow {
  id: string;
  user_id: string;
  organization_id: string;
  assigned_regions: string[];
  assigned_stores: string[];
  max_daily_orders: number;
  is_available: boolean;
  is_active: boolean;
  last_activity: string;
  performance_metrics: any;
  specializations: string[];
  work_schedule: any;
  created_at: string;
  updated_at: string;
}
