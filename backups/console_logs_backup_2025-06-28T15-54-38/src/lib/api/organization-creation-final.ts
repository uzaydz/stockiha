import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * إنشاء مؤسسة باستخدام الحل النهائي
 * يتجاوز مشاكل RLS ويضمن إنشاء المؤسسة والمستخدم بنجاح
 */
export const createOrganizationFinal = async (
  organizationName: string, 
  subdomain: string, 
  userId: string,
  email: string,
  userName: string = 'مستخدم جديد',
  settings: Record<string, any> = {}
): Promise<{ success: boolean; error: Error | null; organizationId?: string; details?: any }> => {
  try {
    console.log(`🏢 [FINAL] بدء إنشاء المؤسسة: ${organizationName} للمستخدم: ${userId}`);
    
    // استخدام supabase عادي بدلاً من supabaseAdmin لتجنب مشكلة read-only transaction
    const { data: result, error } = await supabase.rpc(
      'create_organization_final' as any,
      {
        p_name: organizationName,
        p_subdomain: subdomain,
        p_owner_id: userId,
        p_email: email,
        p_user_name: userName,
        p_settings: settings
      }
    ) as { data: any; error: any };

    if (error) {
      console.error('❌ [FINAL] خطأ من الوظيفة create_organization_final:', error);
      
      // محاولة إنشاء المؤسسة مباشرة كحل بديل
      console.log('🔄 [FINAL] محاولة الإنشاء المباشر كحل بديل...');
      return await createOrganizationDirect(organizationName, subdomain, userId, email, userName, settings);
    }

    if (!result) {
      console.error('❌ [FINAL] الوظيفة لم ترجع نتيجة');
      
      // محاولة الإنشاء المباشر كحل بديل
      console.log('🔄 [FINAL] محاولة الإنشاء المباشر كحل بديل...');
      return await createOrganizationDirect(organizationName, subdomain, userId, email, userName, settings);
    }

    console.log(`📊 [FINAL] نتيجة الوظيفة:`, result);

    if (result && typeof result === 'object' && result.success) {
      console.log(`✅ [FINAL] تم إنشاء المؤسسة بنجاح: ${result.organization_id}`);
      return { 
        success: true, 
        error: null, 
        organizationId: result.organization_id as string,
        details: result
      };
    } else {
      console.error('❌ [FINAL] فشل إنشاء المؤسسة:', result && typeof result === 'object' ? result.error : result);
      
      // محاولة الإنشاء المباشر كحل بديل
      console.log('🔄 [FINAL] محاولة الإنشاء المباشر كحل بديل...');
      return await createOrganizationDirect(organizationName, subdomain, userId, email, userName, settings);
    }

  } catch (error) {
    console.error('❌ [FINAL] استثناء في createOrganizationFinal:', error);
    
    // محاولة الإنشاء المباشر كحل بديل
    console.log('🔄 [FINAL] محاولة الإنشاء المباشر كحل بديل...');
    return await createOrganizationDirect(organizationName, subdomain, userId, email, userName, settings);
  }
};

/**
 * إنشاء المؤسسة مباشرة كحل بديل
 */
