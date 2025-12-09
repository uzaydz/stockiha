/**
 * ⚡ دليل اختبار الـ Offline-First
 * 
 * هذا الملف يحتوي على دوال اختبار يدوية يمكن تشغيلها من Console
 * لاختبار سيناريوهات العمل بدون اتصال
 */

import { unifiedProductService } from '@/services/UnifiedProductService';
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import { unifiedCustomerService } from '@/services/UnifiedCustomerService';
import { unifiedExpenseService } from '@/services/UnifiedExpenseService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { printDiagnosticsReport } from '@/lib/powersync/PowerSyncDiagnostics';

// ========================================
// 🧪 سيناريوهات الاختبار
// ========================================

/**
 * 1️⃣ اختبار إنشاء منتج بدون اتصال
 */
export async function testCreateProductOffline() {
  console.log('🧪 [Test] Creating product offline...');
  
  const product = await unifiedProductService.createProduct({
    name: `منتج اختبار ${Date.now()}`,
    price: 1500,
    stock_quantity: 10,
    sku: `TEST-${Date.now()}`,
    is_active: true
  });
  
  console.log('✅ Product created:', product);
  return product;
}

/**
 * 2️⃣ اختبار إنشاء طلب POS بدون اتصال
 */
export async function testCreatePOSOrderOffline() {
  console.log('🧪 [Test] Creating POS order offline...');
  
  // جلب منتج للاختبار
  const products = await unifiedProductService.getProducts({}, 1, 1);
  if (products.data.length === 0) {
    console.warn('⚠️ No products found. Create a product first.');
    return null;
  }
  
  const product = products.data[0];
  
  const order = await unifiedOrderService.createPOSOrder({
    items: [{
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price
    }],
    payment_method: 'cash',
    amount_paid: product.price,
    staff_name: 'اختبار',
    pos_order_type: 'retail'
  });
  
  console.log('✅ POS Order created:', order);
  return order;
}

/**
 * 3️⃣ اختبار إنشاء عميل بدون اتصال
 */
export async function testCreateCustomerOffline() {
  console.log('🧪 [Test] Creating customer offline...');
  
  const customer = await unifiedCustomerService.createCustomer({
    name: `عميل اختبار ${Date.now()}`,
    phone: `0${Math.floor(Math.random() * 1000000000)}`,
    email: `test${Date.now()}@test.com`
  });
  
  console.log('✅ Customer created:', customer);
  return customer;
}

/**
 * 4️⃣ اختبار إنشاء مصروف بدون اتصال
 */
export async function testCreateExpenseOffline() {
  console.log('🧪 [Test] Creating expense offline...');
  
  const expense = await unifiedExpenseService.createExpense({
    title: `مصروف اختبار ${Date.now()}`,
    amount: 500,
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    category: 'اختبار'
  });
  
  console.log('✅ Expense created:', expense);
  return expense;
}

/**
 * 5️⃣ اختبار البحث المحلي
 */
export async function testLocalSearch(query: string = 'منتج') {
  console.log(`🧪 [Test] Searching locally for: "${query}"`);
  
  const startTime = performance.now();
  
  const [products, customers] = await Promise.all([
    unifiedProductService.searchProducts(query),
    unifiedCustomerService.searchCustomers(query)
  ]);
  
  const duration = performance.now() - startTime;
  
  console.log(`✅ Search completed in ${duration.toFixed(2)}ms`);
  console.log(`   - Products found: ${products.length}`);
  console.log(`   - Customers found: ${customers.length}`);
  
  return { products, customers, duration };
}

/**
 * 6️⃣ اختبار الإحصائيات المحلية
 */
export async function testLocalStats() {
  console.log('🧪 [Test] Getting local statistics...');
  
  const startTime = performance.now();
  
  const [productStats, orderStats, customerStats, expenseStats] = await Promise.all([
    unifiedProductService.getProductStats(),
    unifiedOrderService.getTodayStats(),
    unifiedCustomerService.getCustomerStats(),
    unifiedExpenseService.getCurrentMonthStats()
  ]);
  
  const duration = performance.now() - startTime;
  
  console.log(`✅ Stats retrieved in ${duration.toFixed(2)}ms`);
  console.log('📦 Products:', productStats);
  console.log('📋 Orders:', orderStats);
  console.log('👥 Customers:', customerStats);
  console.log('💰 Expenses:', expenseStats);
  
  return { productStats, orderStats, customerStats, expenseStats, duration };
}

/**
 * 7️⃣ اختبار شامل - محاكاة يوم عمل كامل
 */
