#!/usr/bin/env node

/**
 * نسخ ملفات WASM إلى مجلد Vite deps
 * يتم تشغيله تلقائياً عند بدء التطوير
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const viteDepsDir = path.join(projectRoot, 'node_modules/.vite/deps');
const publicDir = path.join(projectRoot, 'public');

// دعم npm و pnpm - البحث في المسار الصحيح
const npmPath = path.join(projectRoot, 'node_modules/@journeyapps/wa-sqlite/dist');
const pnpmPath = path.join(projectRoot, 'node_modules/.pnpm/@journeyapps+wa-sqlite@1.3.3/node_modules/@journeyapps/wa-sqlite/dist');
const waSqliteDir = fs.existsSync(npmPath) ? npmPath : pnpmPath;

// قائمة ملفات WASM المطلوبة
const wasmFiles = [
  'wa-sqlite-async.wasm',
  'wa-sqlite.wasm',
  'mc-wa-sqlite.wasm',
  'mc-wa-sqlite-async.wasm',
];

// التأكد من وجود مجلد Vite deps
if (!fs.existsSync(viteDepsDir)) {
  console.log('⏳ Vite deps directory not found, creating...');
  fs.mkdirSync(viteDepsDir, { recursive: true });
}

// التأكد من وجود مجلد wa-sqlite
if (!fs.existsSync(waSqliteDir)) {
  console.log('⚠️  wa-sqlite directory not found, skipping WASM copy...');
  process.exit(0);
}

// نسخ ملفات WASM إلى مجلدات متعددة
let copiedCount = 0;

// الوجهات: vite deps و public
const destinations = [viteDepsDir, publicDir];

for (const destDir of destinations) {
  // التأكد من وجود المجلد
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const wasmFile of wasmFiles) {
    const srcPath = path.join(waSqliteDir, wasmFile);
    const destPath = path.join(destDir, wasmFile);

    if (fs.existsSync(srcPath)) {
      // نسخ فقط إذا كان الملف غير موجود أو مختلف
      const needsCopy = !fs.existsSync(destPath) ||
        fs.statSync(srcPath).size !== fs.statSync(destPath).size;

      if (needsCopy) {
        fs.copyFileSync(srcPath, destPath);
        copiedCount++;
        console.log(`✅ Copied ${wasmFile} to ${path.basename(destDir)}`);
      }
    }
  }
}

if (copiedCount > 0) {
  console.log(`✨ Copied ${copiedCount} WASM files`);
} else {
  console.log('✅ All WASM files are up to date');
}























































