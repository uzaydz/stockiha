/**
 * طبقة ذكاء سريعة محلية - بدون AI
 * تجيب على الأسئلة الشائعة فوراً بدون انتظار
 *
 * @version 1.0.0
 */

import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
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

    // ✅ الديون - ملخص
    if (q.match(/(إجمالي الديون|total debts|كم دين|شحال الديون)/) &&
        !q.match(/(قائمة|ليست|العملاء|الكليون|clients|customers|list)/)) {
      const data = await LocalAnalyticsService.getDebtsSummary();
      return `💳 **ملخص الديون**\n\n` +
        `📋 إجمالي الديون: **${data.totalDebts}**\n` +
        `⏳ قيد الانتظار: **${data.pending}**\n` +
        `⚡ مدفوعة جزئياً: **${data.partial}**\n` +
        `✅ مدفوعة: **${data.paid}**\n` +
        `💰 المتبقي: **${data.totalRemaining.toFixed(2)} دج**`;
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
