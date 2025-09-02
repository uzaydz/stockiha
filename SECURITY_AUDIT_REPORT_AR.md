# تقرير التدقيق الأمني الشامل - مشروع Stokiha
**تاريخ التدقيق:** 15 يناير 2025  
**نطاق التدقيق:** تطبيق SaaS متعدد النطاقات للتجارة الإلكترونية  
**المدقق الأمني:** Senior Security Architect & Application Security Lead  
**نسخة التقرير:** 1.0

---

## الملخص التنفيذي (Executive Summary)

### 🎯 نظرة عامة على المشروع
**Stokiha** (المعروف أيضاً باسم Bazaar Console) هو منصة SaaS شاملة لإدارة الأعمال والتجارة الإلكترونية تدعم النطاقات المتعددة والنطاقات الفرعية. يخدم المشروع العملاء في الجزائر بشكل أساسي مع دعم للغة العربية والفرنسية.

### 🚨 النتائج الرئيسية
- **عدد الثغرات المكتشفة:** 12 ثغرة أمنية
- **المستوى الحرج:** 3 ثغرات
- **المستوى العالي:** 4 ثغرات  
- **المستوى المتوسط:** 3 ثغرات
- **المستوى المنخفض:** 2 ثغرات

### ⚡ التوصيات العاجلة
1. **إصلاح فوري:** تسريب مفاتيح API الحساسة في ملفات البيئة
2. **أولوية عالية:** إصلاح ثغرات CSRF في النماذج الرئيسية
3. **ضروري:** تحديث الاعتماديات الحرجة ذات الثغرات المعروفة

---

## 📋 قائمة الأصول والواجهات (Assets Inventory)

### 🌐 النطاقات والمضيفات
#### النطاقات الرئيسية:
- **stockiha.com** (النطاق الأساسي)
- **ktobi.online** 
- **bazaar.com**
- **bazaar.dev**
- **connect.ktobi.online** (نطاق وسيط للـ CNAME)

#### النطاقات الفرعية:
- دعم نطاقات فرعية ديناميكية لكل عميل
- مثال: `client1.stockiha.com`, `store2.ktobi.online`

### 🗄️ قواعد البيانات والتخزين
#### Supabase PostgreSQL:
- **المضيف:** `wrnssatuvmumsczyldth.supabase.co`
- **الجداول الرئيسية:** 50+ جدول بما في ذلك:
  - `users`, `organizations`, `products`, `orders`
  - `user_security_settings`, `privacy_settings`
  - `shipping_providers`, `yalidine_settings`

#### التخزين السحابي:
- **Supabase Storage:** للصور والملفات
- **Vercel Edge Network:** للأصول الثابتة

### 🔌 واجهات برمجة التطبيقات (APIs)
#### APIs الداخلية:
- `/api/yalidine-fees-proxy` - بروكسي لحساب رسوم الشحن
- `/api/conversion-events/*` - تتبع التحويلات
- `/api/domain-verification/*` - التحقق من النطاقات

#### APIs الخارجية:
- **Yalidine API:** `https://api.yalidine.app/v1/`
- **Ecotrack APIs:** 22 شركة شحن مختلفة
- **Google APIs:** OAuth وخدمات أخرى
- **Facebook/Instagram APIs:** تكامل اجتماعي
- **WhatsApp Business API**

### 🛠️ الخدمات الخارجية
#### خدمات الشحن:
- **Yalidine** (الرئيسي)
- **22 شركة Ecotrack** (Areex, Conexlog, DHD, إلخ)
- **ZR Express**
- **Procolis**

#### خدمات التحليلات:
- **Google Analytics**
- **Facebook Pixel**
- **TikTok Pixel**

#### خدمات السحابة:
- **Vercel** (الاستضافة والنشر)
- **Supabase** (قاعدة البيانات والمصادقة)
- **Cloudflare** (محتمل لـ CDN)

---

## 🎯 نموذج التهديد (Threat Model)

### 📊 تحليل STRIDE

#### S - Spoofing (انتحال الهوية)
**التهديدات المحتملة:**
- انتحال هوية المستخدمين عبر ثغرات المصادقة
- تجاوز نظام النطاقات الفرعية
- **التأثير:** عالي - وصول غير مصرح به للبيانات

