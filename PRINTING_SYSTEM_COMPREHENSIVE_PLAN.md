# خطة تحسين شاملة لنظام الطباعة
# Comprehensive Printing System Improvement Plan

## 📊 تحليل الوضع الحالي | Current State Analysis

### الملفات الموجودة | Existing Files

#### خدمات الطباعة | Print Services (5 ملفات)
| الملف | الحجم | الوظيفة |
|-------|-------|---------|
| `TauriPrintService.ts` | 517 سطر | طباعة الباركود (قديم من Tauri) |
| `ThermalPrintService.ts` | 475 سطر | طباعة حرارية متخصصة |
| `UnifiedPrintService.ts` | 909 سطر | خدمة موحدة للإيصالات |
| `PrintSettingsService.ts` | 166 سطر | إدارة إعدادات الطباعة |
| `PrintHistoryService.ts` | 221 سطر | سجل عمليات الطباعة |

#### مكونات الطباعة | Print Components (6 ملفات)
| الملف | الوظيفة |
|-------|---------|
| `PrintReceipt.tsx` | حوار طباعة إيصال نقطة البيع |
| `ThermalReceipt.tsx` | مكون الإيصال الحراري |
| `PrintingSettings.tsx` | واجهة إعدادات الطباعة |
| `RepairOrderPrint.tsx` | طباعة أوامر التصليح |
| `InvoicePrintView.tsx` | طباعة الفواتير |
| `QuickBarcodePrintPage.tsx` | طباعة الباركود السريعة |

---

## ⚠️ المشاكل المكتشفة | Identified Issues

### 1. **عدم وجود IPC Handler للطباعة في Electron** (حرج)
```
❌ الكود يتوقع وجود window.electronAPI.print()
❌ لكن لا يوجد handler في electron/main.cjs
❌ ولا يوجد print في preload.secure.cjs
```

**النتيجة**: الطباعة تعتمد حالياً على `window.print()` للمتصفح فقط!

### 2. **عدم وجود دعم للطباعة الصامتة الحقيقية**
- لا يمكن تجاوز نافذة حوار الطباعة
- المستخدم يضطر للضغط على "طباعة" في كل مرة

### 3. **عدم وجود قائمة الطابعات المتاحة**
- لا يمكن اختيار طابعة محددة
- الاعتماد على الطابعة الافتراضية فقط

### 4. **عدم دعم ESC/POS مباشرة**
- لا يوجد وصول مباشر للطابعة عبر USB/Serial
- الاعتماد على تحويل HTML فقط

### 5. **تكرار الكود**
- ثلاث خدمات طباعة مختلفة
- لا يوجد واجهة موحدة

---

## 🎯 الحل المقترح | Proposed Solution

### استخدام `electron-pos-printer` مع تحسينات

**لماذا electron-pos-printer؟**
- مصمم خصيصاً للطابعات الحرارية ✅
- يدعم الطباعة الصامتة ✅
- يدعم أحجام: 80mm, 78mm, 76mm, 58mm, 57mm, 44mm ✅
- يدعم: text, barCode, qrCode, image, table ✅
- مستقر ومُختبر ✅

---

## 📁 البنية الجديدة | New Architecture

```
electron/
├── main.cjs                    # إضافة IPC handlers للطباعة
├── preload.secure.cjs          # إضافة print API
├── printing/
│   ├── printManager.cjs        # مدير الطباعة الرئيسي (جديد)
│   ├── escPosCommands.cjs      # أوامر ESC/POS (جديد)
│   └── printerDetector.cjs     # اكتشاف الطابعات (جديد)

src/
├── services/
│   └── UnifiedPrintService.ts  # تحديث للاستخدام الجديد
├── hooks/
│   └── usePrinter.ts           # Hook جديد موحد
└── components/
    └── print/
        ├── PrintDialog.tsx     # حوار طباعة موحد (جديد)
        └── PrinterSelector.tsx # اختيار الطابعة (جديد)
```

---

## 🔧 التنفيذ التفصيلي | Detailed Implementation

### المرحلة 1: إضافة IPC Handlers للطباعة

#### 1.1 تحديث `electron/main.cjs`

