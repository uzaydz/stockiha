import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, businessId, accessToken } = req.body;

    if (!name || !businessId || !accessToken) {
      return res.status(400).json({ 
        error: 'Name, Business ID, and Access Token are required' 
      });
    }

    // إنشاء الكتالوج باستخدام Facebook Graph API
    const catalogResponse = await fetch(`https://graph.facebook.com/v18.0/${businessId}/owned_product_catalogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        vertical: 'commerce',
        access_token: accessToken
      })
    });

    const catalogData = await catalogResponse.json();

    if (!catalogResponse.ok) {
      return res.status(400).json({ 
        error: 'Failed to create catalog',
        details: catalogData.error?.message || 'Unknown error'
      });
    }

    const catalogId = catalogData.id;

    // حفظ معلومات الكتالوج في قاعدة البيانات
    const { error } = await supabase
      .from('facebook_catalogs')
      .insert({
        catalog_id: catalogId,
        catalog_name: name,
        business_id: businessId,
        created_at: new Date().toISOString(),
        status: 'active'
      });

    if (error) {
      // لا نوقف العملية إذا فشل حفظ قاعدة البيانات
    }

    res.status(200).json({
      success: true,
      message: 'Catalog created successfully',
      catalogId: catalogId,
      name: name
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create catalog',
      details: error.message 
    });
  }
}
