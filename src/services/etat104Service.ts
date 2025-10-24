/**
 * خدمة نظام كشف حساب 104
 * تحتوي على جميع الدوال للتعامل مع API و قاعدة البيانات
 */

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// =====================================================
// أنواع البيانات (Types)
// =====================================================

export interface Etat104Declaration {
  id: string;
  organization_id: string;
  year: number;
  declaration_number?: string;
  status: 'draft' | 'validated' | 'submitted' | 'corrected';
  total_clients: number;
  valid_clients: number;
  warning_clients: number;
  error_clients: number;
  total_amount_ht: number;
  total_tva: number;
  total_amount_ttc: number;
  submission_date?: string;
  validation_date?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  file_path?: string;
  exported_file_path?: string;
}

export interface Etat104Client {
  id: string;
  declaration_id: string;
  organization_id: string;
  commercial_name: string;
  nif: string;
  rc: string;
  article_number?: string;
  address: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
  validation_status: 'valid' | 'warning' | 'error' | 'pending';
  nif_verified: boolean;
  rc_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Etat104Validation {
  id: string;
  client_id: string;
  type: 'error' | 'warning';
  field: string;
  message: string;
  verification_source?: string;
  verification_date: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

export interface VerificationResult {
  isValid: boolean;
  data?: any;
  source: string;
  verificationId?: string;
  message: string;
  timestamp: string;
}

// =====================================================
// دوال إدارة الكشوفات (Declarations)
// =====================================================

/**
 * إنشاء كشف جديد
 */
export async function createDeclaration(
  organizationId: string,
  year: number
): Promise<Etat104Declaration | null> {
  try {
    const { data, error } = await supabase
      .from('etat104_declarations')
      .insert({
        organization_id: organizationId,
        year,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    
    toast.success('تم إنشاء كشف جديد بنجاح');
    return data;
  } catch (error: any) {
    console.error('Error creating declaration:', error);
    toast.error('فشل إنشاء الكشف: ' + error.message);
    return null;
  }
}

/**
 * جلب كشف حسب السنة
 */
export async function getDeclarationByYear(
  organizationId: string,
  year: number
): Promise<Etat104Declaration | null> {
  try {
    const { data, error } = await supabase
      .from('etat104_declarations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error: any) {
    console.error('Error fetching declaration:', error);
    return null;
  }
}

/**
 * جلب جميع الكشوفات للمؤسسة
 */
export async function getAllDeclarations(
  organizationId: string
): Promise<Etat104Declaration[]> {
  try {
    const { data, error } = await supabase
      .from('etat104_declarations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('year', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching declarations:', error);
    toast.error('فشل جلب الكشوفات');
    return [];
  }
}

/**
 * تحديث حالة الكشف
 */
export async function updateDeclarationStatus(
  declarationId: string,
  status: Etat104Declaration['status']
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('etat104_declarations')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', declarationId);

    if (error) throw error;
    
    toast.success('تم تحديث حالة الكشف');
    return true;
  } catch (error: any) {
    console.error('Error updating declaration status:', error);
    toast.error('فشل تحديث الحالة');
    return false;
  }
}

// =====================================================
// دوال إدارة العملاء (Clients)
// =====================================================

/**
 * إضافة عميل إلى الكشف
 */
export async function addClient(
  client: Omit<Etat104Client, 'id' | 'created_at' | 'updated_at' | 'amount_ttc'>
): Promise<Etat104Client | null> {
  try {
    const { data, error } = await supabase
      .from('etat104_clients')
      .insert(client)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error adding client:', error);
    toast.error('فشل إضافة العميل: ' + error.message);
    return null;
  }
}

/**
 * إضافة عدة عملاء دفعة واحدة
 */
export async function addMultipleClients(
  clients: Omit<Etat104Client, 'id' | 'created_at' | 'updated_at' | 'amount_ttc'>[]
): Promise<Etat104Client[]> {
  try {
    const { data, error } = await supabase
      .from('etat104_clients')
      .insert(clients)
      .select();

    if (error) throw error;
    
    toast.success(`تم إضافة ${data.length} عميل بنجاح`);
    return data || [];
  } catch (error: any) {
    console.error('Error adding multiple clients:', error);
    toast.error('فشل إضافة العملاء: ' + error.message);
    return [];
  }
}

/**
 * جلب عملاء الكشف
 */
export async function getDeclarationClients(
  declarationId: string
): Promise<Etat104Client[]> {
  try {
    const { data, error } = await supabase
      .from('etat104_clients')
      .select('*')
      .eq('declaration_id', declarationId)
      .order('commercial_name');

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

/**
 * تحديث بيانات عميل
 */
export async function updateClient(
  clientId: string,
  updates: Partial<Etat104Client>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('etat104_clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error updating client:', error);
    toast.error('فشل تحديث بيانات العميل');
    return false;
  }
}

/**
 * حذف عميل
 */
export async function deleteClient(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('etat104_clients')
      .delete()
      .eq('id', clientId);

    if (error) throw error;
    
    toast.success('تم حذف العميل');
    return true;
  } catch (error: any) {
    console.error('Error deleting client:', error);
    toast.error('فشل حذف العميل');
    return false;
  }
}

// =====================================================
// دوال التحقق (Verification)
// =====================================================

/**
 * التحقق من NIF
 */
export async function verifyNIF(
  nif: string,
  organizationId: string,
  clientId?: string
): Promise<VerificationResult | null> {
  try {
    const response = await fetch('/api/etat104/verify-nif', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nif, organizationId, clientId })
    });

    if (!response.ok) {
      throw new Error('فشل التحقق من NIF');
    }

    const result = await response.json();
    
    if (result.isValid) {
      toast.success('NIF صالح ✓');
    } else {
      toast.error('NIF غير صالح ✗');
    }
    
    return result;
  } catch (error: any) {
    console.error('Error verifying NIF:', error);
    toast.error('خطأ في التحقق من NIF');
    return null;
  }
}

/**
 * التحقق من RC
 */
export async function verifyRC(
  rc: string,
  organizationId: string,
  clientId?: string
): Promise<VerificationResult | null> {
  try {
    const response = await fetch('/api/etat104/verify-rc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rc, organizationId, clientId })
    });

    if (!response.ok) {
      throw new Error('فشل التحقق من RC');
    }

    const result = await response.json();
    
    if (result.isValid) {
      toast.success('RC صالح ✓');
    } else {
      toast.error('RC غير صالح ✗');
    }
    
    return result;
  } catch (error: any) {
    console.error('Error verifying RC:', error);
    toast.error('خطأ في التحقق من RC');
    return null;
  }
}

