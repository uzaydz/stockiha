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
        console.log('[PrintManager] 🚀 Initializing PrintManager...');
        this.createWorkerWindow();
        console.log('[PrintManager] ✅ PrintManager initialized');
    }

    createWorkerWindow() {
        if (this.workerWindow && !this.workerWindow.isDestroyed()) {
            console.log('[PrintManager] ♻️ Worker window already exists');
            return;
        }

        console.log('[PrintManager] 🪟 Creating worker window...');

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
     * ⚡ Fallback: طباعة الباركود باستخدام HTML (نفس طريقة الوصل الناجحة)
     */
    async printBarcodeViaHtml(options) {
        // ⚡ استخراج المعاملات أولاً
        const {
            barcodes,
            printerName,
            labelSize,
            showStoreName,
            showProductName,
            showPrice,
            showBarcodeValue = true,
            showSku = false,
            templateId = 'default',
            fontFamily = 'system-ui',
            barcodeType = 'CODE128',
            silent,
            customHtml // ⚡ HTML مخصص للقوالب المعقدة (مثل QR codes)
        } = options;

        console.log('[PrintManager] 🔄 Using HTML printing for barcodes (same as receipts)');
        console.log('[PrintManager] Barcode options:', {
            barcodesCount: barcodes?.length,
            printerName: printerName,
            labelSize: labelSize,
            labelWidth: labelSize?.width,
            labelHeight: labelSize?.height,
            templateId: templateId,
            fontFamily: fontFamily,
            barcodeType: barcodeType,
            silent: silent,
            hasCustomHtml: !!customHtml
        });
        console.log('[PrintManager] 📏 Label size will be: width=' + (labelSize?.width || '50mm') + ', height=' + (labelSize?.height || '30mm'));

        // ⚡ إذا كان هناك HTML مخصص، استخدمه مباشرة
        if (customHtml) {
            console.log('[PrintManager] 🎨 Using custom HTML for complex template');
            return await this.printHtml({
                html: customHtml,
                printerName,
                silent: silent !== false,
                pageSize: {
                    width: parseInt(labelSize?.width?.replace('mm', '') || '50', 10) * 1000,
                    height: parseInt(labelSize?.height?.replace('mm', '') || '30', 10) * 1000
                },
                margins: { marginType: 'none' }
            });
        }

        // بناء HTML للباركودات - مع تطبيق القالب والإعدادات
        // CSS يختلف حسب القالب المختار
        let templateCss = '';

        // تطبيق CSS حسب القالب
        // ⚡ ملاحظة: جميع القوالب تستخدم نفس حجم الملصق المحدد في @page
        if (templateId === 'classic') {
            templateCss = `
                .barcode-label {
                    padding: 2mm;
                    border: 0.5px solid #888;
                    width: ${labelSize?.width || '50mm'};
                    height: ${labelSize?.height || '30mm'};
                }
                .store-name { font-size: 7pt; font-weight: bold; margin-bottom: 1mm; }
                .product-name { font-size: 8pt; font-weight: bold; margin-bottom: 0.5mm; }
                .price { font-size: 7pt; margin-top: 0.5mm; }
                .sku { font-size: 6pt; color: #555; margin-top: 0.5mm; }
            `;
        } else if (templateId === 'compact') {
            templateCss = `
                .barcode-label {
                    padding: 1mm;
                    width: ${labelSize?.width || '50mm'};
                    height: ${labelSize?.height || '30mm'};
                }
                .store-name { display: none; }
                .product-name { font-size: 7pt; font-weight: bold; margin-bottom: 0.2mm; white-space: normal; line-height: 1.1; }
                .price { font-size: 6.5pt; font-weight: bold; margin-top: 0.2mm; }
                .sku { font-size: 5.5pt; color: #333; margin-top: 0.2mm; }
            `;
        } else if (templateId === 'ideal') {
            templateCss = `
                .barcode-label {
                    padding: 2.5mm;
                    width: ${labelSize?.width || '50mm'};
                    height: ${labelSize?.height || '30mm'};
                }
                .store-name { font-size: 5.5pt; color: #333; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1mm; }
                .product-name { font-size: 8pt; font-weight: 600; margin-bottom: 1mm; line-height: 1.15; }
                .price { font-size: 7.5pt; font-weight: 600; margin-top: 1mm; }
                .sku { font-size: 6pt; color: #444; margin-top: 0.5mm; }
            `;
        } else {
            // default template
            templateCss = `
                .barcode-label {
                    padding: 2mm;
                    width: ${labelSize?.width || '50mm'};
                    height: ${labelSize?.height || '30mm'};
                }
                .store-name { font-size: 6pt; }
                .product-name { font-size: 7pt; font-weight: bold; }
                .price { font-size: 7pt; font-weight: bold; }
                .sku { font-size: 6pt; }
            `;
        }

        let html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: ${labelSize?.width || '50mm'} ${labelSize?.height || '30mm'};
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: ${fontFamily}, Arial, sans-serif;
            direction: rtl;
        }
        .barcode-label {
            width: 100%;
            height: 100%;
            page-break-after: always;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            box-sizing: border-box;
        }
        .barcode-label:last-child {
            page-break-after: auto;
        }
        /* ⚡ منع تقسيم العناصر داخل الملصق */
        .barcode-label * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .store-name,
        .product-name,
        .price,
        .sku {
            text-align: center;
        }
        .barcode-container {
            font-family: 'Libre Barcode 128', 'Libre Barcode 128 Text', monospace;
            font-size: ${barcodeType === 'CODE128' ? '32px' : '28px'};
            margin: 3px 0;
            letter-spacing: 0;
        }
        ${templateCss}
    </style>
</head>
<body>`;

        // إضافة كل باركود
        for (const barcode of barcodes) {
            html += `
    <div class="barcode-label">`;

            // اسم المتجر
            if (showStoreName && barcode.storeName) {
                html += `
        <div class="store-name">${barcode.storeName}</div>`;
            }

            // اسم المنتج
            if (showProductName && barcode.productName) {
                html += `
        <div class="product-name">${barcode.productName}</div>`;
            }

            // الباركود
            // نستخدم الخط الخاص بالباركود مع القيمة
            const barcodeDisplay = showBarcodeValue ? `*${barcode.value}*` : `*${barcode.value}*`;
            html += `
        <div class="barcode-container">${barcodeDisplay}</div>`;

            // السعر
            if (showPrice && barcode.price) {
                html += `
        <div class="price">${barcode.price}</div>`;
            }

            // SKU (إذا كان متاحاً)
            if (showSku && barcode.sku) {
                html += `
        <div class="sku">SKU: ${barcode.sku}</div>`;
            }

            html += `
    </div>`;
        }

        html += `
</body>
</html>`;

        // تحويل labelSize للتنسيق الصحيح (microns)
        let finalPageSize;
        if (labelSize && typeof labelSize === 'object') {
            const widthStr = labelSize.width || '50mm';
            const heightStr = labelSize.height || '30mm';
            const widthMm = parseInt(widthStr.replace('mm', ''), 10);
            const heightMm = parseInt(heightStr.replace('mm', ''), 10);
            finalPageSize = {
                width: widthMm * 1000, // microns
                height: heightMm * 1000
            };
        } else {
            finalPageSize = {
                width: 50000, // 50mm
                height: 30000  // 30mm
            };
        }

        // استخدام نفس آلية printHtml الموثوقة
        console.log('[PrintManager] 📄 Calling printHtml with:', {
            printerName,
            silent: silent !== false,
            pageSize: finalPageSize
        });

        const result = await this.printHtml({
            html,
            printerName,
            silent: silent !== false,
            pageSize: finalPageSize,
            margins: { marginType: 'none' }
        });

        console.log('[PrintManager] 📄 printHtml result:', result);
        return result;
    }

    /**
     * Handle Barcode printing
     */
    async printBarcode(options) {
        console.log('[PrintManager] 🎯 printBarcode called with options:', {
            barcodesCount: options.barcodes?.length,
            labelSize: options.labelSize,
            printerName: options.printerName,
            silent: options.silent,
            templateId: options.templateId,
            hasCustomHtml: !!options.customHtml,
            customHtmlLength: options.customHtml?.length || 0
        });

        try {
            // ⚡ PRIORITY 1: إذا كان هناك customHtml (QR templates)، استخدم HTML printing مباشرة
            if (options.customHtml) {
                console.log('[PrintManager] 🎨 customHtml detected, using HTML printing directly');
                return await this.printBarcodeViaHtml(options);
            }

            // ⚡ PRIORITY 2: إذا لم يكن PosPrinter متاحاً، استخدم HTML printing
            if (!PosPrinter) {
                console.warn('[PrintManager] ⚠️ PosPrinter not available, using HTML fallback');
                return await this.printBarcodeViaHtml(options);
            }

            // ⚡ PRIORITY 3: محاولة Native printing (للقوالب البسيطة فقط)
            console.log('[PrintManager] ✅ Trying native PosPrinter (simple templates only)');

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

            // ⚡ electron-pos-printer يقبل pageSize كـ string (مثل '58mm') أو object
            let finalPageSize = '58mm'; // القيمة الافتراضية

            if (labelSize && typeof labelSize === 'object') {
                // إذا كان labelSize مثل { width: '50mm', height: '30mm' }
                const widthStr = labelSize.width || '50mm';
                // electron-pos-printer يستخدم العرض فقط للطابعات الحرارية
                finalPageSize = widthStr;
            } else if (typeof labelSize === 'string') {
                finalPageSize = labelSize;
            } else if (typeof pageSize === 'string') {
                finalPageSize = pageSize;
            }

            // ⚠️ IMPORTANT: إذا لم يتم تحديد printerName، سيفتح نافذة الاختيار!
            const useSilent = silent !== false && printerName; // صامت فقط إذا كانت الطابعة محددة

            const timeOutPerLine = Number.isFinite(options.timeOutPerLine) ? Number(options.timeOutPerLine) : 120;

            const printOptions = {
                preview: false, // لا معاينة
                margin: '0mm', // بدون هوامش
                copies: 1,
                printerName: printerName, // ⚠️ مهم جداً!
                pageSize: finalPageSize,
                silent: useSilent, // صامت فقط مع طابعة محددة
                // ⚡ تسريع طباعة الباركود (الملصقات عادة قصيرة)
                timeOutPerLine
            };

            console.log('[PrintManager] 🖨️ Barcode Print Options:', {
                barcodeCount: barcodes.length,
                pageSize: finalPageSize,
                printerName: printerName || 'NOT SET ⚠️',
                silent: useSilent,
                preview: false
            });

            console.log('[PrintManager] 📦 Full printOptions object:', JSON.stringify(printOptions, null, 2));
            console.log('[PrintManager] 📦 Data array length:', data.length);

            if (!printerName) {
                console.warn('[PrintManager] ⚠️ No printer specified! Print dialog will appear.');
            }

            console.log('[PrintManager] 🚀 Calling PosPrinter.print()...');
            await PosPrinter.print(data, printOptions);
            console.log('[PrintManager] ✅ PosPrinter.print() completed successfully');
            return { success: true };

        } catch (error) {
            console.error('[PrintManager] ❌ Native barcode printing failed:', error);
            console.log('[PrintManager] 🔄 Falling back to HTML printing...');

            // محاولة HTML printing كـ fallback
            try {
                return await this.printBarcodeViaHtml(options);
            } catch (fallbackError) {
                console.error('[PrintManager] ❌ HTML fallback also failed:', fallbackError);
                return { success: false, error: `Native print failed: ${error.message}. HTML fallback also failed: ${fallbackError.message}` };
            }
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

        // Auto-fit height for thermal widths to avoid large blank space
        if (
            finalPageSize &&
            typeof finalPageSize === 'object' &&
            typeof finalPageSize.width === 'number' &&
            typeof finalPageSize.height === 'number'
        ) {
            const isThermalWidth = finalPageSize.width <= 100000;
            const isAutoHeight = finalPageSize.height >= 200000;

            if (isThermalWidth && isAutoHeight) {
                try {
                    const measurement = await this.workerWindow.webContents.executeJavaScript(`(() => {
                        const selectors = [
                            '#print-root',
                            '#repair-print-container',
                            '.receipt-wrapper',
                            '.receipt-container',
                            '.repair-receipt'
                        ];
                        let target = null;
                        let usedSelector = 'body';

                        for (const selector of selectors) {
                            const el = document.querySelector(selector);
                            if (el) {
                                target = el;
                                usedSelector = selector;
                                break;
                            }
                        }

                        const body = document.body;
                        const doc = document.documentElement;

                        const targetHeight = target
                            ? Math.max(
                                target.scrollHeight || 0,
                                target.offsetHeight || 0,
                                target.clientHeight || 0,
                                target.getBoundingClientRect ? Math.ceil(target.getBoundingClientRect().height) : 0
                              )
                            : 0;

                        const docHeight = Math.max(
                            body?.scrollHeight || 0,
                            body?.offsetHeight || 0,
                            body?.clientHeight || 0,
                            doc?.scrollHeight || 0,
                            doc?.offsetHeight || 0,
                            doc?.clientHeight || 0
                        );

                        return {
                            height: Math.max(targetHeight, docHeight),
                            targetHeight,
                            docHeight,
                            selector: usedSelector,
                            dpr: window.devicePixelRatio || 1
                        };
                    })()`);

                    const heightPx = Math.max(0, Number(measurement?.height) || 0);
                    const devicePixelRatio = Math.max(1, Number(measurement?.dpr) || 1);
                    const heightMm = Math.ceil((heightPx / devicePixelRatio) * 25.4 / 96);
                    const paddedMm = Math.max(10, heightMm + 2);
                    finalPageSize.height = paddedMm * 1000;
                    console.log('[PrintManager] Auto-sized thermal height:', {
                        selector: measurement?.selector,
                        targetHeight: measurement?.targetHeight,
                        docHeight: measurement?.docHeight,
                        heightPx,
                        heightMm: paddedMm,
                        heightMicrons: finalPageSize.height
                    });
                } catch (error) {
                    console.warn('[PrintManager] Auto-size thermal height failed:', error);
                }
            }
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
                    const errorMessage = errorType || 'Print cancelled or failed';
                    console.error('[PrintManager] ❌ HTML Print failure:', errorMessage);
                    console.error('[PrintManager] Print options were:', {
                        silent: silent !== false,
                        deviceName: printerName || 'default',
                        pageSize: finalPageSize
                    });
                    reject(new Error(errorMessage));
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
