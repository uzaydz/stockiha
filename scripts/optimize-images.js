#!/usr/bin/env node

/**
 * 🚀 Image Optimization Script
 * تحسين الصور وضغطها لتقليل الحجم
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

class ImageOptimizer {
  constructor() {
    this.stats = {
      processed: 0,
      originalSize: 0,
      optimizedSize: 0,
      savings: 0
    };
  }

  async optimizeImage(inputPath, outputPath) {
    try {
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      // قراءة الصورة وتحليلها
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      let optimizedBuffer;

      // تحسين حسب نوع الصورة
      if (metadata.format === 'png') {
        optimizedBuffer = await image
          .png({
            compressionLevel: 9,
            quality: 85,
            progressive: true
          })
          .toBuffer();
      } else if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        optimizedBuffer = await image
          .jpeg({
            quality: 85,
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();
      } else if (metadata.format === 'webp') {
        optimizedBuffer = await image
          .webp({
            quality: 80,
            effort: 6
          })
          .toBuffer();
      } else {
        // للصور الأخرى، تحويل إلى WebP
        const webpPath = outputPath.replace(/\.(png|jpe?g|gif)$/i, '.webp');
        optimizedBuffer = await image
          .webp({
            quality: 80,
            effort: 6
          })
          .toBuffer();

        // حفظ كـ WebP
        fs.writeFileSync(webpPath, optimizedBuffer);
        const newStats = fs.statSync(webpPath);
        const newSize = newStats.size;

        this.updateStats(originalSize, newSize);

        // حذف الملف الأصلي إذا كان تحويل ناجح
        if (newSize < originalSize * 0.9) {
          fs.unlinkSync(inputPath);
        } else {
          fs.unlinkSync(webpPath);
        }
        return;
      }

      // حفظ الصورة المحسنة
      fs.writeFileSync(outputPath, optimizedBuffer);
      const newStats = fs.statSync(outputPath);
      const newSize = newStats.size;

      this.updateStats(originalSize, newSize);

      const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    } catch (error) {
    }
  }

  updateStats(originalSize, newSize) {
    this.stats.processed++;
    this.stats.originalSize += originalSize;
    this.stats.optimizedSize += newSize;
    this.stats.savings += (originalSize - newSize);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async processDirectory(dirPath) {

    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const pattern = `${dirPath}/**/*.{${imageExtensions.join(',')}}`;

    try {
      const files = await glob(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.min.*']
      });

      for (const file of files) {
        const outputPath = file; // نفس المسار للاستبدال
        await this.optimizeImage(file, outputPath);
      }

      this.printReport();

    } catch (error) {
    }
  }

  printReport() {

    if (this.stats.originalSize > 0) {
      const percentage = ((this.stats.savings / this.stats.originalSize) * 100).toFixed(1);
    }

  }
}

// تشغيل السكريبت
async function main() {
  const optimizer = new ImageOptimizer();

  // مجلدات الصور
  const directories = [
    './public/images',
    './public/icons',
    './public'
  ];

  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      await optimizer.processDirectory(dir);
    } else {
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ImageOptimizer;
