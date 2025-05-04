export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          compare_at_price: number | null
          sku: string
          barcode: string | null
          category: string
          subcategory: string | null
          brand: string | null
          images: string[]
          thumbnail_image: string
          stock_quantity: number
          features: string[] | null
          specifications: Json | null
          is_digital: boolean
          is_new: boolean | null
          is_featured: boolean | null
          created_at: string
          updated_at: string
          purchase_price: number | null
          category_id: string | null
          subcategory_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          compare_at_price?: number | null
          sku: string
          barcode?: string | null
          category: string
          subcategory?: string | null
          brand?: string | null
          images: string[]
          thumbnail_image: string
          stock_quantity: number
          features?: string[] | null
          specifications?: Json | null
          is_digital: boolean
          is_new?: boolean | null
          is_featured?: boolean | null
          created_at?: string
          updated_at?: string
          purchase_price?: number | null
          category_id?: string | null
          subcategory_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          compare_at_price?: number | null
          sku?: string
          barcode?: string | null
          category?: string
          subcategory?: string | null
          brand?: string | null
          images?: string[]
          thumbnail_image?: string
          stock_quantity?: number
          features?: string[] | null
          specifications?: Json | null
          is_digital?: boolean
          is_new?: boolean | null
          is_featured?: boolean | null
          created_at?: string
          updated_at?: string
          purchase_price?: number | null
          category_id?: string | null
          subcategory_id?: string | null
        }
      }
      product_categories: {
        Row: {
          id: string
          name: string
          description: string
          slug: string
          icon: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          type: 'product' | 'service'
          organization_id: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          slug: string
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          type: 'product' | 'service'
          organization_id?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          slug?: string
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          type?: 'product' | 'service'
          organization_id?: string
        }
      }
      product_subcategories: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string
          slug: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description: string
          slug: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string
          slug?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          estimated_time: string
          category: string
          image: string | null
          is_available: boolean
          is_price_dynamic: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          estimated_time: string
          category: string
          image?: string | null
          is_available: boolean
          is_price_dynamic?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          estimated_time?: string
          category?: string
          image?: string | null
          is_available?: boolean
          is_price_dynamic?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          role: string
          permissions: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
          organization_id: string | null
          is_org_admin: boolean | null
          is_super_admin: boolean | null
          auth_user_id: string | null
          instance_id: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone?: string | null
          role: string
          permissions?: Json | null
          is_active: boolean
          created_at?: string
          updated_at?: string
          organization_id?: string | null
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          auth_user_id?: string | null
          instance_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string | null
          role?: string
          permissions?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          organization_id?: string | null
          is_org_admin?: boolean | null
          is_super_admin?: boolean | null
          auth_user_id?: string | null
          instance_id?: string | null
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          name: string
          street_address: string
          city: string
          state: string
          postal_code: string
          country: string
          phone: string
          is_default: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          street_address: string
          city: string
          state: string
          postal_code: string
          country: string
          phone: string
          is_default: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          street_address?: string
          city?: string
          state?: string
          postal_code?: string
          country?: string
          phone?: string
          is_default?: boolean
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          subtotal: number
          tax: number
          discount: number | null
          total: number
          status: string
          payment_method: string
          payment_status: string
          shipping_address_id: string | null
          shipping_method: string | null
          shipping_cost: number | null
          notes: string | null
          is_online: boolean
          employee_id: string | null
          created_at: string
          updated_at: string
          organization_id: string
          slug: string | null
          customer_order_number: number | null
          amount_paid: number | null
          remaining_amount: number | null
          consider_remaining_as_partial: boolean | null
        }
        Insert: {
          id?: string
          customer_id: string
          subtotal: number
          tax: number
          discount?: number | null
          total: number
          status: string
          payment_method: string
          payment_status: string
          shipping_address_id?: string | null
          shipping_method?: string | null
          shipping_cost?: number | null
          notes?: string | null
          is_online: boolean
          employee_id?: string | null
          created_at?: string
          updated_at?: string
          organization_id?: string
          slug?: string | null
          customer_order_number?: number | null
          amount_paid?: number | null
          remaining_amount?: number | null
          consider_remaining_as_partial?: boolean | null
        }
        Update: {
          id?: string
          customer_id?: string
          subtotal?: number
          tax?: number
          discount?: number | null
          total?: number
          status?: string
          payment_method?: string
          payment_status?: string
          shipping_address_id?: string | null
          shipping_method?: string | null
          shipping_cost?: number | null
          notes?: string | null
          is_online?: boolean
          employee_id?: string | null
          created_at?: string
          updated_at?: string
          organization_id?: string
          slug?: string | null
          customer_order_number?: number | null
          amount_paid?: number | null
          remaining_amount?: number | null
          consider_remaining_as_partial?: boolean | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          is_digital: boolean
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          is_digital: boolean
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          is_digital?: boolean
        }
      }
      service_bookings: {
        Row: {
          id: string
          order_id: string
          service_id: string
          service_name: string
          price: number
          scheduled_date: string | null
          notes: string | null
          status: string
          assigned_to: string | null
          completed_at: string | null
          customer_id: string | null
          customer_name: string | null
          public_tracking_code: string | null
        }
        Insert: {
          id?: string
          order_id: string
          service_id: string
          service_name: string
          price: number
          scheduled_date?: string | null
          notes?: string | null
          status: string
          assigned_to?: string | null
          completed_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          public_tracking_code?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          service_id?: string
          service_name?: string
          price?: number
          scheduled_date?: string | null
          notes?: string | null
          status?: string
          assigned_to?: string | null
          completed_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          public_tracking_code?: string | null
        }
      }
      service_progress: {
        Row: {
          id: string
          service_booking_id: string
          status: string
          note: string | null
          timestamp: string
          created_by: string | null
        }
        Insert: {
          id?: string
          service_booking_id: string
          status: string
          note?: string | null
          timestamp: string
          created_by?: string | null
        }
        Update: {
          id?: string
          service_booking_id?: string
          status?: string
          note?: string | null
          timestamp?: string
          created_by?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          order_id: string | null
          amount: number
          type: string
          payment_method: string
          description: string | null
          employee_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          amount: number
          type: string
          payment_method: string
          description?: string | null
          employee_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string | null
          amount?: number
          type?: string
          payment_method?: string
          description?: string | null
          employee_id?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          category: string
          amount: number
          description: string
          date: string
          approved_by: string | null
        }
        Insert: {
          id?: string
          category: string
          amount: number
          description: string
          date: string
          approved_by?: string | null
        }
        Update: {
          id?: string
          category?: string
          amount?: number
          description?: string
          date?: string
          approved_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 