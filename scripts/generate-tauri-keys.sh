#!/bin/bash

# سكريبت لإنشاء مفاتيح التوقيع لـ Tauri Updater
# يجب تشغيله مرة واحدة فقط وحفظ المفاتيح بأمان

echo "🔐 إنشاء مفاتيح التوقيع لـ Tauri Updater..."
echo ""

# التحقق من تثبيت Tauri CLI
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo غير مثبت. يرجى تثبيت Rust أولاً."
    exit 1
fi

# التحقق من وجود tauri-cli
if ! cargo tauri --version &> /dev/null; then
    echo "📦 تثبيت Tauri CLI..."
    cargo install tauri-cli
fi

echo "📝 إنشاء زوج مفاتيح جديد..."
echo ""

# إنشاء المفاتيح
cd "$(dirname "$0")/.."
cargo tauri signer generate -w ./tauri-private.key

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم إنشاء المفاتيح بنجاح!"
    echo ""
    echo "📁 الملفات المُنشأة:"
    echo "   - tauri-private.key (المفتاح الخاص - احفظه بأمان!)"
    echo ""
    echo "⚠️  مهم جداً:"
    echo "   1. لا تشارك المفتاح الخاص أبداً"
    echo "   2. أضف المفتاح الخاص إلى .gitignore"
    echo "   3. احفظ المفتاح في مكان آمن (مثل 1Password أو Vault)"
    echo ""
    echo "🔧 الخطوة التالية:"
    echo "   أضف هذه الـ secrets إلى GitHub Repository:"
    echo ""
    echo "   TAURI_SIGNING_PRIVATE_KEY: (محتوى الملف tauri-private.key)"
    echo "   TAURI_SIGNING_PRIVATE_KEY_PASSWORD: (كلمة المرور التي أدخلتها)"
    echo ""
    echo "   المفتاح العام موجود بالفعل في tauri.conf.json"
    echo ""

    # إضافة المفتاح الخاص إلى .gitignore
    if ! grep -q "tauri-private.key" .gitignore 2>/dev/null; then
        echo "" >> .gitignore
        echo "# Tauri signing keys" >> .gitignore
        echo "tauri-private.key" >> .gitignore
        echo "*.key" >> .gitignore
        echo "📝 تمت إضافة المفتاح الخاص إلى .gitignore"
    fi
else
    echo "❌ فشل إنشاء المفاتيح"
    exit 1
fi
