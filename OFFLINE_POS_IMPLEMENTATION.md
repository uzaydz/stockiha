# 🔌 تنفيذ نظام POS بدون إنترنت (Offline-First)

## الملخص التنفيذي

تم تنفيذ **المرحلة الأولى (P0)** من خطة تحويل النظام إلى Offline كامل مع توحيد التتبع والتسعير.

### ✅ ما تم تنفيذه

| المرحلة | الوصف | الحالة |
|---------|-------|--------|
| 1 | Local Batch Service | ✅ مكتمل |
| 2 | Local Serial Service مع Reservation | ✅ مكتمل |
| 3 | Ledger Table (inventory_batch_movements) | ✅ مكتمل |
| 4 | توحيد getWarrantyMonths | ✅ مكتمل |
| 5 | تحديث usePOSOrder.ts | ✅ مكتمل |
| 6 | حقول الحجز في product_serial_numbers | ✅ مكتمل |
| 7 | hook useSerialReservation | ✅ مكتمل |
| 8 | تحديث SerialNumberInput (Offline) | ✅ مكتمل |
| 9 | تحديث BatchSelector (Offline) | ✅ مكتمل |
| 10 | تحديث usePOSCart (تحرير الحجوزات) | ✅ مكتمل |
| 11 | مكون ConflictAlert | ✅ مكتمل |

---

## 📁 الملفات الجديدة

### 1. `src/services/local/LocalBatchService.ts`
خدمة الدفعات المحلية - تعمل 100% offline.

**الميزات:**
- قراءة الدفعات بترتيب FEFO/FIFO
- استهلاك الدفعات مع دعم decimal (للوزن/المتر)
- تسجيل الحركات في ledger
- دعم تعدد الأجهزة

**الاستخدام:**
```typescript
import { useLocalBatchService } from '@/services/local';

const { consumeFromBatches, getProductBatchesFEFO } = useLocalBatchService();

// جلب الدفعات
const batches = await getProductBatchesFEFO(productId, orgId);

// استهلاك من الدفعات
const result = await consumeFromBatches({
  product_id: productId,
  organization_id: orgId,
  quantity: 2.5, // يدعم decimal
  unit_type: 'weight',
  reason: 'sale',
  order_id: orderId
});
```

### 2. `src/services/local/LocalSerialService.ts`
خدمة الأرقام التسلسلية المحلية مع نظام الحجز.

**الميزات:**
- قراءة الأرقام التسلسلية محلياً
- نظام حجز (reserve) مع timeout
- بيع محلي مع حساب الضمان
- معالجة التعارضات

**الاستخدام:**
```typescript
import { useLocalSerialService } from '@/services/local';

const { reserveSerial, sellSerial, releaseSerial } = useLocalSerialService();

// حجز رقم تسلسلي
const result = await reserveSerial({
  serial_number: 'IMEI123456',
  organization_id: orgId,
  order_draft_id: draftId,
  reservation_minutes: 30
});

// بيع
await sellSerial({
  serial_id: serialId,
  order_id: orderId,
  sold_price: 5000,
  warranty_months: 12
});
```

### 3. `src/services/local/warrantyUtils.ts`
أدوات موحدة لحساب الضمان.

**الاستخدام:**
```typescript
import { getWarrantyMonths, getWarrantyInfo } from '@/services/local';

// الحصول على أشهر الضمان (يتعامل مع جميع أسماء الحقول)
const months = getWarrantyMonths(product);

// معلومات الضمان الكاملة
const info = getWarrantyInfo(product, warrantyStartDate);
```

### 4. `src/hooks/useSerialReservation.ts`
Hook لإدارة حجز الأرقام التسلسلية عند الإضافة للسلة.

**الاستخدام:**
```typescript
import { useSerialReservation } from '@/hooks/useSerialReservation';

const {
  reserveSerial,
  releaseSerial,
  releaseAllReservations,
  isSerialReserved
} = useSerialReservation({
  reservationMinutes: 30,
  onConflict: (conflict) => {
    console.log('تعارض:', conflict);
  }
});

// عند إضافة منتج للسلة
await reserveSerial(serialNumber, orgId, productId, productName);

// عند إزالة من السلة
await releaseSerial(serialNumber, orgId);
```

---

## 📊 الجداول الجديدة في PowerSyncSchema

### 1. `inventory_batch_movements` (Ledger)
سجل حركات الدفعات للتدقيق.

```typescript
{
  organization_id: string;
  batch_id: string;
  product_id: string;
  delta_quantity: number; // decimal - سالب للاستهلاك
  unit_type: 'piece' | 'weight' | 'meter' | 'box';
  source: 'sale' | 'return' | 'loss' | 'adjustment' | 'transfer';
  order_id?: string;
  device_id: string;
  synced: 0 | 1;
  created_at: string;
}
```

### 2. `serial_reservations`
سجل حجوزات الأرقام التسلسلية.

```typescript
{
  organization_id: string;
  serial_id: string;
  device_id: string;
  order_draft_id: string;
  reserved_at: string;
  expires_at: string;
  status: 'active' | 'released' | 'converted';
  released_at?: string;
  converted_order_id?: string;
}
```

