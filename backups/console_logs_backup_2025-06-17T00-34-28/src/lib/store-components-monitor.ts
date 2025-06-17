import { supabaseAdmin } from '@/lib/supabase-admin';

export interface ComponentCreationReport {
  organizationId: string;
  organizationName?: string;
  expectedComponents: number;
  createdComponents: number;
  missingComponents: string[];
  errors: any[];
  success: boolean;
  timestamp: string;
}

export const monitorStoreComponents = async (organizationId: string): Promise<ComponentCreationReport> => {
  const report: ComponentCreationReport = {
    organizationId,
    expectedComponents: 6,
    createdComponents: 0,
    missingComponents: [],
    errors: [],
    success: false,
    timestamp: new Date().toISOString()
  };

  try {
    // الحصول على معلومات المؤسسة
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, created_at')
      .eq('id', organizationId)
      .single();

    if (orgError || !orgData) {
      report.errors.push({ type: 'organization_not_found', error: orgError });
      return report;
    }

    report.organizationName = orgData.name;

    // التحقق من المكونات الموجودة
    const { data: components, error: componentsError } = await supabaseAdmin
      .from('store_settings')
      .select('component_type, order_index, is_active, created_at')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (componentsError) {
      report.errors.push({ type: 'components_fetch_error', error: componentsError });
      return report;
    }

    const expectedComponentTypes = ['hero', 'categories', 'featuredproducts', 'about', 'testimonials', 'footer'];
    const existingComponentTypes = components?.map(c => c.component_type) || [];
    
    report.createdComponents = components?.length || 0;
    report.missingComponents = expectedComponentTypes.filter(type => !existingComponentTypes.includes(type));
    report.success = report.createdComponents === report.expectedComponents;

    if (components) {
      components.forEach(comp => {
      });
    }

    return report;
  } catch (error) {
    report.errors.push({ type: 'monitor_exception', error });
    return report;
  }
};

export const validateStoreComponentsIntegrity = async (organizationId: string): Promise<boolean> => {
  try {
    const report = await monitorStoreComponents(organizationId);
    
    if (!report.success) {
      
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const fixMissingComponents = async (organizationId: string): Promise<boolean> => {
  try {
    const report = await monitorStoreComponents(organizationId);
    
    if (report.missingComponents.length === 0) {
      return true;
    }

    // تعريف المكونات الافتراضية
    const defaultComponentsMap: Record<string, any> = {
      hero: {
        title: 'أهلاً بك في متجرنا',
        description: 'تسوق أحدث المنتجات بأفضل الأسعار',
        _isVisible: true
      },
      categories: {
        title: 'تسوق حسب الفئة',
        description: 'استكشف منتجاتنا حسب الفئة',
        _isVisible: true
      },
      featuredproducts: {
        title: 'منتجات مميزة',
        description: 'اكتشف مجموعتنا المختارة من المنتجات المميزة',
        _isVisible: true
      },
      about: {
        title: 'عن متجرنا',
        description: 'متجر إلكتروني موثوق به',
        _isVisible: true
      },
      testimonials: {
        title: 'آراء عملائنا',
        description: 'استمع إلى تجارب عملائنا الحقيقية',
        _isVisible: true
      },
      footer: {
        storeName: 'متجرنا',
        description: 'متجر إلكتروني متميز',
        _isVisible: true
      }
    };
    
    const orderIndexMap: Record<string, number> = {
      hero: 1,
      categories: 2,
      featuredproducts: 3,
      about: 4,
      testimonials: 5,
      footer: 6
    };
    
    let fixedCount = 0;
    
    for (const componentType of report.missingComponents) {
      try {
        const { error } = await supabaseAdmin
          .from('store_settings')
          .insert({
            organization_id: organizationId,
            component_type: componentType,
            settings: defaultComponentsMap[componentType] || {},
            is_active: true,
            order_index: orderIndexMap[componentType] || 99,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
        } else {
          fixedCount++;
        }
      } catch (error) {
      }
    }

    // التحقق النهائي
    const finalReport = await monitorStoreComponents(organizationId);
    return finalReport.success;
    
  } catch (error) {
    return false;
  }
};
