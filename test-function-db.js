import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 اختبار دالة get_complete_product_data...');

// اختبار RPC - استخدام المنتج الموجود "burkini"
try {
  const { data, error } = await supabase.rpc('get_complete_product_data', {
    p_slug: 'burkini',
    p_org_id: '560e2c06-d13c-4853-abcf-d41f017469cf'
  });
  
  if (error) {
    console.error('❌ خطأ في RPC:', error);
  } else {
    console.log('✅ RPC نجح:', data ? 'بيانات موجودة' : 'لا توجد بيانات');
    if (data) {
      console.log('📦 هيكل البيانات:', {
        product: !!data.product,
        colors: Array.isArray(data.colors) ? data.colors.length : 'غير صحيح',
        sizes: Array.isArray(data.sizes) ? data.sizes.length : 'غير صحيح',
        form_settings: !!data.form_settings,
        marketing_settings: !!data.marketing_settings,
        reviews: Array.isArray(data.reviews) ? data.reviews.length : 'غير صحيح'
      });
    }
  }
} catch (err) {
  console.error('💥 خطأ في RPC:', err.message);
}

// اختبار Edge Function
console.log('\n🧪 اختبار Edge Function...');
try {
  const { data: funcData, error: funcError } = await supabase.functions.invoke('get-product-page-data', {
    body: { 
      slug: 'burkini', 
      organization_id: '560e2c06-d13c-4853-abcf-d41f017469cf' 
    }
  });
  
  if (funcError) {
    console.error('❌ خطأ في Edge Function:', funcError);
  } else {
    console.log('✅ Edge Function نجح:', funcData ? 'بيانات موجودة' : 'لا توجد بيانات');
  }
} catch (err) {
  console.error('💥 خطأ في Edge Function:', err.message);
} 