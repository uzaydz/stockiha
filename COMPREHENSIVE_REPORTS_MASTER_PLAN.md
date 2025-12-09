# 📊 الخطة الشاملة النهائية - لوحة التقارير الشاملة
## 100% Offline - PowerSync Local Database

---

# 📋 الفهرس
1. [تحليل قاعدة البيانات](#-تحليل-قاعدة-البيانات)
2. [أنواع المنتجات والحسابات](#-أنواع-المنتجات-والحسابات)
3. [معادلات الحسابات الكاملة](#-معادلات-الحسابات-الكاملة)
4. [هيكل المكونات](#-هيكل-المكونات)
5. [تفاصيل كل مكون](#-تفاصيل-كل-مكون)
6. [خطة التنفيذ](#-خطة-التنفيذ)

---

# 📊 تحليل قاعدة البيانات

## الجداول المتاحة (53 جدول)

### جداول المنتجات (9 جداول)
| الجدول | الوصف | الحقول الرئيسية للتقارير |
|--------|-------|--------------------------|
| `products` | المنتجات | price, purchase_price, stock_quantity, available_weight, available_length, available_boxes |
| `product_colors` | الألوان | quantity, price, purchase_price |
| `product_sizes` | المقاسات | quantity, price, purchase_price |
| `product_categories` | الفئات | name, type |
| `product_wholesale_tiers` | مستويات الجملة | min_quantity, price_per_unit |
| `inventory_batches` | الدفعات | quantity_received, quantity_remaining, purchase_price, expiry_date |
| `product_serial_numbers` | الأرقام التسلسلية | status, purchase_price, sold_price |

### جداول الطلبات (2 جداول)
| الجدول | الوصف | الحقول الرئيسية للتقارير |
|--------|-------|--------------------------|
| `orders` | الطلبات | total, subtotal, tax, discount, payment_method, payment_status, amount_paid, remaining_amount |
| `order_items` | عناصر الطلب | quantity, unit_price, total_price, sale_type, weight_sold, meters_sold, boxes_sold |

### جداول المشتريات (6 جداول)
| الجدول | الوصف | الحقول الرئيسية للتقارير |
|--------|-------|--------------------------|
| `supplier_purchases` | المشتريات | total_amount, paid_amount, balance_due, items_count |
| `supplier_purchase_items` | عناصر المشتريات | quantity, unit_price, total_cost |
| `supplier_payments` | مدفوعات الموردين | amount, payment_method |
| `purchase_landed_costs` | تكاليف إضافية | amount, cost_type |

### جداول المالية (4 جداول)
| الجدول | الوصف | الحقول الرئيسية للتقارير |
|--------|-------|--------------------------|
| `expenses` | المصاريف | amount, category, expense_date |
| `expense_categories` | فئات المصاريف | name, color |
| `customer_debts` | ديون العملاء | total_amount, paid_amount, remaining_amount |
| `invoices` | الفواتير | total_amount, tax_amount, discount_amount |

### جداول الإرجاعات والخسائر (4 جداول)
| الجدول | الوصف | الحقول الرئيسية للتقارير |
|--------|-------|--------------------------|
| `returns` | الإرجاعات | return_amount, refund_amount, restocking_fee |
| `return_items` | عناصر الإرجاع | return_quantity, total_return_amount |
| `losses` | الخسائر | total_cost_value, total_selling_value, loss_type |
| `loss_items` | عناصر الخسائر | lost_quantity, unit_cost_price, unit_selling_price |

### جداول الخدمات (5 جداول)
| الجدول | الوصف | الحقول الرئيسية للتقارير |
|--------|-------|--------------------------|
| `repair_orders` | طلبات الإصلاح | total_price, paid_amount, status |
| `subscription_transactions` | معاملات الاشتراكات | amount, cost, profit |
| `staff_work_sessions` | جلسات العمل | total_sales, cash_sales, card_sales |

---

# 🏷️ أنواع المنتجات والحسابات

## 1. أنواع البيع المتقدمة

### أ. البيع بالقطعة (Piece)
```typescript
// الحساب البسيط
سعر_البيع = product.price
سعر_الشراء = product.purchase_price
الربح_لكل_قطعة = سعر_البيع - سعر_الشراء
هامش_الربح% = (الربح_لكل_قطعة / سعر_البيع) * 100

// مع المتغيرات (ألوان/مقاسات)
سعر_البيع = color.price || size.price || product.price
سعر_الشراء = color.purchase_price || size.purchase_price || product.purchase_price
```

### ب. البيع بالوزن (Weight)
```typescript
// حقول المنتج
product.sell_by_weight = true
product.weight_unit = 'kg' | 'g' | 'lb' | 'oz'
product.price_per_weight_unit = السعر لكل وحدة وزن
product.available_weight = الوزن المتاح للبيع
product.total_weight_purchased = إجمالي الوزن المشترى

// حساب البيع
الوزن_المباع = order_item.weight_sold
السعر_للوحدة = order_item.price_per_weight_unit
إجمالي_البيع = الوزن_المباع × السعر_للوحدة

// حساب المخزون
المخزون_المتبقي = available_weight - الوزن_المباع

// حساب رأس المال
رأس_المال_بالوزن = available_weight × purchase_price_per_weight_unit
```

### ج. البيع بالمتر (Meter)
```typescript
// حقول المنتج
product.sell_by_meter = true
product.meter_unit = 'm' | 'cm' | 'ft' | 'inch'
product.price_per_meter = السعر لكل متر
product.available_length = الأمتار المتاحة
product.total_meters_purchased = إجمالي الأمتار المشتراة

// حساب البيع
الأمتار_المباعة = order_item.meters_sold
السعر_للمتر = order_item.price_per_meter
إجمالي_البيع = الأمتار_المباعة × السعر_للمتر

// حساب رأس المال
رأس_المال_بالأمتار = available_length × purchase_price_per_meter
```

### د. البيع بالعلبة/الكرتون (Box)
```typescript
// حقول المنتج
product.sell_by_box = true
product.units_per_box = عدد الوحدات في الصندوق
product.box_price = سعر الصندوق
product.available_boxes = عدد الصناديق المتاحة

// حساب البيع
عدد_الصناديق_المباعة = order_item.boxes_sold
سعر_الصندوق = order_item.box_price
إجمالي_البيع = عدد_الصناديق × سعر_الصندوق

// أو بيع وحدات من صندوق
الوحدات_المباعة = order_item.quantity
سعر_الوحدة = product.price
إجمالي_البيع = الوحدات_المباعة × سعر_الوحدة

// حساب رأس المال
رأس_المال_بالصناديق = available_boxes × box_purchase_price
```

## 2. أنواع البيع حسب العميل

### أ. بيع التجزئة (Retail)
```typescript
order_item.sale_type = 'retail'
السعر = product.price
الشرط: product.allow_retail = true
```

### ب. بيع الجملة (Wholesale)
```typescript
order_item.sale_type = 'wholesale'
السعر = product.wholesale_price
الشرط:
  - product.allow_wholesale = true
  - الكمية >= product.min_wholesale_quantity

// مستويات الجملة
wholesale_tiers.forEach(tier => {
  if (الكمية >= tier.min_quantity) {
    السعر = tier.price_per_unit
  }
})
```

### ج. بيع نصف الجملة (Partial Wholesale)
```typescript
order_item.sale_type = 'partial_wholesale'
السعر = product.partial_wholesale_price
الشرط:
  - product.allow_partial_wholesale = true
  - الكمية >= product.min_partial_wholesale_quantity
```

---

# 🔢 معادلات الحسابات الكاملة

## 1. حسابات المبيعات

### إجمالي المبيعات
```sql
SELECT
  SUM(total) as total_sales,
  SUM(subtotal) as subtotal,
  SUM(tax) as total_tax,
  SUM(discount) as total_discount,
  COUNT(*) as orders_count,
  AVG(total) as average_order_value
FROM orders
WHERE organization_id = ?
  AND status NOT IN ('cancelled', 'refunded')
  AND created_at BETWEEN ? AND ?
```

### المبيعات حسب نوع البيع
```sql
SELECT
  oi.sale_type,
  SUM(oi.total_price) as total,
  COUNT(DISTINCT o.id) as orders_count
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.organization_id = ?
  AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY oi.sale_type
```

### المبيعات حسب وحدة البيع
```sql
SELECT
  CASE
    WHEN oi.weight_sold > 0 THEN 'weight'
    WHEN oi.meters_sold > 0 THEN 'meter'
    WHEN oi.boxes_sold > 0 THEN 'box'
    ELSE 'piece'
  END as selling_unit,
  SUM(oi.total_price) as total,
  COUNT(*) as items_count
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.organization_id = ?
GROUP BY selling_unit
```

## 2. حسابات الأرباح

### الربح الإجمالي
```typescript
// لكل عنصر في الطلب
const calculateItemProfit = (item: OrderItem, product: Product) => {
  let costPrice = 0;
  let sellingPrice = item.total_price;

  // حسب وحدة البيع
  if (item.weight_sold > 0) {
    // البيع بالوزن
    costPrice = item.weight_sold * (product.purchase_price_per_weight_unit || 0);
  } else if (item.meters_sold > 0) {
    // البيع بالمتر
    costPrice = item.meters_sold * (product.purchase_price_per_meter || 0);
  } else if (item.boxes_sold > 0) {
    // البيع بالصندوق
    costPrice = item.boxes_sold * (product.box_purchase_price || 0);
  } else {
    // البيع بالقطعة
    // مع مراعاة المتغيرات
    if (item.color_id && item.size_id) {
      const size = getSize(item.size_id);
      costPrice = item.quantity * (size?.purchase_price || product.purchase_price);
    } else if (item.color_id) {
      const color = getColor(item.color_id);
      costPrice = item.quantity * (color?.purchase_price || product.purchase_price);
    } else {
      costPrice = item.quantity * product.purchase_price;
    }
  }

  return {
    revenue: sellingPrice,
    cost: costPrice,
    profit: sellingPrice - costPrice,
    margin: ((sellingPrice - costPrice) / sellingPrice) * 100
  };
};
```

### صافي الربح
```typescript
const calculateNetProfit = (period: DateRange) => {
  // إجمالي الإيرادات
  const grossRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  // تكلفة البضاعة المباعة (COGS)
  const cogs = calculateTotalCOGS(orderItems, products);

  // إجمالي الربح
  const grossProfit = grossRevenue - cogs;

  // المصاريف التشغيلية
  const operatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // خسائر المخزون
  const inventoryLosses = losses.reduce((sum, l) => sum + l.total_cost_value, 0);

  // المرتجعات
  const totalReturns = returns.reduce((sum, r) => sum + r.refund_amount, 0);

  // إيرادات الإصلاحات
  const repairRevenue = repairs
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.total_price, 0);

  // إيرادات الاشتراكات
  const subscriptionRevenue = subscriptionTransactions
    .reduce((sum, t) => sum + t.profit, 0);

  // صافي الربح
  const netProfit = grossProfit
    - operatingExpenses
    - inventoryLosses
    - totalReturns
    + repairRevenue
    + subscriptionRevenue;

  return {
    grossRevenue,
    cogs,
    grossProfit,
    grossProfitMargin: (grossProfit / grossRevenue) * 100,
    operatingExpenses,
    inventoryLosses,
    totalReturns,
    repairRevenue,
    subscriptionRevenue,
    netProfit,
    netProfitMargin: (netProfit / grossRevenue) * 100
  };
};
```

## 3. حسابات رأس المال

### رأس المال في المخزون
```typescript
const calculateInventoryCapital = () => {
  let totalCapital = 0;

  products.forEach(product => {
    // منتجات القطعة العادية
    if (!product.has_variants && !product.sell_by_weight && !product.sell_by_meter && !product.sell_by_box) {
      totalCapital += product.stock_quantity * product.purchase_price;
    }

    // منتجات بألوان فقط
    if (product.has_variants && !product.use_sizes) {
      product.colors?.forEach(color => {
        const price = color.purchase_price || product.purchase_price;
        totalCapital += color.quantity * price;
      });
    }

    // منتجات بألوان ومقاسات
    if (product.has_variants && product.use_sizes) {
      product.colors?.forEach(color => {
        color.sizes?.forEach(size => {
          const price = size.purchase_price || color.purchase_price || product.purchase_price;
          totalCapital += size.quantity * price;
        });
      });
    }

    // منتجات الوزن
    if (product.sell_by_weight) {
      totalCapital += (product.available_weight || 0) * (product.purchase_price_per_weight_unit || 0);
    }

    // منتجات المتر
    if (product.sell_by_meter) {
      totalCapital += (product.available_length || 0) * (product.purchase_price_per_meter || 0);
    }

    // منتجات الصندوق
    if (product.sell_by_box) {
      totalCapital += (product.available_boxes || 0) * (product.box_purchase_price || 0);
    }
  });

  return totalCapital;
};
```

### رأس المال مع الدفعات (Batches)
```typescript
const calculateBatchCapital = () => {
  return inventoryBatches
    .filter(batch => batch.quantity_remaining > 0)
    .reduce((sum, batch) => {
      return sum + (batch.quantity_remaining * batch.purchase_price);
    }, 0);
};
```

## 4. حسابات المديونيات

### ديون العملاء
```typescript
const calculateCustomerDebts = () => {
  // من جدول الديون
  const directDebts = customerDebts.reduce((sum, debt) => {
    return sum + debt.remaining_amount;
  }, 0);

  // من الطلبات غير المدفوعة بالكامل
  const orderDebts = orders
    .filter(o => o.remaining_amount > 0 && o.payment_status !== 'paid')
    .reduce((sum, o) => sum + o.remaining_amount, 0);

  return {
    totalDebts: directDebts + orderDebts,
    debtsByCustomer: groupByCustomer(customerDebts),
    overdueDebts: customerDebts.filter(d => new Date(d.due_date) < new Date()),
    upcomingDebts: customerDebts.filter(d => new Date(d.due_date) >= new Date())
  };
};
```

### ديون الموردين
```typescript
const calculateSupplierDebts = () => {
  return supplierPurchases
    .filter(p => p.balance_due > 0)
    .reduce((acc, purchase) => {
      return {
        total: acc.total + purchase.balance_due,
        bySupplier: {
          ...acc.bySupplier,
          [purchase.supplier_id]: (acc.bySupplier[purchase.supplier_id] || 0) + purchase.balance_due
        }
      };
    }, { total: 0, bySupplier: {} });
};
```

## 5. حسابات الزكاة

### زكاة عروض التجارة
```typescript
const calculateZakat = () => {
  // 1. رأس المال في المخزون (بسعر البيع)
  const inventoryAtSellingPrice = calculateInventoryAtSellingPrice();

  // 2. النقد المتاح (المبيعات - المصاريف)
  const cashAvailable = calculateCashBalance();

  // 3. ديون مستحقة لنا (قابلة للتحصيل)
  const collectableDebts = customerDebts
    .filter(d => d.status !== 'bad_debt')
    .reduce((sum, d) => sum + d.remaining_amount, 0);

  // 4. إجمالي الأصول الزكوية
  const totalZakatableAssets = inventoryAtSellingPrice + cashAvailable + collectableDebts;

  // 5. خصم الديون المستحقة علينا
  const liabilities = calculateSupplierDebts().total;

  // 6. صافي الأصول الزكوية
  const netZakatableAssets = totalZakatableAssets - liabilities;

  // 7. النصاب (85 جرام ذهب تقريباً)
  const nisabInLocalCurrency = 85 * goldPricePerGram;

  // 8. حساب الزكاة
  const zakatDue = netZakatableAssets >= nisabInLocalCurrency
    ? netZakatableAssets * 0.025 // 2.5%
    : 0;

  return {
    inventoryValue: inventoryAtSellingPrice,
    cashBalance: cashAvailable,
    collectableDebts,
    totalAssets: totalZakatableAssets,
    liabilities,
    netAssets: netZakatableAssets,
    nisab: nisabInLocalCurrency,
    isZakatDue: netZakatableAssets >= nisabInLocalCurrency,
    zakatAmount: zakatDue,
    zakatPercentage: 2.5
  };
};

// حساب المخزون بسعر البيع
const calculateInventoryAtSellingPrice = () => {
  let total = 0;

  products.forEach(product => {
    if (product.has_variants) {
      product.colors?.forEach(color => {
        if (color.has_sizes) {
          color.sizes?.forEach(size => {
            total += size.quantity * (size.price || color.price || product.price);
          });
        } else {
          total += color.quantity * (color.price || product.price);
        }
      });
    } else if (product.sell_by_weight) {
      total += (product.available_weight || 0) * product.price_per_weight_unit;
    } else if (product.sell_by_meter) {
      total += (product.available_length || 0) * product.price_per_meter;
    } else if (product.sell_by_box) {
      total += (product.available_boxes || 0) * product.box_price;
    } else {
      total += product.stock_quantity * product.price;
    }
  });

  return total;
};
```

## 6. حسابات الخسائر

```typescript
const calculateLosses = (period: DateRange) => {
  const periodLosses = losses.filter(l =>
    new Date(l.incident_date) >= period.start &&
    new Date(l.incident_date) <= period.end
  );

  return {
    totalCostValue: periodLosses.reduce((sum, l) => sum + l.total_cost_value, 0),
    totalSellingValue: periodLosses.reduce((sum, l) => sum + l.total_selling_value, 0),
    lostProfit: periodLosses.reduce((sum, l) =>
      sum + (l.total_selling_value - l.total_cost_value), 0
    ),
    byType: groupBy(periodLosses, 'loss_type'),
    byCategory: groupBy(periodLosses, 'loss_category'),
    itemsCount: periodLosses.reduce((sum, l) => sum + l.total_items_count, 0)
  };
};
```

## 7. حسابات الإرجاعات

```typescript
const calculateReturns = (period: DateRange) => {
  const periodReturns = returns.filter(r =>
    new Date(r.created_at) >= period.start &&
    new Date(r.created_at) <= period.end &&
    r.status !== 'rejected'
  );

  return {
    totalReturnAmount: periodReturns.reduce((sum, r) => sum + r.return_amount, 0),
    totalRefundAmount: periodReturns.reduce((sum, r) => sum + r.refund_amount, 0),
    totalRestockingFees: periodReturns.reduce((sum, r) => sum + (r.restocking_fee || 0), 0),
    returnRate: (periodReturns.length / orders.length) * 100,
    byReason: groupBy(periodReturns, 'return_reason'),
    byType: groupBy(periodReturns, 'return_type'),
    itemsReturned: returnItems.reduce((sum, ri) => sum + ri.return_quantity, 0)
  };
};
```

## 8. حسابات الإصلاحات

```typescript
const calculateRepairs = (period: DateRange) => {
  const periodRepairs = repairOrders.filter(r =>
    new Date(r.created_at) >= period.start &&
    new Date(r.created_at) <= period.end
  );

  const completed = periodRepairs.filter(r => r.status === 'completed');
  const pending = periodRepairs.filter(r => r.status === 'pending');
  const inProgress = periodRepairs.filter(r => r.status === 'in_progress');

  return {
    totalRevenue: completed.reduce((sum, r) => sum + r.total_price, 0),
    totalPaid: completed.reduce((sum, r) => sum + r.paid_amount, 0),
    totalPending: completed.reduce((sum, r) => sum + (r.total_price - r.paid_amount), 0),
    ordersCount: periodRepairs.length,
    completedCount: completed.length,
    pendingCount: pending.length,
    inProgressCount: inProgress.length,
    completionRate: (completed.length / periodRepairs.length) * 100,
    averageRepairValue: completed.reduce((sum, r) => sum + r.total_price, 0) / completed.length,
    byDeviceType: groupBy(periodRepairs, 'device_type'),
    byLocation: groupBy(periodRepairs, 'repair_location_id'),
    byStatus: groupBy(periodRepairs, 'status')
  };
};
```

## 9. حسابات الاشتراكات

```typescript
const calculateSubscriptions = (period: DateRange) => {
  const periodTransactions = subscriptionTransactions.filter(t =>
    new Date(t.transaction_date) >= period.start &&
    new Date(t.transaction_date) <= period.end
  );

  return {
    totalRevenue: periodTransactions.reduce((sum, t) => sum + t.amount, 0),
    totalCost: periodTransactions.reduce((sum, t) => sum + t.cost, 0),
    totalProfit: periodTransactions.reduce((sum, t) => sum + t.profit, 0),
    transactionsCount: periodTransactions.length,
    byProvider: groupBy(periodTransactions, 'provider'),
    byService: groupBy(periodTransactions, 'service_name'),
    averageProfit: periodTransactions.reduce((sum, t) => sum + t.profit, 0) / periodTransactions.length
  };
};
```

## 10. حسابات جلسات العمل

```typescript
const calculateWorkSessions = (period: DateRange) => {
  const periodSessions = workSessions.filter(s =>
    new Date(s.started_at) >= period.start &&
    new Date(s.started_at) <= period.end
  );

  return {
    totalSales: periodSessions.reduce((sum, s) => sum + s.total_sales, 0),
    totalOrders: periodSessions.reduce((sum, s) => sum + s.total_orders, 0),
    cashSales: periodSessions.reduce((sum, s) => sum + s.cash_sales, 0),
    cardSales: periodSessions.reduce((sum, s) => sum + s.card_sales, 0),
    cashDifference: periodSessions.reduce((sum, s) => sum + s.cash_difference, 0),
    sessionsCount: periodSessions.length,
    byStaff: groupBy(periodSessions, 'staff_id'),
    averageSalesPerSession: periodSessions.reduce((sum, s) => sum + s.total_sales, 0) / periodSessions.length
  };
};
```

---

# 🏗️ هيكل المكونات

## المكونات الرئيسية (15 مكون)

```
src/components/comprehensive-reports/
│
├── 📊 index.ts                           # التصدير الرئيسي
├── 📊 ComprehensiveReportsDashboard.tsx  # الصفحة الرئيسية
│
├── 📁 01-overview/                       # النظرة العامة
│   ├── OverviewSection.tsx
│   ├── MainKPIGrid.tsx
│   ├── QuickStatsCards.tsx
│   └── PeriodComparison.tsx
│
├── 📁 02-sales/                          # المبيعات
│   ├── SalesSection.tsx
│   ├── SalesKPICards.tsx
│   ├── SalesLineChart.tsx
│   ├── SalesByCategory.tsx
│   ├── SalesByPaymentMethod.tsx
│   ├── SalesHeatmap.tsx
│   └── TopSellingProducts.tsx
│
├── 📁 03-profits/                        # الأرباح
│   ├── ProfitsSection.tsx
│   ├── ProfitKPICards.tsx
│   ├── GrossProfitChart.tsx
│   ├── NetProfitChart.tsx
│   ├── ProfitMarginGauge.tsx
│   ├── ProfitByCategory.tsx
│   └── ProfitTrend.tsx
│
├── 📁 04-inventory/                      # المخزون
│   ├── InventorySection.tsx
│   ├── InventoryKPICards.tsx
│   ├── StockValueChart.tsx
│   ├── LowStockAlert.tsx
│   ├── ExpiringProducts.tsx
│   ├── InventoryByCategory.tsx
│   └── StockMovement.tsx
│
├── 📁 05-capital/                        # رأس المال
│   ├── CapitalSection.tsx
│   ├── CapitalKPICards.tsx
│   ├── CapitalDistribution.tsx
│   ├── CapitalByProductType.tsx
│   ├── CapitalTrend.tsx
│   └── CapitalROI.tsx
│
├── 📁 06-expenses/                       # المصاريف
│   ├── ExpensesSection.tsx
│   ├── ExpenseKPICards.tsx
│   ├── ExpensesByCategory.tsx
│   ├── ExpensesTrend.tsx
│   ├── ExpensesVsRevenue.tsx
│   └── RecurringExpenses.tsx
│
├── 📁 07-debts/                          # المديونيات
│   ├── DebtsSection.tsx
│   ├── DebtKPICards.tsx
│   ├── CustomerDebtsTable.tsx
│   ├── SupplierDebtsTable.tsx
│   ├── DebtAgingChart.tsx
│   ├── DebtCollectionRate.tsx
│   └── OverdueDebts.tsx
│
├── 📁 08-customers/                      # العملاء
│   ├── CustomersSection.tsx
│   ├── CustomerKPICards.tsx
│   ├── CustomerGrowth.tsx
│   ├── TopCustomers.tsx
│   ├── CustomerSegments.tsx
│   ├── CustomerRetention.tsx
│   └── CustomerLifetimeValue.tsx
│
├── 📁 09-returns/                        # الإرجاعات
│   ├── ReturnsSection.tsx
│   ├── ReturnKPICards.tsx
│   ├── ReturnsByReason.tsx
│   ├── ReturnTrend.tsx
│   ├── ReturnRate.tsx
│   └── TopReturnedProducts.tsx
│
├── 📁 10-losses/                         # الخسائر
│   ├── LossesSection.tsx
│   ├── LossKPICards.tsx
│   ├── LossesByType.tsx
│   ├── LossTrend.tsx
│   ├── LossImpact.tsx
│   └── LossPreventionSuggestions.tsx
│
├── 📁 11-repairs/                        # الإصلاحات
│   ├── RepairsSection.tsx
│   ├── RepairKPICards.tsx
│   ├── RepairsByDevice.tsx
│   ├── RepairsTrend.tsx
│   ├── RepairsByLocation.tsx
│   ├── RepairCompletionRate.tsx
│   └── RepairRevenue.tsx
│
├── 📁 12-subscriptions/                  # الاشتراكات
│   ├── SubscriptionsSection.tsx
│   ├── SubscriptionKPICards.tsx
│   ├── SubscriptionsByProvider.tsx
│   ├── SubscriptionProfit.tsx
│   ├── SubscriptionTrend.tsx
│   └── TopServices.tsx
│
├── 📁 13-zakat/                          # الزكاة
│   ├── ZakatSection.tsx
│   ├── ZakatCalculator.tsx
│   ├── ZakatBreakdown.tsx
│   ├── ZakatHistory.tsx
│   └── ZakatReminder.tsx
│
├── 📁 14-staff/                          # الموظفين
│   ├── StaffSection.tsx
│   ├── StaffKPICards.tsx
│   ├── StaffPerformance.tsx
│   ├── SalesByStaff.tsx
│   ├── WorkSessionsAnalysis.tsx
│   └── StaffCommissions.tsx
│
├── 📁 15-comparative/                    # المقارنات
│   ├── ComparativeSection.tsx
│   ├── PeriodComparison.tsx
│   ├── YearOverYear.tsx
│   ├── MonthOverMonth.tsx
│   ├── CategoryComparison.tsx
│   └── BranchComparison.tsx
│
├── 📁 shared/                            # مكونات مشتركة
│   ├── KPICard.tsx
│   ├── SectionHeader.tsx
│   ├── ChartContainer.tsx
│   ├── DataTable.tsx
│   ├── LoadingSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   └── AnimatedNumber.tsx
│
├── 📁 filters/                           # الفلاتر
│   ├── DateRangePicker.tsx
│   ├── CategoryFilter.tsx
│   ├── ProductTypeFilter.tsx
│   ├── SaleTypeFilter.tsx
│   ├── PaymentMethodFilter.tsx
│   └── FilterPresets.tsx
│
├── 📁 export/                            # التصدير
│   ├── ExportButton.tsx
│   ├── PDFReport.tsx
│   ├── ExcelExport.tsx
│   └── PrintView.tsx
│
├── 📁 hooks/                             # Hooks
│   ├── useReportsData.ts
│   ├── useSalesData.ts
│   ├── useProfitsData.ts
│   ├── useInventoryData.ts
│   ├── useCapitalData.ts
│   ├── useExpensesData.ts
│   ├── useDebtsData.ts
│   ├── useCustomersData.ts
│   ├── useReturnsData.ts
│   ├── useLossesData.ts
│   ├── useRepairsData.ts
│   ├── useSubscriptionsData.ts
│   ├── useZakatData.ts
│   ├── useStaffData.ts
│   ├── useComparativeData.ts
│   └── useChartConfig.ts
│
├── 📁 utils/                             # أدوات
│   ├── calculations.ts
│   ├── formatters.ts
│   ├── chartHelpers.ts
│   ├── colorPalettes.ts
│   └── queries.ts
│
└── 📁 types/                             # الأنواع
    └── reports.types.ts
```

---

# 📊 تفاصيل كل مكون

## 1. النظرة العامة (Overview)

### MainKPIGrid - شبكة المؤشرات الرئيسية
```typescript
interface MainKPIs {
  // المبيعات
  totalSales: number;
  salesGrowth: number; // نسبة التغير

  // الأرباح
  netProfit: number;
  profitMargin: number;

  // رأس المال
  inventoryCapital: number;
  capitalROI: number;

  // الطلبات
  ordersCount: number;
  averageOrderValue: number;

  // العملاء
  customersCount: number;
  newCustomers: number;

  // المديونيات
  totalReceivables: number;
  totalPayables: number;
}
```

### الرسوم البيانية
- **خط زمني للإيرادات** (Nivo Line)
- **فطيرة توزيع المبيعات** (Nivo Pie)
- **أعمدة المقارنة** (Nivo Bar)

---

## 2. المبيعات (Sales)

### SalesKPICards
```typescript
interface SalesKPIs {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  salesGrowth: number;
  retailSales: number;
  wholesaleSales: number;
  partialWholesaleSales: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
}
```

### الرسوم البيانية
1. **SalesLineChart** - خط المبيعات عبر الزمن
2. **SalesByCategory** - مبيعات حسب الفئة (Sunburst)
3. **SalesByPaymentMethod** - حسب طريقة الدفع (Pie)
4. **SalesHeatmap** - خريطة حرارية (يوم/ساعة)
5. **TopSellingProducts** - أفضل المنتجات (Bar)

### الاستعلامات
```sql
-- المبيعات اليومية
SELECT
  DATE(created_at) as date,
  SUM(total) as total,
  COUNT(*) as orders,
  AVG(total) as avg_order
FROM orders
WHERE organization_id = ?
  AND status NOT IN ('cancelled', 'refunded')
  AND created_at BETWEEN ? AND ?
GROUP BY DATE(created_at)
ORDER BY date

-- المبيعات حسب الفئة
SELECT
  c.name as category_name,
  SUM(oi.total_price) as total,
  COUNT(DISTINCT o.id) as orders_count
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
JOIN product_categories c ON p.category_id = c.id
WHERE o.organization_id = ?
GROUP BY c.id, c.name
```

---

## 3. الأرباح (Profits)

### ProfitKPICards
```typescript
interface ProfitKPIs {
  grossProfit: number;
  grossProfitMargin: number;
  netProfit: number;
  netProfitMargin: number;
  operatingExpenses: number;
  cogs: number; // تكلفة البضاعة المباعة
  profitGrowth: number;
}
```

### الرسوم البيانية
1. **GrossProfitChart** - الربح الإجمالي (Area)
2. **NetProfitChart** - صافي الربح (Line with gradient)
3. **ProfitMarginGauge** - هامش الربح (Gauge)
4. **ProfitByCategory** - الربح حسب الفئة (Bar)
5. **ProfitTrend** - اتجاه الربح (Bump)

---

## 4. المخزون (Inventory)

### InventoryKPICards
```typescript
interface InventoryKPIs {
  totalProducts: number;
  totalValue: number; // رأس المال
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number; // منتجات قريبة الانتهاء
  stockTurnover: number; // معدل دوران المخزون
}
```

### الرسوم البيانية
1. **StockValueChart** - قيمة المخزون (Treemap)
2. **LowStockAlert** - تنبيه المخزون المنخفض (Table)
3. **ExpiringProducts** - المنتجات المنتهية (Timeline)
4. **InventoryByCategory** - حسب الفئة (Pie)
5. **StockMovement** - حركة المخزون (Line)

---

## 5. رأس المال (Capital)

### CapitalKPICards
```typescript
interface CapitalKPIs {
  totalCapital: number;
  capitalInPieces: number; // رأس المال في القطع
  capitalInWeight: number; // رأس المال في الوزن
  capitalInMeters: number; // رأس المال في الأمتار
  capitalInBoxes: number;  // رأس المال في الصناديق
  capitalROI: number;
  capitalTurnover: number;
}
```

### الرسوم البيانية
1. **CapitalDistribution** - توزيع رأس المال (Sunburst)
2. **CapitalByProductType** - حسب نوع المنتج (Bar)
3. **CapitalTrend** - اتجاه رأس المال (Area)
4. **CapitalROI** - العائد على الاستثمار (Gauge)

---

## 6. المصاريف (Expenses)

### ExpenseKPICards
```typescript
interface ExpenseKPIs {
  totalExpenses: number;
  expenseGrowth: number;
  largestCategory: string;
  recurringExpenses: number;
  oneTimeExpenses: number;
  expenseToRevenueRatio: number;
}
```

### الرسوم البيانية
1. **ExpensesByCategory** - حسب الفئة (Pie/Sunburst)
2. **ExpensesTrend** - اتجاه المصاريف (Line)
3. **ExpensesVsRevenue** - مقارنة بالإيرادات (Dual Axis)
4. **RecurringExpenses** - المصاريف المتكررة (Table)

---

## 7. المديونيات (Debts)

### DebtKPICards
```typescript
interface DebtKPIs {
  totalReceivables: number; // ديون العملاء لنا
  totalPayables: number;    // ديوننا للموردين
  netDebtPosition: number;
  overdueReceivables: number;
  collectionRate: number;
  averageCollectionDays: number;
}
```

### الرسوم البيانية
1. **CustomerDebtsTable** - جدول ديون العملاء
2. **SupplierDebtsTable** - جدول ديون الموردين
3. **DebtAgingChart** - تقادم الديون (Bar stacked)
4. **DebtCollectionRate** - معدل التحصيل (Gauge)
5. **OverdueDebts** - الديون المتأخرة (Table with highlight)

---

## 8. العملاء (Customers)

### CustomerKPICards
```typescript
interface CustomerKPIs {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  customerGrowth: number;
  averageCustomerValue: number;
  topCustomerValue: number;
  retentionRate: number;
}
```

### الرسوم البيانية
1. **CustomerGrowth** - نمو العملاء (Area)
2. **TopCustomers** - أفضل العملاء (Bar)
3. **CustomerSegments** - شرائح العملاء (Pie)
4. **CustomerRetention** - معدل الاحتفاظ (Funnel)
5. **CustomerLifetimeValue** - قيمة العميل الدائمة (Scatter)

---

## 9. الإرجاعات (Returns)

### ReturnKPICards
```typescript
interface ReturnKPIs {
  totalReturns: number;
  returnAmount: number;
  refundAmount: number;
  restockingFees: number;
  returnRate: number;
  topReturnReason: string;
}
```

### الرسوم البيانية
1. **ReturnsByReason** - حسب السبب (Pie)
2. **ReturnTrend** - اتجاه الإرجاعات (Line)
3. **ReturnRate** - معدل الإرجاع (Gauge)
4. **TopReturnedProducts** - أكثر المنتجات إرجاعاً (Bar)

---

## 10. الخسائر (Losses)

### LossKPICards
```typescript
interface LossKPIs {
  totalLossCost: number;
  totalLossSellingValue: number;
  lostProfit: number;
  lossRate: number;
  mostCommonLossType: string;
  itemsLost: number;
}
```

### الرسوم البيانية
1. **LossesByType** - حسب النوع (Pie)
2. **LossTrend** - اتجاه الخسائر (Line)
3. **LossImpact** - تأثير الخسائر على الربح (Waterfall)
4. **LossPreventionSuggestions** - اقتراحات منع الخسائر (Cards)

---

## 11. الإصلاحات (Repairs)

### RepairKPICards
```typescript
interface RepairKPIs {
  totalRepairs: number;
  totalRevenue: number;
  completedRepairs: number;
  pendingRepairs: number;
  averageRepairValue: number;
  completionRate: number;
}
```

### الرسوم البيانية
1. **RepairsByDevice** - حسب الجهاز (Bar)
2. **RepairsTrend** - اتجاه الإصلاحات (Line)
3. **RepairsByLocation** - حسب الموقع (Map/Pie)
4. **RepairCompletionRate** - معدل الإكمال (Gauge)
5. **RepairRevenue** - إيرادات الإصلاح (Area)

---

## 12. الاشتراكات (Subscriptions)

### SubscriptionKPICards
```typescript
interface SubscriptionKPIs {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  transactionsCount: number;
  averageProfit: number;
  topProvider: string;
}
```

### الرسوم البيانية
1. **SubscriptionsByProvider** - حسب المزود (Pie)
2. **SubscriptionProfit** - ربح الاشتراكات (Bar)
3. **SubscriptionTrend** - الاتجاه (Line)
4. **TopServices** - أفضل الخدمات (Bar)

---

## 13. الزكاة (Zakat)

### ZakatCalculator
```typescript
interface ZakatData {
  inventoryValue: number;
  cashBalance: number;
  collectableDebts: number;
  totalAssets: number;
  liabilities: number;
  netAssets: number;
  nisab: number;
  isZakatDue: boolean;
  zakatAmount: number;
}
```

### المكونات
1. **ZakatCalculator** - حاسبة الزكاة التفاعلية
2. **ZakatBreakdown** - تفصيل حساب الزكاة
3. **ZakatHistory** - سجل الزكاة المدفوعة
4. **ZakatReminder** - تذكير بموعد الزكاة

---

## 14. الموظفين (Staff)

### StaffKPICards
```typescript
interface StaffKPIs {
  totalStaff: number;
  activeStaff: number;
  totalSalesByStaff: number;
  topPerformer: string;
  averageSalesPerStaff: number;
  totalCommissions: number;
}
```

### الرسوم البيانية
1. **StaffPerformance** - أداء الموظفين (Radar)
2. **SalesByStaff** - المبيعات حسب الموظف (Bar)
3. **WorkSessionsAnalysis** - تحليل جلسات العمل (Heatmap)
4. **StaffCommissions** - العمولات (Table)

---

## 15. المقارنات (Comparative)

### المكونات
1. **PeriodComparison** - مقارنة الفترات
2. **YearOverYear** - سنة على سنة
3. **MonthOverMonth** - شهر على شهر
4. **CategoryComparison** - مقارنة الفئات
5. **BranchComparison** - مقارنة الفروع

---

# 🚀 خطة التنفيذ

## المرحلة 1: الأساسيات (Foundation)
- [ ] تثبيت Nivo + Framer Motion
- [ ] إنشاء هيكل المجلدات
- [ ] إعداد نظام الألوان والثيمات
- [ ] إنشاء Types الأساسية
- [ ] إنشاء المكونات المشتركة (KPICard, SectionHeader, etc.)

## المرحلة 2: الـ Hooks (Data Layer)
- [ ] useReportsData - Hook رئيسي
- [ ] useSalesData
- [ ] useProfitsData
- [ ] useInventoryData
- [ ] useCapitalData
- [ ] useExpensesData
- [ ] useDebtsData
- [ ] useCustomersData
- [ ] useReturnsData
- [ ] useLossesData
- [ ] useRepairsData
- [ ] useSubscriptionsData
- [ ] useZakatData
- [ ] useStaffData

## المرحلة 3: مكونات التقارير
- [ ] 01-overview
- [ ] 02-sales
- [ ] 03-profits
- [ ] 04-inventory
- [ ] 05-capital
- [ ] 06-expenses
- [ ] 07-debts
- [ ] 08-customers
- [ ] 09-returns
- [ ] 10-losses
- [ ] 11-repairs
- [ ] 12-subscriptions
- [ ] 13-zakat
- [ ] 14-staff
- [ ] 15-comparative

## المرحلة 4: الفلاتر والتصدير
- [ ] DateRangePicker
- [ ] فلاتر إضافية
- [ ] PDFReport
- [ ] ExcelExport
- [ ] PrintView

## المرحلة 5: التكامل والتحسين
- [ ] ComprehensiveReportsDashboard
- [ ] التنقل بين الأقسام
- [ ] Animations
- [ ] الاختبار والتحسين
- [ ] التوثيق

---

# 📦 المكتبات المطلوبة

```bash
# الرسوم البيانية
pnpm add @nivo/core @nivo/line @nivo/bar @nivo/pie @nivo/heatmap @nivo/radar @nivo/funnel @nivo/bump @nivo/treemap @nivo/sunburst @nivo/waffle @nivo/calendar

# الحركات
pnpm add framer-motion

# تصدير PDF
pnpm add @react-pdf/renderer jspdf html2canvas

# التاريخ
pnpm add date-fns date-fns-tz

# الأيقونات (إن لم تكن موجودة)
pnpm add lucide-react
```

---

# 🔍 نظام الفلترة الشامل والقوي (Advanced Filter System)

## هيكل نظام الفلترة

```
src/components/comprehensive-reports/filters/
├── index.ts
├── FilterProvider.tsx              # Context للفلاتر
├── FilterBar.tsx                   # شريط الفلاتر الرئيسي
├── FilterDrawer.tsx                # درج الفلاتر المتقدمة (موبايل)
├── FilterChips.tsx                 # عرض الفلاتر النشطة
├── FilterReset.tsx                 # إعادة تعيين الفلاتر
│
├── date/
│   ├── DateRangePicker.tsx         # اختيار نطاق التاريخ
│   ├── DatePresets.tsx             # قوالب جاهزة (اليوم، الأسبوع، الشهر...)
│   ├── QuickDateButtons.tsx        # أزرار سريعة
│   ├── CustomDateRange.tsx         # نطاق مخصص
│   └── DateComparison.tsx          # مقارنة فترتين
│
├── categories/
│   ├── CategoryFilter.tsx          # فلتر الفئات
│   ├── SubcategoryFilter.tsx       # فلتر الفئات الفرعية
│   ├── CategoryTree.tsx            # شجرة الفئات
│   └── MultiCategorySelect.tsx     # اختيار متعدد
│
├── products/
│   ├── ProductFilter.tsx           # فلتر المنتجات
│   ├── ProductSearch.tsx           # البحث في المنتجات
│   ├── ProductTypeFilter.tsx       # نوع المنتج (قطعة/وزن/متر/علبة)
│   ├── BrandFilter.tsx             # فلتر العلامات التجارية
│   └── VariantFilter.tsx           # فلتر المتغيرات
│
├── sales/
│   ├── SaleTypeFilter.tsx          # نوع البيع (تجزئة/جملة)
│   ├── PaymentMethodFilter.tsx     # طريقة الدفع
│   ├── PaymentStatusFilter.tsx     # حالة الدفع
│   ├── OrderStatusFilter.tsx       # حالة الطلب
│   └── ChannelFilter.tsx           # قناة البيع (POS/أونلاين)
│
├── entities/
│   ├── CustomerFilter.tsx          # فلتر العملاء
│   ├── CustomerSegmentFilter.tsx   # شرائح العملاء
│   ├── SupplierFilter.tsx          # فلتر الموردين
│   ├── StaffFilter.tsx             # فلتر الموظفين
│   └── BranchFilter.tsx            # فلتر الفروع
│
├── financial/
│   ├── AmountRangeFilter.tsx       # نطاق المبالغ
│   ├── ProfitMarginFilter.tsx      # هامش الربح
│   ├── ExpenseCategoryFilter.tsx   # فئات المصاريف
│   └── DebtStatusFilter.tsx        # حالة الديون
│
├── advanced/
│   ├── AdvancedFilters.tsx         # الفلاتر المتقدمة
│   ├── FilterBuilder.tsx           # بناء فلتر مخصص
│   ├── SavedFilters.tsx            # الفلاتر المحفوظة
│   └── FilterTemplates.tsx         # قوالب الفلاتر
│
└── hooks/
    ├── useFilters.ts               # Hook رئيسي للفلاتر
    ├── useFilterPresets.ts         # إدارة القوالب
    ├── useFilterPersistence.ts     # حفظ الفلاتر
    └── useFilterValidation.ts      # التحقق من الفلاتر
```

## 📋 واجهة الفلاتر الموحدة

```typescript
// types/filters.types.ts

// ==================== أنواع الفلاتر الأساسية ====================

export interface DateRangeFilter {
  start: Date | null;
  end: Date | null;
  preset?: DatePreset;
  comparison?: {
    enabled: boolean;
    start: Date | null;
    end: Date | null;
  };
}

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

export interface CategoryFilter {
  categoryIds: string[];
  subcategoryIds: string[];
  includeSubcategories: boolean;
}

export interface ProductFilter {
  productIds: string[];
  productTypes: ProductType[];
  brands: string[];
  hasVariants?: boolean;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  priceRange?: {
    min: number | null;
    max: number | null;
  };
}

export type ProductType =
  | 'piece'           // قطعة عادية
  | 'piece_with_colors'  // قطعة بألوان
  | 'piece_with_sizes'   // قطعة بألوان ومقاسات
  | 'weight'          // وزن
  | 'meter'           // متر
  | 'box';            // علبة/كرتون

export interface SalesFilter {
  saleTypes: SaleType[];
  paymentMethods: string[];
  paymentStatuses: PaymentStatus[];
  orderStatuses: OrderStatus[];
  channels: SalesChannel[];
  hasDiscount?: boolean;
  hasRemaining?: boolean;
}

export type SaleType = 'retail' | 'wholesale' | 'partial_wholesale';
export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'failed';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type SalesChannel = 'pos' | 'online' | 'all';

export interface EntityFilter {
  customerIds: string[];
  customerSegments: string[];
  supplierIds: string[];
  staffIds: string[];
  branchIds: string[];
}

export interface FinancialFilter {
  amountRange: {
    min: number | null;
    max: number | null;
  };
  profitMarginRange: {
    min: number | null;
    max: number | null;
  };
  expenseCategories: string[];
  debtStatuses: DebtStatus[];
}

export type DebtStatus = 'current' | 'overdue' | 'paid' | 'bad_debt';

export interface AdvancedFilter {
  // فلاتر الخسائر
  lossTypes?: LossType[];
  lossCategories?: string[];

  // فلاتر الإرجاعات
  returnReasons?: string[];
  returnTypes?: ReturnType[];

  // فلاتر الإصلاحات
  deviceTypes?: string[];
  repairStatuses?: string[];
  repairLocations?: string[];

  // فلاتر الاشتراكات
  providers?: string[];
  services?: string[];

  // فلاتر المخزون
  expiringWithinDays?: number;
  batchIds?: string[];
  hasSerialNumbers?: boolean;
  hasWarranty?: boolean;
}

export type LossType = 'damage' | 'theft' | 'expiry' | 'shortage' | 'breakage' | 'other';
export type ReturnType = 'full' | 'partial' | 'exchange';

// ==================== الفلتر الموحد الشامل ====================

export interface ComprehensiveFilters {
  // الفلاتر الأساسية
  dateRange: DateRangeFilter;
  categories: CategoryFilter;
  products: ProductFilter;
  sales: SalesFilter;
  entities: EntityFilter;
  financial: FinancialFilter;
  advanced: AdvancedFilter;

  // خيارات إضافية
  groupBy?: GroupByOption;
  sortBy?: SortOption;
  limit?: number;

  // البحث النصي
  searchQuery?: string;
  searchFields?: string[];
}

export type GroupByOption =
  | 'day' | 'week' | 'month' | 'quarter' | 'year'
  | 'category' | 'subcategory' | 'product' | 'brand'
  | 'customer' | 'staff' | 'branch'
  | 'payment_method' | 'sale_type';

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// ==================== قوالب الفلاتر المحفوظة ====================

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: Partial<ComprehensiveFilters>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterPreset {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  filters: Partial<ComprehensiveFilters>;
  category: 'quick' | 'analysis' | 'report' | 'custom';
}
```

## 🎛️ مكون الفلترة الرئيسي

```typescript
// FilterProvider.tsx
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface FilterContextType {
  filters: ComprehensiveFilters;
  setFilters: (filters: Partial<ComprehensiveFilters>) => void;
  resetFilters: () => void;
  applyPreset: (preset: FilterPreset) => void;
  saveFilter: (name: string) => void;
  loadSavedFilter: (id: string) => void;
  activeFiltersCount: number;
  isFiltered: boolean;
}

const defaultFilters: ComprehensiveFilters = {
  dateRange: {
    start: null,
    end: null,
    preset: 'this_month',
    comparison: { enabled: false, start: null, end: null }
  },
  categories: {
    categoryIds: [],
    subcategoryIds: [],
    includeSubcategories: true
  },
  products: {
    productIds: [],
    productTypes: [],
    brands: [],
    hasVariants: undefined,
    stockStatus: 'all'
  },
  sales: {
    saleTypes: [],
    paymentMethods: [],
    paymentStatuses: [],
    orderStatuses: [],
    channels: []
  },
  entities: {
    customerIds: [],
    customerSegments: [],
    supplierIds: [],
    staffIds: [],
    branchIds: []
  },
  financial: {
    amountRange: { min: null, max: null },
    profitMarginRange: { min: null, max: null },
    expenseCategories: [],
    debtStatuses: []
  },
  advanced: {}
};

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFiltersState] = useState<ComprehensiveFilters>(defaultFilters);

  const setFilters = useCallback((newFilters: Partial<ComprehensiveFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange.preset !== 'this_month') count++;
    if (filters.categories.categoryIds.length > 0) count++;
    if (filters.products.productIds.length > 0) count++;
    if (filters.sales.saleTypes.length > 0) count++;
    if (filters.entities.customerIds.length > 0) count++;
    // ... المزيد من العدادات
    return count;
  }, [filters]);

  return (
    <FilterContext.Provider value={{
      filters,
      setFilters,
      resetFilters,
      activeFiltersCount,
      isFiltered: activeFiltersCount > 0,
      // ... باقي الوظائف
    }}>
      {children}
    </FilterContext.Provider>
  );
};
```

## 📆 قوالب التواريخ الجاهزة

```typescript
// DatePresets.tsx
export const datePresets: FilterPreset[] = [
  {
    id: 'today',
    name: 'Today',
    nameAr: 'اليوم',
    icon: 'calendar-day',
    category: 'quick',
    filters: {
      dateRange: {
        preset: 'today',
        start: startOfToday(),
        end: endOfToday()
      }
    }
  },
  {
    id: 'yesterday',
    name: 'Yesterday',
    nameAr: 'أمس',
    icon: 'calendar-minus',
    category: 'quick',
    filters: {
      dateRange: {
        preset: 'yesterday',
        start: startOfYesterday(),
        end: endOfYesterday()
      }
    }
  },
  {
    id: 'this_week',
    name: 'This Week',
    nameAr: 'هذا الأسبوع',
    icon: 'calendar-week',
    category: 'quick',
    filters: {
      dateRange: {
        preset: 'this_week',
        start: startOfWeek(new Date(), { weekStartsOn: 6 }), // السبت
        end: endOfWeek(new Date(), { weekStartsOn: 6 })
      }
    }
  },
  {
    id: 'last_week',
    name: 'Last Week',
    nameAr: 'الأسبوع الماضي',
    icon: 'calendar-week',
    category: 'quick',
    filters: { /* ... */ }
  },
  {
    id: 'this_month',
    name: 'This Month',
    nameAr: 'هذا الشهر',
    icon: 'calendar-month',
    category: 'quick',
    filters: {
      dateRange: {
        preset: 'this_month',
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      }
    }
  },
  {
    id: 'last_month',
    name: 'Last Month',
    nameAr: 'الشهر الماضي',
    icon: 'calendar-month',
    category: 'quick',
    filters: { /* ... */ }
  },
  {
    id: 'this_quarter',
    name: 'This Quarter',
    nameAr: 'هذا الربع',
    icon: 'calendar-range',
    category: 'analysis',
    filters: { /* ... */ }
  },
  {
    id: 'this_year',
    name: 'This Year',
    nameAr: 'هذه السنة',
    icon: 'calendar',
    category: 'analysis',
    filters: { /* ... */ }
  },
  {
    id: 'last_30_days',
    name: 'Last 30 Days',
    nameAr: 'آخر 30 يوم',
    icon: 'calendar-days',
    category: 'analysis',
    filters: {
      dateRange: {
        preset: 'last_30_days',
        start: subDays(new Date(), 30),
        end: new Date()
      }
    }
  },
  {
    id: 'ramadan',
    name: 'Ramadan',
    nameAr: 'رمضان',
    icon: 'moon',
    category: 'report',
    filters: { /* حسب التقويم الهجري */ }
  },
  {
    id: 'eid_season',
    name: 'Eid Season',
    nameAr: 'موسم العيد',
    icon: 'star',
    category: 'report',
    filters: { /* ... */ }
  }
];
```

## 🔧 قوالب فلاتر التحليل

```typescript
// AnalysisPresets.tsx
export const analysisPresets: FilterPreset[] = [
  {
    id: 'top_performers',
    name: 'Top Performers',
    nameAr: 'الأفضل أداءً',
    icon: 'trending-up',
    category: 'analysis',
    filters: {
      dateRange: { preset: 'this_month' },
      sortBy: { field: 'total_sales', direction: 'desc' },
      limit: 10
    }
  },
  {
    id: 'slow_moving',
    name: 'Slow Moving Products',
    nameAr: 'المنتجات بطيئة الحركة',
    icon: 'trending-down',
    category: 'analysis',
    filters: {
      dateRange: { preset: 'last_30_days' },
      products: { stockStatus: 'in_stock' },
      sortBy: { field: 'sales_count', direction: 'asc' },
      limit: 20
    }
  },
  {
    id: 'high_profit_margin',
    name: 'High Profit Margin',
    nameAr: 'هامش ربح عالي',
    icon: 'dollar-sign',
    category: 'analysis',
    filters: {
      financial: {
        profitMarginRange: { min: 30, max: null }
      },
      sortBy: { field: 'profit_margin', direction: 'desc' }
    }
  },
  {
    id: 'wholesale_customers',
    name: 'Wholesale Customers',
    nameAr: 'عملاء الجملة',
    icon: 'users',
    category: 'analysis',
    filters: {
      sales: { saleTypes: ['wholesale', 'partial_wholesale'] }
    }
  },
  {
    id: 'credit_sales',
    name: 'Credit Sales (Debts)',
    nameAr: 'مبيعات الآجل (ديون)',
    icon: 'credit-card',
    category: 'analysis',
    filters: {
      sales: { hasRemaining: true },
      financial: { debtStatuses: ['current', 'overdue'] }
    }
  },
  {
    id: 'expiring_soon',
    name: 'Expiring Soon',
    nameAr: 'قريبة الانتهاء',
    icon: 'clock',
    category: 'analysis',
    filters: {
      advanced: { expiringWithinDays: 30 }
    }
  },
  {
    id: 'weight_products',
    name: 'Weight Products',
    nameAr: 'منتجات الوزن',
    icon: 'scale',
    category: 'analysis',
    filters: {
      products: { productTypes: ['weight'] }
    }
  },
  {
    id: 'box_products',
    name: 'Box/Carton Products',
    nameAr: 'منتجات العلب/الكراتين',
    icon: 'package',
    category: 'analysis',
    filters: {
      products: { productTypes: ['box'] }
    }
  }
];
```

## 🎯 Hook استخدام الفلاتر

```typescript
// hooks/useFilters.ts
export const useFilters = () => {
  const context = useContext(FilterContext);

  // تطبيق الفلاتر على البيانات
  const applyFilters = useCallback(<T extends Record<string, any>>(
    data: T[],
    filters: ComprehensiveFilters
  ): T[] => {
    let filtered = [...data];

    // فلتر التاريخ
    if (filters.dateRange.start && filters.dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at || item.date);
        return itemDate >= filters.dateRange.start! &&
               itemDate <= filters.dateRange.end!;
      });
    }

    // فلتر الفئات
    if (filters.categories.categoryIds.length > 0) {
      filtered = filtered.filter(item =>
        filters.categories.categoryIds.includes(item.category_id)
      );
    }

    // فلتر نوع البيع
    if (filters.sales.saleTypes.length > 0) {
      filtered = filtered.filter(item =>
        filters.sales.saleTypes.includes(item.sale_type)
      );
    }

    // فلتر نوع المنتج
    if (filters.products.productTypes.length > 0) {
      filtered = filtered.filter(item => {
        const productType = getProductType(item);
        return filters.products.productTypes.includes(productType);
      });
    }

    // فلتر طريقة الدفع
    if (filters.sales.paymentMethods.length > 0) {
      filtered = filtered.filter(item =>
        filters.sales.paymentMethods.includes(item.payment_method)
      );
    }

    // فلتر العميل
    if (filters.entities.customerIds.length > 0) {
      filtered = filtered.filter(item =>
        filters.entities.customerIds.includes(item.customer_id)
      );
    }

    // فلتر الموظف
    if (filters.entities.staffIds.length > 0) {
      filtered = filtered.filter(item =>
        filters.entities.staffIds.includes(item.created_by_staff_id)
      );
    }

    // فلتر نطاق المبلغ
    if (filters.financial.amountRange.min !== null) {
      filtered = filtered.filter(item =>
        item.total >= filters.financial.amountRange.min!
      );
    }
    if (filters.financial.amountRange.max !== null) {
      filtered = filtered.filter(item =>
        item.total <= filters.financial.amountRange.max!
      );
    }

    // البحث النصي
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const fields = filters.searchFields || ['name', 'description', 'sku'];
      filtered = filtered.filter(item =>
        fields.some(field =>
          item[field]?.toString().toLowerCase().includes(query)
        )
      );
    }

    // الترتيب
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[filters.sortBy!.field];
        const bVal = b[filters.sortBy!.field];
        const direction = filters.sortBy!.direction === 'asc' ? 1 : -1;
        return (aVal - bVal) * direction;
      });
    }

    // الحد
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }, []);

  return { ...context, applyFilters };
};
```

## 🖼️ مكون شريط الفلاتر

```typescript
// FilterBar.tsx
export const FilterBar: React.FC = () => {
  const { filters, setFilters, activeFiltersCount, resetFilters } = useFilters();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <motion.div
      className="filter-bar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* القسم العلوي - الفلاتر السريعة */}
      <div className="filter-bar-top">
        {/* اختيار التاريخ السريع */}
        <DatePresetButtons
          value={filters.dateRange.preset}
          onChange={(preset) => setFilters({
            dateRange: { ...filters.dateRange, preset }
          })}
        />

        {/* زر التاريخ المخصص */}
        <DateRangePicker
          value={filters.dateRange}
          onChange={(dateRange) => setFilters({ dateRange })}
        />

        {/* المقارنة */}
        <ComparisonToggle
          enabled={filters.dateRange.comparison?.enabled}
          onChange={(enabled) => setFilters({
            dateRange: {
              ...filters.dateRange,
              comparison: { ...filters.dateRange.comparison, enabled }
            }
          })}
        />

        {/* فلتر الفئة */}
        <CategoryDropdown
          value={filters.categories.categoryIds}
          onChange={(categoryIds) => setFilters({
            categories: { ...filters.categories, categoryIds }
          })}
        />

        {/* فلتر نوع البيع */}
        <SaleTypeToggle
          value={filters.sales.saleTypes}
          onChange={(saleTypes) => setFilters({
            sales: { ...filters.sales, saleTypes }
          })}
        />

        {/* زر الفلاتر المتقدمة */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(true)}
          className="advanced-filters-btn"
        >
          <Filter className="w-4 h-4" />
          فلاتر متقدمة
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount}</Badge>
          )}
        </Button>

        {/* إعادة التعيين */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={resetFilters}>
            <X className="w-4 h-4" />
            مسح الكل
          </Button>
        )}
      </div>

      {/* شرائح الفلاتر النشطة */}
      <FilterChips />

      {/* درج الفلاتر المتقدمة */}
      <AdvancedFiltersDrawer
        open={showAdvanced}
        onClose={() => setShowAdvanced(false)}
      />
    </motion.div>
  );
};
```

---

# 💡 أفكار إبداعية ومكونات إضافية

## 🌟 مكونات إبداعية جديدة

### 1. لوحة الأهداف والإنجازات (Goals Dashboard)
```typescript
// 16-goals/
├── GoalsSection.tsx
├── GoalCard.tsx                    # بطاقة هدف واحد
├── GoalProgress.tsx                # تقدم نحو الهدف
├── GoalMilestones.tsx              # معالم الهدف
├── GoalComparison.tsx              # مقارنة بالهدف
├── StreakTracker.tsx               # تتبع الإنجازات المتتالية
└── AchievementBadges.tsx           # شارات الإنجاز

interface Goal {
  id: string;
  name: string;
  type: 'sales' | 'profit' | 'customers' | 'orders' | 'custom';
  target: number;
  current: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
}
```

### 2. التنبؤات الذكية (AI Predictions)
```typescript
// 17-predictions/
├── PredictionsSection.tsx
├── SalesForecast.tsx               # توقعات المبيعات
├── DemandPrediction.tsx            # توقع الطلب
├── StockoutPrediction.tsx          # توقع نفاد المخزون
├── SeasonalTrends.tsx              # الاتجاهات الموسمية
├── CustomerChurnPrediction.tsx     # توقع خسارة العملاء
└── ProfitProjection.tsx            # توقعات الأرباح

// خوارزميات بسيطة للتنبؤ (تعمل offline)
const predictNextPeriod = (historicalData: number[]): number => {
  // Moving Average
  const periods = 3;
  const recent = historicalData.slice(-periods);
  const avg = recent.reduce((a, b) => a + b, 0) / periods;

  // Trend factor
  const trend = (recent[recent.length - 1] - recent[0]) / periods;

  return avg + trend;
};
```

### 3. خريطة الأداء الحرارية (Performance Heatmap)
```typescript
// 18-heatmaps/
├── PerformanceHeatmap.tsx
├── HourlySalesHeatmap.tsx          # المبيعات حسب الساعة/اليوم
├── ProductPerformanceMatrix.tsx    # مصفوفة أداء المنتجات
├── CustomerActivityMap.tsx         # خريطة نشاط العملاء
├── StaffEfficiencyMap.tsx          # كفاءة الموظفين
└── CategoryProductMatrix.tsx       # مصفوفة الفئات/المنتجات
```

### 4. تحليل السلة (Basket Analysis)
```typescript
// 19-basket-analysis/
├── BasketAnalysisSection.tsx
├── FrequentlyBoughtTogether.tsx    # منتجات تُشترى معاً
├── CrossSellOpportunities.tsx      # فرص البيع المتقاطع
├── AverageBasketSize.tsx           # متوسط حجم السلة
├── BasketValueDistribution.tsx     # توزيع قيمة السلة
└── ProductAffinityChart.tsx        # تقارب المنتجات
```

### 5. تحليل ABC للمخزون
```typescript
// 20-abc-analysis/
├── ABCAnalysisSection.tsx
├── ABCClassification.tsx           # تصنيف ABC
├── ParetoPrinciple.tsx             # مبدأ باريتو (80/20)
├── InventoryOptimization.tsx       # تحسين المخزون
├── ReorderSuggestions.tsx          # اقتراحات إعادة الطلب
└── DeadStockIdentifier.tsx         # تحديد المخزون الراكد

// تصنيف ABC
// A: 20% من المنتجات = 80% من القيمة
// B: 30% من المنتجات = 15% من القيمة
// C: 50% من المنتجات = 5% من القيمة
```

### 6. تحليل RFM للعملاء
```typescript
// 21-rfm-analysis/
├── RFMAnalysisSection.tsx
├── RFMScoreCard.tsx                # بطاقة نقاط RFM
├── CustomerSegmentation.tsx        # تقسيم العملاء
├── ChampionCustomers.tsx           # العملاء الأبطال
├── AtRiskCustomers.tsx             # العملاء المعرضون للخطر
├── WinBackStrategies.tsx           # استراتيجيات الاستعادة
└── SegmentComparison.tsx           # مقارنة الشرائح

// RFM = Recency, Frequency, Monetary
interface RFMScore {
  customerId: string;
  recency: number;      // أيام منذ آخر شراء
  frequency: number;    // عدد الطلبات
  monetary: number;     // إجمالي الإنفاق
  rfmScore: string;     // مثل "555" أو "111"
  segment: CustomerSegment;
}

type CustomerSegment =
  | 'champions'         // أبطال
  | 'loyal_customers'   // عملاء مخلصون
  | 'potential_loyalists' // محتملون للولاء
  | 'new_customers'     // عملاء جدد
  | 'promising'         // واعدون
  | 'need_attention'    // بحاجة اهتمام
  | 'about_to_sleep'    // على وشك السكون
  | 'at_risk'           // معرضون للخطر
  | 'cannot_lose'       // لا يمكن خسارتهم
  | 'hibernating'       // خاملون
  | 'lost';             // مفقودون
```

### 7. لوحة التنبيهات الذكية
```typescript
// 22-smart-alerts/
├── SmartAlertsSection.tsx
├── AlertsOverview.tsx              # نظرة عامة على التنبيهات
├── CriticalAlerts.tsx              # تنبيهات حرجة
├── WarningAlerts.tsx               # تحذيرات
├── OpportunityAlerts.tsx           # فرص
├── AlertHistory.tsx                # سجل التنبيهات
└── AlertSettings.tsx               # إعدادات التنبيهات

interface SmartAlert {
  id: string;
  type: AlertType;
  severity: 'critical' | 'warning' | 'info' | 'opportunity';
  title: string;
  message: string;
  data: Record<string, any>;
  actions: AlertAction[];
  createdAt: Date;
  isRead: boolean;
}

type AlertType =
  | 'low_stock'                 // مخزون منخفض
  | 'out_of_stock'              // نفاد المخزون
  | 'expiring_products'         // منتجات منتهية
  | 'overdue_debts'             // ديون متأخرة
  | 'high_value_order'          // طلب بقيمة عالية
  | 'unusual_activity'          // نشاط غير عادي
  | 'target_achieved'           // تحقيق الهدف
  | 'declining_sales'           // انخفاض المبيعات
  | 'popular_product'           // منتج رائج
  | 'customer_milestone';       // إنجاز عميل
```

### 8. التقارير المخصصة (Report Builder)
```typescript
// 23-report-builder/
├── ReportBuilderSection.tsx
├── ReportCanvas.tsx                # لوحة بناء التقرير
├── WidgetLibrary.tsx               # مكتبة المكونات
├── DragDropBuilder.tsx             # سحب وإفلات
├── ReportPreview.tsx               # معاينة التقرير
├── SavedReports.tsx                # التقارير المحفوظة
├── ScheduledReports.tsx            # التقارير المجدولة
└── ReportSharing.tsx               # مشاركة التقارير

interface CustomReport {
  id: string;
  name: string;
  layout: WidgetLayout[];
  filters: ComprehensiveFilters;
  schedule?: ReportSchedule;
  sharing?: ReportSharing;
}

interface WidgetLayout {
  widgetId: string;
  widgetType: WidgetType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: WidgetConfig;
}
```

### 9. مقارنة الفترات التفاعلية
```typescript
// 24-interactive-comparison/
├── InteractiveComparisonSection.tsx
├── SideBySideView.tsx              # عرض جنباً لجنب
├── OverlayChart.tsx                # تراكب الرسوم
├── DifferenceHighlighter.tsx       # تمييز الفروقات
├── PercentageChange.tsx            # نسبة التغير
├── TrendArrows.tsx                 # أسهم الاتجاه
└── ComparisonTable.tsx             # جدول المقارنة
```

### 10. لوحة الأداء الحي (Live Dashboard)
```typescript
// 25-live-dashboard/
├── LiveDashboardSection.tsx
├── RealTimeSales.tsx               # مبيعات لحظية
├── LiveOrderFeed.tsx               # تدفق الطلبات
├── CurrentSessionStats.tsx         # إحصائيات الجلسة الحالية
├── TodayProgress.tsx               # تقدم اليوم
├── ActiveCustomers.tsx             # العملاء النشطون
└── LiveNotifications.tsx           # إشعارات حية
```

### 11. تحليل الموسمية
```typescript
// 26-seasonality/
├── SeasonalitySection.tsx
├── MonthlyPatterns.tsx             # أنماط شهرية
├── WeeklyPatterns.tsx              # أنماط أسبوعية
├── DailyPatterns.tsx               # أنماط يومية
├── HolidayImpact.tsx               # تأثير العطلات
├── RamadanAnalysis.tsx             # تحليل رمضان
├── EidAnalysis.tsx                 # تحليل العيد
└── SeasonalForecast.tsx            # توقعات موسمية
```

### 12. لوحة الصحة المالية
```typescript
// 27-financial-health/
├── FinancialHealthSection.tsx
├── HealthScore.tsx                 # نقاط الصحة المالية
├── CashFlowStatus.tsx              # حالة التدفق النقدي
├── LiquidityRatio.tsx              # نسبة السيولة
├── DebtToEquity.tsx                # نسبة الدين للملكية
├── WorkingCapital.tsx              # رأس المال العامل
├── BreakEvenAnalysis.tsx           # تحليل نقطة التعادل
└── FinancialRecommendations.tsx    # توصيات مالية

interface FinancialHealthScore {
  overall: number;           // 0-100
  liquidity: number;
  profitability: number;
  efficiency: number;
  solvency: number;
  recommendations: string[];
}
```

### 13. تحليل المنافسين (للمقارنة الداخلية)
```typescript
// 28-benchmarking/
├── BenchmarkingSection.tsx
├── IndustryAverages.tsx            # متوسطات الصناعة
├── PerformanceRanking.tsx          # ترتيب الأداء
├── GrowthBenchmark.tsx             # معيار النمو
├── EfficiencyMetrics.tsx           # مقاييس الكفاءة
└── ImprovementAreas.tsx            # مجالات التحسين
```

### 14. تحليل العائد على الاستثمار
```typescript
// 29-roi-analysis/
├── ROIAnalysisSection.tsx
├── ProductROI.tsx                  # عائد المنتجات
├── CategoryROI.tsx                 # عائد الفئات
├── CustomerROI.tsx                 # عائد العملاء
├── MarketingROI.tsx                # عائد التسويق
├── InventoryROI.tsx                # عائد المخزون
└── ROIComparison.tsx               # مقارنة العوائد
```

### 15. تقارير الضرائب والزكاة
```typescript
// 30-tax-reports/
├── TaxReportsSection.tsx
├── VATReport.tsx                   # تقرير ضريبة القيمة المضافة
├── ZakatReport.tsx                 # تقرير الزكاة
├── TaxSummary.tsx                  # ملخص الضرائب
├── TaxableTransactions.tsx         # المعاملات الخاضعة
├── TaxExemptions.tsx               # الإعفاءات
└── TaxCalendar.tsx                 # تقويم الضرائب
```

---

## 🎨 مكونات التصميم الإبداعية

### 1. بطاقات KPI متحركة مع Sparklines
```typescript
// shared/SparklineKPICard.tsx
interface SparklineKPICardProps {
  title: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  sparklineData: number[];
  icon: React.ReactNode;
  color: string;
  format: 'currency' | 'number' | 'percentage';
}
```

### 2. Gauge متقدم مع مناطق
```typescript
// shared/AdvancedGauge.tsx
interface AdvancedGaugeProps {
  value: number;
  min: number;
  max: number;
  zones: {
    from: number;
    to: number;
    color: string;
    label: string;
  }[];
  target?: number;
  animated?: boolean;
}
```

### 3. Progress Ring متعدد
```typescript
// shared/MultiProgressRing.tsx
interface MultiProgressRingProps {
  rings: {
    value: number;
    max: number;
    color: string;
    label: string;
  }[];
  centerContent?: React.ReactNode;
  size?: number;
}
```

### 4. Comparison Bar
```typescript
// shared/ComparisonBar.tsx
interface ComparisonBarProps {
  current: number;
  previous: number;
  target?: number;
  label: string;
  showDifference: boolean;
}
```

### 5. Trend Indicator مع توقع
```typescript
// shared/TrendIndicator.tsx
interface TrendIndicatorProps {
  data: number[];
  prediction?: number;
  trend: 'up' | 'down' | 'stable';
  confidence?: number;
}
```

### 6. Data Storytelling Cards
```typescript
// shared/InsightCard.tsx
interface InsightCardProps {
  insight: string;           // "المبيعات ارتفعت 15% هذا الأسبوع"
  context: string;           // "مقارنة بالأسبوع الماضي"
  impact: 'positive' | 'negative' | 'neutral';
  relatedData: any;
  suggestedAction?: string;  // "فكر في زيادة المخزون"
}
```

### 7. Animated Counter
```typescript
// shared/AnimatedCounter.tsx
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}
```

---

## 📊 هيكل المجلدات المحدث

```
src/components/comprehensive-reports/
│
├── 📁 01-overview/
├── 📁 02-sales/
├── 📁 03-profits/
├── 📁 04-inventory/
├── 📁 05-capital/
├── 📁 06-expenses/
├── 📁 07-debts/
├── 📁 08-customers/
├── 📁 09-returns/
├── 📁 10-losses/
├── 📁 11-repairs/
├── 📁 12-subscriptions/
├── 📁 13-zakat/
├── 📁 14-staff/
├── 📁 15-comparative/
│
├── 📁 16-goals/                    # ⭐ جديد - الأهداف
├── 📁 17-predictions/              # ⭐ جديد - التنبؤات
├── 📁 18-heatmaps/                 # ⭐ جديد - الخرائط الحرارية
├── 📁 19-basket-analysis/          # ⭐ جديد - تحليل السلة
├── 📁 20-abc-analysis/             # ⭐ جديد - تحليل ABC
├── 📁 21-rfm-analysis/             # ⭐ جديد - تحليل RFM
├── 📁 22-smart-alerts/             # ⭐ جديد - التنبيهات الذكية
├── 📁 23-report-builder/           # ⭐ جديد - بناء التقارير
├── 📁 24-interactive-comparison/   # ⭐ جديد - المقارنات التفاعلية
├── 📁 25-live-dashboard/           # ⭐ جديد - اللوحة الحية
├── 📁 26-seasonality/              # ⭐ جديد - الموسمية
├── 📁 27-financial-health/         # ⭐ جديد - الصحة المالية
├── 📁 28-benchmarking/             # ⭐ جديد - المقارنة المعيارية
├── 📁 29-roi-analysis/             # ⭐ جديد - تحليل العائد
├── 📁 30-tax-reports/              # ⭐ جديد - تقارير الضرائب
│
├── 📁 filters/                     # ⭐ محدث - نظام الفلاتر الشامل
│   ├── FilterProvider.tsx
│   ├── FilterBar.tsx
│   ├── FilterDrawer.tsx
│   ├── FilterChips.tsx
│   ├── date/
│   ├── categories/
│   ├── products/
│   ├── sales/
│   ├── entities/
│   ├── financial/
│   ├── advanced/
│   └── hooks/
│
├── 📁 shared/                      # ⭐ محدث - مكونات مشتركة
│   ├── KPICard.tsx
│   ├── SparklineKPICard.tsx
│   ├── AdvancedGauge.tsx
│   ├── MultiProgressRing.tsx
│   ├── ComparisonBar.tsx
│   ├── TrendIndicator.tsx
│   ├── InsightCard.tsx
│   ├── AnimatedCounter.tsx
│   ├── AnimatedNumber.tsx
│   ├── ChartContainer.tsx
│   ├── DataTable.tsx
│   └── ...
│
├── 📁 export/
├── 📁 hooks/
├── 📁 utils/
└── 📁 types/
```

---

## 🎯 ملخص الإضافات

### نظام الفلاتر:
- ✅ فلاتر شاملة لكل أنواع البيانات
- ✅ قوالب تواريخ جاهزة (15+ قالب)
- ✅ قوالب تحليل جاهزة (10+ قالب)
- ✅ حفظ الفلاتر المخصصة
- ✅ دعم المقارنة بين فترتين
- ✅ البحث النصي الشامل
- ✅ فلاتر متقدمة للخسائر/الإرجاعات/الإصلاحات

### مكونات إبداعية جديدة (15 قسم):
1. 🎯 Goals Dashboard - الأهداف والإنجازات
2. 🔮 AI Predictions - التنبؤات الذكية
3. 🗺️ Performance Heatmaps - الخرائط الحرارية
4. 🛒 Basket Analysis - تحليل السلة
5. 📊 ABC Analysis - تحليل ABC للمخزون
6. 👥 RFM Analysis - تحليل العملاء
7. 🔔 Smart Alerts - التنبيهات الذكية
8. 🛠️ Report Builder - بناء التقارير
9. ⚖️ Interactive Comparison - المقارنات
10. ⚡ Live Dashboard - اللوحة الحية
11. 🌙 Seasonality - تحليل الموسمية
12. 💚 Financial Health - الصحة المالية
13. 📈 Benchmarking - المقارنة المعيارية
14. 💰 ROI Analysis - تحليل العائد
15. 🧾 Tax Reports - تقارير الضرائب

### مكونات تصميم إبداعية (7 مكون):
1. SparklineKPICard
2. AdvancedGauge
3. MultiProgressRing
4. ComparisonBar
5. TrendIndicator
6. InsightCard
7. AnimatedCounter

---

*تاريخ الإنشاء: ديسمبر 2025*
*الإصدار: 3.0 - الخطة الشاملة مع الفلاتر والأفكار الإبداعية*
