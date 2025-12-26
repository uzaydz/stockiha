import type { Json } from './base';

export type SystemTables = {

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

      domain_verifications: {
        Row: {
          created_at: string | null
          domain: string
          error_message: string | null
          id: string
          last_checked: string | null
          organization_id: string
          status: string
          updated_at: string | null
          verification_code: string | null
          verification_data: any | null
          verification_message: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          error_message?: string | null
          id?: string
          last_checked?: string | null
          organization_id: string
          status?: string
          updated_at?: string | null
          verification_code?: string | null
          verification_data?: any | null
          verification_message?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          error_message?: string | null
          id?: string
          last_checked?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
          verification_code?: string | null
          verification_data?: any | null
          verification_message?: string | null
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

}

// 📊 الجداول المتاحة في هذه الفئة
export const systemTableNames = [
  '_rls_backup',
  'migrations_log',
  'deleted_files',
  'security_logs',
  'domain_verifications',
  'distribution_rules',
  'employee_salaries',
  'expense_categories',
  'expenses',
  'recurring_expenses',
  'lists',
  'todos',
  'whatsapp_messages',
  'whatsapp_templates',
  'wholesale_tiers',
  'organization_templates',
  'beforeafter_images',
  'pos_settings'
] as const;

export type SystemTableName = typeof systemTableNames[number];
