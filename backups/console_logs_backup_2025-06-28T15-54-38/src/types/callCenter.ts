// =====================================================
// أنواع وواجهات نظام مركز الاتصال
// =====================================================

import { UserRole } from './index';

// حالات المكالمات
export type CallStatus = 
  | 'answered'      // تم الرد
  | 'no_answer'     // لم يتم الرد
  | 'busy'          // مشغول
  | 'invalid_number' // رقم غير صحيح
  | 'failed'        // فشل في الاتصال
  | 'cancelled';    // ملغية

// نتائج المكالمات
export type CallOutcome = 
  | 'confirmed'     // مؤكد
  | 'cancelled'     // ملغي
  | 'rescheduled'   // مؤجل
  | 'no_interest'   // غير مهتم
  | 'callback_requested' // طلب معاودة الاتصال
  | 'wrong_number'  // رقم خاطئ
  | 'customer_unavailable'; // العميل غير متاح

// أولويات الطلبيات
export type OrderPriority = 
  | 0  // عادي
  | 1  // عالي
  | 2  // عاجل
  | 3; // طارئ

// حالة الموظف
export type AgentStatus = 
  | 'available'     // متاح
  | 'busy'          // مشغول
  | 'on_break'      // في استراحة
  | 'offline'       // غير متصل
  | 'in_training';  // في تدريب

// نوع الجلسة
export type SessionType = 
  | 'regular'       // عادية
  | 'overtime'      // إضافية
  | 'training'      // تدريب
  | 'meeting';      // اجتماع

// =====================================================
// صلاحيات مركز الاتصال
// =====================================================

export interface CallCenterPermissions {
  // صلاحيات الطلبيات
  viewAssignedOrders: boolean;        // عرض الطلبيات المخصصة
  updateCallStatus: boolean;          // تحديث حالة المكالمة
  addCallNotes: boolean;              // إضافة ملاحظات المكالمة
  scheduleCallbacks: boolean;         // جدولة معاودة الاتصال
  reassignOrders: boolean;            // إعادة تخصيص الطلبيات
  viewAllOrders: boolean;             // عرض جميع الطلبيات (للمشرفين)
  
  // صلاحيات المكالمات
  makeOutboundCalls: boolean;         // إجراء مكالمات صادرة
  receiveInboundCalls: boolean;       // استقبال مكالمات واردة
  transferCalls: boolean;             // تحويل المكالمات
  recordCalls: boolean;               // تسجيل المكالمات
  
  // صلاحيات الإحصائيات والتقارير
  viewOwnPerformance: boolean;        // عرض الأداء الشخصي
  viewTeamPerformance: boolean;       // عرض أداء الفريق
  viewDetailedReports: boolean;       // عرض التقارير المفصلة
  exportReports: boolean;             // تصدير التقارير
  
  // صلاحيات إدارية
  manageAgents: boolean;              // إدارة الموظفين (للمشرفين)
  assignOrdersToAgents: boolean;      // تخصيص الطلبيات للموظفين
  viewAgentSessions: boolean;         // عرض جلسات الموظفين
  manageWorkSchedules: boolean;       // إدارة جداول العمل
  
  // صلاحيات النظام
  accessCallCenterDashboard: boolean; // الوصول للوحة التحكم
  manageCallCenterSettings: boolean;  // إدارة إعدادات مركز الاتصال
  viewSystemLogs: boolean;            // عرض سجلات النظام
  escalateToSupervisor: boolean;      // التصعيد للمشرف
}

// =====================================================
// واجهات موظف مركز الاتصال
// =====================================================

export interface CallCenterAgent {
  id: string;
  user_id: string;
  organization_id: string;
  
  // إعدادات التخصيص
  assigned_regions: string[];         // الولايات المخصصة
  assigned_stores: string[];          // المتاجر المخصصة
  max_daily_orders: number;           // الحد الأقصى للطلبيات اليومية
  
  // حالة الموظف
  is_available: boolean;              // متاح للعمل
  is_active: boolean;                 // نشط في النظام
  status: AgentStatus;                // حالة الموظف الحالية
  last_activity: Date;                // آخر نشاط
  
  // إعدادات الأداء
  performance_metrics: {
    total_orders_handled: number;
    successful_calls: number;
    failed_calls: number;
    avg_call_duration: number;
    customer_satisfaction: number;
    last_performance_update: Date | null;
  };
  
  // معلومات إضافية
  specializations: string[];          // التخصصات
  work_schedule: {
    [day: string]: {
      start: string;
      end: string;
      active: boolean;
    };
  };
  
  // الصلاحيات
  permissions: CallCenterPermissions;
  
  // طوابع زمنية
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// واجهات جلسة العمل
// =====================================================

export interface CallCenterSession {
  id: string;
  agent_id: string;
  
  // معلومات الجلسة
  start_time: Date;
  end_time?: Date;
  session_duration?: number;          // بالدقائق
  
  // إحصائيات الجلسة
  orders_handled: number;
  calls_made: number;
  successful_calls: number;
  failed_calls: number;
  
  // ملاحظات وتفاصيل
  session_notes?: string;
  session_type: SessionType;
  
