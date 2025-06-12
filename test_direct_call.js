import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wrnssatuvmumsczyldth.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNzenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY'
);

(async () => {
  try {
    const { data, error } = await supabase.rpc('calculate_shipping_fee', {
      p_org_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
      p_to_wilaya_id: 8,
      p_to_municipality_id: 817,
      p_delivery_type: 'home',
      p_weight: 1
    });

    // اختبار إضافي للبلدية 801
    const { data: data2, error: error2 } = await supabase.rpc('calculate_shipping_fee', {
      p_org_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
      p_to_wilaya_id: 8,
      p_to_municipality_id: 801,
      p_delivery_type: 'desk',
      p_weight: 1
    });

  } catch (err) {
  }
})();
