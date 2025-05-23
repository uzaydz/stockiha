import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner'; // استخدام sonner كما هو مستخدم في ProductForm

export interface OrganizationTemplate {
  id: string;
  name: string;
  template_type: string;
  is_default: boolean | null;
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
      console.error('Error fetching organization templates:', error);
      toast.error('حدث خطأ أثناء تحميل نماذج المؤسسة.');
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching organization templates:', error);
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
      console.error('Error fetching default organization template:', error);
      toast.error('حدث خطأ أثناء تحميل النموذج الافتراضي للمؤسسة.');
      return null;
    }
    return data;
  } catch (error) {
    console.error('Unexpected error fetching default organization template:', error);
    toast.error('حدث خطأ غير متوقع أثناء تحميل النموذج الافتراضي للمؤسسة.');
    return null;
  }
} 

// New function to fetch templates from form_settings
export async function getFormSettingTemplatesForProductPage(
  organizationId: string
): Promise<OrganizationTemplate[]> { // Reusing OrganizationTemplate for simplicity, adjust if needed
  try {
    const { data, error } = await supabase
      .from('form_settings')
      .select('id, name, is_default') // Assuming is_default might be relevant here as well
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('is_default', { ascending: false }) // Default templates first
      .order('name', { ascending: true }); // Then by name

    if (error) {
      console.error('Error fetching form_settings templates:', error);
      toast.error('حدث خطأ أثناء تحميل نماذج عرض الصفحة من form_settings.');
      return [];
    }

    // Map the data to OrganizationTemplate structure if necessary,
    // or adjust OrganizationTemplate to be more generic or create a new type.
    // For now, assuming 'id' and 'name' are sufficient and 'is_default' exists.
    // If 'template_type' is strictly needed by the component and not available in form_settings,
    // we might need to mock it or adjust component logic.
    return (data || []).map(item => ({
      ...item,
      template_type: 'FORM_SETTING_PRODUCT_PAGE' // Mocking template_type for compatibility
    })) as OrganizationTemplate[];

  } catch (error) {
    console.error('Unexpected error fetching form_settings templates:', error);
    toast.error('حدث خطأ غير متوقع أثناء تحميل نماذج عرض الصفحة من form_settings.');
    return [];
  }
} 