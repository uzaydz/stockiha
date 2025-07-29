// نظام مراقبة شامل للمخزون في نقطة البيع
// هذا النظام سيساعدنا في تتبع كل خطوة في عمليات إدارة المخزون

export interface InventoryLogEntry {
  timestamp: string;
  action: string;
  location: string;
  productId?: string;
  productName?: string;
  variantId?: string | null;
  colorId?: string | null;
  sizeId?: string | null;
  quantity?: number;
  oldStock?: number;
  newStock?: number;
  orderId?: string;
  details: any;
  stackTrace?: string;
}

class InventoryLogger {
  private logs: InventoryLogEntry[] = [];
  private isEnabled = true;

  enable() {
    this.isEnabled = true;
    console.log('🔍 [INVENTORY LOGGER] تم تفعيل نظام مراقبة المخزون');
  }

  disable() {
    this.isEnabled = false;
    console.log('🔍 [INVENTORY LOGGER] تم إيقاف نظام مراقبة المخزون');
  }

  private getStackTrace(): string {
    try {
      throw new Error();
    } catch (e) {
      return (e as Error).stack?.split('\n').slice(2, 8).join('\n') || '';
    }
  }

  log(entry: Partial<InventoryLogEntry>) {
    if (!this.isEnabled) return;

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
      details: entry.details || {},
      stackTrace: this.getStackTrace()
    };

    this.logs.push(fullEntry);

    // طباعة مفصلة للـ console
    const variantInfo = this.formatVariantInfo(fullEntry);
    const stockInfo = this.formatStockInfo(fullEntry);

    console.group(`🔍 [INVENTORY] ${fullEntry.action} - ${fullEntry.location}`);
    console.log(`⏰ الوقت: ${new Date(fullEntry.timestamp).toLocaleString('ar-SA')}`);
    
    if (fullEntry.productId) {
      console.log(`📦 المنتج: ${fullEntry.productName || 'غير محدد'} (${fullEntry.productId})`);
    }
    
    if (variantInfo) {
      console.log(`🎨 المتغيرات: ${variantInfo}`);
    }
    
    if (stockInfo) {
      console.log(`📊 المخزون: ${stockInfo}`);
    }
    
    if (fullEntry.quantity !== undefined) {
      console.log(`📈 الكمية: ${fullEntry.quantity}`);
    }
    
    if (fullEntry.orderId) {
      console.log(`🧾 معرف الطلب: ${fullEntry.orderId}`);
    }
    
    if (Object.keys(fullEntry.details).length > 0) {
      console.log('📋 تفاصيل إضافية:', fullEntry.details);
    }
    
    console.groupEnd();

    // الحفاظ على آخر 1000 سجل فقط
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  private formatVariantInfo(entry: InventoryLogEntry): string {
    const parts = [];
    
    // معالجة معرف اللون
    if (entry.colorId) {
      let colorDisplay = entry.colorId;
      
      // إذا كان اللون object، حاول استخراج اسم اللون
      if (typeof entry.colorId === 'object' && entry.colorId !== null) {
        const colorObj = entry.colorId as any;
        
        // إذا كان الكائن يحتوي على operation، فهو خطأ في البيانات - تجاهله
        if (colorObj.operation) {
          return ''; // إرجاع فارغ لتجنب عرض البيانات الخاطئة
        }
        
        colorDisplay = colorObj.name || colorObj.label || colorObj.value || colorObj.color_name || 
                      (typeof colorObj === 'string' ? colorObj : 'غير محدد');
      }
      
      parts.push(`لون: ${colorDisplay}`);
    }
    
    // معالجة معرف الحجم
    if (entry.sizeId) {
      let sizeDisplay = entry.sizeId;
      
      // إذا كان الحجم object، حاول استخراج اسم الحجم
      if (typeof entry.sizeId === 'object' && entry.sizeId !== null) {
        const sizeObj = entry.sizeId as any;
        sizeDisplay = sizeObj.name || sizeObj.label || sizeObj.value || JSON.stringify(sizeObj);
      }
      
      parts.push(`حجم: ${sizeDisplay}`);
    }
    
    // معالجة معرف المتغير
    if (entry.variantId) {
      let variantDisplay = entry.variantId;
      
      if (typeof entry.variantId === 'object' && entry.variantId !== null) {
        const variantObj = entry.variantId as any;
        variantDisplay = variantObj.name || variantObj.label || variantObj.value || JSON.stringify(variantObj);
      }
      
      parts.push(`متغير: ${variantDisplay}`);
    }
    
    return parts.join(', ');
  }

