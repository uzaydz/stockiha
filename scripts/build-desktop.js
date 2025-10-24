#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 بدء بناء تطبيق سطوكيها المكتبي...\n');

// التحقق من وجود الملفات المطلوبة
const requiredFiles = [
  'package.json',
  'vite.config.desktop.ts',
  'electron/main.js',
  'electron/preload.js'
];

console.log('📋 التحقق من الملفات المطلوبة...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ ملف مطلوب غير موجود: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file}`);
}

// تثبيت التبعيات
console.log('\n📦 تثبيت التبعيات...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ تم تثبيت التبعيات بنجاح');
} catch (error) {
  console.error('❌ فشل في تثبيت التبعيات:', error.message);
  process.exit(1);
}

// بناء التطبيق
console.log('\n🔨 بناء التطبيق...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ تم بناء التطبيق بنجاح');
} catch (error) {
  console.error('❌ فشل في بناء التطبيق:', error.message);
  process.exit(1);
}

// نسخ ملفات Electron
console.log('\n📁 نسخ ملفات Electron...');
const electronDir = path.join(__dirname, '../dist/electron');
if (!fs.existsSync(electronDir)) {
  fs.mkdirSync(electronDir, { recursive: true });
}

const electronFiles = [
  'electron/main.js',
  'electron/preload.js'
];

for (const file of electronFiles) {
  const src = path.join(__dirname, '..', file);
  const dest = path.join(__dirname, '../dist', file);
  
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`✅ تم نسخ ${file}`);
  }
}

// نسخ الأصول
console.log('\n🎨 نسخ الأصول...');
const assetsDir = path.join(__dirname, '../assets');
const distAssetsDir = path.join(__dirname, '../dist/assets');

if (fs.existsSync(assetsDir)) {
  if (!fs.existsSync(distAssetsDir)) {
    fs.mkdirSync(distAssetsDir, { recursive: true });
  }
  
  const copyRecursive = (src, dest) => {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const files = fs.readdirSync(src);
      for (const file of files) {
        copyRecursive(path.join(src, file), path.join(dest, file));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  };
  
  copyRecursive(assetsDir, distAssetsDir);
  console.log('✅ تم نسخ الأصول');
}

// إنشاء package.json للتطبيق المكتبي
console.log('\n📝 إنشاء package.json للتطبيق المكتبي...');
const packageJson = {
  name: 'stockiha-desktop',
  version: '2.0.0',
  main: 'electron/main.js',
  dependencies: {
    electron: '^28.0.0'
  }
};

fs.writeFileSync(
  path.join(__dirname, '../dist/package.json'),
  JSON.stringify(packageJson, null, 2)
);
console.log('✅ تم إنشاء package.json');

console.log('\n🎉 تم بناء التطبيق المكتبي بنجاح!');
console.log('\n📋 الخطوات التالية:');
console.log('1. تشغيل التطبيق: npm run electron');
console.log('2. بناء التطبيق النهائي: npm run dist');
console.log('3. تثبيت التطبيق: npm run dist-mac (لـ Mac) أو npm run dist-win (لـ Windows)');
