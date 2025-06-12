import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export const debugStoreComponentsCreation = async (organizationId: string) => {
  console.log(`🔍 [Debug] بدء تشخيص مشكلة إنشاء المكونات للمؤسسة: ${organizationId}`);
  
  try {
    // 1. التحقق من وجود المؤسسة
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !org) {
      console.error(`❌ [Debug] المؤسسة غير موجودة:`, orgError);
      return;
    }
    
    console.log(`✅ [Debug] المؤسسة موجودة:`, {
      id: org.id,
      name: org.name,
      subdomain: org.subdomain,
      created_at: org.created_at
    });
    
    // 2. فحص المكونات الحالية
    const { data: currentComponents, error: currentError } = await supabaseAdmin
      .from('store_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .order('order_index');
    
    if (currentError) {
      console.error(`❌ [Debug] خطأ في استعلام المكونات:`, currentError);
    } else {
      console.log(`📊 [Debug] المكونات الحالية: ${currentComponents?.length || 0}`);
      currentComponents?.forEach(comp => {
        console.log(`  - ${comp.component_type} (order: ${comp.order_index}, active: ${comp.is_active})`);
      });
    }
    
    // 3. اختبار إنشاء مكون واحد
    console.log(`🧪 [Debug] اختبار إنشاء مكون تجريبي...`);
    
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
      console.error(`❌ [Debug] فشل إنشاء المكون التجريبي:`, testError);
    } else {
      console.log(`✅ [Debug] تم إنشاء المكون التجريبي بنجاح:`, testInsert);
      
      // حذف المكون التجريبي
      await supabaseAdmin
        .from('store_settings')
        .delete()
        .eq('id', testComponent.id);
      
      console.log(`🗑️ [Debug] تم حذف المكون التجريبي`);
    }
    
    // 4. اختبار إنشاء المكونات الافتراضية واحد تلو الآخر
    console.log(`🔄 [Debug] اختبار إنشاء المكونات الافتراضية...`);
    
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
      
      console.log(`🔄 [Debug] محاولة إنشاء ${componentType}...`);
      
      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('store_settings')
        .insert([component])
        .select('*');
      
      if (insertError) {
        console.error(`❌ [Debug] فشل إنشاء ${componentType}:`, insertError);
        results.push({ 
          component: componentType, 
          success: false, 
          error: insertError,
          order: i + 1
        });
      } else {
        console.log(`✅ [Debug] تم إنشاء ${componentType} بنجاح`);
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
    
    console.log(`📈 [Debug] نتائج الاختبار:`);
    console.log(`  ✅ نجح: ${successCount}/${defaultComponents.length}`);
    console.log(`  ❌ فشل: ${failCount}/${defaultComponents.length}`);
    
    if (failCount > 0) {
      console.log(`📋 [Debug] المكونات التي فشلت:`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.component}: ${r.error?.message || 'خطأ غير معروف'}`);
      });
    }
    
    // 6. فحص قاعدة البيانات النهائي
    const { data: finalComponents, error: finalError } = await supabaseAdmin
      .from('store_settings')
      .select('component_type, order_index')
      .eq('organization_id', organizationId)
      .order('order_index');
    
    if (!finalError) {
      console.log(`📊 [Debug] إجمالي المكونات في قاعدة البيانات: ${finalComponents?.length || 0}`);
      finalComponents?.forEach(comp => {
        console.log(`  - ${comp.component_type} (order: ${comp.order_index})`);
      });
    }
    
    return results;
    
  } catch (error) {
    console.error(`💥 [Debug] استثناء في التشخيص:`, error);
    return null;
  }
};

export const cleanupTestComponents = async (organizationId: string) => {
  console.log(`🧹 [Debug] تنظيف المكونات التجريبية للمؤسسة: ${organizationId}`);
  
  try {
    const { error } = await supabaseAdmin
      .from('store_settings')
      .delete()
      .eq('organization_id', organizationId)
      .like('component_type', 'test_%');
    
    if (error) {
      console.error(`❌ [Debug] خطأ في التنظيف:`, error);
    } else {
      console.log(`✅ [Debug] تم تنظيف المكونات التجريبية`);
    }
  } catch (error) {
    console.error(`💥 [Debug] استثناء في التنظيف:`, error);
  }
}; 