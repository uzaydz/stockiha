import type { Json } from './base';

export type SubscriptionsTables = {

      subscription_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          features: Json | null
          id: string
          is_active: boolean
          is_popular: boolean
          limits: Json
          monthly_price: number
          name: string
          trial_period_days: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          limits?: Json
          monthly_price: number
          name: string
          trial_period_days?: number
          updated_at?: string
          yearly_price: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          limits?: Json
          monthly_price?: number
          name?: string
          trial_period_days?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }

      subscription_services: {
        Row: {
          id: string
          organization_id: string
          category_id: string | null
          name: string
          description: string | null
          provider: string
          service_type: string | null
          supported_countries: Json | null
          available_durations: Json | null
          credentials_encrypted: string | null
          delivery_method: string
          status: string
          purchase_price: number
          selling_price: number
          profit_margin: number | null
          profit_amount: number | null
          expires_at: string | null
          total_quantity: number | null
          available_quantity: number | null
          sold_quantity: number | null
          reserved_quantity: number | null
          is_featured: boolean | null
          is_active: boolean | null
          logo_url: string | null
          terms_conditions: string | null
          usage_instructions: string | null
          support_contact: string | null
          renewal_policy: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          category_id?: string | null
          name: string
          description?: string | null
          provider: string
          service_type?: string | null
          supported_countries?: Json | null
          available_durations?: Json | null
          credentials_encrypted?: string | null
          delivery_method?: string
          status?: string
          purchase_price?: number
          selling_price?: number
          profit_margin?: number | null
          profit_amount?: number | null
          expires_at?: string | null
          total_quantity?: number | null
          available_quantity?: number | null
          sold_quantity?: number | null
          reserved_quantity?: number | null
          is_featured?: boolean | null
          is_active?: boolean | null
          logo_url?: string | null
          terms_conditions?: string | null
          usage_instructions?: string | null
          support_contact?: string | null
          renewal_policy?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          provider?: string
          service_type?: string | null
          supported_countries?: Json | null
          available_durations?: Json | null
          credentials_encrypted?: string | null
          delivery_method?: string
          status?: string
          purchase_price?: number
          selling_price?: number
          profit_margin?: number | null
          profit_amount?: number | null
          expires_at?: string | null
          total_quantity?: number | null
          available_quantity?: number | null
          sold_quantity?: number | null
          reserved_quantity?: number | null
          is_featured?: boolean | null
          is_active?: boolean | null
          logo_url?: string | null
          terms_conditions?: string | null
          usage_instructions?: string | null
          support_contact?: string | null
          renewal_policy?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }

      subscription_settings: {
        Row: {
          created_at: string
          currency: string
          grace_period_days: number
          id: string
          payment_methods: Json | null
          reminder_days: number[] | null
          tax_rate: number | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          grace_period_days?: number
          id?: string
          payment_methods?: Json | null
          reminder_days?: number[] | null
          tax_rate?: number | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          grace_period_days?: number
          id?: string
          payment_methods?: Json | null
          reminder_days?: number[] | null
          tax_rate?: number | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }

      subscription_history: {
        Row: {
          action: string
          amount: number | null
          created_at: string
          created_by: string | null
          from_plan_id: string | null
          from_status: string | null
          id: string
          notes: string | null
          organization_id: string
          plan_id: string
          to_status: string
        }
        Insert: {
          action: string
          amount?: number | null
          created_at?: string
          created_by?: string | null
          from_plan_id?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          plan_id: string
          to_status: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string
          created_by?: string | null
          from_plan_id?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscription_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscription_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }

      organization_subscriptions: {
        Row: {
          amount_paid: number
          billing_cycle: string
          created_at: string
          currency: string
          end_date: string
          id: string
          is_auto_renew: boolean
          organization_id: string
          payment_method: string | null
          payment_reference: string | null
          plan_id: string
          start_date: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          amount_paid: number
          billing_cycle: string
          created_at?: string
          currency?: string
          end_date: string
          id?: string
          is_auto_renew?: boolean
          organization_id: string
          payment_method?: string | null
          payment_reference?: string | null
          plan_id: string
          start_date?: string
          status: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          end_date?: string
          id?: string
          is_auto_renew?: boolean
          organization_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }

      activation_codes: {
        Row: {
          batch_id: string | null
          billing_cycle: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          plan_id: string
          status: string
          subscription_id: string | null
          updated_at: string
          used_at: string | null
        }
        Insert: {
          batch_id?: string | null
          billing_cycle?: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          plan_id: string
          status: string
          subscription_id?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          batch_id?: string | null
          billing_cycle?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          plan_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "activation_code_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_codes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "activation_code_statistics"
            referencedColumns: ["batch_id"]
          },
          {
            foreignKeyName: "activation_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "activation_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "activation_codes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_codes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }

      activation_code_batches: {
        Row: {
          billing_cycle: string
          count: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          name: string
          notes: string | null
          plan_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          count: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          name: string
          notes?: string | null
          plan_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          count?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_code_batches_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }

}

// 📊 الجداول المتاحة في هذه الفئة
export const subscriptionsTableNames = [
  'subscription_plans',
  'subscription_services',
  'subscription_settings',
  'subscription_history',
  'organization_subscriptions',
  'activation_codes',
  'activation_code_batches'
] as const;

export type SubscriptionsTableName = typeof subscriptionsTableNames[number];
