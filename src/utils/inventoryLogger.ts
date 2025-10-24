// نظام مراقبة شامل للمخزون في نقطة البيع
// يساعد في تتبع كل خطوة في عمليات إدارة المخزون مع سجل قابل للتصدير

type Nullable<T> = T | null | undefined;

export interface InventoryLogEntry {
  timestamp: string;
  action: string;
  location: string;
  productId?: string;
  productName?: string;
  variantId?: Nullable<string>;
  colorId?: Nullable<string>;
  sizeId?: Nullable<string>;
  quantity?: number;
  oldStock?: number;
  newStock?: number;
  orderId?: string;
  details: Record<string, unknown>;
  stackTrace?: string;
}

class InventoryLogger {
  private logs: InventoryLogEntry[] = [];
  private isEnabled = true;

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  private getStackTrace(): string {
    try {
      throw new Error();
    } catch (error) {
      return (error as Error).stack?.split('\n').slice(2, 8).join('\n') || '';
    }
  }

  log(entry: Partial<InventoryLogEntry>) {
    if (!this.isEnabled) return;

    const details = isRecord(entry.details) ? entry.details : {};
    const fullEntry: InventoryLogEntry = {
      timestamp: new Date().toISOString(),
      action: entry.action || 'غير محدد',
      location: entry.location || 'غير محدد',
      productId: entry.productId,
      productName: entry.productName,
      variantId: entry.variantId,
      colorId: entry.colorId,
      sizeId: entry.sizeId,
      quantity: entry.quantity,
      oldStock: entry.oldStock,
      newStock: entry.newStock,
      orderId: entry.orderId,
      details: { ...details },
      stackTrace: this.getStackTrace(),
    };

    this.logs.push(fullEntry);

    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    this.printConsoleLog(fullEntry);
  }

  private printConsoleLog(entry: InventoryLogEntry) {
    if (typeof console === 'undefined') {
      return;
    }

    const variantInfo = this.formatVariantInfo(entry);
    const stockInfo = this.formatStockInfo(entry);
    const header = `[Inventory] ${entry.action} · ${entry.location}`;

    if (console.groupCollapsed) {
      console.groupCollapsed(header, entry.productName ? `→ ${entry.productName}` : '');
    }

    console.log('التوقيت:', new Date(entry.timestamp).toLocaleString());
    if (entry.productId) {
      console.log('المنتج:', entry.productId, entry.productName || 'بدون اسم');
    }
    if (variantInfo) {
      console.log('تفاصيل المتغير:', variantInfo);
    }
    if (stockInfo) {
      console.log('المخزون:', stockInfo);
    }
    if (typeof entry.quantity === 'number') {
      console.log('التغيير في الكمية:', entry.quantity);
    }
    if (entry.orderId) {
      console.log('رقم الطلب:', entry.orderId);
    }
    if (Object.keys(entry.details).length > 0) {
      console.log('تفاصيل إضافية:', entry.details);
    }
    if (entry.stackTrace) {
      console.log('Stack Trace:', entry.stackTrace);
    }

    if (console.groupCollapsed) {
      console.groupEnd();
    }
  }

  private formatVariantInfo(entry: InventoryLogEntry): string {
    const segments: string[] = [];

    if (entry.colorId) {
      segments.push(`لون: ${resolveDisplay(entry.colorId)}`);
    }

    if (entry.sizeId) {
      segments.push(`حجم: ${resolveDisplay(entry.sizeId)}`);
    }

    if (entry.variantId) {
      segments.push(`متغير: ${resolveDisplay(entry.variantId)}`);
    }

    return segments.join(', ');
  }

  private formatStockInfo(entry: InventoryLogEntry): string {
    if (typeof entry.oldStock === 'number' && typeof entry.newStock === 'number') {
      const change = entry.newStock - entry.oldStock;
      const changeSymbol = change > 0 ? '+' : '';
      return `${entry.oldStock} → ${entry.newStock} (${changeSymbol}${change})`;
    }

    if (typeof entry.newStock === 'number') {
      return `${entry.newStock}`;
    }

    return '';
  }

  logProductAdd(productId: string, productName: string, quantity: number, location: string, details: Record<string, unknown> = {}) {
    this.log({
      action: '➕ إضافة منتج للسلة',
      location,
      productId,
      productName,
      quantity,
      details: { ...details, operation: 'ADD_TO_CART' },
    });
  }

  logProductRemove(productId: string, productName: string, quantity: number, location: string, details: Record<string, unknown> = {}) {
    this.log({
      action: '➖ إزالة منتج من السلة',
      location,
      productId,
      productName,
      quantity,
      details: { ...details, operation: 'REMOVE_FROM_CART' },
    });
  }

