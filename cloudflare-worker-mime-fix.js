// Cloudflare Worker لإصلاح مشاكل MIME type
// هذا الملف مخصص للخوادم التي تستخدم Cloudflare Workers

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // تحديد MIME type بناءً على امتداد الملف
  let contentType = 'text/html; charset=utf-8'
  
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) {
    contentType = 'application/javascript; charset=utf-8'
  } else if (url.pathname.endsWith('.css')) {
    contentType = 'text/css; charset=utf-8'
  } else if (url.pathname.endsWith('.json')) {
    contentType = 'application/json; charset=utf-8'
  } else if (url.pathname.endsWith('.woff2')) {
    contentType = 'font/woff2'
  } else if (url.pathname.endsWith('.woff')) {
    contentType = 'font/woff'
  } else if (url.pathname.endsWith('.ttf')) {
    contentType = 'font/ttf'
  } else if (url.pathname.endsWith('.eot')) {
    contentType = 'application/vnd.ms-fontobject'
  } else if (url.pathname.endsWith('.otf')) {
    contentType = 'font/otf'
  } else if (url.pathname.endsWith('.svg')) {
    contentType = 'image/svg+xml'
  } else if (url.pathname.endsWith('.png')) {
    contentType = 'image/png'
  } else if (url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg')) {
    contentType = 'image/jpeg'
  } else if (url.pathname.endsWith('.gif')) {
    contentType = 'image/gif'
  } else if (url.pathname.endsWith('.webp')) {
    contentType = 'image/webp'
  } else if (url.pathname.endsWith('.avif')) {
    contentType = 'image/avif'
  }

  // جلب الملف من الأصل
  const response = await fetch(request)
  
  // إنشاء استجابة جديدة مع الـ headers الصحيحة
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...response.headers,
      'Content-Type': contentType,
      'Cache-Control': getCacheControl(url.pathname),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })

  return newResponse
}

function getCacheControl(pathname) {
  // إعدادات التخزين المؤقت بناءً على نوع الملف
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?|eot|ttf|otf)$/)) {
    return 'public, max-age=31536000, immutable'
  } else if (pathname.match(/\.(html)$/)) {
    return 'public, max-age=300, s-maxage=300'
  } else if (pathname.match(/\.(json)$/)) {
    return 'public, max-age=3600'
  } else {
    return 'public, max-age=300'
  }
}
