/**
 * تحليل مطابقة Sync Rules مع PowerSync Schema و Supabase
 * ============================================================
 * هذا السكريبت يقارن:
 * 1. Sync Rules (powersync-sync-rules.yaml)
 * 2. PowerSync Schema (PowerSyncSchema.ts)
 * 3. Supabase Schema (من supabase.ts)
 */

const fs = require('fs');
const path = require('path');

// قراءة ملف Sync Rules
const syncRulesPath = path.join(__dirname, 'powersync-sync-rules.yaml');
const syncRulesContent = fs.readFileSync(syncRulesPath, 'utf8');

// قراءة ملف PowerSync Schema
const schemaPath = path.join(__dirname, 'src/lib/powersync/PowerSyncSchema.ts');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// قراءة ملف Supabase Types
const supabasePath = path.join(__dirname, 'src/types/supabase.ts');
const supabaseContent = fs.readFileSync(supabasePath, 'utf8');

// استخراج الجداول والأعمدة من Sync Rules
function extractSyncRulesTables(content) {
  const tables = {};
  const lines = content.split('\n');
  let currentTable = null;
  let inSelect = false;
  let columns = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // البحث عن SELECT statements
    if (line.startsWith('- SELECT')) {
      inSelect = true;
      columns = [];
      continue;
    }
    
    if (inSelect && line.startsWith('FROM')) {
      // استخراج اسم الجدول
      const match = line.match(/FROM\s+(\w+)/);
      if (match) {
        currentTable = match[1];
        tables[currentTable] = columns.filter(col => col && !col.includes('--'));
      }
      inSelect = false;
      continue;
    }
    
    if (inSelect && line && !line.startsWith('#') && !line.startsWith('WHERE')) {
      // استخراج الأعمدة
      const cols = line.split(',').map(col => col.trim()).filter(col => col);
      columns.push(...cols);
    }
  }
  
  return tables;
}

// استخراج الجداول من PowerSync Schema
function extractPowerSyncSchema(content) {
  const tables = {};
  const tableRegex = /const\s+(\w+)\s*=\s*new\s+Table\s*\(/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const startPos = match.index;
    
    // البحث عن نهاية تعريف الجدول
    let braceCount = 0;
    let inTable = false;
    let tableDef = '';
    
    for (let i = startPos; i < content.length; i++) {
      const char = content[i];
      if (char === '(') {
        braceCount++;
        inTable = true;
      }
      if (inTable) tableDef += char;
      if (char === ')') {
        braceCount--;
        if (braceCount === 0) break;
      }
    }
    
    // استخراج الأعمدة
    const columns = [];
    const columnRegex = /(\w+):\s*column\.\w+/g;
    let colMatch;
    while ((colMatch = columnRegex.exec(tableDef)) !== null) {
      columns.push(colMatch[1]);
    }
    
    tables[tableName] = columns;
  }
  
  return tables;
}

// استخراج الجداول من Supabase Types
function extractSupabaseSchema(content) {
  const tables = {};
  const tableRegex = /(\w+):\s*\{[\s\S]*?Row:\s*\{([\s\S]*?)\}/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const rowContent = match[2];
    
    // استخراج الأعمدة من Row type
    const columns = [];
    const columnRegex /(\w+):\s*(?:string|number|boolean|Json|\w+\s*\|\s*null)/g;
    let colMatch;
    while ((colMatch = columnRegex.exec(rowContent)) !== null) {
      columns.push(colMatch[1]);
    }
    
    tables[tableName] = columns;
  }
  
  return tables;
}

