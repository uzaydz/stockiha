# 📦 دليل تفعيل نظام تتبع شحنات ياليدين

## ✅ ما تم إنشاؤه

تم إنشاء نظام تتبع شحنات ياليدين بالكامل مع التحسينات التالية:

### 1. قاعدة البيانات
- ✅ جدول `yalidine_delivery_history` - لتخزين سجل التتبع
- ✅ جدول `yalidine_tracking_cache` - لتجنب Rate Limit
- ✅ Functions ذكية (`should_refresh_tracking`, `get_latest_tracking_status`)
- ✅ View `orders_latest_tracking` - لعرض آخر حالة بسرعة
- ✅ RLS Policies محكمة للأمان
- ✅ Indexes محسّنة للأداء

### 2. الملفات المُنشأة

```
📁 supabase/migrations/
  └── 20250114_create_yalidine_tracking_history.sql

📁 src/types/
  └── yalidineTracking.ts

📁 src/api/yalidine/
  └── trackingService.ts

📁 src/hooks/
  └── useTrackingHistory.ts

📁 src/components/orders/table/
  ├── TrackingStatusColumn.tsx
  └── TrackingTimeline.tsx
```

---

## 🚀 خطوات التفعيل

### المرحلة 1: تطبيق Migration

```bash
# إذا كنت تستخدم Supabase CLI
supabase db push

# أو قم بتنفيذ الملف يدوياً في Supabase Dashboard
# SQL Editor -> New Query -> الصق محتوى الملف
```

### المرحلة 2: دمج عمود التتبع في جدول الطلبات

#### خيار أ: إضافة عمود في الجدول الرئيسي

أضف هذا في ملف جدول الطلبات (مثلاً `src/components/orders/table/OrdersTable.tsx`):

```tsx
import TrackingStatusColumn from './TrackingStatusColumn';

// في تعريف الأعمدة (columns)
const columns = [
  // ... الأعمدة الموجودة

  // عمود التتبع (أضفه بين العمود المناسب)
  {
    id: 'tracking',
    header: 'التتبع',
    accessorKey: 'yalidine_tracking_id',
    cell: ({ row }) => {
      const order = row.original;

      // فقط للطلبات المُرسلة لياليدين
      if (!order.yalidine_tracking_id) {
        return <span className="text-muted-foreground text-xs">-</span>;
      }

      return (
        <TrackingStatusColumn
          orderId={order.id}
          trackingNumber={order.yalidine_tracking_id}
          provider="yalidine"
        />
      );
    },
    size: 150, // عرض العمود
  },

  // ... باقي الأعمدة
];
```

#### خيار ب: إضافة في OrderTableRow (إذا كنت تستخدم custom rows)

```tsx
import TrackingStatusColumn from './TrackingStatusColumn';

// في مكون OrderTableRow
<TableCell>
  <TrackingStatusColumn
    orderId={order.id}
    trackingNumber={order.yalidine_tracking_id}
    provider="yalidine"
  />
</TableCell>
```

### المرحلة 3: إضافة عمود في OrdersTableMobile (للجوال)

في `src/components/orders/OrdersTableMobile.tsx`:

```tsx
import TrackingStatusColumn from './table/TrackingStatusColumn';

// في OrderCard Component
{order.yalidine_tracking_id && (
  <div className="flex items-center justify-between py-2 border-t">
    <span className="text-sm text-muted-foreground">التتبع</span>
    <TrackingStatusColumn
      orderId={order.id}
      trackingNumber={order.yalidine_tracking_id}
      provider="yalidine"
      size="sm"
    />
  </div>
)}
```

---

## 🎯 الميزات الذكية المُدمجة

### 1. Smart Caching
- ❌ لا يُحدّث الطلبات المُكتملة (delivered, returned, cancelled)
- ⏱️ TTL ديناميكي حسب الحالة:
  - في طريق التوصيل: كل 15 دقيقة
  - في المركز: كل 30 دقيقة
  - تم التسليم: لا يُحدّث (حالة نهائية)

### 2. Lazy Loading
- 📦 لا يتم جلب البيانات إلا عند فتح Popover
- 💾 يُخزّن في React Query Cache
- 🚀 تحميل سريع من الكاش عند الفتح المتكرر

### 3. Batch Processing
- 🔄 معالجة 5 طلبات في الدفعة الواحدة
- ⏱️ تأخير 2 ثانية بين الدفعات
- 🛡️ حماية من Rate Limit

### 4. Auto Refresh
```typescript
// لتحديث تلقائي كل 30 دقيقة
<TrackingStatusColumn
  orderId={order.id}
  trackingNumber={order.yalidine_tracking_id}
  enableAutoRefresh={true}
/>
```

---

## 📊 استخدام Hook مباشرة

إذا كنت تريد استخدام البيانات في مكان آخر:

```tsx
import { useTrackingHistory } from '@/hooks/useTrackingHistory';

function MyComponent({ orderId, trackingNumber }) {
  const {
    history,           // سجل التتبع الكامل
    latestEvent,       // آخر حالة
    hasHistory,        // هل يوجد سجل؟
    isLoading,         // جاري التحميل؟
    isRefreshing,      // جاري التحديث؟
    isFinal,           // حالة نهائية؟
    refresh,           // دالة التحديث
    forceRefresh,      // تحديث إجباري
  } = useTrackingHistory({
    orderId,
    trackingNumber,
    lazy: true,        // lazy loading
  });

  return (
    <div>
      {latestEvent && (
        <p>آخر حالة: {latestEvent.status_ar}</p>
      )}
      <button onClick={refresh}>تحديث</button>
    </div>
  );
}
```

