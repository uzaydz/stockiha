import { Product } from "@/types";
import { db } from "@/lib/db/indexedDB";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// تعريف واجهة المنتج المحلي مع إضافة خصائص إضافية للتزامن
interface LocalProduct extends Product {
  synced?: boolean;
}

/**
 * جلب المنتجات من قاعدة البيانات المحلية
 */
export async function getIndexDBProducts(): Promise<Product[]> {
  try {
    // محاولة الوصول إلى قاعدة البيانات المحلية أولاً
    const products = await db.products.toArray();
    
    return products;
  } catch (error) {
    toast.error("حدث خطأ أثناء جلب المنتجات");
    return [];
  }
}

/**
 * إضافة منتج جديد محلياً ثم مزامنته مع الخادم إذا كان متصلاً
 */
export async function addProduct(product: Omit<Product, "id" | "synced">): Promise<Product> {
  try {
    // إنشاء كائن المنتج مع علامة عدم المزامنة
    const newProduct: LocalProduct = {
      ...product,
      id: Date.now().toString(), // معرف محلي مؤقت
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // إضافة المنتج إلى قاعدة البيانات المحلية
    await db.products.add(newProduct as any);
    
    // مزامنة مع الخادم إذا كان متصلاً
    if (navigator.onLine) {
      try {
        const response = await fetchWithAuth(`${API_URL}/products`, {
          method: "POST",
          body: JSON.stringify(product),
        });
        
        if (response.ok) {
          const serverProduct = await response.json();
          
          // تحديث المنتج المحلي بالمعرف والبيانات من الخادم
          await db.products.update(newProduct.id, { 
            ...serverProduct,
            synced: true 
          } as any);
          
          return { ...serverProduct, synced: true } as Product;
        }
      } catch (error) {
      }
    }
    
    return newProduct as Product;
  } catch (error) {
    toast.error("حدث خطأ أثناء إضافة المنتج");
    throw error;
  }
}

/**
 * تحديث منتج محلياً ثم مزامنته مع الخادم إذا كان متصلاً
 */
export async function updateIndexDBProduct(id: string, product: Partial<Product>): Promise<Product> {
  try {
    // الحصول على المنتج الحالي
    const existingProduct = await db.products.get(id);
    
    if (!existingProduct) {
      throw new Error("المنتج غير موجود");
    }
    
    // تحديث المنتج محلياً
    const updatedProduct: LocalProduct = {
      ...existingProduct,
      ...product,
      synced: false,
      updatedAt: new Date(),
    };
    
    // تحويل الكائن قبل التحديث
    await db.products.update(id, { 
      ...updatedProduct,
      synced: false,
      updatedAt: new Date() 
    } as any);
    
    // مزامنة مع الخادم إذا كان متصلاً
    if (navigator.onLine) {
      try {
        const response = await fetchWithAuth(`${API_URL}/products/${id}`, {
          method: "PUT",
          body: JSON.stringify(product),
        });
        
        if (response.ok) {
          // تحديث حالة المزامنة
          await db.products.update(id, { synced: true } as any);
          return { ...updatedProduct, synced: true } as Product;
        }
      } catch (error) {
      }
    }
    
    return updatedProduct as Product;
  } catch (error) {
    toast.error("حدث خطأ أثناء تحديث المنتج");
    throw error;
  }
}

/**
 * حذف منتج محلياً ثم مزامنته مع الخادم إذا كان متصلاً
 */
export async function deleteIndexDBProduct(id: string): Promise<void> {
  try {
    // حذف المنتج من قاعدة البيانات المحلية
    await db.products.delete(id);
    
    // مزامنة مع الخادم إذا كان متصلاً
    if (navigator.onLine) {
      try {
        await fetchWithAuth(`${API_URL}/products/${id}`, {
          method: "DELETE",
        });
      } catch (error) {
        // إضافة المنتج إلى جدول الحذف المؤجل للمزامنة لاحقاً
        await db.deletedProducts.add({ id, deletedAt: new Date().toISOString() });
      }
    } else {
      // إضافة المنتج إلى جدول الحذف المؤجل للمزامنة لاحقاً
      await db.deletedProducts.add({ id, deletedAt: new Date().toISOString() });
    }
  } catch (error) {
    toast.error("حدث خطأ أثناء حذف المنتج");
    throw error;
  }
}

/**
 * مزامنة جميع المنتجات غير المتزامنة مع الخادم
 */
export async function syncIndexDBProducts(): Promise<{ success: boolean; syncedCount: number }> {
  if (!navigator.onLine) {
    toast.error("لا يمكن المزامنة، أنت غير متصل بالإنترنت");
    return { success: false, syncedCount: 0 };
  }
  
  try {
    // الحصول على المنتجات غير المتزامنة
    const unsyncedProducts = await db.products
      .filter(product => !(product as any).synced)
      .toArray();
    
    // الحصول على المنتجات المحذوفة غير المتزامنة
    const deletedProducts = await db.deletedProducts.toArray();
    
    let syncedCount = 0;
    
    // مزامنة التحديثات والإضافات
    for (const product of unsyncedProducts) {
      try {
        // تحقق مما إذا كان المنتج له معرف من الخادم
        const hasServerID = !product.id.toString().startsWith("temp_");
        
        if (hasServerID) {
          // تحديث منتج موجود
          const response = await fetchWithAuth(`${API_URL}/products/${product.id}`, {
            method: "PUT",
            body: JSON.stringify(product),
          });
          
          if (response.ok) {
            await db.products.update(product.id, { synced: true } as any);
            syncedCount++;
          }
        } else {
          // إضافة منتج جديد
          const response = await fetchWithAuth(`${API_URL}/products`, {
            method: "POST",
            body: JSON.stringify(product),
          });
          
          if (response.ok) {
            const serverProduct = await response.json();
            
            // حذف المنتج المحلي القديم
            await db.products.delete(product.id);
            
            // إضافة المنتج بالمعرف الجديد من الخادم
            await db.products.add({
              ...serverProduct,
              synced: true,
            } as any);
            
            syncedCount++;
          }
        }
      } catch (error) {
      }
    }
    
    // مزامنة الحذوفات
    for (const item of deletedProducts) {
      try {
        await fetchWithAuth(`${API_URL}/products/${item.id}`, {
          method: "DELETE",
        });
        
        // حذف من جدول المنتجات المحذوفة بعد المزامنة
        await db.deletedProducts.delete(item.id);
        syncedCount++;
      } catch (error) {
      }
    }
    
    if (syncedCount > 0) {
      toast.success(`تمت مزامنة ${syncedCount} من المنتجات بنجاح`);
    } else {
      toast.info("لم يتم العثور على منتجات للمزامنة");
    }
    
    return { success: true, syncedCount };
  } catch (error) {
    toast.error("حدث خطأ أثناء مزامنة المنتجات");
    return { success: false, syncedCount: 0 };
  }
}

/**
 * الحصول على عدد المنتجات غير المتزامنة
 */
export async function getUnsyncedProductsCount(): Promise<number> {
  try {
    // عدد المنتجات غير المتزامنة
    const unsyncedProducts = await db.products
      .filter(product => !(product as any).synced)
      .count();
    
    // عدد المنتجات المحذوفة غير المتزامنة
    const deletedProducts = await db.deletedProducts.count();
    
    // إجمالي العناصر التي تحتاج إلى مزامنة
    return unsyncedProducts + deletedProducts;
  } catch (error) {
    return 0;
  }
}

/**
 * توليد رمز SKU محلياً للمنتجات في وضع عدم الاتصال
 */
export function generateLocalSku(
  categoryShortName: string = 'PR',
  brandShortName: string = ''
): string {
  try {
    // تنظيف وتوحيد رمز الفئة
    const cleanCategoryCode = categoryShortName ? categoryShortName.toUpperCase().substring(0, 2) : 'PR';
    
    // تنظيف وتوحيد رمز الماركة
    let brandCode = '';
    if (brandShortName && brandShortName.trim() !== '') {
      brandCode = '-' + brandShortName.toUpperCase().substring(0, 2);
    }
    
    // استخدام السنة الحالية كجزء من الرمز
    const yearCode = new Date().getFullYear().toString().substring(2);
    
    // إنشاء رقم عشوائي مكون من 4 أرقام
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // إنشاء طابع زمني فريد
    const timestamp = Date.now().toString(36).toUpperCase().substring(0, 4);
    
    // تكوين SKU النهائي: [رمز الفئة][رمز الماركة]-[السنة]-[رقم عشوائي]-[طابع زمني]
    return `${cleanCategoryCode}${brandCode}-${yearCode}-${randomNum}-${timestamp}`;
  } catch (error) {
    
    // إرجاع قيمة افتراضية في حالة الخطأ
    const timestamp = Date.now().toString(36).toUpperCase().substring(0, 6);
    return `SKU-${timestamp}`;
  }
}

/**
 * توليد باركود EAN-13 محلياً للمنتجات في وضع عدم الاتصال
 */
export function generateLocalEAN13(): string {
  try {
    // بادئة الباركود (يمكن تغييرها)
    const prefix = '200';
    
    // توليد 9 أرقام عشوائية
    const body = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    
    // تكوين مصفوفة أرقام من الـ 12 رقم الأولى
    const digits = (prefix + body).split('').map(Number);
    
    // حساب رقم التحقق باستخدام خوارزمية EAN-13
    let oddSum = 0;
    let evenSum = 0;
    
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) {
        oddSum += digits[i];
      } else {
        evenSum += digits[i];
      }
    }
    
    // حساب رقم التحقق
    const checkDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
    
    // إرجاع الباركود كاملاً
    return prefix + body + checkDigit.toString();
  } catch (error) {
    
    // إرجاع قيمة افتراضية في حالة الخطأ
    const timestamp = Date.now().toString().substring(0, 12);
    return timestamp.padEnd(13, '0');
  }
}

