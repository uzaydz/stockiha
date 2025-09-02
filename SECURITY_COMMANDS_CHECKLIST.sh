#!/bin/bash
# =============================================================================
# قائمة أوامر الفحص الأمني الشامل - مشروع Stokiha
# تاريخ الإنشاء: 15 يناير 2025
# الهدف: أوامر قابلة للتشغيل لإعادة التحقق من الأمان
# =============================================================================

set -e

echo "🔍 بدء الفحص الأمني الشامل لمشروع Stokiha..."
echo "======================================================"

# إنشاء مجلد التقارير
mkdir -p security-reports
cd security-reports

echo "📁 إنشاء مجلد التقارير: security-reports/"

# =============================================================================
# 1. فحص تسريب الأسرار (Secrets Detection)
# =============================================================================
echo ""
echo "🔐 1. فحص تسريب الأسرار..."
echo "-----------------------------"

# Gitleaks - فحص تاريخ Git
if command -v gitleaks &> /dev/null; then
    echo "   🔍 تشغيل Gitleaks..."
    gitleaks detect --source .. --report-path gitleaks-report.json --verbose
    echo "   ✅ تم حفظ التقرير: gitleaks-report.json"
else
    echo "   ⚠️  Gitleaks غير مثبت. تثبيت: https://github.com/gitleaks/gitleaks"
fi

# TruffleHog - فحص شامل للملفات
if command -v trufflehog &> /dev/null; then
    echo "   🔍 تشغيل TruffleHog..."
    trufflehog filesystem --directory .. --json > trufflehog-report.json
    echo "   ✅ تم حفظ التقرير: trufflehog-report.json"
else
    echo "   ⚠️  TruffleHog غير مثبت. تثبيت: pip install truffleHog"
fi

# فحص يدوي للمفاتيح
echo "   🔍 فحص يدوي للمفاتيح الحساسة..."
grep -r "SUPABASE\|API\|TOKEN\|KEY\|SECRET" --exclude-dir=node_modules --exclude-dir=security-reports .. > manual-secrets-scan.txt 2>/dev/null || true
echo "   ✅ تم حفظ الفحص اليدوي: manual-secrets-scan.txt"

# =============================================================================
# 2. فحص الاعتماديات (Dependencies Audit)
# =============================================================================
echo ""
echo "📦 2. فحص الاعتماديات..."
echo "-------------------------"

# NPM Audit
if [ -f "../package.json" ]; then
    echo "   🔍 تشغيل npm audit..."
    cd ..
    npm audit --json > security-reports/npm-audit-report.json 2>/dev/null || echo "   ⚠️  npm audit أكمل مع تحذيرات"
    npm audit --audit-level high > security-reports/npm-audit-high.txt 2>/dev/null || true
    cd security-reports
    echo "   ✅ تم حفظ تقرير npm: npm-audit-report.json"
else
    echo "   ⚠️  ملف package.json غير موجود"
fi

# Snyk (إن كان متوفراً)
if command -v snyk &> /dev/null; then
    echo "   🔍 تشغيل Snyk..."
    snyk test --json > snyk-report.json 2>/dev/null || echo "   ⚠️  Snyk أكمل مع تحذيرات"
    echo "   ✅ تم حفظ تقرير Snyk: snyk-report.json"
else
    echo "   ⚠️  Snyk غير مثبت. تثبيت: npm install -g snyk"
fi

# =============================================================================
# 3. فحص الكود الثابت (Static Code Analysis)
# =============================================================================
echo ""
echo "🔍 3. فحص الكود الثابت..."
echo "-------------------------"

# ESLint Security Plugin
if [ -f "../.eslintrc.js" ] || [ -f "../eslint.config.js" ]; then
    echo "   🔍 تشغيل ESLint مع قواعد الأمان..."
    cd ..
    npx eslint --ext .js,.jsx,.ts,.tsx src/ --format json > security-reports/eslint-security.json 2>/dev/null || true
    cd security-reports
    echo "   ✅ تم حفظ تقرير ESLint: eslint-security.json"
