const { createClient } = require('@supabase/supabase-js');

// قم بتغيير هذه القيم لتناسب بيئتك
const SUPABASE_URL = 'https://wrnssatuvmumsczyldth.supabase.co';
const SUPABASE_SERVICE_KEY = 'إدخال_مفتاح_الخدمة_هنا'; // ⚠️ لا تقم برفع هذا المفتاح إلى Git

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// اختبار الوظيفة المحسنة
async function testSolution() {
  try {
    console.log('=== بدء اختبار الحل ===');
    
    // 1. اختبار الوظيفة المحسنة
    const { data, error } = await supabase.rpc(
      'create_organization_safe', 
      {
        p_name: 'منظمة اختبار',
        p_subdomain: `test-org-${Date.now()}`,
        p_owner_id: '00000000-0000-0000-0000-000000000000', // استبدله بمعرف مستخدم حقيقي
        p_settings: { theme: 'light', primary_color: '#3b82f6' }
      }
    );
    
    if (error) {
      console.error('❌ فشل اختبار الوظيفة المحسنة:', error);
    } else {
      console.log('✅ نجاح اختبار الوظيفة المحسنة - معرف المنظمة:', data);
      
      // 2. اختبار إنشاء منظمة بنفس النطاق الفرعي (يجب أن يعيد المعرف الموجود)
      const subdomain = `test-org-${Date.now()}`;
      
      // إنشاء المنظمة الأولى
      const { data: firstOrg, error: firstError } = await supabase.rpc(
        'create_organization_safe', 
        {
          org_name: 'منظمة اختبار 1',
          org_subdomain: subdomain,
          org_owner_id: '00000000-0000-0000-0000-000000000000'
        }
      );
      
      if (firstError) {
        console.error('❌ فشل اختبار إنشاء المنظمة الأولى:', firstError);
      } else {
        console.log('✅ نجاح إنشاء المنظمة الأولى - معرف المنظمة:', firstOrg);
        
        // محاولة إنشاء منظمة ثانية بنفس النطاق الفرعي
        const { data: secondOrg, error: secondError } = await supabase.rpc(
          'create_organization_safe', 
          {
            org_name: 'منظمة اختبار 2',
            org_subdomain: subdomain,
            org_owner_id: '00000000-0000-0000-0000-000000000000'
          }
        );
        
        if (secondError) {
          console.error('❌ فشل اختبار التكرار:', secondError);
        } else {
          console.log('✅ نجاح اختبار التكرار - معرف المنظمة الثانية:', secondOrg);
          console.log('المعرفان متطابقان؟', firstOrg === secondOrg);
        }
      }
    }
    
    console.log('=== انتهاء الاختبار ===');
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء الاختبار:', error);
  }
}

// بدء الاختبار
testSolution(); 