// تحويل أسماء الجداول إلى صيغة موحدة
function normalizeTableName(name) {
  // تحويل من camelCase إلى snake_case
  return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// المقارنة الرئيسية
function compareSchemas() {
  console.log('🔍 بدء التحليل...\n');
  
  const syncRulesTables = extractSyncRulesTables(syncRulesContent);
  const powerSyncTables = extractPowerSyncSchema(schemaContent);
  const supabaseTables = extractSupabaseSchema(supabaseContent);
  
  console.log(`📊 إحصائيات:`);
  console.log(`   - Sync Rules: ${Object.keys(syncRulesTables).length} جدول`);
  console.log(`   - PowerSync Schema: ${Object.keys(powerSyncTables).length} جدول`);
  console.log(`   - Supabase Schema: ${Object.keys(supabaseTables).length} جدول\n`);
  
  const issues = [];
  const warnings = [];
  
  // مقارنة كل جدول في Sync Rules
  for (const [tableName, syncColumns] of Object.entries(syncRulesTables)) {
    console.log(`\n📋 جدول: ${tableName}`);
    
    // البحث عن الجدول في PowerSync Schema
    const powerSyncName = Object.keys(powerSyncTables).find(
      name => normalizeTableName(name) === tableName
    );
    
    // البحث عن الجدول في Supabase
    const supabaseName = Object.keys(supabaseTables).find(
      name => name === tableName
    );
    
    if (!powerSyncName) {
      issues.push(`❌ الجدول ${tableName} غير موجود في PowerSync Schema`);
      console.log(`   ⚠️  غير موجود في PowerSync Schema`);
    } else {
      const powerSyncColumns = powerSyncTables[powerSyncName];
      const missingInSchema = syncColumns.filter(col => !powerSyncColumns.includes(col));
      const extraInSchema = powerSyncColumns.filter(col => !syncColumns.includes(col));
      
      if (missingInSchema.length > 0) {
        issues.push(`❌ أعمدة مفقودة في PowerSync Schema للجدول ${tableName}: ${missingInSchema.join(', ')}`);
        console.log(`   ⚠️  أعمدة مفقودة في Schema: ${missingInSchema.join(', ')}`);
      }
      
      if (extraInSchema.length > 0) {
        warnings.push(`⚠️  أعمدة إضافية في PowerSync Schema للجدول ${tableName}: ${extraInSchema.join(', ')}`);
      }
    }
    
    if (!supabaseName) {
      issues.push(`❌ الجدول ${tableName} غير موجود في Supabase`);
      console.log(`   ⚠️  غير موجود في Supabase`);
    } else {
      const supabaseColumns = supabaseTables[supabaseName];
      const missingInSupabase = syncColumns.filter(col => !supabaseColumns.includes(col));
      
      if (missingInSupabase.length > 0) {
        issues.push(`❌ أعمدة مفقودة في Supabase للجدول ${tableName}: ${missingInSupabase.join(', ')}`);
        console.log(`   ⚠️  أعمدة مفقودة في Supabase: ${missingInSupabase.join(', ')}`);
      }
    }
    
    if (powerSyncName && supabaseName) {
      console.log(`   ✅ موجود في كلا الملفين`);
      console.log(`   📊 عدد الأعمدة: Sync Rules (${syncColumns.length}), Schema (${powerSyncTables[powerSyncName].length}), Supabase (${supabaseTables[supabaseName].length})`);
    }
  }
  
  // تقرير نهائي
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 تقرير التحليل النهائي');
  console.log('='.repeat(80));
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ كل شيء مطابق! لا توجد مشاكل.');
  } else {
    if (issues.length > 0) {
      console.log(`\n❌ المشاكل (${issues.length}):`);
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  التحذيرات (${warnings.length}):`);
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
  }
  
  return { issues, warnings };
}

// تشغيل التحليل
try {
  const result = compareSchemas();
  
  // حفظ التقرير في ملف
  const reportPath = path.join(__dirname, 'sync_compatibility_report.txt');
  const report = [
    'تقرير مطابقة Sync Rules مع PowerSync Schema و Supabase',
    '='.repeat(80),
    `تاريخ التحليل: ${new Date().toLocaleString('ar-SA')}`,
    '',
    ...result.issues.map(i => i),
    ...result.warnings.map(w => w),
  ].join('\n');
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n💾 تم حفظ التقرير في: ${reportPath}`);
} catch (error) {
  console.error('❌ خطأ في التحليل:', error);
  process.exit(1);
}

























