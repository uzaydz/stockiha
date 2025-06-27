#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 بدء تطبيق إصلاحات الأداء...\n');

// 1. البحث عن جميع ملفات setInterval
console.log('🔍 البحث عن استخدامات setInterval...');
try {
  const setIntervalFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "setInterval"', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file && !file.includes('backup'));

  console.log(`📁 وجد ${setIntervalFiles.length} ملف يحتوي على setInterval:`);
  setIntervalFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');

} catch (error) {
  console.log('✅ لم يتم العثور على استخدامات setInterval إضافية');
}

// 2. البحث عن استخدامات console.log
console.log('🔍 البحث عن استخدامات console.log...');
try {
  const consoleFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "console\\.log" | head -20', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file && !file.includes('backup'));

  console.log(`📁 وجد ${consoleFiles.length} ملف يحتوي على console.log (أول 20):`);
  consoleFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');

  // تطبيق إصلاح console.log على أهم الملفات
  const criticalFiles = [
    'src/hooks/useOrdersData.ts',
    'src/hooks/useInventoryAdvanced.ts',
    'src/lib/requestDeduplicationGlobal.ts',
    'src/lib/memory-analyzer.ts',
    'src/lib/performance-tracker.ts'
  ];

  console.log('🔧 تطبيق console-manager على الملفات الحرجة...');
  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // إضافة import إذا لم يكن موجوداً
        if (!content.includes('console-manager') && !content.includes('consoleManager')) {
          const lines = content.split('\n');
          const importIndex = lines.findIndex(line => line.includes('import'));
          if (importIndex !== -1) {
            lines.splice(importIndex + 1, 0, "import { consoleManager } from '@/lib/console-manager';");
            content = lines.join('\n');
          }
        }

        // استبدال console.log الأساسية (تحتاج مراجعة يدوية)
        const consoleMethods = ['log', 'warn', 'error', 'info'];
        consoleMethods.forEach(method => {
          const regex = new RegExp(`console\\.${method}\\(`, 'g');
          content = content.replace(regex, `consoleManager.${method}(`);
        });

        fs.writeFileSync(file, content);
        console.log(`   ✅ تم تحديث ${file}`);
      } catch (error) {
        console.log(`   ❌ فشل في تحديث ${file}: ${error.message}`);
      }
    }
  });

} catch (error) {
  console.log('✅ لم يتم العثور على استخدامات console.log');
}

// 3. البحث عن أنظمة الكاش
console.log('\n🔍 البحث عن أنظمة الكاش...');
try {
  const cacheFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "CentralCacheManager\\|QueryClient\\|localStorage\\.setItem"', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file && !file.includes('backup'));

  console.log(`📁 وجد ${cacheFiles.length} ملف يحتوي على أنظمة كاش:`);
  cacheFiles.slice(0, 10).forEach(file => console.log(`   - ${file}`));
  if (cacheFiles.length > 10) console.log(`   ... و ${cacheFiles.length - 10} ملف آخر`);

} catch (error) {
  console.log('✅ لم يتم العثور على أنظمة كاش');
}

// 4. تطبيق unified-cache-system على الملفات الرئيسية
console.log('\n🔧 تطبيق unified-cache-system...');
const cacheTargetFiles = [
  'src/lib/api/centralRequestManager.ts',
  'src/context/DashboardDataContext.tsx',
  'src/hooks/useOrdersData.ts'
];

cacheTargetFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      
      // إضافة import إذا لم يكن موجوداً
      if (!content.includes('unified-cache-system') && !content.includes('unifiedCache')) {
        const lines = content.split('\n');
        const importIndex = lines.findIndex(line => line.includes('import'));
        if (importIndex !== -1) {
          lines.splice(importIndex + 1, 0, "import { unifiedCache } from '@/lib/unified-cache-system';");
          content = lines.join('\n');
        }
      }

      // استبدال استخدامات الكاش الأساسية
      content = content.replace(/localStorage\.setItem\(/g, 'unifiedCache.getCache("session-cache").set(');
      content = content.replace(/localStorage\.getItem\(/g, 'unifiedCache.getCache("session-cache").get(');

      fs.writeFileSync(file, content);
      console.log(`   ✅ تم تحديث ${file}`);
    } catch (error) {
      console.log(`   ❌ فشل في تحديث ${file}: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️ الملف غير موجود: ${file}`);
  }
});

