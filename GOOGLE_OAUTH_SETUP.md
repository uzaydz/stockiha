# إعداد Google OAuth للمصادقة الثنائية

## 📋 المتطلبات الأساسية

### 1. إنشاء مشروع Google Cloud
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل Google+ API و Google Identity API

### 2. إعداد OAuth 2.0 Credentials
1. اذهب إلى **APIs & Services > Credentials**
2. انقر على **Create Credentials > OAuth 2.0 Client IDs**
3. اختر **Web application**
4. أضف الـ URIs التالية:

#### Authorized JavaScript origins:
```
http://localhost:5173
https://localhost:5173
https://stockiha.com
https://www.stockiha.com
https://ktobi.online
https://www.ktobi.online
https://bazaar.com
https://www.bazaar.com
https://bazaar.dev
https://www.bazaar.dev
```

#### Authorized redirect URIs:
```
http://localhost:54321/auth/v1/callback
https://your-supabase-project.supabase.co/auth/v1/callback
https://stockiha.com/auth/callback
https://www.stockiha.com/auth/callback
https://ktobi.online/auth/callback
https://bazaar.com/auth/callback
https://bazaar.dev/auth/callback
```

### 3. إعداد Consent Screen
1. اذهب إلى **APIs & Services > OAuth consent screen**
2. اختر **External** للمستخدمين العامين
3. املأ المعلومات المطلوبة:
   - **App name**: Bazaar Console
   - **User support email**: support@stockiha.com
   - **Developer contact**: your-email@stockiha.com
   - **App domain**: stockiha.com
   - **Privacy policy**: https://stockiha.com/privacy
   - **Terms of service**: https://stockiha.com/terms

4. أضف الـ Scopes التالية:
   - `openid`
   - `email`
   - `profile`

## 🔧 إعداد متغيرات البيئة

### للتطوير المحلي (.env.local):
```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase Settings (إذا لم تكن موجودة)
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Domain Settings
VITE_APP_DOMAIN="stockiha.com"
VITE_SUPPORTED_DOMAINS="stockiha.com,ktobi.online,bazaar.com,bazaar.dev"
```

### للإنتاج (Supabase Dashboard):
1. اذهب إلى Supabase Dashboard > Settings > Auth
2. أضف Google OAuth Provider:
   - **Client ID**: من Google Cloud Console
   - **Client Secret**: من Google Cloud Console
   - **Redirect URL**: `https://your-project.supabase.co/auth/v1/callback`

## 🌐 إعداد النطاقات الفرعية

### إعدادات DNS للنطاقات الفرعية:
```
# لكل نطاق فرعي للعملاء
*.stockiha.com -> CNAME -> your-app-domain
*.ktobi.online -> CNAME -> your-app-domain
*.bazaar.com -> CNAME -> your-app-domain
*.bazaar.dev -> CNAME -> your-app-domain
```

### إعدادات SSL:
- استخدم Cloudflare أو Let's Encrypt للحصول على شهادات SSL wildcard
- تأكد من تفعيل HTTPS لجميع النطاقات

## 🔐 إعدادات الأمان المتقدمة

### 1. تقييد النطاقات:
```javascript
// في ملف الإعدادات
const ALLOWED_DOMAINS = [
  'stockiha.com',
  'ktobi.online', 
  'bazaar.com',
  'bazaar.dev'
];
```

### 2. التحقق من النطاق الفرعي:
```javascript
// التحقق من صحة النطاق الفرعي
function validateSubdomain(subdomain, domain) {
  const allowedPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  return allowedPattern.test(subdomain) && ALLOWED_DOMAINS.includes(domain);
}
```

## 🧪 اختبار الإعداد

### 1. اختبار محلي:
```bash
# تشغيل Supabase محلياً
supabase start

# تشغيل التطبيق
npm run dev
```

### 2. اختبار Google OAuth:
1. اذهب إلى صفحة تسجيل الدخول
2. انقر على "تسجيل الدخول بـ Google"
3. تأكد من إعادة التوجيه الصحيحة
4. تحقق من إنشاء المستخدم في قاعدة البيانات

## 🚨 استكشاف الأخطاء

### أخطاء شائعة:
1. **redirect_uri_mismatch**: تأكد من إضافة جميع URIs في Google Console
2. **invalid_client**: تحقق من Client ID و Secret
3. **access_denied**: تحقق من إعدادات Consent Screen

### سجلات التشخيص:
```javascript
// إضافة سجلات للتشخيص
console.log('OAuth Redirect URI:', window.location.origin + '/auth/callback');
console.log('Current Domain:', window.location.hostname);
```

## 📝 ملاحظات مهمة

1. **النطاقات الفرعية**: كل عميل سيحصل على نطاق فرعي مثل `client1.stockiha.com`
2. **الأمان**: استخدم HTTPS دائماً في الإنتاج
3. **التخزين المؤقت**: فعّل CDN للأداء الأفضل
4. **المراقبة**: راقب استخدام Google OAuth API لتجنب تجاوز الحدود

## 🔄 التحديثات المستقبلية

عند إضافة نطاقات جديدة:
1. أضف النطاق إلى Google Cloud Console
2. حدث ملف `config.toml`
3. أضف النطاق إلى قائمة النطاقات المدعومة
4. اختبر OAuth مع النطاق الجديد 