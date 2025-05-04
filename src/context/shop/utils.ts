import { supabase } from '@/lib/supabase';

// دالة للحصول على معرف المؤسسة
export const getOrganizationId = async (currentUser: any = null): Promise<string | null> => {
  try {
    // 1. محاولة الحصول على المعرف من المستخدم الحالي عبر API
    if (currentUser) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single();
        
      if (!userError && userData?.organization_id) {
        console.log("استخدام معرف المؤسسة من بيانات المستخدم الحالي:", userData.organization_id);
        
        // تحديث التخزين المحلي بالمعرف الصحيح
        localStorage.setItem('bazaar_organization_id', userData.organization_id);
        
        return userData.organization_id;
      }
    }
    
    // 2. محاولة الحصول من التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      console.log("استخدام معرف المؤسسة من التخزين المحلي:", storedOrgId);
      
      // التحقق من صحة المعرف المخزن
      const { data: orgExists, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', storedOrgId)
        .single();
        
      if (orgError) {
        console.error("المعرف المخزن محليًا غير صالح:", orgError);
        // حذف المعرف غير الصالح
        localStorage.removeItem('bazaar_organization_id');
      } else {
        // المعرف صالح
        return storedOrgId;
      }
    }
  
    // 3. محاولة الحصول من معلومات المستخدم الحالي في API المصادقة
    const { data: sessionData } = await supabase.auth.getSession();
    const userInfo = sessionData?.session?.user?.user_metadata;
    
    if (userInfo && userInfo.organization_id) {
      console.log("استخدام معرف المؤسسة من بيانات الجلسة:", userInfo.organization_id);
      localStorage.setItem('bazaar_organization_id', userInfo.organization_id);
      return userInfo.organization_id;
    }
    
    // 4. محاولة الحصول من قاعدة البيانات
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();
      
    if (error) {
      console.error("خطأ في جلب معرف المؤسسة من قاعدة البيانات:", error);
      return null;
    }
    
    if (orgs?.id) {
      console.log("تم العثور على معرف المؤسسة من قاعدة البيانات:", orgs.id);
      // حفظ المعرف في التخزين المحلي للاستخدام اللاحق
      localStorage.setItem('bazaar_organization_id', orgs.id);
      return orgs.id;
    }
    
    console.error("لم يتم العثور على معرف المؤسسة");
    return null;
  } catch (error) {
    console.error("خطأ أثناء جلب معرف المؤسسة:", error);
    return null;
  }
};

// دالة للتأكد من وجود العميل الزائر
export const ensureGuestCustomer = async () => {
  const guestId = '00000000-0000-0000-0000-000000000000';
  
  try {
    // التحقق من وجود العميل الزائر في جدول customers
    const { data: existingGuest, error: checkError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', guestId)
      .maybeSingle();
    
    if (checkError) {
      console.warn('خطأ في التحقق من وجود العميل الزائر في جدول customers:', checkError);
    }
    
    // استخراج معرف المؤسسة الحالية
    const organizationId = await getOrganizationId();
    
    // إذا لم يكن العميل الزائر موجوداً في جدول customers، قم بإنشائه
    if (!existingGuest) {
      console.log('إنشاء عميل زائر افتراضي في جدول customers...');
      
      if (!organizationId) {
        console.warn('لا يمكن إنشاء العميل الزائر: لم يتم العثور على معرف المؤسسة');
        return;
      }
      
      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          id: guestId,
          name: 'زائر',
          email: 'guest@example.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization_id: organizationId
        });
      
      if (insertError) {
        console.warn('خطأ في إنشاء العميل الزائر في جدول customers:', insertError);
      }
    } else if (existingGuest && !existingGuest.organization_id && organizationId) {
      // إذا كان العميل الزائر موجودًا ولكن بدون معرف مؤسسة، قم بتحديثه
      console.log('تحديث العميل الزائر الموجود بمعرف المؤسسة...');
      
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', guestId);
        
      if (updateError) {
        console.warn('خطأ في تحديث العميل الزائر في جدول customers:', updateError);
      }
    }
  } catch (error) {
    console.error('خطأ في التأكد من وجود العميل الزائر:', error);
  }
}; 