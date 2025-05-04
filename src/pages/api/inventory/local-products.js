/**
 * نقطة نهاية API لجلب بيانات المنتجات من التخزين المحلي
 * تستخدم هذه الدالة عندما يكون المستخدم في وضع عدم الاتصال
 */
export default async function handler(req, res) {
  // تعيين رؤوس CORS للسماح بالوصول
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  // خدمة طلبات OPTIONS مباشرة (مهم للـ CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // فقط طلبات GET مسموح بها
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // استيراد وحدة inventoryDB لجلب البيانات المحلية
    const inventoryDB = await import('@/lib/db/inventoryDB');
    
    // جلب جميع عناصر المخزون من قاعدة البيانات المحلية
    const inventory = await inventoryDB.inventoryDB.inventory.toArray();
    
    // تحويل البيانات من صيغة المخزون إلى صيغة المنتج (صيغة مبسطة)
    const products = inventory.map(item => ({
      id: item.product_id,
      name: item.product_name || 'منتج غير معروف',
      stock_quantity: item.stock_quantity,
      last_updated: item.last_updated,
      // إضافة حقول أخرى مطلوبة
      category: item.category || 'غير مصنف',
      sku: item.sku || 'SKU غير متوفر',
      min_stock_level: item.min_stock_level || 5,
      reorder_level: item.reorder_level || 10,
      reorder_quantity: item.reorder_quantity || 20,
      updatedAt: item.last_updated,
      createdAt: item.last_updated,
      images: [],
      thumbnailImage: ''
    }));
    
    // إرجاع البيانات المجمعة
    return res.status(200).json(products);
  } catch (error) {
    console.error('خطأ في استرجاع بيانات المنتجات المحلية:', error);
    return res.status(500).json({ 
      error: 'حدث خطأ في استرجاع البيانات المحلية',
      message: error.message 
    });
  }
} 