#### T - Tampering (تلاعب بالبيانات)  
**التهديدات المحتملة:**
- تعديل الطلبات والأسعار عبر CSRF
- تلاعب بإعدادات الشحن
- **التأثير:** عالي - خسائر مالية مباشرة

#### R - Repudiation (إنكار العمليات)
**التهديدات المحتملة:**
- عدم وجود تدقيق شامل للعمليات المالية
- نقص في السجلات الأمنية
- **التأثير:** متوسط - صعوبة في تتبع العمليات

#### I - Information Disclosure (كشف المعلومات)
**التهديدات المحتملة:**
- تسريب مفاتيح API في ملفات البيئة
- كشف بيانات العملاء عبر ثغرات RLS
- **التأثير:** حرج - انتهاك الخصوصية

#### D - Denial of Service (حرمان من الخدمة)
**التهديدات المحتملة:**
- هجمات على APIs الخارجية
- استنزاف موارد قاعدة البيانات
- **التأثير:** متوسط - تعطيل الخدمة

#### E - Elevation of Privilege (رفع الصلاحيات)
**التهديدات المحتملة:**
- تجاوز سياسات RLS
- استغلال ثغرات في دوال SQL
- **التأثير:** حرج - وصول إداري غير مصرح

### 🔄 مسارات البيانات الحساسة

#### بيانات المصادقة:
```
المستخدم → Supabase Auth → JWT Token → تطبيق الويب
```

#### بيانات الطلبات:
```
نموذج الطلب → API داخلي → Supabase → خدمات الشحن الخارجية
```

#### بيانات الدفع:
```
معلومات الدفع → تشفير محلي → تخزين مؤقت → معالجة
```

---

## 🔍 النتائج المفصلة (Detailed Findings)

### 🚨 المستوى الحرج (Critical)

#### 1. تسريب مفاتيح API الحساسة
**الملف المتأثر:** `.env`  
**السطر:** 2-4, 13, 26

**الوصف:**
تم العثور على مفاتيح API حساسة مكشوفة في ملف البيئة:
```bash
VITE_SUPABASE_URL=https://wrnssatuvmumsczyldth.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VERCEL_API_TOKEN=qibJizhHiQTdPVb6te0S7SCq
SUPABASE_ACCESS_TOKEN=sbp_c0eee2197d17729ac43e56eea84cb9690cb54e04
```

**CVSS v3.1 Score:** 9.1 (Critical)  
**المكون المتأثر:** جميع خدمات التطبيق  
**التأثير التجاري:** وصول كامل لقاعدة البيانات وخدمات السحابة

**دليل الاستغلال:**
1. الحصول على ملف `.env` من المستودع
2. استخدام `SERVICE_ROLE_KEY` للوصول المباشر لقاعدة البيانات
3. تجاوز جميع سياسات الأمان

**خطوات الإصلاح:**
```bash
# 1. إلغاء المفاتيح الحالية فوراً
supabase projects api-keys --project-ref wrnssatuvmumsczyldth --revoke

# 2. إنشاء مفاتيح جديدة
supabase projects api-keys --project-ref wrnssatuvmumsczyldth --create

# 3. تحديث متغيرات البيئة في Vercel
vercel env rm VITE_SUPABASE_SERVICE_ROLE_KEY
vercel env add VITE_SUPABASE_SERVICE_ROLE_KEY
```

**التحقق بعد الإصلاح:**
```bash
# فحص عدم وجود مفاتيح مكشوفة
gitleaks detect --source . --report-path security-scan.json
```

**الوقت المقدر للإصلاح:** Quick (≤2h)

---

#### 2. ثغرات CSRF في النماذج الرئيسية
**الملفات المتأثرة:**
- `src/components/orders/OrderFormSubmitter.ts`
- `src/components/product/ProductForm.tsx`  
- `src/components/store/form/FormComponent.tsx`

**الوصف:**
عدم وجود حماية CSRF في النماذج الحساسة مما يسمح بتنفيذ عمليات غير مصرح بها.

**CVSS v3.1 Score:** 8.8 (High)  
**المكون المتأثر:** نماذج الطلبات والمنتجات  
**التأثير التجاري:** إنشاء طلبات وهمية، تعديل أسعار

