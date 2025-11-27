import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner'; // استخدام sonner كما هو مستخدم في ProductForm

export interface OrganizationTemplate {
  id: string;
  name: string;
  template_type: string;
  is_default: boolean | null;
  content?: string;
}

// دالة لجلب نماذج المؤسسة
export async function getOrganizationTemplates(
  organizationId: string,
  templateType?: string // اختياري: لتصفية حسب نوع النموذج
): Promise<OrganizationTemplate[]> {
  try {
    let query = supabase
      .from('organization_templates')
      .select('id, name, template_type, is_default')
      .eq('organization_id', organizationId);

    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      toast.error('حدث خطأ أثناء تحميل نماذج المؤسسة.');
      return [];
    }
    return data || [];
  } catch (error) {
    toast.error('حدث خطأ غير متوقع أثناء تحميل نماذج المؤسسة.');
    return [];
  }
}

// يمكن إضافة دالة لجلب النموذج الافتراضي مباشرة إذا احتجنا لذلك
export async function getDefaultOrganizationTemplate(
  organizationId: string,
  templateType: string
): Promise<OrganizationTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('organization_templates')
      .select('id, name, template_type, is_default')
      .eq('organization_id', organizationId)
      .eq('template_type', templateType)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found, not an actual error for this use case
        return null;
      }
      toast.error('حدث خطأ أثناء تحميل النموذج الافتراضي للمؤسسة.');
      return null;
    }
    return data;
  } catch (error) {
    toast.error('حدث خطأ غير متوقع أثناء تحميل النموذج الافتراضي للمؤسسة.');
    return null;
  }
} 

// Cache for form settings templates to prevent repeated API calls
const formSettingsCache = new Map<string, { data: OrganizationTemplate[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// New function to fetch templates from form_settings with caching
export async function getFormSettingTemplatesForProductPage(
  organizationId: string
): Promise<OrganizationTemplate[]> {
  try {
    // Check cache first
    const cached = formSettingsCache.get(organizationId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('form_settings')
      .select('id, name, is_default')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      toast.error('حدث خطأ أثناء تحميل نماذج عرض الصفحة من form_settings.');
      return [];
    }

    // Filter out invalid UUIDs and map the data
    const result = (data || [])
      .filter(item => item.id && typeof item.id === 'string' && item.id.length > 0)
      .map(item => ({
        ...item,
        template_type: 'FORM_SETTING_PRODUCT_PAGE'
      })) as OrganizationTemplate[];

    // Update cache
    formSettingsCache.set(organizationId, {
      data: result,
      timestamp: Date.now()
    });

    return result;

  } catch (error) {
    toast.error('حدث خطأ غير متوقع أثناء تحميل نماذج عرض الصفحة من form_settings.');
    return [];
  }
}

// حفظ/تعيين قالب واجهة المتجر كمختار للمؤسسة (is_default = true لنوع STORE_THEME)
export async function setSelectedStoreTheme(
  organizationId: string,
  templateId: string,
  templateName: string
): Promise<boolean> {
  try {
    // إلغاء التعيين الافتراضي عن بقية القوالب لنفس المؤسسة
    const { error: clearError } = await supabase
      .from('organization_templates')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('template_type', 'STORE_THEME');
    if (clearError) {
      toast.error('تعذر تحديث القالب الافتراضي الحالي.');
      // نواصل لأن بعض القواعد قد لا تمنع التعيين الجديد
    }

    // التحقق من وجود سجل للقالب المختار
    const { data: existingTemplate } = await supabase
      .from('organization_templates')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('template_type', 'STORE_THEME')
      .eq('name', templateName)
      .maybeSingle();

    if (existingTemplate) {
      // تحديث السجل الموجود
      const { error: updateError } = await supabase
        .from('organization_templates')
        .update({ is_default: true })
        .eq('id', existingTemplate.id);

      if (updateError) {
        toast.error('تعذر حفظ القالب المختار للمؤسسة.');
        return false;
      }
    } else {
      // إدراج سجل جديد - السماح لقاعدة البيانات بتوليد UUID
      const { error: insertError } = await supabase
        .from('organization_templates')
        .insert({
          name: templateName,
          template_type: 'STORE_THEME',
          is_default: true,
          organization_id: organizationId,
          content: templateId // حفظ معرف القالب في حقل content
        });

      if (insertError) {
        toast.error('تعذر حفظ القالب المختار للمؤسسة.');
        return false;
      }
    }
    return true;
  } catch (e) {
    toast.error('حدث خطأ غير متوقع أثناء حفظ القالب.');
    return false;
  }
}

// جلب القالب المختار لواجهة المتجر للمؤسسة (أو null إن لم يوجد)
export async function getSelectedStoreTheme(
  organizationId: string
): Promise<OrganizationTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('organization_templates')
      .select('id, name, template_type, is_default, content')
      .eq('organization_id', organizationId)
      .eq('template_type', 'STORE_THEME')
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();
    if (error) {
      return null;
    }
    // إرجاع content كـ id (معرف القالب الأصلي)
    if (data) {
      return {
        ...data,
        id: data.content || data.id // استخدام content إذا كان موجود، وإلا UUID
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}
