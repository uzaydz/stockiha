#!/usr/bin/env node
// 🎯 Performance Analysis Script - تحليل شامل للأداء والتحسينات

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Performance Analysis...\n');

// 1. Build the project
console.log('📦 Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// 2. Analyze bundles
console.log('🔍 Analyzing bundles...');
try {
  execSync('npm run analyze', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
}

// 3. Check for performance optimizations
console.log('\n🎯 Performance Checklist:');
console.log('='.repeat(50));

const checks = [
  {
    name: 'Tree-shaking enabled',
    check: () => {
      const config = fs.readFileSync('vite.config.ts', 'utf8');
      return config.includes('treeshake') && config.includes('smallest');
    }
  },
  {
    name: 'Code splitting configured',
    check: () => {
      const config = fs.readFileSync('vite.config.ts', 'utf8');
      return config.includes('manualChunks');
    }
  },
  {
    name: 'CSS purging enabled',
    check: () => {
      try {
        const tailwindConfig = fs.readFileSync('tailwind.config.ts', 'utf8');
        return tailwindConfig.includes('safelist') || tailwindConfig.includes('purge');
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Compression enabled',
    check: () => {
      const config = fs.readFileSync('vite.config.ts', 'utf8');
      return config.includes('compression') && config.includes('brotli');
    }
  },
  {
    name: 'Critical CSS optimization',
    check: () => {
      const config = fs.readFileSync('vite.config.ts', 'utf8');
      return config.includes('criticalCSSPlugin');
    }
  },
  {
    name: 'Asset optimization',
    check: () => {
      const config = fs.readFileSync('vite.config.ts', 'utf8');
      return config.includes('assetsInlineLimit');
    }
  }
];

checks.forEach(check => {
  const result = check.check();
  const icon = result ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
});

// 4. Generate recommendations
console.log('\n💡 Recommendations:');
console.log('-'.repeat(30));

const distExists = fs.existsSync('dist');
if (distExists) {
  const distSize = getDirSize('dist');
  console.log(`📊 Total dist size: ${formatBytes(distSize)}`);
  
  if (distSize > 5 * 1024 * 1024) { // > 5MB
    console.log('⚠️  Large build size detected');
    console.log('   • Consider lazy loading more components');
    console.log('   • Implement route-based code splitting');
    console.log('   • Review and remove unused dependencies');
  }
}

console.log('\n🎯 Next steps:');
console.log('• Run `npm run analyze:detailed` for visual bundle analysis');
console.log('• Use `npm run build:analyze` for production build analysis');
console.log('• Monitor Core Web Vitals in production');
console.log('• Consider implementing service worker caching');

function getDirSize(directory) {
  let size = 0;
  
  function calculateSize(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        calculateSize(filePath);
      } else {
        size += stats.size;
      }
    });
  }
  
  if (fs.existsSync(directory)) {
    calculateSize(directory);
  }
  
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('\n✨ Performance analysis complete!');
