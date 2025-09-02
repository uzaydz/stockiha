# 🌐 إعداد متغيرات البيئة لـ Cloudflare

## المتغيرات المطلوبة

لاستخدام نظام إدارة النطاقات المخصصة مع Cloudflare، تحتاج إلى تكوين المتغيرات التالية:

### 1️⃣ **في Cloudflare Dashboard:**

#### **CLOUDFLARE_API_TOKEN**
1. اذهب إلى: https://dash.cloudflare.com/profile/api-tokens
2. اضغط **Create Token**
3. استخدم **Custom token** template
4. **Token name**: `Stockiha Pages API`
5. **Permissions**:
   - `Zone:Zone:Read`
   - `Zone:DNS:Edit`
   - `Account:Cloudflare Pages:Edit`
6. **Account Resources**: Include - Your Account
7. **Zone Resources**: Include - All zones (أو النطاق المحدد)
8. اضغط **Continue to summary** ثم **Create Token**
9. انسخ الـ Token

#### **CLOUDFLARE_ZONE_ID**
1. اذهب إلى: https://dash.cloudflare.com/
2. اختر النطاق الخاص بك (مثل stockiha.com)
3. في الشريط الجانبي الأيمن، ستجد **Zone ID**
4. انسخ القيمة

#### **CLOUDFLARE_PROJECT_NAME**
- اسم مشروع Cloudflare Pages الخاص بك
- في حالتنا: `stockiha`

### 2️⃣ **إضافة المتغيرات في Cloudflare Dashboard:**

1. اذهب إلى: https://dash.cloudflare.com/
2. **Pages** → **stockiha** → **Settings** → **Environment variables**
3. أضف المتغيرات التالية:

| Type | Name | Value |
|------|------|-------|
| **Secret** | `CLOUDFLARE_API_TOKEN` | `your_api_token_here` |
| **Secret** | `CLOUDFLARE_ZONE_ID` | `your_zone_id_here` |
| **Plaintext** | `CLOUDFLARE_PROJECT_NAME` | `stockiha` |

### 3️⃣ **للتطوير المحلي (.env.local):**

```env
# Cloudflare API Configuration
VITE_CLOUDFLARE_API_TOKEN=your_api_token_here
VITE_CLOUDFLARE_ZONE_ID=your_zone_id_here
VITE_CLOUDFLARE_PROJECT_NAME=stockiha
```

## 🔧 **التحقق من الإعداد**

بعد إضافة المتغيرات:

1. **أعد تحميل الصفحة** أو أعد نشر المشروع
2. اذهب إلى `/dashboard/custom-domains`
3. يجب أن ترى واجهة Cloudflare بدلاً من رسالة الخطأ

## ⚠️ **نصائح مهمة**

1. **لا تشارك** الـ API Token مع أي شخص
2. **استخدم Secret** لجميع المفاتيح الحساسة
3. **تأكد من الصلاحيات** المناسبة للـ API Token
4. **احتفظ بنسخة احتياطية** من الإعدادات

## 🚀 **الاستخدام**

بعد الإعداد، ستتمكن من:

- ✅ إضافة نطاقات مخصصة
- ✅ إزالة نطاقات
- ✅ التحقق من حالة النطاقات
- ✅ الحصول على تعليمات DNS
- ✅ SSL تلقائي من Cloudflare

## 🆘 **استكشاف الأخطاء**

### مشكلة: "إعدادات Cloudflare غير متوفرة"
**الحل**: تأكد من إضافة جميع المتغيرات المطلوبة

### مشكلة: "فشل في ربط النطاق"
**الحل**: 
1. تحقق من صحة الـ API Token
2. تأكد من صلاحيات الـ Token
3. تحقق من صحة الـ Zone ID

### مشكلة: "النطاق غير متاح"
**الحل**: تأكد من أن النطاق لم يتم ربطه من قبل
