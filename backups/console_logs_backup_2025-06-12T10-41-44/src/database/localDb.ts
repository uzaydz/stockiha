import localforage from 'localforage';
import { Product } from '@/api/productService';
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// تكوين قواعد البيانات المحلية
export const productsForageInstance = localforage.createInstance({
  name: 'bazaar-products',
  storeName: 'products'
});

export const categoriesStore = localforage.createInstance({
  name: 'bazaar-products',
  storeName: 'categories'
});

export const inventoryLogsStore = localforage.createInstance({
  name: 'bazaar-products',
  storeName: 'inventory-logs'
});

export const syncQueueForageInstance = localforage.createInstance({
  name: 'bazaar-sync',
  storeName: 'sync-queue'
});

// نموذج المنتج الموسع بإضافة حالة المزامنة
export interface LocalProduct extends Product {
  synced: boolean;
  syncStatus?: 'pending' | 'error';
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
  conflictResolution?: 'local' | 'remote' | 'merge';
}

// نموذج عنصر قائمة المزامنة
export interface SyncQueueItem {
  id: string;
  objectType: 'product' | 'inventory' | 'customer' | 'address' | 'order';
  objectId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
  priority: number; // 1: عالي، 2: متوسط، 3: منخفض
}

// تعريف واجهة التحديث المحلي للمخزون
export interface InventoryTransaction {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  reason: string;
  notes?: string;
  source_id?: string;
  timestamp: Date;
  synced: boolean;
  created_by: string;
}

// تعريف واجهة عنصر المخزون
export interface InventoryItem {
  id?: string;
  product_id: string;
  variant_id: string | null;
  stock_quantity: number;
  last_updated: Date;
  synced: boolean;
}

// تعريف واجهة بيانات العميل المحلي
export interface LocalCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  // حقول التزامن
  synced: boolean;
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف واجهة بيانات عنوان العميل
export interface LocalAddress {
  id: string;
  customer_id: string;
  name: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  organization_id: string;
  // حقول التزامن
  synced: boolean;
  syncStatus?: string;
  lastSyncAttempt?: string;
  localUpdatedAt: string;
  pendingOperation?: 'create' | 'update' | 'delete';
}

// تعريف فئة قاعدة البيانات المحلية
export class LocalDatabase extends Dexie {
  // تعريف الجداول
  products: Dexie.Table<LocalProduct, string>;
  inventory: Dexie.Table<InventoryItem, string>;
  transactions: Dexie.Table<InventoryTransaction, string>;
  syncQueue: Dexie.Table<SyncQueueItem, string>;
  customers: Dexie.Table<LocalCustomer, string>;
  addresses: Dexie.Table<LocalAddress, string>;

  constructor() {
    super('bazaarDB_v2');
    
    // تعريف مخطط قاعدة البيانات
    this.version(1).stores({
      products: 'id, name, sku, category, organization_id, synced, pendingOperation',
      inventory: 'id, product_id, variant_id, synced',
      transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by',
      syncQueue: 'id, objectType, objectId, operation, priority, createdAt',
      customers: 'id, name, email, phone, organization_id, synced, pendingOperation', 
      addresses: 'id, customer_id, organization_id, is_default, synced, pendingOperation'
    });
    
    // تعريف الجداول بأنواعها
    this.products = this.table('products');
    this.inventory = this.table('inventory');
    this.transactions = this.table('transactions');
    this.syncQueue = this.table('syncQueue');
    this.customers = this.table('customers');
    this.addresses = this.table('addresses');
  }
}

// إنشاء نسخة فردية من قاعدة البيانات
export const inventoryDB = new LocalDatabase();

// المخازن المستخدمة للتعامل مع الكائنات المختلفة
export const productsStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.products.get(id) as unknown as T;
  },
  
  async setItem(id: string, value: LocalProduct): Promise<string> {
    await inventoryDB.products.put(value);
    return id;
  },
  
  async removeItem(id: string): Promise<void> {
    await inventoryDB.products.delete(id);
  },
  
  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    await inventoryDB.products.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
    });
  },
  
  // وظائف إضافية لدعم عمليات localforage
  async keys(): Promise<string[]> {
    return await productsForageInstance.keys();
  },
  
  async length(): Promise<number> {
    return await productsForageInstance.length();
  },
  
  async clear(): Promise<void> {
    return await productsForageInstance.clear();
  }
};

export const syncQueueStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.syncQueue.get(id) as unknown as T;
  },
  
  async setItem(id: string, value: SyncQueueItem): Promise<string> {
    await inventoryDB.syncQueue.put(value);
    return id;
  },
  
  async removeItem(id: string): Promise<void> {
    await inventoryDB.syncQueue.delete(id);
  },
  
  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    await inventoryDB.syncQueue.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
    });
  },
  
  // وظائف إضافية لدعم عمليات localforage
  async keys(): Promise<string[]> {
    return await syncQueueForageInstance.keys();
  },
  
  async length(): Promise<number> {
    return await syncQueueForageInstance.length();
  },
  
  async clear(): Promise<void> {
    return await syncQueueForageInstance.clear();
  }
};

// إضافة مخازن جديدة للعملاء والعناوين
export const customersStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.customers.get(id) as unknown as T;
  },
  
  async setItem(id: string, value: LocalCustomer): Promise<string> {
    await inventoryDB.customers.put(value);
    return id;
  },
  
  async removeItem(id: string): Promise<void> {
    await inventoryDB.customers.delete(id);
  },
  
  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    await inventoryDB.customers.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
    });
  }
};

export const addressesStore = {
  async getItem<T>(id: string): Promise<T | null> {
    return await inventoryDB.addresses.get(id) as unknown as T;
  },
  
  async setItem(id: string, value: LocalAddress): Promise<string> {
    await inventoryDB.addresses.put(value);
    return id;
  },
  
  async removeItem(id: string): Promise<void> {
    await inventoryDB.addresses.delete(id);
  },
  
  async iterate<T, U>(callback: (item: T, key: string) => U | void): Promise<void> {
    await inventoryDB.addresses.each((item, cursor) => {
      callback(item as unknown as T, cursor.primaryKey.toString());
    });
  }
};

// استيراد في بداية تشغيل التطبيق
export async function hydrateLocalDB() {
  try {
    // التحقق مما إذا كان التخزين المحلي فارغًا
    const keys = await productsForageInstance.keys();
    
    if (keys.length === 0) {
      
      // يمكن تنفيذ منطق لتعبئة التخزين المحلي هنا إذا لزم الأمر
    } else {
      
    }
  } catch (error) {
  }
}
