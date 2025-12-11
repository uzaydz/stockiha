/**
 * 📁 Employee Documents Types - أنواع وثائق الموظفين
 */

// ============================================
// 🎯 Enums & Constants
// ============================================

/** أنواع الوثائق */
export type DocumentType =
  | 'contract'      // عقد العمل
  | 'id_card'       // بطاقة الهوية
  | 'passport'      // جواز السفر
  | 'qualification' // مؤهل علمي
  | 'certificate'   // شهادة
  | 'medical'       // تقرير طبي
  | 'other';        // أخرى

/** تسميات أنواع الوثائق */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'عقد العمل',
  id_card: 'بطاقة الهوية',
  passport: 'جواز السفر',
  qualification: 'مؤهل علمي',
  certificate: 'شهادة',
  medical: 'تقرير طبي',
  other: 'أخرى',
};

/** أيقونات أنواع الوثائق */
export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  contract: 'file-text',
  id_card: 'credit-card',
  passport: 'book',
  qualification: 'graduation-cap',
  certificate: 'award',
  medical: 'heart-pulse',
  other: 'file',
};

/** أنواع الإنذارات */
export type WarningType =
  | 'verbal'         // شفهي
  | 'written'        // كتابي
  | 'final_warning'  // إنذار نهائي
  | 'suspension'     // إيقاف
  | 'termination';   // إنهاء خدمة

/** تسميات أنواع الإنذارات */
export const WARNING_TYPE_LABELS: Record<WarningType, string> = {
  verbal: 'إنذار شفهي',
  written: 'إنذار كتابي',
  final_warning: 'إنذار نهائي',
  suspension: 'إيقاف عن العمل',
  termination: 'إنهاء خدمة',
};

/** ألوان أنواع الإنذارات */
export const WARNING_TYPE_COLORS: Record<WarningType, string> = {
  verbal: '#F59E0B',
  written: '#F97316',
  final_warning: '#EF4444',
  suspension: '#DC2626',
  termination: '#7F1D1D',
};

/** فئات أسباب الإنذارات */
export type WarningReasonCategory =
  | 'attendance'       // حضور
  | 'performance'      // أداء
  | 'behavior'         // سلوك
  | 'policy_violation' // مخالفة سياسات
  | 'safety'           // سلامة
  | 'other';           // أخرى

/** تسميات فئات الأسباب */
export const WARNING_REASON_LABELS: Record<WarningReasonCategory, string> = {
  attendance: 'حضور وانصراف',
  performance: 'أداء وظيفي',
  behavior: 'سلوك مهني',
  policy_violation: 'مخالفة سياسات',
  safety: 'سلامة مهنية',
  other: 'أخرى',
};

/** حالات الإنذار */
export type WarningStatus =
  | 'draft'        // مسودة
  | 'issued'       // صادر
  | 'acknowledged' // تم الاستلام
  | 'appealed'     // معترض عليه
  | 'resolved'     // تم الحل
  | 'expired'      // منتهي الصلاحية
  | 'revoked';     // ملغي

// ============================================
// 📋 Main Types
// ============================================

/** وثيقة الموظف */
export interface EmployeeDocument {
  id: string;
  employee_id: string;
  organization_id: string;
  uploaded_by: string;

  // نوع الوثيقة
  document_type: DocumentType;

  // التفاصيل
  title: string;
  description?: string | null;
  file_url: string;
  file_name: string;
  file_size?: number | null;
  file_type?: string | null;

  // الصلاحية
  issue_date?: string | null;
  expiry_date?: string | null;

  // الحالة
  is_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;

  is_confidential: boolean;

  created_at: string;
  updated_at: string;
}

/** الوثيقة مع التفاصيل */
export interface DocumentWithDetails extends EmployeeDocument {
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  uploader?: {
    id: string;
    name: string;
  };
  verifier?: {
    id: string;
    name: string;
  };
  is_expired: boolean;
  days_until_expiry?: number;
}

/** إنذار الموظف */
export interface EmployeeWarning {
  id: string;
  employee_id: string;
  organization_id: string;
  issued_by: string;

  // نوع الإنذار
  warning_type: WarningType;

  // السبب
  reason_category: WarningReasonCategory;

  // التفاصيل
  title: string;
  description: string;
  incident_date?: string | null;
  evidence_urls?: string[] | null;

  // الإجراء
  action_required?: string | null;
  improvement_deadline?: string | null;

  // الحالة
  status: WarningStatus;

  // الاستلام
  acknowledged_at?: string | null;
  employee_response?: string | null;

  // الانتهاء
  expires_at?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_notes?: string | null;

  created_at: string;
  updated_at: string;
}

/** الإنذار مع التفاصيل */
export interface WarningWithDetails extends EmployeeWarning {
  employee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  issuer?: {
    id: string;
    name: string;
  };
  resolver?: {
    id: string;
    name: string;
  };
  is_active: boolean;
  days_until_expiry?: number;
}

// ============================================
// 📝 Input Types
// ============================================

/** إدخال رفع وثيقة */
export interface UploadDocumentInput {
  employee_id: string;
  document_type: DocumentType;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  issue_date?: string;
  expiry_date?: string;
  is_confidential?: boolean;
}

/** إدخال إصدار إنذار */
export interface IssueWarningInput {
  employee_id: string;
  warning_type: WarningType;
  reason_category: WarningReasonCategory;
  title: string;
  description: string;
  incident_date?: string;
  evidence_urls?: string[];
  action_required?: string;
  improvement_deadline?: string;
  expires_at?: string;
}

/** فلتر الوثائق */
export interface DocumentFilter {
  employee_id?: string;
  document_type?: DocumentType | DocumentType[];
  is_verified?: boolean;
  is_confidential?: boolean;
  expiring_within_days?: number;
}

/** فلتر الإنذارات */
export interface WarningFilter {
  employee_id?: string;
  warning_type?: WarningType | WarningType[];
  reason_category?: WarningReasonCategory | WarningReasonCategory[];
  status?: WarningStatus | WarningStatus[];
  date_from?: string;
  date_to?: string;
}

// ============================================
// 📊 Statistics Types
// ============================================

/** إحصائيات وثائق الموظف */
export interface EmployeeDocumentStats {
  employee_id: string;
  total_documents: number;
  verified_documents: number;
  pending_verification: number;
  expiring_soon: number;
  expired: number;
  by_type: {
    type: DocumentType;
    count: number;
  }[];
}

/** إحصائيات إنذارات الموظف */
export interface EmployeeWarningStats {
  employee_id: string;
  total_warnings: number;
  active_warnings: number;
  resolved_warnings: number;
  by_type: {
    type: WarningType;
    count: number;
  }[];
  by_category: {
    category: WarningReasonCategory;
    count: number;
  }[];
}

/** تنبيهات الوثائق */
export interface DocumentAlerts {
  expiring_documents: DocumentWithDetails[];
  expired_documents: DocumentWithDetails[];
  pending_verification: DocumentWithDetails[];
}
