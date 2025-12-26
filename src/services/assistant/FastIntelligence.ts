/**
 * طبقة ذكاء سريعة محلية - بدون AI
 * تجيب على الأسئلة الشائعة فوراً بدون انتظار
 *
 * @version 2.4.0 (Fix: Debt/Customer Priority over Expense)
 */

import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
import { computeAvailableStock } from '@/lib/stock';
import type { WidgetData } from '@/components/pos/assistant-widgets/WidgetRegistry';

export interface FastResponse {
  answer: string;
  widget?: WidgetData;
  intent?: string;
}

export class FastIntelligence {

  /**
   * محاولة الإجابة السريعة بدعم الـ Widgets
   * @returns FastResponse إذا نجح، أو null إذا كان يحتاج إلى AI
   */
  static async tryFastAnswer(query: string): Promise<FastResponse | null> {
    const q = query.toLowerCase().trim();

    // 🚀 PRIORITY CHECKS (Before standard regexes)

    // ✅ إضافة عميل (Priority High)
    if (q.match(/(إضافة عميل|سجل عميل|add customer|new customer|عميل جديد|زبون جديد)/)) {
      return {
        answer: "يرجى إدخال بيانات العميل:",
        widget: {
          type: 'customer_form',
          title: 'إضافة عميل',
          data: {
            initialName: '',
            initialPhone: ''
          }
        },
        intent: 'ADD_CUSTOMER'
      };
    }

    // ✅ إدارة الديون (Priority High)
    if (q.match(/(تسجيل دين|كريدي|دين جديد|تسجيل دفعة|دفع|خلاص|add debt|new debt|payment|credit)/)) {
      // Detect mode based on keywords
      const isPay = q.match(/(دفعة|دفع|خلاص|pay|payment)/);
      return {
        answer: isPay ? "تسجيل دفعة جديدة:" : "تسجيل دين جديد:",
        widget: {
          type: 'debt_form',
          title: 'إدارة الديون',
          data: {
            initialCustomerName: '',
            initialCustomerId: '',
            initialAmount: '',
            mode: isPay ? 'pay_debt' : 'add_debt'
          }
        },
        intent: 'MANAGE_DEBT'
      };
    }

    // ✅ تحليل النمو (PRIORITY)
    if (q.match(/(تحليل|حلل|analyze|analysis|growth|نمو|تطور|evolution)/) && !q.match(/(مخزون|stock)/)) {
      const isMonthly = q.match(/(شهر|month|30|mo|mois)/);
      const days = isMonthly ? 30 : 7;
      const periodLabel = isMonthly ? 'شهري' : 'أسبوعي';
      const descLabel = isMonthly ? 'لآخر 30 يوم' : 'لآخر 7 أيام';

      const [today, yesterday, dailyTrend] = await Promise.all([
        LocalAnalyticsService.getTodaySales(),
        LocalAnalyticsService.getYesterdaySales(),
        LocalAnalyticsService.getDailySalesTrend(days)
      ]);
      const diff = today.totalSales - yesterday.totalSales;
      const diffPercent = yesterday.totalSales > 0 ? ((diff / yesterday.totalSales) * 100).toFixed(1) : '∞';
      const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

      return {
        answer: `تحليل النمو (${periodLabel})\n\n` +
          `المبيعات تتجه ${trend === 'up' ? 'للصعود' : 'للانخفاض'} مقارنة بالأمس.\n` +
          `التغير: ${diff > 0 ? '+' : ''}${diff} دج (${diffPercent}%)`,
        widget: {
          type: 'chart',
          title: `تحليل النمو (${periodLabel})`,
          description: `اتجاه المبيعات ${descLabel}`,
          data: {
            type: 'area', // or 'bar'
            points: dailyTrend.map(t => ({ label: t.date, value: t.amount })),
            trend: {
              value: parseFloat(diffPercent.replace('%', '')),
              direction: trend
            }
          }
        },
        intent: 'ANALYZE_GROWTH'
      };
    }

    // ✅ تسجيل مصروف (PRIORITY WIDGET TRIGGER)
    // Refined to NOT match if specific debt/customer keywords are present (Double safety)
    if (q.match(/(تسجيل|سجل|أضف|مسروف|مصروف|expense|spend)/i)) {
      return {
        answer: "يرجى تعبئة تفاصيل المصروف في النموذج أدناه:",
        widget: {
          type: 'expense_form',
          title: 'تسجيل مصروف',
          data: {
            initialTitle: '',
            initialAmount: '',
            categories: ['سلعة', 'كراء', 'فواتير', 'رواتب', 'نقل', 'تسويق', 'صيانة', 'أخرى']
          }
        },
        intent: 'CREATE_EXPENSE'
      };
    }

    // ✅ طلب تعديل المخزون
    if (q.match(/(تعديل|غير|بدل|تبديل|تغيير).*(مخزون|stock)/i) &&
      !q.match(/(iphone|samsung|huawei|xiaomi|lg|[\u0600-\u06FF]{3,})/i)) {
      return {
        answer: `لتعديل المخزون:\n\n` +
          `اكتب: "تعديل مخزون [اسم المنتج] [الكمية]"\n\n` +
          `أمثلة:\n` +
          `• تعديل مخزون iPhone 50\n` +
          `• زيد مخزون Samsung 20\n` +
          `• نقّص مخزون Xiaomi 10\n\n` +
          `يمكنك أيضاً كتابة اسم المنتج مباشرة وسأفهم!`
      };
    }

    // ✅ حسابات رياضية
    if (this.isCalculation(q)) {
      const result = this.calculate(query);
      if (result !== null) {
        return { answer: `الناتج: ${result}` };
      }
    }

    // ✅ مبيعات اليوم
    if (q.match(/(مبيعات اليوم|sales today|اليوم كم بعت|شحال بعت اليوم)/)) {
      const data = await LocalAnalyticsService.getTodaySales();
      if (data.orderCount === 0) {
        return { answer: `مبيعات اليوم: لا يوجد معاملات اليوم حتى الآن.\n\nابدأ يومك بقوة!` };
      }
      return {
        answer: `مبيعات اليوم\nالإجمالي: ${data.totalSales.toFixed(2)} دج\nالطلبات: ${data.orderCount}\nأرباح تقديرية: ${data.profit.toFixed(2)} دج`,
        widget: {
          type: 'stats_card',
          title: 'مبيعات اليوم',
          data: {
            totalSales: data.totalSales,
            totalOrders: data.orderCount,
            totalProfit: data.profit
          }
        },
        intent: 'QUERY_SALES'
      };
    }

    // ✅ مبيعات الأمس
    if (q.match(/(مبيعات الأمس|مبيعات امس|sales yesterday|البارح)/)) {
      const data = await LocalAnalyticsService.getYesterdaySales();
      return {
        answer: `مبيعات الأمس\nالإجمالي: ${data.totalSales.toFixed(2)} دج\nالطلبات: ${data.orderCount}\nأرباح: ${data.profit.toFixed(2)} دج`,
        widget: {
          type: 'stats_card',
          title: 'مبيعات الأمس',
          data: {
            totalSales: data.totalSales,
            totalOrders: data.orderCount,
            totalProfit: data.profit
          }
        },
        intent: 'QUERY_SALES'
      };
    }

    // ✅ مبيعات الأسبوع
    if (q.match(/(مبيعات الأسبوع|هذا الأسبوع|weekly sales|الويك)/)) {
      const data = await LocalAnalyticsService.getWeeklySales();
      return {
        answer: `مبيعات الأسبوع\nالإجمالي: ${data.totalSales.toFixed(2)} دج\nالطلبات: ${data.orderCount}\nأرباح: ${data.profit.toFixed(2)} دج`,
        widget: {
          type: 'stats_card',
          title: 'مبيعات الأسبوع',
          data: {
            totalSales: data.totalSales,
            totalOrders: data.orderCount,
            totalProfit: data.profit
          }
        },
        intent: 'QUERY_SALES'
      };
    }

    // ✅ مبيعات الشهر
    if (q.match(/(مبيعات الشهر|هذا الشهر|monthly sales|هاد الشهر)/)) {
      const data = await LocalAnalyticsService.getSalesStats(30);
      return {
        answer: `مبيعات الشهر\nالإجمالي: ${data.totalSales.toFixed(2)} دج\nالطلبات: ${data.totalOrders}\nمتوسط الطلب: ${data.averageOrderValue.toFixed(2)} دج\nأرباح: ${data.totalProfit.toFixed(2)} دج`,
        widget: {
          type: 'stats_card',
          title: 'مبيعات الشهر',
          data: {
            totalSales: data.totalSales,
            totalOrders: data.totalOrders,
            totalProfit: data.totalProfit
          }
        },
        intent: 'QUERY_SALES'
      };
    }

    // ✅ أكثر المنتجات مبيعاً
    if (q.match(/(أكثر المنتجات|top products|الأكثر مبيعا|best selling)/)) {
      const data = await LocalAnalyticsService.getTopSellingProducts(7);
      if (data.length === 0) {
        return { answer: 'لا توجد مبيعات في الأيام الأخيرة.' };
      }
      const top5 = data.slice(0, 5).map((p, i) =>
        `${i + 1}. ${p.productName} — ${p.quantitySold} قطعة (${p.totalRevenue.toFixed(0)} دج)`
      ).join('\n');
      return {
        answer: `أكثر 5 منتجات مبيعاً (آخر 7 أيام)\n\n${top5}`,
        widget: {
          type: 'product_list',
          title: 'الأكثر مبيعاً',
          data: data.slice(0, 5).map(p => ({
            id: p.productId,
            name: p.productName,
            price: p.revenue / (p.quantitySold || 1),
            stock_quantity: 0,
            available_stock: p.quantitySold // Hack to show sold qty
          }))
        }
      };
    }

    // ✅ حالة المخزون
    if (q.match(/(حالة المخزون|inventory|المخزون كيف|stock status)/)) {
      const data = await LocalAnalyticsService.getInventoryStats();
      return {
        answer: `حالة المخزون\n\n` +
          `إجمالي المنتجات: ${data.totalProducts}\n` +
          `منخفض: ${data.lowStockProducts}\n` +
          `نافد: ${data.outOfStockProducts}\n` +
          `قيمة المخزون: ${data.totalStockValue.toFixed(2)} دج`,
        widget: {
          type: 'stats_card',
          title: 'ملخص المخزون',
          data: {
            totalSales: data.totalStockValue,
            totalOrders: data.totalProducts
            // Use specialized fields if stats card supports them, or general ones
          }
        }
      };
    }

    // ✅ منتجات منخفضة
    if (q.match(/(منتجات منخفضة|low stock|ناقص|شحيح)/)) {
      const data = await LocalAnalyticsService.getLowStockProducts(10);
      if (data.length === 0) {
        return { answer: 'لا توجد منتجات منخفضة المخزون حالياً!' };
      }
      const list = data.slice(0, 10).map((p, i) =>
        `${i + 1}. ${p.name} — ${p.available_stock} قطعة متبقية`
      ).join('\n');
      return {
        answer: `منتجات منخفضة المخزون (${data.length})\n\n${list}`,
        widget: {
          type: 'product_list',
          title: 'تنبيهات المخزون',
          data: data
        }
      };
    }

    // ✅ منتجات نافدة
    if (q.match(/(منتجات نافدة|out of stock|نفذت|خلصت)/)) {
      const data = await LocalAnalyticsService.getOutOfStockProducts(10);
      if (data.length === 0) {
        return { answer: 'رائع! لا توجد منتجات نافدة حالياً!' };
      }
      const list = data.slice(0, 10).map((p, i) =>
        `${i + 1}. ${p.name}`
      ).join('\n');
      return {
        answer: `منتجات نافدة (${data.length})\n\n${list}\n\nيُفضّل إعادة التموين`,
        widget: {
          type: 'product_list',
          title: 'منتجات نافدة',
          data: data
        }
      };
    }

    // ✅ المنتجات الراكدة
    if (q.match(/(منتجات لا تباع|منتجات راكدة|سلع راكدة|dead stock|ما هي المنتجات التي لا تباع|السلعة لي متمشيش)/)) {
      const days = 30;
      const deadStock = await LocalAnalyticsService.getDeadStock(days, 10);
      if (deadStock.length === 0) return { answer: `ممتاز! لا توجد منتجات راكدة (لم تبع) منذ ${days} يوم.` };

      const dsList = deadStock.map(p => `- ${p.name} (المخزون: ${p.stock_quantity || 0})`).join('\n');
      return {
        answer: `المنتجات الراكدة (Dead Stock)\nهذه المنتجات لم يتم بيعها منذ ${days} يوم:\n${dsList}`,
        widget: {
          type: 'product_list',
          title: 'منتجات راكدة',
          data: deadStock.map(p => ({ ...p, price: 0 }))
        }
      };
    }

    // ✅ أفضل العملاء
    if (q.match(/(أفضل العملاء|top customers|أحسن زبون|زبائن أوفياء|best customers)/)) {
      const topCust = await LocalAnalyticsService.getTopCustomers(30, 5);
      if (topCust.length === 0) return { answer: 'لا توجد بيانات كافية عن العملاء.' };
      const list = topCust.map((c, i) => `${i + 1}. ${c.customer_name} (${c.total} دج)`).join('\n');
      return { answer: `أفضل العملاء (آخر 30 يوم)\n\n${list}` };
    }

    // ✅ التنقل السريع
    if (q.match(/(اذهب|روح|إلى|افتح|open|go to|navigate).*(dashboard|pos|products|orders|customers|settings|reports|الرئيسية|البيع|المنتجات|الطلبات|العملاء|الإعدادات|التقارير)/i)) {
      let page = 'dashboard';
      if (q.match(/(pos|البيع)/i)) page = 'pos';
      else if (q.match(/(products|المنتجات)/i)) page = 'products';
      else if (q.match(/(orders|الطلبات)/i)) page = 'orders';
      else if (q.match(/(customers|العملاء|الزبائن)/i)) page = 'customers';
      else if (q.match(/(settings|الإعدادات)/i)) page = 'settings';
      else if (q.match(/(reports|التقارير)/i)) page = 'reports';

      if (typeof window !== 'undefined') {
        const routes: Record<string, string> = {
          'dashboard': '/dashboard',
          'pos': '/pos',
          'products': '/dashboard/products',
          'orders': '/dashboard/orders',
          'customers': '/dashboard/customers',
          'settings': '/dashboard/settings',
          'reports': '/dashboard/reports'
        };
        setTimeout(() => {
          window.location.href = routes[page];
        }, 1000);
        return { answer: `جاري الانتقال إلى ${page}...` };
      }
    }

    return null;
  }

  // ... (Keep helper methods isCalculation, calculate, getQuickSuggestions SAME)
  private static isCalculation(query: string): boolean {
    return /\d+\s*[+\-*/×÷]\s*\d+/.test(query) ||
      /(احسب|calculate|حساب|كم يساوي)/i.test(query);
  }

  private static calculate(query: string): number | null {
    try {
      const expr = query
        .replace(/(احسب|calculate|حساب|كم يساوي|=)/gi, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/[^0-9+\-*/().\s]/g, '')
        .trim();
      if (!expr) return null;
      const result = new Function(`return ${expr}`)();
      return typeof result === 'number' && !isNaN(result) ? result : null;
    } catch {
      return null;
    }
  }

  static getQuickSuggestions(): string[] {
    return [
      'ما هي مبيعات اليوم؟',
      'أكثر المنتجات مبيعاً',
      'حالة المخزون',
      'منتجات منخفضة',
      'قارن اليوم بالأمس',
      'العملاء الذين لديهم ديون',
      'إجمالي الديون',
      'كم عميل لدي؟'
    ];
  }
}
