import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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

    const res = await fetch('/api/admin/tenant/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'create_organization_simple', payload: { name: organizationName, subdomain, ownerId: userId, settings } })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: new Error(err?.error || 'فشل إنشاء المنظمة') };
    }
    const j = await res.json();
    if (!j.organizationId) {
      return { success: false, error: new Error('فشل إنشاء المنظمة: لم يتم استرجاع المعرف') };
    }
    return { success: true, error: null, organizationId: j.organizationId };
  } catch (error) {
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
    let existingOrg: any = null;
    try {
      const checkRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations?select=id&subdomain=eq.${subdomain}&limit=1`, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      if (checkRes.ok) {
        const arr = await checkRes.json();
        existingOrg = Array.isArray(arr) ? arr[0] : null;
      }
    } catch {}
      
    if (existingOrg) {

      // محاولة ربط المستخدم بالمنظمة الموجودة
      // لاحقاً: نفّذ الربط عبر واجهة سيرفرية إذا لزم
      
      return { success: true, error: null, organizationId: existingOrg.id };
    }
    
    // 2. تحقق إذا كان المستخدم مرتبط بالفعل بمنظمة موجودة (owner_id)
    let existingOwnerOrg: any = null;
    try {
      const ownRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations?select=id&owner_id=eq.${userId}&limit=1`, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      if (ownRes.ok) {
        const arr = await ownRes.json();
        existingOwnerOrg = Array.isArray(arr) ? arr[0] : null;
      }
    } catch {}
      
    if (existingOwnerOrg) {
      
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
    const insertRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations`, {
      method: 'POST',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(orgData)
    });

    if (!insertRes.ok) {

      // في حالة وجود خطأ تكرار البيانات أو ON CONFLICT، نبحث عن المؤسسة الموجودة
      if (insertError.code === '23505' || insertError.code === '42P10') {

        // البحث مرة أخرى باستخدام النطاق الفرعي بعد محاولة الإدراج
        let subData: any = null;
        try {
          const getRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations?select=id&subdomain=eq.${subdomain}&limit=1`, {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          });
          if (getRes.ok) {
            const arr = await getRes.json();
            subData = Array.isArray(arr) ? arr[0] : null;
          }
        } catch {}
          
        if (subData) {
          // تحديث ربط المستخدم بالمنظمة الموجودة
          // لاحقاً: نفّذ الربط عبر واجهة سيرفرية إذا لزم
          
          return { success: true, error: null, organizationId: subData.id };
        }
      }
      
      return { success: false, error: new Error(`فشل إنشاء المؤسسة (${insertRes.status})`) };
    }
    
    // 4. البحث عن معرف المؤسسة المنشأة حديثًا
    let createdOrg: any = null;
    try {
      const go = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/organizations?select=id&subdomain=eq.${subdomain}&limit=1`, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      if (go.ok) {
        const arr = await go.json();
        createdOrg = Array.isArray(arr) ? arr[0] : null;
      }
    } catch {}
      
    if (!createdOrg) {
      return { success: false, error: new Error('فشل في العثور على المؤسسة المنشأة حديثًا') };
    }
    
    const organizationId = createdOrg.id;

    // 5. إضافة سجل تدقيق
    // سجل تدقيق يمكن تنفيذه لاحقاً عبر واجهة سيرفرية

    // 6. تحديث المستخدم لجعله مسؤول عن المؤسسة
    // تحديث المستخدم سيتم عبر سيرفر لاحقاً إذا تطلبت RLS

    // إضافة المكونات الافتراضية للمتجر
    const componentsResult = await createDefaultStoreComponents(organizationId);

    return {
      success: true,
      error: null,
      organizationId: organizationId
    };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * إضافة المكونات الافتراضية للمتجر بعد إنشاء المؤسسة
 */
export const createDefaultStoreComponents = async (organizationId: string): Promise<boolean> => {
  try {
    // حالياً لا نفعل شيئاً هنا لتفادي صلاحيات السيرفر. يمكن تنفيذ الإدراج عبر واجهة سيرفرية لاحقاً.
    return true;
  } catch {
    return true;
  }
};
