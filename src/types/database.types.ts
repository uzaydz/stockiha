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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_verifications: {
        Row: {
          id: string
          organization_id: string
          domain: string
          status: string
          verification_code: string | null
          verification_data: Json | null
          verified_at: string | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
          last_checked: string | null
          verification_message: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          domain: string
          status: string
          verification_code?: string | null
          verification_data?: Json | null
          verified_at?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_checked?: string | null
          verification_message?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          domain?: string
          status?: string
          verification_code?: string | null
          verification_data?: Json | null
          verified_at?: string | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_checked?: string | null
          verification_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
        Relationships: []
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "inventory_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "online_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          subtotal: number
          tax: number
          total: number
          updated_at: string | null
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
          subtotal: number
          tax: number
          total: number
          updated_at?: string | null
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
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string | null
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      order_items: {
        Row: {
          id: string
          is_digital: boolean
          is_wholesale: boolean | null
          name: string
          order_id: string
          organization_id: string
          original_price: number | null
          product_id: string
          product_name: string
          quantity: number
          slug: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          is_digital: boolean
          is_wholesale?: boolean | null
          name: string
          order_id: string
          organization_id: string
          original_price?: number | null
          product_id: string
          product_name: string
          quantity: number
          slug: string
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          is_digital?: boolean
          is_wholesale?: boolean | null
          name?: string
          order_id?: string
          organization_id?: string
          original_price?: number | null
          product_id?: string
          product_name?: string
          quantity?: number
          slug?: string
          total_price?: number
          unit_price?: number
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
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
          amount_paid: number | null
          consider_remaining_as_partial: boolean | null
          created_at: string | null
          customer_id: string | null
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
          amount_paid?: number | null
          consider_remaining_as_partial?: boolean | null
          created_at?: string | null
          customer_id?: string | null
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
          amount_paid?: number | null
          consider_remaining_as_partial?: boolean | null
          created_at?: string | null
          customer_id?: string | null
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      products: {
        Row: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
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
          category: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description: string
          fast_shipping_text?: string | null
          features?: string[] | null
          has_fast_shipping?: boolean | null
          has_money_back?: boolean | null
          has_quality_guarantee?: boolean | null
          has_variants?: boolean
          id?: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price?: number | null
          price: number
          purchase_page_config?: Json | null
          purchase_price?: number | null
          quality_guarantee_text?: string | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          show_price_on_landing?: boolean
          sku: string
          slug?: string | null
          specifications?: Json | null
          stock_quantity: number
          subcategory?: string | null
          subcategory_id?: string | null
          thumbnail_image: string
          unit_purchase_price?: number | null
          unit_sale_price?: number | null
          unit_type?: string | null
          updated_at?: string | null
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
          category?: string
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string
          fast_shipping_text?: string | null
          features?: string[] | null
          has_fast_shipping?: boolean | null
          has_money_back?: boolean | null
          has_quality_guarantee?: boolean | null
          has_variants?: boolean
          id?: string
          images?: string[]
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
          organization_id?: string
          partial_wholesale_price?: number | null
          price?: number
          purchase_page_config?: Json | null
          purchase_price?: number | null
          quality_guarantee_text?: string | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          show_price_on_landing?: boolean
          sku?: string
          slug?: string | null
          specifications?: Json | null
          stock_quantity?: number
          subcategory?: string | null
          subcategory_id?: string | null
          thumbnail_image?: string
          unit_purchase_price?: number | null
          unit_sale_price?: number | null
          unit_type?: string | null
          updated_at?: string | null
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
            referencedRelation: "organizations"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "users"
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
            foreignKeyName: "service_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
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
            foreignKeyName: "shipping_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
        Relationships: [
          {
            foreignKeyName: "flexi_networks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          role: string
          updated_at: string | null
          whatsapp_connected: boolean | null
          whatsapp_enabled: boolean | null
          whatsapp_phone: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          name: string
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role: string
          updated_at?: string | null
          whatsapp_connected?: boolean | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          name?: string
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      yalidine_centers_global: {
        Row: {
          address: string | null
          center_id: number
          commune_id: number
          commune_name: string
          gps: string | null
          name: string
          wilaya_id: number
          wilaya_name: string
        }
        Insert: {
          address?: string | null
          center_id: number
          commune_id: number
          commune_name: string
          gps?: string | null
          name: string
          wilaya_id: number
          wilaya_name: string
        }
        Update: {
          address?: string | null
          center_id?: number
          commune_id?: number
          commune_name?: string
          gps?: string | null
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      batch_upsert_yalidine_fees: {
        Args: { p_data: Json }
        Returns: number
      }
      bulk_update_order_status: {
        Args: { p_order_ids: string[]; p_status: string; p_user_id: string }
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
      can_add_product: {
        Args: Record<PropertyKey, never>
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
      check_user_organization_access: {
        Args: { p_user_id: string; p_organization_id: string }
        Returns: boolean
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
      cleanup_unused_beforeafter_images: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          role: string
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
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }[]
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
      delete_all_yalidine_fees: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      delete_currency_balance: {
        Args: { p_balance_id: string }
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
      diagnose_yalidine_fees: {
        Args: { p_organization_id?: string }
        Returns: {
          table_name: string
          total_records: number
          trigger_status: string
          fk_constraint: string
        }[]
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
      fix_almost_paid_purchases: {
        Args: Record<PropertyKey, never>
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
          auth_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          name: string
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          role: string
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
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
          category_name: string
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
      get_featured_products: {
        Args: { p_organization_id: string }
        Returns: {
          allow_partial_wholesale: boolean | null
          allow_retail: boolean | null
          allow_wholesale: boolean | null
          barcode: string | null
          brand: string | null
          category: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
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
      get_organization_branding: {
        Args: { org_id: string }
        Returns: Json
      }
      get_organization_id_from_url: {
        Args: Record<PropertyKey, never>
        Returns: string
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
        Returns: {
          theme_primary_color: string
          theme_secondary_color: string
          theme_mode: string
          site_name: string
          logo_url: string
          favicon_url: string
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
      get_primary_keys: {
        Args: { p_table_name: string }
        Returns: {
          column_name: string
        }[]
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
          category: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
          use_sizes: boolean | null
          use_variant_prices: boolean | null
          wholesale_price: number | null
        }[]
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
        Args: { org_id: string; active_only?: boolean }
        Returns: Json
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
          category: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
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
      increment_category_count: {
        Args: { p_category_id: string; p_increment: number }
        Returns: undefined
      }
      init_store_assets_folders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      initialize_missing_flexi_balances: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      initialize_store_settings: {
        Args: { p_organization_id: string }
        Returns: boolean
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
      log_auth_attempt: {
        Args: {
          p_email: string
          p_success: boolean
          p_user_id?: string
          p_error?: string
        }
        Returns: undefined
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
      process_online_order: {
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
          p_quantity: number
          p_unit_price: number
          p_total_price: number
          p_delivery_fee: number
          p_organization_id: string
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
        Returns: Record<string, unknown>[]
      }
      record_debt_payment: {
        Args: {
          p_order_id: string
          p_amount: number
          p_is_full_payment?: boolean
        }
        Returns: string
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
      repair_inventory_inconsistencies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      revoke_activation_code: {
        Args: {
          p_activation_code: string
          p_revoked_by: string
          p_notes?: string
        }
        Returns: boolean
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
      set_user_as_org_admin: {
        Args: { user_id: string; org_id: string }
        Returns: undefined
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
      sync_featured_products_from_settings: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      sync_testimonial_items: {
        Args: { p_organization_id: string; p_testimonial_ids: string[] }
        Returns: undefined
      }
      table_exists: {
        Args: { table_name: string }
        Returns: boolean
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
      toggle_testimonial_status: {
        Args: { p_testimonial_id: string; p_is_active: boolean }
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
          category: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
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
          category: string
          category_id: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string
          fast_shipping_text: string | null
          features: string[] | null
          has_fast_shipping: boolean | null
          has_money_back: boolean | null
          has_quality_guarantee: boolean | null
          has_variants: boolean
          id: string
          images: string[]
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
          organization_id: string
          partial_wholesale_price: number | null
          price: number
          purchase_page_config: Json | null
          purchase_price: number | null
          quality_guarantee_text: string | null
          reorder_level: number | null
          reorder_quantity: number | null
          show_price_on_landing: boolean
          sku: string
          slug: string | null
          specifications: Json | null
          stock_quantity: number
          subcategory: string | null
          subcategory_id: string | null
          thumbnail_image: string
          unit_purchase_price: number | null
          unit_sale_price: number | null
          unit_type: string | null
          updated_at: string | null
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
      update_product_without_returning: {
        Args: { p_product_id: string; p_data: Json }
        Returns: boolean
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
      uuid_nil: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_barcode: {
        Args: { barcode: string }
        Returns: boolean
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
      [_ in never]: never
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
