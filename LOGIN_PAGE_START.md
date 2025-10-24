# بدء التطبيق بصفحة الدخول

## 🔧 الإعدادات الحالية

التطبيق الآن مهيأ للبدء مباشرة بصفحة الدخول (`/login`).

## 📋 كيفية العمل

### في التطوير (Dev)
```
Electron → http://localhost:8080/login
         ↓
      Vite Dev Server يحمّل index.html
         ↓
      React Router يعرض صفحة /login
         ↓
      LoginForm يتم تحميله من LazyRoutes
```

### في الإنتاج (Production)
```
Electron → file:///path/to/dist/index.html
         ↓
      React Router يتحقق من المسار الحالي
         ↓
      إذا كان المستخدم مسجل الدخول → إعادة توجيه إلى /dashboard
         ↓
      إذا لم يكن مسجل الدخول → عرض صفحة /login
```

## 🔑 المكونات الرئيسية

### 1. **electron/main.cjs** (التطبيق المكتبي)
```javascript
const devUrl = 'http://localhost:8080/login';  // ✅ بدء بصفحة الدخول
mainWindow.loadURL(devUrl);

// ✅ SPA Fallback: إذا فشل أي مسار، تحميل index.html
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
  if (validatedURL && !validatedURL.startsWith('file://')) {
    mainWindow.loadFile(prodPath);
  }
});
```

### 2. **src/apps/AdminApp.tsx** (React Router)
```typescript
<Route
  path="/login"
  element={
    <SuspenseRoute fallback={<AppLoader message="جاري تحميل صفحة الدخول..." />}>
      <PublicRoute>
        <LazyRoutes.LoginForm />
      </PublicRoute>
    </SuspenseRoute>
  }
/>
```

### 3. **src/components/auth/PublicRoute.tsx** (حماية المسار)
```typescript
const PublicRoute = ({ children, redirectTo = '/dashboard' }: PublicRouteProps) => {
  // إذا كان المستخدم مسجل الدخول → إعادة توجيه إلى /dashboard
  if (user && userProfile) {
    return <Navigate to={targetPath} replace />;
  }
  
  // إذا لم يكن مسجل الدخول → عرض صفحة الدخول
  return <>{children}</>;
};
```

### 4. **index.html** (نقطة الدخول)
```html
<script type="module">
  const entry = './src/main.tsx';  // ✅ مسار نسبي
  const loadDefaultEntry = () => import('./src/main.tsx');
  loadEntry();
</script>
```

## 🚀 الخطوات للتشغيل

### 1. التطوير
```bash
npm run desktop:dev
# أو
npm run dev
```

### 2. البناء
```bash
npm run desktop:build
```

### 3. اختبار الإنتاج
```bash
npm run desktop:build
open dist-electron/Stockiha.app
```

## ✨ السلوك المتوقع

### عند فتح التطبيق لأول مرة
1. ✅ يظهر شاشة تحميل
2. ✅ يتم تحميل صفحة الدخول
3. ✅ يمكن إدخال بيانات المستخدم

### بعد تسجيل الدخول بنجاح
1. ✅ يتم إعادة التوجيه إلى `/dashboard`
2. ✅ يتم حفظ بيانات المستخدم
3. ✅ عند إغلاق وفتح التطبيق مرة أخرى، يتم الانتقال مباشرة إلى `/dashboard`

### عند تسجيل الخروج
1. ✅ يتم حذف بيانات المستخدم
2. ✅ يتم إعادة التوجيه إلى `/login`

## 🔐 الأمان

- ✅ **PublicRoute** يحمي صفحات الدخول من الوصول المباشر للمستخدمين المسجلين
- ✅ **ProtectedRoute** يحمي صفحات الإدارة من الوصول للمستخدمين غير المسجلين
- ✅ **AuthContext** يدير حالة المصادقة بشكل آمن

## 📝 ملاحظات مهمة

1. **المسارات النسبية** ضرورية في `index.html` و `electron/main.cjs`
2. **SPA Fallback** يضمن أن أي مسار يتم معالجته بواسطة React Router
3. **PublicRoute** يتحقق من حالة المستخدم ويعيد التوجيه تلقائياً

## 🐛 استكشاف الأخطاء

### إذا لم تظهر صفحة الدخول

1. **تحقق من console logs:**
   ```
   [Electron] تحميل التطبيق المكتبي من: http://localhost:8080/login
   [ENTRY] chosenEntry = ./src/main.tsx
   ```

2. **تأكد من أن Vite يعمل:**
   ```bash
   npm run dev
   # ثم افتح http://localhost:8080/login في المتصفح
   ```

3. **تحقق من React Router:**
   - افتح DevTools (Cmd+Option+I)
   - تحقق من عدم وجود أخطاء في console

### إذا حدثت إعادة توجيه غير متوقعة

1. **تحقق من `PublicRoute`:**
   - هل يوجد مستخدم مسجل الدخول؟
   - تحقق من `localStorage` و `sessionStorage`

2. **امسح البيانات المحفوظة:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

---

**آخر تحديث:** 2025-10-22
**الحالة:** ✅ جاهز للاستخدام
