// API endpoint لتوفير Open Graph metadata للمنتجات
// هذا يُستخدم من قبل Cloudflare Worker لإضافة meta tags server-side

const { createClient } = require('@supabase/supabase-js');

// إعداد Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // السماح بالـ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { organizationId, productSlug } = req.query;

    if (!organizationId || !productSlug) {
      return res.status(400).json({
        error: 'Missing required parameters: organizationId and productSlug'
      });
    }

    // جلب بيانات المنتج
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        stock_quantity,
        images,
        colors,
        variants,
        slug
      `)
      .eq('organization_id', organizationId)
      .eq('slug', productSlug)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // جلب بيانات المؤسسة
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // إنشاء العنوان
    const storeName = organization.name || 'المتجر';
    const title = `${product.name} | ${storeName}`;

    // إنشاء الوصف
    let description = `اشتري ${product.name} بأفضل سعر من ${storeName}. `;
    if (product.description) {
      // استخراج أول 150 حرف من الوصف
      const cleanDescription = product.description.replace(/<[^>]*>/g, '').trim();
      description += cleanDescription.length > 100
        ? cleanDescription.substring(0, 100) + '...'
        : cleanDescription;
    } else {
      description += 'توصيل سريع لجميع الولايات. جودة عالية وأسعار منافسة.';
    }

    // تحديد الصورة
    const defaultColorImage = (product.colors || product.variants?.colors || [])
      .find((c) => c && (c.is_default || c.isDefault))?.image_url;

    const ogImage = defaultColorImage ||
                   product.images?.thumbnail_image ||
                   product.images?.additional_images?.[0]?.url ||
                   organization.settings?.logo_url ||
                   'https://stockiha.com/images/logo-new.webp';

    // تحديد الـ URL
    const baseUrl = process.env.VITE_SITE_URL || 'https://stockiha.com';
    const url = `${baseUrl}/product-purchase-max-v3/${productSlug}`;

    // تحديد السعر والتوفر
    const price = product.price ? {
      amount: product.price.toString(),
      currency: 'DZD'
    } : undefined;

    const availability = product.stock_quantity > 0 ? 'in stock' : 'out of stock';

    const ogData = {
      title,
      description,
      image: ogImage,
      url,
      site_name: storeName,
      type: 'product',
      price,
      availability
    };

    // إضافة cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200'); // cache لمدة ساعة
    res.setHeader('CDN-Cache-Control', 'max-age=7200'); // Cloudflare cache

    return res.status(200).json(ogData);

  } catch (error) {
    console.error('Error in product-og API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