  // معلومات النظام
  ip_address?: string;
  user_agent?: string;
  
  created_at: Date;
}

// =====================================================
// واجهات سجل المكالمات
// =====================================================

export interface CallLog {
  id: string;
  agent_id: string;
  order_id: string;
  
  // معلومات المكالمة
  call_start_time: Date;
  call_end_time?: Date;
  call_duration?: number;             // بالثواني
  
  // نتيجة المكالمة
  call_status: CallStatus;
  call_outcome?: CallOutcome;
  
  // ملاحظات المكالمة
  call_notes?: string;
  customer_feedback?: string;
  follow_up_required: boolean;
  follow_up_date?: Date;
  
  // معلومات إضافية
  phone_number?: string;
  call_attempt_number: number;
  
  created_at: Date;
}

// =====================================================
// واجهات إحصائيات الأداء
// =====================================================

export interface AgentPerformanceStats {
  id: string;
  agent_id: string;
  date: Date;
  
  // إحصائيات الطلبيات
  orders_assigned: number;
  orders_completed: number;
  orders_cancelled: number;
  orders_pending: number;
  
  // إحصائيات المكالمات
  calls_made: number;
  successful_calls: number;
  failed_calls: number;
  no_answer_calls: number;
  
  // أوقات الأداء
  avg_call_duration?: number;         // بالثواني
  total_work_time?: number;           // بالدقائق
  break_time?: number;                // بالدقائق
  
  // تقييمات
  customer_satisfaction_score?: number; // من 0 إلى 5
  supervisor_rating?: number;         // من 0 إلى 5
  
  // معدلات محسوبة
  success_rate: number;               // نسبة النجاح
  completion_rate: number;            // نسبة الإنجاز
  
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// واجهات الطلبيات المحسنة
// =====================================================

export interface CallCenterOrder {
  id: string;
  customer_order_number?: number;
  
  // معلومات التخصيص
  assigned_agent_id?: string;
  agent_priority: OrderPriority;
  assignment_timestamp?: Date;
  
  // معلومات المكالمات
  call_attempts: number;
  last_call_attempt?: Date;
  next_call_scheduled?: Date;
  
  // حالة الطلب
  status: string;
  call_confirmation_status_id?: number;
  call_confirmation_notes?: string;
  
  // بيانات العميل
  form_data?: {
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    province?: string;
    municipality?: string;
    [key: string]: any;
  };
  
  // معلومات إضافية
  total: number;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// واجهات لوحة التحكم
// =====================================================

export interface AgentDashboardStats {
  today: {
    orders_assigned: number;
    orders_completed: number;
    calls_made: number;
    successful_calls: number;
    success_rate: number;
    completion_rate: number;
  };
  pending_orders: number;
  high_priority_orders: number;
  overdue_calls: number;
  active_session?: {
    id: string;
    start_time: Date;
    orders_handled: number;
    calls_made: number;
  };
}

export interface TeamDashboardStats {
  total_agents: number;
  active_agents: number;
  available_agents: number;
  total_orders_today: number;
  completed_orders_today: number;
  pending_orders: number;
  avg_success_rate: number;
  avg_completion_rate: number;
}

// =====================================================
// واجهات الفلاتر والبحث
// =====================================================

export interface OrderFilter {
  status?: string[];
  priority?: OrderPriority[];
  assigned_agent_id?: string;
  date_from?: Date;
  date_to?: Date;
  search_query?: string;
  call_status?: string[];
}

export interface AgentFilter {
  status?: AgentStatus[];
  is_available?: boolean;
  regions?: string[];
  stores?: string[];
  search_query?: string;
}

// =====================================================
// واجهات الاستجابات من API
// =====================================================

export interface AssignOrdersResponse {
  assigned_count: number;
  failed_orders: string[];
  message: string;
}

export interface AvailableAgent {
  agent_id: string;
  agent_name: string;
  current_load: number;
  max_capacity: number;
  availability_score: number;
  assigned_regions: string[];
  assigned_stores: string[];
}

// =====================================================
// واجهات الإعدادات
// =====================================================

export interface CallCenterSettings {
  auto_assignment_enabled: boolean;
  max_call_attempts: number;
  callback_interval_minutes: number;
  working_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  break_duration_minutes: number;
  performance_targets: {
    min_success_rate: number;
    min_completion_rate: number;
    max_avg_call_duration: number;
  };
}

// =====================================================
// أنواع الأحداث
// =====================================================

export type CallCenterEventType = 
  | 'agent_login'
  | 'agent_logout'
  | 'call_started'
  | 'call_ended'
  | 'order_assigned'
  | 'order_completed'
  | 'break_started'
  | 'break_ended'
  | 'status_changed';

export interface CallCenterEvent {
  id: string;
  type: CallCenterEventType;
  agent_id: string;
  data: Record<string, any>;
  timestamp: Date;
}

// =====================================================
// أنواع الإشعارات
// =====================================================

export type NotificationType = 
  | 'new_order_assigned'
  | 'callback_reminder'
  | 'performance_alert'
  | 'system_message'
  | 'supervisor_message';

export interface CallCenterNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  agent_id?: string;
  is_read: boolean;
  created_at: Date;
  expires_at?: Date;
}
