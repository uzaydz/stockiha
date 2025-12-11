# تحليل شامل لقاعدة بيانات Supabase

## ملخص سريع
- **إجمالي الجداول**: 255+ جدول
- **المشروع**: wrnssatuvmumsczyldth
- **تاريخ التحليل**: December 2025

---

## 📋 الجداول الأساسية (Core Tables)

### 1. المستخدمين والمنظمات

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `users` | المستخدمين | id, email, name, phone, role, organization_id, is_org_admin |
| `organizations` | المنظمات/الشركات | id, name, domain, subdomain, subscription_id, business_type |
| `organization_settings` | إعدادات المنظمة | organization_id, theme_primary_color, logo_url, merchant_type |
| `organization_subscriptions` | اشتراكات المنظمات | id, organization_id, plan_id, status, billing_cycle, start_date, end_date |
| `subscription_plans` | خطط الاشتراك | id, name, code, monthly_price, yearly_price, limits |

### 2. المنتجات والمخزون

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `products` | المنتجات | id, name, price, sku, barcode, category, stock_quantity, organization_id |
| `product_colors` | ألوان المنتجات | id, product_id, name, color_code, quantity, price |
| `product_sizes` | مقاسات المنتجات | id, color_id, product_id, size_name, quantity, price |
| `product_categories` | فئات المنتجات | id, name, slug, organization_id, type |
| `product_subcategories` | الفئات الفرعية | id, category_id, name, organization_id |
| `inventory_batches` | دفعات المخزون | id, product_id, batch_number, quantity_received, quantity_remaining |
| `inventory_history` | تاريخ حركات المخزون | id, product_id, movement_type, quantity_pieces, organization_id |
| `inventory_log` | سجل المخزون | id, product_id, quantity, previous_stock, new_stock, type |
| `product_serial_numbers` | الأرقام التسلسلية | id, product_id, serial_number, status, organization_id |

### 3. العملاء والعناوين

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `customers` | العملاء | id, name, email, phone, organization_id, nif, rc |
| `addresses` | العناوين | id, user_id, customer_id, street_address, city, state, organization_id |
| `blocked_customers` | العملاء المحظورين | id, organization_id, phone_normalized, reason |

### 4. الطلبات (POS + Online)

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `orders` | طلبات POS | id, customer_id, total, status, payment_method, organization_id |
| `order_items` | عناصر طلبات POS | id, order_id, product_id, quantity, unit_price, color_id, size_id |
| `online_orders` | الطلبات الإلكترونية | id, customer_id, total, status, shipping_address_id, organization_id |
| `online_order_items` | عناصر الطلبات الإلكترونية | id, order_id, product_id, quantity, unit_price, color_id, size_id |
| `order_status_history` | تاريخ حالات الطلبات | id, order_id, status, previous_status, tracking_data |

### 5. الفواتير والمعاملات

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `invoices` | الفواتير | id, invoice_number, customer_id, total_amount, status, organization_id |
| `invoice_items` | عناصر الفواتير | id, invoice_id, name, quantity, unit_price, product_id |
| `transactions` | المعاملات المالية | id, order_id, amount, type, payment_method, organization_id |
| `expenses` | المصروفات | id, organization_id, title, amount, category, expense_date |
| `expense_categories` | فئات المصروفات | id, organization_id, name, color |

### 6. الإرجاعات والخسائر

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `returns` | طلبات الإرجاع | id, return_number, original_order_id, return_type, status, organization_id |
| `return_items` | عناصر الإرجاع | id, return_id, product_id, return_quantity, condition_status |
| `losses` | تصريحات الخسائر | id, loss_number, loss_type, status, total_cost_value, organization_id |
| `loss_items` | عناصر الخسائر | id, loss_id, product_id, lost_quantity, loss_condition |

### 7. التصليحات

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `repair_orders` | طلبات التصليح | id, customer_name, customer_phone, status, total_price, organization_id |
| `repair_locations` | مواقع التصليح | id, organization_id, name, address, is_default |
| `repair_status_history` | تاريخ حالات التصليح | id, repair_order_id, status, notes |
| `repair_images` | صور التصليح | id, repair_order_id, image_url, image_type |

