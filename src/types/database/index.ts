export { Json } from './base';
export * from './core';
export * from './products';
export * from './orders';
export * from './customers';
export * from './payments';
export * from './inventory';
export * from './shipping';
export * from './marketing';
export * from './analytics';
export * from './subscriptions';
export * from './apps';
export * from './system';

// 🔄 إعادة إنشاء نوع Database الأصلي للتوافق مع الكود الموجود
export type Database = {
  public: {
    Tables: CoreTables & ProductsTables & OrdersTables & CustomersTables & PaymentsTables & InventoryTables & ShippingTables & MarketingTables & AnalyticsTables & SubscriptionsTables & AppsTables & SystemTables;
  };
};

// 📈 إحصائيات التقسيم
export const tableStatistics = {
  core: 11,
  products: 12,
  orders: 10,
  customers: 5,
  payments: 10,
  inventory: 9,
  shipping: 14,
  marketing: 9,
  analytics: 6,
  subscriptions: 7,
  apps: 15,
  system: 18
};

export const totalTables = 126;

