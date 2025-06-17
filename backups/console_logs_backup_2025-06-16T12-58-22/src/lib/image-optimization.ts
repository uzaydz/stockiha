// =================================================================
// مكتبة تحسين الصور - إعدادات وأدوات متقدمة
// =================================================================

export interface ImageOptimizationConfig {
  maxDimension: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  enableSharpening: boolean;
  enableNoiseReduction: boolean;
}

// إعدادات التحسين حسب نوع الصورة
export const IMAGE_OPTIMIZATION_PRESETS = {
  // صور المنتجات الرئيسية
  productThumbnail: {
    maxDimension: 800,
    quality: 0.8,
    format: 'webp' as const,
    enableSharpening: true,
    enableNoiseReduction: false,
  },
  
  // الصور الإضافية للمنتجات
  productGallery: {
    maxDimension: 1200,
    quality: 0.75,
    format: 'webp' as const,
    enableSharpening: true,
    enableNoiseReduction: true,
  },
  
  // صور الملف الشخصي
  avatar: {
    maxDimension: 400,
    quality: 0.85,
    format: 'webp' as const,
    enableSharpening: false,
    enableNoiseReduction: true,
  },
  
  // صور الشعارات
  logo: {
    maxDimension: 500,
    quality: 0.9,
    format: 'webp' as const,
    enableSharpening: false,
    enableNoiseReduction: false,
  },
  
  // صور الخلفية
  background: {
    maxDimension: 1920,
    quality: 0.7,
    format: 'webp' as const,
    enableSharpening: false,
    enableNoiseReduction: true,
  }
};

// دالة لاختيار أفضل إعدادات بناءً على حجم الملف
export function getOptimalSettings(fileSize: number, imageType: keyof typeof IMAGE_OPTIMIZATION_PRESETS = 'productGallery'): ImageOptimizationConfig {
  const baseConfig = IMAGE_OPTIMIZATION_PRESETS[imageType];
  
  // تعديل الإعدادات بناءً على حجم الملف
  if (fileSize > 5 * 1024 * 1024) { // أكبر من 5MB
    return {
      ...baseConfig,
      maxDimension: Math.min(baseConfig.maxDimension, 800),
      quality: Math.min(baseConfig.quality, 0.6),
      enableNoiseReduction: true,
    };
  } else if (fileSize > 2 * 1024 * 1024) { // أكبر من 2MB
    return {
      ...baseConfig,
      maxDimension: Math.min(baseConfig.maxDimension, 1000),
      quality: Math.min(baseConfig.quality, 0.7),
    };
  } else if (fileSize < 500 * 1024) { // أقل من 500KB
    return {
      ...baseConfig,
      quality: Math.min(baseConfig.quality + 0.1, 0.9),
    };
  }
  
  return baseConfig;
}

// دالة لحساب الأبعاد المثلى
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  
  if (originalWidth > originalHeight) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio)
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension
    };
  }
}

// دالة لتقدير حجم الملف بعد الضغط
export function estimateCompressedSize(
  originalSize: number,
  quality: number,
  dimensionReduction: number
): number {
  // تقدير تقريبي بناءً على نسبة الضغط والأبعاد
  const qualityFactor = quality;
  const dimensionFactor = dimensionReduction * dimensionReduction; // مربع النسبة للأبعاد
  
  return Math.round(originalSize * qualityFactor * dimensionFactor);
}

// دالة للتحقق من دعم تنسيقات الصور
export function checkImageFormatSupport(): Promise<{
  webp: boolean;
  avif: boolean;
}> {
  return new Promise((resolve) => {
    const results = { webp: false, avif: false };
    let checksCompleted = 0;
    
    // فحص WebP
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = webpCanvas.height = 1;
    results.webp = webpCanvas.toDataURL('image/webp').startsWith('data:image/webp');
    checksCompleted++;
    
    // فحص AVIF
    const avifImage = new Image();
    avifImage.onload = () => {
      results.avif = true;
      checksCompleted++;
      if (checksCompleted === 2) resolve(results);
    };
    avifImage.onerror = () => {
      results.avif = false;
      checksCompleted++;
      if (checksCompleted === 2) resolve(results);
    };
    avifImage.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    
    // إذا لم يكتمل فحص AVIF خلال ثانية واحدة، اعتبره غير مدعوم
    setTimeout(() => {
      if (checksCompleted === 1) {
        results.avif = false;
        resolve(results);
      }
    }, 1000);
  });
}

// دالة لتحسين اسم الملف
export function optimizeFileName(originalName: string, format: string): string {
  // إزالة الأحرف الخاصة والمسافات
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '') // إزالة الامتداد
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_') // استبدال الأحرف الخاصة بـ _
    .replace(/_+/g, '_') // دمج الشرطات السفلية المتتالية
    .replace(/^_|_$/g, ''); // إزالة الشرطات من البداية والنهاية
  
  const timestamp = Date.now();
  return `${timestamp}_${cleanName}.${format}`;
}

// إحصائيات التحسين
export interface OptimizationStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  originalDimensions: { width: number; height: number };
  newDimensions: { width: number; height: number };
  format: string;
  processingTime: number;
}

export function calculateOptimizationStats(
  originalFile: File,
  compressedFile: File,
  originalDimensions: { width: number; height: number },
  newDimensions: { width: number; height: number },
  processingTime: number
): OptimizationStats {
  return {
    originalSize: originalFile.size,
    compressedSize: compressedFile.size,
    compressionRatio: ((originalFile.size - compressedFile.size) / originalFile.size) * 100,
    originalDimensions,
    newDimensions,
    format: compressedFile.type,
    processingTime
  };
} 