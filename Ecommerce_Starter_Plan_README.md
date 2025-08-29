# خطة التجار الإلكترونيين المبتدئين

## نظرة عامة
خطة اشتراك خاصة بالتجار الإلكترونيين المبتدئين تحتوي على حدود محددة للطلبيات الإلكترونية مع نموذج تسعير مرن.

## المميزات الرئيسية

### 🎯 **السعر والحدود**
- **السعر**: 1000 دج شهرياً
- **الحد الأقصى**: 100 طلبية إلكترونية شهرياً
- **فترة التجربة**: 5 أيام مجاناً
- **إعادة التفعيل**: تلقائي كل شهر

### 💰 **نموذج التسعير المرن**
- **100 طلبية إضافية**: 1000 دج
- **250 طلبية إضافية**: 2000 دج
- **ترقية لخطط أعلى**: إمكانية الترقية في أي وقت

### 🚫 **ما لا تحتويه الخطة**
- ❌ نقطة بيع (POS)
- ❌ خدمات الإشتراكات الرقمية
- ❌ خدمات الألعاب
- ❌ خدمات التصليح

### ✅ **ما تحتويه الخطة**
- ✅ متجر إلكتروني كامل
- ✅ إدارة المنتجات (حتى 50 منتج)
- ✅ إدارة المخزون
- ✅ تقارير المبيعات الأساسية
- ✅ مستخدم واحد فقط
- ✅ دعم فني عبر البريد الإلكتروني

## البنية التقنية

### 🗄️ **قاعدة البيانات**

#### جدول `subscription_plans` - تم تحديثه
```sql
ALTER TABLE subscription_plans ADD COLUMN max_online_orders INTEGER;
```

#### جدول `organizations` - تم تحديثه
```sql
ALTER TABLE organizations
ADD COLUMN online_orders_this_month INTEGER DEFAULT 0,
ADD COLUMN online_orders_limit INTEGER,
ADD COLUMN store_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN store_block_reason TEXT;
```

#### جدول `monthly_online_orders_usage` - جديد
```sql
CREATE TABLE monthly_online_orders_usage (
    organization_id UUID REFERENCES organizations(id),
    year_month TEXT, -- YYYY-MM
    orders_count INTEGER DEFAULT 0,
    orders_limit INTEGER DEFAULT 0
);
```

### 🔧 **الوظائف المساعدة**

#### `check_online_orders_limit(organization_id)`
- التحقق من الحدود الشهرية
- حظر المتجر عند التجاوز
- إرجاع معلومات مفصلة

#### `calculate_monthly_online_orders(organization_id)`
- حساب الطلبيات الشهرية
- تحديث إحصائيات الاستخدام
- إرجاع العدد الحالي

#### `reset_monthly_online_orders()`
- إعادة تعيين العداد شهرياً
- فك حظر المتاجر
- تحديث الإحصائيات

## الفرونت اند

### 🎣 **Hooks الجديدة**

#### `useOnlineOrdersLimit()`
```typescript
const { limitInfo, loading, error, checkLimit, refreshLimit } = useOnlineOrdersLimit();
```

### 🧩 **المكونات الجديدة**

#### `OnlineOrdersLimitCard`
- عرض حالة الحدود الشهرية
- إحصائيات الاستخدام
- تحذيرات وإشعارات

#### `OrderLimitBlocker`
- منع إنشاء الطلبيات عند الحظر
- عرض صفحة حظر جميلة
- خيارات الترقية

## التطبيق العملي

### 1️⃣ **تثبيت النظام**
```bash
# تشغيل ملف SQL لإضافة الحدود
psql -d your_database -f sql/add_online_orders_limits.sql

# تشغيل سكريبت الإعداد
psql -d your_database -f scripts/setup_ecommerce_starter_plan.sql
```

### 1️⃣ **في حالة حدوث خطأ في الفهارس**
```bash
# تشغيل ملف إصلاح المشاكل
psql -d your_database -f sql/fix_online_orders_limits_issues.sql
```

#### 🔧 **أسباب الخطأ وكيفية تجنبه**
**الخطأ**: `functions in index expression must be marked IMMUTABLE`

**السبب**: PostgreSQL لا يسمح بإنشاء فهارس تحتوي على دوال غير ثابتة (non-IMMUTABLE)

**الحل**:
- ❌ `TO_CHAR(created_at, 'YYYY-MM')` - دالة غير ثابتة
- ✅ `DATE_TRUNC('month', created_at)` - دالة ثابتة
- ✅ فهارس بسيطة على الأعمدة المباشرة

**تجنب الخطأ مستقبلاً**:
```sql
-- ❌ خطأ
CREATE INDEX idx_bad ON table_name(function_name(column));

-- ✅ صحيح
CREATE INDEX idx_good ON table_name(column);
-- أو
CREATE INDEX idx_good_date ON table_name(DATE_TRUNC('month', column));
```

### 2️⃣ **استخدام المكونات**

#### في صفحة الإشتراكات:
```tsx
import OnlineOrdersLimitCard from '@/components/subscription/OnlineOrdersLimitCard';

// عرض الحدود
<OnlineOrdersLimitCard />
```

#### عداد الطلبيات في النافبار:
```tsx
import OnlineOrdersCounter from '@/components/navbar/OnlineOrdersCounter';

// العرض المدمج في النافبار
<OnlineOrdersCounter variant="compact" />

// العرض الكامل
<OnlineOrdersCounter variant="default" />
```