---

## 🔧 التحديث التلقائي للطلبات النشطة (Cron Job)

### استخدام Node.js Cron

```typescript
// في ملف server/cron.ts (إذا كان لديك server)
import { autoRefreshActiveYalidineOrders } from '@/api/yalidine/trackingService';

// كل 30 دقيقة
setInterval(async () => {
  try {
    await autoRefreshActiveYalidineOrders('your-org-id', 50);
  } catch (error) {
    console.error('Cron error:', error);
  }
}, 30 * 60 * 1000);
```

### استخدام Supabase Edge Functions

```typescript
// supabase/functions/yalidine-tracking-cron/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // جلب الطلبات النشطة
  const { data: orders } = await supabase
    .from('orders')
    .select('id, yalidine_tracking_id')
    .not('yalidine_tracking_id', 'is', null)
    .not('status', 'in', '(delivered,cancelled,returned)')
    .limit(100);

  // تحديث...

  return new Response(JSON.stringify({ success: true }))
})
```

---

## 🎨 تخصيص المظهر

### تغيير حجم Badge

```tsx
<TrackingStatusColumn
  size="sm"  // sm, md, lg
  {...props}
/>
```

### تخصيص الألوان

عدّل في `src/types/yalidineTracking.ts`:

```typescript
export const TRACKING_STATUS_COLORS: Record<TrackingStatus, string> = {
  [TrackingStatus.DELIVERED]: 'bg-green-100 text-green-800',
  // ... الألوان الأخرى
};
```

---

## 🧪 الاختبار

### 1. اختبار عمود التتبع

```tsx
// في console المتصفح
// جلب طلب له tracking number
const order = orders.find(o => o.yalidine_tracking_id);
console.log(order);
```

### 2. اختبار التحديث اليدوي

```typescript
import { refreshTrackingHistory } from '@/api/yalidine/trackingService';

await refreshTrackingHistory(
  'org-id',
  'order-id',
  'YAL-123456',
  true // force refresh
);
```

### 3. اختبار Smart Cache

```sql
-- في Supabase SQL Editor
SELECT * FROM yalidine_tracking_cache;
SELECT * FROM yalidine_delivery_history
WHERE order_id = 'your-order-id';
```

---

## ⚡ نصائح الأداء

### 1. تحديد عدد الطلبات في الصفحة
```tsx
// لا تعرض أكثر من 50-100 طلب في الصفحة الواحدة
const limit = 50;
```

### 2. تفعيل Virtual Scrolling
```tsx
// إذا كان لديك عدد كبير من الطلبات
import { useVirtualizer } from '@tanstack/react-virtual';
```

### 3. استخدام React.memo
```tsx
// المكونات محسّنة بالفعل بـ memo
const OrderRow = memo(({ order }) => {
  // ...
});
```

---

## 🐛 استكشاف الأخطاء

### مشكلة: "لا توجد سجلات تتبع"

**الحل:**
1. تأكد من وجود `yalidine_tracking_id` في الطلب
2. تحقق من أن Migration تم تطبيقه
3. افتح Console وتحقق من الأخطاء

### مشكلة: "Rate Limit Exceeded"

**الحل:**
- النظام يحمي تلقائياً من هذه المشكلة
- إذا حدثت، سيستخدم البيانات المحفوظة
- انتظر 1-2 دقيقة وحاول مرة أخرى

### مشكلة: "خطأ في جلب البيانات"

**الحل:**
1. تحقق من بيانات اعتماد ياليدين في الإعدادات
2. تأكد من RLS Policies صحيحة
3. تحقق من Console للأخطاء

---

## 📈 الإحصائيات والمراقبة

### عرض إحصائيات الكاش

```sql
-- عدد الطلبات المُتتبعة
SELECT COUNT(*) FROM yalidine_tracking_cache;

-- الطلبات التي تحتاج تحديث
SELECT * FROM yalidine_tracking_cache
WHERE should_refresh_tracking(tracking_number) = true;

-- توزيع الحالات
SELECT status_normalized, COUNT(*)
FROM yalidine_delivery_history
GROUP BY status_normalized;
```

---

## 🔐 الأمان

- ✅ RLS مُفعّل على جميع الجداول
- ✅ المستخدم يرى فقط طلبات مؤسسته
- ✅ Service Role فقط يمكنه الكتابة
- ✅ بيانات الاعتماد مخزنة بأمان

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من هذا الملف أولاً
2. افتح Console المتصفح للأخطاء
3. تحقق من Supabase Logs
4. راجع الكود المصدري مع التعليقات

---

## 🎉 خلاصة

الآن لديك نظام تتبع شحنات ياليدين:
- ✅ **محسّن للأداء** - Lazy Loading + Smart Caching
- ✅ **آمن من Rate Limit** - Batch Processing + TTL
- ✅ **سهل الاستخدام** - مكون واحد فقط
- ✅ **مُحسّن للقاعدة** - Indexes + Views + Functions
- ✅ **آمن** - RLS + Policies

**استمتع بالتتبع! 🚀**
