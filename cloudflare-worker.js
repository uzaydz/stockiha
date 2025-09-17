// stockiha-turbo-worker.mjs
// 🚀 TURBO Worker for Stockiha: optimized for ultra-fast LCP & FCP
// - Edge caching for static assets (1y immutable)
// - Smart HTML caching (SWR)
// - Early Hints via Link headers
// - HTMLRewriter to inject fetchpriority/preload for critical LCP images
// - Cloudflare Image Resizer CDN via /img route
// - Safe routing for main, subdomains, and custom domains

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const userAgent = request.headers.get('user-agent') || '';

    // 1) HTTPS redirect for safety + HSTS works properly
    if (url.protocol !== "https:") {
      return Response.redirect(`https://${hostname}${url.pathname}${url.search}`, 301);
    }

    // 2) 🖼️ Image Resizer CDN Route
    if (url.pathname === "/img") {
      return handleImageResize(request, url, ctx);
    }

    // 3) 🚀 API Proxy Route for better caching of Supabase calls
    // Ensure optimizationContext is declared before usage
    const isWebView = detectWebView(userAgent);
    const optimizationContext = { isWebView, userAgent };
    if (url.pathname.startsWith("/api-proxy/")) {
      return handleApiProxy(request, url, ctx, optimizationContext);
    }

    // 4) 🛠️ Cloudflare API Routes for domain management (now handled by Functions)
    // Note: These are now handled by /functions/api/ routes, no need for Worker handling

    if (isMainDomain(hostname)) {
      return handleMainDomain(request, url, ctx, env, optimizationContext);
    } else if (isSubdomain(hostname)) {
      return handleSubdomain(request, url, ctx, env, extractSubdomain(hostname), optimizationContext);
    } else {
      return handleCustomDomain(request, url, ctx, env, hostname, optimizationContext);
    }
  },
};

/* =========================
   CONFIG
   ========================= */
const PAGES_ORIGIN = "https://stockiha.pages.dev";

const THIRD_PARTY_ORIGINS = [
  "https://wrnssatuvmumsczyldth.supabase.co"
];

const MAX_LINK_HINTS = 8;

const ASSET_REGEX =
  /\.(?:js|mjs|css|png|jpe?g|webp|gif|ico|woff2?|ttf|otf|svg|wasm|map)$/i;

// WebView User Agents for social media apps - improved detection to avoid false positives
const WEBVIEW_PATTERNS = [
  /FBAN|FBAV/i, // Facebook
  /Instagram/i, // Instagram
  /musical_ly|TikTok/i, // TikTok
  /TwitterAndroid|TwitteriPhone/i, // Twitter
  /Line|KAKAOTALK/i, // Line, KakaoTalk
  /WeChat|MicroMessenger/i, // WeChat
  /WhatsApp/i, // WhatsApp
  /LinkedInApp/i, // LinkedIn
  /Snapchat/i, // Snapchat
  /Pinterest/i, // Pinterest
  // More specific WebView detection - exclude regular Chrome Android
  /(wv|WebView).*(Version|Chrome).*Mobile/i, // Generic WebView with better specificity
  /Android.*wv.*Chrome/i // Android WebView with wv flag
];

// Critical resources that should be preloaded aggressively in WebView
const CRITICAL_RESOURCES = {
  css: ['styles.css', 'main.css', 'app.css'],
  js: ['app.js', 'main.js', 'bundle.js', 'index.js'],
  fonts: ['font.woff2', 'font.woff']
};

// Cache durations for different content types (in seconds)
const CACHE_DURATIONS = {
  html: {
    browser: 60,     // 1 minute (reduced for freshness)
    edge: 120,       // 2 minutes (reduced for SWR)
    staleTime: 30    // 30 seconds
  },
  api: {
    browser: 60,     // 1 minute
    edge: 300,       // 5 minutes
    staleTime: 30    // 30 seconds  
  },
  assets: {
    browser: 86400,  // 1 day
    edge: 604800,    // 1 week
    staleTime: 43200 // 12 hours
  }
};

// Performance optimization patterns
const PERFORMANCE_PATTERNS = {
  // Components that re-render frequently
  reRenderComponents: [
    'ProductPurchasePageV3Container',
    'StoreNavbar', 
    'AppWrapper',
    'TenantProvider'
  ],
  // API calls that can be cached aggressively
  cacheableApis: [
    'get_store_init_data',
    'get_product_complete_data_ultra_optimized',
    'get_product_color_images_optimized'
  ],
  // Resources that cause layout shifts
  layoutShiftResources: [
    'organization_settings',
    'custom_js'
  ]
};

/* =========================
   Routing helpers
   ========================= */
function isMainDomain(h) {
  return h === "stockiha.com" || h === "www.stockiha.com";
}
function isSubdomain(h) {
  return h.endsWith(".stockiha.com") && h !== "stockiha.com" && h !== "www.stockiha.com";
}
function extractSubdomain(h) {
  if (!h.endsWith(".stockiha.com")) return null;
  const [first] = h.split(".");
  return first === "www" ? null : first;
}

function extractOrganizationId(hostname) {
  // First try subdomain extraction for stockiha.com domains
  if (hostname.endsWith(".stockiha.com")) {
    const subdomain = extractSubdomain(hostname);
    if (subdomain) return subdomain;
  }

  // For custom domains, return the hostname without www for client-side processing
  // The client-side script will handle the organization lookup via API
  let cleanHostname = hostname;
  if (cleanHostname.startsWith("www.")) {
    cleanHostname = cleanHostname.substring(4);
  }
  
  // Return the clean hostname as identifier for custom domains
  // This allows the client-side to make the proper API call
  return cleanHostname;
}
function buildPagesUrl(url) {
  return PAGES_ORIGIN + url.pathname + url.search;
}

