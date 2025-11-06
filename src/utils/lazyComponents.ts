/**
 * Lazy Loading للمكتبات الثقيلة
 * يتم تحميل هذه المكتبات فقط عند الحاجة لتحسين الأداء الأولي
 */

import { lazy } from 'react';

/**
 * Monaco Editor - محرر الكود (5MB)
 * يتم تحميله فقط عند الحاجة لتحرير الكود
 */
export const LazyMonacoEditor = lazy(() =>
  import('@monaco-editor/react').then(module => ({
    default: module.default
  }))
);

/**
 * TinyMCE Editor - محرر النصوص الغني (8MB)
 * يتم تحميله فقط عند الحاجة لتحرير النصوص
 */
export const LazyTinyMCEEditor = lazy(() =>
  import('@tinymce/tinymce-react').then(module => ({
    default: module.Editor
  }))
);

/**
 * PDF Generation - مكتبات توليد PDF
 * يتم تحميلها فقط عند الحاجة لتوليد PDF
 */
export const loadJsPDF = async () => {
  const jsPDF = await import('jspdf');
  const autoTable = await import('jspdf-autotable');
  return { jsPDF: jsPDF.default, autoTable };
};

export const loadHtml2PDF = async () => {
  const html2pdf = await import('html2pdf.js');
  return html2pdf.default;
};

export const loadHtml2Canvas = async () => {
  const html2canvas = await import('html2canvas');
  return html2canvas.default;
};

/**
 * Image Processing - معالجة الصور (4MB)
 * يتم تحميلها فقط عند الحاجة لمعالجة الصور
 */
export const loadJimp = async () => {
  const Jimp = await import('jimp');
  return Jimp.default;
};

export const loadImageCompression = async () => {
  const imageCompression = await import('browser-image-compression');
  return imageCompression.default;
};

/**
 * مكون Suspense wrapper للمكونات الـ lazy
 */
import { Suspense, ComponentType } from 'react';

interface LazyWrapperProps {
  component: ComponentType<any>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

export function LazyWrapper({
  component: Component,
  fallback = <div className="flex items-center justify-center p-4">جاري التحميل...</div>,
  ...props
}: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Hook لتحميل المكتبات بشكل ديناميكي مع cache
 */
const libraryCache = new Map<string, any>();

export function useDynamicImport<T>(
  importFn: () => Promise<T>,
  cacheKey: string
): {
  load: () => Promise<T>;
  isLoaded: boolean;
} {
  const isLoaded = libraryCache.has(cacheKey);

  const load = async (): Promise<T> => {
    if (libraryCache.has(cacheKey)) {
      return libraryCache.get(cacheKey);
    }

    const module = await importFn();
    libraryCache.set(cacheKey, module);
    return module;
  };

  return { load, isLoaded };
}

/**
 * أمثلة على الاستخدام:
 *
 * // للمحررات:
 * import { LazyMonacoEditor, LazyWrapper } from '@/utils/lazyComponents';
 *
 * function MyComponent() {
 *   return <LazyWrapper component={LazyMonacoEditor} height="400px" />;
 * }
 *
 * // للمكتبات:
 * import { loadJsPDF } from '@/utils/lazyComponents';
 *
 * async function generatePDF() {
 *   const { jsPDF } = await loadJsPDF();
 *   const doc = new jsPDF();
 *   // ...
 * }
 */
