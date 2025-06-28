import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * أداة تشخيص للنطاقات الفرعية
 */
export const debugSubdomain = async (subdomain: string) => {
  
  try {
    // 1. فحص مباشر بـ select *
    const { data: allData, error: allError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('subdomain', subdomain);

    // 2. فحص بـ select محدد
    const { data: specificData, error: specificError } = await supabaseAdmin
      .from('organizations')
      .select('id, subdomain, name')
      .eq('subdomain', subdomain);

    // 3. فحص بـ maybeSingle
    const { data: singleData, error: singleError } = await supabaseAdmin
      .from('organizations')
      .select('id, subdomain, name')
      .eq('subdomain', subdomain)
      .maybeSingle();

    // 4. فحص عدد السجلات
    const { count, error: countError } = await supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('subdomain', subdomain);

    // 5. فحص النطاقات المشابهة
    const { data: similarData, error: similarError } = await supabaseAdmin
      .from('organizations')
      .select('subdomain')
      .ilike('subdomain', `${subdomain}%`)
      .limit(10);

    // 6. فحص جميع النطاقات
    const { data: recentData, error: recentError } = await supabaseAdmin
      .from('organizations')
      .select('id, subdomain, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

  } catch (error) {
  }
};

/**
 * تشخيص شامل لقاعدة البيانات
 */
export const debugDatabase = async () => {
  
  try {
    // فحص اتصال قاعدة البيانات
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) {
    } else {
    }

    // فحص إجمالي عدد المؤسسات
    const { count, error: countError } = await supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact', head: true });

  } catch (error) {
  }
};
