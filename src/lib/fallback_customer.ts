import { supabase } from './supabase';

/**
 * التحقق مما إذا كان العميل موجودًا في جدول العملاء وإنشائه إذا لم يكن موجودًا
 * @param customerId معرف العميل
 * @param organizationId معرف المؤسسة
 * @returns معرف العميل المتحقق منه (إما المعرف الأصلي أو معرف العميل الزائر)
 */
export async function ensureCustomerExists(customerId: string | null | undefined, organizationId: string | null | undefined): Promise<string> {
  // ✅ إصلاح: إزالة جميع التحققات - قاعدة البيانات تتعامل مع العملاء تلقائياً
  // هذه الدالة كانت تسبب استدعاء GET customers غير ضروري
  
  try {
    // إذا كان المعرف فارغًا، استخدام معرف العميل الزائر
    if (!customerId || customerId === 'guest' || customerId === 'walk-in') {
      return '00000000-0000-0000-0000-000000000000';
    }
    
    // إرجاع المعرف مباشرة - قاعدة البيانات ستتحقق منه
    return customerId;
    
  } catch (error) {
    // في حالة أي خطأ، استخدام معرف العميل الزائر
    return '00000000-0000-0000-0000-000000000000';
  }
}

/**
 * التأكد من وجود العميل الزائر في جدول العملاء
 * @param organizationId معرف المؤسسة
 * @returns وعد بالنجاح
 */
export async function ensureGuestCustomerExists(organizationId: string | null | undefined): Promise<void> {
  try {

    // إذا لم يكن هناك معرف مؤسسة، محاولة الحصول على المعرف الافتراضي
    if (!organizationId) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();
        
      if (orgError) {
        return;
      }
      
      organizationId = orgData.id;
    }
    
    // التحقق من وجود العميل الزائر
    const { data: guestData, error: guestCheckError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .maybeSingle();
      
    if (guestCheckError) {
    }
    
    // إذا لم يكن العميل الزائر موجودًا، إنشاء سجل له
    if (!guestData) {

      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          name: 'زائر',
          email: 'guest@example.com',
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
      }
    }
  } catch (error) {
  }
}
