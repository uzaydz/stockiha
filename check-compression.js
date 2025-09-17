#!/usr/bin/env node

// 🔍 فحص حالة ضغط Gzip على موقع Cloudflare
// الاستخدام: node check-compression.js

const urls = [
  'https://aaa75b28.stockiha.pages.dev/',
  'https://aaa75b28.stockiha.pages.dev/assets/index-BCrguqEN.js',
  'https://aaa75b28.stockiha.pages.dev/assets/App-DlYqrMdk.css',
  'https://aaa75b28.stockiha.pages.dev/images/logo-new.webp',
  'https://aaa75b28.stockiha.pages.dev/assets/main-MJUAg7Cp.js'
];

async function checkCompression(url) {
  console.log(`🔍 فحص الضغط: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Compression Checker)',
        'Accept': '*/*'
      }
    });
    
    const headers = response.headers;
    const contentEncoding = headers.get('content-encoding');
    const contentLength = headers.get('content-length');
    const contentType = headers.get('content-type');
    const cacheControl = headers.get('cache-control');
    const vary = headers.get('vary');
    const cfRay = headers.get('cf-ray');
    
    console.log('📊 تفاصيل الاستجابة:');
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📦 Content-Encoding: ${contentEncoding || '❌ غير مفعل'}`);
    console.log(`   📏 Content-Length: ${contentLength || 'غير محدد'}`);
    console.log(`   📄 Content-Type: ${contentType || 'غير محدد'}`);
    console.log(`   ⏰ Cache-Control: ${cacheControl || 'غير محدد'}`);
    console.log(`   🔄 Vary: ${vary || 'غير محدد'}`);
    console.log(`   ☁️  Cloudflare Ray: ${cfRay || 'غير محدد'}`);
    
    if (contentEncoding) {
      if (contentEncoding.includes('br')) {
        console.log('🚀 ممتاز! Brotli compression نشط');
      } else if (contentEncoding.includes('gzip')) {
        console.log('📦 جيد! Gzip compression نشط');
      } else {
        console.log(`🤔 نوع ضغط غير معروف: ${contentEncoding}`);
      }
    } else {
      console.log('❌ مشكلة: الضغط غير مفعل!');
    }
    
    // حساب نسبة الضغط (تقريبي)
    if (contentLength && contentEncoding) {
      const compressedSize = parseInt(contentLength);
      console.log(`📈 الحجم المضغوط: ${(compressedSize / 1024).toFixed(2)} KB`);
    }
    
  } catch (error) {
    console.log(`❌ خطأ في فحص ${url}: ${error.message}`);
  }
  
  console.log('─'.repeat(60));
}

async function checkCloudflareSettings() {
  console.log('🌐 فحص إعدادات Cloudflare...\n');
  
  const testHeaders = {
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
  
  try {
    const response = await fetch('https://aaa75b28.stockiha.pages.dev/', {
      headers: testHeaders
    });
    
    const allHeaders = {};
    response.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    
    console.log('📋 جميع Headers المستجيبة:');
    Object.entries(allHeaders).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
  } catch (error) {
    console.log(`❌ خطأ في فحص Headers: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 فحص شامل لحالة ضغط موقع Stockiha\n');
  console.log('═'.repeat(60));
  
  for (const url of urls) {
    await checkCompression(url);
    await new Promise(resolve => setTimeout(resolve, 1000)); // توقف ثانية بين الطلبات
  }
  
  await checkCloudflareSettings();
  
  console.log('\n💡 إذا كان الضغط غير مفعل:');
  console.log('1. شغّل: node fix-cloudflare-compression.js');
  console.log('2. أو فعّل الضغط يدوياً من Cloudflare Dashboard');
  console.log('3. انتظر 5-10 دقائق لانتشار التغييرات');
  console.log('4. أعد فحص الموقع على https://gtmetrix.com/');
  
  console.log('\n📊 نصائح لتحسين نقاط الأداء:');
  console.log('• تأكد من تفعيل Brotli + Gzip في Cloudflare');
  console.log('• استخدم Auto Minify للـ HTML, CSS, JS');
  console.log('• فعّل Polish لضغط الصور');
  console.log('• اضبط Browser Cache TTL على سنة واحدة');
  console.log('• استخدم Page Rules للتحكم في التخزين المؤقت');
}

main().catch(console.error);
