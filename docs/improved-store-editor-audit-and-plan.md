## خطة تحسين شاملة لمحرر المتجر المحسّن (ImprovedStoreEditor)

### TL;DR
- إصلاحات صحة البيانات أولاً: توحيد تطبيع الأنواع، حفظ دفعي واحد باستخدام RPC، جعل الحذف مرحلياً بدلاً من فوري.
- أداء: إزالة محاكاة الـ viewport التي تمسح DOM، تفعيل virtualization، تقليل الحركة واحترام prefers-reduced-motion.
- تجربة المستخدم: مفاتيح اختصار، دعم وصول، تقليل الضوضاء على الموبايل.
- قاعدة البيانات: استغلال الفهارس الموجودة وملء settings_hash، استخدام دوال RPC المتاحة.
- مراقبة: قياس زمن الحفظ، عدد طلبات الشبكة، ومعدل الأخطاء قبل/بعد.

---

### 1) نظرة معمارية مختصرة للحالة الراهنة
- الحالة: Zustand مع `persist` و`immer` في `useImprovedStoreEditor` لإدارة قائمة المكوّنات، الاختيار، والرؤية.
- الواجهة: مكونات UI كثيفة الحركة (framer-motion) لشريط الأدوات، المعاينة، ولوحة الخصائص مع نسخة مخصصة للهواتف.
- طبقة البيانات:
  - `useStoreComponents` تقدّم سلوكاً مرحلياً ثم حفظاً دُفعياً جيداً.
  - `ImprovedStoreEditor` يملك منطق حفظ خاصاً به بحلقات استدعاء لكل مكوّن (N call) ويكتب مباشرة في `store_settings`؛ تباين عن `useStoreComponents`.
- المعاينة: `StorePreview` تحاول محاكاة breakpoints عبر مسح DOM وتعديل أنماط عناصر داخلية بناءً على classes Tailwind.

نتيجة: ازدواج منطق الحفظ، احتمالات خرق قيود فريدة، أداء ضعيف عند تبديل viewport، وتجربة غير متسقة بين الحذف المرحلي والحذف الفوري.

---

### 2) المشاكل المكتشفة بالتفصيل

#### 2.1 صحة البيانات والاتساق
- خطأ تطبيع الأنواع: يتم تحويل `featured_products` → `featuredproducts` و`product_categories` → `categories` عند الحفظ، لكن فحص الوجود/التحديث يستخدم `comp.type` الخام بدل النوع المطبع؛ هذا قد يؤدي إلى:
  - فشل التحديث لصنف موجود.
  - خرق فهرس الفريدة UNIQUE (organization_id, component_type) أو إدراج مزدوج.
- الحذف فوري في مواضع (StorePreview) بينما باقي العمليات مرحلية؛ يخلق ذلك تبايناً في تجربة المستخدم ويفتح نافذة لأخطاء سباق.
- ازدواج منطق الحفظ بين `useStoreComponents.saveChanges` و`ImprovedStoreEditor.handleSave` يزيد مخاطر الانحراف.

#### 2.2 الأداء (Performance)
- محاكاة viewport عبر مسح DOM وتغيير inline styles لعناصر داخلية عند كل تغيير؛ مكلف جداً وقد يسبب jank وإطارات مفقودة.
- حفظ على دفعات متعددة (لكل مكوّن) بدلاً من استدعاء دفعي واحد.
- قوائم (المكوّنات/الطبقات) بدون virtualization؛ يعاد تصيير كل العناصر.
- حركة مرئية كثيفة (Motion) في كل المواضع، بدون احترام `prefers-reduced-motion`.

#### 2.3 تجربة المستخدم وإمكانية الوصول (UX/A11y)
- تلميحات وتوستات متكرّرة على الموبايل قد تصبح مزعجة دون rate limiting.
- نقص مفاتيح اختصار قياسية (Undo/Redo، Save، Toggle Preview) وغياب نظام تاريخ بسيط.
- نقص دلالات وصول (ARIA) وتباين تركيز لوحة المفاتيح.

#### 2.4 التصميم والاتساق البصري
- كثافة ظلال/تدرّجات وحركات تؤثر على مقروئية الواجهة وراحة العين.
- غياب Tokens ثابتة للألوان والمسافات مرتبطة بإعدادات المؤسسة.

#### 2.5 قابلية الصيانة
- تكرار تطبيع الأنواع في أكثر من موقع.
- كتل catch صامتة؛ فقدان الأثر التشخيصي.
- مفاتيح تخزين محلي غير موحّدة.