// Robust detection for top-level HTML navigations
function isHtmlNavigationRequest(request, pathname) {
  const dest = request.headers.get('sec-fetch-dest') || '';
  if (dest) {
    // Only treat real document navigations as HTML
    if (dest === 'document') return true;
    return false;
  }
  // Fallback: only consider as HTML when Accept includes text/html AND it is not an asset path
  const accept = request.headers.get('accept') || '';
  const looksLikeAsset = ASSET_REGEX.test(pathname) || pathname.includes('.');
  return accept.includes('text/html') && !looksLikeAsset;
}

// Detect WebView based on User-Agent
function detectWebView(userAgent) {
  return WEBVIEW_PATTERNS.some(pattern => pattern.test(userAgent));
}

// Get optimized cache settings based on context
function getOptimizedCacheSettings(isWebView, contentType, pathname = '') {
  const multiplier = isWebView ? 2 : 1; // More aggressive caching for WebView
  
  if (contentType === 'html') {
    const cache = CACHE_DURATIONS.html;
    return `public, max-age=${cache.browser * multiplier}, s-maxage=${cache.edge * multiplier}, stale-while-revalidate=${cache.staleTime * multiplier}`;
  } 
  else if (contentType === 'json' || contentType === 'api') {
    const cache = CACHE_DURATIONS.api;
    // Extra aggressive caching for organization settings and init data
    const isConfigEndpoint = pathname.includes('organization_settings') || 
                            pathname.includes('get_store_init_data') ||
                            pathname.includes('rpc/');
    const configMultiplier = isConfigEndpoint ? 3 : 1;
    return `public, max-age=${cache.browser * multiplier * configMultiplier}, s-maxage=${cache.edge * multiplier * configMultiplier}, stale-while-revalidate=${cache.staleTime * multiplier}`;
  } 
  else if (contentType === 'asset') {
    const cache = CACHE_DURATIONS.assets;
    return `public, max-age=${cache.browser}, s-maxage=${cache.edge}, stale-while-revalidate=${cache.staleTime}, immutable`;
  }
  
  return `public, max-age=${300 * multiplier}`;
}

// Helper: compute browser max-age seconds for Expires
function getBrowserTTLSeconds(isWebView, contentType, pathname = '') {
  const multiplier = isWebView ? 2 : 1;
  if (contentType === 'html') {
    return CACHE_DURATIONS.html.browser * multiplier;
  }
  if (contentType === 'api' || contentType === 'json') {
    const isConfigEndpoint = pathname.includes('organization_settings') ||
      pathname.includes('get_store_init_data') ||
      pathname.includes('rpc/');
    const configMultiplier = isConfigEndpoint ? 3 : 1;
    return CACHE_DURATIONS.api.browser * multiplier * configMultiplier;
  }
  if (contentType === 'asset') {
    return CACHE_DURATIONS.assets.browser;
  }
  return 300 * multiplier;
}

// Helper: ensure Vary includes Accept-Encoding
function ensureVaryAcceptEncoding(headers) {
  const current = headers.get('Vary');
  if (!current) headers.set('Vary', 'Accept-Encoding');
  else if (!/\bAccept-Encoding\b/i.test(current)) headers.set('Vary', `${current}, Accept-Encoding`);
}

// Helper: add Expires header derived from browser TTL
function applyExpires(headers, secondsFromNow) {
  if (!secondsFromNow || secondsFromNow <= 0) return;
  const expires = new Date(Date.now() + secondsFromNow * 1000).toUTCString();
  headers.set('Expires', expires);
}



// Enhanced performance optimization for problem URLs
function getPerformanceHeaders(pathname, isWebView) {
  const headers = {};
  
  // Aggressive caching for heavy components
  if (pathname.includes('product-purchase') || pathname.includes('ProductPurchasePageV3')) {
    headers['X-Component-Cache'] = 'aggressive';
    headers['Cache-Control'] = getOptimizedCacheSettings(isWebView, 'html', pathname);
  }
  
  // Preload critical resources more aggressively
  if (isWebView) {
    headers['X-Preload-Strategy'] = 'aggressive';
    headers['X-Critical-Resource-Hints'] = 'max';
  }
  
  // Minimize re-renders
  headers['X-Render-Optimization'] = 'enabled';
  
  // Force compression for all text-based content
  headers['X-Force-Compression'] = 'true';
  
  return headers;
}

/* =========================
   Handlers
   ========================= */
async function handleMainDomain(request, url, ctx, env, optimizationContext) {
  const upstream = new URL(PAGES_ORIGIN);
  const isHtmlLike = isHtmlNavigationRequest(request, url.pathname);
  upstream.pathname = isHtmlLike ? '/index.html' : url.pathname;
  upstream.search = url.search;
  return proxyTurbo(upstream.toString(), request, ctx, {
    "X-Served-By": "CF-Worker-Turbo",
    "X-Domain-Type": "main",
  }, optimizationContext);
}
async function handleSubdomain(request, url, ctx, env, sub, optimizationContext) {
  // Route all HTML-like requests for subdomains to store.html (store-only SPA)
  const upstream = new URL(PAGES_ORIGIN);
  const isHtmlLike = isHtmlNavigationRequest(request, url.pathname);
  upstream.pathname = isHtmlLike ? '/store.html' : url.pathname;
  upstream.search = url.search;
  return proxyTurbo(upstream.toString(), request, ctx, {
    "X-Domain-Type": "subdomain",
    "X-Subdomain": sub ?? "",
    "X-Forwarded-Host": new URL(request.url).hostname,
  }, optimizationContext);
}
async function handleCustomDomain(request, url, ctx, env, hostname, optimizationContext) {
  // Route all HTML-like requests for custom domains to store.html (store-only SPA)
  const upstream = new URL(PAGES_ORIGIN);
  const isHtmlLike = isHtmlNavigationRequest(request, url.pathname);
  upstream.pathname = isHtmlLike ? '/store.html' : url.pathname;
  upstream.search = url.search;
  
  // مبسط للنطاقات المخصصة - تقليل الـ headers للحد الأدنى
  return proxyTurboSimple(upstream.toString(), request, ctx, {
    "X-Domain-Type": "custom",
    "X-Forwarded-Host": hostname,
  }, optimizationContext);
}

