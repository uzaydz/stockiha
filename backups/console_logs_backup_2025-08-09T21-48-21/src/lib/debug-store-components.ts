import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export const debugStoreComponentsCreation = async (organizationId: string) => {
  
  try {
    // 1. التحقق من وجود المؤسسة
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !org) {
      return;
    }

    // 2. فحص المكونات الحالية
    const { data: currentComponents, error: currentError } = await supabaseAdmin
      .from('store_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .order('order_index', { ascending: true });
    
    if (currentError) {
    } else {
      currentComponents?.forEach(comp => {
      });
    }
    
    // 3. اختبار إنشاء مكون واحد
    
    const testComponent = {
      id: uuidv4(),
      organization_id: organizationId,
      component_type: 'test_component',
      settings: { test: true },
      is_active: true,
      order_index: 99,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: testInsert, error: testError } = await supabaseAdmin
      .from('store_settings')
      .insert([testComponent])
      .select('*');
    
    if (testError) {
    } else {
      
      // حذف المكون التجريبي
      await supabaseAdmin
        .from('store_settings')
        .delete()
        .eq('id', testComponent.id);
      
    }
    
    // 4. اختبار إنشاء المكونات الافتراضية واحد تلو الآخر
    
    const defaultComponents = ['hero', 'categories', 'featuredproducts', 'about', 'testimonials', 'footer'];
    const results = [];
    
    for (let i = 0; i < defaultComponents.length; i++) {
      const componentType = defaultComponents[i];
      const component = {
        id: uuidv4(),
        organization_id: organizationId,
        component_type: componentType,
        settings: { 
          title: `اختبار ${componentType}`,
          _isVisible: true 
        },
        is_active: true,
        order_index: i + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('store_settings')
        .insert([component])
        .select('*');
      
      if (insertError) {
        results.push({ 
          component: componentType, 
          success: false, 
          error: insertError,
          order: i + 1
        });
      } else {
        results.push({ 
          component: componentType, 
          success: true, 
          data: insertResult,
          order: i + 1
        });
      }
      
      // توقف قصير بين المحاولات
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 5. إحصائيات النتائج
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount > 0) {
      results.filter(r => !r.success).forEach(r => {
      });
    }
    
    // 6. فحص قاعدة البيانات النهائي
    const { data: finalComponents, error: finalError } = await supabaseAdmin
      .from('store_settings')
      .select('component_type, order_index')
      .eq('organization_id', organizationId)
      .order('order_index', { ascending: true });
    
    if (!finalError) {
      finalComponents?.forEach(comp => {
      });
    }
    
    return results;
    
  } catch (error) {
    return null;
  }
};

export const cleanupTestComponents = async (organizationId: string) => {
  
  try {
    const { error } = await supabaseAdmin
      .from('store_settings')
      .delete()
      .eq('organization_id', organizationId)
      .like('component_type', 'test_%');
    
    if (error) {
    } else {
    }
  } catch (error) {
  }
};