#### إشعارات حدود الطلبيات:
```tsx
import OrdersLimitNotifications from '@/components/navbar/OrdersLimitNotifications';

// إشعارات ذكية تظهر تحت النافبار
<OrdersLimitNotifications />
```

#### في صفحات المتجر:
```tsx
import OrderLimitBlocker from '@/components/store/OrderLimitBlocker';

<OrderLimitBlocker>
  {/* محتوى المتجر */}
</OrderLimitBlocker>
```

### 3️⃣ **اختبار النظام**

#### إعداد البيانات التجريبية:
```bash
# تشغيل ملف الاختبار
psql -d your_database -f test_ecommerce_starter_ui.sql
```

#### الاختبار اليدوي:
1. **تسجيل الدخول** بالمؤسسة التجريبية
2. **فحص النافبار** لرؤية عداد الطلبيات
3. **مراقبة الإشعارات** تحت النافبار
4. **تجربة إنشاء طلبيات** للتحقق من العداد
5. **اختبار حظر المتجر** عند تجاوز الحد

### 4️⃣ **المراقبة والإدارة**

#### مراقبة المتاجر المحظورة:
```sql
-- عرض جميع المتاجر المحظورة
SELECT * FROM blocked_stores_view_fixed WHERE is_blocked = TRUE;

-- إحصائيات الخطة
SELECT * FROM get_ecommerce_starter_stats();
```

#### إدارة الحدود:
```sql
-- إضافة طلبيات إضافية
SELECT add_online_orders_credits('organization-id', 100, 1000);

-- إعادة تعيين العداد شهرياً
SELECT reset_monthly_online_orders();
```

### 3️⃣ **في نظام معالجة الطلبيات**
```sql
-- بدلاً من process_online_order_new
SELECT process_online_order_with_limits(
  customer_name, phone, province, municipality,
  product_id, organization_id, address, city,
  delivery_company, delivery_option, payment_method,
  notes, product_color_id, product_size_id, size_name,
  quantity, unit_price, total_price, delivery_fee,
  form_data, metadata, stop_desk_id
);
```

## إدارة النظام

### 📊 **المراقبة**
```sql
-- عرض المتاجر المحظورة
SELECT * FROM blocked_stores_view;

-- عرض استخدام الطلبيات الشهري
SELECT
    o.name,
    mou.orders_count,
    mou.orders_limit,
    sp.name as plan_name
FROM organizations o
LEFT JOIN monthly_online_orders_usage mou ON o.id = mou.organization_id
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE sp.code = 'ecommerce_starter';
```

### 🔄 **إعادة التعيين الشهري**
```sql
-- يمكن تنفيذها عبر cron job
SELECT reset_monthly_online_orders();
```

## التسويق والمبيعات

### 🎯 **نقاط القوة**
- **سعر منخفض**: 1000 دج شهرياً
- **مرونة**: إمكانية إضافة طلبيات حسب الحاجة
- **سهولة الاستخدام**: مثالية للمبتدئين
- **تدريجي**: إمكانية الترقية لاحقاً

### 📈 **استراتيجية المبيعات**
1. **استهداف المبتدئين**: التجار الجدد في التجارة الإلكترونية
2. **عروض خاصة**: خصومات للأشهر الأولى
3. **برامج الإحالة**: مكافآت للعملاء الذين يجلبون عملاء جدد
4. **دعم فني**: مساعدة في إعداد المتجر

### 💡 **الترقيات المقترحة**
- **خطة متوسطة**: 300 طلبية - 2500 دج
- **خطة كاملة**: 500 طلبية - 4000 دج
- **خطة تجار**: 1000 طلبية - 7000 دج

## الدعم الفني

### 📞 **نقاط الاتصال**
- **البريد الإلكتروني**: support@yourcompany.com
- **الهاتف**: رقم الدعم الفني
- **الدردشة**: نظام الدردشة المباشرة

### 🆘 **المشاكل الشائعة**
1. **حظر المتجر**: كيفية التعامل مع تجاوز الحدود
2. **إعادة التفعيل**: كيفية إضافة المزيد من الطلبيات
3. **الترقية**: كيفية الترقية لخطط أعلى

## المراقبة والتحليلات

### 📊 **المقاييس المهمة**
- **معدل التحويل**: نسبة المتاجر التي تتجاوز 100 طلبية
- **معدل الترقية**: نسبة المتاجر التي تترقى لخطط أعلى
- **معدل الرضا**: تقييمات العملاء للخطة
- **معدل الاستخدام**: متوسط استخدام الطلبيات الشهرية

### 📈 **التحسينات المقترحة**
- **زيادة الحدود**: بناءً على الاستخدام الفعلي
- **تحسين الأسعار**: تعديل الأسعار حسب الطلب
- **إضافة مميزات**: ميزات إضافية للخطة
- **تحسين الواجهة**: تحسين تجربة المستخدم

## الخلاصة

خطة التجار الإلكترونيين المبتدئين هي حل مثالي للمبتدئين في التجارة الإلكترونية، حيث توفر:
- **سعر منخفض** و**مرونة في الاستخدام**
- **حدود واضحة** و**مراقبة دقيقة**
- **سهولة الترقية** و**دعم فني**
- **نموذج أعمال مستدام** و**قابل للتوسع**

النظام يضمن **رضا العملاء** مع **استدامة الأعمال** من خلال نموذج تسعير ذكي يناسب احتياجات التجار المبتدئين.