/* =========================
   Turbo Proxy Core
   ========================= */

// دالة مبسطة للنطاقات المخصصة فقط - بدون تعقيدات HTMLRewriter
async function proxyTurboSimple(pagesUrl, inboundRequest, ctx, extraHeaders = {}, optimizationContext = {}) {
  const method = inboundRequest.method || "GET";
  const urlObj = new URL(pagesUrl);
  const { isWebView = false } = optimizationContext;

  // ── STATIC ASSETS: مخزن مؤقت بسيط ──────────────────────────────
  const isAsset = method === "GET" && ASSET_REGEX.test(urlObj.pathname);
  if (isAsset) {
    return serveAssetWithEdgeCache(urlObj, inboundRequest, ctx, extraHeaders, optimizationContext);
  }

  // ── HTML/JSON/API: جلب مباشر بدون تعديلات معقدة ─────────────────────────
  let response;
  try {
    response = await fetch(urlObj.toString(), {
      method,
      headers: stripAndForwardHeaders(inboundRequest.headers),
      cf: {
        cacheEverything: false,
        minify: { 
          html: false, // تعطيل minify للنطاقات المخصصة
          css: false, 
          javascript: false 
        },
        polish: "off", // تعطيل polish للنطاقات المخصصة
        mirage: false, // تعطيل mirage للنطاقات المخصصة
        scrapeShield: false,
      },
      redirect: "follow",
    });
  } catch (e) {
    return new Response("Fetch Failed for Custom Domain", { status: 502 });
  }

  if (!response) return new Response("No response", { status: 502 });

  if (!response.ok && response.status >= 500) {
    return new Response(`Error from Pages: ${response.status}`, { status: response.status });
  }

  const headers = new Headers(response.headers);

  // ✅ Headers أساسية ومبسطة للنطاقات المخصصة
  const accept = inboundRequest.headers.get("accept") || "";
  const isLikelyHTML = accept.includes("text/html") || urlObj.pathname.endsWith(".html");

  if (isLikelyHTML) {
    headers.set("Cache-Control", "public, max-age=60, s-maxage=120"); // كاش بسيط
  } else if (urlObj.pathname.endsWith(".json") || urlObj.pathname.includes("/rpc/")) {
    headers.set("Cache-Control", "public, max-age=300, s-maxage=600"); // كاش API بسيط
  }

  // Headers أمان أساسية فقط
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // إضافة CSP محسن للنطاقات المخصصة يدعم Cloudflare Insights
  if (isLikelyHTML) {
    const cspPolicy = `default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://analytics.tiktok.com https://js.sentry-cdn.com https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://analytics.tiktok.com https://js.sentry-cdn.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob: https://*.cloudflareinsights.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.yalidine.app https://api.cloudflare.com https://dns.google.com https://cloudflareinsights.com https://*.cloudflareinsights.com https://analytics.tiktok.com https://openrouter.ai https://api.zrexpress.dz https://api.ecotrack.dz https://*.ecotrack.dz https://www.google-analytics.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://connect.facebook.net https://www.facebook.com; frame-src 'self' https://www.facebook.com https://connect.facebook.net https://www.instagram.com https://*.instagram.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://www.instagram.com https://*.instagram.com https://www.facebook.com https://*.facebook.com; upgrade-insecure-requests`;
    headers.set("Content-Security-Policy", cspPolicy);
  }

  // Vary للضغط
  ensureVaryAcceptEncoding(headers);

  // إضافة headers إضافية مبسطة
  for (const [k, v] of Object.entries(extraHeaders || {})) {
    if (v != null) headers.set(k, String(v));
  }

  return new Response(response.body, { status: response.status, headers });
}

