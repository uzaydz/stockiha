#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

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
  'static'
];

// إحصائيات العملية
let stats = {
  filesProcessed: 0,
  consoleStatementsRemoved: 0,
  filesModified: 0,
  errors: 0
};

/**
 * تنظيف عبارات console بدقة عالية
 * @param {string} content - محتوى الملف
 * @returns {object} - النتيجة مع المحتوى المنظف وعدد العبارات المحذوفة
 */
function removeConsoleStatements(content) {
  let removedCount = 0;
  
  // حفظ النص الأصلي للمقارنة
  const originalContent = content;
  
  // إزالة console.log, console.error, console.warn, console.info, console.debug, console.trace
  // مع دعم الأسطر المتعددة والمسافات والتعليقات
  const consoleRegexes = [
    // console.method(...) - سطر واحد بسيط
    /^\s*console\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd|group|groupEnd|clear|count|countReset|assert)\s*\([^)]*\)\s*;?\s*$/gm,
    
    // console.method(...) - أسطر متعددة مع أقواس متداخلة معقدة
    /^\s*console\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd|group|groupEnd|clear|count|countReset|assert)\s*\(\s*[\s\S]*?\)\s*;?\s*$/gm,
    
    // console.method`template literal`
    /^\s*console\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd|group|groupEnd|clear|count|countReset|assert)\s*`[\s\S]*?`\s*;?\s*$/gm,
    
    // console.method() - بدون معاملات
    /^\s*console\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd|group|groupEnd|clear|count|countReset|assert)\s*\(\s*\)\s*;?\s*$/gm
  ];
  
  // تطبيق regex أكثر دقة للتعامل مع الحالات المعقدة
  const advancedConsoleRegex = /^\s*console\.(log|error|warn|info|debug|trace|dir|table|time|timeEnd|group|groupEnd|clear|count|countReset|assert)\s*\(/gm;
  
  // البحث عن جميع المطابقات وحذفها بدقة
  let match;
  const linesToRemove = new Set();
  
  while ((match = advancedConsoleRegex.exec(content)) !== null) {
    const startIndex = match.index;
    let openParens = 0;
    let currentIndex = startIndex;
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let escaped = false;
    
    // البحث عن نهاية استدعاء console
    while (currentIndex < content.length) {
      const char = content[currentIndex];
      
      if (escaped) {
        escaped = false;
        currentIndex++;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        currentIndex++;
        continue;
      }
      
      if (inTemplate) {
        if (char === '`') {
          inTemplate = false;
        }
        currentIndex++;
        continue;
      }
      
      if (inString) {
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        currentIndex++;
        continue;
      }
      
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        currentIndex++;
        continue;
      }
      
      if (char === '`') {
        inTemplate = true;
        currentIndex++;
        continue;
      }
      
      if (char === '(') {
        openParens++;
      } else if (char === ')') {
        openParens--;
        if (openParens === 0) {
          // وجدنا نهاية استدعاء console
          const endIndex = currentIndex + 1;
          
          // البحث عن الفاصلة المنقوطة الاختيارية
          let finalIndex = endIndex;
          while (finalIndex < content.length && /\s/.test(content[finalIndex])) {
            finalIndex++;
          }
          if (finalIndex < content.length && content[finalIndex] === ';') {
            finalIndex++;
          }
          
          // تحديد بداية ونهاية السطر
          const lineStart = content.lastIndexOf('\n', startIndex) + 1;
          const lineEnd = content.indexOf('\n', finalIndex);
          const actualLineEnd = lineEnd === -1 ? content.length : lineEnd + 1;
          
          // التحقق من أن السطر يحتوي فقط على console statement
          const lineContent = content.substring(lineStart, actualLineEnd);
          const trimmedLine = lineContent.trim();
          
          if (trimmedLine.startsWith('console.') || /^\s*console\./.test(lineContent)) {
            linesToRemove.add({ start: lineStart, end: actualLineEnd });
            removedCount++;
          }
          
          break;
        }
      }
      
      currentIndex++;
    }
  }
  
  // حذف الأسطر المحددة
  const sortedLines = Array.from(linesToRemove).sort((a, b) => b.start - a.start);
  for (const line of sortedLines) {
    content = content.substring(0, line.start) + content.substring(line.end);
  }
  
  // إزالة الأسطر الفارغة الزائدة (أكثر من سطرين فارغين متتاليين)
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // إزالة المسافات الزائدة في بداية ونهاية الملف
  content = content.trim() + '\n';
  
  return {
    content,
    removedCount,
    wasModified: originalContent !== content
  };
}

/**
 * معالجة ملف واحد
 * @param {string} filePath - مسار الملف
 */
async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const result = removeConsoleStatements(content);
    
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
 * @param {string} dirName - اسم المجلد
 * @returns {boolean}
 */
function isExcludedDir(dirName) {
  return EXCLUDED_DIRS.includes(dirName) || dirName.startsWith('.');
}

/**
 * فحص ما إذا كان الملف مدعوم
 * @param {string} fileName - اسم الملف
 * @returns {boolean}
 */
function isSupportedFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * معالجة مجلد بشكل تكراري
 * @param {string} dirPath - مسار المجلد
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
  console.log('🚀 بدء عملية حذف عبارات console...\n');
  
  const startTime = Date.now();
  const targetPath = process.argv[2] || './src';
  
  console.log(`📁 المسار المستهدف: ${path.resolve(targetPath)}`);
  console.log(`📋 أنواع الملفات المدعومة: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  console.log(`🚫 المجلدات المستبعدة: ${EXCLUDED_DIRS.join(', ')}\n`);
  
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
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 تقرير العملية:');
  console.log('='.repeat(50));
  console.log(`⏱️  الوقت المستغرق: ${duration} ثانية`);
  console.log(`📁 الملفات المعالجة: ${stats.filesProcessed}`);
  console.log(`✏️  الملفات المعدلة: ${stats.filesModified}`);
  console.log(`🗑️  عبارات console المحذوفة: ${stats.consoleStatementsRemoved}`);
  console.log(`❌ الأخطاء: ${stats.errors}`);
  console.log('='.repeat(50));
  
  if (stats.consoleStatementsRemoved > 0) {
    console.log('✅ تمت العملية بنجاح! تم حذف جميع عبارات console.');
  } else {
    console.log('ℹ️  لم يتم العثور على عبارات console للحذف.');
  }
}

// تشغيل السكربت
main().catch(error => {
  console.error('❌ خطأ عام:', error);
  process.exit(1);
}); 