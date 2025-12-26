import type { Json } from './base';

export type CoreTables = {

      organizations: {
        Row: {
          business_features: Json | null
          business_type: string | null
          business_type_selected: boolean | null
          business_type_selected_at: string | null
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
          business_features?: Json | null
          business_type?: string | null
          business_type_selected?: boolean | null
          business_type_selected_at?: string | null
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
          business_features?: Json | null
          business_type?: string | null
          business_type_selected?: boolean | null
          business_type_selected_at?: string | null
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

}

// 📊 الجداول المتاحة في هذه الفئة
export const coreTableNames = [
  'organizations',
  'users',
  'user_settings',
  'user_sessions',
  'user_security_settings',
  'organization_settings',
  'settings_audit_log',
  'password_change_logs',
  'verification_codes',
  'trusted_devices',
  'privacy_settings'
] as const;

export type CoreTableName = typeof coreTableNames[number];
