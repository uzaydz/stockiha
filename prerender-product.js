#!/usr/bin/env node

/**
 * Prerendering script for product pages with Open Graph support
 * This script generates static HTML with proper meta tags for social sharing
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = process.env.BASE_URL || 'https://stockiha.com';

async function getProductData(organizationId, productSlug) {
  try {
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
      throw new Error('Product not found');
    }

    // جلب بيانات المؤسسة
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      throw new Error('Organization not found');
    }

    // إنشاء Open Graph data
    const storeName = organization.name || 'المتجر';
    const title = `${product.name} | ${storeName}`;

    let description = `اشتري ${product.name} بأفضل سعر من ${storeName}. `;
    if (product.description) {
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

    const url = `${BASE_URL}/product-purchase-max-v3/${productSlug}`;

    const price = product.price ? {
      amount: product.price.toString(),
      currency: 'DZD'
    } : undefined;

    const availability = product.stock_quantity > 0 ? 'in stock' : 'out of stock';

    return {
      product,
      organization,
      ogData: {
        title,
        description,
        image: ogImage,
        url,
        site_name: storeName,
        type: 'product',
        price,
        availability
      }
    };
  } catch (error) {
    console.error('Error fetching product data:', error);
    return null;
  }
}

async function prerenderProductPage(organizationId, productSlug, outputPath) {
  console.log(`🔄 Prerendering product page: ${organizationId}/${productSlug}`);

  const data = await getProductData(organizationId, productSlug);
  if (!data) {
    console.error(`❌ Failed to fetch data for ${organizationId}/${productSlug}`);
    return false;
  }

  const { ogData } = data;

  // إنشاء HTML مع Open Graph tags
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogData.title}</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${ogData.type}" />
  <meta property="og:url" content="${ogData.url}" />
  <meta property="og:title" content="${ogData.title}" />
  <meta property="og:description" content="${ogData.description}" />
  <meta property="og:image" content="${ogData.image}" />
  <meta property="og:site_name" content="${ogData.site_name}" />
  <meta property="og:locale" content="ar_DZ" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${ogData.url}" />
  <meta name="twitter:title" content="${ogData.title}" />
  <meta name="twitter:description" content="${ogData.description}" />
  <meta name="twitter:image" content="${ogData.image}" />

  <!-- Product specific -->
  ${ogData.price ? `<meta property="product:price:amount" content="${ogData.price.amount}" />` : ''}
  ${ogData.price ? `<meta property="product:price:currency" content="${ogData.price.currency}" />` : ''}
  ${ogData.availability ? `<meta property="product:availability" content="${ogData.availability}" />` : ''}

  <!-- Basic meta -->
  <meta name="description" content="${ogData.description}" />
  <meta name="robots" content="index, follow" />
  <meta name="googlebot" content="index, follow" />

  <!-- Preload critical resources -->
  <link rel="preload" as="image" href="${ogData.image}" />

  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />

  <!-- Canonical URL -->
  <link rel="canonical" href="${ogData.url}" />
</head>
<body>
  <div id="root">
    <!-- Prerendered content will be injected here -->
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; direction: rtl;">
      <div style="text-align: center;">
        <h1>${ogData.title}</h1>
        <p>جاري تحميل الصفحة...</p>
        <div style="margin: 20px 0;">
          <img src="${ogData.image}" alt="${data.product.name}" style="max-width: 300px; height: auto; border-radius: 8px;" />
        </div>
        <p>${ogData.description}</p>
        ${ogData.price ? `<p style="font-size: 18px; font-weight: bold; color: #2563eb;">السعر: ${ogData.price.amount} ${ogData.price.currency}</p>` : ''}
      </div>
    </div>
  </div>

  <!-- Load the main application -->
  <script type="module" src="/src/main.tsx"></script>

  <!-- Preload OG data for the app -->
  <script>
    window.__PRERENDERED_OG_DATA__ = ${JSON.stringify(ogData)};
    window.__PRERENDERED_PRODUCT_DATA__ = ${JSON.stringify(data.product)};
    window.__PRERENDERED_ORG_DATA__ = ${JSON.stringify(data.organization)};
  </script>
</body>
</html>`;

  // حفظ الملف
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`✅ Prerendered page saved to: ${outputPath}`);
  return true;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node prerender-product.js <organizationId> <productSlug> [outputPath]');
    console.log('Example: node prerender-product.js abc123 my-product ./dist/prerendered/product.html');
    process.exit(1);
  }

  const [organizationId, productSlug, outputPath] = args;
  const defaultOutputPath = outputPath || `./dist/prerendered/${organizationId}/${productSlug}.html`;

  try {
    const success = await prerenderProductPage(organizationId, productSlug, defaultOutputPath);
    if (success) {
      console.log('🎉 Prerendering completed successfully!');
    } else {
      console.error('❌ Prerendering failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during prerendering:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  prerenderProductPage,
  getProductData
};

// Run CLI if called directly
if (require.main === module) {
  main();
}
