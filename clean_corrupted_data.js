// =====================================================
// ملف تنظيف البيانات التالفة من قاعدة البيانات
// =====================================================
// هذا الملف يمكن تشغيله في وحدة تحكم المتصفح لتنظيف البيانات التالفة

import { supabase } from './src/lib/supabase-client.js';

/**
 * تنظيف البيانات التالفة من إعدادات المؤسسة
 */
async function cleanCorruptedOrganizationSettings(organizationId) {
  try {
    console.log('🔍 بدء تنظيف البيانات التالفة للمؤسسة:', organizationId);
    
    // جلب الإعدادات الحالية
    const { data: settings, error: fetchError } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (fetchError) {
      console.error('خطأ في جلب إعدادات المؤسسة:', fetchError);
      return false;
    }

    if (!settings) {
      console.log('لا توجد إعدادات للمؤسسة');
      return true;
    }

    let needsUpdate = false;
    const updates = {};

    // فحص custom_js
    if (settings.custom_js && typeof settings.custom_js === 'string') {
      const trimmed = settings.custom_js.trim();
      
      // فحص JSON
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        console.warn('🚨 تم اكتشاف JSON في custom_js بدلاً من JavaScript');
        console.log('المحتوى:', trimmed.substring(0, 200) + '...');
        updates.custom_js = null;
        needsUpdate = true;
      }
      
      // فحص معرفات غير صالحة
      if (trimmed.includes('fNcqSfPLFxu') || trimmed.includes('Unexpected identifier')) {
        console.warn('🚨 تم اكتشاف معرفات غير صالحة في custom_js');
        updates.custom_js = null;
        needsUpdate = true;
      }
    }

    // فحص custom_css
    if (settings.custom_css && typeof settings.custom_css === 'string') {
      if (settings.custom_css.includes('fNcqSfPLFxu') || settings.custom_css.includes('Unexpected identifier')) {
        console.warn('🚨 تم اكتشاف محتوى تالف في custom_css');
        updates.custom_css = null;
        needsUpdate = true;
      }
    }

    // تحديث الإعدادات إذا لزم الأمر
    if (needsUpdate) {
      console.log('🔄 تحديث الإعدادات...');
      const { error: updateError } = await supabase
        .from('organization_settings')
        .update(updates)
        .eq('organization_id', organizationId);

      if (updateError) {
        console.error('خطأ في تحديث الإعدادات:', updateError);
        return false;
      }

      console.log('✅ تم تنظيف الإعدادات التالفة بنجاح');
      return true;
    } else {
      console.log('✅ لا توجد بيانات تالفة تحتاج للتنظيف');
      return true;
    }
  } catch (error) {
    console.error('خطأ في تنظيف الإعدادات التالفة:', error);
    return false;
  }
}

/**
 * تنظيف جميع المؤسسات
 */
async function cleanAllOrganizations() {
  try {
    console.log('🔍 البحث عن جميع المؤسسات...');
    
    const { data: organizations, error } = await supabase
      .from('organization_settings')
      .select('organization_id, custom_js, custom_css')
      .not('custom_js', 'is', null)
      .or('custom_js.like.{%},custom_js.like.%fNcqSfPLFxu%');

    if (error) {
      console.error('خطأ في جلب المؤسسات:', error);
      return false;
    }

    if (!organizations || organizations.length === 0) {
      console.log('✅ لا توجد مؤسسات تحتاج للتنظيف');
      return true;
    }

    console.log(`🔍 تم العثور على ${organizations.length} مؤسسة تحتاج للتنظيف`);

    for (const org of organizations) {
      console.log(`\n🔧 تنظيف المؤسسة: ${org.organization_id}`);
      await cleanCorruptedOrganizationSettings(org.organization_id);
    }

    console.log('\n✅ تم تنظيف جميع المؤسسات');
    return true;
  } catch (error) {
    console.error('خطأ في تنظيف جميع المؤسسات:', error);
    return false;
  }
}

// تصدير الدوال للاستخدام
window.cleanCorruptedData = {
  cleanOrganization: cleanCorruptedOrganizationSettings,
  cleanAll: cleanAllOrganizations
};

console.log('🛠️ تم تحميل أدوات تنظيف البيانات التالفة');
console.log('استخدم: cleanCorruptedData.cleanOrganization("organization-id")');
console.log('أو: cleanCorruptedData.cleanAll()');

export { cleanCorruptedOrganizationSettings, cleanAllOrganizations };