async function proxyTurbo(pagesUrl, inboundRequest, ctx, extraHeaders = {}, optimizationContext = {}) {
  const method = inboundRequest.method || "GET";
  const urlObj = new URL(pagesUrl);
  const { isWebView = false } = optimizationContext;

  // ── STATIC ASSETS: optimized caching based on context ──────────────────────────────
  const isAsset = method === "GET" && ASSET_REGEX.test(urlObj.pathname);
  if (isAsset) {
    return serveAssetWithEdgeCache(urlObj, inboundRequest, ctx, extraHeaders, optimizationContext);
  }

  // ── HTML/JSON/API: smart cache + Early Hints ─────────────────────────
  let response;
  try {
    response = await fetch(urlObj.toString(), {
      method,
      headers: stripAndForwardHeaders(inboundRequest.headers),
      cf: {
        cacheEverything: false,
        minify: { 
          html: true, 
          css: true, 
          javascript: true 
        },
        polish: isWebView ? "lossy" : "lossless", // More aggressive compression for WebView
        mirage: isWebView, // Enable Mirage for WebView to reduce data usage
        scrapeShield: false, // Disable for better performance
      },
      redirect: "follow",
    });
  } catch (e) {
    // Try to return cached version on fetch failure
    const cache = caches.default;
    const cacheKey = new Request(urlObj.toString(), { method });
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }
    return new Response("Upstream Fetch Failed - No cache available", { status: 502 });
  }

  if (!response) return new Response("No response", { status: 502 });

  if (!response.ok && response.status >= 500) {
    return new Response(`Error from Pages: ${response.status}`, { status: response.status });
  }

  const accept = inboundRequest.headers.get("accept") || "";
  const isLikelyHTML = accept.includes("text/html") || urlObj.pathname.endsWith(".html");

  const linkHints = new Set();

  // ✅ Enhanced preconnect for WebView and regular browsers
  for (const origin of THIRD_PARTY_ORIGINS) {
    linkHints.add(`<${origin}>; rel=preconnect; crossorigin`);
    if (isWebView) {
      // Add DNS prefetch for faster connection in WebView
      linkHints.add(`<${origin}>; rel=dns-prefetch`);
    }
  }

  // ✅ Preconnect to Google Fonts and common CDNs for WebView
  if (isWebView) {
    const commonCdns = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com',
      'https://cdn.jsdelivr.net'
    ];
    for (const cdn of commonCdns) {
      linkHints.add(`<${cdn}>; rel=preconnect; crossorigin`);
    }
  }

  // ✅ Enhanced LCP optimization: inject fetchpriority + preload for critical images
  if (isLikelyHTML && response.ok) {
    let mainAssets = [];
    const maxHints = isWebView ? MAX_LINK_HINTS + 4 : MAX_LINK_HINTS; // More preloads for WebView
    
    const rewriter = new HTMLRewriter()
      // Enhanced image optimization for WebView
      .on("img", {
        element(el) {
          let src = el.getAttribute("src") || "";
          const cls = el.getAttribute("class") || "";
          const sizes = el.getAttribute("sizes") || "";
          const alt = el.getAttribute("alt") || "";

          // Optimize images from Supabase by routing through Cloudflare Image Resizer
          if (src.includes("wrnssatuvmumsczyldth.supabase.co")) {
            try {
              // Extract width from sizes attribute or use default
              let width = 800; // default width
              if (sizes) {
                const sizeMatch = sizes.match(/(\d+)px/);
                if (sizeMatch) {
                  width = parseInt(sizeMatch[1]);
                }
              }

              // Build Cloudflare Image Resizer URL
              const imageResizerUrl = `/img?url=${encodeURIComponent(src)}&w=${width}&q=75&f=auto`;
              el.setAttribute("src", imageResizerUrl);

              // Update src for preload hints too
              src = imageResizerUrl;
            } catch (e) {
              console.warn('Failed to optimize image URL:', e);
            }
          }

          // More aggressive optimization for WebView
          const isCritical = cls.includes("optimized-image") || 
                           sizes.includes("512px") || 
                           src.includes("supabase.co") ||
                           (isWebView && (cls.includes("hero") || cls.includes("banner") || alt.includes("logo")));

          if (isCritical) {
            el.setAttribute("fetchpriority", "high");
            el.setAttribute("loading", "eager");
            
            // Add decoding="sync" for critical images in WebView
            if (isWebView) {
              el.setAttribute("decoding", "sync");
            }

            // تحسين preload للصور - فقط في النطاقات الفرعية وليس المخصصة
            const hostname = new URL(inboundRequest.url).hostname;
            const isCustomDomain = !hostname.endsWith('.stockiha.com') && hostname !== 'stockiha.com';
            
            // تجنب preload في النطاقات المخصصة لمنع تحذيرات الموارد غير المستخدمة
            if (!isCustomDomain && mainAssets.length < 1 && (cls.includes("hero") || cls.includes("banner") || alt.includes("logo"))) {
              const priority = isWebView ? "high" : "high";
              linkHints.add(`<${src}>; rel=preload; as=image; fetchpriority=${priority}`);
              mainAssets.push(src);
            }
          } else {
            if (!el.hasAttribute("loading")) {
              el.setAttribute("loading", "lazy");
            }
            // Use async decoding for non-critical images
            if (isWebView) {
              el.setAttribute("decoding", "async");
            }
          }
        },
      })
      // ✅ Enhanced script preloading with WebView optimizations
      .on("script[src]", {
        element(el) {
          const src = el.getAttribute("src");
          const type = el.getAttribute("type") || "";
          // Removed cache busting injection to avoid cache issues
          
          // تحسين preload للسكريبتات - فقط في النطاقات الفرعية
          const hostname = new URL(inboundRequest.url).hostname;
          const isCustomDomain = !hostname.endsWith('.stockiha.com') && hostname !== 'stockiha.com';
          
          if (!isCustomDomain && src && mainAssets.length < 1) {
            // Only preload the most critical script (main app script)
            if ((src.includes('store-') || src.includes('main') || src.includes('app')) &&
                !src.includes('chunk') && !src.includes('vendor')) {
              linkHints.add(`<${src}>; rel=preload; as=script; fetchpriority=high`);
              el.setAttribute("fetchpriority", "high");
              mainAssets.push(src);
            }
          }
          
          // Add async loading for non-critical scripts in WebView
          if (isWebView && !el.hasAttribute("async") && !el.hasAttribute("defer") && !type.includes("module")) {
            if (!src.includes('critical') && !src.includes('inline')) {
              el.setAttribute("defer", "");
            }
          }
        },
      })
      // ✅ Enhanced stylesheet preloading with WebView optimizations
      .on('link[rel="stylesheet"]', {
        element(el) {
          const href = el.getAttribute("href");
          const media = el.getAttribute("media") || "";

          // تحسين preload للـ CSS - فقط في النطاقات الفرعية
          const hostname = new URL(inboundRequest.url).hostname;
          const isCustomDomain = !hostname.endsWith('.stockiha.com') && hostname !== 'stockiha.com';
          
          if (!isCustomDomain && href && mainAssets.length < 1) {
            // Only preload the most critical CSS
            if (href.includes('main') || href.includes('app') || href.includes('critical') || href.includes('index')) {
              linkHints.add(`<${href}>; rel=preload; as=style; fetchpriority=high`);
              mainAssets.push(href);
            }
          }

          // Optimize CSS loading for WebView
          if (isWebView && media !== "print") {
            el.setAttribute("fetchpriority", href.includes('critical') ? "high" : "low");
          }
        },
      })
      // Add font-display: swap for better font loading performance
      .on('link[rel="stylesheet"][href*="fonts.googleapis.com"]', {
        element(el) {
          const href = el.getAttribute("href");
          if (href && href.includes('fonts.googleapis.com')) {
            try {
              // Add font-display=swap parameter to Google Fonts URLs
              const url = new URL(href);
              if (!url.searchParams.has('display')) {
                url.searchParams.set('display', 'swap');
                el.setAttribute("href", url.toString());
              }
            } catch (e) {
              console.warn('Failed to add font-display to Google Fonts URL:', e);
            }
          }
        },
      })
      // ✅ Add viewport meta for WebView optimization and performance
      .on("head", {
        element(el) {
          if (isWebView) {
            // Inject WebView optimized viewport and meta tags
            el.append(`
              <meta name="format-detection" content="telephone=no">
              <meta name="mobile-web-app-capable" content="yes">
              <meta name="apple-mobile-web-app-capable" content="yes">
              <meta name="apple-mobile-web-app-status-bar-style" content="default">
              <meta name="theme-color" content="#ffffff">
              <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
            `, { html: true });
          }

          // ✅ Open Graph optimization for product pages
          if (urlObj.pathname.includes('product-purchase-max-v3')) {
            try {
              // Extract organizationId and productSlug from URL
              const pathParts = urlObj.pathname.split('/');
              const productSlug = pathParts[pathParts.length - 1];
              const organizationId = extractOrganizationId(urlObj.hostname);

              if (organizationId && productSlug) {
                // Add Open Graph meta tags with fallback values
                // These will be replaced by React Helmet when the page loads
                el.append(`
                  <meta property="og:type" content="product" />
                  <meta property="og:site_name" content="متجر إلكتروني" />
                  <meta name="twitter:card" content="summary_large_image" />
                  <meta name="robots" content="index, follow" />
                `, { html: true });

                // Add script to fetch and update OG data dynamically
                const script = `
                  <script>
                    (function() {
                      try {
                        // Extract organizationId from URL or window object
                        let organizationId = null;
                        const hostname = window.location.hostname;

                        // Try to get from subdomain
                        if (hostname.endsWith('.stockiha.com')) {
                          const parts = hostname.split('.');
                          if (parts.length > 2 && parts[0] !== 'www') {
                            organizationId = parts[0];
                          }
                        }

                        // Try to get from window object (set by the app)
                        if (!organizationId && window.__TENANT_CONTEXT_ORG__) {
                          organizationId = window.__TENANT_CONTEXT_ORG__.id;
                        }

                        // Extract productSlug from URL
                        const pathParts = window.location.pathname.split('/');
                        const productSlug = pathParts[pathParts.length - 1];

                        if (organizationId && productSlug) {
                          const ogApiUrl = '/api/product-og?organizationId=' + organizationId + '&productSlug=' + productSlug;
                          fetch(ogApiUrl, {
                            method: 'GET',
                            headers: { 'Accept': 'application/json' }
                          })
                          .then(function(response) {
                            return response.ok ? response.json() : null;
                          })
                          .then(function(data) {
                            if (data) {
                              updateMetaTags(data);
                            }
                          })
                          .catch(function(err) {
                            console.warn('Failed to fetch OG data:', err);
                          });
                        }

                        function updateMetaTags(ogData) {
                          const head = document.head;
                          if (!head) return;

                          // Helper to update or create meta tag
                          function setMetaTag(name, content, isProperty) {
                            const selector = isProperty ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]';
                            let meta = head.querySelector(selector);
                            if (!meta) {
                              meta = document.createElement('meta');
                              if (isProperty) meta.setAttribute('property', name);
                              else meta.setAttribute('name', name);
                              head.appendChild(meta);
                            }
                            meta.setAttribute('content', content);
                          }

                          // Update title
                          if (ogData.title) {
                            document.title = ogData.title;
                          }

                          // Update Open Graph tags
                          setMetaTag('og:title', ogData.title, true);
                          setMetaTag('og:description', ogData.description, true);
                          setMetaTag('og:image', ogData.image, true);
                          setMetaTag('og:url', ogData.url, true);
                          setMetaTag('og:site_name', ogData.site_name, true);

                          // Update Twitter tags
                          setMetaTag('twitter:title', ogData.title);
                          setMetaTag('twitter:description', ogData.description);
                          setMetaTag('twitter:image', ogData.image);

                          // Update product specific tags
                          if (ogData.price) {
                            setMetaTag('product:price:amount', ogData.price.amount, true);
                            setMetaTag('product:price:currency', ogData.price.currency, true);
                          }
                          if (ogData.availability) {
                            setMetaTag('product:availability', ogData.availability, true);
                          }

                          console.log('✅ [OG] Meta tags updated for social sharing');
                        }
                      } catch (e) {
                        console.warn('Error updating OG tags:', e);
                      }
                    })();
                  </script>
                `;
                el.append(script, { html: true });
              }
            } catch (e) {
              console.warn('Error in OG meta injection:', e);
            }
          }
          
          // Performance optimization meta tags for all browsers
          el.append(`
            <meta name="referrer" content="strict-origin-when-cross-origin">
            <meta http-equiv="x-dns-prefetch-control" content="on">
            <link rel="dns-prefetch" href="//wrnssatuvmumsczyldth.supabase.co">
            <link rel="preconnect" href="https://wrnssatuvmumsczyldth.supabase.co" crossorigin>
            <script>
              // Optimize React rendering and prevent excessive re-renders
              window.__REACT_PERFORMANCE_HINTS__ = {
                enableConcurrentFeatures: true,
                batchUnstableRenders: true,
                stabilizeIdentities: true,
                deferNonCriticalWork: true
              };
              
              // API call deduplication
              window.__API_CACHE__ = new Map();
              window.__ACTIVE_REQUESTS__ = new Map();
              
              // Component render optimization
              window.__COMPONENT_MEMO__ = {
                ProductPurchasePageV3Container: true,
                StoreNavbar: true,
                AppWrapper: true,
                TenantProvider: true
              };
              
              // Service Worker management for better performance
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  // Clear any problematic service workers
                  for(let registration of registrations) {
                    if (registration.scope.includes('stockiha') || registration.active) {
                      registration.update().catch(() => {
                        // Silently handle update failures
                      });
                    }
                  }
                });
              }
              
              // Console control: keep console enabled in production and log status
              (function(){
                try {
                  var host = window.location.hostname || '';
                  var isLocal = host === 'localhost' || host.startsWith('127.') || host.endsWith('.local');
                  var willDisableConsole = false; // keep logs enabled
                  try { console.log('🔍 [Worker] Console Status:', {host: host, isLocal: isLocal, isDev: false, willDisableConsole: willDisableConsole}); } catch (e) {}
                } catch (e) {}
              })();
            </script>
          `, { html: true });
        },
      })
      // ✅ Optimize JavaScript loading and reduce re-renders
      .on("script", {
        element(el) {
          const src = el.getAttribute("src") || "";
          const content = el.getAttribute("data-content") || "";
          
          // Prevent problematic re-render patterns
          if (content.includes("ProductPurchasePageV3Container") || 
              content.includes("useUnifiedData") ||
              src.includes("ProductPurchasePageV3Container")) {
            
            // Add performance attributes
            el.setAttribute("data-performance", "critical");
            if (isWebView) {
              el.setAttribute("data-webview-optimized", "true");
            }
          }
          
          // Optimize component loading patterns
          if (src.includes("StoreNavbar") || src.includes("AppWrapper")) {
            el.setAttribute("loading", "lazy");
            if (!el.hasAttribute("defer") && !src.includes("critical")) {
              el.setAttribute("defer", "");
            }
          }
        },
      });

    response = rewriter.transform(response);
  }

  const headers = new Headers(response.headers);

  if (linkHints.size) {
    const existing = headers.get("Link");
    const combined = [...linkHints].join(", ");
    headers.set("Link", existing ? `${existing}, ${combined}` : combined);
  }

  // ✅ Enhanced caching optimized for WebView and regular browsers
  if (isLikelyHTML) {
    headers.set("Cache-Control", getOptimizedCacheSettings(isWebView, 'html', urlObj.pathname));
    applyExpires(headers, getBrowserTTLSeconds(isWebView, 'html', urlObj.pathname));
  } else if (urlObj.pathname.endsWith(".json") || urlObj.pathname.includes("/rpc/")) {
    headers.set("Cache-Control", getOptimizedCacheSettings(isWebView, 'api', urlObj.pathname));
    applyExpires(headers, getBrowserTTLSeconds(isWebView, 'api', urlObj.pathname));
  }

  // ✅ Apply performance headers for problematic pages
  const perfHeaders = getPerformanceHeaders(urlObj.pathname, isWebView);
  for (const [key, value] of Object.entries(perfHeaders)) {
    headers.set(key, value);
  }

  // ✅ WebView specific headers for better performance
  if (isWebView) {
    headers.set("X-WebView-Optimized", "true");
    // اترك Content-Encoding للتفاوض الآلي مع Cloudflare/المتصفح
    headers.set("Service-Worker-Allowed", "/");
  }

  // Always ensure proper Vary for compression variance
  ensureVaryAcceptEncoding(headers);

  // ✅ Enhanced headers for specific problematic endpoints
  if (urlObj.pathname.includes('product-purchase-max-v3')) {
    headers.set("X-Page-Type", "product-heavy");
    headers.set("X-Cache-Strategy", "component-level");
    // Prevent multiple simultaneous API calls
    headers.set("X-API-Dedupe", "enabled");
  }

  applySecurityHeaders(headers, isWebView);
  fixMime(headers, urlObj.pathname);

  for (const [k, v] of Object.entries(extraHeaders || {})) {
    if (v != null) headers.set(k, String(v));
  }

  // Return response with headers (compression handled by Cloudflare Brotli)
  const responseWithHeaders = new Response(response.body, { status: response.status, headers });
  return responseWithHeaders;
}

