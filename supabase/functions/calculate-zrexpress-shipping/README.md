# دالة حساب سعر الشحن ZR Express

هذه دالة Edge Function تقوم بحساب سعر الشحن باستخدام خدمة ZR Express. تم تطويرها كبديل لدالة PostgreSQL التي كانت تواجه مشاكل في الاتصال مع API الخارجي.

## معلومات عامة

- **اسم الدالة**: `calculate-zrexpress-shipping`
- **الغرض**: حساب سعر الشحن مع ZR Express بناءً على رقم الولاية ونوع التوصيل
- **نوع الطلب**: POST
- **ملاحظة**: تحتاج إلى توفير معرف المنظمة ورقم الولاية لتعمل بشكل صحيح

## كيفية النشر

```bash
# 1. انتقل إلى مجلد الوظيفة
cd supabase/functions/calculate-zrexpress-shipping

# 2. نشر الوظيفة
supabase functions deploy calculate-zrexpress-shipping --no-verify-jwt
```

## معاملات الطلب

```json
{
  "organizationId": "uuid-المنظمة",
  "wilayaId": "رقم-الولاية",
  "isHomeDelivery": true
}
```

- `organizationId`: معرف المنظمة (UUID)
- `wilayaId`: رقم الولاية (نص)
- `isHomeDelivery`: نوع التوصيل (منزلي = true، مكتب = false)

## الاستجابة

```json
{
  "success": true,
  "price": 1250,
  "error": null
}
```

## الاستخدام من TypeScript/JavaScript

```typescript
// استدعاء الدالة من الواجهة الأمامية
const { data, error } = await supabase.functions.invoke('calculate-zrexpress-shipping', {
  method: 'POST',
  body: {
    organizationId: 'uuid-المنظمة',
    wilayaId: '16',
    isHomeDelivery: true
  }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Shipping price:', data.price);
}
```

## ملاحظات التنفيذ

- الدالة تستخدم واجهة برمجة التطبيقات (API) الخاصة بـ ZR Express لحساب الأسعار.
- يتم جلب بيانات الاعتماد (API token و key) من جدول `shipping_provider_settings`.
- تتوقع الدالة أن يكون الرد من API على شكل مصفوفة وتقوم بفلترة النتائج حسب رقم الولاية المطلوب.

## رابط التوثيق

- [توثيق Edge Functions في Supabase](https://supabase.com/docs/guides/functions)
- [توثيق ZR Express API](/docs/zrexpress_api.md) 