### 3. حقول جديدة في `product_serial_numbers`
```typescript
{
  // ⚡ حقول الحجز
  reserved_by_device: string;
  reserved_at: string;
  reservation_expires_at: string;
  reservation_order_draft_id: string;
}
```

---

## 🔄 التغييرات في usePOSOrder.ts

### قبل (Supabase مباشر)
```typescript
// ❌ لا يعمل offline
import { consumeFromBatches } from '@/api/batchService';
import { sellSerial, findBySerialNumber } from '@/api/serialNumberService';

await consumeFromBatches(productId, orgId, quantity, options);
await sellSerial({ serial_id, order_id, ... });
```

### بعد (Local Services)
```typescript
// ✅ يعمل offline 100%
import { LocalBatchService, LocalSerialService, getWarrantyMonths } from '@/services/local';

const localBatchService = new LocalBatchService(powerSync);
const localSerialService = new LocalSerialService(powerSync);

await localBatchService.consumeFromBatches({
  product_id: productId,
  organization_id: orgId,
  quantity: quantityToConsume,
  unit_type: sellingUnit,
  reason: 'sale',
  order_id: orderId
});

await localSerialService.sellSerial({
  serial_id: serialId,
  order_id: orderId,
  warranty_months: getWarrantyMonths(product)
});
```

---

## 📝 قرارات التصميم

### 1. Decimal لـ quantity_remaining
- **القرار:** نعم - دعم decimal
- **السبب:** لدعم البيع بالوزن (2.5 kg) والمتر (3.7 m)

### 2. تعدد الأجهزة Offline
- **القرار:** نعم - دعم أكثر من جهاز
- **الحل:** نظام حجز (reservation) مع timeout + device_id

### 3. وقت حجز Serial
- **القرار:** عند الإضافة للسلة (ليس عند الدفع)
- **السبب:** أكثر أماناً لتفادي البيع المزدوج

---

## 🧪 سيناريوهات الاختبار

### 1. بيع وزن offline
```
1. افصل الإنترنت
2. بع 2.5 كجم من منتج
3. تحقق: المخزون انخفض محلياً
4. أعد الإنترنت
5. تحقق: المزامنة تمت بنجاح
```

### 2. بيع هاتف بـ IMEI
```
1. افصل الإنترنت
2. أضف هاتف للسلة (اختر IMEI)
3. تحقق: الـ IMEI محجوز
4. أتمم الدفع
5. تحقق: الـ IMEI تحول لـ sold
6. تحقق: الضمان محسوب صحيح
```

### 3. تعارض جهازين
```
جهاز 1:
1. افصل الإنترنت
2. احجز IMEI-001

جهاز 2:
1. حاول حجز نفس IMEI-001
2. يجب أن يظهر "محجوز من جهاز آخر"
```

### 4. انتهاء صلاحية الحجز
```
1. احجز IMEI لمدة 1 دقيقة
2. انتظر دقيقتين
3. تحقق: الحجز انتهى والـ IMEI متاح مجدداً
```

---

## 🎨 مكونات UI الجديدة

### 1. `SerialNumberInput.tsx` (محدث v5.0)
مكون إدخال الأرقام التسلسلية - يعمل 100% offline.

**الميزات:**
- حجز تلقائي عند اختيار serial
- تحرير تلقائي عند الإزالة
- معالجة التعارضات (جهاز آخر حجز نفس الـ serial)
- دعم المسح بالباركود

**الاستخدام:**
```tsx
<SerialNumberInput
  productId={product.id}
  productName={product.name}
  organizationId={orgId}
  quantity={1}
  selectedSerials={serials}
  orderDraftId={draftId}
  onSerialsChange={setSerials}
  onSerialReserved={(id, num) => console.log('محجوز:', num)}
  onSerialReleased={(id, num) => console.log('محرر:', num)}
  onConflict={(num, type) => console.log('تعارض:', type)}
  reservationMinutes={30}
/>
```

### 2. `BatchSelector.tsx` (محدث v2.0)
مكون اختيار الدفعة - يجلب الدفعات محلياً.

**الميزات:**
- جلب الدفعات من Local Service
- ترتيب FEFO/FIFO تلقائي
- تنبيهات الدفعات القريبة من الانتهاء
- دعم الكميات العشرية (decimal)

**الاستخدام:**
```tsx
<BatchSelector
  productId={product.id}
  productName={product.name}
  organizationId={orgId}
  requiredQuantity={2.5}
  unitType="weight"
  onBatchSelect={(id, num, data) => {
    console.log('الدفعة المختارة:', num);
  }}
  autoSelectFEFO={true}
/>
```

### 3. `ConflictAlert.tsx` (جديد v1.0)
مكون عرض تنبيهات التعارضات.

**الميزات:**
- عرض تعارضات الحجز والبيع
- مربع حوار للتفاصيل
- إزالة تلقائية بعد 30 ثانية
- Hook `useConflicts` لإدارة التعارضات

