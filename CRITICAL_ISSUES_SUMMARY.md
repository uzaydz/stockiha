# 🚨 ملخص المشاكل الحرجة - Sync Rules vs PowerSync Schema vs Supabase

## ⚠️ المشاكل الحرجة التي تحتاج إصلاح فوري

### 1. 🔴 أعمدة `id` مفقودة في PowerSync Schema

**المشكلة:** جميع Sync Rules تحاول مزامنة عمود `id`، لكن العديد من الجداول في PowerSync Schema لا تحتوي على هذا العمود.

**الجداول المتأثرة (27 جدول):**
- `product_images` ❌
- `product_wholesale_tiers` ❌
- `orders` ❌
- `order_items` ❌
- `customers` ❌
- `suppliers` ❌
- `pos_staff_sessions` ❌
- `staff_work_sessions` ❌
- `expenses` ❌
- `expense_categories` ❌
- `users` ❌
- `organizations` ❌
- `organization_subscriptions` ❌
- `pos_settings` ❌
- `invoices` ❌
- `invoice_items` ❌
- `losses` ❌
- `loss_items` ❌
- `repair_orders` ❌
- `repair_locations` ❌
- `returns` ❌
- `return_items` ❌
- `subscription_transactions` ❌
- `activation_codes` ❌
- `subscription_history` ❌
- `subscription_plans` ❌
- `payment_methods` ❌

**الحل المطلوب:**
إضافة `id: column.text` لكل جدول في PowerSync Schema.

---

### 2. 🔴 جداول غير موجودة في Supabase

#### `pos_staff_sessions`
- **الوضع:** الجدول موجود في Sync Rules و PowerSync Schema لكن غير موجود في Supabase
- **الحل:** إنشاء الجدول في Supabase أو إزالته من Sync Rules

#### `staff_work_sessions`
- **الوضع:** الجدول موجود في Sync Rules و PowerSync Schema لكن غير موجود في Supabase
- **الحل:** إنشاء الجدول في Supabase أو إزالته من Sync Rules

---

### 3. 🔴 أعمدة `organization_id` مفقودة في Supabase

هذه الأعمدة ضرورية للفلترة الصحيحة في Sync Rules:

- `product_colors.organization_id` ❌
- `product_sizes.organization_id` ❌
- `product_images.organization_id` ❌
- `product_wholesale_tiers.organization_id` ❌
- `invoice_items.organization_id` ❌
- `loss_items.organization_id` ❌
- `return_items.organization_id` ❌

**الحل المطلوب:**
إضافة عمود `organization_id` لكل جدول في Supabase.

---

### 4. 🟡 أعمدة مهمة مفقودة في Supabase

#### جدول `orders`
- `global_order_number` ❌
- `created_by_staff_id` ❌
- `created_by_staff_name` ❌

#### جدول `customers`
- `address` ❌
- `nif`, `rc`, `nis`, `rib` ❌

#### جدول `order_items` (14 عمود)
- `sale_type`, `selling_unit_type` ❌
- `weight_sold`, `weight_unit`, `price_per_weight_unit` ❌
- `meters_sold`, `price_per_meter` ❌
- `boxes_sold`, `units_per_box`, `box_price` ❌
- `batch_id`, `batch_number` ❌
- `expiry_date` ❌
- `serial_numbers` ❌

#### جدول `products` (33 عمود)
جميع الأعمدة المتعلقة بالبيع بالوزن/المتر/الصندوق والتتبع:
- `supplier_id` ❌
- `sell_by_weight`, `weight_unit`, `price_per_weight_unit`, ... (10 أعمدة) ❌
- `sell_by_meter`, `meter_unit`, `price_per_meter`, ... (8 أعمدة) ❌
- `sell_by_box`, `units_per_box`, `box_price`, ... (7 أعمدة) ❌
- `track_expiry`, `default_expiry_days`, `expiry_alert_days` ❌
- `track_batches`, `track_serial_numbers`, `require_serial_on_sale` ❌

---

## 📋 خطة العمل الموصى بها

### المرحلة 1: إصلاحات حرجة (يجب تنفيذها فوراً)

1. ✅ إضافة `id` لجميع الجداول في PowerSync Schema
2. ✅ إضافة `organization_id` للجداول المفقودة في Supabase
3. ✅ إنشاء الجداول المفقودة (`pos_staff_sessions`, `staff_work_sessions`) في Supabase

### المرحلة 2: إصلاحات مهمة (خلال أسبوع)

4. ✅ إضافة الأعمدة المفقودة في `orders` و `customers`
5. ✅ إضافة الأعمدة المفقودة في `order_items`
6. ✅ إضافة الأعمدة المفقودة في `invoice_items` و `pos_settings`

### المرحلة 3: مراجعة وتحديث (خلال أسبوعين)

7. ✅ مراجعة جدول `products` - هل الميزات (البيع بالوزن/المتر/الصندوق) مستخدمة؟
   - إذا نعم: إضافة الأعمدة في Supabase
   - إذا لا: إزالتها من Sync Rules
8. ✅ مراجعة الأعمدة الإضافية في Supabase التي ليست في Sync Rules

---

## 🔍 كيفية التحقق من الإصلاحات

بعد تنفيذ الإصلاحات، قم بتشغيل:

```bash
python3 analyze_sync_compatibility.py
```

يجب أن تكون النتيجة:
- ✅ 0 مشاكل حرجة
- ✅ جميع الجداول المهمة مطابقة

---

**تاريخ الإنشاء:** 2025-01-04  
**آخر تحديث:** 2025-01-04













