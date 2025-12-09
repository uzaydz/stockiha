import { supabase } from '@/lib/supabase';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { v4 as uuidv4 } from 'uuid';

/**
 * واجهة بيانات الديون حسب العميل
 */
export interface CustomerDebtsInfo {
  customerId: string;
  customerName: string;
  totalDebts: number;
  ordersCount: number;
}

/**
 * واجهة بيانات طلب الدين
 */
export interface DebtOrder {
  orderId: string;
  orderNumber: string;
  date: string;
  total: number;
  amountPaid: number;
  remainingAmount: number;
  employee: string;
  _synced?: boolean;
  _syncStatus?: string;
  _pendingOperation?: string;
}

/**
 * واجهة بيانات ديون العميل
 */
export interface CustomerDebt {
  customerId: string;
  customerName: string;
  totalDebt: number;
  ordersCount: number;
  orders: DebtOrder[];
}

/**
 * واجهة بيانات الديون الكاملة
 */
export interface DebtsData {
  totalDebts: number;
  totalPartialPayments: number;
  debtsByCustomer: CustomerDebtsInfo[];
  customerDebts: CustomerDebt[];
}

/**
 * الحصول على بيانات الديون
 * @param organizationId معرف المؤسسة
 */
export const getDebtsData = async (organizationId: string): Promise<DebtsData> => {
  try {

    if (!organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // استعلام لإجمالي الديون وعدد الدفعات الجزئية
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_partial_payments_summary',
      {
        p_organization_id: organizationId
      }
    );

    if (summaryError) {
      throw summaryError;
    }

    // معالجة بيانات الملخص - تحويل من numeric/bigint إلى number
    const summary = Array.isArray(summaryData) && summaryData.length > 0
      ? {
        total_debts: typeof summaryData[0].total_debts === 'string'
          ? parseFloat(summaryData[0].total_debts)
          : Number(summaryData[0].total_debts || 0),
        total_partial_payments: typeof summaryData[0].total_partial_payments === 'string'
          ? parseInt(summaryData[0].total_partial_payments)
          : Number(summaryData[0].total_partial_payments || 0)
      }
      : { total_debts: 0, total_partial_payments: 0 };

    // استعلام للديون حسب العميل (نستخدم الوظيفة الجديدة get_debts_by_customer)
    const { data: customerDebtsData, error: customerDebtsError } = await supabase.rpc(
      'get_debts_by_customer',
      {
        p_organization_id: organizationId
      }
    );

    if (customerDebtsError) {
      throw customerDebtsError;
    }

    // معالجة بيانات الديون حسب العميل
    const debtsByCustomer: CustomerDebtsInfo[] = Array.isArray(customerDebtsData)
      ? customerDebtsData.map(item => ({
        customerId: item.customer_id,
        customerName: item.customer_name,
        totalDebts: typeof item.total_debts === 'string'
          ? parseFloat(item.total_debts)
          : Number(item.total_debts || 0),
        ordersCount: typeof item.orders_count === 'string'
          ? parseInt(item.orders_count)
          : Number(item.orders_count || 0)
      }))
      : [];

    // استعلام لديون العملاء
    const { data: customerData, error: customerError } = await supabase.rpc(
      'get_customer_debts',
      {
        p_organization_id: organizationId
      }
    );

    if (customerError) {
      throw customerError;
    }

    // استخلاص معرفات العملاء الفريدة
    const customers = Array.isArray(customerData)
      ? Array.from(new Set(customerData.map(item => item.customer_id)))
      : [];

    // تنظيم بيانات ديون العملاء
    const customerDebts: CustomerDebt[] = [];

    for (const customerId of customers) {
      const customerOrders = customerData.filter(item => item.customer_id === customerId);

      if (customerOrders.length > 0) {
        const customerName = customerOrders[0].customer_name;
        const totalDebt = customerOrders.reduce((sum, order) => {
          const amount = typeof order.remaining_amount === 'string'
            ? parseFloat(order.remaining_amount)
            : Number(order.remaining_amount || 0);
          return sum + amount;
        }, 0);

        const orders: DebtOrder[] = customerOrders.map(order => ({
          orderId: order.order_id,
          orderNumber: order.order_number || `طلب #${order.order_id.substring(0, 8)}`,
          date: new Date(order.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-'),
          total: typeof order.total === 'string'
            ? parseFloat(order.total)
            : Number(order.total || 0),
          amountPaid: typeof order.amount_paid === 'string'
            ? parseFloat(order.amount_paid)
            : Number(order.amount_paid || 0),
          remainingAmount: typeof order.remaining_amount === 'string'
            ? parseFloat(order.remaining_amount)
            : Number(order.remaining_amount || 0),
          employee: order.employee_name
        }));

        customerDebts.push({
          customerId,
          customerName,
          totalDebt,
          ordersCount: orders.length,
          orders
        });
      }
    }

    // ترتيب العملاء حسب إجمالي الدين (من الأعلى للأقل)
    customerDebts.sort((a, b) => b.totalDebt - a.totalDebt);

    // إعداد النتيجة النهائية
    const result: DebtsData = {
      totalDebts: summary.total_debts || 0,
      totalPartialPayments: summary.total_partial_payments || 0,
      debtsByCustomer,
      customerDebts
    };

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * تسجيل دفع دين
 * @param orderId معرف الطلب
 * @param amountPaid المبلغ المدفوع
 * @param isFullPayment هل هو دفع كامل للدين
 */
export const recordDebtPayment = async (
  orderId: string,
  amountPaid: number,
  isFullPayment: boolean
): Promise<any> => {
  try {

    if (!orderId) {
      throw new Error("معرف الطلب مطلوب");
    }

    // الحصول على بيانات الطلب أولاً
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw orderError;
    }

    if (!orderData) {
      throw new Error(`لم يتم العثور على الطلب بالمعرف: ${orderId}`);
    }

    // حساب المبلغ الإجمالي المدفوع (المبلغ السابق + المبلغ الجديد)
    const previousAmountPaid = typeof orderData.amount_paid === 'string'
      ? parseFloat(orderData.amount_paid)
      : Number(orderData.amount_paid || 0);
    const totalAmountPaid = previousAmountPaid + amountPaid;

    // حساب المبلغ المتبقي
    const total = typeof orderData.total === 'string'
      ? parseFloat(orderData.total)
      : Number(orderData.total || 0);
    const newRemainingAmount = total - totalAmountPaid;

    // تحديد حالة الدفع
    const paymentStatus = isFullPayment || newRemainingAmount <= 0 ? 'paid' : 'pending';

    // تسجيل المعاملة
    const { data: transactionData, error: transactionError } = await supabase.rpc(
      'record_payment_transaction',
      {
        p_order_id: orderId,
        p_amount: amountPaid,
        p_payment_method: 'cash', // افتراضياً نقداً
        p_is_partial: !isFullPayment && newRemainingAmount > 0,
        p_consider_remaining_as_partial: true // افتراضياً، نعتبر المبلغ المتبقي كدين
      }
    );

    if (transactionError) {
      throw transactionError;
    }

    return { success: true, transactionId: transactionData };
  } catch (error) {
    throw error;
  }
};

/**
 * إنشاء دين جديد
 * @param debtData بيانات الدين الجديد
 */
export interface CreateDebtData {
  customerId: string;
  amount: number;
  description: string;
  dueDate?: string;
  organizationId: string;
}

export const createDebt = async (debtData: CreateDebtData): Promise<any> => {
  try {
    if (!debtData.customerId) {
      throw new Error("معرف العميل مطلوب");
    }

    if (!debtData.amount || debtData.amount <= 0) {
      throw new Error("يجب إدخال مبلغ صحيح");
    }

    if (!debtData.organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // إنشاء طلب جديد كدين
    const orderData = {
      customer_id: debtData.customerId,
      total: debtData.amount,
      subtotal: debtData.amount,
      tax: 0,
      amount_paid: 0,
      remaining_amount: debtData.amount,
      payment_status: 'pending',
      status: 'pending',
      payment_method: 'debt',
      is_online: false,
      consider_remaining_as_partial: true,
      organization_id: debtData.organizationId,
      customer_notes: debtData.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    return { success: true, orderId: orderResult.id };
  } catch (error) {
    throw error;
  }
};

/**
 * ⚡ إنشاء دين جديد (Offline-First مع PowerSync)
 * @param debtData بيانات الدين الجديد
 */
export const createLocalDebt = async (debtData: CreateDebtData): Promise<{ success: boolean; orderId: string }> => {
  try {
    if (!debtData.customerId) {
      throw new Error("معرف العميل مطلوب");
    }

    if (!debtData.amount || debtData.amount <= 0) {
      throw new Error("يجب إدخال مبلغ صحيح");
    }

    if (!debtData.organizationId) {
      throw new Error("معرف المؤسسة مطلوب");
    }

    // التحقق من جاهزية PowerSync
    const ready = await powerSyncService.waitForInitialization(5000);
    if (!ready) {
      throw new Error('PowerSync غير جاهز');
    }

    const now = new Date().toISOString();
    const orderId = uuidv4();

    // إنشاء طلب جديد كدين محلياً
    // ⚡ استخدام mutate مع الواجهة الصحيحة (table, operation, data)
    await powerSyncService.mutate({
      table: 'orders',
      operation: 'INSERT',
      data: {
        id: orderId,
        organization_id: debtData.organizationId,
        customer_id: debtData.customerId,
        total: debtData.amount,
        subtotal: debtData.amount,
        tax: 0,
        discount: 0,
        amount_paid: 0,
        remaining_amount: debtData.amount,
        payment_status: 'pending',
        status: 'pending',
        payment_method: 'credit',
        is_online: 0,
        customer_notes: debtData.description || '',
        shipping_cost: 0,
        created_at: now,
        updated_at: now
      }
    });

    console.log('[createLocalDebt] ✅ Debt created offline:', orderId);
    return { success: true, orderId };
  } catch (error) {
    console.error('[createLocalDebt] ❌ Error:', error);
    throw error;
  }
};
