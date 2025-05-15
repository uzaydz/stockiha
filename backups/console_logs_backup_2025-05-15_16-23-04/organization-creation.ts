import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * إنشاء مؤسسة باستخدام الوظيفة البسيطة المحسنة
 */
export const createOrganizationSimple = async (
  organizationName: string, 
  subdomain: string, 
  userId: string,
  settings: Record<string, any> = {}
): Promise<{ success: boolean; error: Error | null; organizationId?: string }> => {
  try {
    console.log('استخدام الوظيفة البسيطة لإنشاء المنظمة:', { organizationName, subdomain, userId });
    
    // استدعاء وظيفة RPC المبسطة
    const { data, error } = await supabaseAdmin.rpc(
      'insert_organization_simple',
      {
        p_name: organizationName,
        p_subdomain: subdomain,
        p_owner_id: userId,
        p_settings: settings
      }
    );

    if (error) {
      console.error('Error in createOrganizationSimple:', error);
      return { success: false, error: error as Error };
    }

    if (!data) {
      return { 
        success: false, 
        error: new Error('فشل إنشاء المنظمة: لم يتم استرجاع المعرف')
      };
    }

    console.log('تم إنشاء المنظمة بنجاح باستخدام الطريقة المبسطة، المعرف:', data);
    return { success: true, error: null, organizationId: data };
  } catch (error) {
    console.error('Exception in createOrganizationSimple:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * إنشاء مؤسسة مباشرة بدون استخدام RPC كآلية بديلة
 */
export const createOrganizationDirect = async (
  organizationName: string, 
  subdomain: string, 
  userId: string,
  settings: Record<string, any> = {}
): Promise<{ success: boolean; error: Error | null; organizationId?: string }> => {
  try {
    // 1. التحقق أولاً مما إذا كانت المنظمة موجودة بالفعل بنفس النطاق الفرعي
    const { data: existingOrg, error: checkError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
      
    if (!checkError && existingOrg) {
      console.log(`المنظمة موجودة بالفعل بالنطاق الفرعي "${subdomain}", المعرف: ${existingOrg.id}`);
      
      // محاولة ربط المستخدم بالمنظمة الموجودة
      try {
        const { error: userUpdateError } = await supabaseAdmin
          .from('users')
          .update({
            organization_id: existingOrg.id,
            is_org_admin: true,
            role: 'admin'
          })
          .eq('id', userId);
          
        if (!userUpdateError) {
          console.log(`تم ربط المستخدم بالمنظمة الموجودة بنجاح`);
        }
      } catch (connectError) {
        console.error('خطأ أثناء محاولة ربط المستخدم بالمنظمة الموجودة:', connectError);
      }
      
      return { success: true, error: null, organizationId: existingOrg.id };
    }
    
    // 2. تحقق إذا كان المستخدم مرتبط بالفعل بمنظمة موجودة (owner_id)
    const { data: existingOwnerOrg, error: ownerCheckError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();
      
    if (!ownerCheckError && existingOwnerOrg) {
      console.log(`المستخدم مالك بالفعل لمنظمة موجودة، المعرف: ${existingOwnerOrg.id}`);
      return { success: true, error: null, organizationId: existingOwnerOrg.id };
    }
    
    // 3. إنشاء المؤسسة - تجنب استخدام select بعد الإدراج لتجنب مشكلة ON CONFLICT
    const orgData = {
      name: organizationName,
      subdomain: subdomain,
      owner_id: userId,
      subscription_tier: 'trial',
      subscription_status: 'trial',
      settings: settings
    };
    
    // إدراج بدون select
    const { error: insertError } = await supabaseAdmin
      .from('organizations')
      .insert(orgData);

    if (insertError) {
      console.log('Error in direct organization creation:', insertError);
      
      // في حالة وجود خطأ تكرار البيانات أو ON CONFLICT، نبحث عن المؤسسة الموجودة
      if (insertError.code === '23505' || insertError.code === '42P10') {
        console.log('تجاهل خطأ ON CONFLICT ومحاولة إيجاد المنظمة بطريقة بديلة');
        
        // البحث مرة أخرى باستخدام النطاق الفرعي بعد محاولة الإدراج
        const { data: subData, error: subError } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .maybeSingle();
          
        if (!subError && subData) {
          // تحديث ربط المستخدم بالمنظمة الموجودة
          try {
            await supabaseAdmin
              .from('users')
              .update({
                organization_id: subData.id,
                is_org_admin: true,
                role: 'admin'
              })
              .eq('id', userId);
          } catch (userError) {
            console.log('خطأ في تحديث معلومات المستخدم (غير حرج):', userError);
          }
          
          return { success: true, error: null, organizationId: subData.id };
        }
      }
      
      return { success: false, error: insertError as Error };
    }
    
    // 4. البحث عن معرف المؤسسة المنشأة حديثًا
    const { data: createdOrg, error: searchError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
      
    if (searchError || !createdOrg) {
      console.error('خطأ في العثور على المؤسسة بعد إنشائها:', searchError);
      return { success: false, error: searchError || new Error('فشل في العثور على المؤسسة المنشأة حديثًا') };
    }
    
    const organizationId = createdOrg.id;
    console.log(`تم إنشاء المؤسسة بنجاح مع المعرف: ${organizationId}`);

    // 5. إضافة سجل تدقيق
    try {
      await supabaseAdmin
        .from('settings_audit_log')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          setting_type: 'organization',
          setting_key: 'creation',
          action_type: 'INSERT',
          table_name: 'organizations',
          record_id: organizationId,
          new_value: JSON.stringify(orgData),
          old_value: null
        });
    } catch (auditError) {
      console.error('Error creating audit log (non-critical):', auditError);
      // لا نعيد فشل العملية إذا فشل إنشاء سجل التدقيق
    }

    // 6. تحديث المستخدم لجعله مسؤول عن المؤسسة
    try {
      // استخدم UPDATE لتحديث معلومات المستخدم
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          organization_id: organizationId,
          is_org_admin: true,
          role: 'admin'
        })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('Error updating user record:', userUpdateError);
        
        // محاولة الإدراج بدلاً من التحديث
        const { error: userInsertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            organization_id: organizationId,
            is_org_admin: true,
            role: 'admin'
          });
          
        if (userInsertError) {
          console.error('Error inserting user record:', userInsertError);
          // لا نفشل العملية بسبب فشل تحديث المستخدم
        }
      }
    } catch (userError) {
      console.error('Error updating user (non-critical):', userError);
      // لا نفشل العملية بسبب فشل تحديث المستخدم
    }

    return {
      success: true,
      error: null,
      organizationId: organizationId
    };
  } catch (error) {
    console.error('Error in createOrganizationDirect:', error);
    return { success: false, error: error as Error };
  }
}; 