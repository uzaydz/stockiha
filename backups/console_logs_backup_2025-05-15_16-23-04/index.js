import app from './api/index.js';

// استخراج منفذ الخادم من متغيرات البيئة أو استخدام المنفذ الافتراضي 3001
const PORT = process.env.API_PORT || 3001;

// بدء تشغيل الخادم
app.listen(PORT, () => {
  console.log(`🌐 خادم الـ API يعمل على المنفذ ${PORT}`);
  console.log(`📑 للتحقق من الحالة، قم بزيارة: http://localhost:${PORT}/api/status`);
}); 