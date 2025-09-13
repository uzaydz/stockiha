#!/usr/bin/env node
// 🔍 Bundle analysis script - محسن لتحليل أحجام الحزم وتحسين الأداء

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const assetsPath = path.join(distPath, 'assets');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeAssets() {
  if (!fs.existsSync(assetsPath)) {
    console.error('❌ dist/assets directory not found. Run build first.');
    process.exit(1);
  }

  const files = fs.readdirSync(assetsPath, { withFileTypes: true });
  const jsFiles = [];
  const cssFiles = [];
  const otherFiles = [];

  files.forEach(file => {
    if (file.isFile()) {
      const filePath = path.join(assetsPath, file.name);
      const stats = fs.statSync(filePath);
      const fileInfo = {
        name: file.name,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size)
      };

      if (file.name.endsWith('.js')) {
        jsFiles.push(fileInfo);
      } else if (file.name.endsWith('.css')) {
        cssFiles.push(fileInfo);
      } else {
        otherFiles.push(fileInfo);
      }
    }
  });

  // Sort by size (largest first)
  jsFiles.sort((a, b) => b.size - a.size);
  cssFiles.sort((a, b) => b.size - a.size);
  otherFiles.sort((a, b) => b.size - a.size);

  console.log('\n🚀 Bundle Analysis Report\n');
  console.log('=' .repeat(50));

  // JavaScript Analysis
  console.log('\n📦 JavaScript Files:');
  console.log('-'.repeat(30));
  let totalJSSize = 0;
  jsFiles.forEach((file, index) => {
    totalJSSize += file.size;
    const icon = index === 0 ? '🔴' : index === 1 ? '🟡' : '🟢';
    console.log(`${icon} ${file.name.padEnd(40)} ${file.sizeFormatted.padStart(10)}`);
    
    // Warn about large chunks
    if (file.size > 500 * 1024) { // > 500KB
      console.log(`   ⚠️  Large chunk detected! Consider code splitting.`);
    }
  });
  console.log(`\n📊 Total JS: ${formatBytes(totalJSSize)}`);

  // CSS Analysis
  console.log('\n🎨 CSS Files:');
  console.log('-'.repeat(30));
  let totalCSSSize = 0;
  cssFiles.forEach((file, index) => {
    totalCSSSize += file.size;
    const icon = index === 0 ? '🔴' : '🟢';
    console.log(`${icon} ${file.name.padEnd(40)} ${file.sizeFormatted.padStart(10)}`);
    
    // Warn about large CSS
    if (file.size > 200 * 1024) { // > 200KB
      console.log(`   ⚠️  Large CSS file! Consider purging unused styles.`);
    }
  });
  console.log(`\n📊 Total CSS: ${formatBytes(totalCSSSize)}`);

  // Other Assets
  if (otherFiles.length > 0) {
    console.log('\n📁 Other Assets:');
    console.log('-'.repeat(30));
    let totalOtherSize = 0;
    otherFiles.forEach(file => {
      totalOtherSize += file.size;
      console.log(`📄 ${file.name.padEnd(40)} ${file.sizeFormatted.padStart(10)}`);
    });
    console.log(`\n📊 Total Other: ${formatBytes(totalOtherSize)}`);
  }

  // Summary and Recommendations
  const totalSize = totalJSSize + totalCSSSize + otherFiles.reduce((sum, f) => sum + f.size, 0);
  console.log('\n📈 Summary:');
  console.log('=' .repeat(50));
  console.log(`Total Bundle Size: ${formatBytes(totalSize)}`);
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  console.log('-'.repeat(40));
  
  if (totalJSSize > 1000 * 1024) { // > 1MB
    console.log('🔴 JavaScript bundle is large (>1MB)');
    console.log('   • Implement more aggressive code splitting');
    console.log('   • Use dynamic imports for heavy components');
    console.log('   • Consider lazy loading non-critical features');
  }
  
  if (totalCSSSize > 300 * 1024) { // > 300KB
    console.log('🟡 CSS bundle could be optimized');
    console.log('   • Enable Tailwind CSS purging');
    console.log('   • Remove unused CSS rules');
    console.log('   • Consider critical CSS extraction');
  }
  
  // Check for gzip files
  const gzipFiles = files.filter(f => f.name.endsWith('.gz'));
  const brotliFiles = files.filter(f => f.name.endsWith('.br'));
  
  if (gzipFiles.length === 0 && brotliFiles.length === 0) {
    console.log('⚠️  No compressed files found');
    console.log('   • Enable gzip/brotli compression in build');
  } else {
    console.log(`✅ Compression enabled (${gzipFiles.length} gzip, ${brotliFiles.length} brotli)`);
  }
  
  console.log('\n🎯 Ideal target sizes:');
  console.log('   • Main JS chunk: < 200KB');
  console.log('   • Vendor chunks: < 500KB each');
  console.log('   • CSS bundle: < 100KB');
  console.log('   • Total bundle: < 1MB');
  
  console.log('\n✨ Run `npm run build:analyze` to see detailed bundle composition.');
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeAssets();
}

export default analyzeAssets;
