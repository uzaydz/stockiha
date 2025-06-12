import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * إصلاح مباشر لمشكلة تحميل بيانات المؤسسة
 */

export const debugOrganizationLoading = async (userId: string, subdomain?: string) => {
  console.log(`🔍 [Debug] بدء تشخيص تحميل المؤسسة للمستخدم: ${userId}`);
  
  try {
    // 1. الحصول على بيانات المستخدم أولاً
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, organization_id, is_org_admin')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.error(`❌ [Debug] المستخدم غير موجود:`, userError);
      return { success: false, error: 'المستخدم غير موجود' };
    }
    
    console.log(`✅ [Debug] تم العثور على المستخدم:`, user);
    
    // 2. محاولة الحصول على المؤسسة من organization_id في بيانات المستخدم
    if (user.organization_id) {
      const { data: orgById, error: orgByIdError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single();
      
      if (!orgByIdError && orgById) {
        console.log(`✅ [Debug] تم العثور على المؤسسة من organization_id:`, orgById);
        return { 
          success: true, 
          organization: orgById,
          method: 'organization_id'
        };
      } else {
        console.warn(`⚠️ [Debug] فشل في العثور على المؤسسة بـ organization_id:`, orgByIdError);
      }
    }
    
    // 3. محاولة البحث بالنطاق الفرعي
    if (subdomain) {
      const { data: orgBySubdomain, error: orgBySubdomainError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      
      if (!orgBySubdomainError && orgBySubdomain) {
        console.log(`✅ [Debug] تم العثور على المؤسسة من النطاق الفرعي:`, orgBySubdomain);
        
        // ربط المستخدم بالمؤسسة إذا لم يكن مربوطاً
        if (!user.organization_id) {
          await supabaseAdmin
            .from('users')
            .update({ organization_id: orgBySubdomain.id })
            .eq('id', userId);
          
          console.log(`🔗 [Debug] تم ربط المستخدم بالمؤسسة`);
        }
        
        return { 
          success: true, 
          organization: orgBySubdomain,
          method: 'subdomain'
        };
      } else {
        console.warn(`⚠️ [Debug] فشل في العثور على المؤسسة بالنطاق الفرعي:`, orgBySubdomainError);
      }
    }
    
    // 4. محاولة العثور على المؤسسة حيث المستخدم هو المالك
    const { data: orgByOwner, error: orgByOwnerError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('owner_id', userId)
      .single();
    
    if (!orgByOwnerError && orgByOwner) {
      console.log(`✅ [Debug] تم العثور على المؤسسة كمالك:`, orgByOwner);
      
      // تحديث بيانات المستخدم
      if (!user.organization_id) {
        await supabaseAdmin
          .from('users')
          .update({ 
            organization_id: orgByOwner.id,
            is_org_admin: true
          })
          .eq('id', userId);
        
        console.log(`🔗 [Debug] تم ربط المستخدم بمؤسسته كمالك`);
      }
      
      return { 
        success: true, 
        organization: orgByOwner,
        method: 'owner_id'
      };
    }
    
    console.error(`❌ [Debug] لم يتم العثور على أي مؤسسة للمستخدم`);
    return { success: false, error: 'لم يتم العثور على مؤسسة' };
    
  } catch (error) {
    console.error(`💥 [Debug] خطأ في تشخيص تحميل المؤسسة:`, error);
    return { success: false, error: `خطأ في التشخيص: ${error}` };
  }
};

export const fixOrganizationLoading = async (userId: string, hostname?: string) => {
  console.log(`🔧 [Fix] بدء إصلاح تحميل المؤسسة للمستخدم: ${userId}`);
  
  try {
    // استخراج النطاق الفرعي من hostname
    let subdomain = null;
    if (hostname && hostname.includes('.localhost')) {
      subdomain = hostname.split('.')[0];
      console.log(`🌐 [Fix] تم استخراج النطاق الفرعي: ${subdomain}`);
    }
    
    // تشخيص المشكلة
    const debugResult = await debugOrganizationLoading(userId, subdomain);
    
    if (debugResult.success) {
      console.log(`✅ [Fix] تم العثور على المؤسسة بنجاح`);
      return debugResult;
    }
    
    // إذا لم نجد المؤسسة، نحاول إنشاء واحدة تجريبية
    console.log(`🆕 [Fix] إنشاء مؤسسة تجريبية للمستخدم...`);
    
    const { data: newOrg, error: createError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'مؤسستي الجديدة',
        subdomain: subdomain || `org-${userId.slice(0, 8)}`,
        owner_id: userId,
        subscription_tier: 'trial',
        subscription_status: 'trial',
        settings: {
          theme: 'light',
          primary_color: '#22c55e'
        }
      })
      .select()
      .single();
    
    if (createError) {
      console.error(`❌ [Fix] فشل في إنشاء المؤسسة:`, createError);
      return { success: false, error: `فشل في إنشاء المؤسسة: ${createError.message}` };
    }
    
    // ربط المستخدم بالمؤسسة الجديدة
    await supabaseAdmin
      .from('users')
      .update({ 
        organization_id: newOrg.id,
        is_org_admin: true
      })
      .eq('id', userId);
    
    console.log(`✅ [Fix] تم إنشاء وربط مؤسسة جديدة:`, newOrg);
    
    return { 
      success: true, 
      organization: newOrg,
      method: 'created'
    };
    
  } catch (error) {
    console.error(`💥 [Fix] خطأ في إصلاح تحميل المؤسسة:`, error);
    return { success: false, error: `خطأ في الإصلاح: ${error}` };
  }
};

export const getOrganizationForCurrentUser = async () => {
  console.log(`🔍 [Current] البحث عن مؤسسة المستخدم الحالي`);
  
  try {
    // استخراج النطاق الفرعي من URL الحالي
    const hostname = window.location.hostname;
    console.log(`🌐 [Current] hostname: ${hostname}`);
    
    let subdomain = null;
    if (hostname.includes('.localhost')) {
      subdomain = hostname.split('.')[0];
      console.log(`🌐 [Current] subdomain: ${subdomain}`);
    }
    
    // البحث بالنطاق الفرعي أولاً
    if (subdomain) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      
      if (!orgError && org) {
        console.log(`✅ [Current] تم العثور على المؤسسة:`, org);
        
        // حفظ معرف المؤسسة في localStorage
        localStorage.setItem('bazaar_organization_id', org.id);
        
        return { success: true, organization: org };
      }
    }
    
    // محاولة الحصول من localStorage
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', storedOrgId)
        .single();
      
      if (!orgError && org) {
        console.log(`✅ [Current] تم العثور على المؤسسة من localStorage:`, org);
        return { success: true, organization: org };
      }
    }
    
    console.warn(`⚠️ [Current] لم يتم العثور على مؤسسة`);
    return { success: false, error: 'لم يتم العثور على مؤسسة' };
    
  } catch (error) {
    console.error(`💥 [Current] خطأ في البحث عن المؤسسة:`, error);
    return { success: false, error: `خطأ في البحث: ${error}` };
  }
}; 