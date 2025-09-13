#!/usr/bin/env node
// 🚀 Build Optimization Script
// تشغيل: node scripts/build-optimization.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 بدء عملية تحسين البناء...\n');

// 📊 قياس الأحجام قبل التحسين
function measureBuildSize() {
  try {
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      return { error: 'مجلد dist غير موجود' };
    }
    
    const result = execSync('du -sh dist/', { encoding: 'utf8' });
    const size = result.split('\t')[0].trim();
    return { size, path: distPath };
  } catch (error) {
    return { error: error.message };
  }
}

// 🔍 تحليل الملفات الكبيرة
function analyzeFiles() {
  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    console.log('⚠️  مجلد assets غير موجود');
    return;
  }
  
  const files = fs.readdirSync(assetsPath);
  const fileStats = [];
  
  files.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    fileStats.push({
      name: file,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      sizeMB: (stats.size / 1024 / 1024).toFixed(2)
    });
  });
  
  // ترتيب حسب الحجم
  fileStats.sort((a, b) => b.size - a.size);
  
  console.log('📊 أكبر 10 ملفات:');
  fileStats.slice(0, 10).forEach((file, index) => {
    const sizeDisplay = file.size > 1024 * 1024 ? 
      `${file.sizeMB}MB` : `${file.sizeKB}KB`;
    console.log(`${index + 1}. ${file.name} - ${sizeDisplay}`);
  });
  
  return fileStats;
}

// 🗜️ ضغط إضافي للملفات
function additionalCompression() {
  console.log('\n🗜️  تطبيق ضغط إضافي...');
  
  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    console.log('⚠️  مجلد assets غير موجود');
    return;
  }
  
  try {
    // ضغط الملفات الكبيرة باستخدام gzip
    const jsFiles = fs.readdirSync(assetsPath)
      .filter(file => file.endsWith('.js') && !file.endsWith('.gz'))
      .filter(file => {
        const filePath = path.join(assetsPath, file);
        const stats = fs.statSync(filePath);
        return stats.size > 10240; // أكبر من 10KB
      });
    
    jsFiles.forEach(file => {
      try {
        const filePath = path.join(assetsPath, file);
        execSync(`gzip -9 -c "${filePath}" > "${filePath}.gz"`);
        console.log(`✅ تم ضغط ${file}`);
      } catch (error) {
        console.log(`❌ فشل ضغط ${file}: ${error.message}`);
      }
    });
    
  } catch (error) {
    console.log('❌ خطأ في الضغط الإضافي:', error.message);
  }
}

// 📝 إنشاء تقرير التحسين
function generateReport(beforeSize, afterSize, fileStats) {
  const report = {
    timestamp: new Date().toISOString(),
    buildSize: {
      before: beforeSize,
      after: afterSize
    },
    largestFiles: fileStats?.slice(0, 10) || [],
    recommendations: []
  };
  
  // تحليل وإضافة توصيات
  if (fileStats) {
    const largeJSFiles = fileStats.filter(f => 
      f.name.endsWith('.js') && f.sizeKB > 500
    );
    
    if (largeJSFiles.length > 0) {
      report.recommendations.push({
        type: 'code-splitting',
        message: `يوجد ${largeJSFiles.length} ملف JS كبير. يُنصح بتحسين code splitting.`,
        files: largeJSFiles.map(f => f.name)
      });
    }
    
    const largeCSSFiles = fileStats.filter(f => 
      f.name.endsWith('.css') && f.sizeKB > 100
    );
    
    if (largeCSSFiles.length > 0) {
      report.recommendations.push({
        type: 'css-optimization',
        message: `يوجد ${largeCSSFiles.length} ملف CSS كبير. يُنصح بتحسين CSS.`,
        files: largeCSSFiles.map(f => f.name)
      });
    }
  }
  
  // حفظ التقرير
  const reportPath = path.join(process.cwd(), 'build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 تقرير التحسين:');
  console.log(`📦 حجم البناء: ${afterSize?.size || 'غير معروف'}`);
  console.log(`📁 موقع التقرير: ${reportPath}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 التوصيات:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.message}`);
    });
  }
  
  return report;
}

// 🧹 تنظيف الملفات غير الضرورية
function cleanupUnnecessaryFiles() {
  console.log('\n🧹 تنظيف الملفات غير الضرورية...');
  
  const distPath = path.join(process.cwd(), 'dist');
  const filesToRemove = [
    'bundle-analysis.html', // ملف التحليل (اختياري)
    '*.map', // source maps في الإنتاج
  ];
  
  filesToRemove.forEach(pattern => {
    try {
      execSync(`find "${distPath}" -name "${pattern}" -delete`, { stdio: 'ignore' });
    } catch (error) {
      // تجاهل الأخطاء
    }
  });
  
  console.log('✅ تم تنظيف الملفات غير الضرورية');
}

// 🚀 تشغيل العملية الرئيسية
async function main() {
  try {
    // قياس الحجم قبل التحسين
    const beforeSize = measureBuildSize();
    console.log(`📊 حجم البناء الحالي: ${beforeSize.size || 'غير معروف'}\n`);
    
    // تحليل الملفات
    console.log('🔍 تحليل الملفات...');
    const fileStats = analyzeFiles();
    
    // ضغط إضافي
    additionalCompression();
    
    // تنظيف الملفات
    cleanupUnnecessaryFiles();
    
    // قياس الحجم بعد التحسين
    const afterSize = measureBuildSize();
    
    // إنشاء التقرير
    generateReport(beforeSize, afterSize, fileStats);
    
    console.log('\n🎉 تمت عملية التحسين بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في عملية التحسين:', error.message);
    process.exit(1);
  }
}

// تشغيل السكريبت
if (require.main === module) {
  main();
}

module.exports = {
  measureBuildSize,
  analyzeFiles,
  generateReport
};
