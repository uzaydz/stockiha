import type { Json } from './base';

export type PaymentsTables = {

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

}

// 📊 الجداول المتاحة في هذه الفئة
export const paymentsTableNames = [
  'payment_methods',
  'transactions',
  'invoices',
  'invoice_items',
  'currency_balances',
  'currency_sales',
  'digital_currencies',
  'flexi_balances',
  'flexi_networks',
  'flexi_sales'
] as const;

export type PaymentsTableName = typeof paymentsTableNames[number];
