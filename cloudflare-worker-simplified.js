// 🚀 Stockiha Simplified Worker - محسن للأداء والسرعة
// - تخزين مؤقت بسيط وفعال
// - توجيه مبسط للـ domains
// - إزالة التعقيدات غير الضرورية

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // 1) إعادة توجيه HTTPS
    if (url.protocol !== "https:") {
      return Response.redirect(`https://${hostname}${url.pathname}${url.search}`, 301);
    }

    // 2) معالج الصور
    if (url.pathname === "/img") {
      return handleImageResize(request, url, ctx);
    }

    // 3) API Proxy
    if (url.pathname.startsWith("/api-proxy/")) {
      return handleApiProxy(request, url, ctx);
    }

    // 4) توجيه موحد للجميع
    return handleRequest(request, url, ctx, env);
  },
};

/* =========================
   إعدادات مبسطة
   ========================= */
const PAGES_ORIGIN = "https://stockiha.pages.dev";
const SUPABASE_ORIGIN = "https://wrnssatuvmumsczyldth.supabase.co";
const ASSET_REGEX = /\.(?:js|mjs|css|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|svg|wasm|map)$/i;

// كشف WebView مبسط
function isWebView(userAgent) {
  return /FBAN|Instagram|TikTok|WhatsApp/i.test(userAgent);
}

// تحديد نوع الطلب
function isHtmlRequest(request, pathname) {
  const dest = request.headers.get('sec-fetch-dest') || '';
  if (dest) {
    return dest === 'document';
  }
  const accept = request.headers.get('accept') || '';
  const isAsset = ASSET_REGEX.test(pathname) || pathname.includes('.');
  return accept.includes('text/html') && !isAsset;
}

// تحديد نوع الدومين
function getDomainType(hostname) {
  if (hostname === "stockiha.com" || hostname === "www.stockiha.com") {
    return { type: "main", path: "/index.html" };
  } else if (hostname.endsWith(".stockiha.com") && hostname !== "stockiha.com" && hostname !== "www.stockiha.com") {
    return { type: "subdomain", path: "/store.html" };
  } else {
    return { type: "custom", path: "/store.html" };
  }
}

/* =========================
   معالج الطلبات الموحد
   ========================= */
async function handleRequest(request, url, ctx, env) {
  const method = request.method;
  const pathname = url.pathname;
  const isAsset = method === "GET" && ASSET_REGEX.test(pathname);
  
  // معالجة الأصول الثابتة
  if (isAsset) {
    return serveAsset(request, url, ctx);
  }

  // تحديد مسار الصفحة
  const domainInfo = getDomainType(url.hostname);
  const isHtml = isHtmlRequest(request, pathname);
  const targetPath = isHtml ? domainInfo.path : pathname;
  
  // إنشاء URL الهدف
  const targetUrl = `${PAGES_ORIGIN}${targetPath}${url.search}`;
  
  // جلب المحتوى
  let response;
  try {
    response = await fetch(targetUrl, {
      method,
      headers: cleanHeaders(request.headers),
      cf: {
        cacheEverything: false,
        minify: { html: true, css: true, javascript: true },
        polish: "lossless"
      },
      redirect: "follow"
    });
  } catch (e) {
    return new Response("خطأ في جلب المحتوى", { status: 502 });
  }

  if (!response.ok) {
    return new Response(`خطأ: ${response.status}`, { status: response.status });
  }

  // إضافة headers بسيطة
  const headers = new Headers(response.headers);
  addBasicHeaders(headers, isHtml, pathname);
  
  // إضافة preconnect للـ Supabase
  if (isHtml) {
    headers.set("Link", `<${SUPABASE_ORIGIN}>; rel=preconnect; crossorigin`);
  }

  return new Response(response.body, { status: response.status, headers });
}

/* =========================
   معالج الأصول الثابتة
   ========================= */
async function serveAsset(request, url, ctx) {
  const cache = caches.default;
  const assetUrl = `${PAGES_ORIGIN}${url.pathname}${url.search}`;
  const cacheKey = new Request(assetUrl, { method: "GET" });

  // فحص التخزين المؤقت
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    addAssetHeaders(headers, url.pathname);
    return new Response(cached.body, { status: cached.status, headers });
  }

  // جلب الأصل
  let response;
  try {
    response = await fetch(assetUrl, {
      headers: cleanHeaders(request.headers),
      cf: {
        cacheEverything: true,
        minify: { css: true, javascript: false },
        polish: "lossless"
      }
    });
  } catch (e) {
    return new Response("خطأ في جلب الأصل", { status: 502 });
  }

  const headers = new Headers(response.headers);
  addAssetHeaders(headers, url.pathname);

  const finalResponse = new Response(response.body, { status: response.status, headers });
  
  // تخزين في الكاش
  ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
  
  return finalResponse;
}

/* =========================
   معالج API Proxy
   ========================= */