else
    echo "   ⚠️  ESLint غير مكون"
fi

# فحص أنماط الأمان الأساسية
echo "   🔍 فحص أنماط الأمان الأساسية..."
grep -r "eval\|innerHTML\|dangerouslySetInnerHTML\|document.write" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" .. > security-patterns.txt 2>/dev/null || true
echo "   ✅ تم حفظ فحص الأنماط: security-patterns.txt"

# =============================================================================
# 4. فحص إعدادات الأمان (Security Configuration)
# =============================================================================
echo ""
echo "⚙️  4. فحص إعدادات الأمان..."
echo "-----------------------------"

# فحص Content Security Policy
echo "   🔍 فحص Content Security Policy..."
if [ -f "../vercel.json" ]; then
    grep -A 10 -B 2 "Content-Security-Policy" ../vercel.json > csp-config.txt 2>/dev/null || true
    echo "   ✅ تم حفظ إعدادات CSP: csp-config.txt"
fi

# فحص CORS Settings
echo "   🔍 فحص إعدادات CORS..."
grep -r "cors\|Access-Control" --include="*.json" --include="*.js" --include="*.ts" .. > cors-settings.txt 2>/dev/null || true
echo "   ✅ تم حفظ إعدادات CORS: cors-settings.txt"

# فحص SSL/TLS Configuration
echo "   🔍 فحص إعدادات SSL/TLS..."
grep -r "https\|ssl\|tls" --include="*.json" --include="*.js" --include="*.ts" .. | head -20 > ssl-config.txt 2>/dev/null || true
echo "   ✅ تم حفظ إعدادات SSL: ssl-config.txt"

# =============================================================================
# 5. فحص قاعدة البيانات (Database Security)
# =============================================================================
echo ""
echo "🗄️  5. فحص أمان قاعدة البيانات..."
echo "--------------------------------"

# فحص RLS Policies
echo "   🔍 فحص RLS Policies..."
if [ -d "../supabase/migrations" ]; then
    grep -r "ROW LEVEL SECURITY\|POLICY\|SECURITY DEFINER" ../supabase/migrations/ > rls-policies.txt 2>/dev/null || true
    echo "   ✅ تم حفظ فحص RLS: rls-policies.txt"
fi

# فحص SQL Injection Patterns
echo "   🔍 فحص أنماط SQL Injection..."
grep -r "query\|execute\|raw\|unsafe" --include="*.sql" --include="*.js" --include="*.ts" .. | grep -v node_modules > sql-patterns.txt 2>/dev/null || true
echo "   ✅ تم حفظ فحص SQL: sql-patterns.txt"

# =============================================================================
# 6. فحص APIs والشبكة (API & Network Security)
# =============================================================================
echo ""
echo "🌐 6. فحص أمان APIs والشبكة..."
echo "-------------------------------"

# فحص Rate Limiting
echo "   🔍 فحص Rate Limiting..."
grep -r "rate.limit\|throttle\|429" --include="*.js" --include="*.ts" .. > rate-limiting.txt 2>/dev/null || true
echo "   ✅ تم حفظ فحص Rate Limiting: rate-limiting.txt"

# فحص Authentication Patterns
echo "   🔍 فحص أنماط المصادقة..."
grep -r "auth\|token\|session\|login" --include="*.js" --include="*.ts" .. | head -30 > auth-patterns.txt 2>/dev/null || true
echo "   ✅ تم حفظ فحص المصادقة: auth-patterns.txt"

# فحص HTTPS Enforcement
echo "   🔍 فحص فرض HTTPS..."
grep -r "http:" --include="*.js" --include="*.ts" --include="*.json" .. | grep -v "localhost" > http-usage.txt 2>/dev/null || true
echo "   ✅ تم حفظ فحص HTTP: http-usage.txt"