### 8. إعدادات POS

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `pos_settings` | إعدادات نقطة البيع | id, organization_id, store_name, receipt_header_text, currency_symbol |
| `pos_staff_sessions` | موظفي POS | id, organization_id, staff_name, pin_code, permissions |
| `staff_work_sessions` | جلسات العمل | id, organization_id, staff_id, opening_cash, status |

### 9. الشحن والتوصيل

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `shipping_providers` | شركات الشحن | id, code, name, is_active |
| `shipping_provider_settings` | إعدادات الشحن | id, organization_id, provider_id, api_token |
| `shipping_orders` | طلبات الشحن | id, organization_id, tracking_number, status |
| `yalidine_provinces_global` | ولايات ياليدين | id, name, zone |
| `yalidine_municipalities_global` | بلديات ياليدين | id, name, wilaya_id |

### 10. المزامنة والسجلات

| Table | الوصف | أهم الأعمدة |
|-------|-------|-------------|
| `operations_log` | سجل العمليات للمزامنة | id, organization_id, device_id, table_name, operation, record_id, payload |
| `audit_logs` | سجلات التدقيق | id, user_id, action, resource_type, changes |
| `settings_audit_log` | سجل تغييرات الإعدادات | id, user_id, setting_type, old_value, new_value |

---

## 🔄 جداول المزامنة الرئيسية

هذه الجداول تحتاج مزامنة مع قاعدة البيانات المحلية:

### جداول ذات أولوية عالية (تحتاج مزامنة ثنائية)
1. `products` ↔ LocalProduct
2. `customers` ↔ LocalCustomer
3. `orders` ↔ LocalPOSOrder
4. `order_items` ↔ LocalPOSOrderItem
5. `invoices` ↔ LocalInvoice
6. `invoice_items` ↔ LocalInvoiceItem
7. `expenses` ↔ LocalExpense
8. `repair_orders` ↔ LocalRepairOrder
9. `repair_status_history` ↔ LocalRepairStatusHistory
10. `staff_work_sessions` ↔ LocalWorkSession
11. `returns` ↔ LocalProductReturn
12. `return_items` ↔ LocalReturnItem
13. `losses` ↔ LocalLossDeclaration
14. `loss_items` ↔ LocalLossItem

### جداول للقراءة فقط (Server → Local)
1. `organizations`
2. `organization_settings`
3. `pos_settings`
4. `organization_subscriptions`
5. `subscription_plans`
6. `product_categories`
7. `product_subcategories`
8. `shipping_providers`
9. `yalidine_provinces_global`
10. `yalidine_municipalities_global`

---

## 📝 مقارنة الأسماء: Supabase vs Local

