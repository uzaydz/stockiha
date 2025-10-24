# متغيرات البيئة - دليل الإعداد للإنتاج

## 📋 نظرة عامة

هذا الملف يوثق جميع متغيرات البيئة المتاحة لتهيئة التطبيق في بيئات مختلفة (Development, Staging, Production).

---

## 🔧 متغيرات المزامنة (Sync Configuration)

### `VITE_SYNCENGINE_PARALLEL`
- **الوصف**: تحديد نمط تشغيل محرك المزامنة (متوازي أو تسلسلي)
- **القيم المقبولة**: `true` | `false`
- **القيمة الافتراضية**: `true`
- **الاستخدام**:
  - `true`: تنفيذ متوازي لجميع مهام المزامنة (أسرع لكن أكثر ضغطاً على API)
  - `false`: تنفيذ تسلسلي (أبطأ لكن أقل ضغطاً على API والشبكة)
- **التوصية**:
  - Development: `true`
  - Production (حمل عالي): `false`
  - Production (حمل منخفض): `true`

```env
VITE_SYNCENGINE_PARALLEL=false
```

---

### `VITE_SYNC_POOL_SIZE`
- **الوصف**: عدد المهام المتزامنة المسموح بها في نفس الوقت للمنتجات/العملاء/العناوين
- **القيم المقبولة**: أرقام صحيحة موجبة (1-10)
- **القيمة الافتراضية**: `2`
- **الاستخدام**: يحدد عدد العمليات المتوازية داخل كل نوع من أنواع المزامنة
- **التوصية**:
  - Development: `3-5`
  - Production (شبكة سريعة): `3`
  - Production (شبكة بطيئة): `2`
  - Production (API محدود): `1`

```env
VITE_SYNC_POOL_SIZE=2
```

---

## 🌐 متغيرات الاتصال (Connectivity Configuration)

### `VITE_CONNECTIVITY_BASE_INTERVAL_MS`
- **الوصف**: الفاصل الزمني الأساسي لفحص حالة الشبكة (بالميلي ثانية)
- **القيم المقبولة**: أرقام صحيحة موجبة
- **القيمة الافتراضية**: 
  - Production: `60000` (دقيقة واحدة)
  - Development: `30000` (30 ثانية)
- **الاستخدام**: يحدد كم مرة يتم فحص حالة الاتصال بالشبكة
- **التوصية**:
  - Development: `30000` (30 ثانية)
  - Production: `60000-120000` (1-2 دقيقة)

```env
VITE_CONNECTIVITY_BASE_INTERVAL_MS=60000
```

---

### `VITE_CONNECTIVITY_MAX_INTERVAL_MS`
- **الوصف**: الحد الأقصى للفاصل الزمني بين فحوصات الشبكة (exponential backoff)
- **القيم المقبولة**: أرقام صحيحة موجبة
- **القيمة الافتراضية**: `180000` (3 دقائق)
- **الاستخدام**: الحد الأقصى الذي يمكن أن يصل إليه الفاصل الزمني عند استخدام exponential backoff
- **التوصية**:
  - Development: `120000` (2 دقيقة)
  - Production: `180000-300000` (3-5 دقائق)

```env
VITE_CONNECTIVITY_MAX_INTERVAL_MS=180000
```

---

### `VITE_CONNECTIVITY_DEGRADED_MS`
- **الوصف**: عتبة زمن الاستجابة لاعتبار الاتصال بطيئاً (degraded)
- **القيم المقبولة**: أرقام صحيحة موجبة (بالميلي ثانية)
- **القيمة الافتراضية**: `2000` (ثانيتان)
- **الاستخدام**: إذا كان زمن الاستجابة أكبر من هذه القيمة، يُعتبر الاتصال بطيئاً
- **التوصية**:
  - شبكة سريعة: `1000-1500`
  - شبكة متوسطة: `2000-3000`
  - شبكة بطيئة: `3000-5000`

```env
VITE_CONNECTIVITY_DEGRADED_MS=2000
```

---

## 📦 أمثلة تهيئة كاملة

### Development Environment
```env
# Sync Configuration
VITE_SYNCENGINE_PARALLEL=true
VITE_SYNC_POOL_SIZE=3

# Connectivity Configuration
VITE_CONNECTIVITY_BASE_INTERVAL_MS=30000
VITE_CONNECTIVITY_MAX_INTERVAL_MS=120000
VITE_CONNECTIVITY_DEGRADED_MS=1500
```

### Production Environment (High Load)
```env
# Sync Configuration - تقليل الضغط على API
VITE_SYNCENGINE_PARALLEL=false
VITE_SYNC_POOL_SIZE=2

# Connectivity Configuration - تقليل فحوصات الشبكة
VITE_CONNECTIVITY_BASE_INTERVAL_MS=60000
VITE_CONNECTIVITY_MAX_INTERVAL_MS=180000
VITE_CONNECTIVITY_DEGRADED_MS=2000
```