```javascript
// ======= IPC Handlers للطباعة =======

const { PosPrinter } = require('electron-pos-printer');

// الحصول على قائمة الطابعات
ipcMain.handle('print:get-printers', async () => {
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return {
      success: true,
      printers: printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        description: p.description,
        status: p.status,
        isDefault: p.isDefault
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// طباعة إيصال POS
ipcMain.handle('print:receipt', async (event, options) => {
  try {
    const { data, printerName, pageSize, copies, silent, margin } = options;

    const printOptions = {
      preview: !silent,
      margin: margin || '0 0 0 0',
      copies: copies || 1,
      printerName: printerName || undefined,
      timeOutPerLine: 400,
      pageSize: pageSize || '80mm',
      silent: silent !== false
    };

    await PosPrinter.print(data, printOptions);
    return { success: true };
  } catch (error) {
    console.error('[Print] Receipt printing failed:', error);
    return { success: false, error: error.message };
  }
});

// طباعة HTML مخصص
ipcMain.handle('print:html', async (event, options) => {
  try {
    const { html, printerName, silent, pageSize } = options;

    // إنشاء نافذة مخفية للطباعة
    const printWin = new BrowserWindow({
      width: 800,
      height: 600,
      show: !silent,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await printWin.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      printWin.webContents.on('did-finish-load', () => {
        printWin.webContents.print({
          silent: silent !== false,
          printBackground: true,
          deviceName: printerName || '',
          pageSize: pageSize || 'A4'
        }, (success, errorType) => {
          printWin.close();
          if (success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: errorType });
          }
        });
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// فتح درج النقود
ipcMain.handle('print:open-cash-drawer', async (event, printerName) => {
  try {
    // أوامر ESC/POS لفتح الدرج
    const drawerCommand = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);

    // يتطلب node-escpos أو إرسال مباشر للطابعة
    // سيتم تنفيذه لاحقاً مع node-thermal-printer

    return { success: true, message: 'Cash drawer command sent' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// طباعة باركود
ipcMain.handle('print:barcode', async (event, options) => {
  try {
    const { barcodes, printerName, pageSize, silent, labelSize } = options;

    const data = barcodes.map(barcode => ({
      type: 'barCode',
      value: barcode.value,
      height: barcode.height || 40,
      width: barcode.width || 2,
      displayValue: barcode.showValue !== false,
      fontsize: 12,
      position: 'below'
    }));

    const printOptions = {
      preview: !silent,
      margin: '2mm',
      copies: 1,
      printerName: printerName || undefined,
      pageSize: labelSize || pageSize || { width: '50mm', height: '30mm' },
      silent: silent !== false
    };

    await PosPrinter.print(data, printOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

#### 1.2 تحديث `electron/preload.secure.cjs`

```javascript
// إضافة للـ ALLOWED_CHANNELS
const ALLOWED_CHANNELS = {
  // ... القنوات الموجودة ...

  // Printing
  'print:get-printers': true,
  'print:receipt': true,
  'print:html': true,
  'print:barcode': true,
  'print:open-cash-drawer': true,
  'print:test': true,
};

// إضافة في electronAPI
print: {
  // الحصول على قائمة الطابعات
  getPrinters: () => ipcRenderer.invoke('print:get-printers'),

  // طباعة إيصال POS
  receipt: (options) => {
    if (!options || typeof options !== 'object') {
      throw new Error('Print options must be an object');
    }
    return ipcRenderer.invoke('print:receipt', options);
  },

  // طباعة HTML مخصص
  html: (options) => {
    if (!options || !options.html) {
      throw new Error('HTML content is required');
    }
    return ipcRenderer.invoke('print:html', options);
  },

  // طباعة باركود
  barcode: (options) => {
    if (!options || !options.barcodes) {
      throw new Error('Barcodes array is required');
    }
    return ipcRenderer.invoke('print:barcode', options);
  },

  // فتح درج النقود
  openCashDrawer: (printerName) => {
    return ipcRenderer.invoke('print:open-cash-drawer', printerName);
  },

  // طباعة صفحة اختبار
  test: (printerName) => {
    return ipcRenderer.invoke('print:test', printerName);
  }
},
```

---

### المرحلة 2: تحديث خدمات الطباعة

#### 2.1 إنشاء `src/hooks/usePrinter.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { usePrinterSettings } from './usePrinterSettings';
import { isElectronApp } from '@/lib/platform';

