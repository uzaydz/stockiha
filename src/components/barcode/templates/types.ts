
import { ProductForBarcodePrinting } from '@/hooks/useProductsForBarcodePrintingOffline';

export interface TemplateProps {
    product: ProductForBarcodePrinting;
    settings: {
        showPrice: boolean;
        showName: boolean;
        showStore: boolean;
        showSku: boolean;
        showBarcodeValue: boolean;
        fontFamily: string; // ⚡ الخط المختار من المستخدم
    };
    barcodeUrl?: string; // Base64 or Blob URL of the generated barcode SVG/IMG
    qrCodeUrl?: string;  // Base64 or Blob URL of the generated QR SVG/IMG
}
