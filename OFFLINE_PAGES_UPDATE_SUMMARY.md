# ملخص تحديث الصفحات للعمل بوضع الأوفلاين

## نظرة عامة
تم تحديث جميع الصفحات الرئيسية لاستخدام الخدمات المحلية (Local Services) مع دعم كامل للعمل بدون اتصال بالإنترنت.

## الصفحات المحدثة ✅

### 1. صفحة الفواتير (Invoices.tsx)
**المسار:** `src/pages/dashboard/Invoices.tsx`

**التحديثات:**
- ✅ استيراد `getAllLocalInvoices` من `localInvoiceService`
- ✅ استيراد `syncPendingInvoices` و `fetchInvoicesFromServer` من `syncInvoices`
- ✅ استخدام `useNetworkStatus` hook للتحقق من حالة الاتصال
- ✅ إضافة حالة `isSyncing` لتتبع عملية المزامنة
- ✅ تحديث `fetchInvoices` لجلب البيانات من المخزن المحلي
- ✅ تحويل `LocalInvoice` إلى `Invoice` مع جلب العناصر من `invoiceItems`
- ✅ إضافة دالة `syncInBackground` للمزامنة التلقائية
- ✅ تحديث `handleInvoiceCreated` لإظهار رسالة المزامنة المؤجلة
- ✅ تحديث حالة Layout لعرض حالة الاتصال الصحيحة

**المميزات:**
- عرض مؤشرات حالة المزامنة (`_synced`, `_syncStatus`)
- رسائل توضيحية عند العمل بدون اتصال
- مزامنة تلقائية في الخلفية عند توفر الاتصال
- عرض أرقام الفواتير المؤقتة قبل المزامنة

---

### 2. صفحة ديون العملاء (CustomerDebts.tsx)
**المسار:** `src/pages/dashboard/CustomerDebts.tsx`

**التحديثات:**
- ✅ استيراد `getAllLocalDebts` و `recordLocalDebtPayment` من `localCustomerDebtService`
- ✅ استيراد `syncPendingCustomerDebts` و `fetchCustomerDebtsFromServer` من `syncCustomerDebts`
- ✅ استخدام `useNetworkStatus` hook
- ✅ إضافة حالة `isSyncing`
- ✅ تحديث `fetchDebtsData` لجلب من المخزن المحلي
- ✅ إضافة دالة `convertLocalDebtsToDebtsData` لتحويل البيانات
- ✅ تحديث `handleRecordPayment` لاستخدام `recordLocalDebtPayment`
- ✅ إضافة دالة `syncInBackground`
- ✅ تحديث حالة Layout

**المميزات:**
- تجميع الديون حسب العميل
- حساب الإحصائيات من البيانات المحلية
- تسجيل الدفعات بدون اتصال
- مزامنة تلقائية للدفعات المسجلة

---

### 3. صفحة إرجاع المنتجات (ProductReturns.tsx)
**المسار:** `src/pages/returns/ProductReturns.tsx`

**التحديثات:**
- ✅ استيراد الخدمات المحلية من `localProductReturnService`
- ✅ استيراد خدمات المزامنة من `syncProductReturns`
- ✅ استخدام `useNetworkStatus` hook
- ✅ إضافة حالة `isSyncing`
- ✅ تحديث `fetchReturns` لجلب من المخزن المحلي
- ✅ تحويل `LocalProductReturn` إلى `Return` مع جلب العناصر
- ✅ تطبيق الفلاتر والبحث على البيانات المحلية
- ✅ إضافة دالة `syncInBackground`

**المميزات:**
- إنشاء طلبات إرجاع بدون اتصال
- الموافقة/الرفض محلياً
- تتبع حالة المزامنة لكل طلب
- دعم الإرجاع المباشر والإرجاع من طلب

---

### 4. صفحة التصريح بالخسائر (LossDeclarations.tsx)
**المسار:** `src/pages/losses/LossDeclarations.tsx`

**التحديثات:**
- ✅ استيراد الخدمات المحلية من `localLossDeclarationService`
- ✅ استيراد خدمات المزامنة من `syncLossDeclarations`
- ✅ استخدام `useNetworkStatus` hook
- ⏳ **جاري العمل على باقي التحديثات**

**المميزات المخططة:**
- تسجيل الخسائر بدون اتصال
- الموافقة/الرفض محلياً
- تعديل المخزون تلقائياً عند الموافقة
- مزامنة تلقائية

---

## النمط المتبع في جميع الصفحات

### 1. الاستيرادات الأساسية
```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getAllLocalXXX, createLocalXXX } from '@/api/localXXXService';
import { syncPendingXXX, fetchXXXFromServer } from '@/api/syncXXX';
import { inventoryDB } from '@/database/localDb';
```

### 2. الحالات (State)
```typescript
const { isOnline } = useNetworkStatus();
const [isSyncing, setIsSyncing] = useState(false);
```

