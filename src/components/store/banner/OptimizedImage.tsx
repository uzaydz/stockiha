import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Gem, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedImageProps } from './types';
import { getCdnImageUrl, deviceAdjustedWidth } from '@/lib/image-cdn';

/**
 * مكون صورة محسّن ومبسط مع fallback قوي
 * يحل مشكلة الصور البيضاء
 */
// Simple manifest cache to avoid multiple fetches
let responsiveManifest: any | null = null;
let responsiveManifestLoading: Promise<any> | null = null;

async function loadResponsiveManifest(): Promise<any | null> {
  if (responsiveManifest) return responsiveManifest;
  if (!responsiveManifestLoading) {
    responsiveManifestLoading = fetch('/images/responsive/manifest.json', { cache: 'force-cache' })
      .then(async (r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .finally(() => {
        // no-op
      });
  }
  responsiveManifest = await responsiveManifestLoading;
  return responsiveManifest;
}

function isUnsplashUrl(u?: string) {
  if (!u) return false;
  try { const url = new URL(u); return url.hostname.includes('images.unsplash.com'); } catch { return false; }
}

function normalizeUnsplashUrl(u: string) {
  try { const url = new URL(u); return `https://images.unsplash.com${url.pathname}`; } catch { return u; }
}

const OptimizedImage = React.memo<OptimizedImageProps>(({ 
  src, 
  alt, 
  className, 
  onLoad,
  widths = [360, 512, 768, 1024, 1280],
  baseWidth,
  quality = 75,
  priority = false,
  sizes,
  fit = 'contain',
  objectPosition = 'top'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [imgSrcSet, setImgSrcSet] = useState<string | undefined>(undefined);
  const [imgSrcSetAvif, setImgSrcSetAvif] = useState<string | undefined>(undefined);
  const [fallbackAttempts, setFallbackAttempts] = useState(0);
  const hasAppliedResponsive = useRef(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad, currentSrc]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
  }, [currentSrc]);

  // تحويل رابط Supabase - معطل مؤقتاً بسبب Free Plan
  const computeTransformed = useCallback((inputSrc: string) => {
    try {
      if (!inputSrc || typeof inputSrc !== 'string') {
        return { href: '', srcSet: undefined };
      }

      // إذا كان الرابط فارغاً أو غير صالح
      if (inputSrc.trim() === '' || inputSrc === 'null' || inputSrc === 'undefined') {
        return { href: '', srcSet: undefined };
      }

      // إذا كانت الصورة من Unsplash وحضّرنا نسخًا محلية مسبقًا، سنستبدلها لاحقًا بمجرد تحميل manifest
      if (isUnsplashUrl(inputSrc)) {
        return { href: inputSrc, srcSet: undefined };
      }

      // Route via Cloudflare Worker CDN for resizing and next-gen formats
      const adjusted = deviceAdjustedWidth(baseWidth || 512);
      const href = getCdnImageUrl(inputSrc, { width: adjusted, quality, fit: fit === 'contain' ? 'contain' : 'cover', format: 'auto' });
      return { href, srcSet: undefined };
      
      // TODO: تفعيل التحسين عند الترقية إلى Pro Plan
      // if (inputSrc.includes('.svg') || inputSrc.includes('data:')) {
      //   return { href: inputSrc, srcSet: undefined };
      // }
      // if (inputSrc.includes('/storage/v1/object/public/')) {
      //   try {
      //     const url = new URL(inputSrc);
      //     const pathAfterPublic = url.pathname.split('/storage/v1/object/public/')[1];
      //     if (!pathAfterPublic) {
      //       return { href: inputSrc, srcSet: undefined };
      //     }
      //     const encodedPath = pathAfterPublic
      //       .split('/')
      //       .map(seg => encodeURIComponent(seg))
      //       .join('/');
      //     const base = `${url.origin}/storage/v1/render/image/public/${encodedPath}`;
      //     const chosenBase = baseWidth || (typeof window !== 'undefined' && window.innerWidth < 768 ? 512 : 800);
      //     const srcSet = widths
      //       .map(w => `${base}?width=${w}&quality=${quality} ${w}w`)
      //       .join(', ');
      //     return { 
      //       href: `${base}?width=${chosenBase}&quality=${quality}`, 
      //       srcSet 
      //     };
      //   } catch (urlError) {
      //     return { href: inputSrc, srcSet: undefined };
      //   }
      // }
    } catch (error) {
      return { href: inputSrc || '', srcSet: undefined };
    }
  }, []);

  // إعداد الصورة مع fallback
  useEffect(() => {
    if (!src) {
      setCurrentSrc('');
      setIsLoaded(false);
      setHasError(false);
      return;
    }
    const transformed = computeTransformed(src);
    setImgSrcSet(undefined);
    setImgSrcSetAvif(undefined);
    hasAppliedResponsive.current = false;

    // لا نعيد تعيين isLoaded إذا كانت الصورة نفسها
    if (transformed.href !== currentSrc) {
      setCurrentSrc(transformed.href);
      setImgSrcSet(transformed.srcSet);
      setIsLoaded(false);
      setHasError(false);
      setFallbackAttempts(0);
    }
  }, [src, computeTransformed, currentSrc]);

  // Attempt to map Unsplash URLs to locally generated responsive assets via manifest
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!src || !isUnsplashUrl(src) || hasAppliedResponsive.current) return;
      const manifest = await loadResponsiveManifest();
      if (!manifest) return;
      const normalized = normalizeUnsplashUrl(src);
      const entry = manifest[normalized] || manifest[src];
      if (!entry) return;

      // Build srcset strings (prefer avif + webp). Browser will pick best via <img type> only for <picture>,
      // but we can still provide webp as srcset; avif kept for possible <picture> integrations and future.
      const buildSet = (list: any[]) => list.map((e: any) => `${e.path} ${e.w}w`).join(', ');

      const dpr = typeof window !== 'undefined' ? Math.max(1, Math.min(2, window.devicePixelRatio || 1)) : 1;
      const viewport = typeof window !== 'undefined' ? window.innerWidth : (baseWidth || 512);
      const target = Math.min(960, Math.round(viewport * dpr));
      const nearest = (entry.formats.webp.concat(entry.formats.avif)).reduce((prev: any, cur: any) => {
        return Math.abs(cur.w - target) < Math.abs(prev.w - target) ? cur : prev;
      }, entry.formats.webp[0]);

      if (cancelled) return;
      setImgSrcSet(buildSet(entry.formats.webp));
      setImgSrcSetAvif(buildSet(entry.formats.avif));
      setCurrentSrc(nearest.path);
      hasAppliedResponsive.current = true;
      // keep loaders consistent
      setIsLoaded(false);
      setHasError(false);
    })();
    return () => { cancelled = true; };
  }, [src, baseWidth]);

  // معالجة الخطأ مع fallback محسن
  const handleImageError = useCallback(() => {
    // إذا كان هذا أول محاولة وكان الرابط محول، جرب الرابط الأصلي
    if (fallbackAttempts === 0 && currentSrc !== src && src) {
      setFallbackAttempts(1);
      setCurrentSrc(src);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    
    // إذا كان هذا fallback ثاني وكان رابط Supabase، جرب بدون تحويل
    if (fallbackAttempts === 1 && src && src.includes('/storage/v1/object/public/')) {
      setFallbackAttempts(2);
      // إزالة أي معاملات من الرابط
      const cleanUrl = src.split('?')[0];
      setCurrentSrc(cleanUrl);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    
    // محاولة ثالثة: إضافة timestamp لتجاوز cache
    if (fallbackAttempts === 2 && src) {
      setFallbackAttempts(3);
      const urlWithTimestamp = src + (src.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      setCurrentSrc(urlWithTimestamp);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    
    // إذا فشلت جميع المحاولات
    setHasError(true);
    setIsLoaded(false);
  }, [currentSrc, src, fallbackAttempts]);

  // إذا لم يكن هناك رابط صورة
  if (!src || src.trim() === '') {
    return (
      <div className={cn(
        "w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl",
        className
      )}>
        <div className="text-center text-muted-foreground/60">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد صورة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full optimized-image-container">
      {/* Skeleton loader - يظهر أثناء التحميل */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse rounded-2xl flex items-center justify-center z-10">
          <div className="w-8 h-8 bg-muted/40 rounded-full animate-pulse" />
        </div>
      )}
      
      {/* الصورة الرئيسية */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            "optimized-image w-full h-full transition-all duration-500 ease-out",
            fit === 'contain' ? "object-contain" : "object-cover",
            isLoaded ? "opacity-100" : "opacity-0",
            "bg-white", // خلفية بيضاء للصور الشفافة
            className
          )}
          style={{ 
            objectPosition,
            display: 'block',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onLoad={handleLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
          // تحسين LCP: إعطاء أولوية عالية للصورة الحرجة
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          sizes={sizes || "(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 512px"}
          srcSet={imgSrcSet}
        />
      )}

      {/* حالة الخطأ */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 rounded-2xl z-20">
          <div className="text-center text-red-600 dark:text-red-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium">فشل في تحميل الصورة</p>
            <p className="text-xs opacity-70 mt-1">يرجى المحاولة مرة أخرى</p>
            {/* إظهار رابط الصورة للتشخيص */}
            <p className="text-xs opacity-50 mt-2 break-all max-w-xs">{currentSrc}</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
