import type { Json } from './base';

export type OrdersTables = {

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

}

// 📊 الجداول المتاحة في هذه الفئة
export const ordersTableNames = [
  'orders',
  'order_items',
  'order_cancellations',
  'order_distribution_history',
  'order_distribution_settings',
  'online_orders',
  'online_order_items',
  'abandoned_carts',
  'abandoned_cart_reminders',
  'abandoned_carts_stats'
] as const;

export type OrdersTableName = typeof ordersTableNames[number];
