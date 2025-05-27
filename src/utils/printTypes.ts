/**
 * أنواع البيانات والواجهات الخاصة بالطباعة
 */

export interface BarcodeItem {
  barcodeImageUrl: string;
  value: string;
  productName?: string;
  price?: number;
  colorName?: string;
  sizeName?: string;
  quantity?: number;
}

export interface PrintSettings {
  paperSize: string;
  customWidth?: number;
  customHeight?: number;
  includeName: boolean;
  includePrice: boolean;
  includeStoreName?: boolean;
  storeName?: string;
  showSku: boolean;
  fontSize: number;
  fontFamily: string;
  orientation: 'portrait' | 'landscape';
  colorScheme: string;
  fontColor?: string;
  backgroundColor?: string;
  barcodeType: 'compact128' | 'code128' | 'code39' | 'ean13' | 'upc';
  margin?: number;
  spacing?: number;
  quality?: 'normal' | 'high' | 'thermal';
}

export interface MultiplePrintSettings {
  columns: number;
  rows: number;
  paperSize: string;
  includeName: boolean;
  includePrice: boolean;
  includeStoreName?: boolean;
  storeName?: string;
  showSku: boolean;
  itemSpacing?: number;
  gridGap?: number;
}

export interface PageDimensions {
  pageSize: string;
  marginSize: string;
  containerMaxWidth: string;
  actualFontSize: number;
  priceFontSize: number;
  barcodeSize: string;
  nameMargin: string;
  priceMargin: string;
  elementSpacing: string;
  containerPadding: string;
  isSmallLabel: boolean;
  isThermal: boolean;
}

export type BarcodeSize = 'small' | 'medium' | 'large';

export type PaperSizeType = 
  | 'A4' 
  | 'A5' 
  | 'label50x90' 
  | 'thermal58' 
  | 'thermal80' 
  | 'thermal110'
  | 'custom';

export type PrintQuality = 'normal' | 'high' | 'thermal';

export type ColorScheme = 'default' | 'high-contrast' | 'thermal' | 'custom';

export interface ThermalPrinterSettings {
  density: 'light' | 'normal' | 'dark';
  speed: 'slow' | 'normal' | 'fast';
  dithering: boolean;
  contrast: number;
}

export interface PrinterCapabilities {
  supportsThermal: boolean;
  supportsColor: boolean;
  maxWidth: number;
  maxHeight: number;
  minFontSize: number;
  maxFontSize: number;
  dpi: number;
}
