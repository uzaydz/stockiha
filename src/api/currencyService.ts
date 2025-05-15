import { supabase } from '../lib/supabase-client';
import type { 
  DigitalCurrency, 
  CurrencyBalance, 
  CurrencySale,
  CurrencyStats
} from '../types/flexi';

// الحصول على جميع العملات الرقمية
export async function getDigitalCurrencies(): Promise<DigitalCurrency[]> {
  // استخدام وظيفة RPC التي تتجاوز سياسات أمان الصفوف
  const { data, error } = await supabase
    .rpc('get_all_digital_currencies');
    
  if (error) {
    console.error('Error fetching digital currencies:', error);
    throw new Error('فشل في الحصول على العملات الرقمية');
  }
  
  
  return data || [];
}

// إضافة عملة رقمية جديدة
export async function addDigitalCurrency(currency: Partial<DigitalCurrency>): Promise<DigitalCurrency> {
  // استخدام وظيفة RPC لتجاوز سياسات أمان الصفوف
  const { data, error } = await supabase
    .rpc('add_digital_currency', {
      p_name: currency.name,
      p_code: currency.code,
      p_type: currency.type,
      p_icon: currency.icon || 'EuroIcon',
      p_exchange_rate: currency.exchange_rate,
      p_organization_id: currency.organization_id
    });
    
  if (error) {
    console.error('Error adding digital currency:', error);
    throw new Error('فشل في إضافة عملة رقمية جديدة');
  }
  
  
  
  // إعادة استرجاع البيانات المضافة باستخدام وظيفة RPC
  const { data: newCurrency, error: fetchError } = await supabase
    .rpc('get_digital_currency_by_id', {
      p_currency_id: data
    });
    
  if (fetchError || !newCurrency || newCurrency.length === 0) {
    console.error('Error fetching added currency:', fetchError);
    throw new Error('فشل في استرجاع بيانات العملة الرقمية المضافة');
  }
  
  return newCurrency[0] as DigitalCurrency;
}

// تحديث عملة رقمية
export async function updateDigitalCurrency(id: string, currency: Partial<DigitalCurrency>): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('update_digital_currency', {
      p_currency_id: id,
      p_name: currency.name,
      p_code: currency.code,
      p_type: currency.type || 'currency',
      p_icon: currency.icon || 'EuroIcon',
      p_exchange_rate: currency.exchange_rate,
      p_is_active: currency.is_active !== undefined ? currency.is_active : true
    });
    
  if (error) {
    console.error('Error updating digital currency:', error);
    throw new Error('فشل في تحديث العملة الرقمية');
  }
  
  return data;
}

// حذف عملة رقمية
export async function deleteDigitalCurrency(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('delete_digital_currency', {
      p_currency_id: id
    });
    
  if (error) {
    console.error('Error deleting digital currency:', error);
    throw new Error('فشل في حذف العملة الرقمية');
  }
  
  return data;
}

// الحصول على أرصدة العملات
export async function getCurrencyBalances(): Promise<CurrencyBalance[]> {
  // استخدام وظيفة RPC الجديدة التي تتجاوز سياسات RLS
  const { data, error } = await supabase
    .rpc('get_all_currency_balances');
    
  if (error) {
    console.error('Error fetching currency balances:', error);
    throw new Error('فشل في الحصول على أرصدة العملات الرقمية');
  }
  
  // تحسين عرض بيانات الرصيد في لوجات التصحيح
  
  
  // إذا كانت البيانات فارغة، يتم إرجاع مصفوفة فارغة
  if (!data || data.length === 0) {
    console.warn('لم يتم العثور على أي أرصدة للعملات الرقمية');
  }
  
  return data || [];
}

// تحديث رصيد العملة
export async function updateCurrencyBalance(currencyId: string, newBalance: number, organizationId: string): Promise<void> {
  // استخدام وظيفة RPC الجديدة التي تتجاوز سياسات RLS
  const { data, error } = await supabase
    .rpc('manage_currency_balance', {
      p_currency_id: currencyId,
      p_balance: newBalance,
      p_organization_id: organizationId
    });
      
  if (error) {
    console.error('Error updating currency balance:', error);
    throw new Error('فشل في تحديث رصيد العملة الرقمية');
  }
  
  
}