### Production Environment (Low Load)
```env
# Sync Configuration - أداء أسرع
VITE_SYNCENGINE_PARALLEL=true
VITE_SYNC_POOL_SIZE=3

# Connectivity Configuration - فحوصات معتدلة
VITE_CONNECTIVITY_BASE_INTERVAL_MS=45000
VITE_CONNECTIVITY_MAX_INTERVAL_MS=150000
VITE_CONNECTIVITY_DEGRADED_MS=1500
```

### Production Environment (Slow Network)
```env
# Sync Configuration - تسلسلي لتجنب timeout
VITE_SYNCENGINE_PARALLEL=false
VITE_SYNC_POOL_SIZE=1

# Connectivity Configuration - فحوصات أقل
VITE_CONNECTIVITY_BASE_INTERVAL_MS=90000
VITE_CONNECTIVITY_MAX_INTERVAL_MS=300000
VITE_CONNECTIVITY_DEGRADED_MS=5000
```

---

## 🎯 دليل اختيار القيم المناسبة

### حسب نوع الشبكة

| نوع الشبكة | PARALLEL | POOL_SIZE | BASE_INTERVAL | DEGRADED_MS |
|------------|----------|-----------|---------------|-------------|
| سريعة جداً | true | 3-5 | 30000 | 1000 |
| سريعة | true | 3 | 45000 | 1500 |
| متوسطة | true | 2 | 60000 | 2000 |
| بطيئة | false | 2 | 90000 | 3000 |
| بطيئة جداً | false | 1 | 120000 | 5000 |

### حسب حمل الخادم

| حمل الخادم | PARALLEL | POOL_SIZE | التوصية |
|-----------|----------|-----------|---------|
| منخفض | true | 3-5 | أداء أسرع |
| متوسط | true | 2-3 | متوازن |
| عالي | false | 2 | تقليل الضغط |
| عالي جداً | false | 1 | حماية API |

---

## 🔍 مراقبة الأداء

### مؤشرات يجب مراقبتها:

1. **معدل نجاح المزامنة**
   - إذا كان أقل من 90%، قلل `POOL_SIZE` أو اجعل `PARALLEL=false`

2. **زمن استجابة API**
   - إذا زاد عن 3 ثوانٍ، قلل `POOL_SIZE`

3. **استهلاك الشبكة**
   - إذا كان مرتفعاً، زد `BASE_INTERVAL_MS`

4. **تجربة المستخدم**
   - إذا كانت الواجهة بطيئة، اجعل `PARALLEL=false`

---

## ⚠️ ملاحظات مهمة

1. **لا تستخدم قيم متطرفة**:
   - `POOL_SIZE` أكبر من 10 قد يسبب مشاكل
   - `BASE_INTERVAL` أقل من 10 ثوانٍ قد يستنزف البطارية

2. **اختبر التغييرات**:
   - اختبر أي تغيير في بيئة staging أولاً
   - راقب الأداء لمدة 24 ساعة على الأقل

3. **التوافق مع الأجهزة**:
   - الأجهزة القديمة: استخدم `PARALLEL=false` و `POOL_SIZE=1`
   - الأجهزة الحديثة: يمكن استخدام قيم أعلى

4. **استهلاك البطارية**:
   - قيم `BASE_INTERVAL` أقل = استهلاك بطارية أكثر
   - للأجهزة المحمولة، استخدم 60000 أو أكثر

---

## 📚 مراجع إضافية

- [SyncEngine Documentation](./src/sync/SyncEngine.ts)
- [ConnectivityService Documentation](./src/lib/connectivity/ConnectivityService.ts)
- [Sync Service Documentation](./src/api/syncService.ts)

---

## 🆘 استكشاف الأخطاء

### المزامنة بطيئة جداً
```env
# جرب هذه القيم
VITE_SYNCENGINE_PARALLEL=true
VITE_SYNC_POOL_SIZE=3
```

### فشل المزامنة بشكل متكرر
```env
# جرب هذه القيم
VITE_SYNCENGINE_PARALLEL=false
VITE_SYNC_POOL_SIZE=1
```

### استهلاك بطارية عالي
```env
# جرب هذه القيم
VITE_CONNECTIVITY_BASE_INTERVAL_MS=120000
VITE_CONNECTIVITY_MAX_INTERVAL_MS=300000
```

### الواجهة تتجمد أثناء المزامنة
```env
# جرب هذه القيم
VITE_SYNCENGINE_PARALLEL=false
VITE_SYNC_POOL_SIZE=1
```

---

**آخر تحديث**: 2025-10-23  
**الإصدار**: 1.0.0