# =============================================================================
# 7. فحص الحاويات والبنية التحتية (Infrastructure Security)
# =============================================================================
echo ""
echo "🐳 7. فحص البنية التحتية..."
echo "---------------------------"

# فحص Dockerfile (إن وجد)
if [ -f "../Dockerfile" ]; then
    echo "   🔍 فحص Dockerfile..."
    if command -v hadolint &> /dev/null; then
        hadolint ../Dockerfile > dockerfile-security.txt 2>/dev/null || true
        echo "   ✅ تم حفظ فحص Dockerfile: dockerfile-security.txt"
    else
        echo "   ⚠️  Hadolint غير مثبت"
    fi
else
    echo "   ℹ️  لا يوجد Dockerfile"
fi

# فحص Docker Compose (إن وجد)
if [ -f "../docker-compose.yml" ]; then
    echo "   🔍 فحص Docker Compose..."
    grep -A 5 -B 5 "ports\|volumes\|environment" ../docker-compose.yml > docker-compose-security.txt 2>/dev/null || true
    echo "   ✅ تم حفظ فحص Docker Compose: docker-compose-security.txt"
else
    echo "   ℹ️  لا يوجد docker-compose.yml"
fi

# =============================================================================
# 8. إنشاء تقرير موجز
# =============================================================================
echo ""
echo "📊 8. إنشاء التقرير الموجز..."
echo "-----------------------------"

cat > security-scan-summary.txt << EOF
=============================================================================
ملخص الفحص الأمني - مشروع Stokiha
تاريخ الفحص: $(date)
=============================================================================

📁 الملفات المنشأة:
$(ls -la *.txt *.json 2>/dev/null | wc -l) ملف تقرير

