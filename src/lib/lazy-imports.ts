/**
 * Lazy Import Utilities
 * أدوات التحميل الكسول للمكتبات الثقيلة
 *
 * هذه الدوال تقوم بتحميل المكتبات عند الحاجة فقط
 * مما يقلل حجم الـ bundle الأولي بشكل كبير
 */

// ═══════════════════════════════════════════════════════════════
// PDF Generation (jspdf ~29MB)
// ═══════════════════════════════════════════════════════════════

let jsPDFModule: typeof import('jspdf') | null = null;
let autoTableModule: typeof import('jspdf-autotable') | null = null;

/**
 * تحميل jsPDF عند الحاجة
 */
export async function loadJsPDF() {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule.jsPDF;
}

/**
 * تحميل jspdf-autotable عند الحاجة
 */
export async function loadAutoTable() {
  if (!autoTableModule) {
    // يجب تحميل jspdf أولاً
    await loadJsPDF();
    autoTableModule = await import('jspdf-autotable');
  }
  return autoTableModule.default;
}

/**
 * إنشاء PDF جديد
 */
export async function createPDF(options?: ConstructorParameters<typeof import('jspdf').jsPDF>[0]) {
  const jsPDF = await loadJsPDF();
  return new jsPDF(options);
}

// ═══════════════════════════════════════════════════════════════
// Excel Generation (exceljs ~22MB)
// ═══════════════════════════════════════════════════════════════

let excelModule: typeof import('exceljs') | null = null;

/**
 * تحميل ExcelJS عند الحاجة
 */
export async function loadExcelJS() {
  if (!excelModule) {
    excelModule = await import('exceljs');
  }
  return excelModule;
}

/**
 * إنشاء Workbook جديد
 */
export async function createWorkbook() {
  const ExcelJS = await loadExcelJS();
  return new ExcelJS.Workbook();
}

// ═══════════════════════════════════════════════════════════════
// XLSX (xlsx ~18MB) - بديل أخف لـ ExcelJS
// ═══════════════════════════════════════════════════════════════

let xlsxModule: typeof import('xlsx') | null = null;

/**
 * تحميل XLSX عند الحاجة
 */
export async function loadXLSX() {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
}

// ═══════════════════════════════════════════════════════════════
// Screenshot (html2canvas ~15MB)
// ═══════════════════════════════════════════════════════════════

let html2canvasModule: typeof import('html2canvas') | null = null;

/**
 * تحميل html2canvas عند الحاجة
 */
export async function loadHtml2Canvas() {
  if (!html2canvasModule) {
    html2canvasModule = await import('html2canvas');
  }
  return html2canvasModule.default;
}

/**
 * التقاط صورة لعنصر
 */
export async function captureElement(
  element: HTMLElement,
  options?: Parameters<typeof import('html2canvas').default>[1]
) {
  const html2canvas = await loadHtml2Canvas();
  return html2canvas(element, options);
}

// ═══════════════════════════════════════════════════════════════
// Charts (chart.js ~10MB, recharts ~8MB)
// ═══════════════════════════════════════════════════════════════

let chartJsModule: typeof import('chart.js') | null = null;

/**
 * تحميل Chart.js عند الحاجة
 */
export async function loadChartJS() {
  if (!chartJsModule) {
    chartJsModule = await import('chart.js');
    // تسجيل المكونات الأساسية
    chartJsModule.Chart.register(
      chartJsModule.CategoryScale,
      chartJsModule.LinearScale,
      chartJsModule.BarElement,
      chartJsModule.LineElement,
      chartJsModule.PointElement,
      chartJsModule.ArcElement,
      chartJsModule.Title,
      chartJsModule.Tooltip,
      chartJsModule.Legend
    );
  }
  return chartJsModule;
}

// ═══════════════════════════════════════════════════════════════
// QR Code Generation
// ═══════════════════════════════════════════════════════════════

let qrCodeModule: typeof import('qrcode') | null = null;

/**
 * تحميل QRCode عند الحاجة
 */
export async function loadQRCode() {
  if (!qrCodeModule) {
    qrCodeModule = await import('qrcode');
  }
  return qrCodeModule;
}

/**
 * إنشاء QR Code كـ Data URL
 */
export async function generateQRCodeDataURL(
  text: string,
  options?: import('qrcode').QRCodeToDataURLOptions
) {
  const QRCode = await loadQRCode();
  return QRCode.toDataURL(text, options);
}

// ═══════════════════════════════════════════════════════════════
// Barcode Generation
// ═══════════════════════════════════════════════════════════════

let jsBarcodeModule: typeof import('jsbarcode') | null = null;

/**
 * تحميل JsBarcode عند الحاجة
 */
export async function loadJsBarcode() {
  if (!jsBarcodeModule) {
    jsBarcodeModule = await import('jsbarcode');
  }
  return jsBarcodeModule.default;
}

// ═══════════════════════════════════════════════════════════════
// Date Utilities (date-fns ~38MB - استخدم dayjs بدلاً منها)
// ═══════════════════════════════════════════════════════════════

// تصدير دوال date-fns المستخدمة بشكل فردي
// هذا يسمح لـ tree-shaking بإزالة الدوال غير المستخدمة

export { format as formatDate } from 'date-fns/format';
export { parseISO } from 'date-fns/parseISO';
export { isValid as isValidDate } from 'date-fns/isValid';
export { differenceInDays } from 'date-fns/differenceInDays';
export { addDays } from 'date-fns/addDays';
export { subDays } from 'date-fns/subDays';
export { startOfDay } from 'date-fns/startOfDay';
export { endOfDay } from 'date-fns/endOfDay';
export { startOfMonth } from 'date-fns/startOfMonth';
export { endOfMonth } from 'date-fns/endOfMonth';
export { startOfYear } from 'date-fns/startOfYear';
export { endOfYear } from 'date-fns/endOfYear';

// ═══════════════════════════════════════════════════════════════
// React Lazy Components
// ═══════════════════════════════════════════════════════════════

import { lazy, Suspense, ComponentType, ReactNode } from 'react';

/**
 * إنشاء مكون كسول مع loading fallback
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ReactNode = null
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ═══════════════════════════════════════════════════════════════
// Preload Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * تحميل مكتبة مسبقاً في الخلفية
 * مفيد لتحميل المكتبات قبل أن يحتاجها المستخدم
 */
export function preloadModule(moduleName: 'jspdf' | 'exceljs' | 'html2canvas' | 'chart.js') {
  switch (moduleName) {
    case 'jspdf':
      return loadJsPDF();
    case 'exceljs':
      return loadExcelJS();
    case 'html2canvas':
      return loadHtml2Canvas();
    case 'chart.js':
      return loadChartJS();
  }
}

/**
 * تحميل مكتبات متعددة في الخلفية
 */
export function preloadModules(moduleNames: ('jspdf' | 'exceljs' | 'html2canvas' | 'chart.js')[]) {
  return Promise.all(moduleNames.map(preloadModule));
}
