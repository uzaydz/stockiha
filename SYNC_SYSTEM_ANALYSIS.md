# تحليل شامل لنظام المزامنة (Synchronization System Architecture)

## 1. نظرة عامة (Executive Summary)
يعتمد المشروع على نظام مزامنة هجين ومتطور (Hybrid Smart Sync Engine) تم بناؤه خصيصاً ليدعم بيئات العمل المختلفة (المتصفح وسطح المكتب عبر Electron/Tauri). النظام مصمم ليعمل بمبدأ **Offline-First**، مما يضمن استمرارية العمل حتى عند انقطاع الاتصال، مع آليات ذكية لحل التضاربات وتقليل استهلاك الموارد.

على الرغم من وجود حزمة `PowerSync` في التبعيات، إلا أن الكود الفعلي يعتمد على **Custom Sync Engine** يوفر تحكماً أدق في منطق العمل (Business Logic).

---

## 2. هيكلية النظام (System Architecture)

يتكون النظام من أربعة مكونات رئيسية تعمل بتناغم:

1.  **Smart Sync Engine**: العقل المدبر الذي يدير دورات المزامنة.
2.  **Unified Queue**: طابور موحد لتخزين العمليات التي تمت أثناء وضع Offline.
3.  **Local Database Layer**: طبقة تجريد (Abstraction Layer) تدعم SQLite و IndexedDB.
4.  **Conflict Resolver**: محرك ذكي لدمج البيانات وحل التضاربات.

### مخطط تدفق البيانات (Data Flow Diagram)

```mermaid
graph TD
    UI[User Interface] -->|Action| LocalDB[Local Database (SQLite/IndexedDB)]
    UI -->|Track Change| Tracker[Sync Tracker]
    
    LocalDB -->|Store Operation| Queue[Unified Queue]
    
    Tracker -->|Notify| Engine[Smart Sync Engine]
    
    Engine -->|Debounce (2s)| SyncProcess[Sync Process]
    Engine -->|Periodic (5m)| SyncProcess
    
    SyncProcess -->|1. Push| Server[Supabase / Server]
    SyncProcess -->|2. Pull| Server
    
    Server -->|Response| Resolver[Conflict Resolver]
    Resolver -->|Merge/Update| LocalDB
```

---

## 3. تحليل المكونات التفصيلي (Deep Dive)

### أ. محرك المزامنة الذكي (`SmartSyncEngine.ts`)
هو المسؤول عن تنسيق العملية برمتها. يتميز بالخصائص التالية:

*   **Event-Driven Sync**: لا ينتظر وقتاً محدداً، بل يبدأ المزامنة فور اكتشاف تغيير (مع تأخير ذكي Debounce لمدة 2 ثانية لتجميع التغييرات المتتالية).
*   **Periodic Fallback**: كإجراء أمان، يقوم بمحاولة مزامنة كل 5 دقائق لضمان عدم فقدان أي بيانات.
*   **Parallel Execution**: ينفذ عمليات المزامنة المختلفة بالتوازي لزيادة السرعة:
    *   `synchronizeWithServer`: البيانات الأساسية (المنتجات، العملاء).
    *   `syncPendingPOSOrders`: رفع طلبات البيع الجديدة.
    *   `syncOrdersFromServer`: جلب الطلبات الخارجية.
    *   `syncInvoicesFromServer`: مزامنة الفواتير.

### ب. طبقة قاعدة البيانات (`localDb.ts` & `dbAdapter`)
يستخدم النظام نمط **Adapter Pattern** للتعامل مع التخزين المحلي:
*   **في المتصفح**: يستخدم **IndexedDB** (عبر Dexie.js).
*   **في سطح المكتب (Electron/Tauri)**: يستخدم **SQLite** مباشرة لأداء أعلى وموثوقية أكبر.
*   **النماذج (Schemas)**: تم تعريف نماذج دقيقة لجميع الكيانات (`LocalProduct`, `LocalPOSOrder`, etc.) مع حقول خاصة للمزامنة مثل:
    *   `synced`: هل تمت المزامنة؟
    *   `syncStatus`: حالة المزامنة الحالية (pending, error).
    *   `pendingOperation`: نوع العملية المعلقة (create, update, delete).

### ج. طابور العمليات الموحد (`UnifiedQueue.ts`)
بدلاً من محاولة المزامنة فوراً والفشل عند انقطاع النت، يتم تخزين كل عملية في `inventoryDB.syncQueue`.
*   **الهيكل**: يخزن `objectType`، `operation`، `data`، و `priority`.
*   **الأولوية**: يمنح أولوية للطلبات (Orders) على تحديثات المنتجات لضمان تسجيل المبيعات أولاً.
*   **التكامل**: عند إضافة عنصر للطابور، يتم إشعار `SyncTracker` تلقائياً لبدء المزامنة.

### د. حل النزاعات (`ConflictResolver.ts`)
أذكى جزء في النظام، حيث لا يعتمد استراتيجية واحدة بل يختار الاستراتيجية بناءً على نوع البيانات:

| نوع البيانات | الاستراتيجية | السبب |
| :--- | :--- | :--- |
| **المنتجات** | **Smart Merge** | نأخذ بيانات الوصف والسعر من السيرفر، لكن **نحتفظ بالمخزون المحلي** لأنه الأدق في نقاط البيع (POS). |
| **الطلبات** | **Client Wins** | الطلب الذي تم إنشاؤه محلياً يجب أن يبقى كما هو ولا يتم تعديله من السيرفر غالباً. |
| **العملاء** | **Latest Wins** | التعديل الأحدث زمنياً هو الذي يتم اعتماده. |
| **الفواتير** | **Manual** | نظراً لحساسيتها المالية، يتم طلب تدخل يدوي في حال وجود تعارض خطير. |

---

## 4. نقاط القوة في النظام الحالي

1.  **Resilience (المرونة)**: النظام مصمم ليعمل في ظروف الشبكة السيئة بفضل آلية الطوابير (Queueing).
2.  **Efficiency (الكفاءة)**: استخدام `debounce` يمنع إغراق السيرفر بالطلبات عند إجراء تعديلات سريعة (مثل تعديل مخزون عدة منتجات).
3.  **Accuracy (الدقة)**: منطق `Merge` الخاص بالمنتجات يحل المشكلة الأزلية في أنظمة POS (هل أعتمد مخزون السيرفر أم المحل؟).
4.  **Platform Agnostic**: يعمل بنفس الكفاءة على الويب والديسك توب بفضل طبقة `dbAdapter`.

## 5. التوصيات والتحسينات المقترحة

بناءً على التحليل، النظام ممتاز جداً، ولكن يمكن تعزيزه بالتالي:

1.  **Retry Policy**: إضافة استراتيجية "التراجع الأسي" (Exponential Backoff) في حال فشل المزامنة المتكرر لتقليل الضغط.
2.  **Compression**: ضغط البيانات (JSON payload) قبل إرسالها في حالة العمليات الكبيرة (Bulk Updates).
3.  **Visual Feedback**: تحسين مؤشرات المزامنة في الواجهة (إظهار ما يتم مزامنته حالياً بالتفصيل للمستخدم).

---

**الخلاصة:**
نظام المزامنة الحالي في "Bazaar Console Connect" هو نظام ناضج ومبني بعناية لسيناريوهات التجارة الحقيقية، ويتفوق على الحلول الجاهزة البسيطة بفضل قدرته على التعامل بذكاء مع المخزون والعمليات المالية.
