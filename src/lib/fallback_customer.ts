import { supabase } from './supabase';

/**
 * التحقق مما إذا كان العميل موجودًا في جدول العملاء وإنشائه إذا لم يكن موجودًا
 * @param customerId معرف العميل
 * @param organizationId معرف المؤسسة
 * @returns معرف العميل المتحقق منه (إما المعرف الأصلي أو معرف العميل الزائر)
 */
export async function ensureCustomerExists(customerId: string | null | undefined, organizationId: string | null | undefined): Promise<string> {
  try {
    console.log("التحقق من وجود العميل:", customerId);
    
    // إذا كان المعرف فارغًا، استخدام معرف العميل الزائر
    if (!customerId || customerId === 'guest' || customerId === 'walk-in') {
      const guestId = '00000000-0000-0000-0000-000000000000';
      await ensureGuestCustomerExists(organizationId);
      console.log("استخدام معرف العميل الزائر");
      return guestId;
    }
    
    // التحقق من وجود العميل في جدول العملاء
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .maybeSingle();
      
    if (customerError) {
      console.error("خطأ في التحقق من وجود العميل:", customerError);
    }
    
    // إذا كان العميل موجودًا، استخدام المعرف الأصلي
    if (customerData) {
      console.log("العميل موجود في جدول العملاء");
      return customerId;
    }
    
    // التحقق من وجود العميل في جدول المستخدمين
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone, organization_id')
      .eq('id', customerId)
      .maybeSingle();
      
    if (userError) {
      console.error("خطأ في التحقق من وجود العميل في جدول المستخدمين:", userError);
    }
    
    // إذا كان العميل موجودًا في جدول المستخدمين، إنشاء سجل له في جدول العملاء
    if (userData) {
      console.log("العميل موجود في جدول المستخدمين، إنشاء سجل في جدول العملاء");
      
      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          organization_id: userData.organization_id || organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error("خطأ في إنشاء سجل العميل في جدول العملاء:", insertError);
        const guestId = '00000000-0000-0000-0000-000000000000';
        await ensureGuestCustomerExists(organizationId);
        return guestId;
      }
      
      return customerId;
    }
    
    // العميل غير موجود في أي من الجدولين، استخدام معرف العميل الزائر
    console.log("العميل غير موجود في أي من الجدولين، استخدام معرف العميل الزائر");
    const guestId = '00000000-0000-0000-0000-000000000000';
    await ensureGuestCustomerExists(organizationId);
    return guestId;
    
  } catch (error) {
    console.error("خطأ عام في التحقق من وجود العميل:", error);
    const guestId = '00000000-0000-0000-0000-000000000000';
    await ensureGuestCustomerExists(organizationId);
    return guestId;
  }
}

/**
 * التأكد من وجود العميل الزائر في جدول العملاء
 * @param organizationId معرف المؤسسة
 * @returns وعد بالنجاح
 */
export async function ensureGuestCustomerExists(organizationId: string | null | undefined): Promise<void> {
  try {
    console.log("التأكد من وجود العميل الزائر في جدول العملاء");
    
    // إذا لم يكن هناك معرف مؤسسة، محاولة الحصول على المعرف الافتراضي
    if (!organizationId) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();
        
      if (orgError) {
        console.error("خطأ في الحصول على معرف المؤسسة الافتراضي:", orgError);
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
      console.error("خطأ في التحقق من وجود العميل الزائر:", guestCheckError);
    }
    
    // إذا لم يكن العميل الزائر موجودًا، إنشاء سجل له
    if (!guestData) {
      console.log("إنشاء سجل للعميل الزائر في جدول العملاء");
      
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
        console.error("خطأ في إنشاء سجل العميل الزائر:", insertError);
      }
    }
  } catch (error) {
    console.error("خطأ عام في التأكد من وجود العميل الزائر:", error);
  }
} 