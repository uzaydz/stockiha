#!/usr/bin/env node

/**
 * Script to prerender popular products for better social sharing
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { prerenderProductPage } = require('../prerender-product.js');

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNTgxMTYsImV4cCI6MjA1ODgzNDExNn0.zBT3h3lXQgcFqzdpXARVfU9kwRLvNiQrSdAJwMdojYY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getPopularProducts(limit = 50) {
  try {
    console.log('🔍 Fetching popular products...');

    // جلب المنتجات النشطة مع بيانات المبيعات (افتراض وجود حقل sales_count أو شيء مشابه)
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        organization_id,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .not('slug', 'is', null)
      .order('created_at', { ascending: false }) // أحدث المنتجات أولاً
      .limit(limit);

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    console.log(`✅ Found ${products.length} products to prerender`);
    return products;
  } catch (error) {
    console.error('Error in getPopularProducts:', error);
    return [];
  }
}

async function prerenderAllProducts() {
  const products = await getPopularProducts();

  if (products.length === 0) {
    console.log('❌ No products found to prerender');
    return;
  }

  const outputDir = path.join(__dirname, '../dist/prerendered');
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };

  console.log('🚀 Starting prerendering process...');

  for (const product of products) {
    try {
      const outputPath = path.join(outputDir, product.organization_id, `${product.slug}.html`);

      console.log(`📄 Prerendering: ${product.organization_id}/${product.slug}`);

      const success = await prerenderProductPage(
        product.organization_id,
        product.slug,
        outputPath
      );

      if (success) {
        results.success++;
        console.log(`✅ Success: ${product.name}`);
      } else {
        results.failed++;
        console.log(`❌ Failed: ${product.name}`);
      }

      // تأخير قصير لتجنب الضغط على API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error prerendering ${product.name}:`, error);
      results.failed++;
    }
  }

  console.log('\n📊 Prerendering Summary:');
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);

  // إنشاء index file للـ prerendered pages
  createIndexFile(products, outputDir);
}

function createIndexFile(products, outputDir) {
  const indexPath = path.join(outputDir, 'index.json');

  const indexData = {
    generated: new Date().toISOString(),
    total: products.length,
    products: products.map(p => ({
      id: p.id,
      slug: p.slug,
      organization_id: p.organization_id,
      name: p.name,
      prerendered_path: `${p.organization_id}/${p.slug}.html`,
      url: `/product-purchase-max-v3/${p.slug}`
    }))
  };

  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
  console.log(`📝 Index file created: ${indexPath}`);
}

// CLI interface
async function main() {
  try {
    await prerenderAllProducts();
    console.log('🎉 Prerendering completed!');
  } catch (error) {
    console.error('❌ Error during prerendering:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  prerenderAllProducts,
  getPopularProducts
};