| Supabase Table | Local Interface | الحالة |
|----------------|-----------------|--------|
| `products` | `LocalProduct` | ✅ متطابق |
| `product_colors` | - | ⚠️ غير موجود محلياً |
| `product_sizes` | - | ⚠️ غير موجود محلياً |
| `customers` | `LocalCustomer` | ✅ متطابق |
| `addresses` | `LocalAddress` | ✅ متطابق |
| `orders` | `LocalPOSOrder` | ✅ متطابق |
| `order_items` | `LocalPOSOrderItem` | ✅ متطابق |
| `invoices` | `LocalInvoice` | ✅ متطابق |
| `invoice_items` | `LocalInvoiceItem` | ✅ متطابق |
| `expenses` | `LocalExpense` | ✅ متطابق |
| `expense_categories` | `LocalExpenseCategory` | ✅ متطابق |
| `repair_orders` | `LocalRepairOrder` | ✅ متطابق |
| `repair_status_history` | `LocalRepairStatusHistory` | ✅ متطابق |
| `repair_locations` | `LocalRepairLocation` | ✅ متطابق |
| `repair_images` | `LocalRepairImage` | ✅ متطابق |
| `returns` | `LocalProductReturn` | ⚠️ اسم مختلف |
| `return_items` | `LocalReturnItem` | ✅ متطابق |
| `losses` | `LocalLossDeclaration` | ⚠️ اسم مختلف |
| `loss_items` | `LocalLossItem` | ✅ متطابق |
| `staff_work_sessions` | `LocalWorkSession` | ⚠️ اسم مختلف |
| `pos_settings` | `LocalPOSSettings` | ✅ متطابق |
| `organization_subscriptions` | `LocalOrganizationSubscription` | ✅ متطابق |
| `subscription_plans` | `LocalSubscriptionPlan` | ✅ متطابق |
| `pos_staff_sessions` | `LocalStaffPIN` | ⚠️ اسم مختلف |
| `customer_debts` | `LocalCustomerDebt` | ❓ تحتاج فحص |
| `customer_debt_payments` | `LocalCustomerDebtPayment` | ❓ تحتاج فحص |
| `game_categories` | `LocalGameCategory` | ✅ متطابق |
| `games_catalog` | `LocalGame` | ⚠️ اسم مختلف |
| `game_download_orders` | `LocalGameOrder` | ⚠️ اسم مختلف |
| `game_downloads_settings` | `LocalGameDownloadsSettings` | ✅ متطابق |
| `operations_log` | (للمزامنة) | ✅ جدول المزامنة |

---

## 🎯 الإجراءات المطلوبة

### 1. توحيد الأسماء
```
returns → LocalProductReturn (تغيير إلى LocalReturn)
losses → LocalLossDeclaration (تغيير إلى LocalLoss)
staff_work_sessions → LocalWorkSession (تغيير إلى LocalStaffWorkSession)
pos_staff_sessions → LocalStaffPIN (تغيير إلى LocalPosStaffSession)
games_catalog → LocalGame (تغيير إلى LocalGamesCatalog)
game_download_orders → LocalGameOrder (تغيير إلى LocalGameDownloadOrder)
```

### 2. إضافة جداول مفقودة محلياً
- `product_colors`
- `product_sizes`
- `inventory_batches`
- `product_serial_numbers`
- `online_orders`
- `online_order_items`

### 3. توحيد أسماء الأعمدة (snake_case)
جميع الأعمدة في Supabase تستخدم `snake_case`:
- `created_at`
- `updated_at`
- `organization_id`
- `customer_id`
- `product_id`

---

## 📊 إحصائيات سريعة

| الفئة | العدد |
|-------|-------|
| جداول المستخدمين والمنظمات | 15 |
| جداول المنتجات والمخزون | 25 |
| جداول الطلبات | 20 |
| جداول الشحن | 15 |
| جداول الإعدادات | 20 |
| جداول التحليلات والسجلات | 30 |
| جداول أخرى | 130+ |

---

## 🔗 العلاقات الرئيسية

```
organizations
    ├── users (organization_id)
    ├── products (organization_id)
    ├── customers (organization_id)
    ├── orders (organization_id)
    ├── online_orders (organization_id)
    ├── invoices (organization_id)
    ├── expenses (organization_id)
    ├── repair_orders (organization_id)
    ├── pos_settings (organization_id)
    └── organization_settings (organization_id)

products
    ├── product_colors (product_id)
    │   └── product_sizes (color_id)
    ├── order_items (product_id)
    ├── online_order_items (product_id)
    ├── inventory_batches (product_id)
    └── inventory_history (product_id)

customers
    ├── addresses (customer_id)
    ├── orders (customer_id)
    └── invoices (customer_id)

orders
    ├── order_items (order_id)
    └── transactions (order_id)

online_orders
    ├── online_order_items (order_id)
    └── order_status_history (order_id)
```

---

## 📁 الملفات المحلية ذات الصلة

- `src/database/localDb.ts` - تعريفات قاعدة البيانات المحلية
- `src/lib/db/dbAdapter.ts` - محول قاعدة البيانات
- `src/api/syncService.ts` - خدمة المزامنة
- `src/lib/sync/delta/` - محرك Delta Sync




