**الاستخدام:**
```tsx
import ConflictAlert, { useConflicts } from '@/components/pos-advanced/ConflictAlert';

const { conflicts, addConflict, dismissConflict, dismissAll } = useConflicts();

// إضافة تعارض
addConflict('already_reserved', {
  serialNumber: 'IMEI123',
  productName: 'iPhone 15',
  deviceName: 'كاشير 2'
});

// في JSX
<ConflictAlert
  conflicts={conflicts}
  onDismiss={dismissConflict}
  onDismissAll={dismissAll}
  onRetry={(conflict) => console.log('إعادة محاولة:', conflict)}
/>
```

---

## 🔄 التحديثات في usePOSCart

### تحرير الحجوزات تلقائياً
```typescript
// عند إزالة منتج من السلة
const removeItemFromCart = async (index: number) => {
  const item = cartItems[index];

  // ⚡ تحرير حجوزات الأرقام التسلسلية
  if (item?.serialIds) {
    for (const serialId of item.serialIds) {
      await localSerialService.releaseSerial(serialId);
    }
  }

  removeItemFromCartTab(activeTabId, index);
};

// عند مسح السلة
const clearCart = async () => {
  // ⚡ تحرير جميع الحجوزات
  for (const item of cartItems) {
    if (item.serialIds) {
      for (const serialId of item.serialIds) {
        await localSerialService.releaseSerial(serialId);
      }
    }
  }
  clearCartTab(activeTabId);
};
```

### دوال جديدة
```typescript
// تحديث الأرقام التسلسلية مع IDs
updateItemSerialNumbers(index, serialNumbers, serialIds);

// تحرير serial محدد
await releaseSerialFromItem(index, serialIdOrNumber, orgId);
```

---

## 🚀 الخطوات القادمة (P1/P2)

### P1 - مكتملة ✅
- [x] ربط useSerialReservation بواجهة POS ✅
- [x] إضافة UI لإدارة التعارضات ✅
- [x] تنبيهات انتهاء صلاحية الدفعات (ExpiringBatchesAlert) ✅
- [x] ربط ConflictAlert بصفحة POS الرئيسية ✅
- [x] تحديث CartItemComponent لدعم offline ✅
- [x] تحديث BatchSelector لجلب البيانات محلياً ✅

### P2 - لاحقاً
- [ ] تقارير حركات المخزون
- [ ] تحسين أداء المزامنة
- [ ] اختبارات E2E
- [ ] لوحة إدارة الحجوزات المنتهية

---

## 🎨 مكونات جديدة (v2.0)

### 4. `ExpiringBatchesAlert.tsx` (جديد v1.0)
مكون لعرض تنبيهات الدفعات القريبة من الانتهاء.

**الميزات:**
- تنبيهات تلقائية للدفعات القريبة من الانتهاء
- Hook `useExpiringBatches` لإدارة الدفعات
- فحص دوري قابل للتخصيص
- مربع حوار للتفاصيل

**الاستخدام:**
```tsx
import ExpiringBatchesAlert, { useExpiringBatches } from '@/components/pos-advanced/ExpiringBatchesAlert';

// في JSX
<ExpiringBatchesAlert
  organizationId={organizationId}
  daysAhead={30}
  checkInterval={5 * 60 * 1000} // 5 دقائق
  enabled={!isLossMode && !isReturnMode}
  onBatchClick={(batch) => console.log('الدفعة:', batch)}
/>

// أو استخدام الـ Hook مباشرة
const {
  expiringBatches,
  criticalCount, // دفعات تنتهي خلال 7 أيام
  warningCount,  // دفعات تنتهي خلال 30 يوم
  refresh,
  hasExpiring
} = useExpiringBatches(organizationId, { daysAhead: 30 });
```

---

## 📊 تكامل POSAdvanced.tsx

### التعارضات والتنبيهات
```tsx
// في POSAdvanced.tsx
import ConflictAlert, { useConflicts } from '@/components/pos-advanced/ConflictAlert';
import ExpiringBatchesAlert from '@/components/pos-advanced/ExpiringBatchesAlert';
import { useTenant } from '@/context/TenantContext';

// داخل المكون
const { currentOrganization } = useTenant();
const organizationId = currentOrganization?.id || '';
const { conflicts, addConflict, dismissConflict, dismissAll } = useConflicts();

// في JSX
<ConflictAlert
  conflicts={conflicts}
  onDismiss={dismissConflict}
  onDismissAll={dismissAll}
  onRetry={(conflict) => {
    // إعادة محاولة الحجز
  }}
/>

<ExpiringBatchesAlert
  organizationId={organizationId}
  daysAhead={30}
  enabled={!isLossMode && !isReturnMode}
/>
```

---

## 📞 الدعم

في حال وجود مشاكل:
1. تحقق من console للأخطاء
2. تحقق من PowerSync sync status
3. راجع جدول `inventory_batch_movements` للتدقيق
4. راجع حقول الحجز في `product_serial_numbers`
5. راجع الـ conflicts في useConflicts hook