/**
 * التحقق من جميع عملاء الكشف
 */
export async function verifyAllClients(
  declarationId: string,
  organizationId: string
): Promise<void> {
  try {
    const clients = await getDeclarationClients(declarationId);
    
    toast.info(`جاري التحقق من ${clients.length} عميل...`);
    
    let verified = 0;
    for (const client of clients) {
      // التحقق من NIF
      if (!client.nif_verified) {
        await verifyNIF(client.nif, organizationId, client.id);
      }
      
      // التحقق من RC
      if (!client.rc_verified) {
        await verifyRC(client.rc, organizationId, client.id);
      }
      
      verified++;
      
      // تأخير صغير لتجنب إغراق الخادم
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast.success(`تم التحقق من ${verified} عميل`);
  } catch (error: any) {
    console.error('Error verifying all clients:', error);
    toast.error('فشل التحقق من العملاء');
  }
}

// =====================================================
// دوال الأخطاء والتحذيرات (Validations)
// =====================================================

/**
 * جلب أخطاء/تحذيرات عميل
 */
export async function getClientValidations(
  clientId: string
): Promise<Etat104Validation[]> {
  try {
    const { data, error } = await supabase
      .from('etat104_validations')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching validations:', error);
    return [];
  }
}

/**
 * إضافة خطأ/تحذير
 */
export async function addValidation(
  validation: Omit<Etat104Validation, 'id' | 'verification_date' | 'resolved' | 'resolved_at' | 'resolved_by'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('etat104_validations')
      .insert(validation);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error adding validation:', error);
    return false;
  }
}

/**
 * حل خطأ/تحذير
 */
export async function resolveValidation(
  validationId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('etat104_validations')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userId
      })
      .eq('id', validationId);

    if (error) throw error;
    
    toast.success('تم حل المشكلة');
    return true;
  } catch (error: any) {
    console.error('Error resolving validation:', error);
    toast.error('فشل حل المشكلة');
    return false;
  }
}

