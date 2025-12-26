
import { TemplateProps } from '@/components/barcode/templates/types';

export interface PrintableItem {
  templateId: string;
  props: TemplateProps;
  count: number;
}

/**
 * توليد HTML للقالب الكلاسيكي
 */
const renderClassicTemplate = (props: TemplateProps): string => {
  const { product, settings, barcodeUrl } = props;
  const fontFamily = settings.fontFamily || 'sans-serif';

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:2mm;box-sizing:border-box;background:#fff;font-family:${fontFamily};overflow:hidden;color:#000;">
      ${settings.showStore ? `<div style="font-size:7pt;font-weight:bold;text-transform:uppercase;margin-bottom:2px;text-align:center;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid #eee;padding-bottom:2px;">${product.organization_name}</div>` : ''}
      ${settings.showName ? `<div style="font-size:9pt;font-weight:600;text-align:center;line-height:1.2;margin:2px 0;overflow:hidden;width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${product.product_name}</div>` : ''}
      <div style="flex-grow:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;overflow:hidden;margin:2px 0;">
        ${barcodeUrl ? `<img src="${barcodeUrl}" alt="Barcode" style="max-width:100%;max-height:100%;object-fit:contain;" />` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:auto;padding-top:3px;border-top:1px solid #000;">
        ${settings.showSku ? `<span style="font-size:7pt;font-family:monospace;color:#333;">${product.product_sku}</span>` : ''}
        ${settings.showPrice ? `<span style="font-size:11pt;font-weight:900;margin-left:auto;text-align:${settings.showSku ? 'right' : 'center'};width:${settings.showSku ? 'auto' : '100%'};">${Number(product.product_price).toLocaleString('en-US')} <span style="font-size:0.6em;">DA</span></span>` : ''}
      </div>
    </div>
  `;
};

/**
 * توليد HTML للقالب الفاخر
 */
const renderPremiumTemplate = (props: TemplateProps): string => {
  const { product, settings, barcodeUrl } = props;
  const fontFamily = settings.fontFamily || "'Times New Roman', serif";

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;background:#fff;font-family:${fontFamily};overflow:hidden;border:4px double #000;box-sizing:border-box;position:relative;">
      ${settings.showStore ? `<div style="background:#000;color:#fff;font-size:8pt;font-weight:bold;text-transform:uppercase;padding:2px 0;text-align:center;width:100%;letter-spacing:2px;font-family:${fontFamily};">${product.organization_name}</div>` : ''}
      <div style="flex-grow:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:3px;width:100%;">
        ${settings.showName ? `<div style="font-size:9pt;font-style:italic;font-weight:bold;text-align:center;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${product.product_name}</div>` : ''}
        <div style="flex-grow:1;display:flex;justify-content:center;align-items:center;width:100%;min-height:0;margin:2px 0;">
          ${barcodeUrl ? `<img src="${barcodeUrl}" alt="Barcode" style="max-width:100%;max-height:100%;object-fit:contain;" />` : ''}
        </div>
        ${settings.showPrice ? `<div style="font-size:13pt;font-weight:bold;text-align:center;margin-bottom:2px;">${Number(product.product_price).toLocaleString('en-US')} <span style="font-size:0.6em;">DZD</span></div>` : ''}
      </div>
      ${settings.showSku ? `<div style="position:absolute;bottom:1px;right:2px;font-size:6px;color:#888;font-family:monospace;background:#fff;padding:0 2px;">${product.product_sku}</div>` : ''}
    </div>
  `;
};

/**
 * توليد HTML لقالب QR + Barcode
 */
const renderQrTemplate = (props: TemplateProps): string => {
  const { product, settings, barcodeUrl, qrCodeUrl } = props;
  const fontFamily = settings.fontFamily || 'sans-serif';

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:0.8mm;box-sizing:border-box;background:#fff;font-family:${fontFamily};overflow:hidden;color:#000;">
      ${settings.showStore ? `<div style="font-size:6pt;font-weight:bold;text-align:center;border-bottom:0.5px solid #eaeaea;margin-bottom:0.5mm;padding-bottom:0.5mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;">${product.organization_name}</div>` : ''}
      <div style="display:flex;flex-direction:row;flex-grow:1;gap:1mm;min-height:0;align-items:center;">
        ${qrCodeUrl ? `<div style="width:32%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#fff;"><img src="${qrCodeUrl}" style="width:100%;height:auto;max-height:100%;object-fit:contain;display:block;" /></div>` : ''}
        <div style="flex-grow:1;display:flex;flex-direction:column;justify-content:space-between;width:66%;height:100%;padding-left:0.5mm;">
          ${settings.showName ? `<div style="font-size:7.5pt;font-weight:700;line-height:1.1;margin-bottom:0.5mm;text-align:right;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:0;">${product.product_name}</div>` : ''}
          <div style="flex-grow:1;display:flex;align-items:center;justify-content:center;min-height:0;margin:0.5mm 0;">
            ${barcodeUrl ? `<img src="${barcodeUrl}" style="width:100%;height:auto;max-height:100%;object-fit:contain;" />` : ''}
          </div>
          ${settings.showPrice ? `<div style="font-size:10pt;font-weight:900;text-align:center;color:#000;white-space:nowrap;">${Number(product.product_price).toLocaleString('en-US')} <span style="font-size:0.6em;">DA</span></div>` : ''}
        </div>
      </div>
      ${settings.showSku ? `<div style="font-size:5pt;text-align:center;color:#666;margin-top:0.5mm;font-family:monospace;">${product.product_sku}</div>` : ''}
    </div>
  `;
};

/**
 * دالة توليد HTML للطباعة لأي عدد من المنتجات
 * ⚡ جميع الخطوط محلية - تعمل أوفلاين
 */
export const renderLabelsToHtml = (
  items: PrintableItem[],
  globalSettings: { labelWidth: number; labelHeight: number; }
): string => {

  let labelsHtml = '';

  // استخراج الخط من أول عنصر (جميعها يجب أن تستخدم نفس الخط)
  const fontFamily = items[0]?.props.settings.fontFamily || 'sans-serif';

  items.forEach((item) => {
    for (let i = 0; i < item.count; i++) {
      let labelContent = '';

      switch (item.templateId) {
        case 'premium':
          labelContent = renderPremiumTemplate(item.props);
          break;
        case 'qr-plus-barcode':
          labelContent = renderQrTemplate(item.props);
          break;
        case 'classic':
        case 'default':
        case 'compact':
        case 'ideal':
        default:
          labelContent = renderClassicTemplate(item.props);
          break;
      }

      labelsHtml += `
        <div style="width:${globalSettings.labelWidth}mm;height:${globalSettings.labelHeight}mm;page-break-after:always;break-after:page;overflow:hidden;display:block;margin:0;padding:0;">
          ${labelContent}
        </div>
      `;
    }
  });

  // ⚡ لا Google Fonts - جميع الخطوط محلية/نظام
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>طباعة الملصقات</title>
      <style>
        @page {
          size: ${globalSettings.labelWidth}mm ${globalSettings.labelHeight}mm;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          background: #fff;
          font-family: ${fontFamily};
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > div:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      </style>
    </head>
    <body>
      ${labelsHtml}
    </body>
    </html>
  `;
};
