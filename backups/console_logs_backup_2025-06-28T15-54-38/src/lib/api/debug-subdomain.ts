import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * أداة تشخيص للنطاقات الفرعية
 */
export const debugSubdomain = async (subdomain: string) => {
  console.log(`🔧 تشخيص النطاق الفرعي: ${subdomain}`);
  
  try {
    // 1. فحص مباشر بـ select *
    console.log('1️⃣ فحص مباشر بـ select *');
    const { data: allData, error: allError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('subdomain', subdomain);
    
    console.log('📊 نتيجة select *:', { data: allData, error: allError });

    // 2. فحص بـ select محدد
    console.log('2️⃣ فحص بـ select محدد');
    const { data: specificData, error: specificError } = await supabaseAdmin
      .from('organizations')
      .select('id, subdomain, name')
      .eq('subdomain', subdomain);
    
    console.log('📊 نتيجة select محدد:', { data: specificData, error: specificError });

    // 3. فحص بـ maybeSingle
    console.log('3️⃣ فحص بـ maybeSingle');
    const { data: singleData, error: singleError } = await supabaseAdmin
      .from('organizations')
      .select('id, subdomain, name')
      .eq('subdomain', subdomain)
      .maybeSingle();
    
    console.log('📊 نتيجة maybeSingle:', { data: singleData, error: singleError });

    // 4. فحص عدد السجلات
    console.log('4️⃣ فحص عدد السجلات');
    const { count, error: countError } = await supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('subdomain', subdomain);
    
    console.log('📊 عدد السجلات:', { count, error: countError });

    // 5. فحص النطاقات المشابهة
    console.log('5️⃣ فحص النطاقات المشابهة');
    const { data: similarData, error: similarError } = await supabaseAdmin
      .from('organizations')
      .select('subdomain')
      .ilike('subdomain', `${subdomain}%`)
      .limit(10);
    
    console.log('📊 النطاقات المشابهة:', { data: similarData, error: similarError });

    // 6. فحص جميع النطاقات
    console.log('6️⃣ فحص آخر 10 نطاقات');
    const { data: recentData, error: recentError } = await supabaseAdmin
      .from('organizations')
      .select('id, subdomain, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('📊 آخر 10 نطاقات:', { data: recentData, error: recentError });

  } catch (error) {
    console.error('❌ خطأ في التشخيص:', error);
  }
};

/**
 * تشخيص شامل لقاعدة البيانات
 */
export const debugDatabase = async () => {
  console.log('🔧 تشخيص شامل لقاعدة البيانات');
  
  try {
    // فحص اتصال قاعدة البيانات
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ فشل الاتصال بقاعدة البيانات:', error);
    } else {
      console.log('✅ الاتصال بقاعدة البيانات يعمل بشكل صحيح');
    }

    // فحص إجمالي عدد المؤسسات
    const { count, error: countError } = await supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 إجمالي عدد المؤسسات:', { count, error: countError });

  } catch (error) {
    console.error('❌ خطأ في التشخيص الشامل:', error);
  }
}; 