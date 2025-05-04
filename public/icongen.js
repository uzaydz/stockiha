const fs = require('fs');
const path = require('path');

// سكريبت بسيط لإنشاء ملف نصي بدلاً من ملف الصورة
// في المشروع الحقيقي، يجب استخدام أيقونة حقيقية
fs.writeFileSync(
  path.join(__dirname, 'icon.txt'),
  '# ملاحظة: استبدل هذا الملف بصورة أيقونة حقيقية بحجم 512x512 بصيغة PNG'
);

console.log('تم إنشاء ملف الأيقونة المؤقت'); 