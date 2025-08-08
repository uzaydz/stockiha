import { supabase } from '@/lib/supabase';

export interface CreateSubscriptionTransactionParams {
  organizationId: string;
  serviceName: string;
  amount: number;
  customerName?: string;
  customerContact?: string;
  paymentMethod?: string;
  provider?: string;
  logoUrl?: string;
  trackingCode?: string;
  notes?: string;
}

export interface UpdateAccountInfoParams {
  transactionId: string;
  username?: string;
  email?: string;
  password?: string;
  notes?: string;
}

// إنشاء معاملة اشتراك جديدة
export async function createSubscriptionTransaction(params: CreateSubscriptionTransactionParams) {
  try {
    const { data, error } = await supabase.rpc('create_subscription_transaction' as any, {
      p_organization_id: params.organizationId,
      p_service_name: params.serviceName,
      p_amount: params.amount,
      p_customer_name: params.customerName || null,
      p_customer_contact: params.customerContact || null,
      p_payment_method: params.paymentMethod || 'cash',
      p_provider: params.provider || null,
      p_logo_url: params.logoUrl || null,
      p_tracking_code: params.trackingCode || null,
      p_notes: params.notes || null
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = data as { success: boolean; message?: string; transaction_id?: string; tracking_code?: string };
    if (!result.success) {
      throw new Error(result.message || 'فشل في إنشاء معاملة الاشتراك');
    }

    return {
      success: true,
      transactionId: result.transaction_id,
      trackingCode: result.tracking_code,
      message: result.message
    };
  } catch (error) {
    throw error;
  }
}

// تحديث معلومات حساب العميل
export async function updateSubscriptionAccountInfo(params: UpdateAccountInfoParams) {
  try {
    const { data, error } = await supabase.rpc('update_subscription_account_info' as any, {
      p_transaction_id: params.transactionId,
      p_username: params.username || null,
      p_email: params.email || null,
      p_password: params.password || null,
      p_notes: params.notes || null
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = data as { success: boolean; message?: string };
    if (!result.success) {
      throw new Error(result.message || 'فشل في تحديث معلومات الحساب');
    }

    return {
      success: true,
      message: result.message
    };
  } catch (error) {
    throw error;
  }
}

// حذف معاملة اشتراك
export async function deleteSubscriptionTransaction(transactionId: string) {
  try {
    // استخدام SQL مباشر لحذف المعاملة
    const { data, error } = await supabase
      .from('subscription_transactions' as any)
      .delete()
      .eq('id', transactionId)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('معاملة الاشتراك غير موجودة');
      }
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('معاملة الاشتراك غير موجودة');
    }

    return {
      success: true,
      message: 'تم حذف معاملة الاشتراك بنجاح'
    };
  } catch (error) {
    throw error;
  }
}

// جلب معاملات الاشتراكات للمؤسسة
export async function getSubscriptionTransactions(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('subscription_transactions' as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

// جلب إحصائيات معاملات الاشتراكات
export async function getSubscriptionTransactionsStats(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('subscription_transactions_stats' as any)
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data || {
      total_transactions: 0,
      completed_transactions: 0,
      pending_transactions: 0,
      failed_transactions: 0,
      total_revenue: 0,
      total_profit: 0,
      today_transactions: 0,
      today_revenue: 0
    };
  } catch (error) {
    throw error;
  }
}
