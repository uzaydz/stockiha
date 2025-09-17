// 🚀 Stockiha Custom Domain Optimized Worker
// مبسط خصيصاً للنطاقات المخصصة لحل مشاكل الطلبات الملغاة

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // 1) إعادة توجيه HTTPS فقط
    if (url.protocol !== "https:") {
      return Response.redirect(`https://${hostname}${url.pathname}${url.search}`, 301);
    }

    // 2) تحديد نوع النطاق بسرعة
    const isMainDomain = hostname === "stockiha.com" || hostname === "www.stockiha.com";
    const isSubdomain = hostname.endsWith(".stockiha.com") && !isMainDomain;
    const isCustomDomain = !isMainDomain && !isSubdomain;

    // 3) تحديد المسار المطلوب
    let targetPath;
    if (isMainDomain) {
      targetPath = "/index.html";
    } else {
      // جميع النطاقات الفرعية والمخصصة توجه للمتجر
      targetPath = "/store.html";
    }

    // 4) فحص نوع الطلب
    const isAsset = /\.(?:js|mjs|css|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|svg|wasm|map)$/i.test(url.pathname);
    const accept = request.headers.get('accept') || '';
    const isHtmlRequest = !isAsset && accept.includes('text/html');

    // 5) تحديد المسار النهائي
    const finalPath = isHtmlRequest ? targetPath : url.pathname;
    const targetUrl = `https://stockiha.pages.dev${finalPath}${url.search}`;

    // 6) معالجة مخصصة للنطاقات المخصصة
    if (isCustomDomain) {
      return handleCustomDomainSimple(request, targetUrl, ctx);
    }

    // 7) معالجة عادية للنطاقات الأخرى
    return handleStandardDomain(request, targetUrl, ctx, hostname);
  },
};

// معالج مبسط للنطاقات المخصصة
async function handleCustomDomainSimple(request, targetUrl, ctx) {
  try {
    // جلب مباشر بدون تعقيدات
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: cleanHeaders(request.headers),
      redirect: "follow",
      cf: {
        // إعدادات مبسطة للنطاقات المخصصة
        cacheEverything: false,
        minify: {
          html: false,
          css: false,
          javascript: false
        },
        polish: "off",
        mirage: false,
      }
    });

    if (!response.ok) {
      return new Response(`خطأ: ${response.status}`, { status: response.status });
    }

    // headers مبسطة
    const headers = new Headers(response.headers);
    
    // إزالة headers مشكوك فيها
    headers.delete('content-security-policy');
    headers.delete('content-security-policy-report-only');
    headers.delete('strict-transport-security');
    
    // إضافة headers أساسية فقط
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // كاش بسيط
    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      headers.set('Cache-Control', 'public, max-age=60'); // دقيقة واحدة
    } else {
      headers.set('Cache-Control', 'public, max-age=3600'); // ساعة للأصول
    }

    // Vary للضغط
    const currentVary = headers.get('Vary') || '';
    if (!currentVary.includes('Accept-Encoding')) {
      headers.set('Vary', currentVary ? `${currentVary}, Accept-Encoding` : 'Accept-Encoding');
    }

    return new Response(response.body, {
      status: response.status,
      headers: headers
    });

  } catch (error) {
    console.error('خطأ في النطاق المخصص:', error);
    return new Response('خطأ في الخادم', { status: 502 });
  }
}

// معالج عادي للنطاقات الأخرى
async function handleStandardDomain(request, targetUrl, ctx, hostname) {
  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: cleanHeaders(request.headers),
      redirect: "follow"
    });

    const headers = new Headers(response.headers);
    
    // إضافة headers للنطاقات الفرعية
    if (hostname.endsWith('.stockiha.com')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain !== 'www') {
        headers.set('X-Subdomain', subdomain);
      }
    }

    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');

    return new Response(response.body, {
      status: response.status,
      headers: headers
    });

  } catch (error) {
    console.error('خطأ في النطاق العادي:', error);
    return new Response('خطأ في الخادم', { status: 502 });
  }
}

// تنظيف headers الطلب
function cleanHeaders(inHeaders) {
  const headers = new Headers(inHeaders);
  
  // إزالة headers مشكوك فيها
  const bannedHeaders = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'content-length',
    'host',
    'cf-connecting-ip',
    'cf-ipcountry',
    'cf-ray',
    'x-forwarded-proto',
    'x-real-ip',
  ];

  for (const header of bannedHeaders) {
    headers.delete(header);
  }

  return headers;
}
