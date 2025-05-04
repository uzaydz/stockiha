# Bazaar Console Connect

تطبيق لإدارة متجر ألعاب الفيديو والأكسسوارات. يوفر واجهة لإدارة المنتجات، الطلبات، المبيعات، والمزيد.

## التقنيات المستخدمة

- **React**: إطار العمل الرئيسي
- **TypeScript**: لكتابة كود آمن ومكتوب بشكل جيد
- **Vite**: أداة تطوير سريعة
- **React Router**: للتنقل بين الصفحات
- **Shadcn UI**: لتصميم واجهة المستخدم
- **React Query**: لإدارة طلبات الشبكة
- **Supabase**: لتخزين البيانات والمصادقة

## المتطلبات

- Node.js (الإصدار 18 أو أحدث)
- npm أو yarn

## الإعداد

### 1. نسخ المشروع

```
git clone https://github.com/yourusername/bazaar-console-connect.git
cd bazaar-console-connect
```

### 2. تثبيت التبعيات

```
npm install
```

### 3. إعداد Supabase

1. قم بإنشاء حساب وقاعدة بيانات على [Supabase](https://supabase.com)
2. انسخ رابط URL الخاص بالمشروع ومفتاح anon key
3. قم بإنشاء ملف `.env.local` في المجلد الرئيسي وأضف المعلومات التالية:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. قاعدة البيانات

لتهيئة قاعدة البيانات، هناك خياران:

#### أ. استخدام Supabase CLI (مستحسن للتطوير)

1. قم بتثبيت Supabase CLI:
   ```
   npm install -g supabase
   ```

2. قم بعمل login:
   ```
   supabase login
   ```

3. تشغيل الخادم المحلي:
   ```
   supabase start
   ```

4. قم بتشغيل ملفات الترحيل (migration):
   ```
   supabase db reset
   ```

#### ب. إعداد يدوي

قم بنسخ ملف SQL الموجود في `supabase/migrations/00000000000000_init.sql` وتنفيذه في لوحة تحكم Supabase SQL Editor.

### 5. تشغيل التطبيق

```
npm run dev
```

سيكون التطبيق متاحًا على العنوان التالي: `http://localhost:5173`

## تعليمات إعداد النطاقات الفرعية للتطوير

لاستخدام النطاقات الفرعية أثناء التطوير المحلي، يجب إجراء التغييرات التالية:

### تعديل ملف hosts

#### في نظام Windows:
1. افتح Notepad كمسؤول
2. افتح الملف: `C:\Windows\System32\drivers\etc\hosts`
3. أضف الأسطر التالية:
```
127.0.0.1 localhost
127.0.0.1 mystore.localhost
127.0.0.1 store1.localhost
127.0.0.1 store2.localhost
# أضف المزيد من النطاقات الفرعية حسب الحاجة
```

#### في نظام macOS / Linux:
1. افتح Terminal
2. قم بتحرير ملف hosts بالأمر: `sudo nano /etc/hosts`
3. أضف الأسطر التالية:
```
127.0.0.1 localhost
127.0.0.1 mystore.localhost
127.0.0.1 store1.localhost
127.0.0.1 store2.localhost
# أضف المزيد من النطاقات الفرعية حسب الحاجة
```
4. احفظ الملف (Ctrl+O ثم Enter) واخرج (Ctrl+X)

### الوصول إلى التطبيق
بعد تشغيل الخادم المحلي (`npm run dev`)، يمكنك الوصول إلى التطبيق باستخدام النطاقات الفرعية:
- http://mystore.localhost:8080
- http://store1.localhost:8080
- http://store2.localhost:8080

الآن يعمل النظام بنطاقات فرعية حقيقية بدلاً من معلمات الاستعلام `?subdomain=mystore`.

## إعداد النطاقات الفرعية للإنتاج

لتكوين النطاقات الفرعية في بيئة الإنتاج، يجب إعداد DNS كالتالي:

### 1. إعداد سجل Wildcard DNS

أضف سجل DNS من نوع `A` أو `CNAME` في لوحة تحكم مزود استضافة DNS الخاص بك:

```
*.yourdomain.com  →  [عنوان IP الخاص بخادمك]
```

أو إذا كنت تستخدم خدمة مثل Vercel أو Netlify:

```
*.yourdomain.com  →  CNAME  →  yourdomain.com
```

### 2. تكوين خادم الويب

#### لخادم Nginx
أضف التكوين التالي إلى تكوين Nginx:

```nginx
server {
    listen 80;
    server_name ~^(?<subdomain>.+)\.yourdomain\.com$;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # للحفاظ على النطاق الفرعي في طلبات الخادم
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

### 3. للاستضافة على منصات سحابية

- **Vercel**: تدعم النطاقات الفرعية تلقائيًا بعد إضافة إعداد DNS
- **Netlify**: قم بتكوين redirects في ملف `_redirects` أو `netlify.toml`
- **AWS Amplify**: يدعم النطاقات الفرعية المخصصة من خلال إعدادات DNS الخاصة به

### 4. اختبار النطاقات الفرعية

بعد الانتهاء من الإعداد، يمكن الوصول إلى متاجرك عبر روابط مثل:
- https://store1.yourdomain.com
- https://store2.yourdomain.com

## هيكل المشروع

```
/
├── public/            # الملفات العامة والصور
├── src/
│   ├── components/    # مكونات UI قابلة لإعادة الاستخدام
│   ├── context/       # React Contexts (المصادقة، المتجر، إلخ)
│   ├── data/          # بيانات ثابتة
│   ├── hooks/         # React Hooks مخصصة
│   ├── lib/
│   │   ├── api/       # وظائف الاتصال بـ Supabase
│   │   └── supabase.ts # تهيئة عميل Supabase
│   ├── pages/         # صفحات التطبيق
│   └── types/         # أنواع TypeScript
└── supabase/
    ├── migrations/    # ملفات الترحيل لقاعدة البيانات
    └── config/        # ملفات إعداد Supabase
```

## ميزات التطبيق

- **المصادقة**: تسجيل الدخول، التسجيل، إدارة الحسابات
- **إدارة المنتجات**: إضافة، تعديل، حذف المنتجات
- **إدارة الطلبات**: عرض، تحديث حالة، وإلغاء الطلبات
- **نقطة البيع**: واجهة سهلة لإدارة المبيعات
- **لوحة التحكم**: رؤية شاملة لتحليل المبيعات والمخزون

## المساهمة

نرحب بمساهماتكم! يرجى إرسال طلب سحب للميزات أو الإصلاحات.

## النشر على Vercel

يمكن نشر هذا التطبيق بسهولة على منصة Vercel باتباع الخطوات التالية:

### 1. إعداد حساب Vercel
- قم بإنشاء حساب على [Vercel](https://vercel.com) إذا لم يكن لديك حساب بالفعل
- قم بتثبيت CLI الخاص بـ Vercel: `npm i -g vercel`

### 2. تكوين Vercel
- تأكد من وجود ملف `vercel.json` في مجلد المشروع الرئيسي (تم إضافته بالفعل)
- يحتوي هذا الملف على إعدادات خاصة بـ Vite ويضمن عمل التوجيه (routing) بشكل صحيح للتطبيق

### 3. تعيين متغيرات البيئة
قبل النشر، يجب تعيين متغيرات البيئة التالية في لوحة تحكم Vercel:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. النشر
- اربط المشروع بـ GitHub وقم بالنشر مباشرة من لوحة تحكم Vercel:
  1. اذهب إلى [لوحة تحكم Vercel](https://vercel.com/dashboard)
  2. انقر على "Add New" -> "Project"
  3. اختر مستودع GitHub الخاص بالمشروع
  4. قم بتكوين متغيرات البيئة
  5. انقر على "Deploy"

- أو استخدم Vercel CLI:
  ```
  vercel login
  vercel
  ```

### 5. إعداد النطاقات الفرعية
Vercel يدعم النطاقات الفرعية بشكل مباشر. بعد ربط النطاق الرئيسي الخاص بك، يمكنك إضافة سجل DNS من نوع wildcard:
```
*.yourdomain.com  →  cname  →  cname.vercel-dns.com
```

### 6. النشر التلقائي
يتم تكوين Vercel تلقائيًا لإعادة نشر التطبيق عند كل دفع إلى الفرع الرئيسي في GitHub. يمكنك تخصيص هذا السلوك من إعدادات المشروع في لوحة تحكم Vercel.

## إدارة قاعدة البيانات للعمل دون اتصال

يتضمن المشروع دعمًا للعمل دون اتصال بالإنترنت عن طريق نسخ قاعدة البيانات من Supabase إلى SQLite محلية.

### استخراج قاعدة البيانات

يمكن استخراج هيكل وبيانات قاعدة البيانات بإحدى الطرق التالية:

1. **من واجهة المستخدم**: انتقل إلى `قاعدة البيانات` في قائمة الإعدادات، ثم استخدم واجهة التصدير/الاستيراد.

2. **باستخدام السكريبت**: يمكن تشغيل سكريبت استخراج قاعدة البيانات من سطر الأوامر:

   ```bash
   # للتطوير المحلي
   npx ts-node src/scripts/execute-schema-extractor.ts
   
   # أو بعد البناء
   node dist/scripts/execute-schema-extractor.js
   ```

### استخدام نسخة قاعدة البيانات المحلية

يتم استخدام قاعدة البيانات المحلية تلقائيًا عندما يكون الجهاز غير متصل بالإنترنت. يمكن مزامنة التغييرات مع الخادم عند استعادة الاتصال.

- تهيئة قاعدة البيانات المحلية تتم تلقائيًا عند أول استخدام للتطبيق دون اتصال.
- يمكن تخصيص جداول المزامنة من خلال صفحة إعدادات قاعدة البيانات.

للمزيد من المعلومات، راجع [وثائق العمل دون اتصال](docs/offline-mode.md).

## تكوين وظائف Supabase RPC للتصدير والاستيراد

لتمكين ميزات تصدير واستيراد قاعدة البيانات بشكل كامل، تحتاج إلى إنشاء عدة وظائف RPC في قاعدة بيانات Supabase الخاصة بك. هذه الوظائف موجودة في مجلد `src/sql/`:

1. **get_available_tables**: تسترجع قائمة بجميع الجداول المتاحة (`src/sql/create_get_available_tables_function.sql`)
2. **get_table_columns**: تسترجع معلومات الأعمدة لجدول معين (`src/sql/create_table_columns_function.sql`)
3. **get_primary_keys**: تسترجع المفاتيح الأساسية لجدول معين (`src/sql/create_primary_keys_function.sql`)
4. **get_table_indexes**: تسترجع الفهارس لجدول معين (`src/sql/create_table_indexes_function.sql`)
5. **query_tables**: وظيفة مساعدة لتنفيذ استعلامات SQL مخصصة (`src/sql/create_query_tables_function.sql`)

### كيفية إنشاء الوظائف في Supabase

1. انتقل إلى [لوحة تحكم Supabase](https://app.supabase.io)
2. اختر مشروعك
3. انتقل إلى قسم "SQL Editor" (محرر SQL)
4. قم بإنشاء استعلام جديد لكل وظيفة وانسخ محتوى الملف المقابل
5. قم بتنفيذ الاستعلام

> ملاحظة: إذا لم تتمكن من إنشاء هذه الوظائف، فإن التطبيق سيعمل باستخدام طرق بديلة، ولكن بعض الميزات قد تكون محدودة.
