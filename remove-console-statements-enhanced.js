#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

// أنواع الملفات المدعومة
const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'
];

// المجلدات المستبعدة
const EXCLUDED_DIRS = [
  'node_modules',
  '.git', 
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.nyc_output',
  '.cache',
  'public',
  'static',
  'backups'
];

// الملفات المستبعدة
const EXCLUDED_FILES = [
  'remove-console-statements.js',
  'remove-console-statements-enhanced.js'
];

// إحصائيات العملية
let stats = {
  filesProcessed: 0,
  consoleStatementsRemoved: 0,
  filesModified: 0,
  errors: 0,
  backupCreated: false
};

/**
 * إنشاء نسخة احتياطية من المشروع
 */
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = `backups/console_logs_backup_${timestamp}`;
  
  try {
    await mkdir(backupDir, { recursive: true });
    
    // نسخ الملفات المهمة فقط
    const srcPath = './src';
    const apiPath = './api';
    
    if (fs.existsSync(srcPath)) {
      await copyDirectory(srcPath, path.join(backupDir, 'src'));
    }
    
    if (fs.existsSync(apiPath)) {
      await copyDirectory(apiPath, path.join(backupDir, 'api'));
    }
    
    // نسخ الملفات الجذرية المهمة
    const rootFiles = ['package.json', 'vite.config.ts', 'tsconfig.json'];
    for (const file of rootFiles) {
      if (fs.existsSync(file)) {
        const content = await readFile(file, 'utf8');
        await writeFile(path.join(backupDir, file), content, 'utf8');
      }
    }
    
    console.log(`🗄️ تم إنشاء نسخة احتياطية في: ${backupDir}`);
    stats.backupCreated = true;
    
  } catch (error) {
    console.warn(`⚠️ لم يتم إنشاء النسخة الاحتياطية: ${error.message}`);
  }
}

/**
 * نسخ مجلد بشكل تكراري
 */
async function copyDirectory(src, dest) {
  await mkdir(dest, { recursive: true });
  const items = await readdir(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const itemStat = await stat(srcPath);
    
    if (itemStat.isDirectory()) {
      if (!isExcludedDir(item)) {
        await copyDirectory(srcPath, destPath);
      }
    } else if (itemStat.isFile() && isSupportedFile(item)) {
      const content = await readFile(srcPath, 'utf8');
      await writeFile(destPath, content, 'utf8');
    }
  }
}

/**
 * تنظيف عبارات console بدقة عالية وأمان إضافي
 */
function removeConsoleStatements(content, filePath) {
  let removedCount = 0;
  const originalContent = content;
  const lines = content.split('\n');
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // تخطي التعليقات
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
      processedLines.push(line);
      continue;
    }
    
    // تخطي الـ console statements داخل strings
    if (isConsoleInString(line)) {
      processedLines.push(line);
      continue;
    }
    
    // فحص أنماط console متعددة
    const consolePatterns = [
      /^\s*console\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd|group|groupEnd|clear|count|countReset|assert)\s*\(/,
      /;\s*console\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd|group|groupEnd|clear|count|countReset|assert)\s*\(/
    ];
    
    let isConsoleLine = false;
    let shouldRemove = false;
    
    for (const pattern of consolePatterns) {
      if (pattern.test(line)) {
        isConsoleLine = true;
        
        // التحقق من console statement بسيط (سطر واحد)
        if (isSimpleConsoleStatement(line)) {
          shouldRemove = true;
          removedCount++;
          break;
        }
        
        // التعامل مع console statements متعددة الأسطر
        const multiLineResult = handleMultiLineConsole(lines, i);
        if (multiLineResult.shouldRemove) {
          shouldRemove = true;
          removedCount++;
          // تخطي الأسطر الإضافية
          i = multiLineResult.endIndex;
          break;
        }
      }
    }
    
    if (!shouldRemove) {
      processedLines.push(line);
    }
  }
  
  // تنظيف الأسطر الفارغة الزائدة
  let cleanedContent = processedLines.join('\n');
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleanedContent = cleanedContent.trim() + '\n';
  
  return {
    content: cleanedContent,
    removedCount,
    wasModified: originalContent !== cleanedContent
  };
}

/**
 * فحص ما إذا كان console موجود داخل string
 */