  private formatStockInfo(entry: InventoryLogEntry): string {
    if (entry.oldStock !== undefined && entry.newStock !== undefined) {
      const change = entry.newStock - entry.oldStock;
      const changeSymbol = change > 0 ? '+' : '';
      return `${entry.oldStock} → ${entry.newStock} (${changeSymbol}${change})`;
    }
    if (entry.newStock !== undefined) {
      return `${entry.newStock}`;
    }
    return '';
  }

  // دوال مخصصة لحالات مختلفة
  logProductAdd(productId: string, productName: string, quantity: number, location: string, details: any = {}) {
    this.log({
      action: '➕ إضافة منتج للسلة',
      location,
      productId,
      productName,
      quantity,
      details: { ...details, operation: 'ADD_TO_CART' }
    });
  }

  logProductRemove(productId: string, productName: string, quantity: number, location: string, details: any = {}) {
    this.log({
      action: '➖ إزالة منتج من السلة',
      location,
      productId,
      productName,
      quantity,
      details: { ...details, operation: 'REMOVE_FROM_CART' }
    });
  }

  logStockUpdate(
    productId: string, 
    productName: string, 
    oldStock: number, 
    newStock: number, 
    location: string,
    colorId?: string | null,
    sizeId?: string | null,
    details: any = {}
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
      details: { ...details, operation: 'STOCK_UPDATE' }
    });
  }

  logOrderSubmit(orderId: string, items: any[], location: string, details: any = {}) {
    this.log({
      action: '🧾 تقديم الطلب',
      location,
      orderId,
      details: { 
        ...details, 
        operation: 'ORDER_SUBMIT',
        itemsCount: items.length,
        items: items.map(item => ({
          productId: item.product?.id || item.productId,
          productName: item.product?.name || item.productName,
          quantity: item.quantity,
          colorId: item.colorId,
          sizeId: item.sizeId
        }))
      }
    });

    // إطلاق حدث إتمام الطلب للتحديث التلقائي
    if (details?.operation === 'ORDER_COMPLETED' || details?.orderStatus === 'completed') {
      const event = new CustomEvent('pos-order-completed', {
        detail: {
          orderId,
          total: details.total || 0,
          type: details.type || 'sale',
          customerOrderNumber: details.customerOrderNumber,
          timestamp: new Date().toISOString(),
          itemsCount: items.length
        }
      });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event);
        
        this.log({
          action: '🚀 حدث إتمام الطلب',
          location: `${location}.eventDispatch`,
          orderId,
          details: { 
            operation: 'ORDER_COMPLETION_EVENT_DISPATCHED',
            eventType: 'pos-order-completed',
            total: details.total || 0
          }
        });
      }
    }
  }

  logReturn(productId: string, productName: string, quantity: number, location: string, details: any = {}) {
    this.log({
      action: '↩️ إرجاع منتج',
      location,
      productId,
      productName,
      quantity,
      details: { ...details, operation: 'RETURN' }
    });

    // إطلاق حدث إتمام الإرجاع للتحديث التلقائي
    if (details?.operation === 'RETURN_COMPLETED' || details?.returnStatus === 'completed') {
      const event = new CustomEvent('pos-return-completed', {
        detail: {
          orderId: details.orderId || details.returnId,
          productId,
          productName,
          quantity,
          type: 'return',
          timestamp: new Date().toISOString()
        }
      });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event);
        
        this.log({
          action: '🚀 حدث إتمام الإرجاع',
          location: `${location}.eventDispatch`,
          productId,
          details: { 
            operation: 'RETURN_COMPLETION_EVENT_DISPATCHED',
            eventType: 'pos-return-completed',
            quantity
          }
        });
      }
    }
  }

  logCacheUpdate(productId: string, productName: string, location: string, details: any = {}) {
    this.log({
      action: '💾 تحديث الكاش',
      location,
      productId,
      productName,
      details: { ...details, operation: 'CACHE_UPDATE' }
    });
  }

  logServerSync(location: string, details: any = {}) {
    this.log({
      action: '🌐 مزامنة مع الخادم',
      location,
      details: { ...details, operation: 'SERVER_SYNC' }
    });
  }

  logError(error: string, location: string, details: any = {}) {
    this.log({
      action: '❌ خطأ',
      location,
      details: { ...details, error, operation: 'ERROR' }
    });
  }

  // دوال للحصول على التقارير
  getLogs(): InventoryLogEntry[] {
    return [...this.logs];
  }

  getLogsForProduct(productId: string): InventoryLogEntry[] {
    return this.logs.filter(log => log.productId === productId);
  }

  getLogsForOrder(orderId: string): InventoryLogEntry[] {
    return this.logs.filter(log => log.orderId === orderId);
  }

  getLogsInTimeRange(startTime: string, endTime: string): InventoryLogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  // تصدير السجلات
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // مسح السجلات
  clearLogs() {
    this.logs = [];
    console.log('🔍 [INVENTORY LOGGER] تم مسح جميع السجلات');
  }

  // طباعة ملخص
  printSummary() {
    const summary = {
      totalLogs: this.logs.length,
      timeRange: this.logs.length > 0 ? {
        start: this.logs[0].timestamp,
        end: this.logs[this.logs.length - 1].timestamp
      } : null,
      actionCounts: this.logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      locationCounts: this.logs.reduce((acc, log) => {
        acc[log.location] = (acc[log.location] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    console.group('🔍 [INVENTORY LOGGER] ملخص السجلات');
    console.log('📊 إجمالي السجلات:', summary.totalLogs);
    if (summary.timeRange) {
      console.log('⏰ النطاق الزمني:', {
        من: new Date(summary.timeRange.start).toLocaleString('ar-SA'),
        إلى: new Date(summary.timeRange.end).toLocaleString('ar-SA')
      });
    }
    console.log('🎯 الإجراءات:', summary.actionCounts);
    console.log('📍 المواقع:', summary.locationCounts);
    console.groupEnd();
  }
}

// إنشاء instance مفرد
export const inventoryLogger = new InventoryLogger();

// إضافة دوال مساعدة للاستخدام السهل
export const logInventoryAction = inventoryLogger.log.bind(inventoryLogger);
export const logProductAdd = inventoryLogger.logProductAdd.bind(inventoryLogger);
export const logProductRemove = inventoryLogger.logProductRemove.bind(inventoryLogger);
export const logStockUpdate = inventoryLogger.logStockUpdate.bind(inventoryLogger);
export const logOrderSubmit = inventoryLogger.logOrderSubmit.bind(inventoryLogger);
export const logReturn = inventoryLogger.logReturn.bind(inventoryLogger);
export const logCacheUpdate = inventoryLogger.logCacheUpdate.bind(inventoryLogger);
export const logServerSync = inventoryLogger.logServerSync.bind(inventoryLogger);
export const logError = inventoryLogger.logError.bind(inventoryLogger);

// تصدير دوال التحكم
export const enableInventoryLogging = inventoryLogger.enable.bind(inventoryLogger);
export const disableInventoryLogging = inventoryLogger.disable.bind(inventoryLogger);
export const clearInventoryLogs = inventoryLogger.clearLogs.bind(inventoryLogger);
export const printInventorySummary = inventoryLogger.printSummary.bind(inventoryLogger);
export const exportInventoryLogs = inventoryLogger.exportLogs.bind(inventoryLogger);

// تفعيل النظام بشكل افتراضي
inventoryLogger.enable();

console.log('🔍 [INVENTORY LOGGER] نظام مراقبة المخزون جاهز للاستخدام');
console.log('استخدم inventoryLogger في وحدة تحكم المطور للوصول لجميع الوظائف');

// إتاحة النظام عالمياً للاختبار
if (typeof window !== 'undefined') {
  (window as any).inventoryLogger = inventoryLogger;
} 