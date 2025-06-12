# إعداد Content Security Policy لشركات Ecotrack

## المشكلة
كانت شركات التوصيل التي تستخدم منصة Ecotrack غير قادرة على الاتصال بسبب Content Security Policy (CSP) الذي يمنع الاتصال بنطاقات `*.ecotrack.dz`.

## الحل المُطبق

### 1. تحديث `vercel.json`
تم إضافة النطاقات التالية إلى `connect-src`:
- `https://*.ecotrack.dz` - لجميع شركات Ecotrack الفرعية
- `https://api.ecotrack.dz` - للـ API الرئيسي لـ Ecotrack

### 2. تحديث `index.html` 
تم إضافة نفس النطاقات في إعدادات CSP المباشرة في HTML.

### 3. شركات Ecotrack المدعومة
الآن يمكن للشركات التالية الاتصال بنجاح:

| الكود | اسم الشركة | نطاق API |
|-------|------------|----------|
| `anderson_delivery` | Anderson Delivery | `https://anderson.ecotrack.dz/` |
| `areex` | أريكس | `https://areex.ecotrack.dz/` |
| `ba_consult` | BA Consult | `https://baconsult.ecotrack.dz/` |
| `conexlog` | كونكسلوغ | `https://conexlog.ecotrack.dz/` |
| `coyote_express` | Coyote Express | `https://coyote.ecotrack.dz/` |
| `dhd` | DHD | `https://dhd.ecotrack.dz/` |
| `distazero` | ديستازيرو | `https://distazero.ecotrack.dz/` |
| `e48hr_livraison` | E48HR Livraison | `https://e48hr.ecotrack.dz/` |
| `fretdirect` | فريت دايركت | `https://fretdirect.ecotrack.dz/` |
| `golivri` | غوليفري | `https://golivri.ecotrack.dz/` |
| `mono_hub` | Mono Hub | `https://monohub.ecotrack.dz/` |
| `msm_go` | MSM Go | `https://msmgo.ecotrack.dz/` |
| `imir_express` | إمير إكسبرس | `https://imir.ecotrack.dz/` |
| `packers` | باكرز | `https://packers.ecotrack.dz/` |
| `prest` | بريست | `https://prest.ecotrack.dz/` |
| `rb_livraison` | RB Livraison | `https://rb.ecotrack.dz/` |
| `rex_livraison` | ريكس ليفريزون | `https://rex.ecotrack.dz/` |
| `rocket_delivery` | Rocket Delivery | `https://rocket.ecotrack.dz/` |
| `salva_delivery` | سالفا ديليفري | `https://salva.ecotrack.dz/` |
| `speed_delivery` | سبيد ديليفري | `https://speed.ecotrack.dz/` |
| `tsl_express` | TSL Express | `https://tsl.ecotrack.dz/` |
| `worldexpress` | ورلد إكسبرس | `https://worldexpress.ecotrack.dz/` |

## النطاقات المُضافة إلى CSP

```
connect-src 'self' 
  https://api.vercel.com 
  https://*.vercel.com 
  https://*.vercel.app 
  https://*.supabase.co 
  https://*.supabase.in 
  wss://*.supabase.co 
  https://api.yalidine.app 
  https://procolis.com 
  https://*.ecotrack.dz      # ← جديد
  https://api.ecotrack.dz    # ← جديد
  https://*.sentry.io 
  https://www.facebook.com 
  https://graph.facebook.com 
  https://www.google-analytics.com 
  https://analytics.google.com 
  https://ads.tiktok.com 
  https://analytics.tiktok.com 
  ws://localhost:* 
  wss://localhost:* 
  http://localhost:* 
  http://127.0.0.1:* 
  ws://127.0.0.1:*
```

## اختبار الحل

بعد النشر، يجب أن تعمل شركات Ecotrack بدون أخطاء CSP. يمكن اختبار الاتصال من خلال:

1. فتح صفحة إدارة التوصيل
2. إضافة شركة توصيل من شركات Ecotrack
3. إدخال Token صحيح
4. اختبار الاتصال - يجب أن يعمل بدون أخطاء

## ملاحظات للمطورين

- **التطوير المحلي**: لا تتأثر بيئة التطوير المحلي لأن CSP أكثر تساهلاً
- **الإنتاج**: تحتاج لإعادة النشر على Vercel لتطبيق إعدادات CSP الجديدة
- **إضافة شركات جديدة**: إذا تم إضافة شركات Ecotrack جديدة، ستعمل تلقائياً بسبب `*.ecotrack.dz`

## إعدادات المصادقة

شركات Ecotrack تستخدم:
- **Bearer Token** - مطلوب
- **API Key** - اختياري

تم تحديث مكونات النموذج للتعامل مع هذا الاختلاف عن شركات التوصيل الأخرى. 