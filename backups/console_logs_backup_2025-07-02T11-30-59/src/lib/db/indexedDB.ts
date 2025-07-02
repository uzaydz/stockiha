import { Dexie, type Table } from 'dexie';
import { Product } from '@/types';

// تعريف نوع المنتجات المحذوفة
export interface DeletedProduct {
  id: string;
  deletedAt: string;
}

// إنشاء فئة قاعدة البيانات
export class BazaarDB extends Dexie {
  products!: Table<Product>;
  deletedProducts!: Table<DeletedProduct>;

  constructor() {
    super('bazaarDB');
    
    // تعريف المخططات
    this.version(1).stores({
      products: 'id, name, price, category, synced',
      deletedProducts: 'id, deletedAt'
    });
  }
}

// إنشاء نسخة واحدة من قاعدة البيانات
export const db = new BazaarDB();
