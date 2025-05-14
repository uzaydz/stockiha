# ملخص واجهة برمجة تطبيقات ياليدين (Yalidine API Summary)

## 1. معلومات عامة (General Information)

*   **URL الأساسي (Base URL):** `https://api.yalidine.app/v1/`
*   **المصادقة (Authentication):**
    *   تتم عبر مفتاحي API: `X-API-ID` و `X-API-TOKEN` يتم إرسالهما في ترويسات (headers) كل طلب.
    *   يجب الحفاظ على سرية هذه المفاتيح وعدم تضمينها في كود جهة العميل.
*   **تنسيق الطلبات (Request Format):**
    *   `Content-Type: application/x-www-form-urlencoded` أو `application/json` للطلبات التي تحتوي على نص (body).
    *   معاملات GET يتم تمريرها في الـ URL.
*   **تنسيق الاستجابات (Response Format):**
    *   `JSON`
*   **الأخطاء (Errors):**
    *   تستخدم أكواد حالة HTTP القياسية.
    *   `400 Bad Request`: مشكلة في الطلب (مثل معامل مفقود أو غير صالح).
    *   `401 Unauthorized`: مشكلة في المصادقة (مفاتيح API غير صحيحة أو مفقودة).
    *   `403 Forbidden`: ليس لديك الإذن للوصول إلى هذا المورد.
    *   `404 Not Found`: المورد المطلوب غير موجود.
    *   `429 Too Many Requests`: تجاوزت حدود المعدل.
    *   `500 Internal Server Error`: خطأ في الخادم.
*   **حدود المعدل (Rate Limits):**
    *   ترويسات الاستجابة الهامة:
        *   `X-RateLimit-Limit`: إجمالي عدد الطلبات المسموح بها في الفترة الزمنية الحالية.
        *   `X-RateLimit-Remaining`: عدد الطلبات المتبقية في الفترة الزمنية الحالية.
        *   `Retry-After`: عدد الثواني التي يجب انتظارها قبل إجراء طلب آخر (عندما يتم تجاوز الحد).

## 2. الطرود (Parcels - `/v1/parcels`)

*   **الوصف:** إدارة الطرود (إنشاء، تعديل، استرجاع، حذف).
*   **النقاط (Endpoints):**
    *   `GET /v1/parcels`: استرجاع قائمة الطرود مع إمكانية التصفية.
    *   `POST /v1/parcels`: إنشاء طرد جديد.
    *   `GET /v1/parcels/:id_parcel`: استرجاع تفاصيل طرد معين.
    *   `PUT /v1/parcels/:id_parcel`: تعديل طرد معين (فقط قبل أول محاولة مسح ضوئي، لا يمكن تعديل `from_wilaya_name` و `to_wilaya_name`).
    *   `DELETE /v1/parcels/:id_parcel`: حذف طرد معين (فقط قبل أول محاولة مسح ضوئي).

*   **معاملات الإنشاء (POST `/v1/parcels` - Required & Optional):**
    *   `order_id` (string, optional): رقم الطلب الخاص بك.
    *   `from_wilaya_name` (string, required): اسم ولاية المرسل.
    *   `firstname` (string, required): الاسم الأول للمستلم.
    *   `familyname` (string, required): اللقب العائلي للمستلم.
    *   `contact_phone` (string, required): رقم هاتف المستلم.
    *   `address` (string, required): عنوان المستلم.
    *   `to_commune_name` (string, required): اسم بلدية المستلم.
    *   `to_wilaya_name` (string, required): اسم ولاية المستلم.
    *   `product_list` (string, required): قائمة المنتجات (مثال: "منتج1، منتج2").
    *   `price` (integer, required): سعر الطرد (القيمة الإجمالية لتحصيلها من المستلم).
    *   `freeshipping` (boolean, required): هل التوصيل مجاني (true/false).
    *   `is_stopdesk` (boolean, required): هل التسليم إلى نقطة توقف (true/false).
    *   `stopdesk_id` (integer, if `is_stopdesk` is true): معرّف نقطة التوقف.
    *   `do_insurance` (boolean, optional, default: false): هل تريد تأمين الطرد.
    *   `declared_value` (integer, if `do_insurance` is true): القيمة المصرح بها للطرد.
    *   `height`, `width`, `length` (integer, cm, optional): أبعاد الطرد.
    *   `weight` (float, kg, optional): وزن الطرد.
    *   `has_exchange` (boolean, optional, default: false): هل الطرد يتضمن استبدال.
    *   `product_to_collect` (string, if `has_exchange` is true): المنتج المراد استرجاعه.

*   **مرشحات الاسترجاع (GET `/v1/parcels`):**
    *   `id_parcel`, `tracking`, `order_id`, `status`, `date_start`, `date_end`, `year`, `month`, `firstname`, `familyname`, `contact_phone`, `address`, `to_commune_name`, `to_wilaya_name`, `from_wilaya_name`, `is_stopdesk`, `stopdesk_id`, `has_exchange`, `freeshipping`, `is_paid`, `page`, `page_size`, `order_by`, `desc`/`asc`, `fields`.

## 3. سجل الحالات (Histories - `/v1/histories`)

*   **الوصف:** استرجاع سجل تتبع حالات الطرود.
*   **النقطة (Endpoint):**
    *   `GET /v1/histories`: استرجاع قائمة بحالات الطرود.
*   **حقول الاستجابة الرئيسية:**
    *   `date_status`, `tracking`, `status`, `reason`, `center_id`, `center_name`, `wilaya_id`, `wilaya_name`, `commune_id`, `commune_name`.