#### 2.6 الكاش والتزامن
- مسح الكاش يتم عبر مفاتيح متعددة؛ يحتاج توحيداً وفق نظام `storeCache` مع مفاتيح قياسية.

---

### 3) تحليل قاعدة البيانات (Supabase)
- جدول `store_settings`:
  - الأعمدة الأساسية: (id PK uuid)، (organization_id FK → organizations ON DELETE CASCADE)، component_type text، settings jsonb، is_active bool، order_index int، timestamps، settings_hash.
  - فهارس مثالية للاستخدام الحالي: UNIQUE (organization_id, component_type)، فهارس جزئية على (org_id, is_active, order_index)، فهرس settings_hash.
  - التوصية: ملء `settings_hash` (مثل md5(settings::text)) عند الحفظ؛ يمنع الكتابة غير الضرورية ويتيح مقارنة سريعة.
- دوال وإجراءات متاحة:
  - `batch_update_store_components`, `batch_update_store_components_ultra_fast`, `get_store_settings`, `update_store_components_order` — استغلها للحفظ الدفعي.
- سياسات RLS (تحقق مطلوب):
  - قراءة عامة للمكونات النشطة (عبر RPC أو policy مباشرة)؛ كتابة للمالكين/الأدوار فقط.

---

### 4) خطة تحسين مرحلية (قابلة للتنفيذ)

#### المرحلة 0 — حواجز أمان ومقاييس (1–2 يوم)
- تفعيل علم ميزة Feature Flag لإستراتيجية الحفظ الجديدة.
- إضافة Telemetry خفيف: زمن الحفظ، عدد الطلبات، حجم payload، أخطاء.
- Console logger موحّد (قابلة للتعطيل في الإنتاج).

#### المرحلة 1 — تصحيح الصحة والاتساق (2–3 أيام)
1) توحيد تطبيع الأنواع:
   - إنشاء util: `dbTypeFor(uiType)` و`uiTypeFor(dbType)`، واستخدامهما في كل الاستعلامات.
2) الحفظ الدفعي:
   - استبدال حلقة الحفظ في `ImprovedStoreEditor` باستدعاء RPC واحد: `batch_update_store_components_ultra_fast(p_organization_id, p_components)`.
   - تمرير `settings`, `is_active`, `order_index`, `component_type` (مطبع)، وحساب `settings_hash`.
3) الحذف المرحلي:
   - جعل كل عمليات الحذف/الإضافة/الترتيب محلية؛ التطبيق على القاعدة فقط عند الضغط على حفظ.
4) إزالة التكرار:
   - اعتماد `useStoreComponents.saveChanges` كمنفذ وحيد للحفظ، أو دمجه في طبقة واحدة مشتركة.

#### المرحلة 2 — أداء (3–5 أيام)
1) إلغاء محاكاة DOM للـ viewport:
   - حل مفضل: حاوية معاينة مع تبديل class (desktop/tablet/mobile) واستخدام Tailwind/Container Queries؛ أو iframe بعرض الجهاز.
2) Virtualization لقوائم المكونات/الطبقات (react-virtual).
3) الحركة المرئية:
   - احترام `prefers-reduced-motion` وتعطيل/تقليل transitions.
4) Debounce/Reconcile:
   - Debounce تحديث الخصائص (150–250ms)، Auto-save محلي عند الخمول (2–3 ثوان) فقط.

#### المرحلة 3 — UX/A11y (2–3 أيام)
- مفاتيح اختصار: Ctrl/Cmd+S للحفظ، Ctrl/Cmd+P للمعاينة، Del للحذف، Ctrl/Cmd+Z/Y للتراجع/الإعادة.
- تحسين الرسائل على الموبايل مع rate limiting وإخفاء ذكي.
- إضافة ARIA labels، إدارة التركيز، وتراتبية تبويب سليمة.

#### المرحلة 4 — تصميم واتساق (1–2 يوم)
- إدخال Design Tokens: ألوان، مسافات، زوايا؛ ربطها بـ `organization_settings` إن أمكن.
- تقليل الظلال والتدرجات في الرؤوس والأزرار.

#### المرحلة 5 — مراقبة وتحسين مستمر (مستمر)
- لوحات قياس: زمن الحفظ p95، عدد الطلبات لكل حفظ، معدل أخطاء.
- تقارير أسبوعية ما بعد الإطلاق.

---

### 5) تغييرات كود محددة (قابلة للتتبع)

