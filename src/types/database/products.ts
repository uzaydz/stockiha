import type { Json } from './base';

export type ProductsTables = {

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
          shipping_method_type: string | null
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
          shipping_method_type?: string | null
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
          shipping_method_type?: string | null
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

      product_subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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

}

// 📊 الجداول المتاحة في هذه الفئة
export const productsTableNames = [
  'products',
  'product_colors',
  'product_sizes',
  'product_images',
  'product_categories',
  'product_subcategories',
  'product_reviews',
  'product_advanced_settings',
  'product_marketing_settings',
  'product_media',
  'product_deletion_attempts',
  'product_wholesale_tiers'
] as const;

export type ProductsTableName = typeof productsTableNames[number];