// الحصول على مبيعات العملات
export async function getCurrencySales(limit: number = 10, offset: number = 0): Promise<{ data: CurrencySale[], count: number }> {
  const { data, error, count } = await supabase
    .from('currency_sales')
    .select('*, currency:digital_currencies(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) {
    console.error('Error fetching currency sales:', error);
    throw new Error('فشل في الحصول على مبيعات العملات الرقمية');
  }
  
  return { data: data || [], count: count || 0 };
}

// إضافة عملية بيع عملة رقمية
export async function addCurrencySale(sale: Partial<CurrencySale>): Promise<CurrencySale> {
  try {
    // استخدام وظيفة RPC التي تتجاوز سياسات RLS
    const { data, error } = await supabase
      .rpc('add_currency_sale', {
        p_currency_id: sale.currency_id,
        p_amount: sale.amount,
        p_dinar_amount: sale.dinar_amount,
        p_customer_details: sale.customer_details,
        p_status: sale.status || 'completed',
        p_notes: sale.notes || null,
        p_created_by: sale.created_by || null,
        p_organization_id: sale.organization_id
      });
      
    if (error) {
      console.error('Error adding currency sale:', error);
      throw new Error('فشل في إضافة عملية بيع العملة الرقمية');
    }
    
    // إنشاء كائن المبيعات من البيانات المرسلة بدلاً من محاولة استرجاعها
    const saleData: CurrencySale = {
      id: data as string, // نفترض أن وظيفة RPC تعيد معرف UUID
      currency_id: sale.currency_id!,
      amount: sale.amount!,
      dinar_amount: sale.dinar_amount!,
      customer_details: sale.customer_details,
      status: (sale.status as 'pending' | 'completed' | 'failed') || 'completed',
      notes: sale.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: sale.created_by || null,
      organization_id: sale.organization_id!
    };
    
    return saleData;
  } catch (error) {
    console.error('Error adding currency sale:', error);
    throw new Error('فشل في إضافة عملية بيع العملة الرقمية');
  }
}

// تحديث حالة عملية بيع عملة رقمية
export async function updateCurrencySaleStatus(id: string, status: 'pending' | 'completed' | 'failed', notes?: string) {
  const updateData: Partial<CurrencySale> = { status };
  if (notes) updateData.notes = notes;
  
  const { data, error } = await supabase
    .from('currency_sales')
    .update(updateData)
    .eq('id', id)
    .select();
    
  if (error) throw error;
  return data[0] as CurrencySale;
}

// استرجاع عملية بيع عملة رقمية (في حالة الفشل)
export async function refundCurrencySale(id: string) {
  // الحصول على بيانات العملية
  const { data: sale } = await supabase
    .from('currency_sales')
    .select('*')
    .eq('id', id)
    .single();
    
  if (!sale) {
    throw new Error('العملية غير موجودة');
  }
  
  if (sale.status === 'failed') {
    throw new Error('تم استرجاع هذه العملية مسبقاً');
  }
  
  // تحديث حالة العملية
  const { error: saleError } = await supabase
    .from('currency_sales')
    .update({ status: 'failed', notes: 'تم استرجاع المبلغ' })
    .eq('id', id);
    
  if (saleError) throw saleError;
  
  // إعادة المبلغ إلى الرصيد
  const { data: balanceData } = await supabase
    .from('currency_balances')
    .select('balance')
    .eq('currency_id', sale.currency_id)
    .single();
    
  const newBalance = (balanceData?.balance || 0) + sale.amount;
  const { error: balanceError } = await supabase
    .from('currency_balances')
    .update({ balance: newBalance, updated_at: new Date() })
    .eq('currency_id', sale.currency_id);
    
  if (balanceError) throw balanceError;
  
  return true;
}

// الحصول على إحصائيات العملات
export async function getCurrencyStats(): Promise<CurrencyStats[]> {
  const { data, error } = await supabase
    .rpc('get_currency_stats');
    
  if (error) {
    console.error('Error fetching currency stats:', error);
    throw new Error('فشل في الحصول على إحصائيات العملات الرقمية');
  }
  
  return data || [];
}

// حذف رصيد عملة رقمية
export async function deleteCurrencyBalance(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('delete_currency_balance', {
      p_balance_id: id
    });
    
  if (error) {
    console.error('Error deleting currency balance:', error);
    throw new Error('فشل في حذف رصيد العملة الرقمية');
  }
  
  return data;
} 