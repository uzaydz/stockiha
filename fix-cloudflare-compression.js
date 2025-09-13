#!/usr/bin/env node

// 🚀 إصلاح ضغط Gzip على Cloudflare - تحسين نقاط الأداء
// استخدام: node fix-cloudflare-compression.js

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

console.log('🔧 إصلاح مشكلة ضغط Gzip على Cloudflare...\n');

if (!ZONE_ID || !API_TOKEN) {
  console.log('⚠️  متغيرات البيئة غير متوفرة');
  console.log('📋 يرجى إعداد متغيرات البيئة التالية:');
  console.log('   - CLOUDFLARE_ZONE_ID');
  console.log('   - CLOUDFLARE_API_TOKEN\n');
  
  console.log('🔍 أو يمكنك تطبيق الإعدادات يدوياً من Cloudflare Dashboard:');
  console.log('1. سجل دخول إلى https://dash.cloudflare.com');
  console.log('2. اختر النطاق الخاص بك');
  console.log('3. انتقل إلى Speed > Optimization');
  console.log('4. فعّل الإعدادات التالية:');
  console.log('   ✅ Brotli');
  console.log('   ✅ Auto Minify (HTML, CSS, JS)');
  console.log('   ✅ Polish (Lossy)');
  console.log('   ✅ Rocket Loader');
  console.log('5. انتقل إلى Caching > Configuration');
  console.log('6. اضبط Browser Cache TTL على 1 year');
  console.log('7. فعّل Always Online\n');
  
  process.exit(0);
}

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json'
};

async function makeRequest(url, method = 'GET', body = null) {
  try {
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.errors?.[0]?.message || 'Request failed'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ خطأ في الطلب: ${error.message}`);
    return null;
  }
}

async function enableCompression() {
  console.log('📦 تفعيل ضغط Brotli...');
  
  const brotliResult = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/brotli`,
    'PATCH',
    { value: 'on' }
  );
  
  if (brotliResult?.success) {
    console.log('✅ تم تفعيل Brotli بنجاح');
  } else {
    console.log('❌ فشل في تفعيل Brotli');
  }
}

async function enableMinification() {
  console.log('🗜️  تفعيل Auto Minify...');
  
  const minifyResult = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/minify`,
    'PATCH',
    { 
      value: {
        css: 'on',
        html: 'on', 
        js: 'on'
      }
    }
  );
  
  if (minifyResult?.success) {
    console.log('✅ تم تفعيل Auto Minify بنجاح');
  } else {
    console.log('❌ فشل في تفعيل Auto Minify');
  }
}

async function enableImageOptimization() {
  console.log('🖼️  تفعيل تحسين الصور...');
  
  const polishResult = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/polish`,
    'PATCH',
    { value: 'lossy' }
  );
  
  if (polishResult?.success) {
    console.log('✅ تم تفعيل تحسين الصور بنجاح');
  } else {
    console.log('❌ فشل في تفعيل تحسين الصور');
  }
}

async function enableRocketLoader() {
  console.log('🚀 تفعيل Rocket Loader...');
  
  const rocketResult = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/rocket_loader`,
    'PATCH',
    { value: 'on' }
  );
  
  if (rocketResult?.success) {
    console.log('✅ تم تفعيل Rocket Loader بنجاح');
  } else {
    console.log('❌ فشل في تفعيل Rocket Loader');
  }
}

async function setBrowserCacheTTL() {
  console.log('⏰ ضبط Browser Cache TTL...');
  
  const cacheResult = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/browser_cache_ttl`,
    'PATCH',
    { value: 31536000 } // سنة واحدة
  );
  
  if (cacheResult?.success) {
    console.log('✅ تم ضبط Browser Cache TTL بنجاح');
  } else {
    console.log('❌ فشل في ضبط Browser Cache TTL');
  }
}

async function enableHTTP3() {
  console.log('🌐 تفعيل HTTP/3...');
  
  const http3Result = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/http3`,
    'PATCH',
    { value: 'on' }
  );
  
  if (http3Result?.success) {
    console.log('✅ تم تفعيل HTTP/3 بنجاح');
  } else {
    console.log('❌ فشل في تفعيل HTTP/3');
  }
}

async function createCompressionPageRule() {
  console.log('📋 إنشاء Page Rule للضغط...');
  
  // الحصول على Page Rules الحالية أولاً
  const existingRules = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/pagerules`
  );
  
  if (existingRules?.result) {
    // البحث عن Page Rule للضغط
    const compressionRule = existingRules.result.find(rule => 
      rule.targets?.[0]?.constraint?.value?.includes('*') &&
      rule.actions?.some(action => action.id === 'cache_level')
    );
    
    if (compressionRule) {
      console.log('✅ Page Rule للضغط موجود بالفعل');
      return;
    }
  }
  
  // إنشاء Page Rule جديد للضغط
  const pageRuleResult = await makeRequest(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/pagerules`,
    'POST',
    {
      targets: [{
        target: 'url',
        constraint: {
          operator: 'matches',
          value: '*stockiha.com/*'
        }
      }],
      actions: [
        { id: 'cache_level', value: 'cache_everything' },
        { id: 'edge_cache_ttl', value: 7200 },
        { id: 'browser_cache_ttl', value: 31536000 }
      ],
      priority: 1,
      status: 'active'
    }
  );
  
  if (pageRuleResult?.success) {
    console.log('✅ تم إنشاء Page Rule للضغط بنجاح');
  } else {
    console.log('❌ فشل في إنشاء Page Rule للضغط');
  }
}

async function testCompression() {
  console.log('\n🧪 اختبار الضغط...');
  
  try {
    // اختبار ضغط الموقع
    const testUrl = 'https://aaa75b28.stockiha.pages.dev/';
    console.log(`🔍 اختبار: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Compression Test)'
      }
    });
    
    const contentEncoding = response.headers.get('content-encoding');
    const contentLength = response.headers.get('content-length');
    
    console.log(`📊 Content-Encoding: ${contentEncoding || 'none'}`);
    console.log(`📏 Content-Length: ${contentLength || 'unknown'}`);
    
    if (contentEncoding) {
      console.log('✅ الضغط يعمل بنجاح!');
      
      if (contentEncoding.includes('br')) {
        console.log('🚀 Brotli compression نشط');
      } else if (contentEncoding.includes('gzip')) {
        console.log('📦 Gzip compression نشط');
      }
    } else {
      console.log('❌ الضغط غير نشط');
    }
    
  } catch (error) {
    console.log(`❌ خطأ في اختبار الضغط: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 بدء تطبيق إعدادات ضغط Cloudflare...\n');
  
  // تطبيق الإعدادات الأساسية
  await enableCompression();
  await enableMinification();
  await enableImageOptimization();
  await enableRocketLoader();
  await setBrowserCacheTTL();
  await enableHTTP3();
  await createCompressionPageRule();
  
  console.log('\n⏳ انتظار 30 ثانية لتطبيق الإعدادات...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // اختبار النتائج
  await testCompression();
  
  console.log('\n🎉 تم الانتهاء من تحسين إعدادات الضغط!');
  console.log('\n📊 لاختبار النتائج، استخدم:');
  console.log('   - https://gtmetrix.com/');
  console.log('   - https://tools.pingdom.com/');
  console.log('   - https://www.webpagetest.org/');
  console.log('\n💡 قد تحتاج إلى انتظار 5-10 دقائق لانتشار التغييرات عالمياً.');
}

// تشغيل السكريبت
main().catch(error => {
  console.error('💥 خطأ في تشغيل السكريبت:', error.message);
  process.exit(1);
});
