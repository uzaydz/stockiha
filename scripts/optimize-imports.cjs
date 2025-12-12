/**
 * Script to analyze and suggest import optimizations
 * سكريبت لتحليل واقتراح تحسينات الاستيراد
 *
 * يبحث عن:
 * 1. استيرادات كاملة للمكتبات (import * from 'lodash')
 * 2. استيرادات غير مستخدمة
 * 3. مكتبات ثقيلة يمكن lazy load
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// المكتبات الثقيلة التي يجب تحميلها بشكل كسول
const HEAVY_LIBRARIES = {
  'jspdf': { size: '29MB', suggestion: 'Lazy load when generating PDFs' },
  'exceljs': { size: '22MB', suggestion: 'Lazy load when exporting Excel' },
  'xlsx': { size: '18MB', suggestion: 'Use exceljs instead or lazy load' },
  'html2canvas': { size: '15MB', suggestion: 'Lazy load when capturing screenshots' },
  'chart.js': { size: '10MB', suggestion: 'Lazy load chart components' },
  'recharts': { size: '8MB', suggestion: 'Lazy load chart components' },
  '@nivo': { size: '15MB each', suggestion: 'Lazy load specific chart types' },
  '@monaco-editor/react': { size: '20MB+', suggestion: 'Lazy load editor component' },
  '@tinymce/tinymce-react': { size: '15MB+', suggestion: 'Lazy load editor component' },
  'framer-motion': { size: '12MB', suggestion: 'Use CSS animations or lazy load' },
  'date-fns': { size: '38MB', suggestion: 'Import specific functions only' },
};

// أنماط الاستيراد السيئة
const BAD_IMPORT_PATTERNS = [
  { pattern: /import \* as _ from ['"]lodash['"]/, suggestion: "import { specific } from 'lodash-es'" },
  { pattern: /import _ from ['"]lodash['"]/, suggestion: "import { specific } from 'lodash-es'" },
  { pattern: /import \{ .+ \} from ['"]date-fns['"]/, suggestion: "import { format } from 'date-fns/format'" },
  { pattern: /import moment from ['"]moment['"]/, suggestion: "Use dayjs instead (2KB vs 300KB)" },
];

// دالة لمسح الملفات
function scanFiles(srcDir) {
  const results = {
    heavyImports: [],
    badPatterns: [],
    suggestions: [],
  };

  const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
    cwd: srcDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    absolute: true,
  });

  console.log(`\n📂 Scanning ${files.length} files...\n`);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(srcDir, file);

    // البحث عن المكتبات الثقيلة
    for (const [lib, info] of Object.entries(HEAVY_LIBRARIES)) {
      const regex = new RegExp(`from ['"]${lib.replace('/', '\\/')}`, 'g');
      if (regex.test(content)) {
        // التحقق من أنها ليست lazy loaded
        if (!content.includes(`import('${lib}')`) && !content.includes(`React.lazy`)) {
          results.heavyImports.push({
            file: relativePath,
            library: lib,
            size: info.size,
            suggestion: info.suggestion,
          });
        }
      }
    }

    // البحث عن أنماط سيئة
    for (const { pattern, suggestion } of BAD_IMPORT_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        results.badPatterns.push({
          file: relativePath,
          match: matches[0],
          suggestion,
        });
      }
    }
  }

  return results;
}

// دالة لطباعة التقرير
function printReport(results) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 IMPORT OPTIMIZATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Heavy imports
  if (results.heavyImports.length > 0) {
    console.log('🔴 HEAVY LIBRARIES (should be lazy loaded):');
    console.log('─────────────────────────────────────────────\n');

    const grouped = {};
    for (const item of results.heavyImports) {
      if (!grouped[item.library]) {
        grouped[item.library] = [];
      }
      grouped[item.library].push(item.file);
    }

    for (const [lib, files] of Object.entries(grouped)) {
      const info = HEAVY_LIBRARIES[lib];
      console.log(`  📦 ${lib} (${info.size})`);
      console.log(`     💡 ${info.suggestion}`);
      console.log(`     📁 Used in ${files.length} file(s):`);
      files.slice(0, 3).forEach(f => console.log(`        - ${f}`));
      if (files.length > 3) {
        console.log(`        ... and ${files.length - 3} more`);
      }
      console.log('');
    }
  } else {
    console.log('✅ No heavy library issues found!\n');
  }

  // Bad patterns
  if (results.badPatterns.length > 0) {
    console.log('🟡 BAD IMPORT PATTERNS:');
    console.log('─────────────────────────────────────────────\n');

    for (const item of results.badPatterns) {
      console.log(`  📁 ${item.file}`);
      console.log(`     ❌ ${item.match}`);
      console.log(`     ✅ ${item.suggestion}`);
      console.log('');
    }
  } else {
    console.log('✅ No bad import patterns found!\n');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📈 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  🔴 Heavy library imports: ${results.heavyImports.length}`);
  console.log(`  🟡 Bad import patterns: ${results.badPatterns.length}`);
  console.log('');

  // Lazy loading example
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💡 HOW TO LAZY LOAD HEAVY LIBRARIES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`
  // ❌ Bad - loads jspdf immediately (29MB)
  import { jsPDF } from 'jspdf';

  // ✅ Good - loads only when needed
  const generatePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    // ...
  };

  // ✅ For React components - use React.lazy
  const ChartComponent = React.lazy(() => import('./ChartComponent'));

  // Usage with Suspense
  <Suspense fallback={<Loading />}>
    <ChartComponent />
  </Suspense>
  `);
}

// التشغيل
const srcDir = path.join(__dirname, '..', 'src');
const results = scanFiles(srcDir);
printReport(results);
