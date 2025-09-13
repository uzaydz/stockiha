# 🌐 حلول مشكلة النطاق بدون www للتجار - Cloudflare SaaS

## 🚨 المشكلة
- الموقع يعمل مع `www.example.com` ✅
- الموقع لا يعمل مع `example.com` ❌
- التاجر لا يستطيع إنشاء CNAME للنطاق الجذري في GoDaddy

## 💡 الحلول المتاحة

### الحل الأول: إعادة التوجيه التلقائي (الأفضل)
استخدام Cloudflare Redirect Rules لتوجيه النطاق الجذري إلى www تلقائياً.

#### خطوات التطبيق:
1. **في لوحة تحكم Cloudflare:**
   - اذهب إلى **Rules** → **Redirect Rules**
   - انقر **Create Rule**

2. **إعداد القاعدة:**
   ```
   Rule Name: Apex to WWW Redirect
   
   When incoming requests match:
   - Field: Hostname
   - Operator: equals
   - Value: example.com
   
   Then:
   - Type: Dynamic
   - Expression: concat("https://www.", http.request.uri.path)
   - Status Code: 301 (Permanent Redirect)
   ```

3. **حفظ القاعدة** وتفعيلها

### الحل الثاني: CNAME Flattening
استخدام ميزة Cloudflare لتحويل CNAME إلى A record تلقائياً.

#### خطوات التطبيق:
1. **في DNS Settings:**
   ```
   Type: CNAME
   Name: @ (أو example.com)
   Target: www.example.com
   Proxy Status: Proxied (🧡)
   ```

2. **تفعيل CNAME Flattening:**
   - في **DNS** → **Settings**
   - فعل **CNAME Flattening**

### الحل الثالث: A Record مع IP ثابت
إذا كان لديك IP ثابت، يمكن استخدام A Record للنطاق الجذري.

#### خطوات التطبيق:
```
Type: A
Name: @ (أو example.com)
Value: YOUR_STATIC_IP
Proxy Status: Proxied (🧡)
```

### الحل الرابع: Page Rule (البديل القديم)
استخدام Page Rules للتوجيه.

#### خطوات التطبيق:
```
URL Pattern: example.com/*
Setting: Forwarding URL
Status Code: 301 - Permanent Redirect
Destination URL: https://www.example.com/$1
```

## 🛠️ التطبيق التقني في النظام

### 1. تحديث Domain Verification API
```javascript
// في functions/api/verify-domain.ts
const requiredRecords = [
  {
    type: 'CNAME',
    name: `www.${domain}`,
    value: 'stockiha.pages.dev',
    note: 'للنطاق مع www'
  },
  {
    type: 'CNAME', 
    name: domain,
    value: `www.${domain}`,
    note: 'للنطاق بدون www (إعادة توجيه)'
  }
];
```

### 2. إضافة Redirect Rule تلقائياً
```javascript
async function createApexRedirect(domain, env) {
  const redirectRule = {
    expression: `(http.host eq "${domain}")`,
    action: {
      id: "redirect",
      parameters: {
        from_value: {
          status_code: 301,
          target_url: {
            expression: `concat("https://www.${domain}", http.request.uri.path)`
          },
          preserve_query_string: true
        }
      }
    }
  };
  
  // إرسال إلى Cloudflare API
  return await fetch(`https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/rulesets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(redirectRule)
  });
}
```

## 📋 دليل للتجار (خطوة بخطوة)

### في GoDaddy:
1. **اذهب إلى My Products → DNS**
2. **أضف السجلات التالية:**
   ```
   Type: CNAME
   Host: www
   Points to: abc123.stockiha.com
   TTL: 1 Hour
   
   Type: CNAME  
   Host: @
   Points to: www.yourstore.com
   TTL: 1 Hour
   ```

### في Namecheap:
1. **Advanced DNS → Add New Record**
2. **أضف السجلات:**
   ```
   Type: CNAME Record
   Host: www
   Value: abc123.stockiha.com
   
   Type: CNAME Record
   Host: @
   Value: www.yourstore.com
   ```

### في Cloudflare (إذا كان التاجر يستخدمه):
1. **DNS → Records → Add record**
2. **أضف السجلات:**
   ```
   Type: CNAME
   Name: www
   Target: abc123.stockiha.com
   Proxy: On (🧡)
   
   Type: CNAME
   Name: @
   Target: www.yourstore.com  
   Proxy: On (🧡)
   ```

## ⚡ الحل السريع الموصى به

### للتجار الحاليين:
1. **إضافة CNAME للنطاق الجذري يشير إلى www**
2. **تفعيل Redirect Rule في Cloudflare تلقائياً**
3. **إرسال تعليمات واضحة للتاجر**

### للتجار الجدد:
1. **شرح الحلول المتاحة في دليل الإعداد**
2. **توفير أدوات تلقائية للتحقق والإعداد**
3. **دعم فني مخصص للحالات المعقدة**

## 🔧 التحقق من نجاح الحل

```bash
# اختبار النطاق بدون www
curl -I http://example.com
# يجب أن ترى: Location: https://www.example.com/

# اختبار النطاق مع www  
curl -I https://www.example.com
# يجب أن ترى: HTTP/2 200
```

## 📞 الدعم الفني

إذا واجه التاجر صعوبات:
1. **تحقق من إعدادات DNS الحالية**
2. **استخدم أدوات التشخيص التلقائية** 
3. **قدم دعم مباشر للإعداد**
4. **وثق الحالات الخاصة للمراجع المستقبلية**
