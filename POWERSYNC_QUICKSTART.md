# ⚡ PowerSync Quick Start - البدء السريع

## 🎯 **في 5 دقائق فقط!**

### **الخطوة 1: إعداد PowerSync (دقيقتان)**

1. اذهب إلى [https://www.powersync.com/](https://www.powersync.com/)
2. سجل حساب مجاني
3. أنشئ **Instance جديد**
4. اربطه بـ **Supabase** (أدخل Project URL + Service Role Key)

### **الخطوة 2: إضافة Environment Variable (30 ثانية)**

أضف إلى `.env.local`:

```env
VITE_POWERSYNC_URL=https://your-instance-name.powersync.com
```

### **الخطوة 3: إعداد Sync Rules (دقيقتان)**

في PowerSync Dashboard > **Sync Rules**، الصق هذا:

```yaml
bucket_definitions:
  global:
    - SELECT * FROM products WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM product_categories WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM customers WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM orders WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM order_items WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM staff_work_sessions WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM suppliers WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM employees WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM batches WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM serial_numbers WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM returns WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM losses WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM customer_debts WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM debt_payments WHERE organization_id = token_parameters.organization_id
    - SELECT * FROM expenses WHERE organization_id = token_parameters.organization_id

token_parameters:
  - organization_id
```

### **الخطوة 4: شغّل التطبيق! (30 ثانية)**

```bash
pnpm run dev:fast
```

---

## ✅ **اختبار سريع**

### **اختبار 1: Offline Mode**
1. افتح التطبيق
2. أغلق الإنترنت
3. أضف منتج
4. يجب أن يعمل! ✅

### **اختبار 2: Real-time Sync**
1. افتح التطبيق في نافذتين
2. أضف منتج في النافذة الأولى
3. يجب أن يظهر فوراً في النافذة الثانية! ✅

---

## 🎉 **هذا كل شيء!**

PowerSync يعمل الآن! جميع البيانات تتزامن تلقائياً.

**لمزيد من التفاصيل:**
- اقرأ [`POWERSYNC_MIGRATION_GUIDE.md`](./POWERSYNC_MIGRATION_GUIDE.md)
- اقرأ [`POWERSYNC_COMPLETE_MIGRATION_PLAN.md`](./POWERSYNC_COMPLETE_MIGRATION_PLAN.md)

---

**تمت بواسطة:** Claude Code 🤖
