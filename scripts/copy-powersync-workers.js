#!/usr/bin/env node

/**
 * نسخ PowerSync Worker Files إلى public directory
 * يتم تشغيل هذا تلقائياً بعد npm install
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const sourceDir = path.join(projectRoot, 'node_modules/@powersync/web/dist');
const targetDir = path.join(projectRoot, 'public/powersync');

// التأكد من وجود المصدر
if (!fs.existsSync(sourceDir)) {
  console.log('⚠️  PowerSync not installed yet, skipping worker copy...');
  process.exit(0);
}

// إنشاء directory الهدف إذا لم يكن موجوداً
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// نسخ worker files
const workerSourceDir = path.join(sourceDir, 'worker');
if (fs.existsSync(workerSourceDir)) {
  const files = fs.readdirSync(workerSourceDir);

  files.forEach(file => {
    const srcFile = path.join(workerSourceDir, file);
    const destFile = path.join(targetDir, file);

    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      
      // إنشاء نسخ للملفات التي يحتاجها PowerSync بأسماء مختلفة
      // PowerSync يتوقع WASQLiteDB.worker.js بدلاً من WASQLiteDB.umd.js
      if (file === 'WASQLiteDB.umd.js') {
        const workerDestFile = path.join(targetDir, 'WASQLiteDB.worker.js');
        if (!fs.existsSync(workerDestFile)) {
          fs.copyFileSync(srcFile, workerDestFile);
          console.log(`✅ Created WASQLiteDB.worker.js`);
        }
      }
      
      // إنشاء نسخة لـ SharedSyncImplementation.worker.js
      if (file === 'SharedSyncImplementation.umd.js') {
        const workerDestFile = path.join(targetDir, 'SharedSyncImplementation.worker.js');
        if (!fs.existsSync(workerDestFile)) {
          fs.copyFileSync(srcFile, workerDestFile);
          console.log(`✅ Created SharedSyncImplementation.worker.js`);
        }
        
        // إنشاء مجلد sync ونسخ الملف هناك أيضاً (للمسارات النسبية)
        const syncDir = path.join(targetDir, 'sync');
        if (!fs.existsSync(syncDir)) {
          fs.mkdirSync(syncDir, { recursive: true });
        }
        const syncDestFile = path.join(syncDir, 'SharedSyncImplementation.worker.js');
        if (!fs.existsSync(syncDestFile)) {
          fs.copyFileSync(srcFile, syncDestFile);
          console.log(`✅ Created sync/SharedSyncImplementation.worker.js`);
        }
      }
    }
  });

  console.log(`✅ Copied ${files.filter(f => fs.statSync(path.join(workerSourceDir, f)).isFile()).length} PowerSync worker files`);
}

// نسخ WASM files
const wasmFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.wasm'));
wasmFiles.forEach(file => {
  const srcFile = path.join(sourceDir, file);
  const destFile = path.join(targetDir, file);
  fs.copyFileSync(srcFile, destFile);
});

console.log(`✅ Copied ${wasmFiles.length} PowerSync WASM files`);

// نسخ worker files إلى root public directory أيضاً (للمسارات النسبية عند الـ bundling)
const rootPublicDir = path.join(projectRoot, 'public');
if (fs.existsSync(workerSourceDir)) {
  const criticalWorkers = ['WASQLiteDB.worker.js', 'SharedSyncImplementation.worker.js'];
  
  criticalWorkers.forEach(workerFile => {
    const srcFile = path.join(targetDir, workerFile);
    const rootDestFile = path.join(rootPublicDir, workerFile);
    
    if (fs.existsSync(srcFile) && !fs.existsSync(rootDestFile)) {
      fs.copyFileSync(srcFile, rootDestFile);
      console.log(`✅ Copied ${workerFile} to root public directory`);
    }
  });
}

console.log('✨ PowerSync workers ready!');