**PoC (Proof of Concept):**
```html
<!-- هجوم CSRF لإنشاء طلب وهمي -->
<form action="https://target-store.stockiha.com/api/orders" method="POST">
  <input name="fullName" value="Fake Order">
  <input name="phone" value="0555123456">
  <input name="total" value="1000">
  <input type="submit" value="Submit">
</form>
```

**خطوات الإصلاح:**
1. تنفيذ CSRF tokens:
```typescript
// src/lib/csrf.ts
export const generateCSRFToken = () => {
  return crypto.randomUUID();
};

export const validateCSRFToken = (token: string, sessionToken: string) => {
  return token === sessionToken;
};
```

2. تحديث النماذج:
```typescript
// في OrderFormSubmitter.ts
const csrfToken = generateCSRFToken();
const orderData = {
  ...formData,
  _csrf: csrfToken
};
```

**الوقت المقدر للإصلاح:** Medium (1-2 days)

---

#### 3. ثغرات في سياسات RLS (Row Level Security)
**الجداول المتأثرة:**
- `activation_code_batches` 
- `activation_codes`
- `user_organization_settings` (View)

**الوصف:**
سياسات RLS غير مفعلة أو مكونة بشكل خاطئ مما يسمح بالوصول غير المصرح للبيانات.

**CVSS v3.1 Score:** 8.5 (High)  
**المكون المتأثر:** نظام المصادقة وإدارة المؤسسات  
**التأثير التجاري:** وصول غير مصرح لبيانات العملاء

**خطوات الإصلاح:**
```sql
-- إصلاح فوري
ALTER TABLE public.activation_code_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- إصلاح الـ View
ALTER VIEW public.user_organization_settings 
SET (security_invoker = true);

-- إنشاء سياسات محسنة
CREATE POLICY activation_codes_secure_read ON public.activation_codes
    FOR SELECT TO public
    USING (
        -- السماح للمسؤولين والمستخدمين المخولين فقط
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.auth_user_id = auth.uid() 
            AND (u.is_super_admin = true OR u.organization_id = activation_codes.organization_id)
        )
    );
```

**الوقت المقدر للإصلاح:** Medium (1 day)

---

### ⚠️ المستوى العالي (High)

#### 4. اعتماديات بثغرات معروفة
**المكونات المتأثرة:**
- `bin-build` (High severity)
- `bin-check` (High severity) 
- `execa` (High severity)
- `vite-plugin-imagemin` (مجموعة ثغرات)

**الوصف:**
عدة اعتماديات تحتوي على ثغرات أمنية معروفة قد تؤدي إلى تنفيذ كود خبيث.

**CVSS v3.1 Score:** 7.5 (High)  
**التأثير:** تنفيذ كود عن بُعد في بيئة البناء

**خطوات الإصلاح:**
```bash
# تحديث الاعتماديات المتأثرة
npm update vite-plugin-imagemin@0.3.2
npm audit fix --force

# فحص شامل للاعتماديات
npm audit --audit-level high
```

**الوقت المقدر للإصلاح:** Short (half-day)

---

#### 5. ضعف في Content Security Policy
**الملف المتأثر:** `vercel.json`  
**السطر:** 40

**الوصف:**
CSP يحتوي على `'unsafe-inline'` و `'unsafe-eval'` مما يقلل من الحماية ضد XSS.

**المحتوى الحالي:**
```json
"Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; ..."
```

**خطوات الإصلاح:**
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'nonce-{random}' https://connect.facebook.net; style-src 'self' 'nonce-{random}' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.yalidine.app; frame-src 'self' https://www.facebook.com; object-src 'none'; base-uri 'self';"
}
```

**الوقت المقدر للإصلاح:** Short (4h)

---

#### 6. عدم تشفير البيانات الحساسة في Transit
**المكون المتأثر:** اتصالات APIs الخارجية

**الوصف:**
بعض الاتصالات مع خدمات الشحن قد لا تستخدم TLS بشكل صحيح.

**خطوات الإصلاح:**
```typescript
// في shippingService.ts
const httpsAgent = new https.Agent({
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2'
});

