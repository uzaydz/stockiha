import type { Plugin } from 'vite';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

// تحليل حجم الباندل
interface BundleAnalysis {
  fileName: string;
  size: number;
  gzipSize: number;
  brotliSize: number;
  type: 'js' | 'css' | 'asset';
  chunks: string[];
  dependencies: string[];
}

// Plugin لتحليل الباندل
export function bundleAnalyzerPlugin(): Plugin {
  return {
    name: 'bundle-analyzer',
    enforce: 'post',
    
    generateBundle(options, bundle) {
      const analysis: BundleAnalysis[] = [];
      const chunkMap = new Map<string, string[]>();
      
      // دالة محسنة لحساب الحجم المضغوط
      const getCompressedSize = (content: string, algorithm: 'gzip' | 'brotli'): number => {
        try {
          if (algorithm === 'gzip') {
            return gzipSync(Buffer.from(content, 'utf8')).length;
          } else if (algorithm === 'brotli') {
            return brotliCompressSync(Buffer.from(content, 'utf8')).length;
          }
          return 0;
        } catch (error) {
          console.warn(`⚠️ [Bundle Analyzer] فشل في ضغط ${algorithm}:`, error);
          // fallback إلى التقدير
          const ratio = algorithm === 'gzip' ? 0.3 : 0.2;
          return Math.round(Buffer.byteLength(content, 'utf8') * ratio);
        }
      };
      
      // تحليل كل ملف في الباندل
      Object.keys(bundle).forEach(fileName => {
        const file = bundle[fileName];
        
        if (file.type === 'chunk') {
          // تحليل JavaScript chunks
          const chunk = file as any;
          const size = Buffer.byteLength(chunk.code || '', 'utf8');
          const gzipSize = getCompressedSize(chunk.code || '', 'gzip');
          const brotliSize = getCompressedSize(chunk.code || '', 'brotli');
          
          analysis.push({
            fileName,
            size,
            gzipSize,
            brotliSize,
            type: 'js',
            chunks: chunk.imports || [],
            dependencies: chunk.imports || []
          });
          
          // تتبع العلاقات بين chunks
          chunkMap.set(fileName, chunk.imports || []);
        } else if (file.type === 'asset') {
          // تحليل الأصول (CSS, images, etc.)
          const asset = file as any;
          const size = Buffer.byteLength(asset.source || '', 'utf8');
          const gzipSize = getCompressedSize(asset.source || '', 'gzip');
          const brotliSize = getCompressedSize(asset.source || '', 'brotli');
          
          const ext = path.extname(fileName);
          let type: 'js' | 'css' | 'asset' = 'asset';
          if (ext === '.js') type = 'js';
          else if (ext === '.css') type = 'css';
          
          analysis.push({
            fileName,
            size,
            gzipSize,
            brotliSize,
            type,
            chunks: [],
            dependencies: []
          });
        }
      });
      
      // تحليل التبعيات
      analysis.forEach(item => {
        if (item.type === 'js') {
          const chunkDeps = chunkMap.get(item.fileName) || [];
          item.dependencies = chunkDeps;
        }
      });
      
      // ترتيب حسب الحجم
      analysis.sort((a, b) => b.size - a.size);
      
      // إنشاء تقرير مفصل
      const report = {
        summary: {
          totalFiles: analysis.length,
          totalSize: analysis.reduce((sum, item) => sum + item.size, 0),
          totalGzipSize: analysis.reduce((sum, item) => sum + item.gzipSize, 0),
          totalBrotliSize: analysis.reduce((sum, item) => sum + item.brotliSize, 0),
          buildTime: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0'
        },
        files: analysis,
        recommendations: generateRecommendations(analysis)
      };
      
      // حفظ التقرير
      this.emitFile({
        type: 'asset',
        fileName: 'bundle-analysis-report.json',
        source: JSON.stringify(report, null, 2)
      });
      
      // طباعة ملخص في console
      console.log('\n📊 [Bundle Analyzer] تحليل الباندل:');
      console.log(`📦 إجمالي الملفات: ${report.summary.totalFiles}`);
      console.log(`💾 الحجم الإجمالي: ${formatBytes(report.summary.totalSize)}`);
      console.log(`🗜️ حجم Gzip: ${formatBytes(report.summary.totalGzipSize)}`);
      console.log(`🎯 حجم Brotli: ${formatBytes(report.summary.totalBrotliSize)}`);
      
      // أكبر 5 ملفات
      console.log('\n🔝 أكبر 5 ملفات:');
      analysis.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.fileName}: ${formatBytes(item.size)} (${item.type})`);
      });
      
      // التوصيات
      if (report.recommendations.length > 0) {
        console.log('\n💡 التوصيات:');
        report.recommendations.forEach(rec => {
          console.log(`• ${rec}`);
        });
      }
    }
  };
}

// تنسيق البايت
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// توليد التوصيات
function generateRecommendations(analysis: BundleAnalysis[]): string[] {
  const recommendations: string[] = [];
  
  // تحليل الملفات الكبيرة
  const largeFiles = analysis.filter(item => item.size > 500 * 1024); // أكبر من 500KB
  if (largeFiles.length > 0) {
    recommendations.push(`توجد ${largeFiles.length} ملفات كبيرة (>500KB) - فكر في تقسيمها`);
  }
  
  // تحليل JavaScript
  const jsFiles = analysis.filter(item => item.type === 'js');
  const totalJsSize = jsFiles.reduce((sum, item) => sum + item.size, 0);
  if (totalJsSize > 2 * 1024 * 1024) { // أكبر من 2MB
    recommendations.push('حجم JavaScript كبير (>2MB) - فكر في lazy loading');
  }
  
  // تحليل CSS
  const cssFiles = analysis.filter(item => item.type === 'css');
  const totalCssSize = cssFiles.reduce((sum, item) => sum + item.size, 0);
  if (totalCssSize > 500 * 1024) { // أكبر من 500KB
    recommendations.push('حجم CSS كبير (>500KB) - فكر في CSS-in-JS أو تقسيم');
  }
  
  // تحليل التبعيات
  const filesWithManyDeps = analysis.filter(item => item.dependencies.length > 10);
  if (filesWithManyDeps.length > 0) {
    recommendations.push(`توجد ${filesWithManyDeps.length} ملفات مع تبعيات كثيرة (>10) - فكر في تقسيم`);
  }
  
  return recommendations;
}
