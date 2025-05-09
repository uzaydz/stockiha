import { supabase } from '@/lib/supabase-client';
import { toast } from '@/components/ui/use-toast';

// نموذج الحقل
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'province' | 'municipality';
  required: boolean;
  placeholder?: string;
  order: number;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
  isVisible: boolean;
  linkedFields?: {
    municipalityField?: string | null;
    provinceField?: string | null;
    [key: string]: string | null | undefined;
  };
  dependency?: {
    fieldId: string;
    value: string;
  };
}

// نموذج إعدادات النموذج
export interface FormSettings {
  id: string;
  name: string;
  fields: FormField[];
  product_ids: string[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

// الحصول على قائمة إعدادات النماذج
export async function getFormSettings(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('form_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching form settings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل إعدادات النموذج',
        variant: 'destructive',
      });
      return [];
    }

    return data.map(item => ({
      ...item,
      fields: item.fields as FormField[],
      product_ids: item.product_ids as string[]
    }));
  } catch (error) {
    console.error('Error fetching form settings:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء تحميل إعدادات النموذج',
      variant: 'destructive',
    });
    return [];
  }
}

// الحصول على إعدادات نموذج محدد
export async function getFormSettingsById(formId: string) {
  try {
    const { data, error } = await supabase
      .from('form_settings')
      .select('*')
      .eq('id', formId)
      .single();

    if (error) {
      console.error('Error fetching form settings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل إعدادات النموذج',
        variant: 'destructive',
      });
      return null;
    }

    return {
      ...data,
      fields: data.fields as FormField[],
      product_ids: data.product_ids as string[]
    };
  } catch (error) {
    console.error('Error fetching form settings:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء تحميل إعدادات النموذج',
      variant: 'destructive',
    });
    return null;
  }
}

// الحصول على إعدادات النموذج لمنتج معين
export async function getFormSettingsForProduct(organizationId: string, productId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_form_settings_for_product', {
        p_organization_id: organizationId,
        p_product_id: productId
      });

    if (error) {
      console.error('Error fetching form settings for product:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل إعدادات النموذج للمنتج',
        variant: 'destructive',
      });
      return [];
    }

    return data as FormField[];
  } catch (error) {
    console.error('Error fetching form settings for product:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء تحميل إعدادات النموذج للمنتج',
      variant: 'destructive',
    });
    return [];
  }
}

// إنشاء أو تحديث إعدادات النموذج
export async function upsertFormSettings(
  organizationId: string,
  formData: {
    id?: string;
    name: string;
    fields: FormField[];
    product_ids: string[];
    is_default: boolean;
    is_active: boolean;
  }
) {
  try {
    const { data, error } = await supabase
      .rpc('upsert_form_settings', {
        p_organization_id: organizationId,
        p_name: formData.name,
        p_fields: formData.fields,
        p_product_ids: formData.product_ids,
        p_is_default: formData.is_default,
        p_is_active: formData.is_active,
        p_form_id: formData.id || null
      });

    if (error) {
      console.error('Error saving form settings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ إعدادات النموذج',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'تم بنجاح',
      description: 'تم حفظ إعدادات النموذج بنجاح',
    });

    return data;
  } catch (error) {
    console.error('Error saving form settings:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء حفظ إعدادات النموذج',
      variant: 'destructive',
    });
    return null;
  }
}

// حذف إعدادات النموذج
export async function deleteFormSettings(formId: string) {
  try {
    // نقوم بالحذف المنطقي بدلاً من الحذف الفعلي
    const { error } = await supabase
      .from('form_settings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', formId);

    if (error) {
      console.error('Error deleting form settings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف إعدادات النموذج',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'تم بنجاح',
      description: 'تم حذف إعدادات النموذج بنجاح',
    });

    return true;
  } catch (error) {
    console.error('Error deleting form settings:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء حذف إعدادات النموذج',
      variant: 'destructive',
    });
    return false;
  }
}

// الحصول على قائمة المنتجات
export async function getProducts(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, images')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل المنتجات',
        variant: 'destructive',
      });
      return [];
    }

    return data.map(product => ({
      id: product.id,
      name: product.name,
      image: product.images && product.images.length > 0 ? product.images[0] : ''
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء تحميل المنتجات',
      variant: 'destructive',
    });
    return [];
  }
} 