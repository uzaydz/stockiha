# 🔍 دليل نظام مراقبة المخزون في نقطة البيع

## 📋 المحتويات
1. [التفعيل والاستخدام](#التفعيل-والاستخدام)
2. [كيفية مراقبة العمليات](#كيفية-مراقبة-العمليات)
3. [فهم الرسائل](#فهم-الرسائل)
4. [التقارير والتحليل](#التقارير-والتحليل)
5. [استكشاف الأخطاء](#استكشاف-الأخطاء)

## 🚀 التفعيل والاستخدام

### التفعيل التلقائي
نظام مراقبة المخزون مفعل بشكل افتراضي ويسجل جميع العمليات تلقائياً.

### الوصول لوحة التحكم
```javascript
// في وحدة تحكم المطور (F12)
window.inventoryLogger

// عرض ملخص السجلات
inventoryLogger.printSummary()

// عرض جميع السجلات
inventoryLogger.getLogs()

// تصدير السجلات
inventoryLogger.exportLogs()
```

## 👀 كيفية مراقبة العمليات

### أثناء البيع العادي
عند إضافة منتج للسلة، ستظهر الرسائل التالية:

```
🔍 [INVENTORY] ➕ إضافة منتج للسلة - ProductCatalogOptimized.handleProductClick
⏰ الوقت: [الوقت الحالي]
📦 المنتج: اسم المنتج (ID)
📈 الكمية: 1
📋 تفاصيل إضافية: { operation: 'SALE_MODE', currentStock: 10, price: 100 }
```

```
🔍 [INVENTORY] 🔄 تحديث المخزون - ProductCatalogOptimized.handleProductClick.localUpdate
📊 المخزون: 10 → 9 (-1)
```

### أثناء الإرجاع
```
🔍 [INVENTORY] ➕ إضافة منتج للسلة - ProductCatalogOptimized.handleProductClick
📋 تفاصيل إضافية: { operation: 'RETURN_MODE', currentStock: 9 }
```

### أثناء إتمام الطلب
```
🔍 [INVENTORY] 🧾 تقديم الطلب - posOrderService.createPOSOrder
📋 تفاصيل إضافية: { operation: 'CREATE_POS_ORDER_START', total: 200, itemsCount: 2 }
```

### تحديث المخزون عبر FIFO
```
🔍 [INVENTORY] 🔄 تحديث المخزون - posOrderService.updateInventoryForOrder.processItem
📋 تفاصيل إضافية: { operation: 'FIFO_PROCESSING_START', quantity: 2 }
```

## 📊 فهم الرسائل

### رموز العمليات
- ➕ **إضافة منتج للسلة**
- ➖ **إزالة منتج من السلة**
- 🔄 **تحديث المخزون**
- 🧾 **تقديم الطلب**
- ↩️ **إرجاع منتج**
- 💾 **تحديث الكاش**
- 🌐 **مزامنة مع الخادم**
- ❌ **خطأ**

### معلومات المخزون
```
📊 المخزون: 10 → 9 (-1)
```
- `10`: المخزون قبل العملية
- `9`: المخزون بعد العملية
- `(-1)`: التغيير (سالب = نقصان، موجب = زيادة)

### المتغيرات
```
🎨 المتغيرات: لون: أحمر, حجم: كبير
```

## 📈 التقارير والتحليل

### عرض ملخص شامل
```javascript
inventoryLogger.printSummary()
```

### البحث عن منتج معين
```javascript
// عرض جميع العمليات لمنتج معين
inventoryLogger.getLogsForProduct('product-id-here')
```

### البحث عن طلب معين
```javascript
// عرض جميع العمليات لطلب معين
inventoryLogger.getLogsForOrder('order-id-here')
```

### البحث في فترة زمنية
```javascript
// عرض السجلات في فترة معينة
const startTime = '2024-01-01T00:00:00.000Z'
const endTime = '2024-01-02T00:00:00.000Z'
inventoryLogger.getLogsInTimeRange(startTime, endTime)
```

### تصدير البيانات
```javascript
// تصدير جميع السجلات لملف JSON
const exportData = inventoryLogger.exportLogs()
console.log(exportData)

// يمكنك نسخ هذا النص وحفظه في ملف .json
```

## 🔧 استكشاف الأخطاء

### سيناريوهات شائعة ومراقبتها

#### 1. محاولة بيع منتج نفذت كميته
```
🔍 [INVENTORY] ❌ خطأ - ProductCatalogOptimized.handleProductClick
📋 تفاصيل إضافية: { error: 'محاولة إضافة منتج نفذت كميته', currentStock: 0 }
```

#### 2. تضارب في تحديث المخزون
```
🔍 [INVENTORY] ❌ خطأ - posOrderService.updateInventoryForOrder
📋 تفاصيل إضافية: { operation: 'DUPLICATE_UPDATE_PREVENTED' }
```

#### 3. فشل مزامنة مع الخادم
```
🔍 [INVENTORY] ❌ خطأ - POS.handleRefreshData
📋 تفاصيل إضافية: { error: 'Network error' }
```

### خطوات التشخيص

#### 1. تحقق من آخر العمليات
```javascript
// عرض آخر 10 سجلات
inventoryLogger.getLogs().slice(-10)
```

#### 2. ابحث عن الأخطاء
```javascript
// البحث عن جميع الأخطاء
inventoryLogger.getLogs().filter(log => log.action.includes('❌'))
```

#### 3. تتبع منتج معين
```javascript
// تتبع جميع العمليات لمنتج معين
const productId = 'your-product-id'
const productLogs = inventoryLogger.getLogsForProduct(productId)
console.table(productLogs.map(log => ({
  وقت: new Date(log.timestamp).toLocaleString('ar-SA'),
  عملية: log.action,
  مكان: log.location,
  مخزون_قديم: log.oldStock,
  مخزون_جديد: log.newStock,
  كمية: log.quantity
})))
```

## 🎯 نصائح للاستخدام الفعال

### 1. مراقبة مستمرة
- اتركي وحدة تحكم المطور مفتوحة أثناء العمل
- راقبي الرسائل الحمراء (الأخطاء) بعناية
- انتبهي للتحديثات المضاعفة

### 2. التشخيص السريع
```javascript
// دالة سريعة للتشخيص
function quickDiagnosis() {
  const logs = inventoryLogger.getLogs()
  const lastHour = new Date(Date.now() - 60*60*1000).toISOString()
  const recentLogs = logs.filter(log => log.timestamp > lastHour)
  
  console.log(`📊 السجلات في آخر ساعة: ${recentLogs.length}`)
  console.log(`❌ الأخطاء: ${recentLogs.filter(log => log.action.includes('❌')).length}`)
  console.log(`🔄 تحديثات المخزون: ${recentLogs.filter(log => log.action.includes('تحديث المخزون')).length}`)
  
  return recentLogs
}

// استخدم هذه الدالة للحصول على نظرة سريعة
quickDiagnosis()
```

### 3. تنظيف السجلات
```javascript
// مسح السجلات القديمة (يحفظ آخر 1000 سجل تلقائياً)
inventoryLogger.clearLogs()
```

### 4. إيقاف/تشغيل المراقبة
```javascript
// إيقاف المراقبة مؤقتاً (لتحسين الأداء)
inventoryLogger.disable()

// إعادة تشغيل المراقبة
inventoryLogger.enable()
```

## 🔍 مراقبة مشاكل محددة

### مشكلة: المخزون لا يتحدث بشكل صحيح
```javascript
// تتبع تحديثات المخزون فقط
inventoryLogger.getLogs()
  .filter(log => log.action.includes('تحديث المخزون'))
  .map(log => ({
    منتج: log.productName,
    من: log.oldStock,
    إلى: log.newStock,
    تغيير: log.quantity,
    وقت: new Date(log.timestamp).toLocaleString('ar-SA'),
    مكان: log.location
  }))
```

### مشكلة: طلب لم يكتمل بشكل صحيح
```javascript
// تتبع طلب معين
const orderId = 'your-order-id'
const orderLogs = inventoryLogger.getLogsForOrder(orderId)
console.table(orderLogs.map(log => ({
  خطوة: log.action,
  وقت: new Date(log.timestamp).toLocaleString('ar-SA'),
  تفاصيل: JSON.stringify(log.details)
})))
```

---

## 🚨 ملاحظات مهمة

1. **الأداء**: النظام محسن ولا يؤثر على الأداء، لكن يمكن إيقافه عند الحاجة
2. **الخصوصية**: السجلات محلية فقط ولا ترسل للخادم
3. **التخزين**: يحفظ آخر 1000 سجل تلقائياً
4. **التحديث**: السجلات تختفي عند تحديث الصفحة

استخدمي هذا النظام لفهم كيفية تعامل النظام مع المخزون وتشخيص أي مشاكل بسرعة! 🎯 