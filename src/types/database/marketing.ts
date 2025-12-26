import type { Json } from './base';

export type MarketingTables = {

      landing_pages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_deleted: boolean
          is_published: boolean
          keywords: string | null
          name: string
          organization_id: string
          slug: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          is_published?: boolean
          keywords?: string | null
          name: string
          organization_id: string
          slug: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          is_published?: boolean
          keywords?: string | null
          name?: string
          organization_id?: string
          slug?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "landing_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }

      landing_page_components: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          landing_page_id: string
          position: number
          settings: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          landing_page_id: string
          position?: number
          settings?: Json
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          landing_page_id?: string
          position?: number
          settings?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_components_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }

      landing_page_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string | null
          id: string
          is_processed: boolean
          landing_page_id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id?: string | null
          id?: string
          is_processed?: boolean
          landing_page_id: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string | null
          id?: string
          is_processed?: boolean
          landing_page_id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_submissions_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "landing_page_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }

      conversion_events: {
        Row: {
          custom_data: Json | null
          error_message: string | null
          event_id: string | null
          event_type: string
          id: number
          last_retry_at: string | null
          order_id: string | null
          platform: string
          product_id: string
          retry_count: number | null
          sent_at: string | null
          status: string | null
          timestamp: string | null
          user_data: Json | null
        }
        Insert: {
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: number
          last_retry_at?: string | null
          order_id?: string | null
          platform: string
          product_id: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          timestamp?: string | null
          user_data?: Json | null
        }
        Update: {
          custom_data?: Json | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: number
          last_retry_at?: string | null
          order_id?: string | null
          platform?: string
          product_id?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          timestamp?: string | null
          user_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "organization_order_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "conversion_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders_with_items_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "conversion_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }

      conversion_event_queue: {
        Row: {
          event_data: Json
          id: number
          processed_at: string | null
          scheduled_at: string | null
          status: string | null
        }
        Insert: {
          event_data: Json
          id?: number
          processed_at?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Update: {
          event_data?: Json
          id?: number
          processed_at?: string | null
          scheduled_at?: string | null
          status?: string | null
        }
        Relationships: []
      }

      conversion_settings_cache: {
        Row: {
          last_updated: string | null
          product_id: string
          settings: Json
        }
        Insert: {
          last_updated?: string | null
          product_id: string
          settings: Json
        }
        Update: {
          last_updated?: string | null
          product_id?: string
          settings?: Json
        }
        Relationships: []
      }

      custom_pages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          meta_description: string | null
          organization_id: string
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          organization_id: string
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          organization_id?: string
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custom_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }

      form_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          fields: Json
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          product_ids: Json | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          product_ids?: Json | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          product_ids?: Json | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "form_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "form_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }

      thank_you_templates: {
        Row: {
          applies_to: string
          color_scheme: string
          content: Json
          created_at: string
          custom_colors: Json | null
          id: string
          is_active: boolean
          is_default: boolean
          layout_type: string
          name: string
          organization_id: string
          product_ids: string[] | null
          updated_at: string
        }
        Insert: {
          applies_to: string
          color_scheme: string
          content: Json
          created_at?: string
          custom_colors?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout_type: string
          name: string
          organization_id: string
          product_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          color_scheme?: string
          content?: Json
          created_at?: string
          custom_colors?: Json | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout_type?: string
          name?: string
          organization_id?: string
          product_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thank_you_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "thank_you_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thank_you_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }

}

// 📊 الجداول المتاحة في هذه الفئة
export const marketingTableNames = [
  'landing_pages',
  'landing_page_components',
  'landing_page_submissions',
  'conversion_events',
  'conversion_event_queue',
  'conversion_settings_cache',
  'custom_pages',
  'form_settings',
  'thank_you_templates'
] as const;

export type MarketingTableName = typeof marketingTableNames[number];