/**
 * توليد باركود للمتغير (الألوان) محلياً
 */
export function generateLocalVariantBarcode(productBarcode: string): string {
  try {
    if (!productBarcode) {
      // إذا لم يكن للمنتج باركود، قم بإنشاء باركود جديد
      const newBarcode = generateLocalEAN13();
      const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      return `${newBarcode}-${suffix}`;
    }
    
    // إضافة لاحقة عشوائية إلى الباركود الحالي
    const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${productBarcode}-${suffix}`;
  } catch (error) {
    
    // إرجاع قيمة افتراضية في حالة الخطأ
    const timestamp = Date.now().toString().substring(8);
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `VAR-${timestamp}-${randomSuffix}`;
  }
}

/**
 * التحقق من صحة باركود EAN-13 محلياً
 */
export function validateLocalEAN13(barcode: string): boolean {
  // التحقق من أن الباركود مكون من 13 رقمًا فقط
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }
  
  // تحويل النص إلى مصفوفة أرقام
  const digits = barcode.split('').map(Number);
  
  // الحصول على رقم التحقق
  const checkDigit = digits.pop();
  
  // حساب رقم التحقق المتوقع
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < digits.length; i++) {
    if (i % 2 === 0) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }
  
  const calculatedCheckDigit = (10 - ((oddSum + evenSum * 3) % 10)) % 10;
  
  // التحقق من تطابق رقم التحقق
  return checkDigit === calculatedCheckDigit;
}
