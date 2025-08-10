# مكونات إدارة الطلبات المتجاوبة

هذا المجلد يحتوي على مكونات محسنة لعرض وإدارة الطلبات بطريقة متجاوبة ومحسنة للهاتف.

## المكونات الرئيسية

### `ResponsiveOrdersTable`
المكون الرئيسي الذي يتعامل تلقائياً مع العرض المناسب:
- **الكمبيوتر المكتبي**: عرض جدول تقليدي مع جميع الأعمدة
- **الهاتف والتابلت**: عرض بطاقات متجاوبة ومحسنة

### `OrdersCardView`
مكون خاص بعرض الطلبات كبطاقات مع:
- تصميم محسن للهاتف
- وضعين للعرض: شبكة وقائمة
- أداء محسن مع التحميل التدريجي
- تفاعلات لمسية محسنة

### `OrderCard`
بطاقة فردية لعرض طلب واحد تحتوي على:
- جميع المعلومات المهمة للطلب
- تصميم مضغوط ومرتب
- أزرار الإجراءات المحسنة للهاتف
- معلومات العميل وحالة الطلب

## الميزات الجديدة

### 1. التجاوب التلقائي
```tsx
<ResponsiveOrdersTable
  orders={orders}
  loading={loading}
  forceViewMode="auto" // تجاوب تلقائي
/>
```

### 2. فرض وضع معين
```tsx
<ResponsiveOrdersTable
  orders={orders}
  loading={loading}
  forceViewMode="cards" // فرض البطاقات
/>
```

### 3. تخصيص العرض للهاتف
```tsx
<ResponsiveOrdersTable
  orders={orders}
  loading={loading}
  defaultMobileViewMode="grid" // شبكة أو قائمة
  autoLoadMoreOnScroll={true} // تحميل تلقائي
/>
```

## التحسينات المضافة

### الأداء
- ✅ Lazy loading للبيانات
- ✅ Virtualization للقوائم الطويلة
- ✅ تحسين الذاكرة مع `memo`
- ✅ تحميل تدريجي مع Infinite Scroll

### تجربة المستخدم
- ✅ تفاعلات لمسية محسنة
- ✅ تصميم متجاوب كامل
- ✅ حفظ تفضيلات المستخدم
- ✅ انتقالات سلسة بين الأوضاع

### إمكانية الوصول
- ✅ دعم قارئات الشاشة
- ✅ التنقل بالكيبورد
- ✅ ألوان متباينة
- ✅ أحجام خطوط قابلة للتعديل

## الاستخدام

### الاستخدام الأساسي
```tsx
import { ResponsiveOrdersTable } from '@/components/orders';

function OrdersPage() {
  return (
    <ResponsiveOrdersTable
      orders={orders}
      loading={loading}
      onUpdateStatus={handleUpdateStatus}
      onUpdateCallConfirmation={handleCallConfirmation}
      hasUpdatePermission={hasPermission}
      hasCancelPermission={hasCancelPermission}
    />
  );
}
```

### الاستخدام المتقدم
```tsx
import { ResponsiveOrdersTable } from '@/components/orders';

function OrdersPage() {
  return (
    <ResponsiveOrdersTable
      orders={orders}
      loading={loading}
      // العرض المتجاوب
      forceViewMode="auto"
      defaultMobileViewMode="grid"
      
      // التحميل التدريجي
      autoLoadMoreOnScroll={true}
      onLoadMore={loadMoreOrders}
      hasMoreOrders={hasMore}
      
      // البحث المتقدم
      onSearchTermChange={handleSearch}
      
      // الأعمدة المرئية
      visibleColumns={[
        "checkbox", "expand", "id", 
        "customer_name", "total", "status"
      ]}
    />
  );
}
```

## الملفات

```
src/components/orders/
├── README.md                     # هذا الملف
├── index.ts                      # تصديرات المكونات
├── OrdersExample.tsx             # أمثلة الاستخدام
├── ResponsiveOrdersTable.tsx     # المكون الرئيسي المتجاوب
├── cards/
│   ├── OrderCard.tsx            # بطاقة الطلب الفردية
│   └── OrdersCardView.tsx       # عرض البطاقات
├── table/
│   ├── OrdersTable.tsx          # الجدول التقليدي
│   ├── OrderTableTypes.ts       # تعريفات الأنواع
│   └── ...                      # مكونات الجدول الأخرى
└── styles/
    └── orders-cards.css         # تنسيقات البطاقات
```

## التخصيص

### إضافة تنسيقات مخصصة
```css
/* في ملف CSS مخصص */
.order-card.custom-theme {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

### إضافة خصائص جديدة للبطاقات
```tsx
// تمديد نوع Order في OrderTableTypes.ts
export type Order = {
  // ... الخصائص الموجودة
  custom_field?: string;
  priority?: 'high' | 'medium' | 'low';
};
```

## الاختبار

للاختبار على أجهزة مختلفة:

1. **الكمبيوتر المكتبي**: يجب أن يظهر جدول تقليدي
2. **التابلت**: يجب أن تظهر بطاقات في شبكة
3. **الهاتف**: يجب أن تظهر بطاقات في قائمة

## الدعم

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ أجهزة iOS و Android الحديثة
