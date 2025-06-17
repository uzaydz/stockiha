export interface CallCenterAgent {
  id: string;
  user_id: string;
  organization_id: string;
  assigned_regions: string[] | null;
  assigned_stores: string[] | null;
  max_daily_orders: number | null;
  is_available: boolean | null;
  is_active: boolean | null;
  last_activity: string | null;
  performance_metrics: any;
  specializations: string[] | null;
  work_schedule: any;
  created_at: string | null;
  updated_at: string | null;
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CallCenterSession {
  id: string;
  agent_id: string;
  start_time: string;
  end_time: string | null;
  session_duration: string | null;
  orders_handled: number;
  calls_made: number;
  successful_calls: number;
  failed_calls: number;
  session_notes: string | null;
  session_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CallLog {
  id: string;
  agent_id: string;
  order_id: string;
  call_start_time: string;
  call_end_time: string | null;
  call_duration: string | null;
  call_status: string;
  call_outcome: string | null;
  call_notes: string | null;
  customer_feedback: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  phone_number: string | null;
  call_attempt_number: number;
  created_at: string;
}

export interface CallConfirmationStatus {
  id: number;
  name: string;
  organization_id: string;
  color: string;
  icon: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DistributionRule {
  id: string;
  organization_id: string;
  name: string;
  rule_type: string;
  conditions: Record<string, any>;
  assigned_employees: string[];
  priority_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDistributionStats {
  id: string;
  employee_id: string;
  organization_id: string;
  total_assigned_orders: number;
  completed_orders: number;
  rejected_orders: number;
  average_response_time_minutes: number;
  performance_score: number;
  last_assignment_at: string | null;
  current_open_orders: number;
  is_available: boolean;
  availability_updated_at: string;
  stats_updated_at: string;
}

export interface OrderDistributionHistory {
  id: string;
  order_id: string;
  organization_id: string;
  assigned_employee_id: string | null;
  distribution_plan_type: string;
  distribution_reason: string | null;
  assignment_timestamp: string;
  status: string;
  response_time_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderDistributionSettings {
  id: string;
  organization_id: string;
  active_plan_id: string;
  active_plan_type: string;
  settings: {
    auto_assignment_enabled?: boolean;
    max_orders_per_agent_per_day?: number;
    reassignment_after_hours?: number;
    priority_order_threshold?: number;
    working_hours?: {
      start: string;
      end: string;
    };
    weekend_assignment?: boolean;
    performance_weight?: number;
    workload_weight?: number;
    region_weight?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface OrganizationApp {
  id: string;
  organization_id: string;
  app_id: string;
  is_enabled: boolean;
  installed_at: string;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Extended interfaces for UI components
export interface AgentWithUser extends CallCenterAgent {
  users: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface CallLogWithDetails extends CallLog {
  agent: {
    id: string;
    user: {
      name: string;
    };
  };
  order: {
    id: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number;
  };
}

export interface ActiveAgent {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  current_call: {
    order_id: string;
    customer_name: string;
    start_time: Date;
    duration: number;
  } | null;
  today_stats: {
    calls_made: number;
    orders_completed: number;
    success_rate: number;
  };
  last_activity: Date;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  is_read: boolean;
}

export interface LiveStats {
  active_agents: number;
  total_agents: number;
  ongoing_calls: number;
  pending_orders: number;
  avg_response_time: number;
  success_rate: number;
}

export interface PerformanceData {
  date: string;
  calls_made: number;
  orders_completed: number;
  success_rate: number;
}

export interface AgentStats {
  id: string;
  name: string;
  calls_made: number;
  orders_completed: number;
  success_rate: number;
  avg_call_duration: number;
  customer_satisfaction: number;
}

// Database table types for Supabase
export interface Database {
  public: {
    Tables: {
      call_center_agents: {
        Row: CallCenterAgent;
        Insert: Omit<CallCenterAgent, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CallCenterAgent, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      call_center_sessions: {
        Row: CallCenterSession;
        Insert: Omit<CallCenterSession, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CallCenterSession, 'id' | 'created_at'>>;
      };
      call_logs: {
        Row: CallLog;
        Insert: Omit<CallLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CallLog, 'id' | 'created_at'>>;
      };
      call_confirmation_statuses: {
        Row: CallConfirmationStatus;
        Insert: Omit<CallConfirmationStatus, 'id' | 'created_at' | 'updated_at'> & {
          id?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CallConfirmationStatus, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      distribution_rules: {
        Row: DistributionRule;
        Insert: Omit<DistributionRule, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DistributionRule, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      employee_distribution_stats: {
        Row: EmployeeDistributionStats;
        Insert: Omit<EmployeeDistributionStats, 'id' | 'availability_updated_at' | 'stats_updated_at'> & {
          id?: string;
          availability_updated_at?: string;
          stats_updated_at?: string;
        };
        Update: Partial<Omit<EmployeeDistributionStats, 'id'>> & {
          availability_updated_at?: string;
          stats_updated_at?: string;
        };
      };
      order_distribution_history: {
        Row: OrderDistributionHistory;
        Insert: Omit<OrderDistributionHistory, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrderDistributionHistory, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      order_distribution_settings: {
        Row: OrderDistributionSettings;
        Insert: Omit<OrderDistributionSettings, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrderDistributionSettings, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      organization_apps: {
        Row: OrganizationApp;
        Insert: Omit<OrganizationApp, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizationApp, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
    };
  };
}

// Hook return types
export interface UseCallCenterAgentsReturn {
  agents: AgentWithUser[];
  loading: boolean;
  error: string | null;
  createAgent: (agent: Omit<CallCenterAgent, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateAgent: (id: string, updates: Partial<CallCenterAgent>) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
}

export interface UseCallLogsReturn {
  callLogs: CallLogWithDetails[];
  loading: boolean;
  error: string | null;
  createCallLog: (callLog: Omit<CallLog, 'id' | 'created_at'>) => Promise<boolean>;
  updateCallLog: (id: string, updates: Partial<CallLog>) => Promise<boolean>;
  refreshCallLogs: () => Promise<void>;
}

export interface UseDistributionSettingsReturn {
  settings: OrderDistributionSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<OrderDistributionSettings['settings']>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Filter and search types
export interface AgentFilters {
  status?: 'online' | 'busy' | 'away' | 'offline';
  region?: string;
  specialization?: string;
  availability?: boolean;
}

export interface CallLogFilters {
  agent_id?: string;
  status?: string;
  outcome?: string;
  date_from?: string;
  date_to?: string;
}

export interface PerformanceFilters {
  agent_id?: string;
  date_from?: string;
  date_to?: string;
  metric?: 'calls' | 'orders' | 'satisfaction';
} 