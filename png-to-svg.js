import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// الحصول على المسار الحالي في ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تكوين المسارات
const inputFile = path.resolve(__dirname, 'fdgsfdsfdfsfdxcvcvxvcxvcxcvx.png');
const outputFile = path.resolve(__dirname, 'fdgsfdsfdfsfdxcvcvxvcxvcxcvx.svg');
const tempSvgFile = path.resolve(__dirname, 'temp_output.svg');

/**
 * تحويل PNG إلى SVG باستخدام ImageMagick
 * سنستخدم ImageMagick لأنه أكثر توافقاً وقوة في تحويل الصور
 */
function convertPngToSvg() {
  try {
    // التحقق من وجود الملف المدخل
    if (!fs.existsSync(inputFile)) {
      throw new Error(`ملف الإدخال غير موجود: ${inputFile}`);
    }

    console.log('جاري تحويل الصورة إلى SVG...');
    
    // استخدام ImageMagick لتحويل PNG إلى SVG
    // يجب تثبيت ImageMagick أولاً: brew install imagemagick
    const command = `convert "${inputFile}" "${outputFile}"`;
    
    execSync(command, { stdio: 'inherit' });
    
    // تحسين ملف SVG (اختياري)
    console.log('جاري تحسين ملف SVG...');
    try {
      // يمكن استخدام svgo لتحسين ملف SVG
      // npm install -g svgo
      execSync(`svgo "${outputFile}" -o "${outputFile}"`, { stdio: 'inherit' });
    } catch (optimizeError) {
      console.log('تم تخطي تحسين SVG (svgo غير مثبت)');
    }
    
    console.log(`✅ تم تحويل الصورة بنجاح إلى: ${outputFile}`);
    console.log('ملاحظة: للحصول على أفضل نتيجة، قد تحتاج إلى:');
    console.log('1. تثبيت ImageMagick: brew install imagemagick');
    console.log('2. تثبيت SVGO لتحسين الملف: npm install -g svgo');
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تحويل الصورة:');
    console.error(error.message || error);
    
    // محاولة بديلة باستخدام inkscape إذا كان مثبتاً
    try {
      console.log('\nجاري محاولة التحويل باستخدام Inkscape...');
      execSync(`inkscape "${inputFile}" --export-filename="${outputFile}"`, { stdio: 'inherit' });
      console.log(`✅ تم تحويل الصورة بنجاح باستخدام Inkscape إلى: ${outputFile}`);
      return;
    } catch (inkscapeError) {
      console.log('فشلت محاولة استخدام Inkscape.');
    }
    
    console.log('\nحلول بديلة:');
    console.log('1. تثبيت ImageMagick: brew install imagemagick');
    console.log('2. تثبيت Inkscape: brew install inkscape');
    console.log('3. استخدام خدمات تحويل عبر الإنترنت مثل:');
    console.log('   - https://convertio.co/png-svg/');
    console.log('   - https://www.pngtosvg.com/');
    console.log('   - https://vectorizer.ai/');
    
    // إنشاء ملف HTML بسيط لتحويل الصورة
    createHtmlConverter();
  }
}

/**
 * إنشاء ملف HTML بسيط لتحويل الصورة يدوياً
 */
function createHtmlConverter() {
  const htmlPath = path.resolve(__dirname, 'png-to-svg-converter.html');
  const relativePngPath = path.relative(path.dirname(htmlPath), inputFile);
  
  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تحويل PNG إلى SVG</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      direction: rtl;
      text-align: right;
    }
    h1 {
      color: #333;
    }
    .image-container {
      margin: 20px 0;
      text-align: center;
    }
    img {
      max-width: 100%;
      border: 1px solid #ddd;
    }
    .instructions {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .step {
      margin-bottom: 10px;
    }
    .resources {
      margin-top: 30px;
    }
    .resources a {
      display: block;
      margin-bottom: 5px;
      color: #0066cc;
    }
  </style>
</head>
<body>
  <h1>تحويل صورة PNG إلى SVG</h1>
  
  <div class="instructions">
    <h2>الصورة المراد تحويلها:</h2>
    <div class="image-container">
      <img src="${relativePngPath}" alt="الصورة الأصلية">
    </div>
    
    <h2>تعليمات التحويل:</h2>
    <div class="step">1. يمكنك استخدام أحد المواقع التالية لتحويل الصورة:</div>
    <div class="resources">
      <a href="https://convertio.co/png-svg/" target="_blank">Convertio - محول PNG إلى SVG</a>
      <a href="https://www.pngtosvg.com/" target="_blank">PNG to SVG Converter</a>
      <a href="https://vectorizer.ai/" target="_blank">Vectorizer.AI - محول الصور إلى متجهات</a>
      <a href="https://www.adobe.com/express/feature/image/convert/png-to-svg" target="_blank">Adobe Express - تحويل PNG إلى SVG</a>
    </div>
    
    <div class="step">2. قم بتحميل الصورة المعروضة أعلاه إلى الموقع المختار.</div>
    <div class="step">3. اضبط إعدادات التحويل للحصول على أفضل جودة (إذا كانت متاحة).</div>
    <div class="step">4. قم بتنزيل ملف SVG الناتج.</div>
    <div class="step">5. احفظ الملف باسم: <strong>fdgsfdsfdfsfdxcvcvxvcxvcxcvx.svg</strong> في نفس مجلد المشروع.</div>
  </div>
  
  <h2>برامج مفيدة للتحويل:</h2>
  <ul>
    <li>Adobe Illustrator - يمكنه تتبع الصور وتحويلها إلى متجهات بدقة عالية</li>
    <li>Inkscape (مجاني) - أداة قوية لتحويل الصور النقطية إلى متجهات</li>
    <li>Vectornator (للأجهزة المحمولة) - سهل الاستخدام ويعطي نتائج جيدة</li>
  </ul>
</body>
</html>`;
  
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`\n✅ تم إنشاء صفحة HTML للمساعدة في التحويل: ${htmlPath}`);
  console.log('يمكنك فتح هذا الملف في المتصفح واتباع التعليمات لتحويل الصورة يدوياً.');
}

// تنفيذ التحويل
convertPngToSvg();
