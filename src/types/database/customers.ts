import type { Json } from './base';

export type CustomersTables = {

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

}

// 📊 الجداول المتاحة في هذه الفئة
export const customersTableNames = [
  'customers',
  'guest_customers',
  'customer_testimonials',
  'addresses',
  'call_confirmation_statuses'
] as const;

export type CustomersTableName = typeof customersTableNames[number];