/* =========================
   Static assets edge cache
   ========================= */
async function serveAssetWithEdgeCache(urlObj, inboundRequest, ctx, extraHeaders, optimizationContext = {}) {
  const { isWebView = false } = optimizationContext;
  const cache = caches.default;
  const cacheKey = new Request(urlObj.toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const h = new Headers(cached.headers);
    // If cached entry is an error, don't stamp as asset and force HTML content-type to avoid JS parse errors
    if (cached.status >= 400) {
      h.set('Content-Type', 'text/html; charset=UTF-8');
      ensureVaryAcceptEncoding(h);
      for (const [k, v] of Object.entries(extraHeaders || {})) if (v != null) h.set(k, String(v));
      const resp = new Response(cached.body, { status: cached.status, headers: h });
      return resp;
    }
    stampAssetHeaders(h, urlObj.pathname, isWebView);
    for (const [k, v] of Object.entries(extraHeaders || {})) if (v != null) h.set(k, String(v));
    const resp = new Response(cached.body, { status: cached.status, headers: h });
    return resp;
  }

  let resp;
  try {
    resp = await fetch(urlObj.toString(), {
      headers: stripAndForwardHeaders(inboundRequest.headers),
      cf: {
        cacheEverything: true,
        // Avoid Cloudflare JS minify on already-minified modern bundles
        minify: { css: true, javascript: false },
        polish: isWebView ? "lossy" : "lossless", // More aggressive compression for WebView
        mirage: isWebView, // Enable for WebView to reduce data usage
      },
    });
  } catch (e) {
    return new Response("Asset fetch failed", { status: 502 });
  }

  const headers = new Headers(resp.headers);
  // If upstream responded with an error or HTML, don't stamp asset headers
  const upstreamCT = headers.get('Content-Type') || '';
  if (resp.status >= 400 || /text\/html/i.test(upstreamCT)) {
    ensureVaryAcceptEncoding(headers);
    for (const [k, v] of Object.entries(extraHeaders || {})) if (v != null) headers.set(k, String(v));
    const out = new Response(resp.body, { status: resp.status, headers });
    // Do not cache error/HTML responses for asset URLs in edge cache
    return out;
  }

  stampAssetHeaders(headers, urlObj.pathname, isWebView);
  for (const [k, v] of Object.entries(extraHeaders || {})) if (v != null) headers.set(k, String(v));

  const out = new Response(resp.body, { status: resp.status, headers });
  
  // Cache and return asset (compression handled by Cloudflare Brotli)
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

/* =========================
   🚀 API Proxy Handler for Supabase Caching
   ========================= */
async function handleApiProxy(request, url, ctx, optimizationContext = {}) {
  const { isWebView = false } = optimizationContext;
  
  try {
    // Extract the real Supabase URL from the proxy path
    const proxyPath = url.pathname.replace('/api-proxy/', '');
    const supabaseUrl = `https://wrnssatuvmumsczyldth.supabase.co/${proxyPath}${url.search}`;
    
    // Create cache key based on URL only (exclude sensitive headers to prevent fragmentation)
    const cacheKey = new Request(supabaseUrl, {
      method: request.method,
      headers: {
        'content-type': request.headers.get('content-type') || ''
      }
    });
    
    const cache = caches.default;
    
    // Check cache first for GET requests
    if (request.method === 'GET') {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set('X-Cache', 'HIT');
        headers.set('X-Proxy-Cache', 'cloudflare');
        return new Response(cached.body, { 
          status: cached.status, 
          headers 
        });
      }
    }
    
    // Forward request to Supabase with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const supabaseResponse = await fetch(supabaseUrl, {
      method: request.method,
      headers: stripAndForwardHeaders(request.headers), // Filter sensitive headers
      body: request.method !== 'GET' ? request.body : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    const headers = new Headers(supabaseResponse.headers);
    
    // Apply aggressive caching for API responses
    if (supabaseResponse.ok) {
      const pathname = url.pathname;
      headers.set('Cache-Control', getOptimizedCacheSettings(isWebView, 'api', pathname));
      applyExpires(headers, getBrowserTTLSeconds(isWebView, 'api', pathname));
      headers.set('X-Cache', 'MISS');
      headers.set('X-Proxy-Cache', 'cloudflare');
      ensureVaryAcceptEncoding(headers);
      
      // Cache successful GET responses
      if (request.method === 'GET') {
        const responseToClient = new Response(supabaseResponse.body, {
          status: supabaseResponse.status,
          headers
        });
        // Put variant in cache; rely on CDN compression
        ctx.waitUntil(cache.put(cacheKey, responseToClient.clone()));
        return responseToClient;
      }
    }
    
    const passthrough = new Response(supabaseResponse.body, {
      status: supabaseResponse.status,
      headers
    });
    ensureVaryAcceptEncoding(headers);
    return passthrough;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return new Response('API Proxy Timeout: Request took too long', { status: 504 });
    }
    return new Response('API Proxy Error: ' + error.message, { status: 502 });
  }
}

