import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

const supabase = createClient(supabaseUrl, supabaseKey);

// اختبار RPC - استخدام المنتج الموجود "burkini"
try {
  const { data, error } = await supabase.rpc('get_complete_product_data', {
    p_slug: 'burkini',
    p_org_id: '560e2c06-d13c-4853-abcf-d41f017469cf'
  });
  
  if (error) {
  } else {
    if (data) {
    }
  }
} catch (err) {
}

// اختبار Edge Function
try {
  const { data: funcData, error: funcError } = await supabase.functions.invoke('get-product-page-data', {
    body: { 
      slug: 'burkini', 
      organization_id: '560e2c06-d13c-4853-abcf-d41f017469cf' 
    }
  });
  
  if (funcError) {
  } else {
  }
} catch (err) {
}
