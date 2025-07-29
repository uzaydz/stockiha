#!/usr/bin/env node

/**
 * 🔄 سكربت ذكي لتحديث جميع imports الخاصة بـ database.types.ts
 * يبحث في جميع ملفات المشروع ويحدث الواردات للاستخدام الجديد
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// 📋 أنماط الواردات المختلفة التي نحتاج لتحديثها
const IMPORT_PATTERNS = [
  // أنماط مختلفة من الواردات
  /from\s+['"`]@\/types\/database\.types['"`]/g,
  /from\s+['"`]\.\.?\/.*types\/database\.types['"`]/g,
  /from\s+['"`]src\/types\/database\.types['"`]/g,
  /import\s+.*from\s+['"`].*database\.types['"`]/g,
];

// 📁 مجلدات للبحث فيها
const SEARCH_DIRECTORIES = ['src', 'components', 'pages', 'lib', 'hooks', 'context', 'utils'];

// 📄 أنواع الملفات للبحث فيها
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// 🔍 البحث عن جميع الملفات في مجلد
function findFiles(dir, extensions = FILE_EXTENSIONS) {
  let files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      files = files.concat(findFiles(fullPath, extensions));
    } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 📝 تحليل واردات الملف
function analyzeImports(content) {
  const imports = [];
  
  for (const pattern of IMPORT_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      imports.push({
        original: match[0],
        index: match.index,
        length: match[0].length
      });
    }
  }
  
  return imports.sort((a, b) => b.index - a.index); // ترتيب عكسي للتعديل بأمان
}

// 🎯 تحديد نوع الواردة المطلوبة بناءً على المحتوى
function determineRequiredImports(content) {
  const requiredTypes = new Set();
  
  // البحث عن أنواع مختلفة من الاستخدامات
  const typeUsagePatterns = [
    { pattern: /Database\['public'\]\['Tables'\]/, types: ['core'] },
    { pattern: /(organizations|users|user_settings)/g, types: ['core'] },
    { pattern: /(products|product_colors|product_sizes)/g, types: ['products'] },
    { pattern: /(orders|order_items|abandoned_carts)/g, types: ['orders'] },
    { pattern: /(customers|guest_customers|addresses)/g, types: ['customers'] },
    { pattern: /(payment_methods|transactions|invoices)/g, types: ['payments'] },
    { pattern: /(inventory|suppliers|supplier_)/g, types: ['inventory'] },
    { pattern: /pos_settings/g, types: ['pos'] },
    { pattern: /(shipping|yalidine)/g, types: ['shipping'] },
    { pattern: /(landing_pages|conversion|marketing)/g, types: ['marketing'] },
    { pattern: /(analytics|performance_metrics|stats)/g, types: ['analytics'] },
    { pattern: /(subscription|activation_code)/g, types: ['subscriptions'] },
    { pattern: /(courses|repair|services)/g, types: ['apps'] },
    { pattern: /super_/g, types: ['cms'] },
    { pattern: /seo_/g, types: ['seo'] },
    { pattern: /(migrations|security_logs|system)/g, types: ['system'] }
  ];
  
  for (const { pattern, types } of typeUsagePatterns) {
    if (pattern.test(content)) {
      types.forEach(type => requiredTypes.add(type));
    }
  }
  
  // إذا لم نجد أي استخدام محدد، نفترض الحاجة إلى الأنواع الأساسية
  if (requiredTypes.size === 0) {
    requiredTypes.add('core');
  }
  
  return Array.from(requiredTypes);
}

// 🔄 إنشاء الواردة الجديدة
function generateNewImport(requiredTypes, filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(PROJECT_ROOT, 'src/types/database'));
  const cleanPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  
  if (requiredTypes.length === 1) {
    // واردة واحدة محددة
    return `from '${cleanPath}/${requiredTypes[0]}'`;
  } else if (requiredTypes.length <= 3) {
    // واردات متعددة محددة
    const imports = requiredTypes.map(type => 
      `import type { ${type.charAt(0).toUpperCase() + type.slice(1)}Tables } from '${cleanPath}/${type}';`
    ).join('\n');
    return imports;
  } else {
    // الكثير من الواردات، استخدم الفهرس
    return `from '${cleanPath}'`;
  }
}

// ✏️ تحديث ملف واحد
function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = analyzeImports(content);
    
    if (imports.length === 0) {
      return { updated: false, reason: 'لا توجد واردات database.types' };
    }
    
    let updatedContent = content;
    const requiredTypes = determineRequiredImports(content);
    const newImport = generateNewImport(requiredTypes, filePath);
    
    // تحديث كل واردة
    for (const importInfo of imports) {
      const before = updatedContent.substring(0, importInfo.index);
      const after = updatedContent.substring(importInfo.index + importInfo.length);
      
      // استبدال الواردة القديمة بالجديدة
      updatedContent = before + newImport + after;
    }
    
    // كتابة الملف المحدث
    fs.writeFileSync(filePath, updatedContent);
    
    return { 
      updated: true, 
      importsCount: imports.length,
      requiredTypes,
      reason: `تم تحديث ${imports.length} واردة` 
    };
    
  } catch (error) {
    return { 
      updated: false, 
      reason: `خطأ: ${error.message}` 
    };
  }
}

// 🚀 الدالة الرئيسية
function main() {
  
  const stats = {
    totalFiles: 0,
    updatedFiles: 0,
    errors: 0,
    skipped: 0
  };
  
  // البحث في جميع المجلدات
  for (const dir of SEARCH_DIRECTORIES) {
    const dirPath = path.join(PROJECT_ROOT, 'src', dir);
    const files = findFiles(dirPath);

    for (const file of files) {
      stats.totalFiles++;
      const relativePath = path.relative(PROJECT_ROOT, file);
      
      const result = updateFile(file);
      
      if (result.updated) {
        stats.updatedFiles++;
        if (result.requiredTypes) {
        }
      } else if (result.reason.includes('خطأ')) {
        stats.errors++;
      } else {
        stats.skipped++;
        // لا نطبع الملفات المتجاهلة لتجنب الإزعاج
      }
    }
  }
  
  // 📊 عرض الإحصائيات النهائية
  
  if (stats.updatedFiles > 0) {
  } else {
  }
}

// تشغيل السكربت
main();