// =====================================================
// دوال التصدير (Export)
// =====================================================

/**
 * تصدير الكشف إلى Excel
 */
export async function exportToExcel(
  declarationId: string,
  organizationId: string,
  options?: {
    includeErrors?: boolean;
    includeWarnings?: boolean;
  }
): Promise<void> {
  try {
    // استيراد دالة التصدير
    const { exportEtat104ToExcel } = await import('@/utils/etat104ExportUtils');
    
    // جلب بيانات الكشف
    const { data: declaration, error: declError } = await supabase
      .from('etat104_declarations')
      .select('*')
      .eq('id', declarationId)
      .single();

    if (declError) throw declError;
    if (!declaration) throw new Error('الكشف غير موجود');

    // جلب العملاء
    const clients = await getDeclarationClients(declarationId);

    // جلب معلومات المؤسسة
    const { data: orgInfo, error: orgError } = await supabase
      .from('pos_settings')
      .select('store_name, nif, rc, nis, store_address, store_phone, store_email')
      .eq('organization_id', organizationId)
      .single();

    if (orgError) {
      console.warn('Could not fetch organization info:', orgError);
    }

    // تصدير
    await exportEtat104ToExcel(
      declaration,
      clients,
      orgInfo || {},
      options
    );
  } catch (error: any) {
    console.error('Error exporting to Excel:', error);
    toast.error('فشل التصدير: ' + error.message);
    throw error;
  }
}

/**
 * تصدير الكشف إلى PDF
 * ملاحظة: يستخدم window.print حالياً
 */
export async function exportToPDF(
  declarationId: string,
  organizationId: string
): Promise<void> {
  try {
    toast.info('جاري فتح نافذة الطباعة...');
    
    // استخدام window.print كحل مؤقت
    window.print();
    
    toast.success('يمكنك الآن الطباعة أو الحفظ كـ PDF');
  } catch (error: any) {
    console.error('Error exporting to PDF:', error);
    toast.error('فشل التصدير');
    throw error;
  }
}

/**
 * تصدير نموذج Excel فارغ
 */
export async function exportTemplate(): Promise<void> {
  try {
    const { exportEtat104Template } = await import('@/utils/etat104ExportUtils');
    exportEtat104Template();
  } catch (error: any) {
    console.error('Error exporting template:', error);
    toast.error('فشل تنزيل النموذج');
  }
}

// =====================================================
// دوال مساعدة (Helpers)
// =====================================================

/**
 * التحقق من صحة NIF (محلي)
 */
export function validateNIF(nif: string): { isValid: boolean; error?: string } {
  if (!nif) {
    return { isValid: false, error: 'NIF مطلوب' };
  }
  
  if (nif.length !== 15) {
    return { isValid: false, error: 'NIF يجب أن يكون 15 رقم' };
  }
  
  if (!/^\d+$/.test(nif)) {
    return { isValid: false, error: 'NIF يجب أن يحتوي على أرقام فقط' };
  }
  
  return { isValid: true };
}

/**
 * التحقق من صحة RC (محلي)
 */
export function validateRC(rc: string): { isValid: boolean; error?: string } {
  if (!rc) {
    return { isValid: false, error: 'RC مطلوب' };
  }
  
  if (!/^\d+$/.test(rc)) {
    return { isValid: false, error: 'RC يجب أن يحتوي على أرقام فقط' };
  }
  
  if (rc.length < 6) {
    return { isValid: false, error: 'RC قصير جداً' };
  }
  
  return { isValid: true };
}

/**
 * حساب الإحصائيات
 */
export function calculateStatistics(clients: Etat104Client[]) {
  return {
    totalClients: clients.length,
    validClients: clients.filter(c => c.validation_status === 'valid').length,
    warningClients: clients.filter(c => c.validation_status === 'warning').length,
    errorClients: clients.filter(c => c.validation_status === 'error').length,
    totalAmountHT: clients.reduce((sum, c) => sum + c.amount_ht, 0),
    totalTVA: clients.reduce((sum, c) => sum + c.tva, 0),
    totalAmountTTC: clients.reduce((sum, c) => sum + c.amount_ttc, 0),
  };
}

// =====================================================
// التكامل مع نظام العملاء (Customers Integration)
// =====================================================

