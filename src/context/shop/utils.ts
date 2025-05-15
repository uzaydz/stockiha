import { supabase } from '@/lib/supabase-client';
import { getSupabaseClient } from '@/lib/supabase-client';

// دالة للحصول على معرف المؤسسة
export const getOrganizationId = async (currentUser: any = null): Promise<string | null> => {
  try {
    // 0. محاولة الحصول على المعرف من النطاق المخصص إذا كان موجودًا
    const hostname = window.location.hostname;
    if (!hostname.includes('localhost')) {
      try {
        const supabase = await getSupabaseClient();
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, domain, subdomain')
          .eq('domain', hostname)
          .single();
          
        if (orgData) {
          
          // تحديث التخزين المحلي بالمعرف الصحيح
          localStorage.setItem('bazaar_organization_id', orgData.id);
          localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
          
          return orgData.id;
        }
      } catch (customDomainError) {
        console.error("خطأ في التحقق من النطاق المخصص:", customDomainError);
      }
    }

    // 1. محاولة الحصول على المعرف من المستخدم الحالي عبر API
    if (currentUser) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single();
        
      if (!userError && userData?.organization_id) {
        
        
        // تحديث التخزين المحلي بالمعرف الصحيح
        localStorage.setItem('bazaar_organization_id', userData.organization_id);
        
        return userData.organization_id;
      }
    }
    
    // 2. محاولة الحصول من التخزين المحلي
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      
      
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