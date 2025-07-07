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
    const { feedContent, catalogId, businessId } = req.body;

    if (!feedContent) {
      return res.status(400).json({ error: 'Feed content is required' });
    }

    // حفظ Product Feed في مجلد public
    const fs = require('fs');
    const path = require('path');
    
    const publicDir = path.join(process.cwd(), 'public');
    const feedPath = path.join(publicDir, 'product-feed.xml');
    
    // إنشاء مجلد public إذا لم يكن موجوداً
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // كتابة محتوى Feed
    fs.writeFileSync(feedPath, feedContent, 'utf8');
    
    // إنشاء URL للـ Feed
    const feedUrl = `${req.headers.origin || 'http://localhost:3000'}/product-feed.xml`;
    
    // حفظ معلومات الكتالوج في قاعدة البيانات
    if (catalogId && businessId) {
      const { error } = await supabase
        .from('facebook_catalogs')
        .upsert({
          catalog_id: catalogId,
          business_id: businessId,
          feed_url: feedUrl,
          last_updated: new Date().toISOString(),
          status: 'active'
        });
      
      if (error) {
        console.error('Database error:', error);
      }
    }
    
    console.log('✅ Product Feed uploaded successfully:', feedUrl);
    
    res.status(200).json({
      success: true,
      message: 'Product Feed uploaded successfully',
      feedUrl: feedUrl,
      catalogId: catalogId
    });
    
  } catch (error) {
    console.error('❌ Error uploading Product Feed:', error);
    res.status(500).json({ 
      error: 'Failed to upload Product Feed',
      details: error.message 
    });
  }
} 