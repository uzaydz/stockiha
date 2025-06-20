import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * إنشاء مؤسسة بالطريقة المحسنة والأكثر أمانًا
 */
export const createOrganizationSafe = async (
  organizationName: string, 
  subdomain: string, 
  userId: string,
  settings: Record<string, any> = {}
): Promise<{ success: boolean; error: Error | null; organizationId?: string }> => {
  try {

    // التحقق أولاً من وجود منظمة بنفس النطاق الفرعي
    const { data: existingOrg, error: checkError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
      
    if (!checkError && existingOrg) {

      // تحديث ربط المستخدم بالمنظمة الموجودة
      try {
        await supabaseAdmin
          .from('users')
          .upsert({
            id: userId,
            organization_id: existingOrg.id,
            is_org_admin: true,
            role: 'admin'
          }, { onConflict: 'id' });
      } catch (e) {
      }
      
      return { success: true, error: null, organizationId: existingOrg.id };
    }
    
    // استدعاء وظيفة RPC المحسنة - مع أسماء المعاملات المُحدثة
    const { data, error } = await supabaseAdmin.rpc(
      'create_organization_safe',
      {
        p_name: organizationName,
        p_subdomain: subdomain,
        p_owner_id: userId,
        p_settings: settings
      }
    );

    if (error) {
      // إذا كان الخطأ بسبب وجود النطاق الفرعي بالفعل (رمز الخطأ لقيد التفرد)
      // قد تحتاج إلى تعديل رمز الخطأ هذا إذا كان القيد الفريد على اسم مختلف
      if (error.code === '23505') { 
        // محاولة العثور على المنظمة الموجودة وإرجاع معرفها
        const { data: existingOrgAgain, error: fetchError } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .maybeSingle();
        
        if (!fetchError && existingOrgAgain) {
          
          // ربط المستخدم بالمنظمة الموجودة (يفترض أن RPC قد فعل ذلك بالفعل، ولكن كإجراء احترازي)
           try {
             await supabaseAdmin
               .from('users')
               .upsert({
                 id: userId,
                 organization_id: existingOrgAgain.id,
                 is_org_admin: true,
                 role: 'admin'
               }, { onConflict: 'id' });
           } catch (e) {
           }
          return { success: true, error: null, organizationId: existingOrgAgain.id };
        } else {
           // أرجع الخطأ الأصلي '23505' لأنه أكثر تحديدًا
           return { success: false, error: error as Error };
        }
      }
      
      // لأي أخطاء RPC أخرى
      return { success: false, error: error as Error };
    }

    // إذا لم يحدث خطأ، يجب أن تحتوي البيانات على معرف المنظمة
    if (!data) {
      // هذا لا ينبغي أن يحدث إذا لم يكن هناك خطأ RPC
      return { success: false, error: new Error('فشل إنشاء المنظمة: استجابة RPC غير متوقعة.') };
    }

    return { success: true, error: null, organizationId: data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