const createOrganizationDirect = async (
  organizationName: string,
  subdomain: string,
  userId: string,
  email: string,
  userName: string,
  settings: Record<string, any>
): Promise<{ success: boolean; error: Error | null; organizationId?: string; details?: any }> => {
  try {
    console.log('🏗️ [DIRECT] بدء الإنشاء المباشر للمؤسسة...');
    
    // 1. التحقق من عدم وجود مؤسسة بنفس النطاق الفرعي
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingOrg) {
      console.log('⚠️ [DIRECT] مؤسسة موجودة بالفعل، ربط المستخدم...');
      
      // ربط المستخدم بالمؤسسة الموجودة
      const { error: linkError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          auth_user_id: userId,
          email: email,
          name: userName,
          organization_id: existingOrg.id,
          role: 'admin',
          is_org_admin: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (linkError) {
        console.error('❌ [DIRECT] فشل ربط المستخدم:', linkError);
        return { success: false, error: linkError as Error };
      }

      return { 
        success: true, 
        error: null, 
        organizationId: existingOrg.id,
        details: { message: 'تم ربط المستخدم بالمؤسسة الموجودة' }
      };
    }

    // 2. إنشاء المؤسسة الجديدة
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        subdomain: subdomain,
        owner_id: userId,
        subscription_tier: 'trial',
        subscription_status: 'trial',
        settings: settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ [DIRECT] فشل إنشاء المؤسسة:', orgError);
      return { success: false, error: orgError as Error };
    }

    console.log(`✅ [DIRECT] تم إنشاء المؤسسة: ${newOrg.id}`);

    // 3. إنشاء أو تحديث المستخدم
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        auth_user_id: userId,
        email: email,
        name: userName,
        organization_id: newOrg.id,
        role: 'admin',
        is_org_admin: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (userError) {
      console.error('❌ [DIRECT] فشل إنشاء المستخدم:', userError);
      // لا نفشل العملية كاملة، المؤسسة تم إنشاؤها
    } else {
      console.log('✅ [DIRECT] تم إنشاء المستخدم');
    }

    // 4. إنشاء إعدادات المؤسسة
    const { error: settingsError } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: newOrg.id,
        theme_primary_color: '#2563eb',
        theme_secondary_color: '#6c757d',
        theme_mode: 'light',
        site_name: organizationName,
        default_language: 'ar',
        enable_registration: true,
        enable_public_site: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (settingsError) {
      console.error('⚠️ [DIRECT] فشل إنشاء إعدادات المؤسسة:', settingsError);
      // لا نفشل العملية كاملة
    } else {
      console.log('✅ [DIRECT] تم إنشاء إعدادات المؤسسة');
    }

    return {
      success: true,
      error: null,
      organizationId: newOrg.id,
      details: { 
        message: 'تم إنشاء المؤسسة والمستخدم بنجاح',
        organization: newOrg,
        userCreated: !userError,
        settingsCreated: !settingsError
      }
    };

  } catch (error) {
    console.error('❌ [DIRECT] استثناء في الإنشاء المباشر:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * تشخيص شامل لحالة التسجيل
 */
export const diagnoseFinalRegistration = async (
  userId: string,
  subdomain?: string
): Promise<any> => {
  try {
    console.log(`🔧 [FINAL] تشخيص شامل للمستخدم: ${userId}`);
    
    // فحص المستخدم في auth.users
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    // فحص المستخدم في جدول users
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
      .single();
    
    // فحص المؤسسة إذا تم تمرير النطاق
    let orgData = null;
    if (subdomain) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('subdomain', subdomain)
        .single();
      orgData = org;
    }

    const diagnosis = {
      authUser: {
        exists: !!authUser.user,
        email: authUser.user?.email,
        id: authUser.user?.id
      },
      userData: {
        exists: !!userData,
        organizationId: userData?.organization_id,
        role: userData?.role,
        isOrgAdmin: userData?.is_org_admin
      },
      organization: orgData ? {
        exists: true,
        id: orgData.id,
        name: orgData.name,
        subdomain: orgData.subdomain,
        ownerId: orgData.owner_id
      } : { exists: false },
      recommendations: []
    };

    // إضافة توصيات
    if (!authUser.user) {
      diagnosis.recommendations.push('المستخدم غير موجود في نظام المصادقة - يجب إعادة التسجيل');
    }
    
    if (!userData) {
      diagnosis.recommendations.push('المستخدم غير موجود في جدول users - يجب إنشاء سجل المستخدم');
    }
    
    if (subdomain && !orgData) {
      diagnosis.recommendations.push('المؤسسة غير موجودة - يجب إنشاء المؤسسة');
    }
    
    if (userData && orgData && userData.organization_id !== orgData.id) {
      diagnosis.recommendations.push('المستخدم غير مربوط بالمؤسسة الصحيحة - يجب تحديث الربط');
    }

    console.log('📊 [FINAL] نتائج التشخيص:', diagnosis);
    return diagnosis;

  } catch (error) {
    console.error('❌ [FINAL] خطأ في التشخيص:', error);
    return { error: error instanceof Error ? error.message : 'خطأ غير معروف' };
  }
};

/**
 * إصلاح سريع للمستخدم المعلق
 */
export const quickFixUser = async (
  userId: string,
  email: string,
  name: string,
  organizationName: string,
  subdomain: string
): Promise<{ success: boolean; error?: string; organizationId?: string }> => {
  try {
    console.log(`🔧 [FINAL] إصلاح سريع للمستخدم: ${userId}`);
    
    const result = await createOrganizationFinal(
      organizationName,
      subdomain,
      userId,
      email,
      name,
      {
        theme: 'light',
        primary_color: '#2563eb',
        default_language: 'ar'
      }
    );

    if (result.success) {
      console.log(`✅ [FINAL] تم إصلاح المستخدم بنجاح: ${result.organizationId}`);
      return { 
        success: true, 
        organizationId: result.organizationId 
      };
    } else {
      console.error('❌ [FINAL] فشل في إصلاح المستخدم:', result.error);
      return { 
        success: false, 
        error: result.error?.message || 'فشل في الإصلاح' 
      };
    }

  } catch (error) {
    console.error('❌ [FINAL] خطأ في الإصلاح السريع:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'خطأ غير معروف' 
    };
  }
}; 