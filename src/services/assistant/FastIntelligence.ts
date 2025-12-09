/**
 * طبقة ذكاء سريعة محلية - بدون AI
 * تجيب على الأسئلة الشائعة فوراً بدون انتظار
 *
 * @version 1.0.0
 */

// ⚡ تم إزالة LocalAnalyticsService - تم إعادة تسميته إلى .old
// import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
// TODO: إعادة تنفيذ الوظائف المطلوبة باستخدام PowerSync
import { computeAvailableStock } from '@/lib/stock';

export class FastIntelligence {

  /**
   * محاولة الإجابة السريعة بدون AI
   * @returns null إذا لم تستطع الإجابة (تحتاج AI)
   */
  static async tryFastAnswer(query: string): Promise<string | null> {
    const q = query.toLowerCase().trim();

    // ✅ طلب تعديل المخزون بدون تحديد منتج
    if (q.match(/(تعديل|غير|بدل|تبديل|تغيير).*(مخزون|stock)/i) &&
      !q.match(/(iphone|samsung|huawei|xiaomi|lg|[\u0600-\u06FF]{3,})/i)) {
      return `📦 **لتعديل المخزون:**\n\n` +
        `اكتب: "تعديل مخزون [اسم المنتج] [الكمية]"\n\n` +
        `**أمثلة:**\n` +
        `• تعديل مخزون iPhone 50\n` +
        `• زيد مخزون Samsung 20\n` +
        `• نقّص مخزون Xiaomi 10\n\n` +
        `💡 يمكنك أيضاً كتابة اسم المنتج مباشرة وسأفهم!`;
    }

    // ✅ حسابات رياضية فورية
    if (this.isCalculation(q)) {
      const result = this.calculate(query);
      if (result !== null) {
        return `الناتج: **${result}**`;
      }
    }

    // ✅ مبيعات اليوم
    if (q.match(/(مبيعات اليوم|sales today|اليوم كم بعت|شحال بعت اليوم)/)) {
      const data = await LocalAnalyticsService.getTodaySales();
      if (data.orderCount === 0) {
        return `📊 **مبيعات اليوم**: لا توجد معاملات اليوم حتى الآن.\n\n💡 ابدأ يومك بقوة!`;
      }
      return `📊 **مبيعات اليوم**\n💰 الإجمالي: ${data.totalSales.toFixed(2)} دج\n📦 الطلبات: ${data.orderCount}\n💵 أرباح تقديرية: ${data.profit.toFixed(2)} دج`;
    }

    // ✅ مبيعات الأمس
    if (q.match(/(مبيعات الأمس|مبيعات امس|sales yesterday|البارح)/)) {
      const data = await LocalAnalyticsService.getYesterdaySales();
      return `📊 **مبيعات الأمس**\n💰 الإجمالي: ${data.totalSales.toFixed(2)} دج\n📦 الطلبات: ${data.orderCount}\n💵 أرباح: ${data.profit.toFixed(2)} دج`;
    }

    // ✅ مبيعات الأسبوع
    if (q.match(/(مبيعات الأسبوع|هذا الأسبوع|weekly sales|الويك)/)) {
      const data = await LocalAnalyticsService.getWeeklySales();
      return `📊 **مبيعات الأسبوع**\n💰 الإجمالي: ${data.totalSales.toFixed(2)} دج\n📦 الطلبات: ${data.orderCount}\n💵 أرباح: ${data.profit.toFixed(2)} دج`;
    }

    // ✅ مبيعات الشهر
    if (q.match(/(مبيعات الشهر|هذا الشهر|monthly sales|هاد الشهر)/)) {
      const data = await LocalAnalyticsService.getSalesStats(30);
      return `📊 **مبيعات الشهر**\n💰 الإجمالي: ${data.totalSales.toFixed(2)} دج\n📦 الطلبات: ${data.totalOrders}\n📈 متوسط الطلب: ${data.averageOrderValue.toFixed(2)} دج\n💵 أرباح: ${data.totalProfit.toFixed(2)} دج`;
    }

    // ✅ أكثر المنتجات مبيعاً
    if (q.match(/(أكثر المنتجات|top products|الأكثر مبيعا|best selling)/)) {
      const data = await LocalAnalyticsService.getTopSellingProducts(7);
      if (data.length === 0) {
        return '📦 لا توجد مبيعات في الأيام الأخيرة.';
      }
      const top5 = data.slice(0, 5).map((p, i) =>
        `${i + 1}. **${p.productName}** — ${p.quantitySold} قطعة (${p.totalRevenue.toFixed(0)} دج)`
      ).join('\n');
      return `🏆 **أكثر 5 منتجات مبيعاً (آخر 7 أيام)**\n\n${top5}`;
    }

    // ✅ حالة المخزون
    if (q.match(/(حالة المخزون|inventory|المخزون كيف|stock status)/)) {
      const data = await LocalAnalyticsService.getInventoryStats();
      return `📦 **حالة المخزون**\n\n` +
        `📊 إجمالي المنتجات: **${data.totalProducts}**\n` +
        `⚠️ منخفض: **${data.lowStockProducts}**\n` +
        `❌ نافد: **${data.outOfStockProducts}**\n` +
        `💰 قيمة المخزون: **${data.totalStockValue.toFixed(2)} دج**`;
    }

    // ✅ منتجات منخفضة
    if (q.match(/(منتجات منخفضة|low stock|ناقص|شحيح)/)) {
      const data = await LocalAnalyticsService.getLowStockProducts(10);
      if (data.length === 0) {
        return '✅ لا توجد منتجات منخفضة المخزون حالياً!';
      }
      const list = data.slice(0, 10).map((p, i) =>
        `${i + 1}. ${p.name} — **${p.available_stock}** قطعة متبقية`
      ).join('\n');
      return `⚠️ **منتجات منخفضة المخزون** (${data.length})\n\n${list}`;
    }

    // ✅ منتجات نافدة
    if (q.match(/(منتجات نافدة|out of stock|نفذت|خلصت)/)) {
      const data = await LocalAnalyticsService.getOutOfStockProducts(10);
      if (data.length === 0) {
        return '✅ رائع! لا توجد منتجات نافدة حالياً!';
      }
      const list = data.slice(0, 10).map((p, i) =>
        `${i + 1}. ${p.name}`
      ).join('\n');
      return `❌ **منتجات نافدة** (${data.length})\n\n${list}\n\n💡 يُفضّل إعادة التموين`;
    }

    // ✅ المنتجات الراكدة (Dead Stock) - ⚡ NEW
    if (q.match(/(منتجات لا تباع|منتجات راكدة|سلع راكدة|dead stock|ما هي المنتجات التي لا تباع|السلعة لي متمشيش)/)) {
      const days = 30;
      const deadStock = await LocalAnalyticsService.getDeadStock(days, 10);
      if (deadStock.length === 0) return `✅ **ممتاز!** لا توجد منتجات راكدة (لم تبع) منذ ${days} يوم.`;

      const dsList = deadStock.map(p => `- ${p.name} (المخزون: ${p.stock_quantity || 0})`).join('\n');
      return `📦 **المنتجات الراكدة (Dead Stock)**\nهذه المنتجات لم يتم بيعها منذ ${days} يوم:\n${dsList}`;
    }

    // ✅ تحليل النمو (Growth) - ⚡ NEW
    if (q.match(/(تحليل النمو|growth|مقارنة المبيعات|كيف هو أدائي|كيفاش راهي الحالة)/)) {
      const [today, yesterday] = await Promise.all([
        LocalAnalyticsService.getTodaySales(),
        LocalAnalyticsService.getYesterdaySales()
      ]);
      const diff = today.totalSales - yesterday.totalSales;
      const diffPercent = yesterday.totalSales > 0 ? ((diff / yesterday.totalSales) * 100).toFixed(1) : '∞';
      const emoji = diff > 0 ? '📈' : '📉';
      return `📊 **تحليل النمو (اليوم vs الأمس)**\n\n` +
        `🟢 اليوم: ${today.totalSales} دج\n` +
        `🟡 الأمس: ${yesterday.totalSales} دج\n` +
        `${emoji} الفرق: ${diff > 0 ? '+' : ''}${diff} دج (${diffPercent}%)`;
    }

    // ✅ أفضل العملاء (Top Customers) - ⚡ NEW
    if (q.match(/(أفضل العملاء|top customers|أحسن زبون|زبائن أوفياء|best customers)/)) {
      const topCust = await LocalAnalyticsService.getTopCustomers(30, 5);
      if (topCust.length === 0) return 'لا توجد بيانات كافية عن العملاء.';
      const list = topCust.map((c, i) => `${i + 1}. ${c.customer_name} (${c.total} دج)`).join('\n');
      return `🏆 **أفضل العملاء (آخر 30 يوم)**\n\n${list}`;
    }

    // ✅ عدد المنتجات
    if (q.match(/(كم منتج|عدد المنتجات|how many products|شحال منتج)/)) {
      // ⚡ استخدام LocalAnalytics بدلاً من inventoryDB
      const stats = await LocalAnalyticsService.getInventoryStats();
      return `📦 لديك **${stats?.totalProducts || 0}** منتج في المخزون`;
    }

    // ✅ عدد العملاء
    if (q.match(/(كم عميل|عدد العملاء|how many customers|شحال كليان)/)) {
      // ⚡ استخدام LocalAnalytics بدلاً من inventoryDB
      const customersSummary = await LocalAnalyticsService.getDebtsSummary();
      return `👥 لديك عملاء مسجلين مع ${customersSummary?.totalDebts || 0} دين`;
    }

    // ✅ الديون - ملخص (Total Debts)
    if (q.match(/(إجمالي|مجموع|كم|شحال|total|sum).*(الديون|الكريدي|ديون|كريدي|debts|credit)/i) ||
      q.match(/(الديون|الكريدي|ديون|كريدي).*(كم|شحال|how much)/i)) {
      // استثناء طلبات القوائم
      if (!q.match(/(قائمة|ليست|أسماء|list|names|who)/i)) {
        const data = await LocalAnalyticsService.getDebtsSummary();
        return `💳 **ملخص الديون (Credit/Debts)**\n\n` +
          `📋 إجمالي الديون: **${data.totalDebts}**\n` +
          `⏳ قيد الانتظار: **${data.pending}**\n` +
          `⚡ مدفوعة جزئياً: **${data.partial}**\n` +
          `✅ مدفوعة: **${data.paid}**\n` +
          `💰 المبلغ المتبقي: **${data.totalRemaining.toFixed(2)} دج**`;
      }
    }

    // ✅ قائمة العملاء الذين لديهم ديون
    if (q.match(/(قائمة|ليست|أسماء|وين).*(عملاء|كليون|clients|customers).*(دين|ديون|كريدي|credit|debt)/i) ||
      q.match(/(عملاء|كليون|clients|customers).*(عندهم|لديهم|has|with).*(دين|ديون|كريدي|credit)/i)) {
      const customers = await LocalAnalyticsService.getCustomersWithDebts(15);
      if (customers.length === 0) {
        return `✅ **رائع!** لا يوجد عملاء لديهم ديون حالياً! 🎉`;
      }

      const list = customers.map((c, i) => {
        let statusEmoji = '💳';
        if (c.status === 'pending') statusEmoji = '⏳ قيد الانتظار';
        else if (c.status === 'partial') statusEmoji = '⚡ مدفوع جزئياً';
        else statusEmoji = `📝 ${c.status}`;

        return `${i + 1}. **${c.customer_name}**\n` +
          `   💰 المتبقي: ${c.remaining_amount.toFixed(2)} دج` +
          (c.debts_count > 1 ? ` (${c.debts_count} ديون)` : '') +
          `\n   ${statusEmoji}`;
      }).join('\n\n');

      return `👥 **العملاء الذين لديهم ديون** (${customers.length})\n\n${list}\n\n` +
        `💡 **نصيحة:** تابع مع العملاء بانتظام لتحصيل الديون`;
    }

    // ✅ مقارنة سريعة (اليوم vs الأمس)
    if (q.match(/(قارن اليوم|compare today|اليوم والأمس)/)) {
      const [today, yesterday] = await Promise.all([
        LocalAnalyticsService.getTodaySales(),
        LocalAnalyticsService.getYesterdaySales()
      ]);
      const diff = today.totalSales - yesterday.totalSales;
      const diffPercent = yesterday.totalSales > 0
        ? ((diff / yesterday.totalSales) * 100).toFixed(1)
        : '∞';
      const emoji = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';

      return `📊 **مقارنة المبيعات**\n\n` +
        `🟢 **اليوم**: ${today.totalSales.toFixed(2)} دج (${today.orderCount} طلب)\n` +
        `🟡 **الأمس**: ${yesterday.totalSales.toFixed(2)} دج (${yesterday.orderCount} طلب)\n\n` +
        `${emoji} **الفرق**: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} دج (${diffPercent}%)`;
    }

    // ✅ أسئلة "كيف" بسيطة
    if (q.match(/^(كيف|كيفاش|how).*(أحسن|improve|زيد|increase)/i)) {
      return `💡 **نصائح لتحسين المبيعات:**\n\n` +
        `1. 📊 راقب المنتجات الأكثر مبيعاً واستثمر فيها\n` +
        `2. 💰 راجع أسعارك مقارنة بالسوق\n` +
        `3. 👥 حسّن خدمة العملاء\n` +
        `4. 📱 استخدم السوشيال ميديا للترويج\n` +
        `5. 🎁 قدم عروض خاصة للعملاء المخلصين\n\n` +
        `❓ هل تريد تحليلاً أعمق لنقطة معينة؟`;
    }

    // ✅ التنقل السريع (Navigation)
    if (q.match(/(اذهب|روح|إلى|افتح|open|go to|navigate).*(dashboard|pos|products|orders|customers|settings|reports|الرئيسية|البيع|المنتجات|الطلبات|العملاء|الإعدادات|التقارير)/i)) {
      let page = 'dashboard';
      if (q.match(/(pos|البيع)/i)) page = 'pos';
      else if (q.match(/(products|المنتجات)/i)) page = 'products';
      else if (q.match(/(orders|الطلبات)/i)) page = 'orders';
      else if (q.match(/(customers|العملاء|الزبائن)/i)) page = 'customers';
      else if (q.match(/(settings|الإعدادات)/i)) page = 'settings';
      else if (q.match(/(reports|التقارير)/i)) page = 'reports';

      // We return a special marker that the UI or Orchestrator can intercept, 
      // OR we just do it here if we can. Since this returns string, we'll return a message 
      // but we need to actually perform the action. 
      // Ideally, FastIntelligence should return an Action object, but for now we'll rely on the ToolRegistry 
      // if we want "action". 
      // BUT, to be "Fast", we can't wait for LLM.
      // Let's return a specific string that the UI might parse, OR we can execute the side effect here if we are in browser.

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
        // Use setTimeout to allow the UI to show the message first
        setTimeout(() => {
          window.location.href = routes[page];
        }, 1000);
        return `🚀 **جاري الانتقال إلى ${page}...**`;
      }
    }

    // لم نستطع الإجابة سريعاً
    return null;
  }

  /**
   * التحقق إذا كان السؤال حسابي
   */
  private static isCalculation(query: string): boolean {
    return /\d+\s*[+\-*/×÷]\s*\d+/.test(query) ||
      /(احسب|calculate|حساب|كم يساوي)/i.test(query);
  }

  /**
   * حساب سريع
   */
  private static calculate(query: string): number | null {
    try {
      // استخراج التعبير
      const expr = query
        .replace(/(احسب|calculate|حساب|كم يساوي|=)/gi, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/[^0-9+\-*/().\s]/g, '')
        .trim();

      if (!expr) return null;

      // تقييم آمن
      const result = new Function(`return ${expr}`)();
      return typeof result === 'number' && !isNaN(result) ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * اقتراحات سريعة للأسئلة الشائعة
   */
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
