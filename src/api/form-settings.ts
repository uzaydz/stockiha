import { supabase } from '@/lib/supabase-client';
import { toast } from '@/components/ui/use-toast';

// نموذج الحقل
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'province' | 'municipality' | 'textarea' | 'deliveryType';
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
  description?: string;
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
  settings?: {
    shipping_integration?: {
      enabled: boolean;
      provider: string | null;
    }
  }
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
      product_ids: data.product_ids as string[],
      settings: data.settings || {}
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

// الحصول على كامل إعدادات النموذج بما في ذلك إعدادات الشحن لمنتج معين
export async function getFullFormSettingsForProduct(organizationId: string, productId: string): Promise<FormSettings | null> {
  try {
    console.log(`جاري البحث عن نموذج للمنتج ${productId} في المؤسسة ${organizationId}`);
    
    // Enfoque completo: Recuperar todos los form_settings y filtrar manualmente
    // para evitar problemas con la sintaxis de consulta de JSON de Supabase
    const { data, error } = await supabase
      .from('form_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching form settings for product:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل إعدادات النموذج للمنتج',
        variant: 'destructive',
      });
      return null;
    }

    if (!data || data.length === 0) {
      console.log('لم يتم العثور على أي نماذج');
      return null;
    }
    
    console.log(`تم العثور على ${data.length} نماذج نشطة`);
    
    // البحث عن النموذج المخصص للمنتج باستخدام طباعة تفصيلية
    for (const form of data) {
      console.log(`فحص النموذج: ${form.name} (${form.id})`);
      console.log(`هل النموذج افتراضي: ${form.is_default}`);
      console.log(`عدد المنتجات المرتبطة: ${form.product_ids?.length || 0}`);
      
      if (form.product_ids && Array.isArray(form.product_ids)) {
        console.log(`قائمة معرفات المنتجات: ${form.product_ids.join(', ')}`);
        if (form.product_ids.includes(productId)) {
          console.log(`تم العثور على نموذج مخصص للمنتج: ${form.name}`);
          return {
            id: form.id,
            name: form.name,
            fields: form.fields as FormField[],
            product_ids: form.product_ids as string[],
            is_default: form.is_default,
            is_active: form.is_active,
            created_at: form.created_at,
            updated_at: form.updated_at,
            version: form.version,
            settings: form.settings || {}
          };
        }
      }
    }

    // Filtrar manualmente para encontrar el formulario que contiene el ID del producto
    // o el formulario que se aplica a todos los productos (array vacío)
    const productSpecific = data.find(form => {
      const productIds = form.product_ids || [];
      return productIds.includes(productId);
    });

    // البحث عن النموذج الافتراضي إذا لم يتم العثور على نموذج مخصص
    const defaultForm = data.find(form => form.is_default === true);
    if (defaultForm) {
      console.log(`استخدام النموذج الافتراضي: ${defaultForm.name}`);
    }

    // Usar el formulario específico del producto si se encuentra,
    // de lo contrario, buscar un formulario predeterminado
    const selectedForm = productSpecific || 
                        defaultForm ||
                        data.find(form => {
                          const productIds = form.product_ids || [];
                          return productIds.length === 0;
                        }) ||
                        data[0];
    
    console.log(`النموذج المختار النهائي: ${selectedForm.name} (${selectedForm.id})`);

    // تحويل البيانات إلى كائن FormSettings
    return {
      id: selectedForm.id,
      name: selectedForm.name,
      fields: selectedForm.fields as FormField[],
      product_ids: selectedForm.product_ids as string[],
      is_default: selectedForm.is_default,
      is_active: selectedForm.is_active,
      created_at: selectedForm.created_at,
      updated_at: selectedForm.updated_at,
      version: selectedForm.version,
      settings: selectedForm.settings || {}
    };
  } catch (error) {
    console.error('Error fetching full form settings for product:', error);
    toast({
      title: 'خطأ',
      description: 'حدث خطأ أثناء تحميل إعدادات النموذج للمنتج',
      variant: 'destructive',
    });
    return null;
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
    shipping_integration?: {
      enabled: boolean;
      provider: string | null;
    };
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
        p_shipping_integration: formData.shipping_integration || { enabled: false, provider: null },
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