/* =========================
   🖼️ Cloudflare Image Resizer Handler
   ========================= */
async function handleImageResize(request, url, ctx) {
  try {
    const params = url.searchParams;
    const src = params.get("url");
    if (!src) {
      return new Response("Missing url parameter", { status: 400 });
    }

    // ✅ السماح فقط بمصادر محددة
    let origin;
    try { origin = new URL(src).origin; } catch {}
    const allowedHosts = [
      "https://wrnssatuvmumsczyldth.supabase.co",
      "https://images.unsplash.com"
    ];
    if (!origin || !allowedHosts.some((h) => origin.startsWith(h))) {
      return new Response("Origin not allowed", { status: 403 });
    }

    const width = clampInt(params.get("w") || params.get("width"), 16, 2000) || undefined;
    const height = clampInt(params.get("h") || params.get("height"), 16, 2000) || undefined;
    const quality = clampInt(params.get("q") || params.get("quality"), 10, 100) || 75;
    const fit = params.get("fit") || "cover";
    const format = params.get("f") || "auto";
    const dpr = clampInt(params.get("dpr"), 1, 3) || 1;

    const cache = caches.default;
    const cacheKey = new Request(
      `https://edge-cache.invalid/img?url=${encodeURIComponent(src)}&w=${width||""}&h=${height||""}&q=${quality}&fit=${fit}&f=${format}&dpr=${dpr}`,
      request
    );

    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const imageRequest = new Request(src, request);
    const cfImage = {
      dpr,
      quality,
      fit,
      format,
      ...(width ? { width: Number(width) } : {}),
      ...(height ? { height: Number(height) } : {}),
    };

    const resp = await fetch(imageRequest, { cf: { image: cfImage } });
    const headers = new Headers(resp.headers);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    applyExpires(headers, 86400);
    headers.set("X-Image-CDN", "cloudflare-workers");
    // Include Accept-Encoding consistently
    const varyParts = ["Accept", "DPR", "Width", "Viewport-Width", "Accept-Encoding"];
    const existingVary = headers.get("Vary");
    headers.set("Vary", existingVary ? `${existingVary}, Accept-Encoding` : varyParts.join(", "));

    const body = await resp.arrayBuffer();
    const optimized = new Response(body, { status: resp.status, headers });
    ctx.waitUntil(cache.put(cacheKey, optimized.clone()));

    return optimized;
  } catch (e) {
    return new Response("Image resize error: " + e.message, { status: 500 });
  }
}

