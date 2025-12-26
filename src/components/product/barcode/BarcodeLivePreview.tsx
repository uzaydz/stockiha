import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { BarcodeTemplate } from '@/config/barcode-templates';
import { FontOption } from '@/pages/dashboard/QuickBarcodePrintPage';
import { generateLabelHtml, PrintSettings, ProductForBarcode } from '@/lib/barcode-html-generator';
import { prepareBarcodeValue } from '@/lib/barcode-utils';

interface BarcodeLivePreviewProps {
    product: ProductForBarcode;
    settings: PrintSettings;
    template: BarcodeTemplate;
    font: FontOption;
}

const BarcodeLivePreview: React.FC<BarcodeLivePreviewProps> = ({
    product,
    settings,
    template,
    font,
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [scale, setScale] = useState(1);

    // Calculate scale to fit the preview container
    useEffect(() => {
        const updateScale = () => {
            const container = iframeRef.current?.parentElement;
            if (container) {
                const containerWidth = container.clientWidth;
                // Add some padding
                const targetWidth = containerWidth - 40;
                // Convert mm to pixels (approx 3.78 px per mm)
                const labelWidthPx = settings.label_width * 3.78;

                if (labelWidthPx > targetWidth) {
                    setScale(targetWidth / labelWidthPx);
                } else {
                    setScale(1); // Or larger if we want to zoom in on small labels
                }
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [settings.label_width]);

    useEffect(() => {
        const renderPreview = async () => {
            if (!iframeRef.current) return;

            const doc = iframeRef.current.contentDocument;
            if (!doc) return;

            // Generate HTML
            const html = generateLabelHtml(product, settings, template, font, true);
            doc.open();
            doc.write(html);
            doc.close();

            // Wait for DOM to be ready
            // We use a small timeout to ensure the DOM is parsed
            setTimeout(async () => {
                const uniqueSuffix = 'preview';
                const barcodeSvgId = `barcode-${uniqueSuffix}`;
                const qrCodeContainerId = `qrcode-${uniqueSuffix}`;

                const targetBarcodeSvgElement = doc.getElementById(barcodeSvgId);
                const qrCodeElement = doc.getElementById(qrCodeContainerId);

                // Generate Barcode
                if (targetBarcodeSvgElement) {
                    const valueToEncode = product.product_barcode || product.product_sku || product.product_id || 'NO_DATA';
                    let barcodeFormat = settings.barcode_type;

                    if (template.id === 'qr-plus-barcode') {
                        barcodeFormat = 'CODE128';
                    }

                    const valueToUse = prepareBarcodeValue(valueToEncode, barcodeFormat);

                    try {
                        JsBarcode(targetBarcodeSvgElement, valueToUse, {
                            format: barcodeFormat,
                            lineColor: "#000",
                            width: template.jsBarcodeOptions?.width || 1.5,
                            height: template.jsBarcodeOptions?.height || 30,
                            displayValue: settings.display_barcode_value,
                            font: font.cssValue,
                            fontOptions: font.isRTL ? "rtl" : "",
                            fontSize: template.jsBarcodeOptions?.fontSize || 8,
                            textMargin: template.jsBarcodeOptions?.textMargin || 0,
                            margin: template.jsBarcodeOptions?.margin || 2,
                            ...template.jsBarcodeOptions,
                            valid: function (valid) {
                                if (!valid && targetBarcodeSvgElement) {
                                    try {
                                        JsBarcode(targetBarcodeSvgElement, valueToUse, {
                                            format: 'CODE128',
                                            lineColor: "#000",
                                            width: 1.5,
                                            height: 30,
                                            displayValue: true
                                        });
                                    } catch (e) {
                                        targetBarcodeSvgElement.innerHTML = '<text x="0" y="15" fill="red" font-size="10">Error</text>';
                                    }
                                }
                            }
                        });
                    } catch (e) {
                        console.error("Barcode generation error", e);
                    }
                }

                // Generate QR Code
                if (template.id === 'qr-plus-barcode' && qrCodeElement) {
                    try {
                        const mod = await import('qr-code-styling');
                        const QRCodeStyling = mod.default || mod.QRCodeStyling || mod;

                        // Construct URL
                        let baseUrl = 'fallback.com';
                        if (product.organization_domain) baseUrl = `https://${product.organization_domain}`;
                        else if (product.organization_subdomain) baseUrl = `https://${product.organization_subdomain}.stockiha.com`;

                        const slugPart = product.product_slug ? encodeURIComponent(product.product_slug) : product.product_id;
                        const url = `${baseUrl}/product-purchase-max-v3/${slugPart}`;

                        const qrCode = new QRCodeStyling({
                            width: 100,
                            height: 100,
                            type: 'svg',
                            data: url,
                            dotsOptions: { color: "#000000", type: "square" },
                            backgroundOptions: { color: "#ffffff" },
                            imageOptions: { crossOrigin: "anonymous", margin: 0 }
                        });

                        qrCodeElement.innerHTML = '';
                        qrCode.append(qrCodeElement);
                    } catch (e) {
                        console.error("QR Code error", e);
                    }
                }
            }, 100);
        };

        renderPreview();
    }, [product, settings, template, font]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100/50 rounded-lg border border-dashed border-gray-300 p-4 overflow-hidden relative">
            <div
                style={{
                    width: `${settings.label_width}mm`,
                    height: `${settings.label_height}mm`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.3s ease'
                }}
            >
                <iframe
                    ref={iframeRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: 'white',
                        overflow: 'hidden'
                    }}
                    title="Barcode Preview"
                />
            </div>
            <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                {settings.label_width}mm x {settings.label_height}mm
            </div>
        </div>
    );
};

export default BarcodeLivePreview;