const apiClient = axios.create({
  httpsAgent,
  timeout: 30000
});
```

**الوقت المقدر للإصلاح:** Short (4h)

---

#### 7. نقص في التدقيق الأمني (Security Logging)
**المكون المتأثر:** جميع العمليات الحساسة

**الوصف:**
عدم وجود تسجيل شامل للأحداث الأمنية والعمليات الحساسة.

**خطوات الإصلاح:**
```typescript
// src/lib/security-logger.ts
export const logSecurityEvent = async (event: {
  type: 'login' | 'order' | 'api_access' | 'data_export';
  userId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}) => {
  await supabase.from('security_logs').insert({
    ...event,
    timestamp: new Date().toISOString(),
    severity: getSeverityLevel(event.type)
  });
};
```

**الوقت المقدر للإصلاح:** Medium (2 days)

---

### 🔶 المستوى المتوسط (Medium)

#### 8. عدم تطبيق Rate Limiting
**المكون المتأثر:** جميع APIs العامة

**الوصف:**
عدم وجود حدود على معدل الطلبات مما قد يؤدي إلى هجمات DDoS أو استنزاف الموارد.

**خطوات الإصلاح:**
```typescript
// src/middleware/rate-limiter.ts
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export const rateLimitMiddleware = async (req, res, next) => {
  const { success } = await ratelimit.limit(req.ip);
  if (!success) {
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
};
```

**الوقت المقدر للإصلاح:** Medium (1 day)

---

#### 9. ضعف في التحقق من صحة المدخلات
**الملفات المتأثرة:** نماذج إدخال البيانات

**الوصف:**
عدم تطبيق تحقق صارم من صحة المدخلات قد يؤدي إلى حقن SQL أو XSS.

**خطوات الإصلاح:**
```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const orderSchema = z.object({
  fullName: z.string().min(2).max(100).regex(/^[a-zA-Zأ-ي\s]+$/),
  phone: z.string().regex(/^(0|\+213)[5-7][0-9]{8}$/),
  email: z.string().email().optional(),
  address: z.string().min(10).max(200)
});
```

**الوقت المقدر للإصلاح:** Medium (1-2 days)

---

#### 10. عدم تشفير البيانات الحساسة في قاعدة البيانات
**المكون المتأثر:** جداول تحتوي على PII

**الوصف:**
بعض البيانات الشخصية مخزنة بدون تشفير في قاعدة البيانات.

**خطوات الإصلاح:**
```sql
-- إضافة تشفير للبيانات الحساسة
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- تشفير أرقام الهواتف
ALTER TABLE customers ADD COLUMN phone_encrypted TEXT;
UPDATE customers SET phone_encrypted = pgp_sym_encrypt(phone, 'encryption_key');
```

**الوقت المقدر للإصلاح:** Long (3-5 days)

---

### 🔵 المستوى المنخفض (Low)

#### 11. عدم وجود HTTP Security Headers
**المكون المتأثر:** جميع الاستجابات

**الوصف:**
نقص في بعض HTTP Security Headers المهمة.

**خطوات الإصلاح:**
```json
// في vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

**الوقت المقدر للإصلاح:** Quick (2h)

---

#### 12. معلومات تقنية مكشوفة في الأخطاء
**المكون المتأثر:** معالجة الأخطاء

**الوصف:**
رسائل الأخطاء قد تكشف معلومات تقنية حساسة.

**خطوات الإصلاح:**
```typescript
// src/lib/error-handler.ts
export const sanitizeError = (error: Error, isProduction: boolean) => {
  if (isProduction) {
    return {
      message: "حدث خطأ في الخادم",
      code: "INTERNAL_ERROR"
    };
  }
  return {
    message: error.message,
    stack: error.stack
  };
};
```

**الوقت المقدر للإصلاح:** Quick (4h)

---

## 🛡️ خطة الإصلاح المفصلة (Detailed Remediation Plan)

### ⚡ إصلاحات فورية (Hotfixes) - الأسبوع الأول

#### الأولوية 1: تسريب مفاتيح API (2 ساعات)
```bash
# خطوات الإصلاح الفوري
1. إلغاء جميع المفاتيح المكشوفة
   supabase projects api-keys --revoke-all

2. إنشاء مفاتيح جديدة
   supabase projects api-keys --create

3. تحديث متغيرات البيئة
   vercel env rm VITE_SUPABASE_SERVICE_ROLE_KEY
   vercel env add VITE_SUPABASE_SERVICE_ROLE_KEY

4. نشر التحديث
   vercel --prod
```

#### الأولوية 2: إصلاح RLS (4 ساعات)
```sql
-- تطبيق الإصلاح الأمني العاجل
BEGIN;

-- تفعيل RLS على الجداول المتأثرة
ALTER TABLE public.activation_code_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- إصلاح الـ Security Definer View
ALTER VIEW public.user_organization_settings 
SET (security_invoker = true);

-- إنشاء سياسات أمان محسنة
CREATE POLICY activation_codes_admin_only ON public.activation_codes
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.is_super_admin = true
        )
    );

COMMIT;
```

#### الأولوية 3: تحديث CSP (2 ساعات)
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'nonce-{nonce}' https://connect.facebook.net https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.yalidine.app; frame-src 'self' https://www.facebook.com https://connect.facebook.net; object-src 'none'; base-uri 'self'; form-action 'self';"
}
```

### 🔧 إصلاحات متوسطة المدى (الشهر الأول)

#### الأسبوع 2: حماية CSRF
```typescript
// 1. إنشاء مكتبة CSRF
// src/lib/csrf-protection.ts
import crypto from 'crypto';