/**
 * استيراد العملاء من نظام العملاء الحالي إلى كشف 104
 */
export async function importCustomersToEtat104(
  declarationId: string,
  organizationId: string,
  year: number,
  customStartDate?: string,
  customEndDate?: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  try {
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    // جلب جميع العملاء الذين لديهم NIF و RC
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .not('nif', 'is', null)
      .not('rc', 'is', null);

    if (fetchError) throw fetchError;
    if (!customers || customers.length === 0) {
      toast.info('لا يوجد عملاء بمعلومات ضريبية كاملة');
      return { imported: 0, skipped: 0, errors: [] };
    }

    // جلب مبيعات كل عميل للفترة المحددة
    const startDate = customStartDate || `${year}-01-01`;
    const endDate = customEndDate || `${year}-12-31`;
    
    console.log('📅 [Import] استخدام نطاق التاريخ:', { startDate, endDate, isCustom: !!customStartDate });

    for (const customer of customers) {
      try {
        console.log(`🔍 [Import] البحث عن مبيعات العميل: ${customer.name}`, {
          customer_id: customer.id,
          organization_id: organizationId,
          year: year,
          startDate: startDate,
          endDate: endDate,
        });
        
        // حساب إجمالي المبيعات للعميل في السنة
        const { data: orders, error: ordersError } = await supabase
          .from('online_orders')
          .select('total, tax, created_at')
          .eq('organization_id', organizationId)
          .eq('customer_id', customer.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        console.log(`📦 [Import] نتيجة البحث للعميل ${customer.name}:`, {
          orders_found: orders?.length || 0,
          error: ordersError?.message || null,
          orders_sample: orders?.slice(0, 3),
        });

        if (ordersError) {
          console.error(`❌ [Import] خطأ في جلب طلبات ${customer.name}:`, ordersError);
          errors.push(`خطأ في جلب طلبات ${customer.name}: ${ordersError.message}`);
          skipped++;
          continue;
        }

        // حساب المبالغ (حتى لو كانت 0)
        let totalAmount = 0;
        let totalTax = 0;
        let amountHT = 0;

        if (orders && orders.length > 0) {
          totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0);
          totalTax = orders.reduce((sum, order) => sum + (order.tax || 0), 0);
          amountHT = totalAmount - totalTax;
          
          console.log(`💰 [Import] حساب المبالغ للعميل ${customer.name}:`, {
            orders_count: orders.length,
            totalAmount: totalAmount,
            totalTax: totalTax,
            amountHT: amountHT,
          });
        } else {
          console.log(`⚠️ [Import] لا توجد مبيعات للعميل ${customer.name} في ${year}`);
        }

        // إضافة العميل إلى كشف 104 (حتى بدون مبيعات)
        const clientData = {
          declaration_id: declarationId,
          organization_id: organizationId,
          commercial_name: customer.name,
          nif: customer.nif!,
          rc: customer.rc!,
          article_number: customer.nis || undefined,
          address: customer.address || 'غير محدد',
          amount_ht: amountHT,
          tva: totalTax,
          validation_status: 'pending' as const,
          nif_verified: false,
          rc_verified: false
        };

        const result = await addClient(clientData);
        
        if (result) {
          imported++;
        } else {
          errors.push(`فشل إضافة ${customer.name}`);
          skipped++;
        }
      } catch (error: any) {
        errors.push(`خطأ في معالجة ${customer.name}: ${error.message}`);
        skipped++;
      }
    }

    toast.success(`تم استيراد ${imported} عميل، تم تخطي ${skipped}`);
    
    return { imported, skipped, errors };
  } catch (error: any) {
    console.error('Error importing customers:', error);
    toast.error('فشل استيراد العملاء: ' + error.message);
    return { imported: 0, skipped: 0, errors: [error.message] };
  }
}

/**
 * البحث عن عميل في نظام العملاء حسب NIF أو RC
 */
export async function findCustomerByTaxInfo(
  organizationId: string,
  nif?: string,
  rc?: string
): Promise<any | null> {
  try {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId);

    if (nif) {
      query = query.eq('nif', nif);
    } else if (rc) {
      query = query.eq('rc', rc);
    } else {
      return null;
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // لم يتم العثور على عميل
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error finding customer:', error);
    return null;
  }
}
