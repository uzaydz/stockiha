import { SubscriptionPlan as ImportedSubscriptionPlan } from './subscription';

/**
 * أنواع البيانات المرتبطة بأكواد التفعيل
 */

// حالات كود التفعيل
export enum ActivationCodeStatus {
  ACTIVE = 'active',     // كود نشط (غير مستخدم)
  USED = 'used',         // كود تم استخدامه
  EXPIRED = 'expired',   // كود منتهي الصلاحية
  REVOKED = 'revoked',   // كود تم إلغاؤه
}

// أنواع الوصول للدورات
export enum CoursesAccessType {
  STANDARD = 'standard',     // وصول عادي (حسب مدة الاشتراك)
  LIFETIME = 'lifetime',     // وصول مدى الحياة
  PREMIUM = 'premium'        // وصول متميز (مع ميزات إضافية)
}

// معلومات المنظمة
export interface Organization {
  id: string;
  name: string;
  email: string;
}

// نموذج كود التفعيل
export interface ActivationCode {
  id: string;
  code: string;
  status: ActivationCodeStatus;
  plan_id: string;
  batch_id?: string;
  billing_cycle: 'monthly' | 'yearly';
  organization_id?: string;
  subscription_id?: string;
  created_at: string;
  expires_at?: string;
  used_at?: string;
  notes?: string;
  created_by?: string;
  
  // الحقول الجديدة للدورات مدى الحياة
  lifetime_courses_access?: boolean;
  courses_access_type?: CoursesAccessType;
  accessible_courses?: string[]; // معرفات الدورات المفتوحة
  
  // العلاقات
  subscription_plans?: ImportedSubscriptionPlan;
  organizations?: Organization;
}

// نموذج دفعة أكواد التفعيل
export interface ActivationCodeBatch {
  id: string;
  name: string;
  plan_id: string;
  plan_name?: string;
  billing_cycle: 'monthly' | 'yearly';
  total_codes: number;
  active_codes: number;
  used_codes: number;
  expired_codes: number;
  revoked_codes: number;
  created_at: string;
  expires_at?: string;
  notes?: string;
  created_by?: string;
  
  // الحقول الجديدة للدورات مدى الحياة
  lifetime_courses_access?: boolean;
  courses_access_type?: CoursesAccessType;
}

// نموذج إنشاء كود تفعيل جديد
export interface CreateActivationCodeDto {
  plan_id: string;
  batch_id?: string;
  billing_cycle?: 'monthly' | 'yearly';
  expires_at?: string;
  notes?: string;
  
  // الحقول الجديدة للدورات مدى الحياة
  lifetime_courses_access?: boolean;
  courses_access_type?: CoursesAccessType;
  accessible_courses?: string[];
}

// نموذج إنشاء دفعة أكواد تفعيل
export interface CreateActivationCodeBatchDto {
  name: string;
  plan_id: string;
  count: number;
  billing_cycle: 'monthly' | 'yearly';
  expires_at?: string;
  notes?: string;
  
  // الحقول الجديدة للدورات مدى الحياة
  lifetime_courses_access?: boolean;
  courses_access_type?: CoursesAccessType;
  accessible_courses?: string[];
}

// نموذج تحديث كود تفعيل
export interface UpdateActivationCodeDto {
  status?: ActivationCodeStatus;
  expires_at?: string;
  notes?: string;
  
  // الحقول الجديدة للدورات مدى الحياة
  lifetime_courses_access?: boolean;
  courses_access_type?: CoursesAccessType;
  accessible_courses?: string[];
}

// نموذج تفعيل اشتراك
export interface ActivateSubscriptionDto {
  organization_id: string;
  activation_code: string;
  organizationId?: string;
  activationCode?: string;
}

// نموذج الوصول للدورات
export interface CourseAccess {
  course_id: string;
  course_title: string;
  access_type: CoursesAccessType;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  is_lifetime: boolean;
}

// نموذج نتيجة تفعيل الاشتراك مع الدورات
export interface ActivateSubscriptionResult {
  success: boolean;
  message: string;
  subscription_id?: string;
  subscription_end_date?: string;
  courses_access_granted: boolean;
}