🔐 فحص الأسرار:
- Gitleaks: $([ -f "gitleaks-report.json" ] && echo "✅ مكتمل" || echo "❌ غير متوفر")
- TruffleHog: $([ -f "trufflehog-report.json" ] && echo "✅ مكتمل" || echo "❌ غير متوفر")
- الفحص اليدوي: $([ -f "manual-secrets-scan.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")

📦 فحص الاعتماديات:
- npm audit: $([ -f "npm-audit-report.json" ] && echo "✅ مكتمل" || echo "❌ غير متوفر")
- Snyk: $([ -f "snyk-report.json" ] && echo "✅ مكتمل" || echo "❌ غير متوفر")

🔍 فحص الكود:
- ESLint: $([ -f "eslint-security.json" ] && echo "✅ مكتمل" || echo "❌ غير متوفر")
- أنماط الأمان: $([ -f "security-patterns.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")

⚙️  فحص الإعدادات:
- CSP: $([ -f "csp-config.txt" ] && echo "✅ مكتمل" || echo "❌ غير متوفر")
- CORS: $([ -f "cors-settings.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")
- SSL/TLS: $([ -f "ssl-config.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")

🗄️  فحص قاعدة البيانات:
- RLS Policies: $([ -f "rls-policies.txt" ] && echo "✅ مكتمل" || echo "❌ غير متوفر")
- SQL Patterns: $([ -f "sql-patterns.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")

🌐 فحص الشبكة:
- Rate Limiting: $([ -f "rate-limiting.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")
- Authentication: $([ -f "auth-patterns.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")
- HTTPS: $([ -f "http-usage.txt" ] && echo "✅ مكتمل" || echo "❌ فشل")

=============================================================================
📋 التوصيات التالية:
1. مراجعة جميع التقارير المنشأة
2. إصلاح الثغرات المكتشفة حسب الأولوية
3. تطبيق الإصلاحات المقترحة في التقرير الرئيسي
4. إعادة تشغيل هذا الفحص بعد الإصلاحات

📞 للدعم: راجع التقرير الرئيسي SECURITY_AUDIT_REPORT_AR.md
=============================================================================
EOF

echo "   ✅ تم إنشاء الملخص: security-scan-summary.txt"

# =============================================================================
# 9. أوامر الإصلاح السريع (Quick Fix Commands)
# =============================================================================
echo ""
echo "🔧 9. إنشاء أوامر الإصلاح السريع..."
echo "-----------------------------------"

cat > quick-fix-commands.sh << 'EOF'
#!/bin/bash
# =============================================================================
# أوامر الإصلاح السريع - مشروع Stokiha
# تحذير: راجع كل أمر قبل التنفيذ
# =============================================================================

echo "🚨 تحذير: هذه أوامر الإصلاح السريع"
echo "يرجى مراجعة كل أمر قبل التنفيذ"
echo "======================================="

# إصلاح 1: تحديث الاعتماديات
echo ""
echo "📦 1. تحديث الاعتماديات..."
read -p "هل تريد تحديث الاعتماديات؟ (y/N): " update_deps
if [[ $update_deps =~ ^[Yy]$ ]]; then
    echo "   🔄 تحديث npm packages..."
    npm audit fix --force
    npm update
    echo "   ✅ تم تحديث الاعتماديات"
fi

# إصلاح 2: تحسين CSP
echo ""
echo "🛡️  2. تحسين Content Security Policy..."
read -p "هل تريد تطبيق CSP محسن؟ (y/N): " update_csp
if [[ $update_csp =~ ^[Yy]$ ]]; then
    echo "   ⚠️  يرجى تحديث vercel.json يدوياً حسب التوصيات"
    echo "   📋 راجع التقرير الرئيسي للإعدادات المحسنة"
fi

# إصلاح 3: إزالة الأسرار المكشوفة
echo ""
echo "🔐 3. إزالة الأسرار المكشوفة..."
read -p "هل تريد إزالة الأسرار من .env؟ (y/N): " remove_secrets
if [[ $remove_secrets =~ ^[Yy]$ ]]; then
    echo "   ⚠️  يرجى إنشاء مفاتيح جديدة في Supabase أولاً"
    echo "   📋 راجع التقرير الرئيسي للخطوات التفصيلية"
fi

# إصلاح 4: إضافة Security Headers
echo ""
echo "🔒 4. إضافة Security Headers..."
read -p "هل تريد إضافة Security Headers؟ (y/N): " add_headers
if [[ $add_headers =~ ^[Yy]$ ]]; then
    echo "   📝 إضافة Headers في vercel.json..."
    echo "   ⚠️  يرجى التحديث اليدوي حسب التوصيات"
fi

echo ""
echo "✅ انتهت أوامر الإصلاح السريع"
echo "📋 راجع التقرير الرئيسي للتفاصيل الكاملة"
EOF

chmod +x quick-fix-commands.sh
echo "   ✅ تم إنشاء أوامر الإصلاح: quick-fix-commands.sh"

# =============================================================================
# 10. الخاتمة
# =============================================================================
echo ""
echo "🎉 اكتمل الفحص الأمني الشامل!"
echo "==============================="
echo ""
echo "📁 مجلد التقارير: $(pwd)"
echo "📊 عدد التقارير: $(ls -1 *.txt *.json 2>/dev/null | wc -l)"
echo "📋 الملخص: security-scan-summary.txt"
echo "🔧 أوامر الإصلاح: quick-fix-commands.sh"
echo ""
echo "📖 للمراجعة التفصيلية، راجع:"
echo "   - SECURITY_AUDIT_REPORT_AR.md (التقرير الرئيسي)"
echo "   - security-scan-summary.txt (الملخص)"
echo ""
echo "🚨 الخطوات التالية:"
echo "   1. راجع جميع التقارير المنشأة"
echo "   2. ابدأ بإصلاح الثغرات الحرجة"
echo "   3. اتبع خطة الإصلاح في التقرير الرئيسي"
echo "   4. أعد تشغيل هذا الفحص بعد الإصلاحات"
echo ""
echo "✅ انتهى الفحص بنجاح!"
