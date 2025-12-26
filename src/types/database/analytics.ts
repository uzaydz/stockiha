import type { Json } from './base';

export type AnalyticsTables = {

      performance_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }

      beforeafter_performance_metrics: {
        Row: {
          avg_load_time_ms: number | null
          component_id: string
          created_at: string
          id: string
          landing_page_id: string
          last_accessed: string
          updated_at: string
          view_count: number
        }
        Insert: {
          avg_load_time_ms?: number | null
          component_id: string
          created_at?: string
          id?: string
          landing_page_id: string
          last_accessed?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          avg_load_time_ms?: number | null
          component_id?: string
          created_at?: string
          id?: string
          landing_page_id?: string
          last_accessed?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "beforeafter_performance_metrics_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "landing_page_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beforeafter_performance_metrics_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "mv_landing_page_forms"
            referencedColumns: ["component_id"]
          },
          {
            foreignKeyName: "beforeafter_performance_metrics_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }

      debug_logs: {
        Row: {
          details: Json | null
          error_message: string | null
          id: number
          operation: string
          organization_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          error_message?: string | null
          id?: number
          operation: string
          organization_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          error_message?: string | null
          id?: number
          operation?: string
          organization_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }

      employee_activities: {
        Row: {
          action_details: string | null
          action_type: string
          created_at: string | null
          employee_id: string
          id: string
          organization_id: string
          related_entity: string | null
          related_entity_id: string | null
        }
        Insert: {
          action_details?: string | null
          action_type: string
          created_at?: string | null
          employee_id: string
          id?: string
          organization_id: string
          related_entity?: string | null
          related_entity_id?: string | null
        }
        Update: {
          action_details?: string | null
          action_type?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          related_entity?: string | null
          related_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "employee_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }

      employee_distribution_stats: {
        Row: {
          availability_updated_at: string | null
          average_response_time_minutes: number | null
          completed_orders: number | null
          current_open_orders: number | null
          employee_id: string
          id: string
          is_available: boolean | null
          last_assignment_at: string | null
          organization_id: string
          performance_score: number | null
          rejected_orders: number | null
          stats_updated_at: string | null
          total_assigned_orders: number | null
        }
        Insert: {
          availability_updated_at?: string | null
          average_response_time_minutes?: number | null
          completed_orders?: number | null
          current_open_orders?: number | null
          employee_id: string
          id?: string
          is_available?: boolean | null
          last_assignment_at?: string | null
          organization_id: string
          performance_score?: number | null
          rejected_orders?: number | null
          stats_updated_at?: string | null
          total_assigned_orders?: number | null
        }
        Update: {
          availability_updated_at?: string | null
          average_response_time_minutes?: number | null
          completed_orders?: number | null
          current_open_orders?: number | null
          employee_id?: string
          id?: string
          is_available?: boolean | null
          last_assignment_at?: string | null
          organization_id?: string
          performance_score?: number | null
          rejected_orders?: number | null
          stats_updated_at?: string | null
          total_assigned_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_distribution_stats_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_distribution_stats_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_distribution_stats_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_distribution_stats_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_distribution_stats_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_distribution_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "employee_distribution_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_distribution_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }

      stats_refresh_log: {
        Row: {
          error_message: string | null
          id: string
          last_refresh: string
          refresh_duration: unknown | null
          status: string
          view_name: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          last_refresh?: string
          refresh_duration?: unknown | null
          status?: string
          view_name: string
        }
        Update: {
          error_message?: string | null
          id?: string
          last_refresh?: string
          refresh_duration?: unknown | null
          status?: string
          view_name?: string
        }
        Relationships: []
      }

}

// 📊 الجداول المتاحة في هذه الفئة
export const analyticsTableNames = [
  'performance_metrics',
  'beforeafter_performance_metrics',
  'debug_logs',
  'employee_activities',
  'employee_distribution_stats',
  'stats_refresh_log'
] as const;

export type AnalyticsTableName = typeof analyticsTableNames[number];