export class CSRFProtection {
  private static tokenStore = new Map<string, string>();
  
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokenStore.set(sessionId, token);
    return token;
  }
  
  static validateToken(sessionId: string, token: string): boolean {
    const storedToken = this.tokenStore.get(sessionId);
    return storedToken === token;
  }
}

// 2. تطبيق في النماذج
// src/components/orders/OrderFormSubmitter.ts
const csrfToken = CSRFProtection.generateToken(sessionId);

const orderData = {
  ...formData,
  _csrf: csrfToken
};
```

#### الأسبوع 3: تحديث الاعتماديات
```bash
# فحص وتحديث الاعتماديات
npm audit --audit-level high
npm update vite-plugin-imagemin@0.3.2
npm install --package-lock-only
npm audit fix --force

# فحص نهائي
npm audit --audit-level moderate
```

#### الأسبوع 4: تطبيق Rate Limiting
```typescript
// src/middleware/rate-limiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const createRateLimiter = (requests: number, window: string) => {
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, window),
  });
};

// تطبيق في APIs
export const orderApiLimiter = createRateLimiter(5, "60 s");
export const authApiLimiter = createRateLimiter(3, "300 s");
```

### 📊 إصلاحات طويلة المدى (الشهر الثاني والثالث)

#### الشهر الثاني: نظام التدقيق الأمني
```typescript
// src/lib/security-audit.ts
interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_access' | 'api_call';
  level: 'info' | 'warning' | 'critical';
  userId?: string;
  organizationId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export class SecurityAudit {
  static async logEvent(event: SecurityEvent) {
    // تسجيل في قاعدة البيانات
    await supabase.from('security_audit_log').insert({
      ...event,
      id: crypto.randomUUID()
    });
    
    // إرسال تنبيه للأحداث الحرجة
    if (event.level === 'critical') {
      await this.sendAlert(event);
    }
  }
  
  private static async sendAlert(event: SecurityEvent) {
    // إرسال تنبيه عبر البريد الإلكتروني أو Slack
    // يمكن تطبيقه حسب الحاجة
  }
}
```

#### الشهر الثالث: تشفير البيانات الحساسة
```sql
-- إنشاء جدول للبيانات المشفرة
CREATE TABLE IF NOT EXISTS encrypted_customer_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  phone_encrypted BYTEA,
  email_encrypted BYTEA,
  address_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- دالة للتشفير
