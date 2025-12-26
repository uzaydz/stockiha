import { BarcodeTemplate } from '@/config/barcode-templates';
import { FontOption } from '@/pages/dashboard/QuickBarcodePrintPage';
import { prepareBarcodeValue } from '@/lib/barcode-utils';
import JsBarcode from 'jsbarcode';

export interface ProductForBarcode {
    product_id: string;
    product_name: string;
    product_price: string | number;
    product_sku: string;
    product_barcode: string | null;
    stock_quantity: number;
    organization_name: string;
    product_slug: string | null;
    organization_domain: string | null;
    organization_subdomain: string | null;
}

export interface PrintSettings {
    label_width: number;
    label_height: number;
    barcode_type: string;
    display_store_name: boolean;
    display_product_name: boolean;
    display_price: boolean;
    display_sku: boolean;
    display_barcode_value: boolean;
    custom_width: string;
    custom_height: string;
    selected_label_size: string;
    selected_template_id: string;
    font_family_css: string;
}

export const generateLabelHtml = (
    product: ProductForBarcode,
    settings: PrintSettings,
    template: BarcodeTemplate,
    font: FontOption,
    isPreview: boolean = false
): string => {
    const uniqueSuffix = isPreview ? 'preview' : `${product.product_id}-${Math.random().toString(36).substr(2, 9)}`;
    const barcodeSvgId = `barcode-${uniqueSuffix}`;
    const qrCodeContainerId = `qrcode-${uniqueSuffix}`;

    const productUrlBase = (domain: string | null, subdomain: string | null): string => {
        if (domain) return `https://${domain}`;
        if (subdomain) return `https://${subdomain}.stockiha.com`;
        return 'fallback-base-url.com';
    };

    const baseUrl = productUrlBase(product.organization_domain, product.organization_subdomain);
    const slugPart = product.product_slug ? encodeURIComponent(product.product_slug) : product.product_id;
    const productPageUrl = `${baseUrl}/product-purchase-max-v3/${slugPart}`;
    const isFallbackUrl = baseUrl === 'fallback-base-url.com';

    let content = '';

    if (template.id === 'qr-plus-barcode') {
        content = `
      <div class="barcode-label template-${template.id}">
        ${settings.display_store_name ? `<div class="store-name-header-new">${product.organization_name}</div>` : ''}
        <div class="main-content-wrapper-new">
          <div id="${qrCodeContainerId}" class="qr-code-container-new">
            <!-- QR Code will be injected here -->
          </div>
          <div class="product-details-area-new">
            <div class="info-table-new">
              ${settings.display_product_name ?
                `<div class="info-table-row-new product-name-row-new">
                  <span class="info-value-new product-name-value-new">${product.product_name}</span>
                </div>` : ''}
              <div class="info-table-row-new barcode-row-new">
                <div class="barcode-svg-container-new">
                  <svg id="${barcodeSvgId}"></svg>
                </div>
              </div>
              ${settings.display_price ?
                `<div class="info-table-row-new price-row-new">
                  <span class="info-value-new price-value-new">${product.product_price} DA</span>
                </div>` : ''}
            </div>
          </div>
        </div>
        <div class="site-url-footer-new">${baseUrl}</div>
      </div>`;
    } else {
        content = `
      <div class="barcode-label template-${template.id}">
        ${settings.display_store_name ? `<p class="org-name">${product.organization_name}</p>` : ''}
        ${settings.display_product_name ? `<p class="product-name">${product.product_name}</p>` : ''}
        ${template.id === 'ideal' && (settings.display_product_name || settings.display_store_name) ? '<div class="divider"></div>' : ''}
        <svg id="${barcodeSvgId}"></svg>
        ${settings.display_price || settings.display_sku ?
                `<div class="price-sku-container">
            ${settings.display_price ? `<p class="price">${product.product_price} DA</p>` : ''}
            ${settings.display_sku ? `<p class="sku">SKU: ${product.product_sku}</p>` : ''}
          </div>` : ''}
      </div>`;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          background-color: #fff;
          font-family: ${settings.font_family_css} !important;
          direction: ${font.isRTL ? 'rtl' : 'ltr'};
          width: ${settings.label_width}mm;
          height: ${settings.label_height}mm;
          overflow: hidden;
        }

        .barcode-label {
          width: ${settings.label_width}mm !important;
          height: ${settings.label_height}mm !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
          padding: 1mm;
          font-family: ${settings.font_family_css} !important;
          background: white;
        }

        .barcode-label p {
          margin: 0.2mm 0;
          font-size: 6pt;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        /* Template CSS */
        ${template.css}

        /* Preview Specific Overrides */
        ${isPreview ? `
          body {
            transform-origin: top left;
          }
        ` : ''}
      </style>
    </head>
    <body>
      ${content}
      <script>
        // We need to inject the barcode generation logic here or run it from outside
        // For preview, we'll handle it from the parent component
      </script>
    </body>
    </html>
  `;
};
