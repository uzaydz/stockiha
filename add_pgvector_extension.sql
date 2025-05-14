-- تمكين امتداد pgvector في قاعدة البيانات
-- هذا الامتداد يسمح بدعم البحث الشعاعي (vector search) لتطبيقات الذكاء الاصطناعي والبحث الدلالي

-- التأكد من وجود الامتدادات اللازمة
CREATE EXTENSION IF NOT EXISTS vector;

-- التحقق من تثبيت الامتداد
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- ملاحظة: لتشغيل هذا الملف في Supabase، يمكن استخدام الأمر التالي:
-- PSQL: \i add_pgvector_extension.sql
-- أو من خلال واجهة Supabase SQL Editor 