1) util لتطبيع الأنواع (ملف جديد مثل `src/utils/storeComponentTypes.ts`):
```ts
export function dbTypeFor(uiType: string) {
  const t = uiType.toLowerCase();
  if (t === 'product_categories') return 'categories';
  if (t === 'featured_products') return 'featuredproducts';
  return t;
}
export function uiTypeFor(dbType: string) {
  const t = dbType.toLowerCase();
  if (t === 'categories') return 'product_categories';
  if (t === 'featuredproducts') return 'featured_products';
  return t;
}
```

2) `ImprovedStoreEditor.handleSave`:
- استبدال حلقة الإدراج/التحديث باستدعاء واحد لـ `batch_update_store_components_ultra_fast` مع مصفوفة مكونات مطبّعة، ثم مسح الكاش.
- إصلاح `.eq('component_type', ...)` لاستخدام `dbTypeFor(type)`.

3) `StorePreview`:
- إزالة `applyViewportSimulationEffect` واستبداله بتبديل class على الحاوية: `data-viewport="desktop|tablet|mobile"` فقط.

4) `useStoreComponents`:
- اعتماد util التطبيع.
- حساب `settings_hash` قبل الإرسال لتفعيل الفهرس.

5) الوصول والحركة:
- حراسة جميع `motion.*` بالمفضّل: `reduceMotion ? {transition: {duration:0}} : {…}`.
- إضافة مفاتيح الاختصار وARIA.

---

### 6) تغييرات قاعدة البيانات المقترحة (اختيارية)
- Trigger/Generated column لحساب `settings_hash = md5(settings::text)` عند INSERT/UPDATE لتوحيد الحساب جانب القاعدة.
- Policy مراجعة RLS: تمكين القراءة العامة للمكوّنات النشطة (أو عبر `get_store_settings(p_public_access=true)`).

ملاحظة: الفهارس الحالية كافية؛ لا حاجة لإضافة المزيد في هذه المرحلة.

---

### 7) خطة الاختبارات
- وحدات (Unit):
  - `dbTypeFor/uiTypeFor` تحويلات ثنائية الاتجاه.
  - منطق diff لحساب العناصر الجديدة/المعدّلة/المحذوفة.
- تكامل (Integration):
  - حفظ دفعي: إدراج+تحديث+حذف في استدعاء واحد؛ التحقق من UNIQUE.
  - تفريغ الكاش بعد الحفظ.
- طرف إلى طرف (E2E):
  - تدفّق: إضافة مكوّن → تعديل خصائص → ترتيب → حذف → حفظ → إعادة تحميل → توقع الحالة.
  - تبديل viewport دون jank.

---

### 8) قياسات النجاح
- زمن الحفظ: من N استدعاءات إلى استدعاء 1؛ p95 < 500ms (شبكات داخلية) أو < 1.2s (عامة).
- عدد طلبات الشبكة لكل حفظ: 1–2 بدل N.
- إطارات ثابتة: لا تسقط الإطارات عند تبديل viewport؛ وقت scripting لمعالجة التبديل < 10ms.
- خطأ UNIQUE صفر بعد إصلاح التطبيع.

---

### 9) خطة النشر والتراجع
- إطلاق خلف Feature Flag لمجموعة من المؤسسات (10%)، ثم 50%، ثم 100% خلال أسبوع.
- مسارات تراجع: الرجوع للحفظ القديم وتعطيل الحركة المتقدمة بسرعة.

---

### 10) لائحة تنفيذ سريعة (Checklist)
- صحة البيانات:
  - [ ] util تطبيع الأنواع مستخدم في كل المواضع
  - [ ] حفظ دفعي عبر RPC
  - [ ] حذف مرحلي والتطبيق عند الحفظ
  - [ ] ملء settings_hash
- أداء:
  - [ ] إزالة محاكاة DOM للـ viewport
  - [ ] Virtualization للقوائم
  - [ ] احترام prefers-reduced-motion
  - [ ] Debounce تحديث الخصائص
- UX/A11y:
  - [ ] اختصارات لوحة المفاتيح
  - [ ] ARIA وتركيز واضح
  - [ ] توستات أقل إزعاجاً مع rate limit
- مراقبة:
  - [ ] قياس زمن الحفظ وعدد الطلبات
  - [ ] لوغّات أخطاء موحّدة

---

### 11) ملاحظات ختامية
هذه الخطة تضع الصحة أولاً، ثم الأداء، ثم التجربة، مع احترام بنية القاعدة الحالية واستغلال الفهارس والإجراءات المتاحة. التنفيذ المرحلي والمقاييس الواضحة يقللان المخاطر ويرفعان جودة المحرّر سريعاً.


