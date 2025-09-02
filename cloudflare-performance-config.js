// 🚀 إعدادات تحسين الأداء المتقدمة لـ Cloudflare
// تشغيل: node cloudflare-performance-config.js

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const performanceSettings = {
  // تحسينات الضغط
  compression: {
    brotli: true,
    gzip: true,
    auto_minify: {
      css: true,
      html: true,
      js: true
    }
  },

  // تحسينات التخزين المؤقت
  caching: {
    browser_cache_ttl: 31536000, // سنة واحدة للأصول الثابتة
    edge_cache_ttl: 7200, // ساعتين للمحتوى الديناميكي
    development_mode: false,
    purge_everything: false
  },

  // تحسينات الشبكة
  network: {
    http3: true,
    http2: true,
    ipv6: true,
    websockets: true,
    pseudo_ipv4: "add_header"
  },

  // تحسينات الصور
  images: {
    polish: "lossy", // ضغط الصور
    webp: true, // تحويل إلى WebP
    resize: true // تغيير حجم الصور حسب الحاجة
  },

  // قواعد Page Rules للتحسين
  page_rules: [
    {
      targets: [{
        target: "url",
        constraint: {
          operator: "matches",
          value: "stockiha.com/assets/*"
        }
      }],
      actions: [{
        id: "cache_level",
        value: "cache_everything"
      }, {
        id: "edge_cache_ttl",
        value: 31536000 // سنة واحدة
      }, {
        id: "browser_cache_ttl",
        value: 31536000
      }],
      priority: 1,
      status: "active"
    },
    {
      targets: [{
        target: "url",
        constraint: {
          operator: "matches",
          value: "stockiha.com/api/*"
        }
      }],
      actions: [{
        id: "cache_level",
        value: "bypass"
      }, {
        id: "security_level",
        value: "high"
      }],
      priority: 2,
      status: "active"
    },
    {
      targets: [{
        target: "url",
        constraint: {
          operator: "matches",
          value: "*.stockiha.com/*"
        }
      }],
      actions: [{
        id: "always_use_https",
        value: "on"
      }, {
        id: "automatic_https_rewrites",
        value: "on"
      }],
      priority: 3,
      status: "active"
    }
  ],

  // Workers للتحسينات المتقدمة
  workers: {
    // تحسين الخطوط
    font_optimization: `
      addEventListener('fetch', event => {
        const url = new URL(event.request.url);
        
        // تحسين تحميل الخطوط
        if (url.pathname.includes('/fonts/') || url.pathname.endsWith('.woff2')) {
          event.respondWith(handleFontRequest(event.request));
        }
      });

      async function handleFontRequest(request) {
        const response = await fetch(request);
        const newResponse = new Response(response.body, response);
        
        // إضافة headers للخطوط
        newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Vary', 'Accept-Encoding');
        
        return newResponse;
      }
    `,

    // ضغط HTML متقدم
    html_compression: `
      addEventListener('fetch', event => {
        const url = new URL(event.request.url);
        
        if (url.pathname === '/' || url.pathname.endsWith('.html')) {
          event.respondWith(handleHTMLRequest(event.request));
        }
      });

      async function handleHTMLRequest(request) {
        const response = await fetch(request);
        let html = await response.text();
        
        // تحسينات HTML
        html = html
          .replace(/\\s+/g, ' ') // إزالة المسافات الزائدة
          .replace(/<!--[\\s\\S]*?-->/g, '') // إزالة التعليقات
          .replace(/\\n\\s*\\n/g, '\\n'); // إزالة الأسطر الفارغة
        
        return new Response(html, {
          headers: {
            ...response.headers,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'Vary': 'Accept-Encoding'
          }
        });
      }
    `
  }
};

// دالة تطبيق الإعدادات
async function applyPerformanceSettings() {
  if (!ZONE_ID || !API_TOKEN) {
    console.error('❌ يرجى تعيين CLOUDFLARE_ZONE_ID و CLOUDFLARE_API_TOKEN');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('🚀 تطبيق إعدادات تحسين الأداء...');

    // تطبيق إعدادات الضغط
    console.log('📦 تفعيل الضغط...');
    await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/brotli`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ value: 'on' })
    });

    await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/minify`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ value: performanceSettings.compression.auto_minify })
    });

    // تطبيق إعدادات الشبكة
    console.log('🌐 تحسين إعدادات الشبكة...');
    await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/http3`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ value: 'on' })
    });

    // تطبيق Page Rules
    console.log('📋 إنشاء Page Rules...');
    for (const rule of performanceSettings.page_rules) {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/pagerules`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rule)
      });
    }

    console.log('✅ تم تطبيق جميع إعدادات تحسين الأداء بنجاح!');
    console.log('🎉 موقعك الآن محسن للأداء العالي على Cloudflare');

  } catch (error) {
    console.error('❌ خطأ في تطبيق الإعدادات:', error);
  }
}

// تصدير الدالة للاستخدام
if (require.main === module) {
  applyPerformanceSettings();
}

module.exports = { performanceSettings, applyPerformanceSettings };