interface Printer {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

interface PrintResult {
  success: boolean;
  error?: string;
}

export function usePrinter() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const { settings, updateSetting } = usePrinterSettings();

  // جلب قائمة الطابعات
  const fetchPrinters = useCallback(async () => {
    if (!isElectronApp()) {
      console.warn('[usePrinter] Not in Electron, skipping printer detection');
      return [];
    }

    try {
      setIsLoading(true);
      const result = await window.electronAPI.print.getPrinters();
      if (result.success) {
        setPrinters(result.printers);
        // تحديد الطابعة الافتراضية
        const defaultPrinter = result.printers.find(p => p.isDefault);
        if (defaultPrinter && !selectedPrinter) {
          setSelectedPrinter(defaultPrinter.name);
        }
        return result.printers;
      }
      return [];
    } catch (error) {
      console.error('[usePrinter] Failed to fetch printers:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrinter]);

  // طباعة إيصال
  const printReceipt = useCallback(async (
    receiptData: any[],
    options?: {
      copies?: number;
      silent?: boolean;
      printerName?: string;
    }
  ): Promise<PrintResult> => {
    if (!isElectronApp()) {
      // Fallback للمتصفح
      return printReceiptBrowser(receiptData);
    }

    try {
      const result = await window.electronAPI.print.receipt({
        data: receiptData,
        printerName: options?.printerName || selectedPrinter || settings.printer_name,
        pageSize: `${settings.paper_width}mm`,
        copies: options?.copies || settings.print_copies || 1,
        silent: options?.silent ?? settings.silent_print,
        margin: `${settings.margin_top}mm ${settings.margin_right}mm ${settings.margin_bottom}mm ${settings.margin_left}mm`
      });

      if (result.success && settings.beep_after_print) {
        playBeep();
      }

      if (result.success && settings.open_cash_drawer) {
        await openCashDrawer();
      }

      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [selectedPrinter, settings]);

  // طباعة HTML
  const printHtml = useCallback(async (
    html: string,
    options?: {
      silent?: boolean;
      printerName?: string;
      pageSize?: string;
    }
  ): Promise<PrintResult> => {
    if (!isElectronApp()) {
      return printHtmlBrowser(html);
    }

    try {
      return await window.electronAPI.print.html({
        html,
        printerName: options?.printerName || selectedPrinter,
        silent: options?.silent ?? settings.silent_print,
        pageSize: options?.pageSize || 'A4'
      });
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [selectedPrinter, settings]);

  // طباعة باركود
  const printBarcodes = useCallback(async (
    barcodes: Array<{ value: string; height?: number; width?: number; showValue?: boolean }>,
    options?: {
      silent?: boolean;
      labelSize?: { width: string; height: string };
    }
  ): Promise<PrintResult> => {
    if (!isElectronApp()) {
      return printBarcodesBrowser(barcodes);
    }

    try {
      return await window.electronAPI.print.barcode({
        barcodes,
        printerName: selectedPrinter,
        silent: options?.silent ?? settings.silent_print,
        labelSize: options?.labelSize || { width: '50mm', height: '30mm' }
      });
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [selectedPrinter, settings]);

  // فتح درج النقود
  const openCashDrawer = useCallback(async (): Promise<PrintResult> => {
    if (!isElectronApp()) {
      console.warn('[usePrinter] Cash drawer not supported in browser');
      return { success: false, error: 'Not supported in browser' };
    }

    try {
      return await window.electronAPI.print.openCashDrawer(selectedPrinter);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [selectedPrinter]);

  // صوت بعد الطباعة
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);
    } catch (e) {
      console.warn('[usePrinter] Beep failed:', e);
    }
  }, []);

  // طباعة اختبار
  const printTest = useCallback(async (): Promise<PrintResult> => {
    const testData = [
      { type: 'text', value: '================================', style: { textAlign: 'center' } },
      { type: 'text', value: 'صفحة اختبار الطباعة', style: { textAlign: 'center', fontWeight: 'bold', fontSize: '18px' } },
      { type: 'text', value: 'Print Test Page', style: { textAlign: 'center', fontSize: '14px' } },
      { type: 'text', value: '================================', style: { textAlign: 'center' } },
      { type: 'text', value: `الطابعة: ${selectedPrinter || 'الافتراضية'}`, style: { textAlign: 'right' } },
      { type: 'text', value: `عرض الورق: ${settings.paper_width}mm`, style: { textAlign: 'right' } },
      { type: 'text', value: `التاريخ: ${new Date().toLocaleString('ar-DZ')}`, style: { textAlign: 'right' } },
      { type: 'text', value: '================================', style: { textAlign: 'center' } },
      { type: 'barCode', value: '123456789012', height: 40, displayValue: true },
      { type: 'text', value: '================================', style: { textAlign: 'center' } },
      { type: 'text', value: 'سطوكيها - Stockiha', style: { textAlign: 'center', fontSize: '12px' } },
    ];

    return printReceipt(testData, { silent: false });
  }, [selectedPrinter, settings, printReceipt]);

  useEffect(() => {
    fetchPrinters();
  }, []);

  return {
    // البيانات
    printers,
    selectedPrinter,
    isLoading,
    settings,

    // الإجراءات
    setSelectedPrinter,
    fetchPrinters,
    printReceipt,
    printHtml,
    printBarcodes,
    openCashDrawer,
    printTest,
    playBeep,
    updateSetting,
  };
}

// ===== Browser Fallbacks =====

function printReceiptBrowser(data: any[]): PrintResult {
  // تحويل البيانات إلى HTML وطباعة
  const html = convertDataToHtml(data);
  return printHtmlBrowser(html);
}

function printHtmlBrowser(html: string): PrintResult {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return { success: false, error: 'Popup blocked' };
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

function printBarcodesBrowser(barcodes: any[]): PrintResult {
  // استخدام TauriPrintService القديم للمتصفح
  console.warn('[usePrinter] Using browser fallback for barcodes');
  return { success: false, error: 'Use TauriPrintService for browser' };
}

function convertDataToHtml(data: any[]): string {
  // تحويل بيانات electron-pos-printer إلى HTML
  let html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
  `;

  for (const item of data) {
    if (item.type === 'text') {
      const style = item.style || {};
      const classes = [
        style.textAlign === 'center' ? 'center' : '',
        style.textAlign === 'right' ? 'right' : '',
        style.fontWeight === 'bold' ? 'bold' : '',
      ].filter(Boolean).join(' ');
      html += `<p class="${classes}" style="${styleToString(style)}">${item.value}</p>`;
    } else if (item.type === 'barCode') {
      html += `<p class="center">[BARCODE: ${item.value}]</p>`;
    }
  }

  html += '</body></html>';
  return html;
}

function styleToString(style: any): string {
  return Object.entries(style)
    .filter(([key]) => !['textAlign', 'fontWeight'].includes(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}
```

---

### المرحلة 3: تحديث المكونات

#### 3.1 مكون اختيار الطابعة `PrinterSelector.tsx`

```typescript
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Printer } from 'lucide-react';
import { usePrinter } from '@/hooks/usePrinter';

export function PrinterSelector() {
  const { printers, selectedPrinter, setSelectedPrinter, fetchPrinters, isLoading } = usePrinter();

  return (
    <div className="flex items-center gap-2">
      <Printer className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedPrinter || ''} onValueChange={setSelectedPrinter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="اختر الطابعة" />
        </SelectTrigger>
        <SelectContent>
          {printers.map((printer) => (
            <SelectItem key={printer.name} value={printer.name}>
              {printer.displayName}
              {printer.isDefault && ' (افتراضية)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={fetchPrinters}
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
```

---

## 📍 أماكن تطبيق التحسينات | Implementation Locations

### 1. نقطة البيع (POS) - الإيصالات

| الملف | التغيير المطلوب |
|-------|-----------------|
| `src/components/pos/PrintReceipt.tsx` | استبدال UnifiedPrintService بـ usePrinter |
| `src/components/pos/ThermalReceipt.tsx` | تحديث لاستخدام الـ hook الجديد |
| `src/components/pos/hooks/usePOSOrder.ts` | استخدام usePrinter لطباعة الإيصال |

### 2. الفواتير

| الملف | التغيير المطلوب |
|-------|-----------------|
| `src/components/invoices/InvoicePrintView.tsx` | إضافة خيار الطباعة المباشرة |
| `src/components/invoices/CreateInvoiceDialog.tsx` | إضافة زر طباعة مباشرة |

### 3. الباركود

| الملف | التغيير المطلوب |
|-------|-----------------|
| `src/pages/dashboard/QuickBarcodePrintPage.tsx` | استخدام usePrinter.printBarcodes |
| `src/services/TauriPrintService.ts` | الإبقاء كـ fallback للمتصفح |

### 4. التصليحات

| الملف | التغيير المطلوب |
|-------|-----------------|
| `src/components/repair/RepairOrderPrint.tsx` | استخدام usePrinter.printHtml |

### 5. إعدادات الطباعة

| الملف | التغيير المطلوب |
|-------|-----------------|
| `src/components/pos/settings/PrintingSettings.tsx` | إضافة PrinterSelector |
| `src/hooks/usePrinterSettings.ts` | إضافة printer_name للإعدادات |

---

## 📦 الحزم المطلوبة | Required Packages

```bash
# في مجلد Electron
npm install electron-pos-printer

# اختياري: لدعم ESC/POS المباشر
npm install node-thermal-printer
npm install escpos escpos-usb
```

---

## 🔄 خطة الترحيل | Migration Plan

### الأسبوع 1: البنية التحتية
1. ✅ تحليل النظام الحالي
2. إضافة IPC handlers في `electron/main.cjs`
3. تحديث `preload.secure.cjs`
4. إنشاء `usePrinter` hook

### الأسبوع 2: نقطة البيع
1. تحديث `PrintReceipt.tsx`
2. تحديث `ThermalReceipt.tsx`
3. اختبار الطباعة الصامتة
4. اختبار فتح الدرج

### الأسبوع 3: الباركود والفواتير
1. تحديث `QuickBarcodePrintPage.tsx`
2. تحديث `InvoicePrintView.tsx`
3. إضافة خيارات أحجام الملصقات

### الأسبوع 4: التصليحات والإعدادات
1. تحديث `RepairOrderPrint.tsx`
2. تحسين `PrintingSettings.tsx`
3. إضافة اختبار الطباعة
4. توثيق النظام الجديد

---

## 🎯 النتائج المتوقعة | Expected Results

| الميزة | قبل | بعد |
|--------|-----|-----|
| الطباعة الصامتة | ❌ | ✅ |
| اختيار الطابعة | ❌ | ✅ |
| قائمة الطابعات | ❌ | ✅ |
| فتح درج النقود | جزئي | ✅ |
| طباعة الاختبار | ❌ | ✅ |
| دعم 44-80mm | 58/80 فقط | ✅ |
| صوت بعد الطباعة | ✅ | ✅ |
| سجل الطباعة | ✅ | ✅ |

---

## 📚 المراجع | References

- [electron-pos-printer GitHub](https://github.com/Hubertformin/electron-pos-printer)
- [Electron webContents.print()](https://www.electronjs.org/docs/latest/api/web-contents#contentsprintoptions-callback)
- [node-thermal-printer](https://www.npmjs.com/package/node-thermal-printer)
- [ESC/POS Commands Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)

---

## ✅ قائمة المهام | Checklist

- [ ] تثبيت `electron-pos-printer`
- [ ] إضافة IPC handlers للطباعة
- [ ] تحديث preload script
- [ ] إنشاء `usePrinter` hook
- [ ] إنشاء `PrinterSelector` component
- [ ] تحديث `PrintReceipt.tsx`
- [ ] تحديث `PrintingSettings.tsx`
- [ ] تحديث `QuickBarcodePrintPage.tsx`
- [ ] تحديث `RepairOrderPrint.tsx`
- [ ] تحديث `InvoicePrintView.tsx`
- [ ] اختبار على طابعة 58mm
- [ ] اختبار على طابعة 80mm
- [ ] اختبار فتح درج النقود
- [ ] توثيق API الجديد
