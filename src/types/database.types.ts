export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _rls_backup: {
        Row: {
          definition: string | null
          disabled_at: string | null
          policy_name: string | null
          table_name: string | null
        }
        Insert: {
          definition?: string | null
          disabled_at?: string | null
          policy_name?: string | null
          table_name?: string | null
        }
        Update: {
          definition?: string | null
          disabled_at?: string | null
          policy_name?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      abandoned_cart_reminders: {
        Row: {
          abandoned_cart_id: string
          channel: string | null
          id: string
          message: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
        }
        Insert: {
          abandoned_cart_id: string
          channel?: string | null
          id?: string
          message?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Update: {
          abandoned_cart_id?: string
          channel?: string | null
          id?: string
          message?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_cart_reminders_abandoned_cart_id_fkey"
            columns: ["abandoned_cart_id"]
            isOneToOne: false
            referencedRelation: "abandoned_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_cart_reminders_abandoned_cart_id_fkey"
            columns: ["abandoned_cart_id"]
            isOneToOne: false
            referencedRelation: "abandoned_carts_view"
            referencedColumns: ["id"]
          },
        ]
      }
      abandoned_carts: {
        Row: {
          address: string | null
          calculated_delivery_fee: number | null
          cart_items: Json | null
          created_at: string | null
          custom_fields_data: Json | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string
          delivery_option: string | null
          discount_amount: number | null
          id: string
          last_activity_at: string | null
          municipality: string | null
          notes: string | null
          organization_id: string
          payment_method: string | null
          product_color_id: string | null
          product_id: string | null
          product_size_id: string | null
          province: string | null
          quantity: number | null
          recovered_at: string | null
          recovered_by: string | null
          recovered_order_id: string | null
          source: string | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          calculated_delivery_fee?: number | null
          cart_items?: Json | null
          created_at?: string | null
          custom_fields_data?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone: string
          delivery_option?: string | null
          discount_amount?: number | null
          id?: string
          last_activity_at?: string | null
          municipality?: string | null
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          product_color_id?: string | null
          product_id?: string | null
          product_size_id?: string | null
          province?: string | null
          quantity?: number | null
          recovered_at?: string | null
          recovered_by?: string | null
          recovered_order_id?: string | null
          source?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          calculated_delivery_fee?: number | null
          cart_items?: Json | null
          created_at?: string | null
          custom_fields_data?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string
          delivery_option?: string | null
          discount_amount?: number | null
          id?: string
          last_activity_at?: string | null
          municipality?: string | null
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          product_color_id?: string | null
          product_id?: string | null
          product_size_id?: string | null
          province?: string | null
          quantity?: number | null
          recovered_at?: string | null
          recovered_by?: string | null
          recovered_order_id?: string | null
          source?: string | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "abandoned_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      abandoned_carts_stats: {
        Row: {
          avg_value: number
          conversion_rate: number
          created_at: string
          id: string
          month_count: number
          organization_id: string
          recovery_rate: number
          today_count: number
          total_count: number
          total_value: number
          updated_at: string
          week_count: number
        }
        Insert: {
          avg_value?: number
          conversion_rate?: number
          created_at?: string
          id?: string
          month_count?: number
          organization_id: string
          recovery_rate?: number
          today_count?: number
          total_count?: number
          total_value?: number
          updated_at?: string
          week_count?: number
        }
        Update: {
          avg_value?: number
          conversion_rate?: number
          created_at?: string
          id?: string
          month_count?: number
          organization_id?: string
          recovery_rate?: number
          today_count?: number
          total_count?: number
          total_value?: number
          updated_at?: string
          week_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "abandoned_carts_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
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
      addresses: {
        Row: {
          city: string
          country: string
          customer_id: string | null
          id: string
          is_default: boolean
          municipality: string | null
          name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          state: string
          street_address: string
          user_id: string | null
        }
        Insert: {
          city: string
          country: string
          customer_id?: string | null
          id?: string
          is_default?: boolean
          municipality?: string | null
          name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          state: string
          street_address: string
          user_id?: string | null
        }
        Update: {
          city?: string
          country?: string
          customer_id?: string | null
          id?: string
          is_default?: boolean
          municipality?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string
          street_address?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      beforeafter_images: {
        Row: {
          component_id: string
          created_at: string
          id: string
          image_type: string
          image_url: string
          item_id: string
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          image_type: string
          image_url: string
          item_id: string
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          image_type?: string
          image_url?: string
          item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beforeafter_images_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "landing_page_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beforeafter_images_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "mv_landing_page_forms"
            referencedColumns: ["component_id"]
          },
        ]
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
      call_confirmation_statuses: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: number
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: number
          is_default?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: number
          is_default?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_confirmation_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "call_confirmation_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_confirmation_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
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
      course_attachments: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string
          order_index: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id: string
          order_index?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string
          order_index?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          order_index: number | null
          section_id: string
          slug: string
          title: string
          updated_at: string | null
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          order_index?: number | null
          section_id: string
          slug: string
          title: string
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          order_index?: number | null
          section_id?: string
          slug?: string
          title?: string
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lesson_id: string
          timestamp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lesson_id: string
          timestamp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lesson_id?: string
          timestamp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quizzes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          lesson_id: string
          order_index: number | null
          passing_score: number | null
          questions: Json
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lesson_id: string
          order_index?: number | null
          passing_score?: number | null
          questions: Json
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          lesson_id?: string
          order_index?: number | null
          passing_score?: number | null
          questions?: Json
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      currency_balances: {
        Row: {
          balance: number
          created_at: string | null
          currency_id: string
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency_id: string
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency_id?: string
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "currency_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "digital_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "currency_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      currency_sales: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency_id: string
          customer_details: Json | null
          dinar_amount: number
          id: string
          notes: string | null
          organization_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency_id: string
          customer_details?: Json | null
          dinar_amount: number
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency_id?: string
          customer_details?: Json | null
          dinar_amount?: number
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "currency_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "currency_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_sales_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "digital_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "currency_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
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
      customer_testimonials: {
        Row: {
          comment: string
          created_at: string
          customer_avatar: string | null
          customer_name: string
          id: string
          is_active: boolean
          organization_id: string
          product_image: string | null
          product_name: string | null
          purchase_date: string | null
          rating: number
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          comment: string
          created_at?: string
          customer_avatar?: string | null
          customer_name: string
          id?: string
          is_active?: boolean
          organization_id: string
          product_image?: string | null
          product_name?: string | null
          purchase_date?: string | null
          rating: number
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          comment?: string
          created_at?: string
          customer_avatar?: string | null
          customer_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          product_image?: string | null
          product_name?: string | null
          purchase_date?: string | null
          rating?: number
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
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
      deleted_files: {
        Row: {
          deleted_at: string
          file_path: string
          id: string
          processed: boolean
        }
        Insert: {
          deleted_at?: string
          file_path: string
          id?: string
          processed?: boolean
        }
        Update: {
          deleted_at?: string
          file_path?: string
          id?: string
          processed?: boolean
        }
        Relationships: []
      }
      digital_currencies: {
        Row: {
          code: string
          created_at: string | null
          exchange_rate: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          exchange_rate?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          exchange_rate?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_currencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "digital_currencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_currencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      distribution_rules: {
        Row: {
          assigned_employees: string[] | null
          conditions: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          priority_order: number | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          assigned_employees?: string[] | null
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          priority_order?: number | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          assigned_employees?: string[] | null
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          priority_order?: number | null
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "distribution_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      domain_verifications: {
        Row: {
          created_at: string | null
          domain: string
          error_message: string | null
          id: string
          organization_id: string
          status: string
          updated_at: string | null
          verification_code: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          error_message?: string | null
          id?: string
          organization_id: string
          status?: string
          updated_at?: string | null
          verification_code?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string | null
          verification_code?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "domain_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
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
      employee_salaries: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: string
          end_date: string | null
          id: string
          notes: string | null
          organization_id: string
          start_date: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          start_date: string
          status: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          start_date?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "employee_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean | null
          organization_id: string
          payment_method: string
          receipt_url: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          is_recurring?: boolean | null
          organization_id: string
          payment_method: string
          receipt_url?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean | null
          organization_id?: string
          payment_method?: string
          receipt_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      flexi_balances: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          network_id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          network_id: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          network_id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flexi_balances_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "flexi_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "flexi_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      flexi_networks: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flexi_networks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "flexi_networks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_networks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      flexi_sales: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          network_id: string
          notes: string | null
          organization_id: string
          phone_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          network_id: string
          notes?: string | null
          organization_id: string
          phone_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          network_id?: string
          notes?: string | null
          organization_id?: string
          phone_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flexi_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flexi_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_sales_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "flexi_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "flexi_sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flexi_sales_organization_id_fkey"
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
      global_yalidine_configuration: {
        Row: {
          created_at: string | null
          id: number
          last_global_centers_sync: string | null
          last_global_municipalities_sync: string | null
          last_global_provinces_sync: string | null
          updated_at: string | null
          yalidine_api_key: string | null
          yalidine_api_token: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_global_centers_sync?: string | null
          last_global_municipalities_sync?: string | null
          last_global_provinces_sync?: string | null
          updated_at?: string | null
          yalidine_api_key?: string | null
          yalidine_api_token?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_global_centers_sync?: string | null
          last_global_municipalities_sync?: string | null
          last_global_provinces_sync?: string | null
          updated_at?: string | null
          yalidine_api_key?: string | null
          yalidine_api_token?: string | null
        }
        Relationships: []
      }
      guest_customers: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      inventory_log: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          new_stock: number
          notes: string | null
          order_id: string | null
          organization_id: string
          previous_stock: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_stock: number
          notes?: string | null
          order_id?: string | null
          organization_id: string
          previous_stock: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_stock?: number
          notes?: string | null
          order_id?: string | null
          organization_id?: string
          previous_stock?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "inventory_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          new_stock: number
          notes: string | null
          organization_id: string | null
          previous_stock: number
          product_id: string
          product_name: string | null
          quantity: number
          reference_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          new_stock: number
          notes?: string | null
          organization_id?: string | null
          previous_stock: number
          product_id: string
          product_name?: string | null
          quantity: number
          reference_id?: string | null
          type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          new_stock?: number
          notes?: string | null
          organization_id?: string | null
          previous_stock?: number
          product_id?: string
          product_name?: string | null
          quantity?: number
          reference_id?: string | null
          type?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string
          source_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reason: string
          source_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string
          source_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string
          name: string
          product_id: string | null
          quantity: number
          service_id: string | null
          total_price: number
          type: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id: string
          name: string
          product_id?: string | null
          quantity: number
          service_id?: string | null
          total_price: number
          type: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string
          name?: string
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          total_price?: number
          type?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          customer_id: string | null
          customer_info: Json | null
          customer_name: string | null
          discount_amount: number
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          organization_id: string
          organization_info: Json | null
          payment_method: string
          payment_status: string
          shipping_amount: number | null
          source_id: string | null
          source_type: string
          status: string
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          customer_info?: Json | null
          customer_name?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          organization_id: string
          organization_info?: Json | null
          payment_method: string
          payment_status: string
          shipping_amount?: number | null
          source_id?: string | null
          source_type: string
          status: string
          subtotal_amount: number
          tax_amount?: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          customer_info?: Json | null
          customer_name?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          organization_info?: Json | null
          payment_method?: string
          payment_status?: string
          shipping_amount?: number | null
          source_id?: string | null
          source_type?: string
          status?: string
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
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
      lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      migrations_log: {
        Row: {
          applied_at: string | null
          details: string | null
          id: number
          migration_name: string
          status: string
        }
        Insert: {
          applied_at?: string | null
          details?: string | null
          id?: number
          migration_name: string
          status: string
        }
        Update: {
          applied_at?: string | null
          details?: string | null
          id?: number
          migration_name?: string
          status?: string
        }
        Relationships: []
      }
      online_order_items: {
        Row: {
          color_id: string | null
          color_name: string | null
          created_at: string | null
          id: string
          is_digital: boolean
          name: string
          order_id: string
          organization_id: string
          product_id: string
          product_name: string
          quantity: number
          selected_price: number | null
          size_id: string | null
          size_name: string | null
          slug: string
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          color_id?: string | null
          color_name?: string | null
          created_at?: string | null
          id?: string
          is_digital?: boolean
          name: string
          order_id: string
          organization_id: string
          product_id: string
          product_name: string
          quantity: number
          selected_price?: number | null
          size_id?: string | null
          size_name?: string | null
          slug: string
          total_price: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          color_id?: string | null
          color_name?: string | null
          created_at?: string | null
          id?: string
          is_digital?: boolean
          name?: string
          order_id?: string
          organization_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          selected_price?: number | null
          size_id?: string | null
          size_name?: string | null
          slug?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_color_id"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_size_id"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "online_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      online_orders: {
        Row: {
          call_confirmation_notes: string | null
          call_confirmation_status_id: number | null
          call_confirmation_updated_at: string | null
          call_confirmation_updated_by: string | null
          created_at: string | null
          created_from: string | null
          customer_id: string | null
          customer_order_number: number | null
          discount: number | null
          employee_id: string | null
          form_data: Json | null
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          payment_method: string
          payment_status: string
          shipping_address_id: string | null
          shipping_cost: number | null
          shipping_method: string | null
          shipping_option: string | null
          slug: string | null
          status: string
          stop_desk_id: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
          zrexpress_tracking_id: string | null
        }
        Insert: {
          call_confirmation_notes?: string | null
          call_confirmation_status_id?: number | null
          call_confirmation_updated_at?: string | null
          call_confirmation_updated_by?: string | null
          created_at?: string | null
          created_from?: string | null
          customer_id?: string | null
          customer_order_number?: number | null
          discount?: number | null
          employee_id?: string | null
          form_data?: Json | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          payment_method: string
          payment_status: string
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_option?: string | null
          slug?: string | null
          status: string
          stop_desk_id?: string | null
          subtotal: number
          tax: number
          total: number
          updated_at?: string | null
          zrexpress_tracking_id?: string | null
        }
        Update: {
          call_confirmation_notes?: string | null
          call_confirmation_status_id?: number | null
          call_confirmation_updated_at?: string | null
          call_confirmation_updated_by?: string | null
          created_at?: string | null
          created_from?: string | null
          customer_id?: string | null
          customer_order_number?: number | null
          discount?: number | null
          employee_id?: string | null
          form_data?: Json | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          payment_method?: string
          payment_status?: string
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_option?: string | null
          slug?: string | null
          status?: string
          stop_desk_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
          zrexpress_tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_call_confirmation_status_id_fkey"
            columns: ["call_confirmation_status_id"]
            isOneToOne: false
            referencedRelation: "call_confirmation_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cancellations: {
        Row: {
          cancellation_reason: string
          cancelled_amount: number
          cancelled_by: string | null
          cancelled_items_count: number
          created_at: string
          id: string
          inventory_restored: boolean
          is_partial_cancellation: boolean
          order_id: string
          organization_id: string
          total_items_count: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string
          cancelled_amount?: number
          cancelled_by?: string | null
          cancelled_items_count?: number
          created_at?: string
          id?: string
          inventory_restored?: boolean
          is_partial_cancellation?: boolean
          order_id: string
          organization_id: string
          total_items_count?: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string
          cancelled_amount?: number
          cancelled_by?: string | null
          cancelled_items_count?: number
          created_at?: string
          id?: string
          inventory_restored?: boolean
          is_partial_cancellation?: boolean
          order_id?: string
          organization_id?: string
          total_items_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "organization_order_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders_with_items_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "order_cancellations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      order_distribution_history: {
        Row: {
          assigned_employee_id: string | null
          assignment_timestamp: string | null
          created_at: string | null
          distribution_plan_type: string
          distribution_reason: string | null
          id: string
          order_id: string
          organization_id: string
          response_time_minutes: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_employee_id?: string | null
          assignment_timestamp?: string | null
          created_at?: string | null
          distribution_plan_type: string
          distribution_reason?: string | null
          id?: string
          order_id: string
          organization_id: string
          response_time_minutes?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_employee_id?: string | null
          assignment_timestamp?: string | null
          created_at?: string | null
          distribution_plan_type?: string
          distribution_reason?: string | null
          id?: string
          order_id?: string
          organization_id?: string
          response_time_minutes?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_distribution_history_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_distribution_history_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "online_orders_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "order_distribution_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      order_distribution_settings: {
        Row: {
          active_plan_id: string
          active_plan_type: string
          created_at: string | null
          id: string
          organization_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          active_plan_id: string
          active_plan_type: string
          created_at?: string | null
          id?: string
          organization_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          active_plan_id?: string
          active_plan_type?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_distribution_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "order_distribution_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_distribution_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          is_digital: boolean | null
          is_wholesale: boolean | null
          name: string
          order_id: string
          organization_id: string
          original_price: number | null
          product_id: string
          product_name: string | null
          quantity: number
          slug: string
          total_price: number
          unit_price: number
          variant_info: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_digital?: boolean | null
          is_wholesale?: boolean | null
          name: string
          order_id: string
          organization_id: string
          original_price?: number | null
          product_id: string
          product_name?: string | null
          quantity: number
          slug: string
          total_price: number
          unit_price: number
          variant_info?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_digital?: boolean | null
          is_wholesale?: boolean | null
          name?: string
          order_id?: string
          organization_id?: string
          original_price?: number | null
          product_id?: string
          product_name?: string | null
          quantity?: number
          slug?: string
          total_price?: number
          unit_price?: number
          variant_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "organization_order_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders_with_items_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          amount_paid: number | null
          completed_at: string | null
          consider_remaining_as_partial: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          customer_order_number: number | null
          discount: number | null
          employee_id: string | null
          id: string
          is_online: boolean
          metadata: Json | null
          notes: string | null
          organization_id: string
          payment_method: string
          payment_status: string
          pos_order_type: string | null
          remaining_amount: number | null
          shipping_address_id: string | null
          shipping_cost: number | null
          shipping_method: string | null
          slug: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_paid?: number | null
          completed_at?: string | null
          consider_remaining_as_partial?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_order_number?: number | null
          discount?: number | null
          employee_id?: string | null
          id?: string
          is_online: boolean
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          payment_method: string
          payment_status: string
          pos_order_type?: string | null
          remaining_amount?: number | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          slug?: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number | null
          completed_at?: string | null
          consider_remaining_as_partial?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_order_number?: number | null
          discount?: number | null
          employee_id?: string | null
          id?: string
          is_online?: boolean
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          payment_method?: string
          payment_status?: string
          pos_order_type?: string | null
          remaining_amount?: number | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          slug?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_conversion_settings: {
        Row: {
          created_at: string | null
          default_currency_code: string | null
          enable_enhanced_conversions: boolean | null
          facebook_app_id: string | null
          facebook_app_secret: string | null
          facebook_business_id: string | null
          google_ads_customer_id: string | null
          google_analytics_property_id: string | null
          google_measurement_id: string | null
          id: number
          organization_id: string
          tiktok_app_id: string | null
          tiktok_app_secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_currency_code?: string | null
          enable_enhanced_conversions?: boolean | null
          facebook_app_id?: string | null
          facebook_app_secret?: string | null
          facebook_business_id?: string | null
          google_ads_customer_id?: string | null
          google_analytics_property_id?: string | null
          google_measurement_id?: string | null
          id?: number
          organization_id: string
          tiktok_app_id?: string | null
          tiktok_app_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_currency_code?: string | null
          enable_enhanced_conversions?: boolean | null
          facebook_app_id?: string | null
          facebook_app_secret?: string | null
          facebook_business_id?: string | null
          google_ads_customer_id?: string | null
          google_analytics_property_id?: string | null
          google_measurement_id?: string | null
          id?: number
          organization_id?: string
          tiktok_app_id?: string | null
          tiktok_app_secret?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_conversion_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_conversion_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_conversion_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string | null
          custom_css: string | null
          custom_footer: string | null
          custom_header: string | null
          custom_js: string | null
          default_language: string | null
          display_text_with_logo: boolean | null
          enable_public_site: boolean | null
          enable_registration: boolean | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          organization_id: string
          site_name: string | null
          theme_mode: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_css?: string | null
          custom_footer?: string | null
          custom_header?: string | null
          custom_js?: string | null
          default_language?: string | null
          display_text_with_logo?: boolean | null
          enable_public_site?: boolean | null
          enable_registration?: boolean | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          site_name?: string | null
          theme_mode?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_css?: string | null
          custom_footer?: string | null
          custom_header?: string | null
          custom_js?: string | null
          default_language?: string | null
          display_text_with_logo?: boolean | null
          enable_public_site?: boolean | null
          enable_registration?: boolean | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          site_name?: string | null
          theme_mode?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
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
      organization_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          domain: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          settings: Json | null
          subdomain: string | null
          subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          settings?: Json | null
          subdomain?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          settings?: Json | null
          subdomain?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      password_change_logs: {
        Row: {
          changed_at: string | null
          created_at: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          fields: Json | null
          icon: string | null
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          fields?: Json | null
          icon?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          fields?: Json | null
          icon?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      pos_settings: {
        Row: {
          allow_price_edit: boolean | null
          auto_cut: boolean | null
          background_color: string | null
          business_license: string | null
          created_at: string | null
          currency_position: string | null
          currency_symbol: string | null
          custom_css: string | null
          font_size: number | null
          footer_style: string | null
          header_style: string | null
          id: string
          item_display_style: string | null
          line_spacing: number | null
          organization_id: string
          paper_width: number | null
          price_position: string | null
          primary_color: string | null
          print_density: string | null
          receipt_footer_text: string | null
          receipt_header_text: string | null
          receipt_template: string | null
          require_manager_approval: boolean | null
          secondary_color: string | null
          show_customer_info: boolean | null
          show_date_time: boolean | null
          show_employee_name: boolean | null
          show_qr_code: boolean | null
          show_store_info: boolean | null
          show_store_logo: boolean | null
          show_tracking_code: boolean | null
          store_address: string | null
          store_email: string | null
          store_logo_url: string | null
          store_name: string | null
          store_phone: string | null
          store_website: string | null
          tax_label: string | null
          tax_number: string | null
          text_color: string | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          allow_price_edit?: boolean | null
          auto_cut?: boolean | null
          background_color?: string | null
          business_license?: string | null
          created_at?: string | null
          currency_position?: string | null
          currency_symbol?: string | null
          custom_css?: string | null
          font_size?: number | null
          footer_style?: string | null
          header_style?: string | null
          id?: string
          item_display_style?: string | null
          line_spacing?: number | null
          organization_id: string
          paper_width?: number | null
          price_position?: string | null
          primary_color?: string | null
          print_density?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          receipt_template?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          show_customer_info?: boolean | null
          show_date_time?: boolean | null
          show_employee_name?: boolean | null
          show_qr_code?: boolean | null
          show_store_info?: boolean | null
          show_store_logo?: boolean | null
          show_tracking_code?: boolean | null
          store_address?: string | null
          store_email?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          store_phone?: string | null
          store_website?: string | null
          tax_label?: string | null
          tax_number?: string | null
          text_color?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          allow_price_edit?: boolean | null
          auto_cut?: boolean | null
          background_color?: string | null
          business_license?: string | null
          created_at?: string | null
          currency_position?: string | null
          currency_symbol?: string | null
          custom_css?: string | null
          font_size?: number | null
          footer_style?: string | null
          header_style?: string | null
          id?: string
          item_display_style?: string | null
          line_spacing?: number | null
          organization_id?: string
          paper_width?: number | null
          price_position?: string | null
          primary_color?: string | null
          print_density?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          receipt_template?: string | null
          require_manager_approval?: boolean | null
          secondary_color?: string | null
          show_customer_info?: boolean | null
          show_date_time?: boolean | null
          show_employee_name?: boolean | null
          show_qr_code?: boolean | null
          show_store_info?: boolean | null
          show_store_logo?: boolean | null
          show_tracking_code?: boolean | null
          store_address?: string | null
          store_email?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          store_phone?: string | null
          store_website?: string | null
          tax_label?: string | null
          tax_number?: string | null
          text_color?: string | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "pos_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          allow_analytics: boolean | null
          allow_contact_from_others: boolean | null
          allow_data_collection: boolean | null
          allow_friend_requests: boolean | null
          allow_marketing_emails: boolean | null
          created_at: string | null
          id: string
          profile_visibility: string | null
          show_email: boolean | null
          show_last_activity: boolean | null
          show_phone: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_analytics?: boolean | null
          allow_contact_from_others?: boolean | null
          allow_data_collection?: boolean | null
          allow_friend_requests?: boolean | null
          allow_marketing_emails?: boolean | null
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          show_email?: boolean | null
          show_last_activity?: boolean | null
          show_phone?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_analytics?: boolean | null
          allow_contact_from_others?: boolean | null
          allow_data_collection?: boolean | null
          allow_friend_requests?: boolean | null
          allow_marketing_emails?: boolean | null
          created_at?: string | null
          id?: string
          profile_visibility?: string | null
          show_email?: boolean | null
          show_last_activity?: boolean | null
          show_phone?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_advanced_settings: {
        Row: {
          buyer_discount_percentage: number | null
          created_at: string | null
          custom_currency_code: string | null
          disable_quantity_selection: boolean | null
          enable_buyer_discount: boolean | null
          enable_fake_low_stock: boolean | null
          enable_gift_wrapping: boolean | null
          enable_referral_program: boolean | null
          enable_sticky_buy_button: boolean | null
          enable_stock_notification: boolean | null
          is_base_currency: boolean | null
          max_fake_stock_threshold: number | null
          max_fake_visitors: number | null
          min_fake_stock_threshold: number | null
          min_fake_visitors: number | null
          popularity_badge_text: string | null
          prevent_exit_popup: boolean | null
          prevent_repeat_purchase: boolean | null
          product_id: string
          referral_commission_type: string | null
          referral_commission_value: number | null
          referral_cookie_duration_days: number | null
          require_login_to_purchase: boolean | null
          reset_stock_countdown_on_zero: boolean | null
          show_fake_visitor_counter: boolean | null
          show_last_stock_update: boolean | null
          show_popularity_badge: boolean | null
          show_recent_purchases: boolean | null
          show_stock_countdown: boolean | null
          show_visitor_locations: boolean | null
          skip_cart: boolean | null
          stock_countdown_duration_hours: number | null
          updated_at: string | null
          use_custom_currency: boolean | null
        }
        Insert: {
          buyer_discount_percentage?: number | null
          created_at?: string | null
          custom_currency_code?: string | null
          disable_quantity_selection?: boolean | null
          enable_buyer_discount?: boolean | null
          enable_fake_low_stock?: boolean | null
          enable_gift_wrapping?: boolean | null
          enable_referral_program?: boolean | null
          enable_sticky_buy_button?: boolean | null
          enable_stock_notification?: boolean | null
          is_base_currency?: boolean | null
          max_fake_stock_threshold?: number | null
          max_fake_visitors?: number | null
          min_fake_stock_threshold?: number | null
          min_fake_visitors?: number | null
          popularity_badge_text?: string | null
          prevent_exit_popup?: boolean | null
          prevent_repeat_purchase?: boolean | null
          product_id: string
          referral_commission_type?: string | null
          referral_commission_value?: number | null
          referral_cookie_duration_days?: number | null
          require_login_to_purchase?: boolean | null
          reset_stock_countdown_on_zero?: boolean | null
          show_fake_visitor_counter?: boolean | null
          show_last_stock_update?: boolean | null
          show_popularity_badge?: boolean | null
          show_recent_purchases?: boolean | null
          show_stock_countdown?: boolean | null
          show_visitor_locations?: boolean | null
          skip_cart?: boolean | null
          stock_countdown_duration_hours?: number | null
          updated_at?: string | null
          use_custom_currency?: boolean | null
        }
        Update: {
          buyer_discount_percentage?: number | null
          created_at?: string | null
          custom_currency_code?: string | null
          disable_quantity_selection?: boolean | null
          enable_buyer_discount?: boolean | null
          enable_fake_low_stock?: boolean | null
          enable_gift_wrapping?: boolean | null
          enable_referral_program?: boolean | null
          enable_sticky_buy_button?: boolean | null
          enable_stock_notification?: boolean | null
          is_base_currency?: boolean | null
          max_fake_stock_threshold?: number | null
          max_fake_visitors?: number | null
          min_fake_stock_threshold?: number | null
          min_fake_visitors?: number | null
          popularity_badge_text?: string | null
          prevent_exit_popup?: boolean | null
          prevent_repeat_purchase?: boolean | null
          product_id?: string
          referral_commission_type?: string | null
          referral_commission_value?: number | null
          referral_cookie_duration_days?: number | null
          require_login_to_purchase?: boolean | null
          reset_stock_countdown_on_zero?: boolean | null
          show_fake_visitor_counter?: boolean | null
          show_last_stock_update?: boolean | null
          show_popularity_badge?: boolean | null
          show_recent_purchases?: boolean | null
          show_stock_countdown?: boolean | null
          show_visitor_locations?: boolean | null
          skip_cart?: boolean | null
          stock_countdown_duration_hours?: number | null
          updated_at?: string | null
          use_custom_currency?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_advanced_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_advanced_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_advanced_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_advanced_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_advanced_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          organization_id: string
          slug: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          organization_id: string
          slug?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          organization_id?: string
          slug?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      product_colors: {
        Row: {
          barcode: string | null
          color_code: string
          created_at: string
          has_sizes: boolean | null
          id: string
          image_url: string | null
          is_default: boolean
          name: string
          price: number | null
          product_id: string
          purchase_price: number | null
          quantity: number
          updated_at: string
          variant_number: number | null
        }
        Insert: {
          barcode?: string | null
          color_code: string
          created_at?: string
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          name: string
          price?: number | null
          product_id: string
          purchase_price?: number | null
          quantity?: number
          updated_at?: string
          variant_number?: number | null
        }
        Update: {
          barcode?: string | null
          color_code?: string
          created_at?: string
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          name?: string
          price?: number | null
          product_id?: string
          purchase_price?: number | null
          quantity?: number
          updated_at?: string
          variant_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_deletion_attempts: {
        Row: {
          attempt_status: string
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          organization_id: string | null
          product_id: string | null
          user_id: string | null
          user_permissions: Json | null
        }
        Insert: {
          attempt_status: string
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          product_id?: string | null
          user_id?: string | null
          user_permissions?: Json | null
        }
        Update: {
          attempt_status?: string
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string | null
          product_id?: string | null
          user_id?: string | null
          user_permissions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_deletion_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_deletion_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_marketing_settings: {
        Row: {
          allow_images_in_reviews: boolean | null
          created_at: string | null
          enable_facebook_conversion_api: boolean | null
          enable_facebook_pixel: boolean | null
          enable_fake_purchase_counter: boolean | null
          enable_fake_star_ratings: boolean | null
          enable_google_ads_tracking: boolean | null
          enable_review_replies: boolean | null
          enable_reviews: boolean | null
          enable_snapchat_pixel: boolean | null
          enable_tiktok_pixel: boolean | null
          facebook_access_token: string | null
          facebook_advanced_matching_enabled: boolean | null
          facebook_conversations_api_enabled: boolean | null
          facebook_dataset_id: string | null
          facebook_pixel_id: string | null
          facebook_standard_events: Json | null
          facebook_test_event_code: string | null
          fake_purchase_count: number | null
          fake_star_rating_count: number | null
          fake_star_rating_value: number | null
          fixed_discount_value_for_points: number | null
          google_ads_conversion_id: string | null
          google_ads_conversion_label: string | null
          google_ads_enhanced_conversions_enabled: boolean | null
          google_ads_event_snippets: Json | null
          google_ads_global_site_tag_enabled: boolean | null
          google_ads_phone_conversion_label: string | null
          google_ads_phone_conversion_number: string | null
          google_gtag_id: string | null
          id: string
          loyalty_points_enabled: boolean | null
          loyalty_points_name_plural: string | null
          loyalty_points_name_singular: string | null
          max_points_per_order: number | null
          min_purchase_to_earn_points: number | null
          offer_timer_cookie_duration_days: number | null
          offer_timer_display_style: string | null
          offer_timer_duration_minutes: number | null
          offer_timer_enabled: boolean | null
          offer_timer_end_action: string | null
          offer_timer_end_action_message: string | null
          offer_timer_end_action_url: string | null
          offer_timer_end_date: string | null
          offer_timer_restart_for_new_session: boolean | null
          offer_timer_show_on_specific_pages_only: boolean | null
          offer_timer_specific_page_urls: string[] | null
          offer_timer_text_above: string | null
          offer_timer_text_below: string | null
          offer_timer_title: string | null
          offer_timer_type: string | null
          organization_id: string
          points_expiration_months: number | null
          points_needed_for_fixed_discount: number | null
          points_per_currency_unit: number | null
          product_id: string
          redeem_points_for_discount: boolean | null
          review_display_style: string | null
          reviews_auto_approve: boolean | null
          reviews_verify_purchase: boolean | null
          snapchat_advanced_matching_enabled: boolean | null
          snapchat_api_token: string | null
          snapchat_events_api_enabled: boolean | null
          snapchat_pixel_id: string | null
          snapchat_standard_events: Json | null
          snapchat_test_event_code: string | null
          test_mode: boolean | null
          tiktok_access_token: string | null
          tiktok_advanced_matching_enabled: boolean | null
          tiktok_events_api_enabled: boolean | null
          tiktok_pixel_id: string | null
          tiktok_standard_events: Json | null
          tiktok_test_event_code: string | null
          updated_at: string | null
        }
        Insert: {
          allow_images_in_reviews?: boolean | null
          created_at?: string | null
          enable_facebook_conversion_api?: boolean | null
          enable_facebook_pixel?: boolean | null
          enable_fake_purchase_counter?: boolean | null
          enable_fake_star_ratings?: boolean | null
          enable_google_ads_tracking?: boolean | null
          enable_review_replies?: boolean | null
          enable_reviews?: boolean | null
          enable_snapchat_pixel?: boolean | null
          enable_tiktok_pixel?: boolean | null
          facebook_access_token?: string | null
          facebook_advanced_matching_enabled?: boolean | null
          facebook_conversations_api_enabled?: boolean | null
          facebook_dataset_id?: string | null
          facebook_pixel_id?: string | null
          facebook_standard_events?: Json | null
          facebook_test_event_code?: string | null
          fake_purchase_count?: number | null
          fake_star_rating_count?: number | null
          fake_star_rating_value?: number | null
          fixed_discount_value_for_points?: number | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          google_ads_enhanced_conversions_enabled?: boolean | null
          google_ads_event_snippets?: Json | null
          google_ads_global_site_tag_enabled?: boolean | null
          google_ads_phone_conversion_label?: string | null
          google_ads_phone_conversion_number?: string | null
          google_gtag_id?: string | null
          id?: string
          loyalty_points_enabled?: boolean | null
          loyalty_points_name_plural?: string | null
          loyalty_points_name_singular?: string | null
          max_points_per_order?: number | null
          min_purchase_to_earn_points?: number | null
          offer_timer_cookie_duration_days?: number | null
          offer_timer_display_style?: string | null
          offer_timer_duration_minutes?: number | null
          offer_timer_enabled?: boolean | null
          offer_timer_end_action?: string | null
          offer_timer_end_action_message?: string | null
          offer_timer_end_action_url?: string | null
          offer_timer_end_date?: string | null
          offer_timer_restart_for_new_session?: boolean | null
          offer_timer_show_on_specific_pages_only?: boolean | null
          offer_timer_specific_page_urls?: string[] | null
          offer_timer_text_above?: string | null
          offer_timer_text_below?: string | null
          offer_timer_title?: string | null
          offer_timer_type?: string | null
          organization_id: string
          points_expiration_months?: number | null
          points_needed_for_fixed_discount?: number | null
          points_per_currency_unit?: number | null
          product_id: string
          redeem_points_for_discount?: boolean | null
          review_display_style?: string | null
          reviews_auto_approve?: boolean | null
          reviews_verify_purchase?: boolean | null
          snapchat_advanced_matching_enabled?: boolean | null
          snapchat_api_token?: string | null
          snapchat_events_api_enabled?: boolean | null
          snapchat_pixel_id?: string | null
          snapchat_standard_events?: Json | null
          snapchat_test_event_code?: string | null
          test_mode?: boolean | null
          tiktok_access_token?: string | null
          tiktok_advanced_matching_enabled?: boolean | null
          tiktok_events_api_enabled?: boolean | null
          tiktok_pixel_id?: string | null
          tiktok_standard_events?: Json | null
          tiktok_test_event_code?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_images_in_reviews?: boolean | null
          created_at?: string | null
          enable_facebook_conversion_api?: boolean | null
          enable_facebook_pixel?: boolean | null
          enable_fake_purchase_counter?: boolean | null
          enable_fake_star_ratings?: boolean | null
          enable_google_ads_tracking?: boolean | null
          enable_review_replies?: boolean | null
          enable_reviews?: boolean | null
          enable_snapchat_pixel?: boolean | null
          enable_tiktok_pixel?: boolean | null
          facebook_access_token?: string | null
          facebook_advanced_matching_enabled?: boolean | null
          facebook_conversations_api_enabled?: boolean | null
          facebook_dataset_id?: string | null
          facebook_pixel_id?: string | null
          facebook_standard_events?: Json | null
          facebook_test_event_code?: string | null
          fake_purchase_count?: number | null
          fake_star_rating_count?: number | null
          fake_star_rating_value?: number | null
          fixed_discount_value_for_points?: number | null
          google_ads_conversion_id?: string | null
          google_ads_conversion_label?: string | null
          google_ads_enhanced_conversions_enabled?: boolean | null
          google_ads_event_snippets?: Json | null
          google_ads_global_site_tag_enabled?: boolean | null
          google_ads_phone_conversion_label?: string | null
          google_ads_phone_conversion_number?: string | null
          google_gtag_id?: string | null
          id?: string
          loyalty_points_enabled?: boolean | null
          loyalty_points_name_plural?: string | null
          loyalty_points_name_singular?: string | null
          max_points_per_order?: number | null
          min_purchase_to_earn_points?: number | null
          offer_timer_cookie_duration_days?: number | null
          offer_timer_display_style?: string | null
          offer_timer_duration_minutes?: number | null
          offer_timer_enabled?: boolean | null
          offer_timer_end_action?: string | null
          offer_timer_end_action_message?: string | null
          offer_timer_end_action_url?: string | null
          offer_timer_end_date?: string | null
          offer_timer_restart_for_new_session?: boolean | null
          offer_timer_show_on_specific_pages_only?: boolean | null
          offer_timer_specific_page_urls?: string[] | null
          offer_timer_text_above?: string | null
          offer_timer_text_below?: string | null
          offer_timer_title?: string | null
          offer_timer_type?: string | null
          organization_id?: string
          points_expiration_months?: number | null
          points_needed_for_fixed_discount?: number | null
          points_per_currency_unit?: number | null
          product_id?: string
          redeem_points_for_discount?: boolean | null
          review_display_style?: string | null
          reviews_auto_approve?: boolean | null
          reviews_verify_purchase?: boolean | null
          snapchat_advanced_matching_enabled?: boolean | null
          snapchat_api_token?: string | null
          snapchat_events_api_enabled?: boolean | null
          snapchat_pixel_id?: string | null
          snapchat_standard_events?: Json | null
          snapchat_test_event_code?: string | null
          test_mode?: boolean | null
          tiktok_access_token?: string | null
          tiktok_advanced_matching_enabled?: boolean | null
          tiktok_events_api_enabled?: boolean | null
          tiktok_pixel_id?: string | null
          tiktok_standard_events?: Json | null
          tiktok_test_event_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_marketing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_marketing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_marketing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          created_at: string
          display_on_product_page: boolean | null
          id: string
          is_thumbnail: boolean | null
          product_id: string
          sort_order: number | null
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_on_product_page?: boolean | null
          id?: string
          is_thumbnail?: boolean | null
          product_id: string
          sort_order?: number | null
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_on_product_page?: boolean | null
          id?: string
          is_thumbnail?: boolean | null
          product_id?: string
          sort_order?: number | null
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_reply_at: string | null
          admin_reply_by: string | null
          admin_reply_text: string | null
          approved_at: string | null
          approved_by: string | null
          comment: string | null
          created_at: string | null
          id: string
          images: Json | null
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          organization_id: string
          product_id: string
          rating: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_reply_at?: string | null
          admin_reply_by?: string | null
          admin_reply_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          organization_id: string
          product_id: string
          rating: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_reply_at?: string | null
          admin_reply_by?: string | null
          admin_reply_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: Json | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          organization_id?: string
          product_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_admin_reply_by_fkey"
            columns: ["admin_reply_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_reviews_admin_reply_by_fkey"
            columns: ["admin_reply_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_admin_reply_by_fkey"
            columns: ["admin_reply_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_admin_reply_by_fkey"
            columns: ["admin_reply_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_admin_reply_by_fkey"
            columns: ["admin_reply_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          barcode: string | null
          color_id: string
          created_at: string
          id: string
          is_default: boolean
          price: number | null
          product_id: string
          purchase_price: number | null
          quantity: number
          size_name: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          color_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          price?: number | null
          product_id: string
          purchase_price?: number | null
          quantity?: number
          size_name: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          color_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          price?: number | null
          product_id?: string
          purchase_price?: number | null
          quantity?: number
          size_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_wholesale_tiers: {
        Row: {
          created_at: string
          id: string
          min_quantity: number
          price_per_unit: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity: number
          price_per_unit: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_quantity?: number
          price_per_unit?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          form_template_id: string | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean
          is_featured: boolean | null
          is_new: boolean | null
          is_sold_by_unit: boolean | null
          last_inventory_update: string | null
          min_partial_wholesale_quantity: number | null
          min_stock_level: number | null
          min_wholesale_quantity: number | null
          money_back_text: string | null
          name: string
          name_for_shipping: string | null
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          shipping_clone_id: number | null
          shipping_provider_id: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string | null
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          use_shipping_clone: boolean
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }
        Insert: {
          allow_partial_wholesale?: boolean | null
          allow_retail?: boolean | null
          allow_wholesale?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          description: string
          fast_shipping_text?: string | null
          features?: string[] | null
          form_template_id?: string | null
          has_fast_shipping?: boolean | null
          has_money_back?: boolean | null
          has_quality_guarantee?: boolean | null
          has_variants?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_digital: boolean
          is_featured?: boolean | null
          is_new?: boolean | null
          is_sold_by_unit?: boolean | null
          last_inventory_update?: string | null
          min_partial_wholesale_quantity?: number | null
          min_stock_level?: number | null
          min_wholesale_quantity?: number | null
          money_back_text?: string | null
          name: string
          name_for_shipping?: string | null
          organization_id: string
          partial_wholesale_price?: number | null
          price: number
          purchase_page_config?: Json | null
          purchase_price?: number | null
          quality_guarantee_text?: string | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          shipping_clone_id?: number | null
          shipping_provider_id?: number | null
          show_price_on_landing?: boolean
          sku: string
          slug?: string | null
          specifications?: Json | null
          stock_quantity: number
          subcategory?: string | null
          subcategory_id?: string | null
          thumbnail_image?: string | null
          unit_purchase_price?: number | null
          unit_sale_price?: number | null
          unit_type?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          use_shipping_clone?: boolean
          use_sizes?: boolean | null
          use_variant_prices?: boolean | null
          wholesale_price?: number | null
        }
        Update: {
          allow_partial_wholesale?: boolean | null
          allow_retail?: boolean | null
          allow_wholesale?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string
          fast_shipping_text?: string | null
          features?: string[] | null
          form_template_id?: string | null
          has_fast_shipping?: boolean | null
          has_money_back?: boolean | null
          has_quality_guarantee?: boolean | null
          has_variants?: boolean
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_digital?: boolean
          is_featured?: boolean | null
          is_new?: boolean | null
          is_sold_by_unit?: boolean | null
          last_inventory_update?: string | null
          min_partial_wholesale_quantity?: number | null
          min_stock_level?: number | null
          min_wholesale_quantity?: number | null
          money_back_text?: string | null
          name?: string
          name_for_shipping?: string | null
          organization_id?: string
          partial_wholesale_price?: number | null
          price?: number
          purchase_page_config?: Json | null
          purchase_price?: number | null
          quality_guarantee_text?: string | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          shipping_clone_id?: number | null
          shipping_provider_id?: number | null
          show_price_on_landing?: boolean
          sku?: string
          slug?: string | null
          specifications?: Json | null
          stock_quantity?: number
          subcategory?: string | null
          subcategory_id?: string | null
          thumbnail_image?: string | null
          unit_purchase_price?: number | null
          unit_sale_price?: number | null
          unit_type?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          use_shipping_clone?: boolean
          use_sizes?: boolean | null
          use_variant_prices?: boolean | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "products_shipping_clone_id_fkey"
            columns: ["shipping_clone_id"]
            isOneToOne: false
            referencedRelation: "shipping_provider_clones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shipping_provider_id_fkey"
            columns: ["shipping_provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "products_shipping_provider_id_fkey"
            columns: ["shipping_provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "product_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          end_date: string | null
          expense_id: string
          frequency: string
          id: string
          last_generated: string | null
          next_due: string
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          expense_id: string
          frequency: string
          id?: string
          last_generated?: string | null
          next_due: string
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          expense_id?: string
          frequency?: string
          id?: string
          last_generated?: string | null
          next_due?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_images: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_type: string | null
          image_url: string
          repair_order_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_type?: string | null
          image_url: string
          repair_order_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_type?: string | null
          image_url?: string
          repair_order_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_images_repair_order_id_fkey"
            columns: ["repair_order_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_locations: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          manager_name: string | null
          name: string
          organization_id: string
          phone: string | null
          specialties: string[] | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          manager_name?: string | null
          name: string
          organization_id: string
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          manager_name?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      repair_orders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          custom_location: string | null
          customer_name: string
          customer_phone: string
          id: string
          issue_description: string | null
          notes: string | null
          order_number: string
          organization_id: string
          paid_amount: number | null
          payment_method: string | null
          received_by: string | null
          repair_images: Json | null
          repair_location_id: string | null
          status: string | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          custom_location?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          issue_description?: string | null
          notes?: string | null
          order_number: string
          organization_id: string
          paid_amount?: number | null
          payment_method?: string | null
          received_by?: string | null
          repair_images?: Json | null
          repair_location_id?: string | null
          status?: string | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          custom_location?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          issue_description?: string | null
          notes?: string | null
          order_number?: string
          organization_id?: string
          paid_amount?: number | null
          payment_method?: string | null
          received_by?: string | null
          repair_images?: Json | null
          repair_location_id?: string | null
          status?: string | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "repair_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "repair_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_orders_repair_location_id_fkey"
            columns: ["repair_location_id"]
            isOneToOne: false
            referencedRelation: "repair_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_status_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          repair_order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          repair_order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          repair_order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "repair_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_status_history_repair_order_id_fkey"
            columns: ["repair_order_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          activity_description: string | null
          activity_type: string
          created_at: string | null
          device_info: Json | null
          id: string
          ip_address: unknown | null
          location_info: Json | null
          metadata: Json | null
          risk_level: string | null
          session_id: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_description?: string | null
          activity_type: string
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown | null
          location_info?: Json | null
          metadata?: Json | null
          risk_level?: string | null
          session_id?: string | null
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_description?: string | null
          activity_type?: string
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: unknown | null
          location_info?: Json | null
          metadata?: Json | null
          risk_level?: string | null
          session_id?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "security_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_cache: {
        Row: {
          cache_type: string
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          organization_id: string
        }
        Insert: {
          cache_type: string
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          cache_type?: string
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "seo_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      seo_crawl_log: {
        Row: {
          crawled_at: string | null
          crawler_name: string | null
          id: string
          ip_address: unknown | null
          requested_url: string | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          crawled_at?: string | null
          crawler_name?: string | null
          id?: string
          ip_address?: unknown | null
          requested_url?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          crawled_at?: string | null
          crawler_name?: string | null
          id?: string
          ip_address?: unknown | null
          requested_url?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      seo_keywords: {
        Row: {
          created_at: string | null
          current_position: number | null
          difficulty: number | null
          id: string
          keyword: string
          notes: string | null
          search_volume: number | null
          target_page: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_position?: number | null
          difficulty?: number | null
          id?: string
          keyword: string
          notes?: string | null
          search_volume?: number | null
          target_page?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_position?: number | null
          difficulty?: number | null
          id?: string
          keyword?: string
          notes?: string | null
          search_volume?: number | null
          target_page?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_page_meta: {
        Row: {
          canonical_url: string | null
          created_at: string | null
          description: string | null
          id: string
          keywords: string[] | null
          no_follow: boolean | null
          no_index: boolean | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          og_type: string | null
          page_path: string
          title: string | null
          twitter_card: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          no_follow?: boolean | null
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          page_path: string
          title?: string | null
          twitter_card?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          no_follow?: boolean | null
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          page_path?: string
          title?: string | null
          twitter_card?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_performance_metrics: {
        Row: {
          avg_time_on_page: unknown | null
          bounce_rate: number | null
          click_through_rate: number | null
          created_at: string | null
          id: string
          impressions: number | null
          metric_date: string
          organic_traffic: number | null
          page_url: string
          page_views: number | null
          position: number | null
          unique_visitors: number | null
        }
        Insert: {
          avg_time_on_page?: unknown | null
          bounce_rate?: number | null
          click_through_rate?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          metric_date: string
          organic_traffic?: number | null
          page_url: string
          page_views?: number | null
          position?: number | null
          unique_visitors?: number | null
        }
        Update: {
          avg_time_on_page?: unknown | null
          bounce_rate?: number | null
          click_through_rate?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          metric_date?: string
          organic_traffic?: number | null
          page_url?: string
          page_views?: number | null
          position?: number | null
          unique_visitors?: number | null
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string | null
          from_path: string
          id: string
          is_active: boolean | null
          redirect_type: number | null
          to_path: string
        }
        Insert: {
          created_at?: string | null
          from_path: string
          id?: string
          is_active?: boolean | null
          redirect_type?: number | null
          to_path: string
        }
        Update: {
          created_at?: string | null
          from_path?: string
          id?: string
          is_active?: boolean | null
          redirect_type?: number | null
          to_path?: string
        }
        Relationships: []
      }
      seo_robots_rules: {
        Row: {
          allow_paths: string[] | null
          crawl_delay: number | null
          created_at: string | null
          disallow_paths: string[] | null
          id: string
          is_active: boolean | null
          priority: number | null
          user_agent: string
        }
        Insert: {
          allow_paths?: string[] | null
          crawl_delay?: number | null
          created_at?: string | null
          disallow_paths?: string[] | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          user_agent?: string
        }
        Update: {
          allow_paths?: string[] | null
          crawl_delay?: number | null
          created_at?: string | null
          disallow_paths?: string[] | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          user_agent?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          created_at: string | null
          default_og_image: string | null
          enable_robots_txt: boolean | null
          enable_sitemap: boolean | null
          facebook_pixel_id: string | null
          google_analytics_id: string | null
          google_search_console_key: string | null
          id: string
          site_description: string | null
          site_keywords: string[] | null
          site_title: string
          twitter_handle: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_og_image?: string | null
          enable_robots_txt?: boolean | null
          enable_sitemap?: boolean | null
          facebook_pixel_id?: string | null
          google_analytics_id?: string | null
          google_search_console_key?: string | null
          id?: string
          site_description?: string | null
          site_keywords?: string[] | null
          site_title: string
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_og_image?: string | null
          enable_robots_txt?: boolean | null
          enable_sitemap?: boolean | null
          facebook_pixel_id?: string | null
          google_analytics_id?: string | null
          google_search_console_key?: string | null
          id?: string
          site_description?: string | null
          site_keywords?: string[] | null
          site_title?: string
          twitter_handle?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_sitemap_entries: {
        Row: {
          change_frequency: string | null
          created_at: string | null
          id: string
          include_in_sitemap: boolean | null
          last_modified: string | null
          priority: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          change_frequency?: string | null
          created_at?: string | null
          id?: string
          include_in_sitemap?: boolean | null
          last_modified?: string | null
          priority?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          change_frequency?: string | null
          created_at?: string | null
          id?: string
          include_in_sitemap?: boolean | null
          last_modified?: string | null
          priority?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      seo_structured_data: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          page_path: string | null
          schema_data: Json
          schema_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_path?: string | null
          schema_data: Json
          schema_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_path?: string | null
          schema_data?: Json
          schema_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_id: string
          organization_id: string
          price: number
          public_tracking_code: string | null
          repair_location_id: string | null
          scheduled_date: string | null
          service_id: string
          service_name: string
          slug: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_id: string
          organization_id: string
          price: number
          public_tracking_code?: string | null
          repair_location_id?: string | null
          scheduled_date?: string | null
          service_id: string
          service_name: string
          slug?: string | null
          status: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          organization_id?: string
          price?: number
          public_tracking_code?: string | null
          repair_location_id?: string | null
          scheduled_date?: string | null
          service_id?: string
          service_name?: string
          slug?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_bookings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "organization_order_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "service_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders_with_items_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "service_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "service_bookings_repair_location_id_fkey"
            columns: ["repair_location_id"]
            isOneToOne: false
            referencedRelation: "repair_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_progress: {
        Row: {
          created_by: string | null
          id: string
          note: string | null
          organization_id: string
          service_booking_id: string
          slug: string | null
          status: string
          timestamp: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id: string
          service_booking_id: string
          slug?: string | null
          status: string
          timestamp?: string
        }
        Update: {
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          service_booking_id?: string
          slug?: string | null
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_progress_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_progress_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_progress_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_progress_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_progress_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "service_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "service_progress_service_booking_id_fkey"
            columns: ["service_booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          description: string
          estimated_time: string
          id: string
          image: string | null
          is_available: boolean
          is_price_dynamic: boolean
          name: string
          organization_id: string
          price: number
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          estimated_time: string
          id?: string
          image?: string | null
          is_available: boolean
          is_price_dynamic?: boolean
          name: string
          organization_id: string
          price: number
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          estimated_time?: string
          id?: string
          image?: string | null
          is_available?: boolean
          is_price_dynamic?: boolean
          name?: string
          organization_id?: string
          price?: number
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      settings_audit_log: {
        Row: {
          action_type: string | null
          created_at: string | null
          id: string
          new_value: string | null
          new_values: Json | null
          old_value: string | null
          old_values: Json | null
          organization_id: string | null
          record_id: string | null
          setting_key: string
          setting_type: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          id?: string
          new_value?: string | null
          new_values?: Json | null
          old_value?: string | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          setting_key: string
          setting_type: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          id?: string
          new_value?: string | null
          new_values?: Json | null
          old_value?: string | null
          old_values?: Json | null
          organization_id?: string | null
          record_id?: string | null
          setting_key?: string
          setting_type?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "settings_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      shipping_clone_prices: {
        Row: {
          clone_id: number
          created_at: string | null
          desk_price: number | null
          home_price: number | null
          id: number
          province_id: number
          province_name: string
          updated_at: string | null
        }
        Insert: {
          clone_id: number
          created_at?: string | null
          desk_price?: number | null
          home_price?: number | null
          id?: number
          province_id: number
          province_name: string
          updated_at?: string | null
        }
        Update: {
          clone_id?: number
          created_at?: string | null
          desk_price?: number | null
          home_price?: number | null
          id?: number
          province_id?: number
          province_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_clone_prices_clone_id_fkey"
            columns: ["clone_id"]
            isOneToOne: false
            referencedRelation: "shipping_provider_clones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_orders: {
        Row: {
          address: string
          amount: number
          city: string
          created_at: string | null
          delivery_type: number | null
          external_id: string | null
          id: number
          is_confirmed: boolean | null
          label_url: string | null
          metadata: Json | null
          notes: string | null
          order_id: string | null
          organization_id: string
          package_type: number | null
          products_description: string | null
          provider_id: number
          recipient_name: string
          recipient_phone: string
          recipient_phone_alt: string | null
          region: string
          shipping_cost: number | null
          status: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          amount: number
          city: string
          created_at?: string | null
          delivery_type?: number | null
          external_id?: string | null
          id?: number
          is_confirmed?: boolean | null
          label_url?: string | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          organization_id: string
          package_type?: number | null
          products_description?: string | null
          provider_id: number
          recipient_name: string
          recipient_phone: string
          recipient_phone_alt?: string | null
          region: string
          shipping_cost?: number | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          amount?: number
          city?: string
          created_at?: string | null
          delivery_type?: number | null
          external_id?: string | null
          id?: number
          is_confirmed?: boolean | null
          label_url?: string | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          organization_id?: string
          package_type?: number | null
          products_description?: string | null
          provider_id?: number
          recipient_name?: string
          recipient_phone?: string
          recipient_phone_alt?: string | null
          region?: string
          shipping_cost?: number | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "organization_order_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "shipping_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders_with_items_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "shipping_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_provider_clones: {
        Row: {
          api_key: string | null
          api_token: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          is_desk_delivery_enabled: boolean | null
          is_free_delivery_desk: boolean | null
          is_free_delivery_home: boolean | null
          is_home_delivery_enabled: boolean | null
          name: string
          organization_id: string
          original_provider_id: number
          sync_enabled: boolean | null
          unified_desk_price: number | null
          unified_home_price: number | null
          updated_at: string | null
          use_unified_price: boolean | null
        }
        Insert: {
          api_key?: string | null
          api_token?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          is_desk_delivery_enabled?: boolean | null
          is_free_delivery_desk?: boolean | null
          is_free_delivery_home?: boolean | null
          is_home_delivery_enabled?: boolean | null
          name: string
          organization_id: string
          original_provider_id: number
          sync_enabled?: boolean | null
          unified_desk_price?: number | null
          unified_home_price?: number | null
          updated_at?: string | null
          use_unified_price?: boolean | null
        }
        Update: {
          api_key?: string | null
          api_token?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          is_desk_delivery_enabled?: boolean | null
          is_free_delivery_desk?: boolean | null
          is_free_delivery_home?: boolean | null
          is_home_delivery_enabled?: boolean | null
          name?: string
          organization_id?: string
          original_provider_id?: number
          sync_enabled?: boolean | null
          unified_desk_price?: number | null
          unified_home_price?: number | null
          updated_at?: string | null
          use_unified_price?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_provider_clones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_provider_clones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_provider_clones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_provider_clones_original_provider_id_fkey"
            columns: ["original_provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "shipping_provider_clones_original_provider_id_fkey"
            columns: ["original_provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_provider_settings: {
        Row: {
          api_key: string | null
          api_token: string | null
          auto_shipping: boolean | null
          created_at: string | null
          id: number
          is_enabled: boolean | null
          organization_id: string
          provider_id: number
          settings: Json | null
          track_updates: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_token?: string | null
          auto_shipping?: boolean | null
          created_at?: string | null
          id?: number
          is_enabled?: boolean | null
          organization_id: string
          provider_id: number
          settings?: Json | null
          track_updates?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_token?: string | null
          auto_shipping?: boolean | null
          created_at?: string | null
          id?: number
          is_enabled?: boolean | null
          organization_id?: string
          provider_id?: number
          settings?: Json | null
          track_updates?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_provider_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_provider_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_provider_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_provider_settings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "shipping_provider_settings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_providers: {
        Row: {
          base_url: string | null
          code: string
          created_at: string | null
          id: number
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_url?: string | null
          code: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_url?: string | null
          code?: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          created_at: string | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          from_region: string | null
          id: number
          organization_id: string
          price: number
          provider_id: number
          to_region: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          from_region?: string | null
          id?: number
          organization_id: string
          price: number
          provider_id: number
          to_region: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          from_region?: string | null
          id?: number
          organization_id?: string
          price?: number
          provider_id?: number
          to_region?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_rates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "shipping_rates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id"]
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
      store_settings: {
        Row: {
          component_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          organization_id: string
          settings: Json
          updated_at: string | null
        }
        Insert: {
          component_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          organization_id: string
          settings: Json
          updated_at?: string | null
        }
        Update: {
          component_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          organization_id?: string
          settings?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "store_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
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
      super_custom_components: {
        Row: {
          created_at: string | null
          css: string | null
          html: string | null
          id: string
          is_global: boolean | null
          js: string | null
          name: string
          props: Json | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          css?: string | null
          html?: string | null
          id?: string
          is_global?: boolean | null
          js?: string | null
          name: string
          props?: Json | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          css?: string | null
          html?: string | null
          id?: string
          is_global?: boolean | null
          js?: string | null
          name?: string
          props?: Json | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_custom_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "super_custom_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_custom_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      super_edit_history: {
        Row: {
          action: string
          changes: Json
          created_at: string | null
          id: string
          page_id: string
          snapshot: Json | null
          user_id: string
        }
        Insert: {
          action: string
          changes: Json
          created_at?: string | null
          id?: string
          page_id: string
          snapshot?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string | null
          id?: string
          page_id?: string
          snapshot?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_edit_history_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "super_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      super_global_styles: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_global_styles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "super_global_styles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_global_styles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      super_media_library: {
        Row: {
          alt: string | null
          created_at: string | null
          filename: string
          folder: string | null
          height: number | null
          id: string
          mime_type: string
          size: number
          tags: string[] | null
          tenant_id: string
          thumbnail_url: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string | null
          filename: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type: string
          size: number
          tags?: string[] | null
          tenant_id: string
          thumbnail_url?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string | null
          filename?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          size?: number
          tags?: string[] | null
          tenant_id?: string
          thumbnail_url?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "super_media_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "super_media_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_media_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      super_page_analytics: {
        Row: {
          avg_time_on_page: number | null
          bounce_rate: number | null
          conversion_rate: number | null
          created_at: string | null
          date: string
          id: string
          page_id: string
          unique_visitors: number | null
          views: number | null
        }
        Insert: {
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          id?: string
          page_id: string
          unique_visitors?: number | null
          views?: number | null
        }
        Update: {
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          page_id?: string
          unique_visitors?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "super_page_analytics_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "super_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      super_pages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          published: boolean | null
          published_at: string | null
          sections: Json
          slug: string
          tenant_id: string
          theme_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          published?: boolean | null
          published_at?: string | null
          sections?: Json
          slug: string
          tenant_id: string
          theme_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          published?: boolean | null
          published_at?: string | null
          sections?: Json
          slug?: string
          tenant_id?: string
          theme_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "super_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "super_pages_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "super_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      super_section_templates: {
        Row: {
          category: string
          created_at: string | null
          default_props: Json | null
          elements: Json
          id: string
          is_premium: boolean | null
          name: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_props?: Json | null
          elements?: Json
          id?: string
          is_premium?: boolean | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_props?: Json | null
          elements?: Json
          id?: string
          is_premium?: boolean | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      super_themes: {
        Row: {
          border_radius: Json
          colors: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          spacing: Json
          tenant_id: string
          typography: Json
          updated_at: string | null
        }
        Insert: {
          border_radius?: Json
          colors?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          spacing?: Json
          tenant_id: string
          typography?: Json
          updated_at?: string | null
        }
        Update: {
          border_radius?: Json
          colors?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          spacing?: Json
          tenant_id?: string
          typography?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "super_themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          position: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          position?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          position?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payment_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          purchase_id: string | null
          reference_number: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          purchase_id?: string | null
          reference_number?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          purchase_id?: string | null
          reference_number?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "overdue_supplier_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payment_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_purchase_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          product_id: string | null
          purchase_id: string
          quantity: number
          tax_amount: number | null
          tax_rate: number | null
          total_price: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          product_id?: string | null
          purchase_id: string
          quantity?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_price?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          product_id?: string | null
          purchase_id?: string
          quantity?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_price?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supplier_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supplier_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "overdue_supplier_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "supplier_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_purchases: {
        Row: {
          balance_due: number | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          paid_amount: number
          payment_status: string | null
          payment_terms: string | null
          purchase_date: string | null
          purchase_number: string
          status: string | null
          supplier_id: string
          total_amount: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          balance_due?: number | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paid_amount?: number
          payment_status?: string | null
          payment_terms?: string | null
          purchase_date?: string | null
          purchase_number: string
          status?: string | null
          supplier_id: string
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          balance_due?: number | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          payment_status?: string | null
          payment_terms?: string | null
          purchase_date?: string | null
          purchase_number?: string
          status?: string | null
          supplier_id?: string
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payment_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ratings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string
          rating: number
          review: string | null
          review_date: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id: string
          rating: number
          review?: string | null
          review_date?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string
          rating?: number
          review?: string | null
          review_date?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payment_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_type: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          rating: number | null
          supplier_category: string | null
          supplier_type: string | null
          tax_number: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          rating?: number | null
          supplier_category?: string | null
          supplier_type?: string | null
          tax_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          rating?: number | null
          supplier_category?: string | null
          supplier_type?: string | null
          tax_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
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
      todos: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          list_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          list_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          employee_id: string | null
          id: string
          order_id: string | null
          organization_id: string
          payment_method: string
          slug: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          order_id?: string | null
          organization_id: string
          payment_method: string
          slug?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string
          payment_method?: string
          slug?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "organization_order_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pos_orders_with_items_count"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          browser_info: Json | null
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          device_type: string | null
          expires_at: string | null
          first_seen_ip: unknown | null
          id: string
          is_trusted: boolean | null
          last_seen_ip: unknown | null
          last_used_at: string | null
          trust_level: number | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          browser_info?: Json | null
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          first_seen_ip?: unknown | null
          id?: string
          is_trusted?: boolean | null
          last_seen_ip?: unknown | null
          last_used_at?: string | null
          trust_level?: number | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          browser_info?: Json | null
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          device_type?: string | null
          expires_at?: string | null
          first_seen_ip?: unknown | null
          id?: string
          is_trusted?: boolean | null
          last_seen_ip?: unknown | null
          last_used_at?: string | null
          trust_level?: number | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_watched_at: string | null
          lesson_id: string
          progress_percentage: number | null
          updated_at: string | null
          user_id: string
          watch_time: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          lesson_id: string
          progress_percentage?: number | null
          updated_at?: string | null
          user_id: string
          watch_time?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched_at?: string | null
          lesson_id?: string
          progress_percentage?: number | null
          updated_at?: string | null
          user_id?: string
          watch_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_results: {
        Row: {
          answers: Json
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_security_settings: {
        Row: {
          backup_codes: string[] | null
          backup_codes_generated_at: string | null
          backup_codes_used: Json | null
          created_at: string | null
          device_tracking_enabled: boolean | null
          id: string
          login_notification_enabled: boolean | null
          max_active_sessions: number | null
          password_expiry_days: number | null
          prevent_password_reuse: number | null
          require_reauth_for_sensitive: boolean | null
          require_strong_password: boolean | null
          session_timeout_minutes: number | null
          suspicious_activity_alerts: boolean | null
          totp_secret: string | null
          two_factor_enabled: boolean | null
          two_factor_method: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          backup_codes_generated_at?: string | null
          backup_codes_used?: Json | null
          created_at?: string | null
          device_tracking_enabled?: boolean | null
          id?: string
          login_notification_enabled?: boolean | null
          max_active_sessions?: number | null
          password_expiry_days?: number | null
          prevent_password_reuse?: number | null
          require_reauth_for_sensitive?: boolean | null
          require_strong_password?: boolean | null
          session_timeout_minutes?: number | null
          suspicious_activity_alerts?: boolean | null
          totp_secret?: string | null
          two_factor_enabled?: boolean | null
          two_factor_method?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          backup_codes_generated_at?: string | null
          backup_codes_used?: Json | null
          created_at?: string | null
          device_tracking_enabled?: boolean | null
          id?: string
          login_notification_enabled?: boolean | null
          max_active_sessions?: number | null
          password_expiry_days?: number | null
          prevent_password_reuse?: number | null
          require_reauth_for_sensitive?: boolean | null
          require_strong_password?: boolean | null
          session_timeout_minutes?: number | null
          suspicious_activity_alerts?: boolean | null
          totp_secret?: string | null
          two_factor_enabled?: boolean | null
          two_factor_method?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_info: Json | null
          expires_at: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          is_trusted_device: boolean | null
          last_activity_at: string | null
          location_info: Json | null
          login_method: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          is_trusted_device?: boolean | null
          last_activity_at?: string | null
          location_info?: Json | null
          login_method?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          is_trusted_device?: boolean | null
          last_activity_at?: string | null
          location_info?: Json | null
          login_method?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "trusted_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          date_format: string | null
          id: string
          language: string
          notification_browser: boolean | null
          notification_email: boolean | null
          notification_preferences: Json | null
          notification_push: boolean | null
          theme_mode: string
          time_format: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_format?: string | null
          id?: string
          language?: string
          notification_browser?: boolean | null
          notification_email?: boolean | null
          notification_preferences?: Json | null
          notification_push?: boolean | null
          theme_mode?: string
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_format?: string | null
          id?: string
          language?: string
          notification_browser?: boolean | null
          notification_email?: boolean | null
          notification_preferences?: Json | null
          notification_push?: boolean | null
          theme_mode?: string
          time_format?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_locked_until: string | null
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          backup_codes: Json | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string | null
          gender: string | null
          google_account_linked: boolean | null
          google_user_id: string | null
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          job_title: string | null
          last_activity_at: string | null
          last_name: string | null
          last_password_change: string | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          privacy_settings: Json | null
          role: string
          security_notifications_enabled: boolean | null
          status: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          account_locked_until?: string | null
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          backup_codes?: Json | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          failed_login_attempts?: number | null
          first_name?: string | null
          gender?: string | null
          google_account_linked?: boolean | null
          google_user_id?: string | null
          id?: string
          is_active?: boolean
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          job_title?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          last_password_change?: string | null
          name: string
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          privacy_settings?: Json | null
          role: string
          security_notifications_enabled?: boolean | null
          status?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          account_locked_until?: string | null
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          backup_codes?: Json | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          failed_login_attempts?: number | null
          first_name?: string | null
          gender?: string | null
          google_account_linked?: boolean | null
          google_user_id?: string | null
          id?: string
          is_active?: boolean
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          job_title?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          last_password_change?: string | null
          name?: string
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          privacy_settings?: Json | null
          role?: string
          security_notifications_enabled?: boolean | null
          status?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts_count: number | null
          code: string
          code_type: string
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_used: boolean | null
          max_attempts: number | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          code: string
          code_type: string
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_used?: boolean | null
          max_attempts?: number | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          code?: string
          code_type?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_used?: boolean | null
          max_attempts?: number | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          booking_id: string | null
          error_message: string | null
          id: string
          message_content: string
          organization_id: string
          recipient_phone: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          organization_id: string
          recipient_phone: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          organization_id?: string
          recipient_phone?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          template_content: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          template_content: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          template_content?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      wholesale_tiers: {
        Row: {
          created_at: string | null
          id: string
          min_quantity: number
          organization_id: string
          price: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          min_quantity: number
          organization_id: string
          price: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          min_quantity?: number
          organization_id?: string
          price?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "wholesale_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      yalidine_centers: {
        Row: {
          address: string | null
          center_id: number
          commune_id: number
          commune_name: string | null
          gps: string | null
          last_updated_at: string | null
          name: string
          organization_id: string
          wilaya_id: number
          wilaya_name: string | null
        }
        Insert: {
          address?: string | null
          center_id: number
          commune_id: number
          commune_name?: string | null
          gps?: string | null
          last_updated_at?: string | null
          name: string
          organization_id: string
          wilaya_id: number
          wilaya_name?: string | null
        }
        Update: {
          address?: string | null
          center_id?: number
          commune_id?: number
          commune_name?: string | null
          gps?: string | null
          last_updated_at?: string | null
          name?: string
          organization_id?: string
          wilaya_id?: number
          wilaya_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yalidine_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "yalidine_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yalidine_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      yalidine_centers_global: {
        Row: {
          address: string | null
          center_id: number
          commune_id: number
          commune_name: string
          lat: number | null
          lng: number | null
          name: string
          wilaya_id: number
          wilaya_name: string
        }
        Insert: {
          address?: string | null
          center_id: number
          commune_id: number
          commune_name: string
          lat?: number | null
          lng?: number | null
          name: string
          wilaya_id: number
          wilaya_name: string
        }
        Update: {
          address?: string | null
          center_id?: number
          commune_id?: number
          commune_name?: string
          lat?: number | null
          lng?: number | null
          name?: string
          wilaya_id?: number
          wilaya_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "yalidine_centers_global_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "yalidine_municipalities_global"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yalidine_centers_global_wilaya_id_fkey"
            columns: ["wilaya_id"]
            isOneToOne: false
            referencedRelation: "yalidine_provinces_global"
            referencedColumns: ["id"]
          },
        ]
      }
      yalidine_fees: {
        Row: {
          cod_percentage: number | null
          commune_id: number
          commune_name: string | null
          economic_desk: number | null
          economic_home: number | null
          express_desk: number | null
          express_home: number | null
          from_wilaya_id: number
          from_wilaya_name: string | null
          home_fee: number | null
          id: number
          insurance_percentage: number | null
          is_home_available: boolean | null
          is_stop_desk_available: boolean | null
          last_updated_at: string | null
          organization_id: string
          oversize_fee: number | null
          retour_fee: number | null
          stop_desk_fee: number | null
          to_wilaya_id: number
          to_wilaya_name: string | null
          zone: number | null
        }
        Insert: {
          cod_percentage?: number | null
          commune_id: number
          commune_name?: string | null
          economic_desk?: number | null
          economic_home?: number | null
          express_desk?: number | null
          express_home?: number | null
          from_wilaya_id: number
          from_wilaya_name?: string | null
          home_fee?: number | null
          id?: number
          insurance_percentage?: number | null
          is_home_available?: boolean | null
          is_stop_desk_available?: boolean | null
          last_updated_at?: string | null
          organization_id: string
          oversize_fee?: number | null
          retour_fee?: number | null
          stop_desk_fee?: number | null
          to_wilaya_id: number
          to_wilaya_name?: string | null
          zone?: number | null
        }
        Update: {
          cod_percentage?: number | null
          commune_id?: number
          commune_name?: string | null
          economic_desk?: number | null
          economic_home?: number | null
          express_desk?: number | null
          express_home?: number | null
          from_wilaya_id?: number
          from_wilaya_name?: string | null
          home_fee?: number | null
          id?: number
          insurance_percentage?: number | null
          is_home_available?: boolean | null
          is_stop_desk_available?: boolean | null
          last_updated_at?: string | null
          organization_id?: string
          oversize_fee?: number | null
          retour_fee?: number | null
          stop_desk_fee?: number | null
          to_wilaya_id?: number
          to_wilaya_name?: string | null
          zone?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yalidine_fees_from_wilaya_id_fkey"
            columns: ["from_wilaya_id"]
            isOneToOne: false
            referencedRelation: "yalidine_provinces_global"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yalidine_fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "yalidine_fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yalidine_fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "yalidine_fees_to_wilaya_id_fkey"
            columns: ["to_wilaya_id"]
            isOneToOne: false
            referencedRelation: "yalidine_provinces_global"
            referencedColumns: ["id"]
          },
        ]
      }
      yalidine_global_info: {
        Row: {
          id: number
          last_updated_at: string | null
        }
        Insert: {
          id?: number
          last_updated_at?: string | null
        }
        Update: {
          id?: number
          last_updated_at?: string | null
        }
        Relationships: []
      }
      yalidine_municipalities: {
        Row: {
          delivery_time_parcel: number | null
          delivery_time_payment: number | null
          has_stop_desk: boolean | null
          id: number
          is_deliverable: boolean | null
          last_updated_at: string | null
          name: string
          organization_id: string
          wilaya_id: number
          wilaya_name: string | null
        }
        Insert: {
          delivery_time_parcel?: number | null
          delivery_time_payment?: number | null
          has_stop_desk?: boolean | null
          id: number
          is_deliverable?: boolean | null
          last_updated_at?: string | null
          name: string
          organization_id: string
          wilaya_id: number
          wilaya_name?: string | null
        }
        Update: {
          delivery_time_parcel?: number | null
          delivery_time_payment?: number | null
          has_stop_desk?: boolean | null
          id?: number
          is_deliverable?: boolean | null
          last_updated_at?: string | null
          name?: string
          organization_id?: string
          wilaya_id?: number
          wilaya_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yalidine_municipalities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "yalidine_municipalities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yalidine_municipalities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      yalidine_municipalities_global: {
        Row: {
          delivery_time_parcel: number | null
          delivery_time_payment: number | null
          has_stop_desk: boolean | null
          id: number
          is_deliverable: boolean | null
          name: string
          name_ar: string | null
          wilaya_id: number
          wilaya_name: string
          wilaya_name_ar: string | null
        }
        Insert: {
          delivery_time_parcel?: number | null
          delivery_time_payment?: number | null
          has_stop_desk?: boolean | null
          id: number
          is_deliverable?: boolean | null
          name: string
          name_ar?: string | null
          wilaya_id: number
          wilaya_name: string
          wilaya_name_ar?: string | null
        }
        Update: {
          delivery_time_parcel?: number | null
          delivery_time_payment?: number | null
          has_stop_desk?: boolean | null
          id?: number
          is_deliverable?: boolean | null
          name?: string
          name_ar?: string | null
          wilaya_id?: number
          wilaya_name?: string
          wilaya_name_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yalidine_municipalities_global_wilaya_id_fkey"
            columns: ["wilaya_id"]
            isOneToOne: false
            referencedRelation: "yalidine_provinces_global"
            referencedColumns: ["id"]
          },
        ]
      }
      yalidine_provinces: {
        Row: {
          id: number
          is_deliverable: boolean | null
          last_updated_at: string | null
          name: string
          organization_id: string
          zone: number | null
        }
        Insert: {
          id: number
          is_deliverable?: boolean | null
          last_updated_at?: string | null
          name: string
          organization_id: string
          zone?: number | null
        }
        Update: {
          id?: number
          is_deliverable?: boolean | null
          last_updated_at?: string | null
          name?: string
          organization_id?: string
          zone?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yalidine_provinces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "yalidine_provinces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yalidine_provinces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      yalidine_provinces_global: {
        Row: {
          id: number
          is_deliverable: boolean | null
          name: string
          name_ar: string | null
          zone: number | null
        }
        Insert: {
          id: number
          is_deliverable?: boolean | null
          name: string
          name_ar?: string | null
          zone?: number | null
        }
        Update: {
          id?: number
          is_deliverable?: boolean | null
          name?: string
          name_ar?: string | null
          zone?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      abandoned_carts_view: {
        Row: {
          abandoned_hours: number | null
          address: string | null
          calculated_delivery_fee: number | null
          cart_items: Json | null
          created_at: string | null
          custom_fields_data: Json | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_option: string | null
          discount_amount: number | null
          id: string | null
          item_count: number | null
          last_activity_at: string | null
          municipality: string | null
          municipality_name: string | null
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          product_color_id: string | null
          product_id: string | null
          product_image: string | null
          product_name: string | null
          product_price: number | null
          product_size_id: string | null
          province: string | null
          province_name: string | null
          quantity: number | null
          recovered_at: string | null
          recovered_by: string | null
          recovered_order_id: string | null
          source: string | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "abandoned_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      activation_code_statistics: {
        Row: {
          active_codes: number | null
          batch_id: string | null
          batch_name: string | null
          created_at: string | null
          expired_codes: number | null
          plan_name: string | null
          revoked_codes: number | null
          total_codes: number | null
          used_codes: number | null
        }
        Relationships: []
      }
      active_testimonials: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_avatar: string | null
          customer_name: string | null
          id: string | null
          organization_id: string | null
          product_image: string | null
          product_name: string | null
          purchase_date: string | null
          rating: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_avatar?: string | null
          customer_name?: string | null
          id?: string | null
          organization_id?: string | null
          product_image?: string | null
          product_name?: string | null
          purchase_date?: string | null
          rating?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_avatar?: string | null
          customer_name?: string | null
          id?: string | null
          organization_id?: string | null
          product_image?: string | null
          product_name?: string | null
          purchase_date?: string | null
          rating?: number | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customer_testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      avatar_storage_stats: {
        Row: {
          avatar_count: number | null
          email: string | null
          last_upload: string | null
          name: string | null
          total_size_bytes: number | null
          total_size_mb: number | null
          user_id: string | null
        }
        Relationships: []
      }
      conversion_settings_view: {
        Row: {
          organization_id: string | null
          product_id: string | null
          settings: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_marketing_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      inventory_log_with_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          id: string | null
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          product_id: string | null
          quantity: number | null
          reference_id: string | null
          reference_type: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "organization_inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_to_reorder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "reports_product_profitability"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory_status: {
        Row: {
          avg_daily_sales: number | null
          current_stock: number | null
          estimated_days_remaining: number | null
          id: string | null
          last_30_days_sales: number | null
          min_stock_level: number | null
          name: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          sku: string | null
          status: string | null
        }
        Insert: {
          avg_daily_sales?: never
          current_stock?: number | null
          estimated_days_remaining?: never
          id?: string | null
          last_30_days_sales?: never
          min_stock_level?: number | null
          name?: string | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku?: string | null
          status?: never
        }
        Update: {
          avg_daily_sales?: never
          current_stock?: number | null
          estimated_days_remaining?: never
          id?: string | null
          last_30_days_sales?: never
          min_stock_level?: number | null
          name?: string | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku?: string | null
          status?: never
        }
        Relationships: []
      }
      landing_page_submissions_view: {
        Row: {
          created_at: string | null
          data: Json | null
          form_id: string | null
          id: string | null
          is_processed: boolean | null
          landing_page_id: string | null
          landing_page_name: string | null
          landing_page_slug: string | null
          notes: string | null
          organization_id: string | null
          processed_at: string | null
          product_id: string | null
          product_name: string | null
          product_price: number | null
          updated_at: string | null
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
      mv_active_beforeafter_components: {
        Row: {
          background_color: string | null
          component_id: string | null
          description: string | null
          is_published: boolean | null
          items: Json | null
          landing_page_id: string | null
          landing_page_slug: string | null
          layout: string | null
          organization_id: string | null
          position: number | null
          show_labels: boolean | null
          sliders_count: number | null
          text_color: string | null
          title: string | null
        }
        Relationships: []
      }
      mv_landing_page_forms: {
        Row: {
          background_color: string | null
          button_text: string | null
          component_id: string | null
          form_fields: Json | null
          form_id: string | null
          form_name: string | null
          form_title: string | null
          is_active: boolean | null
          landing_page_id: string | null
          landing_page_slug: string | null
          organization_id: string | null
          position: number | null
          product_id: string | null
          product_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_components_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
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
      mv_organization_stats: {
        Row: {
          completed_orders: number | null
          last_updated: string | null
          low_stock_products: number | null
          new_customers: number | null
          organization_id: string | null
          organization_name: string | null
          pending_orders: number | null
          total_customers: number | null
          total_orders: number | null
          total_products: number | null
          total_revenue: number | null
          total_services: number | null
        }
        Relationships: []
      }
      online_orders_view: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_order_number: number | null
          customer_phone: string | null
          discount: number | null
          employee_id: string | null
          id: string | null
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          payment_status: string | null
          province: string | null
          shipping_address_id: string | null
          shipping_cost: number | null
          shipping_method: string | null
          shipping_phone: string | null
          slug: string | null
          status: string | null
          street_address: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_with_details_view: {
        Row: {
          call_confirmation_notes: string | null
          call_confirmation_status_id: number | null
          call_confirmation_updated_at: string | null
          call_confirmation_updated_by: string | null
          call_status_color: string | null
          call_status_icon: string | null
          call_status_name: string | null
          created_at: string | null
          created_from: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_order_number: number | null
          customer_phone: string | null
          discount: number | null
          employee_id: string | null
          form_data: Json | null
          id: string | null
          metadata: Json | null
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          payment_status: string | null
          shipping_address_id: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_method: string | null
          shipping_name: string | null
          shipping_option: string | null
          shipping_phone: string | null
          shipping_state: string | null
          shipping_street: string | null
          slug: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_orders_call_confirmation_status_id_fkey"
            columns: ["call_confirmation_status_id"]
            isOneToOne: false
            referencedRelation: "call_confirmation_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "online_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_financial_summary: {
        Row: {
          expenses: number | null
          income: number | null
          net_amount: number | null
          organization_id: string | null
          transaction_count: number | null
          transaction_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_inventory_summary: {
        Row: {
          category: string | null
          min_stock_level: number | null
          name: string | null
          organization_id: string | null
          price: number | null
          product_id: string | null
          purchase_price: number | null
          reorder_level: number | null
          reorder_quantity: number | null
          sku: string | null
          stock_quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organization_order_summary: {
        Row: {
          created_at: string | null
          customer_name: string | null
          employee_name: string | null
          order_id: string | null
          organization_id: string | null
          payment_status: string | null
          status: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      overdue_supplier_purchases: {
        Row: {
          balance_due: number | null
          days_overdue: number | null
          due_date: string | null
          id: string | null
          organization_id: string | null
          paid_amount: number | null
          payment_status: string | null
          purchase_date: string | null
          purchase_number: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_payment_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      password_security_stats: {
        Row: {
          changes_last_30_days: number | null
          email: string | null
          failed_attempts_last_7_days: number | null
          id: string | null
          last_password_change: string | null
          name: string | null
          needs_password_change: boolean | null
          role: string | null
        }
        Insert: {
          changes_last_30_days?: never
          email?: string | null
          failed_attempts_last_7_days?: never
          id?: string | null
          last_password_change?: never
          name?: string | null
          needs_password_change?: never
          role?: string | null
        }
        Update: {
          changes_last_30_days?: never
          email?: string | null
          failed_attempts_last_7_days?: never
          id?: string | null
          last_password_change?: never
          name?: string | null
          needs_password_change?: never
          role?: string | null
        }
        Relationships: []
      }
      pos_orders_with_items_count: {
        Row: {
          amount_paid: number | null
          consider_remaining_as_partial: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_order_number: number | null
          discount: number | null
          employee_id: string | null
          id: string | null
          is_online: boolean | null
          items_count: number | null
          metadata: Json | null
          notes: string | null
          organization_id: string | null
          payment_method: string | null
          payment_status: string | null
          remaining_amount: number | null
          shipping_address_id: string | null
          shipping_cost: number | null
          shipping_method: string | null
          slug: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          consider_remaining_as_partial?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          customer_order_number?: number | null
          discount?: number | null
          employee_id?: string | null
          id?: string | null
          is_online?: boolean | null
          items_count?: never
          metadata?: Json | null
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          remaining_amount?: number | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          slug?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          consider_remaining_as_partial?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          customer_order_number?: number | null
          discount?: number | null
          employee_id?: string | null
          id?: string | null
          is_online?: boolean | null
          items_count?: never
          metadata?: Json | null
          notes?: string | null
          organization_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          remaining_amount?: number | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          slug?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "avatar_storage_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "password_security_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "user_access_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      products_to_reorder: {
        Row: {
          estimated_cost: number | null
          id: string | null
          min_stock_level: number | null
          name: string | null
          purchase_price: number | null
          reorder_level: number | null
          reorder_quantity: number | null
          sku: string | null
          status: string | null
          stock_quantity: number | null
        }
        Insert: {
          estimated_cost?: never
          id?: string | null
          min_stock_level?: number | null
          name?: string | null
          purchase_price?: number | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku?: string | null
          status?: never
          stock_quantity?: number | null
        }
        Update: {
          estimated_cost?: never
          id?: string | null
          min_stock_level?: number | null
          name?: string | null
          purchase_price?: number | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku?: string | null
          status?: never
          stock_quantity?: number | null
        }
        Relationships: []
      }
      reports_daily_sales: {
        Row: {
          average_order_value: number | null
          in_store_orders: number | null
          in_store_sales: number | null
          online_orders: number | null
          online_sales: number | null
          order_count: number | null
          organization_id: string | null
          sale_date: string | null
          total_discounts: number | null
          total_sales: number | null
          unique_customers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      reports_expenses_by_category: {
        Row: {
          average_amount: number | null
          category: string | null
          expense_count: number | null
          expense_month: string | null
          organization_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      reports_inventory_valuation: {
        Row: {
          category: string | null
          inventory_cost_value: number | null
          inventory_retail_value: number | null
          organization_id: string | null
          potential_profit: number | null
          product_count: number | null
          total_stock: number | null
          units_sold_last_30_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      reports_monthly_financial_summary: {
        Row: {
          month: string | null
          net_profit: number | null
          organization_id: string | null
          product_sales: number | null
          profit_margin_percentage: number | null
          service_sales: number | null
          total_expenses: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      reports_product_profitability: {
        Row: {
          category: string | null
          organization_id: string | null
          product_id: string | null
          product_name: string | null
          profit_margin_percentage: number | null
          profit_per_unit: number | null
          purchase_price: number | null
          selling_price: number | null
          total_profit: number | null
          total_units_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      reports_sales_by_category: {
        Row: {
          category: string | null
          estimated_profit: number | null
          order_count: number | null
          organization_id: string | null
          sale_month: string | null
          total_sales: number | null
          units_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      reports_sales_trends: {
        Row: {
          average_order_value: number | null
          daily_total: number | null
          day: string | null
          order_count: number | null
          organization_id: string | null
          unique_customers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      safe_users_view: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          name: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      shipping_data_view: {
        Row: {
          api_key: string | null
          api_token: string | null
          auto_shipping: boolean | null
          is_enabled: boolean | null
          organization_id: string | null
          organization_name: string | null
          provider_code: string | null
          provider_id: number | null
          provider_name: string | null
          settings: Json | null
          track_updates: boolean | null
        }
        Relationships: []
      }
      supplier_payment_summary: {
        Row: {
          company_name: string | null
          name: string | null
          organization_id: string | null
          supplier_id: string | null
          total_outstanding: number | null
          total_paid_amount: number | null
          total_purchase_amount: number | null
          total_purchases: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      supplier_performance: {
        Row: {
          avg_delivery_days: number | null
          company_name: string | null
          name: string | null
          organization_id: string | null
          rating: number | null
          supplier_id: string | null
          total_purchases: number | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      user_access_view: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          is_org_admin: boolean | null
          name: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_org_admin?: boolean | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_active?: boolean | null
          is_org_admin?: boolean | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      yalidine_settings_with_origin: {
        Row: {
          api_key: string | null
          api_token: string | null
          auto_shipping: boolean | null
          id: number | null
          is_enabled: boolean | null
          organization_id: string | null
          origin_wilaya_id: number | null
          origin_wilaya_name: string | null
          origin_wilaya_zone: number | null
          settings: Json | null
          track_updates: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_provider_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shipping_provider_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_provider_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_data_view"
            referencedColumns: ["organization_id"]
          },
        ]
      }
    }
    Functions: {
      activate_subscription: {
        Args: { p_activation_code: string; p_organization_id: string }
        Returns: {
          success: boolean
          message: string
          subscription_id: string
          subscription_end_date: string
        }[]
      }
      add_call_confirmation_status: {
        Args: {
          p_name: string
          p_organization_id: string
          p_color?: string
          p_icon?: string
        }
        Returns: number
      }
      add_column_if_not_exists: {
        Args: {
          p_table_name: string
          p_column_name: string
          p_column_type: string
        }
        Returns: boolean
      }
      add_currency_sale: {
        Args: {
          p_currency_id: string
          p_amount: number
          p_dinar_amount: number
          p_customer_details: Json
          p_status: string
          p_notes: string
          p_created_by: string
          p_organization_id: string
        }
        Returns: string
      }
      add_customer_testimonial: {
        Args: {
          p_organization_id: string
          p_customer_name: string
          p_customer_avatar: string
          p_rating: number
          p_comment: string
          p_verified?: boolean
          p_purchase_date?: string
          p_product_name?: string
          p_product_image?: string
        }
        Returns: string
      }
      add_default_call_confirmation_statuses: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      add_digital_currency: {
        Args: {
          p_name: string
          p_code: string
          p_type: string
          p_icon: string
          p_exchange_rate: number
          p_organization_id: string
        }
        Returns: string
      }
      add_employee_activity: {
        Args: {
          p_employee_id: string
          p_action_type: string
          p_action_details: string
          p_related_entity?: string
          p_related_entity_id?: string
        }
        Returns: string
      }
      add_employee_salary: {
        Args: {
          p_employee_id: string
          p_amount: number
          p_start_date: string
          p_end_date: string
          p_type: string
          p_status: string
          p_notes: string
        }
        Returns: string
      }
      add_flexi_network: {
        Args: {
          p_name: string
          p_description?: string
          p_icon?: string
          p_is_active?: boolean
          p_organization_id?: string
        }
        Returns: string
      }
      add_flexi_sale: {
        Args: {
          p_network_id: string
          p_amount: number
          p_phone_number: string
          p_status: string
          p_notes: string
          p_created_by: string
          p_organization_id: string
        }
        Returns: string
      }
      add_inventory_log: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_type: string
          p_reference_id?: string
          p_reference_type?: string
          p_notes?: string
          p_created_by?: string
        }
        Returns: string
      }
      add_landing_page_component: {
        Args: {
          p_landing_page_id: string
          p_type: string
          p_settings?: Json
          p_is_active?: boolean
        }
        Returns: string
      }
      add_landing_page_submission: {
        Args: {
          p_landing_page_id: string
          p_form_id: string
          p_product_id: string
          p_data: Json
        }
        Returns: string
      }
      add_order_item: {
        Args: {
          _id: string
          _order_id: string
          _product_id: string
          _product_name: string
          _quantity: number
          _unit_price: number
          _total_price: number
          _is_digital: boolean
          _organization_id: string
          _name: string
          _slug: string
          _is_wholesale?: boolean
          _original_price?: number
        }
        Returns: string
      }
      add_origin_wilaya_to_yalidine_settings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auto_save_component_settings: {
        Args: {
          p_organization_id: string
          p_component_type: string
          p_settings: Json
        }
        Returns: Json
      }
      batch_upsert_yalidine_fees: {
        Args: { p_data: Json }
        Returns: number
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      bulk_update_order_status: {
        Args: { p_order_ids: string[]; p_status: string; p_user_id: string }
        Returns: number
      }
      bulk_update_orders_status: {
        Args: {
          p_order_ids: string[]
          p_status: string
          p_organization_id: string
          p_user_id?: string
        }
        Returns: {
          updated_count: number
          success: boolean
        }[]
      }
      calculate_conversion_rates: {
        Args: { org_id: string; time_range?: unknown }
        Returns: {
          recovery_rate: number
          conversion_rate: number
        }[]
      }
      calculate_employee_performance_score: {
        Args: { p_employee_id: string; p_organization_id: string }
        Returns: number
      }
      calculate_order_financial_impact: {
        Args: { p_order_id: string }
        Returns: {
          actual_revenue: number
          pending_revenue: number
        }[]
      }
      calculate_profit_margin: {
        Args: { purchase_price: number; selling_price: number }
        Returns: number
      }
      calculate_shipping_fee: {
        Args: {
          p_org_id: string
          p_to_wilaya_id: number
          p_to_municipality_id: number
          p_delivery_type: string
          p_weight: number
        }
        Returns: number
      }
      calculate_wholesale_sales: {
        Args: { p_start_date: string; p_end_date: string }
        Returns: {
          total_wholesale_sales: number
          total_wholesale_items: number
          total_wholesale_savings: number
          wholesale_percentage: number
        }[]
      }
      calculate_yalidine_delivery_fee: {
        Args: {
          p_organization_id: string
          p_from_wilaya_id: number
          p_to_wilaya_id: number
          p_commune_id: number
          p_weight: number
          p_dimensions: Json
          p_is_stop_desk?: boolean
        }
        Returns: Json
      }
      calculate_yalidine_shipping_cost: {
        Args: {
          org_id: string
          origin_province_id: number
          destination_province_id: number
          parcel_weight?: number
        }
        Returns: number
      }
      calculate_zrexpress_shipping: {
        Args: {
          p_organization_id: string
          p_wilaya_id: string
          p_is_home_delivery?: boolean
        }
        Returns: Database["public"]["CompositeTypes"]["shipping_calculation_result"]
      }
      can_add_product: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_create_product: {
        Args: { target_org_id: string }
        Returns: boolean
      }
      can_create_product_simple: {
        Args: { target_org_id: string }
        Returns: boolean
      }
      can_delete_product: {
        Args: { product_id: string }
        Returns: boolean
      }
      can_edit_product: {
        Args: { product_id: string }
        Returns: boolean
      }
      cancel_pos_order: {
        Args: {
          p_order_id: string
          p_items_to_cancel?: string[]
          p_cancellation_reason?: string
          p_restore_inventory?: boolean
          p_cancelled_by?: string
        }
        Returns: Json
      }
      check_all_wholesale_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          product_id: string
          product_name: string
          has_issues: boolean
          issue_description: string
        }[]
      }
      check_debt_permission: {
        Args: { permission: string }
        Returns: boolean
      }
      check_domain_availability: {
        Args: { p_domain: string; p_organization_id?: string }
        Returns: Json
      }
      check_failed_login_attempts: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_function_exists: {
        Args: { function_name: string }
        Returns: boolean
      }
      check_order_system_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          column_name: string
          does_exist: boolean
          foreign_key_constraint: string
        }[]
      }
      check_password_change_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_password_strength: {
        Args: { password: string }
        Returns: Json
      }
      check_product_delete_permission: {
        Args: { p_product_id: string; p_user_id: string }
        Returns: Json
      }
      check_product_permissions: {
        Args:
          | { action_type: string; target_org_id?: string }
          | { target_org_id: string }
        Returns: boolean
      }
      check_product_permissions_simple: {
        Args: { target_org_id: string }
        Returns: boolean
      }
      check_products_security_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_name: string
          policy_type: string
          is_enabled: boolean
          description: string
        }[]
      }
      check_recurring_expenses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_service_permission: {
        Args: { permission: string }
        Returns: boolean
      }
      check_storage_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_unsaved_changes: {
        Args: {
          p_organization_id: string
          p_component_type: string
          p_current_settings: Json
        }
        Returns: Json
      }
      check_user_organization_access: {
        Args: { p_user_id: string; p_organization_id: string }
        Returns: boolean
      }
      check_user_organization_permissions: {
        Args: { user_id: string; org_id: string }
        Returns: boolean
      }
      check_user_permissions: {
        Args: { target_org_id?: string }
        Returns: boolean
      }
      check_user_requires_2fa: {
        Args:
          | { p_user_email: string }
          | {
              p_user_email: string
              p_organization_id?: string
              p_domain?: string
              p_subdomain?: string
            }
        Returns: Json
      }
      check_yalidine_fees_health: {
        Args: Record<PropertyKey, never> | { p_organization_id?: string }
        Returns: {
          total_original_records: number
          total_new_records: number
          original_inserts: number
          original_deletes: number
          new_inserts: number
          new_deletes: number
          unique_combinations: number
        }[]
      }
      check_yalidine_fees_status: {
        Args: { p_organization_id: string }
        Returns: {
          table_name: string
          record_count: number
          status: string
        }[]
      }
      clean_existing_shipping_clone_ids: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_trusted_devices: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_verification_codes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_abandoned_carts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stats_refresh_log: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_unused_beforeafter_images: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clone_shipping_provider: {
        Args: {
          p_organization_id: string
          p_original_provider_id: number
          p_new_name: string
          p_copy_api_credentials?: boolean
          p_enable_sync?: boolean
        }
        Returns: number
      }
      complete_supplier_payment: {
        Args: {
          p_purchase_id: string
          p_amount: number
          p_payment_method: string
          p_reference_number?: string
          p_notes?: string
        }
        Returns: string
      }
      convert_landing_page_submission_to_order: {
        Args: { submission_id: string }
        Returns: string
      }
      convert_to_default_provider: {
        Args: { organization_id_param: string }
        Returns: string
      }
      create_activation_codes: {
        Args:
          | {
              p_batch_id: string
              p_plan_id: string
              p_count: number
              p_billing_cycle?: string
              p_expires_at?: string
              p_created_by?: string
              p_notes?: string
            }
          | {
              p_batch_id: string
              p_plan_id: string
              p_count: number
              p_expires_at: string
              p_created_by: string
              p_notes: string
            }
        Returns: {
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
        }[]
      }
      create_custom_page: {
        Args: {
          p_organization_id: string
          p_title: string
          p_slug: string
          p_content: string
          p_meta_description?: string
        }
        Returns: {
          id: string
          title: string
          slug: string
          content: string
          meta_description: string
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      create_default_form_for_organization: {
        Args: { p_organization_id: string }
        Returns: string
      }
      create_domain_verifications_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_employee_activities_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_employee_functions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_employee_salaries_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_employee_securely: {
        Args: {
          employee_email: string
          employee_password: string
          employee_name: string
          p_organization_id: string
          employee_phone?: string
          employee_permissions?: Json
        }
        Returns: {
          account_locked_until: string | null
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          backup_codes: Json | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string | null
          gender: string | null
          google_account_linked: boolean | null
          google_user_id: string | null
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          job_title: string | null
          last_activity_at: string | null
          last_name: string | null
          last_password_change: string | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          privacy_settings: Json | null
          role: string
          security_notifications_enabled: boolean | null
          status: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }
      }
      create_function_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_invoice_from_pos_order: {
        Args: { order_id: string }
        Returns: string
      }
      create_landing_page: {
        Args: {
          p_organization_id: string
          p_name: string
          p_slug: string
          p_title?: string
          p_description?: string
          p_keywords?: string
          p_is_published?: boolean
        }
        Returns: string
      }
      create_organization: {
        Args:
          | { org_name: string; org_description?: string; org_domain?: string }
          | {
              org_name: string
              org_description?: string
              org_domain?: string
              org_subdomain?: string
            }
        Returns: string
      }
      create_organization_file_upload_url: {
        Args: {
          organization_id: string
          file_type: string
          file_name: string
          content_type?: string
        }
        Returns: string
      }
      create_organization_final: {
        Args: { org_name: string; org_subdomain: string }
        Returns: string
      }
      create_organization_fixed: {
        Args: {
          org_name: string
          org_description?: string
          org_domain?: string
          org_subdomain?: string
        }
        Returns: string
      }
      create_organization_safe: {
        Args: {
          p_name: string
          p_subdomain: string
          p_owner_id: string
          p_settings?: Json
        }
        Returns: string
      }
      create_organization_simple: {
        Args: { org_name: string; org_subdomain: string }
        Returns: string
      }
      create_organization_with_audit: {
        Args: { org_data: Json; user_id: string }
        Returns: string
      }
      create_pos_order: {
        Args:
          | {
              p_organization_id: string
              p_customer_id: string
              p_employee_id: string
              p_items: Json
              p_total_amount: number
              p_payment_method?: string
              p_payment_status?: string
              p_notes?: string
            }
          | {
              p_organization_id: string
              p_customer_id: string
              p_employee_id: string
              p_items: Json
              p_total_amount: number
              p_payment_method?: string
              p_payment_status?: string
              p_notes?: string
            }
        Returns: {
          admin_notes: string | null
          amount_paid: number | null
          completed_at: string | null
          consider_remaining_as_partial: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          customer_order_number: number | null
          discount: number | null
          employee_id: string | null
          id: string
          is_online: boolean
          metadata: Json | null
          notes: string | null
          organization_id: string
          payment_method: string
          payment_status: string
          pos_order_type: string | null
          remaining_amount: number | null
          shipping_address_id: string | null
          shipping_cost: number | null
          shipping_method: string | null
          slug: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
        }
      }
      create_pos_order_safe: {
        Args: {
          p_organization_id: string
          p_customer_id: string
          p_items: Json
          p_total_amount: number
          p_employee_id?: string
          p_payment_method?: string
          p_payment_status?: string
          p_notes?: string
        }
        Returns: Json
      }
      create_product_color: {
        Args: {
          product_id: string
          name: string
          color_code: string
          quantity: number
          price?: number
          image_url?: string
          is_default?: boolean
        }
        Returns: string
      }
      create_product_image: {
        Args: { product_id: string; image_url: string; sort_order?: number }
        Returns: string
      }
      create_product_safe: {
        Args: { product_data: Json }
        Returns: Json
      }
      create_product_safely: {
        Args: { product_data: Json }
        Returns: string
      }
      create_product_size: {
        Args: {
          color_id: string
          size_name: string
          quantity: number
          price?: number
          barcode?: string
          is_default?: boolean
        }
        Returns: string
      }
      create_product_with_user_context: {
        Args: { product_data: Json; user_id_param: string }
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          form_template_id: string | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean
          is_featured: boolean | null
          is_new: boolean | null
          is_sold_by_unit: boolean | null
          last_inventory_update: string | null
          min_partial_wholesale_quantity: number | null
          min_stock_level: number | null
          min_wholesale_quantity: number | null
          money_back_text: string | null
          name: string
          name_for_shipping: string | null
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          shipping_clone_id: number | null
          shipping_provider_id: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string | null
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          use_shipping_clone: boolean
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }
      }
      create_sample_distribution_data: {
        Args: { p_organization_id: string }
        Returns: string
      }
      create_simple_device: {
        Args: {
          p_user_id: string
          p_device_info?: Json
          p_device_fingerprint?: string
          p_ip_address?: string
        }
        Returns: string
      }
      create_simple_session: {
        Args: {
          p_user_id: string
          p_session_token: string
          p_device_info?: Json
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
      create_store_about_component: {
        Args: { p_organization_id: string }
        Returns: string
      }
      create_super_admin: {
        Args: { p_email: string; p_name: string }
        Returns: undefined
      }
      create_supplier_purchase: {
        Args: {
          p_organization_id: string
          p_purchase_number: string
          p_supplier_id: string
          p_purchase_date: string
          p_due_date: string
          p_total_amount: number
          p_paid_amount: number
          p_status: string
          p_payment_terms: string
          p_notes: string
          p_items: Json
        }
        Returns: Json
      }
      create_sync_columns_trigger: {
        Args: { p_table_name: string; p_column_mapping: Json }
        Returns: boolean
      }
      create_user: {
        Args: {
          user_id: string
          user_email: string
          user_name: string
          user_phone: string
          user_role: string
          user_permissions: Json
          user_is_active: boolean
        }
        Returns: undefined
      }
      create_user_session: {
        Args:
          | {
              p_user_id: string
              p_session_token: string
              p_ip_address?: unknown
              p_user_agent?: string
              p_device_info?: Json
            }
          | {
              p_user_id: string
              p_session_token: string
              p_ip_address?: unknown
              p_user_agent?: string
              p_device_info?: Json
              p_login_method?: string
            }
        Returns: string
      }
      create_user_session_v2: {
        Args: {
          p_user_id: string
          p_session_token: string
          p_ip_address: string
          p_user_agent: string
          p_device_info?: Json
          p_login_method?: string
        }
        Returns: string
      }
      debug_auth_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      debug_user_permissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          user_exists: boolean
          organization_id: string
          is_active: boolean
          is_org_admin: boolean
          is_super_admin: boolean
          permissions: Json
        }[]
      }
      delete_all_yalidine_fees: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      delete_component_settings: {
        Args: { p_organization_id: string; p_component_type: string }
        Returns: boolean
      }
      delete_currency_balance: {
        Args: { p_balance_id: string }
        Returns: boolean
      }
      delete_custom_page: {
        Args: { p_page_id: string }
        Returns: boolean
      }
      delete_customer_testimonial: {
        Args: { p_testimonial_id: string }
        Returns: boolean
      }
      delete_digital_currency: {
        Args: { p_currency_id: string }
        Returns: boolean
      }
      delete_domain_verification: {
        Args: { p_organization_id: string; p_domain: string }
        Returns: undefined
      }
      delete_flexi_balance: {
        Args: { p_balance_id: string }
        Returns: boolean
      }
      delete_flexi_network: {
        Args: { p_network_id: string }
        Returns: boolean
      }
      delete_product_color: {
        Args: { color_id: string }
        Returns: boolean
      }
      delete_product_color_with_sizes: {
        Args: { color_id: string }
        Returns: boolean
      }
      delete_product_image: {
        Args: { image_id: string }
        Returns: boolean
      }
      delete_product_size: {
        Args: { size_id: string }
        Returns: boolean
      }
      delete_store_component: {
        Args: { p_organization_id: string; p_component_id: string }
        Returns: boolean
      }
      delete_yalidine_fees_for_organization: {
        Args:
          | { p_organization_id: string }
          | { p_organization_id: string; p_from_wilaya_id: number }
        Returns: number
      }
      diagnose_missing_shipping_clone_ids: {
        Args: Record<PropertyKey, never>
        Returns: {
          organization_id: string
          organization_name: string
          form_id: string
          form_name: string
          is_default: boolean
        }[]
      }
      diagnose_yalidine_fees: {
        Args: { p_organization_id?: string }
        Returns: {
          table_name: string
          total_records: number
          trigger_status: string
          fk_constraint: string
        }[]
      }
      disable_two_factor_auth: {
        Args: { p_user_id: string; p_verification_code: string }
        Returns: Json
      }
      distribute_order: {
        Args: { p_order_id: string; p_organization_id?: string }
        Returns: string
      }
      enable_two_factor_auth: {
        Args: { p_user_id: string; p_verification_code: string }
        Returns: Json
      }
      end_user_session: {
        Args: { p_session_id: string; p_user_id?: string }
        Returns: boolean
      }
      exec_sql: {
        Args: { sql_query: string }
        Returns: undefined
      }
      execute_sql: {
        Args: { query: string }
        Returns: Json[]
      }
      execute_sql_file: {
        Args: { sql_file: string }
        Returns: boolean
      }
      export_abandoned_carts_data: {
        Args: { org_id: string; start_date: string; end_date: string }
        Returns: {
          cart_id: string
          customer_name: string
          customer_phone: string
          customer_email: string
          total_amount: number
          created_at: string
          last_activity_at: string
          abandoned_hours: number
          province_name: string
          municipality_name: string
          address: string
          item_count: number
        }[]
      }
      export_activation_codes: {
        Args: { p_batch_id: string }
        Returns: {
          code: string
          status: string
          plan_name: string
          expires_at: string
          created_at: string
        }[]
      }
      fix_all_shipping_clone_ids: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      fix_almost_paid_purchases: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_form_settings_for_organization: {
        Args: { org_id: string }
        Returns: undefined
      }
      fix_invalid_custom_js: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fix_missing_flexi_balances: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fix_seo_settings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_user_auth_links: {
        Args: Record<PropertyKey, never>
        Returns: {
          fixed_count: number
          error_message: string
        }[]
      }
      fix_wholesale_settings: {
        Args: {
          p_product_id: string
          p_allow_wholesale: boolean
          p_wholesale_price: number
          p_min_wholesale_quantity: number
          p_allow_partial_wholesale: boolean
          p_partial_wholesale_price: number
          p_min_partial_wholesale_quantity: number
        }
        Returns: undefined
      }
      fix_yalidine_fees_constraints: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      fix_yalidine_fees_foreign_keys: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      format_tracking_pixels_json: {
        Args: {
          facebook_enabled?: boolean
          facebook_pixel_id?: string
          tiktok_enabled?: boolean
          tiktok_pixel_id?: string
          snapchat_enabled?: boolean
          snapchat_pixel_id?: string
          google_enabled?: boolean
          google_pixel_id?: string
        }
        Returns: string
      }
      generate_activation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_backup_codes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      generate_beforeafter_image_path: {
        Args: {
          p_organization_id: string
          p_landing_page_id: string
          p_component_id: string
          p_item_id: string
          p_image_type: string
        }
        Returns: string
      }
      generate_product_barcode: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_robots_txt: {
        Args: { _organization_id: string }
        Returns: string
      }
      generate_sitemap: {
        Args: { _organization_id: string }
        Returns: string
      }
      generate_totp_qr_url: {
        Args: { p_user_email: string; p_secret: string; p_issuer: string }
        Returns: string
      }
      generate_totp_secret: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unique_sku: {
        Args: {
          category_short_name?: string
          brand_short_name?: string
          organization_id?: string
        }
        Returns: string
      }
      generate_upload_url: {
        Args: {
          org_id: string
          file_name: string
          file_type: string
          file_size: number
        }
        Returns: Json
      }
      generate_variant_barcode: {
        Args: { product_id: string; variant_id: string }
        Returns: string
      }
      get_activation_code_batch_statistics: {
        Args: { p_batch_id: string }
        Returns: {
          total_codes: number
          active_codes: number
          used_codes: number
          expired_codes: number
          revoked_codes: number
        }[]
      }
      get_active_beforeafter_components: {
        Args: {
          p_landing_page_slug?: string
          p_landing_page_id?: string
          p_organization_id?: string
        }
        Returns: {
          component_id: string
          landing_page_id: string
          position: number
          landing_page_slug: string
          organization_id: string
          title: string
          description: string
          background_color: string
          text_color: string
          layout: string
          show_labels: boolean
          sliders_count: number
          items: Json
          is_published: boolean
        }[]
      }
      get_all_currency_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          currency_id: string
          balance: number
          organization_id: string
          created_at: string
          updated_at: string
          currency_name: string
          currency_code: string
          currency_icon: string
        }[]
      }
      get_all_digital_currencies: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          code: string
          type: string
          icon: string
          exchange_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
          organization_id: string
        }[]
      }
      get_all_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_locked_until: string | null
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          backup_codes: Json | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string | null
          gender: string | null
          google_account_linked: boolean | null
          google_user_id: string | null
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          job_title: string | null
          last_activity_at: string | null
          last_name: string | null
          last_password_change: string | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          privacy_settings: Json | null
          role: string
          security_notifications_enabled: boolean | null
          status: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }[]
      }
      get_all_flexi_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          network_id: string
          balance: number
          organization_id: string
          created_at: string
          updated_at: string
          network_name: string
          network_icon: string
        }[]
      }
      get_all_flexi_networks: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          description: string
          icon: string
          is_active: boolean
          created_at: string
          updated_at: string
          organization_id: string
        }[]
      }
      get_all_store_settings: {
        Args: { p_organization_id: string }
        Returns: {
          id: string
          component_type: string
          settings: Json
          is_active: boolean
          order_index: number
          created_at: string
          updated_at: string
        }[]
      }
      get_available_employee: {
        Args: { p_organization_id: string; p_selected_employees: string[] }
        Returns: string
      }
      get_available_shipping_providers: {
        Args: { org_id: string }
        Returns: {
          provider_id: number
          provider_code: string
          provider_name: string
          is_enabled: boolean
        }[]
      }
      get_available_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
        }[]
      }
      get_beforeafter_component: {
        Args: { p_landing_page_slug: string; p_component_id?: string }
        Returns: {
          component_id: string
          title: string
          description: string
          background_color: string
          text_color: string
          layout: string
          show_labels: boolean
          sliders_count: number
          items: Json
        }[]
      }
      get_beforeafter_thumbnails: {
        Args: { p_landing_page_slug: string }
        Returns: {
          component_id: string
          title: string
          layout: string
          thumbnail_before: string
          thumbnail_after: string
        }[]
      }
      get_best_employee_smart: {
        Args: { p_organization_id: string; p_selected_employees: string[] }
        Returns: string
      }
      get_call_confirmation_stats: {
        Args: { org_id: string }
        Returns: {
          status_id: number
          status_name: string
          count: number
        }[]
      }
      get_complete_db_schema: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_complete_product_data: {
        Args: { p_slug: string; p_org_id: string }
        Returns: Json
      }
      get_component_settings: {
        Args: { p_organization_id: string; p_component_type: string }
        Returns: {
          id: string
          settings: Json
          is_active: boolean
          order_index: number
          created_at: string
          updated_at: string
        }[]
      }
      get_conversion_settings_cached: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_currency_balance: {
        Args: { p_currency_id: string }
        Returns: {
          id: string
          currency_id: string
          balance: number
          organization_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_currency_stats: {
        Args: Record<PropertyKey, never> | { org_id: string }
        Returns: {
          currency: string
          currency_code: string
          total_sales_original: number
          total_sales_dinar: number
          total_transactions: number
          latest_transaction: string
        }[]
      }
      get_current_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_locked_until: string | null
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          backup_codes: Json | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string | null
          gender: string | null
          google_account_linked: boolean | null
          google_user_id: string | null
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          job_title: string | null
          last_activity_at: string | null
          last_name: string | null
          last_password_change: string | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          privacy_settings: Json | null
          role: string
          security_notifications_enabled: boolean | null
          status: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }
      }
      get_current_user_for_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_user_id: string
          user_organization_id: string
          user_role: string
          user_is_org_admin: boolean
          user_is_super_admin: boolean
        }[]
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          user_organization_id: string
          user_role: string
          is_org_admin: boolean
          is_super_admin: boolean
        }[]
      }
      get_current_user_org_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          org_id: string
          is_admin: boolean
        }[]
      }
      get_current_user_organization: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          org_id: string
          is_admin: boolean
          user_role: string
        }[]
      }
      get_custom_page_by_slug: {
        Args: { p_organization_id: string; p_slug: string }
        Returns: {
          id: string
          title: string
          slug: string
          content: string
          meta_description: string
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_custom_pages_by_organization: {
        Args: { org_id: string }
        Returns: {
          id: string
          title: string
          slug: string
          content: string
          meta_description: string
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_customer_debts: {
        Args: { p_organization_id: string }
        Returns: {
          customer_id: string
          customer_name: string
          order_id: string
          order_number: string
          created_at: string
          total: number
          amount_paid: number
          remaining_amount: number
          employee_id: string
          employee_name: string
        }[]
      }
      get_customers_with_stats: {
        Args: {
          p_organization_id: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          customer: Json
          stats: Json
          total_count: number
        }[]
      }
      get_daily_pos_summary: {
        Args: { p_organization_id: string; p_date?: string }
        Returns: {
          orders_count: number
          total_revenue: number
          cash_sales: number
          card_sales: number
          completed_orders: number
          pending_orders: number
        }[]
      }
      get_dashboard_data: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_debts_by_customer: {
        Args: { p_organization_id: string }
        Returns: {
          customer_id: string
          customer_name: string
          total_debts: number
          orders_count: number
        }[]
      }
      get_debts_by_employee: {
        Args: { p_organization_id: string }
        Returns: {
          employee_id: string
          employee_name: string
          total_debts: number
          orders_count: number
        }[]
      }
      get_debts_data: {
        Args: { organization_id: string }
        Returns: Json
      }
      get_default_game_platform_css: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_default_game_platform_js: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_default_shipping_clone_id: {
        Args: { p_organization_id: string }
        Returns: number
      }
      get_default_site_settings: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_digital_currency_by_id: {
        Args: { p_currency_id: string }
        Returns: {
          id: string
          name: string
          code: string
          type: string
          icon: string
          exchange_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
          organization_id: string
        }[]
      }
      get_employee_performance: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      get_employee_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_expense_stats: {
        Args: { p_organization_id: string }
        Returns: {
          yearly_total: number
          monthly_total: number
          expense_count: number
          recurring_count: number
        }[]
      }
      get_expenses: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          id: string
          category: string
          amount: number
          description: string
          date: string
          approved_by: string
          is_recurring: boolean
          recurring_period: string
          recurring_end_date: string
          next_occurrence: string
          is_active: boolean
        }[]
      }
      get_expenses_by_category: {
        Args:
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
            }
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
              p_admin_id?: string
            }
        Returns: {
          category: string
          total_amount: number
        }[]
      }
      get_expenses_by_category_v2: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          category: string
          expense_count: number
          total_amount: number
          percentage_of_total: number
        }[]
      }
      get_expert_employee: {
        Args: {
          p_organization_id: string
          p_product_ids: string[]
          p_employee_products: Json
        }
        Returns: string
      }
      get_featured_products: {
        Args: { p_organization_id: string }
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          form_template_id: string | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean
          is_featured: boolean | null
          is_new: boolean | null
          is_sold_by_unit: boolean | null
          last_inventory_update: string | null
          min_partial_wholesale_quantity: number | null
          min_stock_level: number | null
          min_wholesale_quantity: number | null
          money_back_text: string | null
          name: string
          name_for_shipping: string | null
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          shipping_clone_id: number | null
          shipping_provider_id: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string | null
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          use_shipping_clone: boolean
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }[]
      }
      get_financial_summary_v2: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          period: string
          sales_total: number
          expenses_total: number
          profit: number
          profit_margin: number
          online_sales: number
          in_store_sales: number
          service_sales: number
          order_count: number
          unique_customers: number
        }[]
      }
      get_flexi_balance: {
        Args: { p_network_id: string }
        Returns: {
          id: string
          network_id: string
          balance: number
          organization_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_flexi_stats: {
        Args: Record<PropertyKey, never> | { org_id: string }
        Returns: {
          network: string
          total_sales: number
          total_transactions: number
          latest_transaction: string
        }[]
      }
      get_form_settings_for_product: {
        Args: { p_organization_id: string; p_product_id: string }
        Returns: {
          fields: Json
          settings: Json
        }[]
      }
      get_form_settings_with_shipping: {
        Args: { p_organization_id: string }
        Returns: {
          id: string
          name: string
          fields: Json
          product_ids: Json
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
          shipping_integration: Json
        }[]
      }
      get_inventory_status: {
        Args: { p_organization_id: string; p_admin_id?: string }
        Returns: {
          total_value: number
          low_stock_count: number
          out_of_stock_count: number
          total_products: number
        }[]
      }
      get_inventory_status_v2: {
        Args: { p_organization_id: string; p_admin_id?: string }
        Returns: {
          total_value: number
          low_stock_count: number
          out_of_stock_count: number
          total_products: number
        }[]
      }
      get_inventory_summary_v2: {
        Args: { p_organization_id: string }
        Returns: {
          product_id: string
          product_name: string
          category: string
          stock_quantity: number
          cost_price: number
          sale_price: number
          total_value: number
          status: string
          last_updated: string
        }[]
      }
      get_landing_page_form_by_slug: {
        Args: { slug_param: string }
        Returns: {
          component_id: string
          landing_page_id: string
          form_id: string
          product_id: string
          form_title: string
          button_text: string
          background_color: string
          organization_id: string
          form_name: string
          form_fields: Json
          product_name: string
          advanced_settings: Json
        }[]
      }
      get_landing_page_with_components: {
        Args: { p_slug: string; p_organization_id?: string }
        Returns: {
          id: string
          organization_id: string
          name: string
          slug: string
          title: string
          description: string
          keywords: string
          is_published: boolean
          created_at: string
          updated_at: string
          components: Json
        }[]
      }
      get_last_password_change: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_employee_round_robin: {
        Args: { p_organization_id: string; p_selected_employees: string[] }
        Returns: string
      }
      get_order_stats: {
        Args: { org_id: string }
        Returns: {
          total_sales: number
          avg_order_value: number
          sales_trend: number
          pending_amount: number
        }[]
      }
      get_orders_count_by_status: {
        Args: { org_id: string }
        Returns: {
          status: string
          count: number
        }[]
      }
      get_orders_shared_data: {
        Args: { p_organization_id: string }
        Returns: {
          call_confirmation_statuses: Json
          provinces: Json
          municipalities: Json
        }[]
      }
      get_orders_stats: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          total_orders: number
          avg_order_value: number
        }[]
      }
      get_orders_stats_optimized: {
        Args: { p_organization_id: string }
        Returns: {
          order_counts: Json
          order_stats: Json
        }[]
      }
      get_orders_with_details: {
        Args: {
          p_organization_id: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_search_term?: string
          p_date_from?: string
          p_date_to?: string
        }
        Returns: {
          order_id: string
          customer_id: string
          subtotal: number
          tax: number
          discount: number
          total: number
          status: string
          payment_method: string
          payment_status: string
          shipping_address_id: string
          shipping_method: string
          shipping_cost: number
          shipping_option: string
          notes: string
          employee_id: string
          created_at: string
          updated_at: string
          organization_id: string
          slug: string
          customer_order_number: number
          created_from: string
          call_confirmation_status_id: number
          call_confirmation_notes: string
          call_confirmation_updated_at: string
          call_confirmation_updated_by: string
          form_data: Json
          metadata: Json
          customer_name: string
          customer_email: string
          customer_phone: string
          shipping_address: Json
          call_confirmation_status: Json
          order_items: Json
        }[]
      }
      get_org_landing_page_forms: {
        Args: { org_id: string }
        Returns: {
          component_id: string
          landing_page_id: string
          landing_page_slug: string
          form_id: string
          product_id: string
          form_title: string
          button_text: string
          background_color: string
          organization_id: string
          form_name: string
          form_fields: Json
          product_name: string
          advanced_settings: Json
        }[]
      }
      get_org_users: {
        Args: { org_uuid: string }
        Returns: {
          account_locked_until: string | null
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          backup_codes: Json | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string | null
          gender: string | null
          google_account_linked: boolean | null
          google_user_id: string | null
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          job_title: string | null
          last_activity_at: string | null
          last_name: string | null
          last_password_change: string | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          privacy_settings: Json | null
          role: string
          security_notifications_enabled: boolean | null
          status: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }[]
      }
      get_organization_branding: {
        Args: { org_id: string }
        Returns: Json
      }
      get_organization_by_domain: {
        Args: { p_domain?: string; p_subdomain?: string }
        Returns: string
      }
      get_organization_id_from_url: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_organization_info_by_domain: {
        Args: { p_domain: string }
        Returns: Json
      }
      get_organization_info_by_subdomain: {
        Args: { p_subdomain: string }
        Returns: Json
      }
      get_organization_landing_pages: {
        Args: { p_organization_id: string }
        Returns: {
          id: string
          name: string
          slug: string
          title: string
          is_published: boolean
          created_at: string
          updated_at: string
          components_count: number
        }[]
      }
      get_organization_settings: {
        Args: { org_id: string }
        Returns: {
          created_at: string | null
          custom_css: string | null
          custom_footer: string | null
          custom_header: string | null
          custom_js: string | null
          default_language: string | null
          display_text_with_logo: boolean | null
          enable_public_site: boolean | null
          enable_registration: boolean | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          organization_id: string
          site_name: string | null
          theme_mode: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string | null
        }[]
      }
      get_organization_testimonials: {
        Args: { p_organization_id: string; p_active_only?: boolean }
        Returns: {
          comment: string
          created_at: string
          customer_avatar: string | null
          customer_name: string
          id: string
          is_active: boolean
          organization_id: string
          product_image: string | null
          product_name: string | null
          purchase_date: string | null
          rating: number
          updated_at: string
          verified: boolean | null
        }[]
      }
      get_organization_theme: {
        Args: { p_organization_id: string }
        Returns: Json[]
      }
      get_organization_users: {
        Args: { org_id: string }
        Returns: {
          account_locked_until: string | null
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          backup_codes: Json | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string | null
          gender: string | null
          google_account_linked: boolean | null
          google_user_id: string | null
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          job_title: string | null
          last_activity_at: string | null
          last_name: string | null
          last_password_change: string | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          privacy_settings: Json | null
          role: string
          security_notifications_enabled: boolean | null
          status: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }[]
      }
      get_overdue_purchases: {
        Args: { org_id: string }
        Returns: {
          id: string
          purchase_number: string
          supplier_id: string
          supplier_name: string
          due_date: string
          balance_due: number
          days_overdue: number
        }[]
      }
      get_partial_payments_summary: {
        Args: { p_organization_id: string }
        Returns: {
          total_debts: number
          total_partial_payments: number
        }[]
      }
      get_password_change_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_pos_order_stats: {
        Args: { p_organization_id: string }
        Returns: {
          total_orders: number
          total_revenue: number
          completed_orders: number
          pending_orders: number
          pending_payment_orders: number
          cancelled_orders: number
          cash_orders: number
          card_orders: number
          avg_order_value: number
          today_orders: number
          today_revenue: number
        }[]
      }
      get_pos_settings: {
        Args: { p_organization_id: string }
        Returns: {
          id: string
          organization_id: string
          store_name: string
          store_phone: string
          store_email: string
          store_address: string
          store_website: string
          store_logo_url: string
          receipt_header_text: string
          receipt_footer_text: string
          welcome_message: string
          show_qr_code: boolean
          show_tracking_code: boolean
          show_customer_info: boolean
          show_store_logo: boolean
          show_store_info: boolean
          show_date_time: boolean
          show_employee_name: boolean
          paper_width: number
          font_size: number
          line_spacing: number
          print_density: string
          auto_cut: boolean
          primary_color: string
          secondary_color: string
          text_color: string
          background_color: string
          receipt_template: string
          header_style: string
          footer_style: string
          item_display_style: string
          price_position: string
          custom_css: string
          tax_label: string
          currency_symbol: string
          currency_position: string
          allow_price_edit: boolean
          require_manager_approval: boolean
          business_license: string
          tax_number: string
          created_at: string
          updated_at: string
        }[]
      }
      get_primary_keys: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
        }[]
      }
      get_priority_employee: {
        Args: { p_organization_id: string; p_selected_employees: string[] }
        Returns: string
      }
      get_product_colors: {
        Args: { product_id: string }
        Returns: {
          barcode: string | null
          color_code: string
          created_at: string
          has_sizes: boolean | null
          id: string
          image_url: string | null
          is_default: boolean
          name: string
          price: number | null
          product_id: string
          purchase_price: number | null
          quantity: number
          updated_at: string
          variant_number: number | null
        }[]
      }
      get_product_conversion_settings: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_product_counts_by_category: {
        Args: { org_id: string }
        Returns: {
          category_id: string
          count: number
        }[]
      }
      get_product_images: {
        Args: { product_id: string }
        Returns: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
          updated_at: string
        }[]
      }
      get_product_price_for_quantity: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: number
      }
      get_product_safe: {
        Args: { product_id: string }
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          form_template_id: string | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean
          is_featured: boolean | null
          is_new: boolean | null
          is_sold_by_unit: boolean | null
          last_inventory_update: string | null
          min_partial_wholesale_quantity: number | null
          min_stock_level: number | null
          min_wholesale_quantity: number | null
          money_back_text: string | null
          name: string
          name_for_shipping: string | null
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          shipping_clone_id: number | null
          shipping_provider_id: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string | null
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          use_shipping_clone: boolean
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }[]
      }
      get_product_shipping_options: {
        Args: { p_product_id: string; p_province_id?: number }
        Returns: Json
      }
      get_product_sizes: {
        Args: { color_id: string }
        Returns: {
          barcode: string | null
          color_id: string
          created_at: string
          id: string
          is_default: boolean
          price: number | null
          product_id: string
          purchase_price: number | null
          quantity: number
          size_name: string
          updated_at: string
        }[]
      }
      get_products_for_barcode_printing: {
        Args: { p_organization_id?: string }
        Returns: {
          product_id: string
          product_name: string
          product_price: number
          product_sku: string
          product_barcode: string
          stock_quantity: number
          product_slug: string
          organization_name: string
          organization_domain: string
          organization_subdomain: string
        }[]
      }
      get_products_to_reorder: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          sku: string
          current_stock: number
          min_stock_level: number
          reorder_level: number
          reorder_quantity: number
          days_until_stockout: number
        }[]
      }
      get_products_with_categories: {
        Args:
          | { org_id: string; active_only?: boolean }
          | {
              p_organization_id: string
              p_limit?: number
              p_offset?: number
              p_search?: string
              p_category_id?: string
              p_is_active?: boolean
            }
        Returns: {
          product: Json
          category: Json
          subcategory: Json
          total_count: number
        }[]
      }
      get_public_domains: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_public_product_subcategories: {
        Args: { p_organization_id: string }
        Returns: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string | null
          updated_at: string | null
        }[]
      }
      get_public_products: {
        Args: { p_organization_id: string }
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          form_template_id: string | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean
          is_featured: boolean | null
          is_new: boolean | null
          is_sold_by_unit: boolean | null
          last_inventory_update: string | null
          min_partial_wholesale_quantity: number | null
          min_stock_level: number | null
          min_wholesale_quantity: number | null
          money_back_text: string | null
          name: string
          name_for_shipping: string | null
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          shipping_clone_id: number | null
          shipping_provider_id: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string | null
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          use_shipping_clone: boolean
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }[]
      }
      get_recent_logs: {
        Args: {
          p_limit?: number
          p_user_id?: string
          p_organization_id?: string
        }
        Returns: {
          id: number
          timestamp: string
          operation: string
          user_id: string
          organization_id: string
          details: Json
          error_message: string
        }[]
      }
      get_repair_locations: {
        Args: { p_organization_id: string }
        Returns: {
          id: string
          name: string
          description: string
          address: string
          phone: string
          email: string
          is_active: boolean
          is_default: boolean
          capacity: number
          working_hours: Json
          specialties: string[]
          manager_name: string
          created_at: string
          updated_at: string
        }[]
      }
      get_sales_by_channel: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          pos_sales: number
          online_sales: number
        }[]
      }
      get_sales_by_period: {
        Args:
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
              p_interval: string
            }
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
              p_interval: string
              p_admin_id?: string
            }
        Returns: {
          period: string
          total_sales: number
        }[]
      }
      get_sales_summary: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          total_orders: number
          completed_orders: number
          total_revenue: number
          actual_revenue: number
          pending_revenue: number
          discount_total: number
          partial_payment_count: number
        }[]
      }
      get_sales_trends_v2: {
        Args: {
          p_organization_id: string
          p_period: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          time_period: string
          order_count: number
          total_sales: number
          average_order_value: number
        }[]
      }
      get_seo_settings_safe: {
        Args: { _organization_id: string }
        Returns: Json
      }
      get_services_sales_summary_v2: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          service_name: string
          service_count: number
          total_amount: number
          percentage_of_total: number
        }[]
      }
      get_shipping_municipalities: {
        Args: { p_wilaya_id: number; p_org_id: string }
        Returns: Json
      }
      get_shipping_provinces: {
        Args: { p_org_id: string }
        Returns: Json
      }
      get_simple_conversion_settings: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_store_about_component: {
        Args: { p_organization_id: string }
        Returns: {
          id: string
          component_type: string
          settings: Json
          is_active: boolean
          order_index: number
        }[]
      }
      get_store_init_data: {
        Args: { org_subdomain: string }
        Returns: Json
      }
      get_store_seo_settings: {
        Args: { _organization_id: string }
        Returns: Json
      }
      get_store_settings: {
        Args: { p_organization_id: string; p_public_access?: boolean }
        Returns: {
          id: string
          component_type: string
          settings: Json
          is_active: boolean
          order_index: number
        }[]
      }
      get_supplier_performance: {
        Args: { org_id: string }
        Returns: {
          supplier_id: string
          supplier_name: string
          company_name: string
          total_purchases: number
          total_amount: number
          rating: number
          avg_delivery_days: number
        }[]
      }
      get_supplier_statistics: {
        Args: { org_id: string }
        Returns: {
          total_suppliers: number
          active_suppliers: number
          total_purchases: number
          total_amount: number
          total_outstanding: number
        }[]
      }
      get_table_columns: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
          column_default: string
        }[]
      }
      get_table_indexes: {
        Args: { p_table_name: string }
        Returns: {
          index_name: string
          column_names: string
        }[]
      }
      get_table_info: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: boolean
        }[]
      }
      get_testimonials_for_component: {
        Args: { p_component_id: string }
        Returns: {
          component_id: string
          component_settings: Json
        }[]
      }
      get_thank_you_template_for_product: {
        Args: { p_organization_id: string; p_product_id?: string }
        Returns: {
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
        }[]
      }
      get_top_categories: {
        Args:
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
              p_limit?: number
            }
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
              p_limit?: number
              p_admin_id?: string
            }
        Returns: {
          category_id: string
          category_name: string
          total_sales: number
          total_profit: number
        }[]
      }
      get_top_products: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
          p_limit?: number
          p_admin_id?: string
        }
        Returns: {
          product_id: string
          product_name: string
          total_sales: number
          total_profit: number
          total_quantity: number
        }[]
      }
      get_top_products_v2: {
        Args: {
          p_organization_id: string
          p_start_date: string
          p_end_date: string
          p_limit?: number
        }
        Returns: {
          product_id: string
          product_name: string
          category: string
          units_sold: number
          total_revenue: number
          profit_margin: number
          total_profit: number
        }[]
      }
      get_total_expenses: {
        Args:
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
            }
          | {
              p_organization_id: string
              p_start_date: string
              p_end_date: string
              p_admin_id?: string
            }
        Returns: {
          total_expenses: number
        }[]
      }
      get_user_active_sessions: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          session_token: string
          device_info: Json
          ip_address: unknown
          user_agent: string
          location_info: Json
          is_active: boolean
          last_activity_at: string
          expires_at: string
          login_method: string
          is_trusted_device: boolean
          created_at: string
          device_id: string
        }[]
      }
      get_user_privacy_settings: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          profile_visibility: string
          show_email: boolean
          show_phone: boolean
          show_last_activity: boolean
          allow_data_collection: boolean
          allow_analytics: boolean
          allow_marketing_emails: boolean
          allow_contact_from_others: boolean
          allow_friend_requests: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          name: string
          first_name: string
          last_name: string
          phone: string
          avatar_url: string
          job_title: string
          bio: string
          birth_date: string
          gender: string
          address: string
          city: string
          country: string
          role: string
          is_org_admin: boolean
          is_super_admin: boolean
          status: string
          last_activity_at: string
          created_at: string
          updated_at: string
          whatsapp_phone: string
          whatsapp_connected: boolean
          whatsapp_enabled: boolean
          organization_id: string
        }[]
      }
      get_user_security_settings: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          two_factor_enabled: boolean
          two_factor_method: string
          totp_secret: string
          backup_codes: string[]
          backup_codes_generated_at: string
          backup_codes_used: Json
          max_active_sessions: number
          session_timeout_minutes: number
          require_reauth_for_sensitive: boolean
          password_expiry_days: number
          require_strong_password: boolean
          prevent_password_reuse: number
          login_notification_enabled: boolean
          suspicious_activity_alerts: boolean
          device_tracking_enabled: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_user_trusted_devices: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          device_fingerprint: string
          device_name: string
          device_type: string
          browser_info: Json
          is_trusted: boolean
          trust_level: number
          last_used_at: string
          first_seen_ip: unknown
          last_seen_ip: unknown
          usage_count: number
          created_at: string
          expires_at: string
        }[]
      }
      get_yalidine_fees_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_records: number
          unique_combinations: number
          duplicate_records: number
          inserts: number
          deletes: number
          live_records: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_category_count: {
        Args: { p_category_id: string; p_increment: number }
        Returns: undefined
      }
      init_store_assets_folders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      initialize_default_repair_location: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      initialize_distribution_settings: {
        Args: { p_organization_id: string }
        Returns: string
      }
      initialize_missing_flexi_balances: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      initialize_pos_settings: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      initialize_store_settings: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      insert_call_confirmation_statuses_secure: {
        Args: { organization_id: string; user_id?: string }
        Returns: {
          color: string
          created_at: string
          icon: string | null
          id: number
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }[]
      }
      insert_order_items_safe: {
        Args: { items_json: Json }
        Returns: undefined
      }
      insert_organization_final: {
        Args: { p_name: string; p_subdomain: string; p_owner_id: string }
        Returns: string
      }
      insert_organization_simple: {
        Args: {
          p_name: string
          p_subdomain: string
          p_owner_id: string
          p_settings?: Json
        }
        Returns: string
      }
      insert_product_size: {
        Args: {
          p_color_id: string
          p_product_id: string
          p_size_name: string
          p_quantity: number
          p_price?: number
          p_barcode?: string
          p_is_default?: boolean
        }
        Returns: string
      }
      invite_user_to_organization: {
        Args: { user_email: string; user_role?: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_organization_admin: {
        Args: { p_user_id: string; p_organization_id: string }
        Returns: boolean
      }
      is_public_domain: {
        Args: { p_domain: string }
        Returns: boolean
      }
      is_valid_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_valid_product_data: {
        Args: { org_id: string; cat_id: string; prod_name: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      listen_and_refresh_abandoned_carts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_abandoned_cart_reminder: {
        Args: {
          cart_id: string
          operator_id: string
          channel: string
          message: string
        }
        Returns: string
      }
      log_auth_attempt: {
        Args: {
          p_email: string
          p_success: boolean
          p_user_id?: string
          p_error?: string
        }
        Returns: undefined
      }
      log_conversion_event: {
        Args: {
          p_product_id: string
          p_order_id: string
          p_event_type: string
          p_platform: string
          p_user_data?: Json
          p_custom_data?: Json
          p_event_id?: string
        }
        Returns: string
      }
      log_dashboard_access: {
        Args: { p_user_id: string; p_organization_id: string; p_details?: Json }
        Returns: undefined
      }
      log_organization_data: {
        Args: {
          p_user_id: string
          p_organization_id: string
          p_subdomain: string
          p_success: boolean
          p_error?: string
        }
        Returns: undefined
      }
      log_password_change: {
        Args: {
          success_status?: boolean
          failure_reason_text?: string
          client_ip?: unknown
          client_user_agent?: string
        }
        Returns: undefined
      }
      log_product_deletion_attempt: {
        Args: {
          p_product_id: string
          p_user_id: string
          p_status: string
          p_error_message?: string
          p_error_code?: string
        }
        Returns: undefined
      }
      log_security_activity: {
        Args: {
          p_user_id: string
          p_activity_type: string
          p_description: string
          p_status?: string
          p_risk_level?: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_metadata?: Json
        }
        Returns: string
      }
      manage_currency_balance: {
        Args: {
          p_currency_id: string
          p_balance: number
          p_organization_id: string
        }
        Returns: string
      }
      manage_flexi_balance: {
        Args: {
          p_network_id: string
          p_balance: number
          p_organization_id: string
        }
        Returns: string
      }
      manually_update_inventory: {
        Args: { product_id: string; quantity: number }
        Returns: undefined
      }
      manually_update_inventory_for_purchase: {
        Args: { purchase_id: string }
        Returns: undefined
      }
      migrate_existing_beforeafter_components: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      migrate_product_images: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_salary_to_expenses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      needs_reordering: {
        Args: { p_stock_quantity: number; p_reorder_level: number }
        Returns: boolean
      }
      notify_refresh_materialized_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_online_order: {
        Args:
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_address: string
              p_delivery_company: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
            }
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_address: string
              p_delivery_company: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
              p_stop_desk_id?: string
            }
        Returns: Json
      }
      process_online_order_new: {
        Args:
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_address: string
              p_delivery_company: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_product_size_id: string
              p_size_name: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
            }
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_address: string
              p_delivery_company: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
            }
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_municipality: string
              p_address: string
              p_city: string
              p_delivery_company: string
              p_delivery_option: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_product_size_id: string
              p_size_name: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
              p_form_data?: Json
            }
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_municipality: string
              p_address: string
              p_city: string
              p_delivery_company: string
              p_delivery_option: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_product_size_id: string
              p_size_name: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
              p_form_data?: Json
              p_metadata?: Json
            }
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_municipality: string
              p_address: string
              p_city: string
              p_delivery_company: string
              p_delivery_option: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_product_size_id: string
              p_size_name: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
              p_form_data?: Json
              p_metadata?: Json
              p_stop_desk_id?: string
            }
          | {
              p_full_name: string
              p_phone: string
              p_province: string
              p_municipality: string
              p_address: string
              p_delivery_company: string
              p_delivery_option: string
              p_payment_method: string
              p_notes: string
              p_product_id: string
              p_product_color_id: string
              p_product_size_id: string
              p_size_name: string
              p_quantity: number
              p_unit_price: number
              p_total_price: number
              p_delivery_fee: number
              p_organization_id: string
              p_form_data?: Json
            }
        Returns: Json
      }
      process_online_order_test: {
        Args: {
          p_full_name: string
          p_phone: string
          p_province: string
          p_address: string
          p_delivery_company: string
          p_payment_method: string
          p_notes: string
          p_product_id: string
          p_product_color_id: string
          p_product_size_id: string
          p_size_name: string
          p_quantity: number
          p_unit_price: number
          p_total_price: number
          p_delivery_fee: number
          p_organization_id: string
        }
        Returns: Json
      }
      process_recurring_expenses: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      query_tables: {
        Args:
          | { p_table_name: string; p_limit?: number }
          | { query_text: string }
        Returns: Json[]
      }
      record_debt_payment: {
        Args: {
          p_order_id: string
          p_amount: number
          p_is_full_payment?: boolean
        }
        Returns: string
      }
      record_failed_login: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_payment_transaction: {
        Args:
          | {
              p_order_id: string
              p_amount: number
              p_payment_method: string
              p_is_partial: boolean
              p_consider_remaining_as_partial: boolean
            }
          | {
              p_order_id: string
              p_amount: number
              p_payment_method?: string
              p_description?: string
            }
        Returns: string
      }
      record_payment_with_precision: {
        Args: {
          p_purchase_id: string
          p_amount: number
          p_is_full_payment?: boolean
        }
        Returns: undefined
      }
      recover_abandoned_cart: {
        Args: { cart_id: string; operator_id: string }
        Returns: string
      }
      refresh_organization_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_stats_with_logging: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      regenerate_backup_codes: {
        Args: { p_user_id: string }
        Returns: Json
      }
      repair_inventory_inconsistencies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_failed_login_attempts: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      reset_password_change_attempts: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      reset_two_factor_auth: {
        Args: { p_user_id: string }
        Returns: Json
      }
      revoke_activation_code: {
        Args: {
          p_activation_code: string
          p_revoked_by: string
          p_notes?: string
        }
        Returns: boolean
      }
      safe_delete_product: {
        Args: { p_product_id: string; p_user_id?: string }
        Returns: Json
      }
      safe_insert_order_item: {
        Args: {
          _order_id: string
          _product_id: string
          _product_name: string
          _quantity: number
          _unit_price: number
          _total_price: number
          _organization_id: string
          _name: string
          _is_digital?: boolean
          _is_wholesale?: boolean
          _original_price?: number
        }
        Returns: string
      }
      save_conversion_settings: {
        Args: {
          p_product_id: string
          p_organization_id: string
          p_facebook_enabled?: boolean
          p_facebook_pixel_id?: string
          p_facebook_conversion_api_enabled?: boolean
          p_facebook_access_token?: string
          p_facebook_dataset_id?: string
          p_facebook_test_event_code?: string
          p_tiktok_enabled?: boolean
          p_tiktok_pixel_id?: string
          p_tiktok_access_token?: string
          p_tiktok_events_api_enabled?: boolean
          p_tiktok_test_event_code?: string
          p_google_enabled?: boolean
          p_google_gtag_id?: string
          p_google_conversion_id?: string
          p_google_conversion_label?: string
          p_test_mode?: boolean
        }
        Returns: boolean
      }
      search_orders: {
        Args: {
          org_id: string
          p_status?: string
          p_search?: string
          p_date_from?: string
          p_date_to?: string
          p_payment_method?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          customer_id: string
          subtotal: number
          tax: number
          discount: number
          total: number
          status: string
          payment_method: string
          payment_status: string
          shipping_address_id: string
          shipping_method: string
          shipping_cost: number
          notes: string
          employee_id: string
          created_at: string
          updated_at: string
          organization_id: string
          slug: string
          customer_order_number: number
          created_from: string
          customer_name: string
          customer_phone: string
          customer_email: string
        }[]
      }
      set_featured_products: {
        Args: { p_organization_id: string; p_product_ids: string[] }
        Returns: boolean
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      set_user_as_org_admin: {
        Args: { user_id: string; org_id: string }
        Returns: undefined
      }
      setup_two_factor_auth: {
        Args: { p_user_id: string }
        Returns: Json
      }
      should_change_password: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      simple_insert_yalidine_fees: {
        Args:
          | { p_data: Json; p_organization_id: string }
          | { p_data: string; p_organization_id: string }
        Returns: number
      }
      simple_update_product: {
        Args: { p_id: string; p_data: Json }
        Returns: boolean
      }
      smart_auth_check: {
        Args: { required_org_id?: string; required_action?: string }
        Returns: boolean
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      super_publish_page: {
        Args: { page_id: string }
        Returns: boolean
      }
      super_unpublish_page: {
        Args: { page_id: string }
        Returns: boolean
      }
      sync_featured_products_from_settings: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      sync_footer_pages_with_links: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      sync_testimonial_items: {
        Args: { p_organization_id: string; p_testimonial_ids: string[] }
        Returns: undefined
      }
      table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
      terminate_all_other_sessions: {
        Args: { p_user_id: string; p_current_session_token: string }
        Returns: number
      }
      terminate_user_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: boolean
      }
      test_inventory_update: {
        Args: {
          p_product_id: string
          p_organization_id: string
          p_quantity: number
        }
        Returns: Json
      }
      test_product_creation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_save_blabblablab_conversion_settings: {
        Args: Record<PropertyKey, never>
        Returns: {
          success: boolean
          message: string
          current_settings: Json
        }[]
      }
      test_shipping_integration_settings: {
        Args: { p_form_id: string }
        Returns: {
          form_id: string
          form_name: string
          shipping_enabled: boolean
          shipping_provider: string
        }[]
      }
      test_user_access: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      toggle_testimonial_status: {
        Args: { p_testimonial_id: string; p_is_active: boolean }
        Returns: boolean
      }
      trust_device: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: boolean
      }
      untrust_device: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: boolean
      }
      update_beforeafter_performance: {
        Args: {
          p_component_id: string
          p_landing_page_id: string
          p_load_time_ms: number
        }
        Returns: undefined
      }
      update_custom_page: {
        Args: {
          p_page_id: string
          p_title: string
          p_slug: string
          p_content: string
          p_meta_description?: string
        }
        Returns: {
          id: string
          title: string
          slug: string
          content: string
          meta_description: string
          is_active: boolean
          created_at: string
          updated_at: string
        }[]
      }
      update_customer_testimonial: {
        Args: {
          p_testimonial_id: string
          p_customer_name: string
          p_customer_avatar: string
          p_rating: number
          p_comment: string
          p_verified: boolean
          p_purchase_date: string
          p_product_name: string
          p_product_image: string
          p_is_active: boolean
        }
        Returns: boolean
      }
      update_digital_currency: {
        Args: {
          p_currency_id: string
          p_name: string
          p_code: string
          p_type: string
          p_icon: string
          p_exchange_rate: number
          p_is_active: boolean
        }
        Returns: boolean
      }
      update_distribution_settings: {
        Args: {
          p_organization_id: string
          p_active_plan_id: string
          p_active_plan_type: string
          p_settings: Json
        }
        Returns: boolean
      }
      update_distribution_status: {
        Args: {
          p_order_id: string
          p_status: string
          p_response_time_minutes?: number
        }
        Returns: boolean
      }
      update_domain_verification_status: {
        Args: {
          p_organization_id: string
          p_domain: string
          p_status: string
          p_message?: string
        }
        Returns: undefined
      }
      update_existing_partial_payments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_flexi_network: {
        Args: {
          p_network_id: string
          p_name: string
          p_description: string
          p_icon: string
          p_is_active: boolean
        }
        Returns: boolean
      }
      update_inventory_for_all_confirmed_purchases: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_landing_page: {
        Args: {
          page_id: string
          page_name?: string
          page_title?: string
          page_description?: string
          page_keywords?: string
          page_is_published?: boolean
          page_settings?: Json
        }
        Returns: Json
      }
      update_landing_page_component: {
        Args:
          | {
              component_id: string
              new_settings?: Json
              is_active?: boolean
              new_position?: number
            }
          | { p_component_id: string; p_settings: Json; p_is_active?: boolean }
        Returns: boolean
      }
      update_landing_page_components_order: {
        Args: { p_landing_page_id: string; p_component_order: Json }
        Returns: boolean
      }
      update_order_call_confirmation: {
        Args: {
          p_order_id: string
          p_status_id: number
          p_notes?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      update_order_call_confirmation_optimized: {
        Args: {
          p_order_id: string
          p_status_id: number
          p_organization_id: string
          p_notes?: string
          p_user_id?: string
        }
        Returns: {
          success: boolean
          updated_order: Json
          status_info: Json
        }[]
      }
      update_order_status: {
        Args: { p_order_id: string; p_status: string; p_user_id: string }
        Returns: boolean
      }
      update_organization_branding: {
        Args: {
          org_id: string
          site_name?: string
          theme_primary_color?: string
          logo_url?: string
          favicon_url?: string
          custom_css?: string
          custom_js?: string
          custom_header?: string
          custom_footer?: string
          enable_registration?: boolean
          enable_public_site?: boolean
        }
        Returns: Json
      }
      update_organization_logo_url: {
        Args: { organization_id: string; file_type: string; file_path: string }
        Returns: {
          created_at: string | null
          custom_css: string | null
          custom_footer: string | null
          custom_header: string | null
          custom_js: string | null
          default_language: string | null
          display_text_with_logo: boolean | null
          enable_public_site: boolean | null
          enable_registration: boolean | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          organization_id: string
          site_name: string | null
          theme_mode: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string | null
        }
      }
      update_organization_settings: {
        Args: {
          org_id: string
          p_theme_primary_color?: string
          p_theme_secondary_color?: string
          p_theme_mode?: string
          p_site_name?: string
          p_custom_css?: string
          p_logo_url?: string
          p_favicon_url?: string
          p_default_language?: string
          p_custom_js?: string
          p_custom_header?: string
          p_custom_footer?: string
          p_enable_registration?: boolean
          p_enable_public_site?: boolean
          p_display_text_with_logo?: boolean
        }
        Returns: {
          created_at: string | null
          custom_css: string | null
          custom_footer: string | null
          custom_header: string | null
          custom_js: string | null
          default_language: string | null
          display_text_with_logo: boolean | null
          enable_public_site: boolean | null
          enable_registration: boolean | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          organization_id: string
          site_name: string | null
          theme_mode: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string | null
        }
      }
      update_organization_settings_safe: {
        Args: {
          org_id: string
          p_theme_primary_color?: string
          p_theme_secondary_color?: string
          p_theme_mode?: string
          p_site_name?: string
          p_custom_css?: string
          p_logo_url?: string
          p_favicon_url?: string
          p_default_language?: string
          p_custom_js?: string
          p_custom_header?: string
          p_custom_footer?: string
          p_enable_registration?: boolean
          p_enable_public_site?: boolean
          p_display_text_with_logo?: boolean
        }
        Returns: {
          created_at: string | null
          custom_css: string | null
          custom_footer: string | null
          custom_header: string | null
          custom_js: string | null
          default_language: string | null
          display_text_with_logo: boolean | null
          enable_public_site: boolean | null
          enable_registration: boolean | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          organization_id: string
          site_name: string | null
          theme_mode: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string | null
        }
      }
      update_product_and_return_full: {
        Args: { product_id: string; product_updates: Json }
        Returns: Json
      }
      update_product_color: {
        Args:
          | {
              color_id: string
              name?: string
              color_code?: string
              quantity?: number
              price?: number
              image_url?: string
              is_default?: boolean
            }
          | {
              color_id: string
              name?: string
              color_code?: string
              quantity?: number
              price?: number
              image_url?: string
              is_default?: boolean
              has_sizes?: boolean
            }
        Returns: boolean
      }
      update_product_features: {
        Args: {
          product_id: string
          p_has_fast_shipping?: boolean
          p_has_money_back?: boolean
          p_has_quality_guarantee?: boolean
          p_fast_shipping_text?: string
          p_money_back_text?: string
          p_quality_guarantee_text?: string
        }
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          form_template_id: string | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean
          is_featured: boolean | null
          is_new: boolean | null
          is_sold_by_unit: boolean | null
          last_inventory_update: string | null
          min_partial_wholesale_quantity: number | null
          min_stock_level: number | null
          min_wholesale_quantity: number | null
          money_back_text: string | null
          name: string
          name_for_shipping: string | null
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          shipping_clone_id: number | null
          shipping_provider_id: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string | null
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          use_shipping_clone: boolean
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }[]
      }
      update_product_inventory: {
        Args: {
          p_product_id: string
          p_new_quantity: number
          p_type?: string
          p_reference_id?: string
          p_notes?: string
        }
        Returns: boolean
      }
      update_product_safe: {
        Args: { product_id: string; product_data: Json }
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          created_by_user_id: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          form_template_id: string | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean
          is_featured: boolean | null
          is_new: boolean | null
          is_sold_by_unit: boolean | null
          last_inventory_update: string | null
          min_partial_wholesale_quantity: number | null
          min_stock_level: number | null
          min_wholesale_quantity: number | null
          money_back_text: string | null
          name: string
          name_for_shipping: string | null
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          shipping_clone_id: number | null
          shipping_provider_id: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string | null
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          use_shipping_clone: boolean
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }[]
      }
      update_product_size: {
        Args: {
          size_id: string
          size_name?: string
          quantity?: number
          price?: number
          barcode?: string
          is_default?: boolean
        }
        Returns: boolean
      }
      update_product_stock_safe: {
        Args: { p_product_id: string; p_quantity_sold: number }
        Returns: boolean
      }
      update_product_without_returning: {
        Args: { p_product_id: string; p_data: Json }
        Returns: boolean
      }
      update_session_activity: {
        Args: {
          p_session_token: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: boolean
      }
      update_shipping_clone_prices_batch: {
        Args: { p_clone_id: number; p_prices: Json }
        Returns: boolean
      }
      update_shipping_clone_with_prices: {
        Args: { p_clone_id: number; p_settings: Json; p_prices: Json }
        Returns: Json
      }
      update_store_components_order: {
        Args:
          | { p_organization_id: string; p_component_ids: string[] }
          | { p_organization_id: string; p_components_order: string }
        Returns: undefined
      }
      update_store_seo_settings: {
        Args: { _organization_id: string; _settings: Json }
        Returns: Json
      }
      update_user_privacy_settings: {
        Args: { p_user_id: string; p_settings: Json }
        Returns: boolean
      }
      update_user_profile: {
        Args: { profile_data: Json }
        Returns: Json
      }
      update_user_security_settings: {
        Args: { p_user_id: string; p_settings: Json }
        Returns: boolean
      }
      update_user_status: {
        Args: { new_status: string }
        Returns: Json
      }
      upload_file_direct: {
        Args: {
          p_bucket_id: string
          p_file_path: string
          p_file_data: string
          p_content_type?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      upload_organization_logo: {
        Args: {
          organization_id: string
          file_type: string
          file_name: string
          file_data: string
          content_type?: string
        }
        Returns: string
      }
      upload_organization_logo_direct: {
        Args: {
          p_organization_id: string
          p_file_type: string
          p_file_name: string
          p_file_data: string
          p_content_type?: string
        }
        Returns: Json
      }
      upsert_component_settings: {
        Args: {
          p_organization_id: string
          p_component_type: string
          p_settings: Json
          p_is_active?: boolean
          p_order_index?: number
        }
        Returns: string
      }
      upsert_domain_verification: {
        Args: {
          p_organization_id: string
          p_domain: string
          p_status?: string
          p_verification_data?: Json
        }
        Returns: undefined
      }
      upsert_form_settings: {
        Args:
          | {
              p_organization_id: string
              p_name: string
              p_fields: Json
              p_product_ids?: Json
              p_is_default?: boolean
              p_is_active?: boolean
              p_form_id?: string
              p_settings?: Json
            }
          | {
              p_organization_id: string
              p_name: string
              p_fields: Json
              p_product_ids?: Json
              p_is_default?: boolean
              p_is_active?: boolean
              p_shipping_integration?: Json
              p_form_id?: string
            }
        Returns: string
      }
      upsert_organization_settings: {
        Args: {
          p_organization_id: string
          p_theme_primary_color?: string
          p_theme_secondary_color?: string
          p_theme_mode?: string
          p_site_name?: string
          p_default_language?: string
        }
        Returns: string
      }
      upsert_pos_settings: {
        Args: { p_organization_id: string; p_settings: Json }
        Returns: string
      }
      upsert_repair_location: {
        Args: {
          p_id?: string
          p_organization_id?: string
          p_name?: string
          p_description?: string
          p_address?: string
          p_phone?: string
          p_email?: string
          p_is_active?: boolean
          p_is_default?: boolean
          p_capacity?: number
          p_working_hours?: Json
          p_specialties?: string[]
          p_manager_name?: string
        }
        Returns: string
      }
      upsert_store_component: {
        Args:
          | {
              p_component_id: string
              p_component_type: string
              p_is_active: boolean
              p_order_index: number
              p_organization_id: string
              p_settings?: Json
            }
          | {
              p_organization_id: string
              p_component_id: string
              p_component_type: string
              p_settings: Json
              p_is_active: boolean
              p_order_index: number
            }
        Returns: string
      }
      upsert_store_component_and_sync: {
        Args: {
          p_organization_id: string
          p_component_id: string
          p_component_type: string
          p_settings: Json
          p_is_active: boolean
          p_order_index: number
        }
        Returns: string
      }
      upsert_store_component_with_frontend_order: {
        Args: {
          p_component_id: string
          p_component_type: string
          p_is_active: boolean
          p_order_index: number
          p_organization_id: string
          p_settings?: Json
        }
        Returns: string
      }
      upsert_testimonial_component: {
        Args: {
          p_landing_page_id: string
          p_settings: Json
          p_position: number
          p_component_id?: string
        }
        Returns: string
      }
      upsert_yalidine_fee: {
        Args: {
          p_organization_id: string
          p_from_wilaya_id: number
          p_to_wilaya_id: number
          p_commune_id: number
          p_from_wilaya_name?: string
          p_to_wilaya_name?: string
          p_commune_name?: string
          p_zone?: number
          p_retour_fee?: number
          p_cod_percentage?: number
          p_insurance_percentage?: number
          p_oversize_fee?: number
          p_express_home?: number
          p_express_desk?: number
          p_economic_home?: number
          p_economic_desk?: number
          p_is_home_available?: boolean
          p_is_stop_desk_available?: boolean
          p_home_fee?: number
          p_stop_desk_fee?: number
        }
        Returns: number
      }
      user_can_manage_products: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      uuid_nil: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_barcode: {
        Args: { barcode: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      verify_2fa_for_login: {
        Args: { p_user_id: string; p_code: string }
        Returns: Json
      }
      verify_activation_code: {
        Args: { p_activation_code: string }
        Returns: {
          is_valid: boolean
          message: string
          plan_name: string
          plan_code: string
          expires_at: string
        }[]
      }
      verify_domain_access: {
        Args: { p_user_id: string; p_domain?: string; p_subdomain?: string }
        Returns: Json
      }
      verify_totp_code: {
        Args: { p_user_id: string; p_code: string }
        Returns: boolean
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      file_type: "logo" | "favicon"
      landing_page_component_type:
        | "header"
        | "hero"
        | "features"
        | "pricing"
        | "testimonials"
        | "cta"
        | "faq"
        | "contact"
        | "footer"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: string | null
        url: string | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content: string | null
        content_type: string | null
      }
      shipping_calculation_result: {
        success: boolean | null
        price: number | null
        error: string | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      file_type: ["logo", "favicon"],
      landing_page_component_type: [
        "header",
        "hero",
        "features",
        "pricing",
        "testimonials",
        "cta",
        "faq",
        "contact",
        "footer",
      ],
    },
  },
} as const
