# 📊 تقرير تحليل مطابقة Sync Rules مع PowerSync Schema و Supabase

**تاريخ التحليل:** 2025-01-04  
**عدد الجداول المُحللة:** 32 جدول في Sync Rules

---

## 📈 ملخص التنفيذي

تم تحليل **32 جدول** من Sync Rules ومقارنتها مع:
- **PowerSync Schema** (39 جدول)
- **Supabase Schema** (241 جدول)

### النتائج الرئيسية:
- ✅ **2 جدول** مطابق تماماً
- ⚠️ **46 مشكلة** تم اكتشافها
- ❌ **2 جدول** غير موجود في Supabase

---

## 🔍 المشاكل المكتشفة

### 1. أعمدة `id` مفقودة في PowerSync Schema

**ملاحظة مهمة:** معظم الجداول تفتقد عمود `id` في PowerSync Schema. هذا قد يكون مقصوداً إذا كان PowerSync يدير المفاتيح الأساسية تلقائياً، لكن يجب التحقق من ذلك.

**الجداول المتأثرة:**
- `product_images`
- `product_wholesale_tiers`
- `orders`
- `order_items`
- `customers`
- `suppliers`
- `pos_staff_sessions`
- `staff_work_sessions`
- `expenses`
- `expense_categories`
- `users`
- `organizations`
- `organization_subscriptions`
- `pos_settings`
- `invoices`
- `invoice_items`
- `losses`
- `loss_items`
- `repair_orders`
- `repair_locations`
- `returns`
- `return_items`
- `subscription_transactions`
- `activation_codes`
- `subscription_history`
- `subscription_plans`
- `payment_methods`

---

### 2. أعمدة مفقودة في Supabase

#### جدول `products` (33 عمود مفقود)
الأعمدة المفقودة:
- `supplier_id`
- `sell_by_weight`, `weight_unit`, `price_per_weight_unit`, `purchase_price_per_weight_unit`
- `min_weight_per_sale`, `max_weight_per_sale`, `average_item_weight`
- `available_weight`, `total_weight_purchased`, `weight_kg`
- `sell_by_meter`, `meter_unit`, `price_per_meter`, `purchase_price_per_meter`
- `min_meters_per_sale`, `roll_length_meters`, `total_meters_purchased`, `available_length`
- `sell_by_box`, `units_per_box`, `box_price`, `box_purchase_price`
- `box_barcode`, `allow_single_unit_sale`, `available_boxes`, `total_boxes_purchased`
- `track_expiry`, `default_expiry_days`, `expiry_alert_days`
- `track_batches`, `track_serial_numbers`, `require_serial_on_sale`

**التوصية:** إما إضافة هذه الأعمدة إلى Supabase أو إزالتها من Sync Rules إذا لم تعد مستخدمة.

#### جدول `product_colors` (1 عمود مفقود)
- `organization_id`

#### جدول `product_sizes` (1 عمود مفقود)
- `organization_id`

#### جدول `product_images` (1 عمود مفقود)
- `organization_id`

#### جدول `product_wholesale_tiers` (1 عمود مفقود)
- `organization_id`

#### جدول `orders` (3 أعمدة مفقودة)
- `global_order_number`
- `created_by_staff_id`
- `created_by_staff_name`

#### جدول `order_items` (14 عمود مفقود)
- `sale_type`, `selling_unit_type`
- `weight_sold`, `weight_unit`, `price_per_weight_unit`
- `meters_sold`, `price_per_meter`
- `boxes_sold`, `units_per_box`, `box_price`
- `batch_id`, `batch_number`
- `expiry_date`
- `serial_numbers`

#### جدول `customers` (5 أعمدة مفقودة)
- `address`
- `nif`, `rc`, `nis`, `rib`

**ملاحظة:** هذه الأعمدة قد تكون موجودة في جدول منفصل أو تم إزالتها من Supabase.

#### جدول `expenses` (7 أعمدة مفقودة)
- `category_id`
- `reference_number`
- `tags`
- `metadata`
- `source`
- `is_deleted`
- `deleted_at`

#### جدول `organizations` (8 أعمدة مفقودة)
- `business_type`
- `business_features`
- `business_type_selected`
- `business_type_selected_at`
- `online_orders_this_month`
- `online_orders_limit`
- `store_blocked`
- `store_block_reason`

#### جدول `pos_settings` (5 أعمدة مفقودة)
- `activity`
- `rc`, `nif`, `nis`, `rib`

