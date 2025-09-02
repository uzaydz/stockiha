// IndexedDB DISABLED - تم تعطيل نظام IndexedDB لتوفير مساحة التخزين
import type { Table } from 'dexie';
// import { Product } from '@/types';

// تعريف نوع المنتجات المحذوفة
export interface DeletedProduct {
  id: string;
  deletedAt: string;
}

// DISABLED: IndexedDB system to reduce storage usage
// export class BazaarDB extends Dexie {
//   products!: Table<Product>;
//   deletedProducts!: Table<DeletedProduct>;

//   constructor() {
//     super('bazaarDB');
    
//     // تعريف المخططات
//     this.version(1).stores({
//       products: 'id, name, price, category, synced',
//       deletedProducts: 'id, deletedAt'
//     });
//   }
// }

// إنشاء نسخة واحدة من قاعدة البيانات
// export const db = new BazaarDB();

// Mock database for compatibility
export const db = {
  products: {
    toArray: () => Promise.resolve([]),
    add: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    get: () => Promise.resolve(null),
    filter: () => ({ toArray: () => Promise.resolve([]) })
  },
  deletedProducts: {
    toArray: () => Promise.resolve([]),
    add: () => Promise.resolve()
  }
};
