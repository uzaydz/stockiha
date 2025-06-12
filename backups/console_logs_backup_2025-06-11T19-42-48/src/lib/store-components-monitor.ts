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
    console.log(`[StoreComponentsMonitor] مراقبة المؤسسة: ${orgData.name} (${organizationId})`);

    // التحقق من المكونات الموجودة
    const { data: components, error: componentsError } = await supabaseAdmin
      .from('store_settings')
      .select('component_type, order_index, is_active, created_at')
      .eq('organization_id', organizationId)
      .order('order_index');

    if (componentsError) {
      report.errors.push({ type: 'components_fetch_error', error: componentsError });
      return report;
    }

    const expectedComponentTypes = ['hero', 'categories', 'featuredproducts', 'about', 'testimonials', 'footer'];
    const existingComponentTypes = components?.map(c => c.component_type) || [];
    
    report.createdComponents = components?.length || 0;
    report.missingComponents = expectedComponentTypes.filter(type => !existingComponentTypes.includes(type));
    report.success = report.createdComponents === report.expectedComponents;

    console.log(`[StoreComponentsMonitor] المكونات الموجودة: ${report.createdComponents}/${report.expectedComponents}`);
    console.log(`[StoreComponentsMonitor] المكونات المفقودة: ${report.missingComponents.join(', ')}`);

    if (components) {
      components.forEach(comp => {
        console.log(`[StoreComponentsMonitor] ✓ ${comp.component_type} (order: ${comp.order_index}, active: ${comp.is_active})`);
      });
    }

    return report;
  } catch (error) {
    report.errors.push({ type: 'monitor_exception', error });
    console.error('[StoreComponentsMonitor] خطأ في المراقبة:', error);
    return report;
  }
};

export const validateStoreComponentsIntegrity = async (organizationId: string): Promise<boolean> => {
  try {
    const report = await monitorStoreComponents(organizationId);
    
    if (!report.success) {
      console.warn(`[StoreComponentsValidator] المؤسسة ${organizationId} تحتوي على مكونات ناقصة:`, {
        expected: report.expectedComponents,
        actual: report.createdComponents,
        missing: report.missingComponents
      });
      
      return false;
    }
    
    console.log(`[StoreComponentsValidator] ✅ جميع مكونات المتجر سليمة للمؤسسة ${organizationId}`);
    return true;
  } catch (error) {
    console.error(`[StoreComponentsValidator] خطأ في التحقق من سلامة المكونات:`, error);
    return false;
  }
};

export const fixMissingComponents = async (organizationId: string): Promise<boolean> => {
  try {
    const report = await monitorStoreComponents(organizationId);
    
    if (report.missingComponents.length === 0) {
      console.log(`[StoreComponentsFixer] لا توجد مكونات مفقودة للمؤسسة ${organizationId}`);
      return true;
    }
    
    console.log(`[StoreComponentsFixer] محاولة إصلاح ${report.missingComponents.length} مكونات مفقودة...`);
    
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
          console.error(`[StoreComponentsFixer] فشل إصلاح المكون ${componentType}:`, error);
        } else {
          console.log(`[StoreComponentsFixer] ✓ تم إصلاح المكون ${componentType}`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`[StoreComponentsFixer] استثناء في إصلاح المكون ${componentType}:`, error);
      }
    }
    
    console.log(`[StoreComponentsFixer] تم إصلاح ${fixedCount} من أصل ${report.missingComponents.length} مكونات`);
    
    // التحقق النهائي
    const finalReport = await monitorStoreComponents(organizationId);
    return finalReport.success;
    
  } catch (error) {
    console.error(`[StoreComponentsFixer] خطأ في إصلاح المكونات:`, error);
    return false;
  }
}; 