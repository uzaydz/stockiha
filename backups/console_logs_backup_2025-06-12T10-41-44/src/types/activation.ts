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

// معلومات خطة الاشتراك (مطابقة للنوع المعرف في subscription.ts)

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
}

// نموذج إنشاء كود تفعيل جديد
export interface CreateActivationCodeDto {
  plan_id: string;
  batch_id?: string;
  billing_cycle?: 'monthly' | 'yearly';
  expires_at?: string;
  notes?: string;
}

// نموذج إنشاء دفعة أكواد تفعيل
export interface CreateActivationCodeBatchDto {
  name: string;
  plan_id: string;
  count: number;
  billing_cycle: 'monthly' | 'yearly';
  expires_at?: string;
  notes?: string;
}

// نموذج تحديث كود تفعيل
export interface UpdateActivationCodeDto {
  status?: ActivationCodeStatus;
  expires_at?: string;
  notes?: string;
}

// نموذج تفعيل اشتراك
export interface ActivateSubscriptionDto {
  organization_id: string;
  activation_code: string;
  organizationId?: string;
  activationCode?: string;
}
