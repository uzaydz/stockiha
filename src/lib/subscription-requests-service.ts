/**
 * خدمة إدارة طلبات الاشتراك
 */

import { supabase } from './supabase';

export interface CreateSubscriptionRequestParams {
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency?: string;
  paymentMethod?: string;
  paymentProofUrl?: string;
  paymentReference?: string;
  paymentNotes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  customerNotes?: string;
}

export interface SubscriptionRequestResult {
  success: boolean;
  request_id?: string;
  message?: string;
  error?: string;
}

/**
 * إنشاء طلب اشتراك جديد
 */
export async function createSubscriptionRequest(
  params: CreateSubscriptionRequestParams
): Promise<SubscriptionRequestResult> {
  try {
    const { data, error } = await supabase.rpc('create_subscription_request' as any, {
      p_organization_id: params.organizationId,
      p_plan_id: params.planId,
      p_billing_cycle: params.billingCycle,
      p_amount: params.amount,
      p_currency: params.currency || 'DZD',
      p_payment_method: params.paymentMethod || null,
      p_payment_proof_url: params.paymentProofUrl || null,
      p_payment_reference: params.paymentReference || null,
      p_payment_notes: params.paymentNotes || null,
      p_contact_name: params.contactName || null,
      p_contact_email: params.contactEmail || null,
      p_contact_phone: params.contactPhone || null,
      p_customer_notes: params.customerNotes || null
    });

    if (error) {
      console.error('Error creating subscription request:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return (data as any) || { success: false, error: 'Unknown error' };
  } catch (err: any) {
    console.error('Exception creating subscription request:', err);
    return {
      success: false,
      error: err.message || 'فشل في إنشاء الطلب'
    };
  }
}

/**
 * الحصول على طلبات الاشتراك للمؤسسة الحالية
 */
export async function getMySubscriptionRequests() {
  try {
    const { data, error } = await supabase
      .from('subscription_requests')
      .select(`
        *,
        plan:subscription_plans(name, code),
        reviewed_by_user:users!reviewed_by(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my subscription requests:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching my subscription requests:', err);
    return [];
  }
}
