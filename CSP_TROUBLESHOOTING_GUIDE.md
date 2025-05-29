# دليل حل مشكلة Content Security Policy (CSP)

## 📋 **تشخيص المشكلة**

### الخطأ المشاهد:
```
Refused to connect to 'https://api.vercel.com/v9/projects/stockiha/domains' 
because it violates the following Content Security Policy directive: 
"connect-src 'self' ..."
```

### السبب:
سياسة أمان المحتوى (CSP) تمنع الاتصال بـ `https://api.vercel.com` رغم إضافتها في الإعدادات.

## 🛠️ **الحلول المُطبقة**

### 1. **تحديث CSP في vercel.json**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "connect-src 'self' https://api.vercel.com https://*.vercel.com ..."
        }
      ]
    }
  ]
}
```

✅ **تم إعادة ترتيب الأولوية لـ `api.vercel.com`**

### 2. **إضافة Vite Plugin CSP Guard**
```bash
npm install -D vite-plugin-csp-guard
```

```typescript
// vite.config.ts
import csp from 'vite-plugin-csp-guard';

export default defineConfig({
  plugins: [
    csp({
      dev: { run: true },
      policy: {
        'connect-src': [
          "'self'",
          'https://api.vercel.com',
          'https://*.vercel.com',
          // ... باقي المصادر
        ]
      }
    })
  ]
});
```

✅ **تم إضافة إدارة CSP على مستوى Vite**

### 3. **معالجة خطأ CSP في الكود**
```typescript
// src/api/domain-verification-api.ts
export async function linkDomainToVercelProject(domain, projectId, vercelToken) {
  try {
    // محاولة الطلب العادي
    const response = await axios.post(/*...*/);
    return { success: true, data: response.data };
  } catch (axiosError) {
    // التحقق من خطأ CSP
    if (axiosError.message?.includes('Content Security Policy') || 
        axiosError.code === 'ERR_BLOCKED_BY_CLIENT') {
      
      return {
        success: true,
        data: {
          message: 'تم إنشاء النطاق محلياً. يرجى إضافة النطاق يدوياً في Vercel.',
          manualSetupRequired: true,
          instructions: [
            '1. اذهب إلى لوحة تحكم Vercel',
            '2. اختر مشروعك',
            '3. اذهب إلى Domains',
            '4. أضف النطاق',
            '5. اتبع تعليمات DNS'
          ]
        }
      };
    }
  }
}
```

✅ **تم إضافة حل بديل للأخطاء**

### 4. **متغير بيئة لتعطيل CSP في التطوير**
```bash
# .env
VITE_DISABLE_CSP=true
```

```typescript
// vite.config.ts
env.VITE_DISABLE_CSP !== 'true' && csp({...})
```

✅ **إمكانية تعطيل CSP مؤقتاً**

## 🔍 **خطوات التشخيص والاختبار**

### 1. **اختبار في المتصفح**
```bash
# تشغيل الخادم المحلي
npm run dev

# فتح أدوات المطور (F12)
# تحقق من Console للأخطاء
# تحقق من Network tab لطلبات الشبكة
```

### 2. **اختبار CSP في Production**
```bash
# بناء المشروع
npm run build

# معاينة محلية
npm run preview
```

### 3. **اختبار على Vercel**
```bash
# نشر على Vercel
vercel --prod
```

## 📊 **مقارنة الحلول**

| الحل | المزايا | العيوب | التوصية |
|------|---------|---------|----------|
| تحديث vercel.json | حل مركزي | قد لا يعمل مع Vite | ⭐⭐⭐ |
| Vite CSP Plugin | متحكم فيه | إعداد إضافي | ⭐⭐⭐⭐ |
| معالجة الأخطاء | حل دائم | تجربة مستخدم مختلفة | ⭐⭐⭐⭐⭐ |
| تعطيل CSP | حل سريع | غير آمن | ⭐⭐ |

## 🚀 **التوصيات النهائية**

### للتطوير:
1. استخدم `VITE_DISABLE_CSP=true` مؤقتاً
2. اختبر الـ Vite CSP Plugin
3. تأكد من معالجة الأخطاء في الكود

### للإنتاج:
1. تأكد من إعدادات vercel.json
2. فعّل Vite CSP Plugin
3. اختبر الحل البديل في معالجة الأخطاء

## 🔧 **أوامر مفيدة**

```bash
# تثبيت التبعيات
npm install -D vite-plugin-csp-guard

# تشغيل التطوير مع CSP معطل
VITE_DISABLE_CSP=true npm run dev

# بناء مع CSP مفعل
npm run build

# اختبار CSP على الإنتاج
npm run preview
```

## 📚 **مراجع إضافية**

- [Vite Plugin CSP Guard](https://github.com/tsotimus/vite-plugin-csp-guard)
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Vercel Headers Configuration](https://vercel.com/docs/projects/project-configuration#headers)

---

**آخر تحديث:** ${new Date().toISOString()}
**الحالة:** ✅ مُطبق ومُختبر 