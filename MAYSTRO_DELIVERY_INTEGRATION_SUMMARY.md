# ملخص تكامل Maystro Delivery مع النظام الموحد

## 🎯 نظرة عامة

تم إضافة شركة **Maystro Delivery** بنجاح إلى النظام الموحد لإرسال الطلبات. هذا التكامل يدعم:
- إرسال الطلبات عبر API الخاص بـ Maystro Delivery
- تتبع الطرود باستخدام أرقام التتبع المخصصة
- إدارة موحدة مع باقي شركات التوصيل

## 🔧 التغييرات المنجزة

### **1. إضافة Maystro إلى قائمة الشركات**
- **الملف**: `src/components/orders/table/ShippingProviderColumn.tsx`
- **التغيير**: إضافة تعريف Maystro Delivery مع:
  - الكود: `maystro`
  - الاسم العربي: `مايسترو ديليفري`
  - الاسم الإنجليزي: `Maystro Delivery`
  - اللون: `indigo`
  - الأيقونة: `Plane`
  - حقل التتبع: `maystro_tracking_id`

### **2. دعم Maystro في النظام الموحد**
- **الملف**: `src/pages/dashboard/Orders.tsx`
- **التغييرات**:
  - إضافة `case 'maystro'` في دالة `getTrackingField()`
  - إضافة اسم Maystro في دالة `getProviderDisplayName()`

### **3. إنشاء دالة إرسال Maystro**
- **الملف**: `src/utils/ecotrackShippingIntegration.ts`
- **الدالة الجديدة**: `sendOrderToMaystroDelivery()`

#### **مميزات دالة Maystro:**
```typescript
async function sendOrderToMaystroDelivery(
  orderId: string, 
  organizationId: string
): Promise<EcotrackOrderResult>
```

**📋 المعالجة:**
1. **جلب بيانات الطلب**: من `online_orders` مع `online_order_items`
2. **التحقق من إعدادات المزود**: جلب API Token من `shipping_provider_settings`
3. **استخراج بيانات العميل والعنوان**: من حقل `notes` أو حقول الطلب
4. **تحضير بيانات API**: حسب متطلبات Maystro API
5. **إرسال الطلب**: إلى `https://backend.maystro-delivery.com/api/stores/orders/`
6. **تحديث الطلب**: بـ `maystro_tracking_id` و `shipping_provider`

**🔑 بيانات API المرسلة:**
```javascript
{
  wilaya: wilayaId,                    // رقم الولاية
  commune: communeId,                  // رقم البلدية  
  destination_text: streetAddress,     // العنوان التفصيلي
  customer_phone: cleanPhone,          // رقم الهاتف (أرقام فقط)
  customer_name: customerName,         // اسم العميل
  product_price: totalAmount,          // المبلغ الإجمالي
  delivery_type: 0,                    // توصيل منزلي
  express: false,                      // ليس سريع
  note_to_driver: notes,               // ملاحظات للسائق
  products: productsList,              // قائمة المنتجات
  source: 4,                           // مطلوب من Maystro
  external_order_id: orderId           // معرف الطلب الخارجي
}
```

### **4. تحديث النظام الموحد**
- **التحديث**: إضافة `case 'maystro'` في `sendOrderToShippingProvider()`
- **التوجيه**: الطلبات إلى `sendOrderToMaystroDelivery()` تلقائياً

### **5. دعم حقل التتبع**
- **الملف**: `add_shipping_columns.sql`
- **الحقل المضاف**: `maystro_tracking_id VARCHAR(255)`
- **الفهرس المضاف**: `idx_online_orders_maystro_tracking`

### **6. إضافة المزود لقاعدة البيانات**
- **الملف**: `add_maystro_delivery_provider.sql`
- **البيانات المضافة**:
  ```sql
  INSERT INTO shipping_providers (
    code: 'maystro',
    name: 'Maystro Delivery',
    base_url: 'https://backend.maystro-delivery.com/api/',
    supports_tracking: true,
    supports_labeling: true,
    supports_cod: true
  )
  ```

### **7. تحديث عمود الشحن**
- **دعم عرض**: Maystro Delivery في قائمة الشركات النشطة
- **التحقق من التتبع**: إضافة فحص `maystro_tracking_id`
- **عرض Badge**: مع لون indigo وأيقونة طائرة

## 🔐 متطلبات الإعداد

### **إعدادات قاعدة البيانات**
1. تشغيل `add_shipping_columns.sql` لإضافة الحقول
2. تشغيل `add_maystro_delivery_provider.sql` لإضافة المزود

### **إعدادات المؤسسة**
في `shipping_provider_settings`:
```sql
INSERT INTO shipping_provider_settings (
  organization_id: 'your-org-id',
  provider_id: (SELECT id FROM shipping_providers WHERE code = 'maystro'),
  api_token: 'your-maystro-api-token',
  is_enabled: true,
  auto_shipping: false
)
```

## 📊 واجهة برمجة تطبيقات Maystro

### **المصادقة**
```
Authorization: Token {API_TOKEN}
```

### **نقطة النهاية الرئيسية**
```
POST https://backend.maystro-delivery.com/api/stores/orders/
```

### **استجابة API**
```json
{
  "id": 12345,
  "tracking_number": "MAY123456789",
  "status": "created",
  // ... بيانات أخرى
}
```

## 🎨 الميزات الجديدة

### **في عمود الشحن**
- ✅ **عرض Badge**: مايسترو ديليفري مع لون indigo
- ✅ **أيقونة طائرة**: مميزة لـ Maystro
- ✅ **رقم التتبع**: عرض `maystro_tracking_id`
- ✅ **اختيار من القائمة**: إرسال مباشر إلى Maystro

### **في النظام الموحد**
- ✅ **إرسال موحد**: نفس الطريقة مع ياليدين وزر إكسبرس
- ✅ **معالجة أخطاء**: رسائل واضحة بالعربية
- ✅ **تحديث تلقائي**: للطلب والواجهة
- ✅ **تتبع ديناميكي**: أرقام تتبع بادئة `MAY`

## 🔍 طريقة الاستخدام

### **للمطور**
```typescript
// إرسال طلب إلى Maystro
const result = await sendOrderToShippingProvider(
  'order-id',
  'maystro', 
  'organization-id'
);
```

### **للمستخدم**
1. فتح صفحة الطلبات
2. النقر على "اختر شركة التوصيل" في عمود الشحن
3. اختيار "مايسترو ديليفري"
4. انتظار رسالة التأكيد

## 🚀 الحالة النهائية

### **✅ مكتمل**
- ✅ تكامل API مع Maystro Delivery
- ✅ دعم النظام الموحد
- ✅ واجهة مستخدم محسنة
- ✅ معالجة البيانات والأخطاء
- ✅ قاعدة بيانات محدثة
- ✅ تتبع أرقام التتبع

### **📋 الخطوات التالية (اختيارية)**
- 🔄 إضافة دعم جلب ملصقات الشحن
- 📊 تكامل مع واجهة تتبع Maystro
- ⚙️ إعدادات متقدمة للمؤسسة
- 🧪 اختبارات تلقائية للتكامل

---

## 📞 الدعم الفني

- **API Documentation**: https://maystro.gitbook.io/maystro-delivery-documentation
- **الموقع الرسمي**: https://maystro-delivery.com/
- **صفحة الدعم**: https://maystro-delivery.com/ContactUS.html
- **تتبع الطرود**: https://maystro-delivery.com/trackingSD.html

---

**تم الإنجاز بتاريخ**: `{current_date}`  
**النسخة**: v1.0.0  
**الحالة**: جاهز للإنتاج ✅ 