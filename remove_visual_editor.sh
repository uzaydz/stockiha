#!/bin/bash

# سكريبت لحذف محرر المتجر المرئي (visual-editor)
echo "بدء عملية حذف محرر المتجر المرئي..."

# حذف مجلد visual-editor الرئيسي
if [ -d "src/features/visual-editor" ]; then
  echo "جاري حذف مجلد src/features/visual-editor..."
  rm -rf src/features/visual-editor
else
  echo "مجلد src/features/visual-editor غير موجود."
fi

# حذف صفحة المحرر المرئي
if [ -f "src/pages/dashboard/VisualEditor.tsx" ]; then
  echo "جاري حذف صفحة src/pages/dashboard/VisualEditor.tsx..."
  rm -f src/pages/dashboard/VisualEditor.tsx
else
  echo "ملف src/pages/dashboard/VisualEditor.tsx غير موجود."
fi

# حذف مجلد الأنماط (patterns) إذا وجد
if [ -d "public/patterns" ]; then
  echo "جاري حذف مجلد public/patterns..."
  rm -rf public/patterns
else
  echo "مجلد public/patterns غير موجود."
fi

# إزالة visual-editor من ملف التنقل إذا وجد
echo "جاري تحديث ملف التنقل لإزالة روابط المحرر المرئي..."
grep -l "visual-editor" $(find src -name "*.tsx" -o -name "*.ts") | xargs -I{} sed -i '' -e '/visual-editor/d' {}

echo "تم الانتهاء من حذف محرر المتجر المرئي بنجاح."
echo "ملاحظة: قم بتنفيذ ملف reset_visual_editor.sql على قاعدة البيانات لإزالة البيانات المرتبطة." 