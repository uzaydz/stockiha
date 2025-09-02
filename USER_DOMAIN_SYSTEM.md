# 🌐 نظام النطاقات المخصصة للمستخدمين

## كيف يعمل النظام:

### **1️⃣ النطاق الوسيط (Intermediate Domain)**

كل مستخدم سيحصل على نطاق فرعي فريد تحت نطاقك الرئيسي:

```
المستخدم 1: user1.stockiha.com
المستخدم 2: user2.stockiha.com  
المستخدم 3: user3.stockiha.com
```

### **2️⃣ DNS Records للمستخدمين**

عندما يريد المستخدم ربط نطاق مخصص (مثل `mystore.com`), سيضيف:

| Type | Name | Value |
|------|------|-------|
| **CNAME** | `mystore.com` | `user123.stockiha.com` |
| **CNAME** | `www.mystore.com` | `user123.stockiha.com` |

### **3️⃣ مثال عملي:**

**المستخدم**: أحمد (ID: abc123)
**متجره**: متجر الإلكترونيات
**النطاق المطلوب**: `electronics-store.com`

#### DNS Records يضيفها أحمد:
```
electronics-store.com → abc123.stockiha.com
www.electronics-store.com → abc123.stockiha.com
```

#### ما يحدث خلف الكواليس:
1. `abc123.stockiha.com` يشير إلى Cloudflare Pages
2. Cloudflare Pages يتعرف على المستخدم من الـ subdomain
3. يعرض متجر أحمد

## 🔧 التطبيق التقني:

### **في Cloudflare DNS:**
```
*.stockiha.com → stockiha.pages.dev (Wildcard CNAME)
```

### **في كود التطبيق:**
```javascript
// استخراج معرف المستخدم من subdomain
const subdomain = request.headers.get('host').split('.')[0];
const userId = subdomain; // abc123

// تحميل بيانات المتجر للمستخدم
const store = await getStoreByUserId(userId);
```

## 🎯 الفوائد:

1. ✅ **بساطة للمستخدم**: فقط CNAME واحد
2. ✅ **أمان**: كل مستخدم معزول
3. ✅ **مرونة**: يمكن إضافة مستخدمين لا نهائيين
4. ✅ **SSL تلقائي**: Cloudflare يدير الشهادات
5. ✅ **سرعة**: CDN عالمي
