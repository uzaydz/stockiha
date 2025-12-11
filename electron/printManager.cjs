const { BrowserWindow, ipcMain } = require('electron');

let PosPrinter = null;
try {
    const posPrinterModule = require('electron-pos-printer');
    PosPrinter = posPrinterModule.PosPrinter;
    console.log('✅ [PrintManager] electron-pos-printer loaded successfully');
} catch (error) {
    console.warn('⚠️ [PrintManager] electron-pos-printer not available:', error.message);
}

class PrintManager {
    constructor() {
        this.workerWindow = null;
        this.queue = [];
        this.isProcessing = false;
    }

    initialize() {
        this.createWorkerWindow();
    }

    createWorkerWindow() {
        if (this.workerWindow && !this.workerWindow.isDestroyed()) return;

        this.workerWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                backgroundThrottling: false // Important: keep processing even if hidden
            }
        });

        this.workerWindow.on('closed', () => {
            this.workerWindow = null;
        });

        // Load blank page initially to have a valid webContents
        this.workerWindow.loadURL('about:blank');
        console.log('✅ [PrintManager] Worker window created');
    }

    /**
     * Print HTML content using the singleton worker window.
     * Uses a queue to manage sequential printing.
     */
    async printHtml(options) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                type: 'html',
                options,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    /**
     * Handle POS receipt printing using electron-pos-printer
     */
    async printReceipt(options) {
        try {
            if (!PosPrinter) {
                throw new Error('POS Printer not available');
            }

            // POS Printer manages its own window/queue, but we can wrap it
            // to centralize logging or future queue management
            const { data, printerName, pageSize, copies, silent, margin } = options;

            const printOptions = {
                preview: silent === false,
                margin: margin || '0 0 0 0',
                copies: copies || 1,
                printerName: printerName || undefined,
                timeOutPerLine: 400,
                pageSize: pageSize || '80mm',
                silent: silent !== false
            };

            console.log('[PrintManager] Printing receipt:', printOptions);
            await PosPrinter.print(data, printOptions);
            return { success: true };
        } catch (error) {
            console.error('[PrintManager] Receipt print failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle Barcode printing
     */
    async printBarcode(options) {
        try {
            if (!PosPrinter) {
                throw new Error('POS Printer not available');
            }

            const { barcodes, printerName, pageSize, silent, labelSize, showStoreName, showProductName, showPrice } = options;

            // Transform barcodes to electron-pos-printer format
            const data = [];

            for (const barcode of barcodes) {
                // Store Name
                if (showStoreName && barcode.storeName) {
                    data.push({
                        type: 'text',
                        value: barcode.storeName,
                        style: { textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }
                    });
                }

                // Product Name
                if (showProductName && barcode.productName) {
                    data.push({
                        type: 'text',
                        value: barcode.productName,
                        style: { textAlign: 'center', fontSize: '12px' }
                    });
                }

                // Barcode
                data.push({
                    type: 'barCode',
                    value: barcode.value,
                    height: barcode.height || 40,
                    width: barcode.width || 2,
                    displayValue: barcode.showValue !== false,
                    fontsize: 10,
                    position: 'below',
                    font: 'monospace' // monospace ensures bars are aligned
                });

                // Price
                if (showPrice && barcode.price) {
                    data.push({
                        type: 'text',
                        value: `${barcode.price} د.ج`,
                        style: { textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }
                    });
                }

                // Spacer
                data.push({
                    type: 'text',
                    value: '',
                    style: { marginBottom: '5mm' }
                });
            }

            const printOptions = {
                preview: silent === false,
                margin: '2mm',
                copies: 1,
                printerName: printerName || undefined,
                pageSize: labelSize || pageSize || { width: '50mm', height: '30mm' },
                silent: silent !== false
            };

            console.log('[PrintManager] Printing barcodes:', barcodes.length);
            await PosPrinter.print(data, printOptions);
            return { success: true };

        } catch (error) {
            console.error('[PrintManager] Barcode print failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get available printers
     */
    async getPrinters(mainWindow) {
        if (!mainWindow || !mainWindow.webContents) return [];
        try {
            const printers = await mainWindow.webContents.getPrintersAsync();
            return printers.map(p => ({
                name: p.name,
                displayName: p.displayName || p.name,
                description: p.description || '',
                status: p.status,
                isDefault: p.isDefault
            }));
        } catch (error) {
            console.error('[PrintManager] Failed to get printers:', error);
            return [];
        }
    }

    /**
     * Open Cash Drawer - إرسال أمر ESC/POS لفتح الدرج
     * يستخدم طرق متعددة للتوافق مع أنواع مختلفة من الطابعات
     */
    async openCashDrawer(printerName) {
        console.log('[PrintManager] 💰 Opening cash drawer...', printerName);

        // محاولة 1: استخدام electron-pos-printer إذا كان متاحاً
        if (PosPrinter) {
            try {
                // إرسال أمر ESC/POS لفتح درج النقود عبر طباعة نص غير مرئي
                // يحتوي على أمر فتح الدرج في بداية الطباعة
                const drawerCommand = [
                    {
                        type: 'text',
                        value: '\x1B\x70\x00\x19\xFA', // ESC p 0 25 250 - فتح الدرج Pin 2
                        style: { fontSize: '1px', color: 'white' }
                    }
                ];

                await PosPrinter.print(drawerCommand, {
                    printerName: printerName || undefined,
                    silent: true,
                    pageSize: '58mm',
                    preview: false
                });

                console.log('[PrintManager] ✅ Cash drawer opened via PosPrinter');
                return { success: true };
            } catch (err) {
                console.warn('[PrintManager] PosPrinter method failed, trying HTML method:', err.message);
            }
        }

        // محاولة 2: استخدام HTML print مع ESC/POS مضمن
        try {
            this.ensureWorkerWindow();

            // ESC/POS commands لفتح الدرج
            const escPosHtml = `
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="margin:0;padding:0;">
                    <pre style="font-family:monospace;font-size:1px;color:white;">\x1B\x70\x00\x19\xFA</pre>
                </body>
                </html>
            `;

            const encodedHtml = encodeURIComponent(escPosHtml.trim());
            const dataUrl = `data:text/html;charset=UTF-8,${encodedHtml}`;

            await this.workerWindow.loadURL(dataUrl);
            await new Promise(r => setTimeout(r, 200));

            await new Promise((resolve, reject) => {
                this.workerWindow.webContents.print({
                    silent: true,
                    printBackground: false,
                    deviceName: printerName || '',
                    pageSize: { width: 58000, height: 10000 },
                    margins: { marginType: 'none' }
                }, (success, errorType) => {
                    if (success) {
                        resolve();
                    } else {
                        reject(new Error(errorType || 'Print failed'));
                    }
                });
            });

            console.log('[PrintManager] ✅ Cash drawer opened via HTML print');
            return { success: true };
        } catch (err) {
            console.error('[PrintManager] ❌ Cash drawer error:', err);
            return { success: false, error: err.message };
        }
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const job = this.queue.shift();

        try {
            this.ensureWorkerWindow();

            if (job.type === 'html') {
                await this._processHtmlJob(job);
            }

            // Success
            job.resolve({ success: true });

        } catch (error) {
            console.error('[PrintManager] Job failed:', error);
            job.resolve({ success: false, error: error.message }); // Resolve with error details to not crash renderer
        } finally {
            this.isProcessing = false;
            this.cleanupWorker();

            // Process next item after small delay
            setTimeout(() => this.processQueue(), 100);
        }
    }

    ensureWorkerWindow() {
        if (!this.workerWindow || this.workerWindow.isDestroyed()) {
            this.createWorkerWindow();
        }
    }

    async _processHtmlJob(job) {
        const { html, printerName, silent, pageSize, landscape, margins } = job.options;

        // 1. Load HTML
        const encodedHtml = encodeURIComponent(html);
        const dataUrl = `data:text/html;charset=UTF-8,${encodedHtml}`;

        await this.workerWindow.loadURL(dataUrl);

        // 2. Wait a bit for rendering (fonts, styles)
        await new Promise(r => setTimeout(r, 500));

        // 3. تحويل pageSize للتنسيق الصحيح
        let finalPageSize;

        console.log('[PrintManager] Received pageSize:', pageSize, typeof pageSize);

        // إذا كان object مع width و height
        if (pageSize && typeof pageSize === 'object' && pageSize.width !== undefined && pageSize.height !== undefined) {
            finalPageSize = {
                width: Number(pageSize.width),
                height: Number(pageSize.height)
            };
            console.log('[PrintManager] Using object pageSize:', finalPageSize);
        }
        // إذا كان string مثل '58mm' نحوله لـ object
        else if (typeof pageSize === 'string' && pageSize.endsWith('mm')) {
            const widthMm = parseInt(pageSize.replace('mm', ''), 10);
            finalPageSize = {
                width: widthMm * 1000, // microns
                height: 297000 // A4 height - سيقطع تلقائياً للحراري
            };
            console.log('[PrintManager] Converted string pageSize:', pageSize, '->', finalPageSize);
        }
        // إذا كان string آخر مثل 'A4'
        else if (typeof pageSize === 'string') {
            finalPageSize = pageSize;
            console.log('[PrintManager] Using string pageSize:', finalPageSize);
        }
        // القيمة الافتراضية - 58mm للطابعات الحرارية
        else {
            finalPageSize = {
                width: 58000, // 58mm in microns
                height: 297000
            };
            console.log('[PrintManager] Using default pageSize (58mm):', finalPageSize);
        }

        console.log('[PrintManager] Final print options:', {
            silent,
            printerName,
            pageSize: finalPageSize,
            landscape,
            margins
        });

        // 4. Print
        return new Promise((resolve, reject) => {
            this.workerWindow.webContents.print({
                silent: silent !== false,
                printBackground: true,
                deviceName: printerName || '',
                pageSize: finalPageSize,
                landscape: landscape || false,
                margins: margins || { marginType: 'none' }
            }, (success, errorType) => {
                if (success) {
                    console.log('[PrintManager] ✅ HTML Print success');
                    resolve();
                } else {
                    console.error('[PrintManager] ❌ HTML Print failure:', errorType);
                    reject(new Error(errorType || 'Print failed'));
                }
            });
        });
    }

    cleanupWorker() {
        // Reset to blank page to free memory, but keep window open
        if (this.workerWindow && !this.workerWindow.isDestroyed()) {
            this.workerWindow.loadURL('about:blank');
        }
    }
}

// Singleton instance
module.exports = new PrintManager();