### 3. دالة جلب البيانات
```typescript
const fetchData = async () => {
  // 1. جلب من المخزن المحلي
  const localData = await getAllLocalXXX(organizationId);
  
  // 2. تحويل البيانات للتنسيق المطلوب
  const convertedData = convertLocalToDisplay(localData);
  
  // 3. تطبيق الفلاتر
  const filteredData = applyFilters(convertedData);
  
  // 4. تحديث الحالة
  setData(filteredData);
  
  // 5. مزامنة في الخلفية إذا متصل
  if (isOnline) {
    syncInBackground();
  }
};
```

### 4. دالة المزامنة في الخلفية
```typescript
const syncInBackground = async () => {
  if (!isOnline || !currentOrganization) return;
  
  try {
    setIsSyncing(true);
    
    // مزامنة البيانات المعلقة
    const syncResult = await syncPendingXXX();
    
    // جلب البيانات الجديدة من السيرفر
    await fetchXXXFromServer(organizationId);
    
    // تحديث القائمة
    await fetchData();
  } catch (error) {
    console.error('خطأ في المزامنة:', error);
  } finally {
    setIsSyncing(false);
  }
};
```

### 5. معالجات الإنشاء/التحديث
```typescript
const handleCreate = async (data) => {
  // حفظ محلياً
  await createLocalXXX(data);
  
  // رسالة نجاح مع تنبيه المزامنة
  toast.success('تم الحفظ بنجاح' + 
    (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
  
  // مزامنة فورية إذا متصل
  if (isOnline) {
    setTimeout(() => syncInBackground(), 1000);
  }
};
```

### 6. تحديث حالة Layout
```typescript
useEffect(() => {
  if (!onLayoutStateChange) return;
  onLayoutStateChange({
    isRefreshing: isLoading || isSyncing,
    connectionStatus: isOnline ? 'connected' : 'disconnected'
  });
}, [isLoading, isSyncing, isOnline]);
```

---

## مؤشرات حالة المزامنة في الواجهة

### في قوائم العناصر (InvoicesList, etc.)
```typescript
{(item as any)._synced === false && (
  <Badge variant="outline" className="bg-orange-50 text-orange-600">
    <Clock className="h-3 w-3 mr-1" />
    غير متزامن
  </Badge>
)}

{(item as any)._syncStatus === 'error' && (
  <Badge variant="destructive">
    <WifiOff className="h-3 w-3 mr-1" />
    خطأ
  </Badge>
)}
```

---

## الخطوات المتبقية

### ✅ مكتمل
1. صفحة الفواتير
2. صفحة ديون العملاء
3. صفحة إرجاع المنتجات

### ⏳ قيد العمل
4. صفحة التصريح بالخسائر

### 📋 معلق
5. صفحة إدارة العملاء

---

## الفوائد المحققة

### 1. **موثوقية عالية**
- العمل بدون انقطاع حتى مع فقدان الاتصال
- عدم فقدان البيانات
- مزامنة تلقائية عند عودة الاتصال

### 2. **تجربة مستخدم محسنة**
- استجابة فورية (لا انتظار للسيرفر)
- مؤشرات واضحة لحالة المزامنة
- رسائل توضيحية

### 3. **أداء أفضل**
- تقليل الطلبات للسيرفر
- تحميل أسرع للبيانات
- استخدام أمثل للموارد

### 4. **مرونة في العمل**
- إمكانية العمل في المناطق ضعيفة الاتصال
- الاستمرار في العمل أثناء صيانة السيرفر
- دعم السيناريوهات المختلفة

---

## ملاحظات تقنية

### استراتيجية حل التعارضات
- **Server Win**: السيرفر له الأولوية في حالة التعارض
- يتم تحديث البيانات المحلية بنسخة السيرفر
- يتم الاحتفاظ بسجل للتعارضات في console

### إدارة الأخطاء
- إعادة المحاولة التلقائية (3 مرات)
- Exponential backoff
- تسجيل الأخطاء في console
- رسائل واضحة للمستخدم

### التنظيف التلقائي
- حذف السجلات المتزامنة بنجاح
- حذف السجلات المحذوفة بعد المزامنة
- الاحتفاظ بالسجلات الفاشلة للمراجعة

---

## الاختبار

### سيناريوهات الاختبار المطلوبة
1. ✅ إنشاء عنصر بدون اتصال
2. ✅ تحديث عنصر بدون اتصال
3. ✅ حذف عنصر بدون اتصال
4. ✅ المزامنة عند عودة الاتصال
5. ⏳ التعامل مع التعارضات
6. ⏳ التعامل مع أخطاء المزامنة
7. ⏳ الفلاتر والبحث على البيانات المحلية

---

## التوثيق

### للمطورين
- كل دالة موثقة بتعليقات واضحة
- أسماء متغيرات وصفية
- نمط موحد عبر جميع الصفحات

### للمستخدمين
- رسائل واضحة بالعربية
- مؤشرات بصرية لحالة المزامنة
- تنبيهات عند العمل بدون اتصال

---

تم التحديث: 23 أكتوبر 2025
