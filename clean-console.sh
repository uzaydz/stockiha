#!/bin/bash

# سكربت لحذف جميع عبارات console من المشروع
# الاستخدام: ./clean-console.sh [المسار]

set -e

# الألوان للإخراج
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 سكربت تنظيف عبارات Console${NC}"
echo -e "${BLUE}================================${NC}"

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ خطأ: Node.js غير مثبت${NC}"
    echo -e "${YELLOW}يرجى تثبيت Node.js أولاً${NC}"
    exit 1
fi

# المسار المستهدف (افتراضياً src)
TARGET_PATH=${1:-"./src"}

echo -e "${BLUE}📁 المسار المستهدف: ${TARGET_PATH}${NC}"

# التحقق من وجود المسار
if [ ! -e "$TARGET_PATH" ]; then
    echo -e "${RED}❌ خطأ: المسار '$TARGET_PATH' غير موجود${NC}"
    exit 1
fi

# إنشاء نسخة احتياطية (اختياري)
read -p "هل تريد إنشاء نسخة احتياطية قبل التنظيف؟ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
    echo -e "${YELLOW}📦 إنشاء نسخة احتياطية في: $BACKUP_DIR${NC}"
    
    if [ -d "$TARGET_PATH" ]; then
        cp -r "$TARGET_PATH" "$BACKUP_DIR"
    else
        cp "$TARGET_PATH" "$BACKUP_DIR"
    fi
    
    echo -e "${GREEN}✅ تم إنشاء النسخة الاحتياطية${NC}"
fi

# تشغيل سكربت التنظيف
echo -e "${BLUE}🚀 بدء عملية التنظيف...${NC}"
echo

# التحقق من وجود ملف السكربت
if [ ! -f "remove-console-statements.js" ]; then
    echo -e "${RED}❌ خطأ: ملف remove-console-statements.js غير موجود${NC}"
    exit 1
fi

# تشغيل السكربت
node remove-console-statements.js "$TARGET_PATH"

echo
echo -e "${GREEN}🎉 انتهت عملية التنظيف!${NC}"

# عرض الملفات المعدلة حديثاً (اختياري)
read -p "هل تريد عرض الملفات التي تم تعديلها؟ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📋 الملفات المعدلة في آخر 5 دقائق:${NC}"
    find "$TARGET_PATH" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.vue" -o -name "*.svelte" | xargs ls -lt | head -20
fi

echo -e "${GREEN}✨ تم الانتهاء بنجاح!${NC}" 