  logStockUpdate(
    productId: string,
    productName: string,
    oldStock: number,
    newStock: number,
    location: string,
    colorId?: Nullable<string>,
    sizeId?: Nullable<string>,
    details: Record<string, unknown> = {}
  ) {
    this.log({
      action: '🔄 تحديث المخزون',
      location,
      productId,
      productName,
      oldStock,
      newStock,
      colorId,
      sizeId,
      quantity: newStock - oldStock,
      details: { ...details, operation: 'STOCK_UPDATE' },
    });
  }

  logOrderSubmit(orderId: string, items: Array<Record<string, unknown>>, location: string, details: Record<string, unknown> = {}) {
    this.log({
      action: '🧾 تقديم الطلب',
      location,
      orderId,
      details: {
        ...details,
        operation: 'ORDER_SUBMIT',
        itemsCount: items.length,
        items,
      },
    });
  }

  logReturn(productId: string, productName: string, quantity: number, location: string, details: Record<string, unknown> = {}) {
    this.log({
      action: '↩️ إرجاع منتج',
      location,
      productId,
      productName,
      quantity,
      details: { ...details, operation: 'RETURN' },
    });
  }

  logCacheUpdate(productId: string, productName: string, location: string, details: Record<string, unknown> = {}) {
    this.log({
      action: '💾 تحديث الكاش',
      location,
      productId,
      productName,
      details: { ...details, operation: 'CACHE_UPDATE' },
    });
  }

  logServerSync(location: string, details: Record<string, unknown> = {}) {
    this.log({
      action: '🌐 مزامنة مع الخادم',
      location,
      details: { ...details, operation: 'SERVER_SYNC' },
    });
  }

  logError(error: string, location: string, details: Record<string, unknown> = {}) {
    this.log({
      action: '❌ خطأ',
      location,
      details: { ...details, error, operation: 'ERROR' },
    });
  }

  getLogs(): InventoryLogEntry[] {
    return [...this.logs];
  }

  getLogsForProduct(productId: string): InventoryLogEntry[] {
    return this.logs.filter((log) => log.productId === productId);
  }

  getLogsForOrder(orderId: string): InventoryLogEntry[] {
    return this.logs.filter((log) => log.orderId === orderId);
  }

  getLogsInTimeRange(startTime: string, endTime: string): InventoryLogEntry[] {
    return this.logs.filter((log) => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
  }

  printSummary() {
    const summary = {
      totalLogs: this.logs.length,
      timeRange:
        this.logs.length > 0
          ? {
              start: this.logs[0].timestamp,
              end: this.logs[this.logs.length - 1].timestamp,
            }
          : null,
      actionCounts: this.logs.reduce<Record<string, number>>((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {}),
      locationCounts: this.logs.reduce<Record<string, number>>((acc, log) => {
        acc[log.location] = (acc[log.location] || 0) + 1;
        return acc;
      }, {}),
    };

    if (typeof console !== 'undefined') {
      console.group('[Inventory] ملخص السجلات');
      console.log('عدد السجلات:', summary.totalLogs);
      if (summary.timeRange) {
        console.log('النطاق الزمني:', summary.timeRange.start, '→', summary.timeRange.end);
      }
      console.log('الإجراءات:');
      console.table(summary.actionCounts);
      console.log('المواقع:');
      console.table(summary.locationCounts);
      console.groupEnd();
    }
  }
}

export const inventoryLogger = new InventoryLogger();

export const logInventoryAction = inventoryLogger.log.bind(inventoryLogger);
export const logProductAdd = inventoryLogger.logProductAdd.bind(inventoryLogger);
export const logProductRemove = inventoryLogger.logProductRemove.bind(inventoryLogger);
export const logStockUpdate = inventoryLogger.logStockUpdate.bind(inventoryLogger);
export const logOrderSubmit = inventoryLogger.logOrderSubmit.bind(inventoryLogger);
export const logReturn = inventoryLogger.logReturn.bind(inventoryLogger);
export const logCacheUpdate = inventoryLogger.logCacheUpdate.bind(inventoryLogger);
export const logServerSync = inventoryLogger.logServerSync.bind(inventoryLogger);
export const logError = inventoryLogger.logError.bind(inventoryLogger);
export const enableInventoryLogging = inventoryLogger.enable.bind(inventoryLogger);
export const disableInventoryLogging = inventoryLogger.disable.bind(inventoryLogger);
export const clearInventoryLogs = inventoryLogger.clearLogs.bind(inventoryLogger);
export const printInventorySummary = inventoryLogger.printSummary.bind(inventoryLogger);
export const exportInventoryLogs = inventoryLogger.exportLogs.bind(inventoryLogger);

inventoryLogger.enable();

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).inventoryLogger = inventoryLogger;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveDisplay(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (isRecord(value)) {
    const candidates = ['name', 'label', 'value', 'color_name'];
    for (const key of candidates) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return JSON.stringify(value);
  }

  return 'غير محدد';
}