function clampInt(value, min, max) {
  if (value == null) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

/* =========================
   Headers / Utils
   ========================= */
function stripAndForwardHeaders(inHeaders) {
  const h = new Headers(inHeaders);
  const banned = [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "host",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "x-forwarded-proto",
    "x-real-ip",
  ];
  for (const k of banned) h.delete(k);
  return h;
}

function applySecurityHeaders(h, isWebView = false) {
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Use CSP frame-ancestors instead of X-Frame-Options for better security
  if (isWebView) {
    // More relaxed frame ancestors for WebView embedding
    h.set("Content-Security-Policy", "frame-ancestors 'self' *.stockiha.com;");
    // Simplified permissions policy for WebView
    h.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  } else {
    h.set("Content-Security-Policy", "frame-ancestors 'none';");
    h.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
  }

  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

function stampAssetHeaders(h, pathname, isWebView = false) {
  // Use optimized cache settings with pathname context
  h.set("Cache-Control", getOptimizedCacheSettings(isWebView, 'asset', pathname));
  applyExpires(h, getBrowserTTLSeconds(isWebView, 'asset', pathname));
  applySecurityHeaders(h, isWebView);
  fixMime(h, pathname);

  // Enhanced preload headers for WebView
  const existing = h.get("Link");
  const as = guessAs(pathname);
  if (as) {
    const priority = (isWebView && (as === 'style' || as === 'script')) ? 'high' : 'auto';
    const preload = `</${trimLeadingSlash(pathname)}>; rel=preload; as=${as}; fetchpriority=${priority}`;
    h.set("Link", existing ? `${existing}, ${preload}` : preload);
  }

  // Add WebView optimization headers for assets
  if (isWebView) {
    h.set("X-WebView-Asset", "true");
  }

  // Always ensure Accept-Encoding variance for assets
  ensureVaryAcceptEncoding(h);

  // Special handling for problematic assets
  if (pathname.includes('ProductPurchasePageV3Container') || 
      pathname.includes('StoreNavbar') ||
      pathname.includes('AppWrapper')) {
    h.set("X-Component-Asset", "heavy");
    h.set("X-Priority", "high");
  }
}

function fixMime(h, pathname) {
  const existing = h.get('Content-Type');
  // Respect upstream content-type if present and not octet-stream
  if (existing && !/^application\/octet-stream/i.test(existing)) return;
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) h.set("Content-Type", "application/javascript");
  else if (lower.endsWith(".css")) h.set("Content-Type", "text/css");
  else if (lower.endsWith(".json") || lower.endsWith(".map")) h.set("Content-Type", "application/json");
  else if (lower.endsWith(".wasm")) h.set("Content-Type", "application/wasm");
  else if (lower.endsWith(".svg")) h.set("Content-Type", "image/svg+xml");
  else if (lower.endsWith(".png")) h.set("Content-Type", "image/png");
  else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) h.set("Content-Type", "image/jpeg");
  else if (lower.endsWith(".webp")) h.set("Content-Type", "image/webp");
  else if (lower.endsWith(".gif")) h.set("Content-Type", "image/gif");
  else if (lower.endsWith(".ico")) h.set("Content-Type", "image/x-icon");
  else if (lower.endsWith(".woff")) h.set("Content-Type", "font/woff");
  else if (lower.endsWith(".woff2")) h.set("Content-Type", "font/woff2");
  else if (lower.endsWith(".ttf")) h.set("Content-Type", "font/ttf");
  else if (lower.endsWith(".otf")) h.set("Content-Type", "font/otf");
}

function guessAs(pathname) {
  const p = pathname.toLowerCase();
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "script";
  if (p.endsWith(".css")) return "style";
  if (p.endsWith(".png") || p.endsWith(".jpg") || p.endsWith(".jpeg") || p.endsWith(".webp") || p.endsWith(".gif"))
    return "image";
  if (p.endsWith(".woff") || p.endsWith(".woff2") || p.endsWith(".ttf") || p.endsWith(".otf")) return "font";
  if (p.endsWith(".svg")) return "image";
  if (p.endsWith(".wasm")) return "fetch";
  return null;
}

function trimLeadingSlash(p) {
  return p.startsWith("/") ? p.slice(1) : p;
}