export async function testFullWorkdaySimulation() {
  console.log('🧪 [Test] Starting full workday simulation...');
  console.log('=' .repeat(50));
  
  const results: Record<string, any> = {};
  
  // 1. إنشاء عميل جديد
  console.log('\n📝 Step 1: Creating new customer...');
  results.customer = await testCreateCustomerOffline();
  
  // 2. إنشاء منتج جديد
  console.log('\n📝 Step 2: Creating new product...');
  results.product = await testCreateProductOffline();
  
  // 3. إنشاء 3 طلبات
  console.log('\n📝 Step 3: Creating 3 POS orders...');
  results.orders = [];
  for (let i = 0; i < 3; i++) {
    const order = await testCreatePOSOrderOffline();
    if (order) results.orders.push(order);
  }
  
  // 4. إنشاء مصروف
  console.log('\n📝 Step 4: Creating expense...');
  results.expense = await testCreateExpenseOffline();
  
  // 5. جلب الإحصائيات
  console.log('\n📝 Step 5: Getting final statistics...');
  results.stats = await testLocalStats();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Workday simulation completed!');
  console.log('📊 Summary:', {
    customersCreated: 1,
    productsCreated: 1,
    ordersCreated: results.orders.length,
    expensesCreated: 1
  });
  
  return results;
}

/**
 * 8️⃣ اختبار المزامنة بعد العودة للاتصال
 */
export async function testSyncAfterReconnect() {
  console.log('🧪 [Test] Testing sync after reconnect...');
  
  // التحقق من العمليات المعلقة
  const hasPending = await powerSyncService.hasPendingUploads();
  const pendingCount = await powerSyncService.getPendingUploadCount();
  
  console.log(`📤 Pending uploads: ${pendingCount}`);
  
  if (hasPending) {
    console.log('🔄 Forcing sync...');
    await powerSyncService.forceSync();
    console.log('✅ Sync completed!');
    
    const newPendingCount = await powerSyncService.getPendingUploadCount();
    console.log(`📤 Remaining pending uploads: ${newPendingCount}`);
  } else {
    console.log('✅ No pending uploads');
  }
}

/**
 * 9️⃣ تشغيل التشخيص الشامل
 */
export async function runDiagnostics() {
  console.log('🧪 [Test] Running full diagnostics...');
  await printDiagnosticsReport();
}

/**
 * 🔟 اختبار الأداء
 */
export async function testPerformance() {
  console.log('🧪 [Test] Running performance tests...');
  console.log('=' .repeat(50));
  
  const tests = [
    {
      name: 'Fetch 100 products',
      fn: () => unifiedProductService.getProducts({}, 1, 100)
    },
    {
      name: 'Fetch 100 orders',
      fn: () => unifiedOrderService.getOrders({}, 1, 100)
    },
    {
      name: 'Search products',
      fn: () => unifiedProductService.searchProducts('test')
    },
    {
      name: 'Get product stats',
      fn: () => unifiedProductService.getProductStats()
    },
    {
      name: 'Get order stats',
      fn: () => unifiedOrderService.getTodayStats()
    }
  ];
  
  const results: Array<{ name: string; duration: number }> = [];
  
  for (const test of tests) {
    const start = performance.now();
    await test.fn();
    const duration = performance.now() - start;
    results.push({ name: test.name, duration });
    console.log(`⏱️ ${test.name}: ${duration.toFixed(2)}ms`);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Performance Summary:');
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`   Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`   Fastest: ${Math.min(...results.map(r => r.duration)).toFixed(2)}ms`);
  console.log(`   Slowest: ${Math.max(...results.map(r => r.duration)).toFixed(2)}ms`);
  
  return results;
}

// ========================================
// 🎮 تصدير للاستخدام في Console
// ========================================

if (typeof window !== 'undefined') {
  (window as any).__OFFLINE_TESTS__ = {
    testCreateProductOffline,
    testCreatePOSOrderOffline,
    testCreateCustomerOffline,
    testCreateExpenseOffline,
    testLocalSearch,
    testLocalStats,
    testFullWorkdaySimulation,
    testSyncAfterReconnect,
    runDiagnostics,
    testPerformance
  };
  
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🧪 Offline Testing Tools Loaded!                    ║
╠══════════════════════════════════════════════════════════════╣
║ Available commands:                                           ║
║                                                               ║
║  __OFFLINE_TESTS__.testCreateProductOffline()                ║
║  __OFFLINE_TESTS__.testCreatePOSOrderOffline()               ║
║  __OFFLINE_TESTS__.testCreateCustomerOffline()               ║
║  __OFFLINE_TESTS__.testCreateExpenseOffline()                ║
║  __OFFLINE_TESTS__.testLocalSearch('query')                  ║
║  __OFFLINE_TESTS__.testLocalStats()                          ║
║  __OFFLINE_TESTS__.testFullWorkdaySimulation()               ║
║  __OFFLINE_TESTS__.testSyncAfterReconnect()                  ║
║  __OFFLINE_TESTS__.runDiagnostics()                          ║
║  __OFFLINE_TESTS__.testPerformance()                         ║
╚══════════════════════════════════════════════════════════════╝
`);
}

export default {
  testCreateProductOffline,
  testCreatePOSOrderOffline,
  testCreateCustomerOffline,
  testCreateExpenseOffline,
  testLocalSearch,
  testLocalStats,
  testFullWorkdaySimulation,
  testSyncAfterReconnect,
  runDiagnostics,
  testPerformance
};

