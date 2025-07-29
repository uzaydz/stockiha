#!/usr/bin/env node

/**
 * 📦 Bundle Analyzer - محلل الحزم
 * يحلل حجم الحزم ويقترح تحسينات
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeBundles() {
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distPath)) {
    return;
  }
  
  const assetsPath = path.join(distPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    return;
  }
  
  const files = fs.readdirSync(assetsPath);
  
  const analysis = {
    javascript: [],
    css: [],
    totalSize: 0
  };
  
  files.forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    
    const fileInfo = {
      name: file,
      size: sizeKB,
      sizeFormatted: `${sizeKB}KB`
    };
    
    if (file.endsWith('.js')) {
      analysis.javascript.push(fileInfo);
    } else if (file.endsWith('.css')) {
      analysis.css.push(fileInfo);
    }
    
    analysis.totalSize += sizeKB;
  });
  
  // ترتيب حسب الحجم
  analysis.javascript.sort((a, b) => b.size - a.size);
  analysis.css.sort((a, b) => b.size - a.size);

  analysis.javascript.slice(0, 10).forEach((file, index) => {
    const icon = index === 0 ? '🔴' : index === 1 ? '🟡' : '🟢';
  });
  
  analysis.css.forEach((file, index) => {
    const icon = index === 0 ? '🔴' : '🟢';
  });

  // اقتراحات التحسين
  
  const largestJS = analysis.javascript[0];
  if (largestJS && largestJS.size > 500) {
  }
  
  if (analysis.totalSize > 2000) {
  }
  
  if (analysis.javascript.length > 10) {
  }
}

analyzeBundles();