function isConsoleInString(line) {
  const singleQuoteMatches = (line.match(/'/g) || []).length;
  const doubleQuoteMatches = (line.match(/"/g) || []).length;
  const backtickMatches = (line.match(/`/g) || []).length;
  
  // فحص بسيط لتجنب الحذف الخاطئ
  if (line.includes("'console.") || line.includes('"console.') || line.includes('`console.')) {
    return true;
  }
  
  return false;
}

/**
 * فحص ما إذا كان console statement بسيط (سطر واحد)
 */
function isSimpleConsoleStatement(line) {
  const trimmed = line.trim();
  
  // console statement بسيط ينتهي بـ ) أو );
  const simplePatterns = [
    /^\s*console\.\w+\([^)]*\)\s*;?\s*$/,
    /;\s*console\.\w+\([^)]*\)\s*;?\s*$/
  ];
  
  return simplePatterns.some(pattern => pattern.test(line));
}

/**
 * التعامل مع console statements متعددة الأسطر
 */
function handleMultiLineConsole(lines, startIndex) {
  let openParens = 0;
  let inString = false;
  let stringChar = '';
  let foundStart = false;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (inString) {
        if (char === stringChar && line[j-1] !== '\\') {
          inString = false;
          stringChar = '';
        }
        continue;
      }
      
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
      }
      
      if (char === '(') {
        foundStart = true;
        openParens++;
      } else if (char === ')' && foundStart) {
        openParens--;
        if (openParens === 0) {
          return {
            shouldRemove: true,
            endIndex: i
          };
        }
      }
    }
  }
  
  return { shouldRemove: false, endIndex: startIndex };
}

/**
 * معالجة ملف واحد
 */
async function processFile(filePath) {
  try {
    // تخطي الملفات المستبعدة
    const fileName = path.basename(filePath);
    if (EXCLUDED_FILES.includes(fileName)) {
      return;
    }
    
    const content = await readFile(filePath, 'utf8');
    const result = removeConsoleStatements(content, filePath);
    
    if (result.wasModified) {
      await writeFile(filePath, result.content, 'utf8');
      stats.filesModified++;
      console.log(`✅ تم تنظيف: ${filePath} (حُذف ${result.removedCount} عبارة console)`);
    }
    
    stats.filesProcessed++;
    stats.consoleStatementsRemoved += result.removedCount;
    
  } catch (error) {
    stats.errors++;
    console.error(`❌ خطأ في معالجة ${filePath}:`, error.message);
  }
}

/**
 * فحص ما إذا كان المجلد مستبعد
 */
function isExcludedDir(dirName) {
  return EXCLUDED_DIRS.includes(dirName) || dirName.startsWith('.');
}

/**
 * فحص ما إذا كان الملف مدعوم
 */
function isSupportedFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * معالجة مجلد بشكل تكراري
 */
async function processDirectory(dirPath) {
  try {
    const items = await readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemStat = await stat(itemPath);
      
      if (itemStat.isDirectory()) {
        if (!isExcludedDir(item)) {
          await processDirectory(itemPath);
        }
      } else if (itemStat.isFile() && isSupportedFile(item)) {
        await processFile(itemPath);
      }
    }
  } catch (error) {
    console.error(`❌ خطأ في معالجة المجلد ${dirPath}:`, error.message);
    stats.errors++;
  }
}

/**
 * الدالة الرئيسية
 */
async function main() {
  console.log('🚀 بدء عملية حذف عبارات console المحسنة...\n');
  
  const startTime = Date.now();
  const targetPath = process.argv[2] || '.';
  
  console.log(`📁 المسار المستهدف: ${path.resolve(targetPath)}`);
  console.log(`📋 أنواع الملفات المدعومة: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  console.log(`🚫 المجلدات المستبعدة: ${EXCLUDED_DIRS.join(', ')}`);
  console.log(`🚫 الملفات المستبعدة: ${EXCLUDED_FILES.join(', ')}\n`);
  
  // إنشاء نسخة احتياطية
  console.log('🗄️ إنشاء نسخة احتياطية...');
  await createBackup();
  
  try {
    const targetStat = await stat(targetPath);
    
    if (targetStat.isDirectory()) {
      await processDirectory(targetPath);
    } else if (targetStat.isFile() && isSupportedFile(targetPath)) {
      await processFile(targetPath);
    } else {
      console.error('❌ المسار المحدد ليس ملف مدعوم أو مجلد');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ خطأ في الوصول للمسار المحدد:', error.message);
    process.exit(1);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 تقرير العملية النهائي:');
  console.log('='.repeat(60));
  console.log(`⏱️  الوقت المستغرق: ${duration} ثانية`);
  console.log(`📁 الملفات المعالجة: ${stats.filesProcessed}`);
  console.log(`✏️  الملفات المعدلة: ${stats.filesModified}`);
  console.log(`🗑️  عبارات console المحذوفة: ${stats.consoleStatementsRemoved}`);
  console.log(`❌ الأخطاء: ${stats.errors}`);
  console.log(`🗄️ نسخة احتياطية: ${stats.backupCreated ? '✅ تم الإنشاء' : '❌ لم يتم الإنشاء'}`);
  console.log('='.repeat(60));
  
  if (stats.consoleStatementsRemoved > 0) {
    console.log('✅ تمت العملية بنجاح! تم حذف جميع عبارات console.');
    console.log('💡 يمكنك استرداد الملفات من النسخة الاحتياطية إذا لزم الأمر.');
  } else {
    console.log('ℹ️  لم يتم العثور على عبارات console للحذف.');
  }
}

// تشغيل السكربت
main().catch(error => {
  console.error('❌ خطأ عام:', error);
  process.exit(1);
}); 