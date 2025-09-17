// 🚀 Stockiha Ultra Simple Worker - مبسط لأقصى حد لتحسين الأداء
// - إعادة توجيه HTTPS فقط
// - توجيه أساسي للنطاقات
// - تخزين مؤقت بسيط للأصول
// - إزالة جميع التعقيدات المسببة للتأخير

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // 1) إعادة توجيه HTTPS فقط
    if (url.protocol !== "https:") {
      return Response.redirect(`https://${hostname}${url.pathname}${url.search}`, 301);
    }

    // 2) تحديد نوع النطاق ومسار الصفحة
    let targetPath;

    if (hostname === "stockiha.com" || hostname === "www.stockiha.com") {
      // النطاق الرئيسي - صفحة الهبوط
      targetPath = "/index.html";
    } else if (hostname.endsWith(".stockiha.com")) {
      // subdomain store
      targetPath = "/store.html";
    } else {
      // custom domain store
      targetPath = "/store.html";
    }

    // 3) تحديد نوع الطلب
    const isAsset = /\.(?:js|mjs|css|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|svg|wasm|map)$/i.test(url.pathname);
    const isHtmlRequest = !isAsset && (request.headers.get('accept') || '').includes('text/html');

    // 4) تحديد المسار النهائي
    const finalPath = isHtmlRequest ? targetPath : url.pathname;

    // 5) إنشاء URL الهدف
    const targetUrl = `https://stockiha.pages.dev${finalPath}${url.search}`;

    // 6) جلب المحتوى مع cache بسيط
    const cacheKey = new Request(targetUrl, request);
    let response = await caches.default.match(cacheKey);

    if (!response) {
      try {
        response = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          redirect: "follow"
        });

        // Cache الأصول الثابتة لمدة ساعة
        if (isAsset && response.status === 200) {
          const cacheResponse = new Response(response.clone().body, response);
          cacheResponse.headers.set('Cache-Control', 'public, max-age=3600');
          ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
        }
      } catch (error) {
        return new Response("خطأ في الخادم", { status: 500 });
      }
    }

    // 7) تحسين الاستجابة
    const newResponse = new Response(response.body, response);

    // إزالة headers غير ضرورية لتحسين الأداء
    newResponse.headers.delete('x-powered-by');
    newResponse.headers.delete('server');
    newResponse.headers.delete('via');
    newResponse.headers.delete('x-amz-cf-pop');
    newResponse.headers.delete('x-amz-cf-id');

    // إضافة headers أمان أساسية
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('X-Frame-Options', 'DENY');

    // تحسين cache للصفحات HTML
    if (isHtmlRequest) {
      newResponse.headers.set('Cache-Control', 'public, max-age=300'); // 5 دقائق
    }

    return newResponse;
  },
};