*   **مرشحات الاسترجاع:**
    *   `tracking`, `status`, `date_status` (YYYY-MM-DD, or range), `reason`, `fields`, `page`, `page_size`, `order_by` (`date_status`, `tracking`, `status`, `reason`), `desc`/`asc`.

## 4. المراكز (Centers - `/v1/centers`)

*   **الوصف:** استرجاع معلومات عن مراكز ياليدين.
*   **النقاط (Endpoints):**
    *   `GET /v1/centers`: استرجاع قائمة المراكز.
    *   `GET /v1/centers/:center_id`: استرجاع مركز معين.
*   **حقول الاستجابة الرئيسية:**
    *   `center_id`, `name`, `address`, `gps`, `commune_id`, `commune_name`, `wilaya_id`, `wilaya_name`.
*   **مرشحات الاسترجاع:**
    *   `center_id`, `commune_id`, `commune_name`, `wilaya_id`, `wilaya_name`, `fields`, `page`, `page_size`, `order_by` (`center_id`, `commune_id`, `wilaya_id`), `desc`/`asc`.

## 5. البلديات (Communes - `/v1/communes`)

*   **الوصف:** استرجاع معلومات عن البلديات المدعومة.
*   **النقاط (Endpoints):**
    *   `GET /v1/communes`: استرجاع قائمة البلديات.
    *   `GET /v1/communes/:id`: استرجاع بلدية معينة.
*   **حقول الاستجابة الرئيسية:**
    *   `id`, `name`, `wilaya_id`, `wilaya_name`, `has_stop_desk`, `is_deliverable`, `delivery_time_parcel` (days), `delivery_time_payment` (days).
*   **مرشحات الاسترجاع:**
    *   `id`, `wilaya_id`, `has_stop_desk`, `is_deliverable`, `fields`, `page`, `page_size`, `order_by` (`id`, `wilaya_id`), `desc`/`asc`.

## 6. الولايات (Wilayas - `/v1/wilayas`)

*   **الوصف:** استرجاع معلومات عن الولايات المدعومة.
*   **النقاط (Endpoints):**
    *   `GET /v1/wilayas`: استرجاع قائمة الولايات.
    *   `GET /v1/wilayas/:id`: استرجاع ولاية معينة.
*   **حقول الاستجابة الرئيسية:**
    *   `id`, `name`, `zone`, `is_deliverable`.
*   **مرشحات الاسترجاع:**
    *   `id`, `name`, `fields`, `page`, `page_size`, `order_by` (`id`, `name`), `desc`/`asc`.

## 7. الرسوم (Fees - `/v1/fees`)

*   **الوصف:** استرجاع رسوم التوصيل بناءً على ولايتي الانطلاق والوجهة.
*   **النقطة (Endpoint):**
    *   `GET /v1/fees/?from_wilaya_id=<ID>&to_wilaya_id=<ID>`
    *   **المعاملات المطلوبة:** `from_wilaya_id`, `to_wilaya_id`.
*   **حقول الاستجابة الرئيسية:**
    *   `from_wilaya_name`, `to_wilaya_name`.
    *   `zone`: رقم منطقة المسار.
    *   `retour_fee`: رسوم الإرجاع للمنطقة.
    *   `cod_percentage`: نسبة رسوم الدفع عند الاستلام (تُحسب على الأعلى بين القيمة المصرح بها والسعر).
    *   `insurance_percentage`: نسبة رسوم التأمين (تُحسب على الأعلى بين القيمة المصرح بها والسعر).
    *   `oversize_fee`: **سعر الكيلوجرام الإضافي** للوزن الزائد (عندما يتجاوز الطرد 5 كجم).
    *   `per_commune` (object): كائن يحتوي على رسوم التوصيل لكل بلدية في ولاية الوجهة. كل مفتاح هو `commune_id`.
        *   `commune_id`, `commune_name`.
        *   `express_home`: رسوم التوصيل السريع للمنزل (لا تشمل رسوم الوزن الزائد).
        *   `express_desk`: رسوم التوصيل السريع لنقطة التوقف (لا تشمل رسوم الوزن الزائد).
        *   `economic_home`: رسوم التوصيل الاقتصادي للمنزل (إن وجدت، لا تشمل رسوم الوزن الزائد).
        *   `economic_desk`: رسوم التوصيل الاقتصادي لنقطة التوقف (إن وجدت، لا تشمل رسوم الوزن الزائد).

*   **حساب رسوم الوزن الزائد (Overweight Fee Calculation):**
    1.  **الوزن الحجمي (Volumetric Weight):** `العرض(سم) * الارتفاع(سم) * الطول(سم) * 0.0002`.
    2.  **الوزن الفعلي (Actual Weight):** الوزن الحقيقي للطرد بالكيلوجرام.
    3.  **الوزن القابل للفوترة (Billable Weight):** القيمة الأكبر بين الوزن الحجمي والوزن الفعلي.
    4.  **حساب الرسوم:**
        *   إذا `الوزن القابل للفوترة <= 5 كجم`: `رسوم الوزن الزائد = 0`.
        *   إذا `الوزن القابل للفوترة > 5 كجم`: `رسوم الوزن الزائد = (الوزن القابل للفوترة - 5) * oversize_fee_rate` (حيث `oversize_fee_rate` هي قيمة `oversize_fee` من استجابة `/fees`).
    5.  **إجمالي رسوم التوصيل:** `رسوم التوصيل الأساسية للبلدية + رسوم الوزن الزائد`.

---
*هذا الملخص تم إنشاؤه بناءً على تحليل ملف `yalidine api-converted.html`.*