#### جدول `invoices` (6 أعمدة مفقودة)
- `discount_type`
- `discount_percentage`
- `tva_rate`
- `amount_ht`, `amount_tva`, `amount_ttc`

#### جدول `invoice_items` (11 عمود مفقود)
- `organization_id`
- `sku`, `barcode`
- `tva_rate`
- `unit_price_ht`, `unit_price_ttc`
- `total_ht`, `total_tva`, `total_ttc`
- `discount_amount`
- `is_editable_price`

#### جدول `loss_items` (1 عمود مفقود)
- `organization_id`

#### جدول `repair_orders` (2 عمود مفقود)
- `device_type`
- `price_to_be_determined_later`

#### جدول `return_items` (1 عمود مفقود)
- `organization_id`

#### جدول `subscription_transactions` (9 أعمدة مفقودة)
- `service_name`
- `provider`, `logo_url`
- `tracking_code`, `public_tracking_code`
- `account_username`, `account_email`, `account_password`, `account_notes`

---

### 3. جداول غير موجودة في Supabase

#### `pos_staff_sessions`
**الوضع:** الجدول غير موجود في Supabase  
**التوصية:** 
- التحقق من وجود جدول مشابه باسم مختلف
- أو إنشاء الجدول في Supabase
- أو إزالته من Sync Rules إذا لم يعد مستخدماً

#### `staff_work_sessions`
**الوضع:** الجدول غير موجود في Supabase  
**التوصية:** نفس التوصيات السابقة

---

## ✅ الجداول المطابقة تماماً

1. ✅ `product_categories` - مطابق تماماً
2. ✅ `product_subcategories` - مطابق تماماً

---

## 🔧 التوصيات

### أولوية عالية (يجب إصلاحها فوراً)

1. **إضافة `organization_id` للجداول التالية في Supabase:**
   - `product_colors`
   - `product_sizes`
   - `product_images`
   - `product_wholesale_tiers`
   - `invoice_items`
   - `loss_items`
   - `return_items`

2. **إضافة عمود `id` للجداول في PowerSync Schema** (إذا كان مطلوباً)

3. **إنشاء الجداول المفقودة في Supabase:**
   - `pos_staff_sessions`
   - `staff_work_sessions`

### أولوية متوسطة

4. **إضافة الأعمدة المفقودة في جدول `products`:**
   - إذا كانت هذه الميزات (البيع بالوزن/المتر/الصندوق) مستخدمة، يجب إضافتها
   - إذا لم تعد مستخدمة، يجب إزالتها من Sync Rules

5. **إضافة الأعمدة المفقودة في `order_items`** لدعم أنواع البيع المختلفة

6. **إضافة الأعمدة المفقودة في `customers`** (address, nif, rc, nis, rib)

### أولوية منخفضة

7. **مراجعة الأعمدة الإضافية** في Supabase التي ليست في Sync Rules - قد تكون ميزات جديدة

8. **توحيد أسماء الجداول** بين Sync Rules و Supabase

---

## 📝 ملاحظات إضافية

1. **عدد الجداول:** Supabase يحتوي على 241 جدول بينما Sync Rules يحتوي على 32 فقط. هذا طبيعي لأن Supabase قد يحتوي على جداول إضافية للوظائف الأخرى.

2. **أعمدة `id`:** إذا كان PowerSync يدير المفاتيح الأساسية تلقائياً، فقد لا يكون من الضروري إضافة `id` في Schema. يجب التحقق من وثائق PowerSync.

3. **الأعمدة الإضافية في Supabase:** بعض الجداول في Supabase تحتوي على أعمدة إضافية غير موجودة في Sync Rules. هذا قد يكون مقصوداً إذا كانت هذه الأعمدة لا تحتاج للمزامنة.

---

## 🚀 الخطوات التالية

1. ✅ مراجعة هذا التقرير مع فريق التطوير
2. ✅ تحديد الأولويات للإصلاحات
3. ✅ إنشاء migrations لإضافة الأعمدة المفقودة في Supabase
4. ✅ تحديث PowerSync Schema لإضافة الأعمدة المفقودة
5. ✅ تحديث Sync Rules لإزالة الأعمدة غير المستخدمة أو إضافتها حسب الحاجة
6. ✅ اختبار المزامنة بعد الإصلاحات

---

**تم إنشاء هذا التقرير تلقائياً بواسطة سكريبت التحليل**  
**ملف التقرير:** `sync_compatibility_report.txt`




















