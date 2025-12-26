import type { Json } from './base';

export type ShippingTables = {

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

// 📊 الجداول المتاحة في هذه الفئة
export const shippingTableNames = [
  'shipping_orders',
  'shipping_provider_clones',
  'shipping_provider_settings',
  'shipping_providers',
  'shipping_rates',
  'shipping_clone_prices',
  'yalidine_centers',
  'yalidine_centers_global',
  'yalidine_fees',
  'yalidine_global_info',
  'yalidine_municipalities',
  'yalidine_municipalities_global',
  'yalidine_provinces',
  'yalidine_provinces_global'
] as const;

export type ShippingTableName = typeof shippingTableNames[number];
