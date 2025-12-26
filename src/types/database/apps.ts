import type { Json } from './base';

export type AppsTables = {

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

}

// 📊 الجداول المتاحة في هذه الفئة
export const appsTableNames = [
  'courses',
  'course_sections',
  'course_lessons',
  'course_attachments',
  'course_notes',
  'course_quizzes',
  'user_course_progress',
  'user_quiz_results',
  'repair_orders',
  'repair_images',
  'repair_locations',
  'repair_status_history',
  'service_bookings',
  'service_progress',
  'services'
] as const;

export type AppsTableName = typeof appsTableNames[number];
