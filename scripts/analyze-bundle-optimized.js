import fs from 'fs';
import path from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

// Enhanced Bundle Analyzer for Code Splitting Performance
class BundleAnalyzer {
  constructor(distPath = 'dist') {
    this.distPath = distPath;
    this.assets = [];
    this.chunks = new Map();
    this.totalSizes = {
      raw: 0,
      gzip: 0,
      brotli: 0
    };
  }

  async analyze() {
    console.log('🔍 تحليل الحزم المقسمة...\n');
    
    await this.scanAssets();
    await this.calculateSizes();
    this.categorizeChunks();
    this.generateReport();
    this.generateRecommendations();
  }

  async scanAssets() {
    const assetsDir = path.join(this.distPath, 'assets');
    
    if (!fs.existsSync(assetsDir)) {
      console.error('❌ مجلد dist/assets غير موجود. قم بتشغيل npm run build أولاً');
      process.exit(1);
    }

    const scanDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.css')) {
          const relativePath = path.relative(this.distPath, filePath);
          this.assets.push({
            name: file,
            path: relativePath,
            fullPath: filePath,
            size: stat.size,
            type: file.endsWith('.js') ? 'javascript' : 'stylesheet'
          });
        }
      });
    };

    scanDir(assetsDir);
    console.log(`📦 تم العثور على ${this.assets.length} ملف`);
  }

  async calculateSizes() {
    console.log('📊 حساب أحجام الضغط...');
    
    for (const asset of this.assets) {
      const content = fs.readFileSync(asset.fullPath);
      
      asset.gzipSize = gzipSync(content).length;
      asset.brotliSize = brotliCompressSync(content).length;
      
      this.totalSizes.raw += asset.size;
      this.totalSizes.gzip += asset.gzipSize;
      this.totalSizes.brotli += asset.brotliSize;
    }
  }

  categorizeChunks() {
    const categories = {
      'vendor-react': { files: [], description: 'React Core' },
      'vendor-router': { files: [], description: 'React Router' },
      'vendor-radix': { files: [], description: 'Radix UI Components' },
      'vendor-icons': { files: [], description: 'Icon Libraries' },
      'vendor-nivo': { files: [], description: 'Nivo Charts' },
      'vendor-charts': { files: [], description: 'Other Chart Libraries' },
      'vendor-monaco': { files: [], description: 'Monaco Editor' },
      'vendor-tinymce': { files: [], description: 'TinyMCE Editor' },
      'vendor-pdf': { files: [], description: 'PDF Generation' },
      'vendor-image': { files: [], description: 'Image Processing' },
      'vendor-supabase': { files: [], description: 'Supabase Client' },
      'vendor-query': { files: [], description: 'React Query' },
      'vendor-http': { files: [], description: 'HTTP Client' },
      'vendor-forms': { files: [], description: 'Form Libraries' },
      'vendor-utils': { files: [], description: 'Utility Libraries' },
      'vendor-dnd': { files: [], description: 'Drag & Drop' },
      'vendor-animation': { files: [], description: 'Animation Libraries' },
      'vendor-i18n': { files: [], description: 'Internationalization' },
      'vendor-monitoring': { files: [], description: 'Monitoring & Analytics' },
      'vendor-codes': { files: [], description: 'QR/Barcode Libraries' },
      'vendor-million': { files: [], description: 'Million.js Optimization' },
      'vendor-misc': { files: [], description: 'Other Vendor Libraries' },
      'app-pos': { files: [], description: 'POS System' },
      'app-store-editor': { files: [], description: 'Store Editor' },
      'app-analytics': { files: [], description: 'Analytics Pages' },
      'app-products': { files: [], description: 'Product Management' },
      'app-orders': { files: [], description: 'Order Management' },
      'app-customers': { files: [], description: 'Customer Management' },
      'app-settings': { files: [], description: 'Settings & Config' },
      'app-courses': { files: [], description: 'Course System' },
      'main': { files: [], description: 'Main Application Entry' },
      'css': { files: [], description: 'Stylesheets' },
      'other': { files: [], description: 'Other Assets' }
    };

    this.assets.forEach(asset => {
      const fileName = asset.name;
      let category = 'other';

      // Determine category based on filename
      for (const [key] of Object.entries(categories)) {
        if (fileName.includes(key)) {
          category = key;
          break;
        }
      }

      // Special cases
      if (asset.type === 'stylesheet') {
        category = 'css';
      } else if (fileName.includes('main-') && !fileName.includes('vendor')) {
        category = 'main';
      }

      categories[category].files.push(asset);
    });

    // Calculate totals for each category
    Object.entries(categories).forEach(([key, category]) => {
      if (category.files.length > 0) {
        const totals = category.files.reduce((acc, file) => ({
          raw: acc.raw + file.size,
          gzip: acc.gzip + file.gzipSize,
          brotli: acc.brotli + file.brotliSize,
          count: acc.count + 1
        }), { raw: 0, gzip: 0, brotli: 0, count: 0 });

        this.chunks.set(key, {
          ...category,
          ...totals
        });
      }
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 تقرير تحليل الحزم المقسمة');
    console.log('='.repeat(80));

    // Overall statistics
    console.log('\n📈 الإحصائيات العامة:');
    console.log(`إجمالي الملفات: ${this.assets.length}`);
    console.log(`الحجم الأصلي: ${this.formatSize(this.totalSizes.raw)}`);
    console.log(`حجم Gzip: ${this.formatSize(this.totalSizes.gzip)} (${this.getCompressionRatio(this.totalSizes.raw, this.totalSizes.gzip)})`);
    console.log(`حجم Brotli: ${this.formatSize(this.totalSizes.brotli)} (${this.getCompressionRatio(this.totalSizes.raw, this.totalSizes.brotli)})`);

    // Chunk breakdown
    console.log('\n📦 تفصيل الحزم:');
    console.log('━'.repeat(100));
    console.log('الفئة'.padEnd(25) + 'الوصف'.padEnd(30) + 'الملفات'.padEnd(8) + 'الحجم'.padEnd(15) + 'Gzip'.padEnd(15) + 'Brotli');
    console.log('━'.repeat(100));

    // Sort chunks by size (largest first)
    const sortedChunks = Array.from(this.chunks.entries())
      .sort((a, b) => b[1].gzip - a[1].gzip);

    sortedChunks.forEach(([key, chunk]) => {
      const category = key.padEnd(25);
      const description = chunk.description.padEnd(30);
      const count = chunk.count.toString().padEnd(8);
      const rawSize = this.formatSize(chunk.raw).padEnd(15);
      const gzipSize = this.formatSize(chunk.gzip).padEnd(15);
      const brotliSize = this.formatSize(chunk.brotli);

      console.log(category + description + count + rawSize + gzipSize + brotliSize);
    });

    // Largest individual files
    console.log('\n🔍 أكبر 10 ملفات:');
    console.log('━'.repeat(80));
    
    const largestFiles = [...this.assets]
      .sort((a, b) => b.gzipSize - a.gzipSize)
      .slice(0, 10);

    largestFiles.forEach((file, index) => {
      const rank = `${index + 1}.`.padEnd(4);
      const name = file.name.padEnd(40);
      const size = this.formatSize(file.gzipSize);
      console.log(rank + name + size);
    });
  }

  generateRecommendations() {
    console.log('\n' + '='.repeat(80));
    console.log('💡 توصيات التحسين');
    console.log('='.repeat(80));

    const recommendations = [];

    // Check for large vendor chunks
    this.chunks.forEach((chunk, key) => {
      if (key.startsWith('vendor-') && chunk.gzip > 100 * 1024) { // > 100KB
        recommendations.push({
          type: 'warning',
          message: `الحزمة ${key} كبيرة (${this.formatSize(chunk.gzip)}). فكر في تقسيمها أكثر.`
        });
      }
    });

    // Check for large app chunks
    this.chunks.forEach((chunk, key) => {
      if (key.startsWith('app-') && chunk.gzip > 50 * 1024) { // > 50KB
        recommendations.push({
          type: 'info',
          message: `حزمة التطبيق ${key} كبيرة (${this.formatSize(chunk.gzip)}). تأكد من التحميل الكسول.`
        });
      }
    });

    // Check main bundle size
    const mainChunk = this.chunks.get('main');
    if (mainChunk && mainChunk.gzip > 200 * 1024) { // > 200KB
      recommendations.push({
        type: 'error',
        message: `الحزمة الرئيسية كبيرة جداً (${this.formatSize(mainChunk.gzip)}). يجب تقسيمها.`
      });
    }

    // Check for unused chunks
    const criticalChunks = ['vendor-react', 'vendor-router', 'main'];
    criticalChunks.forEach(chunk => {
      if (!this.chunks.has(chunk)) {
        recommendations.push({
          type: 'warning',
          message: `الحزمة الحرجة ${chunk} غير موجودة. تحقق من إعدادات التقسيم.`
        });
      }
    });

    // Display recommendations
    if (recommendations.length === 0) {
      console.log('✅ ممتاز! التقسيم محسن بشكل جيد.');
    } else {
      recommendations.forEach(rec => {
        const icon = rec.type === 'error' ? '❌' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} ${rec.message}`);
      });
    }

    // Performance suggestions
    console.log('\n🚀 اقتراحات الأداء:');
    console.log('• تأكد من تفعيل التحميل الكسول للحزم الثقيلة');
    console.log('• استخدم Preloading للمسارات الحرجة');
    console.log('• فعل ضغط Brotli على الخادم');
    console.log('• استخدم CDN لتوزيع الحزم');
    console.log('• راقب أداء التحميل بانتظام');

    // Save detailed report
    this.saveDetailedReport();
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.assets.length,
        totalSizes: this.totalSizes
      },
      chunks: Object.fromEntries(this.chunks),
      assets: this.assets
    };

    const reportPath = path.join(this.distPath, 'bundle-analysis-detailed.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 تم حفظ التقرير المفصل في: ${reportPath}`);
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getCompressionRatio(original, compressed) {
    const ratio = ((original - compressed) / original * 100).toFixed(1);
    return `-${ratio}%`;
  }
}

// Run analysis
async function main() {
  const analyzer = new BundleAnalyzer();
  await analyzer.analyze();
}

// Run analysis
main().catch(console.error);

export default BundleAnalyzer;