async function handleApiProxy(request, url, ctx) {
  try {
    const proxyPath = url.pathname.replace('/api-proxy/', '');
    const supabaseUrl = `${SUPABASE_ORIGIN}/${proxyPath}${url.search}`;
    
    const cache = caches.default;
    const cacheKey = new Request(supabaseUrl, {
      method: request.method,
      headers: {
        'authorization': request.headers.get('authorization') || '',
        'apikey': request.headers.get('apikey') || ''
      }
    });
    
    // فحص الكاش للطلبات GET
    if (request.method === 'GET') {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('X-Cache', 'HIT');
        return new Response(cached.body, { status: cached.status, headers });
      }
    }
    
    // إرسال الطلب لـ Supabase
    const response = await fetch(supabaseUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });
    
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'MISS');
    
    // تخزين النتائج الناجحة
    if (response.ok && request.method === 'GET') {
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=900');
      const responseToClient = new Response(response.body, { status: response.status, headers });
      ctx.waitUntil(cache.put(cacheKey, responseToClient.clone()));
      return responseToClient;
    }
    
    return new Response(response.body, { status: response.status, headers });
    
  } catch (error) {
    return new Response('خطأ في API Proxy: ' + error.message, { status: 502 });
  }
}

/* =========================
   معالج الصور
   ========================= */
async function handleImageResize(request, url, ctx) {
  try {
    const params = url.searchParams;
    const src = params.get("url");
    if (!src) {
      return new Response("معامل url مفقود", { status: 400 });
    }

    // التحقق من المصادر المسموحة
    let origin;
    try { origin = new URL(src).origin; } catch {}
    if (!origin || !origin.startsWith(SUPABASE_ORIGIN)) {
      return new Response("المصدر غير مسموح", { status: 403 });
    }

    const width = clampInt(params.get("w") || params.get("width"), 16, 2000);
    const height = clampInt(params.get("h") || params.get("height"), 16, 2000);
    const quality = clampInt(params.get("q") || params.get("quality"), 10, 100) || 75;
    const fit = params.get("fit") || "cover";
    const format = params.get("f") || "auto";

    const cache = caches.default;
    const cacheKey = new Request(
      `https://edge-cache.invalid/img?url=${encodeURIComponent(src)}&w=${width||""}&h=${height||""}&q=${quality}&fit=${fit}&f=${format}`,
      request
    );

    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const imageRequest = new Request(src, request);
    const cfImage = {
      quality,
      fit,
      format,
      ...(width ? { width: Number(width) } : {}),
      ...(height ? { height: Number(height) } : {}),
    };

    const response = await fetch(imageRequest, { cf: { image: cfImage } });
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    headers.set("X-Image-CDN", "cloudflare-workers");

    const body = await response.arrayBuffer();
    const optimized = new Response(body, { status: response.status, headers });
    ctx.waitUntil(cache.put(cacheKey, optimized.clone()));

    return optimized;
  } catch (e) {
    return new Response("خطأ في معالجة الصورة: " + e.message, { status: 500 });
  }
}

/* =========================
   دوال مساعدة
   ========================= */
function cleanHeaders(inHeaders) {
  const h = new Headers(inHeaders);
  const banned = [
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", "content-length",
    "host", "cf-connecting-ip", "cf-ipcountry", "cf-ray"
  ];
  for (const k of banned) h.delete(k);
  return h;
}

function addBasicHeaders(headers, isHtml, pathname) {
  // أمان أساسي
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // تخزين مؤقت
  if (isHtml) {
    headers.set("Cache-Control", "public, max-age=300, s-maxage=900");
  } else if (pathname.endsWith(".json") || pathname.includes("/rpc/")) {
    headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  }
  
  // Vary للضغط
  const current = headers.get('Vary');
  if (!current) headers.set('Vary', 'Accept-Encoding');
  else if (!/\bAccept-Encoding\b/i.test(current)) {
    headers.set('Vary', `${current}, Accept-Encoding`);
  }
}

function addAssetHeaders(headers, pathname) {
  headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
  
  // تحديد نوع المحتوى
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
    headers.set("Content-Type", "application/javascript");
  } else if (lower.endsWith(".css")) {
    headers.set("Content-Type", "text/css");
  } else if (lower.endsWith(".json")) {
    headers.set("Content-Type", "application/json");
  } else if (lower.endsWith(".svg")) {
    headers.set("Content-Type", "image/svg+xml");
  } else if (lower.endsWith(".png")) {
    headers.set("Content-Type", "image/png");
  } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    headers.set("Content-Type", "image/jpeg");
  } else if (lower.endsWith(".webp")) {
    headers.set("Content-Type", "image/webp");
  } else if (lower.endsWith(".woff2")) {
    headers.set("Content-Type", "font/woff2");
  }
  
  // Vary للضغط
  const current = headers.get('Vary');
  if (!current) headers.set('Vary', 'Accept-Encoding');
  else if (!/\bAccept-Encoding\b/i.test(current)) {
    headers.set('Vary', `${current}, Accept-Encoding`);
  }
}

function clampInt(value, min, max) {
  if (value == null) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}