// 5. إضافة PerformanceCleanupPanel إلى Layout
console.log('\n🔧 إضافة PerformanceCleanupPanel إلى Layout...');
const layoutFile = 'src/app/layout.tsx';
if (fs.existsSync(layoutFile)) {
  try {
    let content = fs.readFileSync(layoutFile, 'utf8');
    
    if (!content.includes('PerformanceCleanupPanel')) {
      // إضافة import
      const lines = content.split('\n');
      const importIndex = lines.findIndex(line => line.includes('import'));
      if (importIndex !== -1) {
        lines.splice(importIndex + 1, 0, "import { PerformanceCleanupPanel } from '@/components/debug/PerformanceCleanupPanel';");
      }
      
      // إضافة المكون (يحتاج مراجعة يدوية للموقع الصحيح)
      content = lines.join('\n');
      fs.writeFileSync(layoutFile, content);
      console.log(`   ✅ تم إضافة import إلى ${layoutFile} (يحتاج إضافة المكون يدوياً)`);
    } else {
      console.log(`   ✅ PerformanceCleanupPanel موجود بالفعل في ${layoutFile}`);
    }
  } catch (error) {
    console.log(`   ❌ فشل في تحديث ${layoutFile}: ${error.message}`);
  }
} else {
  console.log(`   ⚠️ الملف غير موجود: ${layoutFile}`);
}

// 6. إنشاء ملف تكوين تلقائي
console.log('\n🔧 إنشاء ملف تكوين الأداء...');
const configContent = `// تكوين أداء تلقائي - تم إنشاؤه بواسطة apply-performance-fixes.js
import { unifiedCache } from '@/lib/unified-cache-system';
import { consoleManager } from '@/lib/console-manager';
import { PerformanceCleanupManager } from '@/lib/performance-cleanup';

// تفعيل الأنظمة عند بدء التطبيق
export function initPerformanceSystems() {
  console.log('🚀 تفعيل أنظمة الأداء...');
  
  // تفعيل console manager (تعطيل في الإنتاج)
  if (process.env.NODE_ENV === 'production') {
    consoleManager.disable();
  } else {
    consoleManager.enable();
  }
  
  // تفعيل التنظيف التلقائي
  const cleanup = PerformanceCleanupManager.getInstance();
  cleanup.startAutomaticCleanup();
  
  // تحسين الكاش
  unifiedCache.optimizeMemory();
  
  console.log('✅ تم تفعيل جميع أنظمة الأداء');
}

// تشغيل عند التحميل
if (typeof window !== 'undefined') {
  window.addEventListener('load', initPerformanceSystems);
}
`;

fs.writeFileSync('src/lib/performance-config.ts', configContent);
console.log('   ✅ تم إنشاء src/lib/performance-config.ts');

// 7. تشغيل TypeScript compilation للتحقق من الأخطاء
console.log('\n🔍 فحص الأخطاء...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ لا توجد أخطاء TypeScript');
} catch (error) {
  console.log('⚠️ توجد بعض أخطاء TypeScript - تحتاج مراجعة يدوية');
}

// 8. إحصائيات نهائية
console.log('\n📊 إحصائيات ما بعد التطبيق:');
try {
  const currentIntervals = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs grep -c "setInterval" | grep -v ":0" | wc -l', { encoding: 'utf8' }).trim();
  console.log(`🔄 Intervals متبقية: ${currentIntervals}`);
  
  const currentConsole = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs grep -c "console\\.log" | grep -v ":0" | wc -l', { encoding: 'utf8' }).trim();
  console.log(`📝 console.log متبقية: ${currentConsole}`);
  
} catch (error) {
  console.log('📊 تعذر حساب الإحصائيات');
}

console.log('\n🎉 تم الانتهاء من تطبيق إصلاحات الأداء!');
console.log('\n📋 المهام المطلوبة يدوياً:');
console.log('1. مراجعة استبدالات console.log والتأكد من صحتها');
console.log('2. إضافة <PerformanceCleanupPanel /> إلى Layout في المكان المناسب');
console.log('3. اختبار التطبيق والتأكد من عدم كسر أي وظائف');
console.log('4. إضافة import لـ performance-config في المكان المناسب');
console.log('5. مراجعة ملفات الكاش وتحديثها حسب الحاجة');

console.log('\n🔧 أدوات التشخيص المتاحة:');
console.log('- window.triggerCleanup() - تنظيف فوري');
console.log('- window.getCleanupStats() - إحصائيات التنظيف');
console.log('- window.intervalRegistry - سجل intervals');
console.log('- window.cacheSystem - نظام الكاش'); 