CREATE OR REPLACE FUNCTION encrypt_customer_data(
  customer_id UUID,
  phone TEXT,
  email TEXT,
  address TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  record_id UUID;
  encryption_key TEXT := 'your-secure-encryption-key';
BEGIN
  INSERT INTO encrypted_customer_data (
    customer_id,
    phone_encrypted,
    email_encrypted,
    address_encrypted
  ) VALUES (
    customer_id,
    pgp_sym_encrypt(phone, encryption_key),
    pgp_sym_encrypt(email, encryption_key),
    pgp_sym_encrypt(address, encryption_key)
  ) RETURNING id INTO record_id;
  
  RETURN record_id;
END;
$$;
```

---

## 🔍 قائمة التحقق والاختبارات (Verification Checklist)

### ✅ اختبارات الأمان الأساسية

#### 1. فحص تسريب الأسرار
```bash
# فحص Git history
gitleaks detect --source . --report-path gitleaks-report.json

# فحص الملفات الحالية
truffleHog filesystem --directory . --json > truffleHog-report.json

# فحص متغيرات البيئة
grep -r "SUPABASE\|API\|TOKEN\|KEY" --exclude-dir=node_modules .
```

#### 2. اختبار CSRF Protection
```bash
# اختبار نموذج الطلب
curl -X POST https://target-store.stockiha.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","phone":"0555123456","total":1000}' \
  --cookie "session=fake-session"

# يجب أن يفشل بدون CSRF token
```

#### 3. فحص RLS Policies
```sql
-- اختبار الوصول غير المصرح
SET ROLE 'anon';
SELECT * FROM activation_codes; -- يجب أن يفشل

-- اختبار الوصول المصرح
SET ROLE 'authenticated';
SELECT * FROM activation_codes WHERE organization_id = 'user-org-id';
```

#### 4. اختبار Rate Limiting
```bash
# اختبار حد الطلبات
for i in {1..15}; do
  curl -X POST https://stockiha.com/api/orders \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
done

# يجب أن يرجع 429 بعد الطلب رقم 10
```

### 🛡️ اختبارات الاختراق المحدودة

#### 1. اختبار XSS
```javascript
// في حقول الإدخال
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
```

#### 2. اختبار SQL Injection
```sql
-- في حقول البحث
'; DROP TABLE products; --
' OR '1'='1
```

#### 3. اختبار IDOR (Insecure Direct Object Reference)
```bash
# اختبار الوصول لطلبات مستخدمين آخرين
curl https://stockiha.com/api/orders/uuid-of-other-user \
  -H "Authorization: Bearer user-token"
```

---

## 📈 مقاييس المراقبة والتنبيه (Monitoring & Alerting)

### 🚨 قواعد التنبيه الأمنية

#### 1. تنبيهات المصادقة
```sql
-- كشف محاولات الدخول المشبوهة
SELECT 
  COUNT(*) as failed_attempts,
  ip_address,
  user_agent
FROM security_audit_log 
WHERE 
  type = 'authentication' 
  AND details->>'success' = 'false'
  AND created_at > NOW() - INTERVAL '5 minutes'
GROUP BY ip_address, user_agent
HAVING COUNT(*) > 5;
```

#### 2. تنبيهات الوصول غير المصرح
```sql
-- كشف محاولات الوصول لبيانات محظورة
SELECT *
FROM security_audit_log 
WHERE 
  level = 'critical'
  AND type = 'authorization'
  AND created_at > NOW() - INTERVAL '1 hour';
```

#### 3. تنبيهات استخدام API غير طبيعي
```sql
-- كشف الاستخدام المفرط للـ APIs
SELECT 
  user_id,
  COUNT(*) as api_calls,
  array_agg(DISTINCT details->>'endpoint') as endpoints
FROM security_audit_log 
WHERE 
  type = 'api_call'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 100;
```

### 📊 لوحة مراقبة أمنية

#### مؤشرات الأداء الأمنية (Security KPIs):
1. **معدل محاولات الدخول الفاشلة:** < 5% من إجمالي المحاولات
2. **وقت اكتشاف التهديدات:** < 5 دقائق
3. **وقت الاستجابة للحوادث:** < 30 دقيقة
4. **نسبة الطلبات المحظورة:** < 1% من إجمالي الطلبات

#### تقارير دورية:
- **يومية:** ملخص الأحداث الأمنية
- **أسبوعية:** تحليل الاتجاهات والأنماط
- **شهرية:** مراجعة شاملة للوضع الأمني

---

## 🎯 توصيات إضافية

### 🔒 تحسينات الأمان طويلة المدى

#### 1. تطبيق Zero Trust Architecture
- التحقق من كل طلب بغض النظر عن المصدر
- تطبيق مبدأ الصلاحيات الأدنى (Principle of Least Privilege)
- مراقبة مستمرة لجميع الأنشطة

#### 2. تطبيق DevSecOps
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
      - name: Run npm audit
        run: npm audit --audit-level high
      - name: Run OWASP ZAP
        uses: zaproxy/action-baseline@v0.7.0
```

#### 3. تدريب فريق التطوير
- ورش عمل حول الأمان السيبراني
- مراجعة دورية لأفضل الممارسات الأمنية
- اختبارات دورية للوعي الأمني

### 📱 أمان الأجهزة المحمولة
```typescript
// src/lib/mobile-security.ts
export const mobileSecurityChecks = {
  // فحص الجهاز المكسور (Jailbreak/Root)
  checkDeviceIntegrity: () => {
    // تطبيق فحوصات للكشف عن الأجهزة المخترقة
  },
  
  // تشفير البيانات المحلية
  encryptLocalData: (data: any) => {
    // تشفير البيانات الحساسة قبل التخزين المحلي
  },
  
  // فحص اتصال SSL
  validateSSLConnection: (url: string) => {
    // التأكد من صحة شهادة SSL
  }
};
```

---

## 📋 الملحقات (Appendices)

### A. أوامر الفحص الأوتوماتيكي

#### فحص الأسرار:
```bash
# Gitleaks
gitleaks detect --source . --report-path gitleaks-report.json --verbose

# TruffleHog
truffleHog filesystem --directory . --json > truffleHog-report.json

# detect-secrets
detect-secrets scan --all-files --baseline .secrets.baseline
```

#### فحص الاعتماديات:
```bash
# Node.js
npm audit --json > npm-audit.json
npm audit fix --dry-run

# Python (إن وجد)
pip-audit -r requirements.txt -f json -o pip-audit.json

# فحص شامل
snyk test --json > snyk-report.json
```

#### فحص الحاويات:
```bash
# Trivy
trivy image --format json -o trivy-report.json node:18-alpine

# Hadolint (للـ Dockerfiles)
hadolint Dockerfile
```

### B. أدوات الفحص الموصى بها

#### أدوات مجانية:
- **OWASP ZAP:** فحص تطبيقات الويب
- **Gitleaks:** فحص تسريب الأسرار
- **npm audit:** فحص اعتماديات Node.js
- **Bandit:** فحص كود Python (إن وجد)

#### أدوات تجارية:
- **Snyk:** فحص شامل للاعتماديات
- **Veracode:** فحص الكود الثابت
- **Burp Suite Professional:** اختبارات الاختراق

### C. جهات الاتصال الطارئة

#### فريق الاستجابة للحوادث:
- **المدير التقني:** [البريد الإلكتروني]
- **مسؤول الأمان:** [البريد الإلكتروني]
- **فريق DevOps:** [البريد الإلكتروني]

#### الخدمات الخارجية:
- **Supabase Support:** support@supabase.com
- **Vercel Support:** support@vercel.com
- **Cloudflare Support:** [إن كان مستخدماً]

---

## 📄 خاتمة التقرير

تم إجراء تدقيق أمني شامل لمشروع Stokiha وتم تحديد 12 ثغرة أمنية تتراوح من الحرجة إلى المنخفضة. الثغرات الحرجة تتطلب إصلاحاً فورياً خلال الأسبوع الأول، بينما يمكن معالجة الثغرات الأخرى على مراحل خلال الأشهر القادمة.

**التوصية الرئيسية:** التركيز على إصلاح تسريب مفاتيح API وثغرات CSRF كأولوية قصوى، ثم تطبيق خطة الإصلاح المرحلية المقترحة.

**تاريخ المراجعة التالية:** 15 فبراير 2025

---

**إخلاء مسؤولية:** هذا التقرير يعكس الوضع الأمني وقت إجراء التدقيق. يُنصح بإجراء تدقيق دوري كل 3-6 أشهر للحفاظ على مستوى أمني عالٍ.
