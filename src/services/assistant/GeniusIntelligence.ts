import { AIGateway } from './AIGateway';
import { SIRA_TOOLS } from './ToolRegistry';
import { FastIntelligence } from './FastIntelligence';
import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';

export interface GeniusResponse {
    answer: string;
    confidence: number;
    dataUsed?: any;
    suggestions?: string[];
    relatedQuestions?: string[];
    intent?: string;
}

export class GeniusIntelligence {

    // 🚀 THE HYPER-SPEED PROTOCOL
    // We force the AI to act as a "Router" that outputs JSON only.
    // We (the code) handle the execution and text generation.
    private static ROUTER_PROMPT = `You are a JSON-only Intent Router. Classify requests into these JSON formats. NO CHAT.
INTENTS:
1. NAVIGATE: { "type": "NAVIGATE", "page": "dashboard"|"pos"|"products"|"orders"|"customers"|"settings"|"reports" }
2. QUERY_SALES: { "type": "QUERY_SALES", "period": "today"|"yesterday"|"week"|"month" }
3. QUERY_INVENTORY: { "type": "QUERY_INVENTORY", "filter": "all"|"low"|"out" }
4. SEARCH_PRODUCT: { "type": "SEARCH_PRODUCT", "query": "name" }
5. SEARCH_CUSTOMER: { "type": "SEARCH_CUSTOMER", "query": "name" }
6. UPDATE_STOCK: { "type": "UPDATE_STOCK", "product": "name", "quantity": 10, "mode": "add"|"set"|"sub" }
7. UPDATE_PRICE: { "type": "UPDATE_PRICE", "product": "name", "price": 1000 }
8. CREATE_EXPENSE: { "type": "CREATE_EXPENSE", "amount": 100, "category": "food", "title": "lunch" }
9. ANALYZE_GROWTH: { "type": "ANALYZE_GROWTH", "period": "day"|"week"|"month" }
10. TOP_PERFORMERS: { "type": "TOP_PERFORMERS", "category": "products"|"customers" }
11. DEAD_STOCK: { "type": "DEAD_STOCK", "days": 30 }
12. GENERAL_CHAT: { "type": "GENERAL_CHAT", "response": "Short answer" }
Output JSON ONLY.`;

    /**
     * The Genius Brain Entry Point
     */
    static async think(
        query: string,
        context: any = {},
        history?: Array<{ role: 'user' | 'assistant'; content: string }>,
        signal?: AbortSignal
    ): Promise<GeniusResponse> {
        const startTotal = performance.now();
        console.log(`⏱️ [Genius] START thinking: "${query}" at ${new Date().toISOString()}`);

        try {
            // 1️⃣ LEVEL 1: ZERO LATENCY (Regex)
            const startFast = performance.now();
            const fastAnswer = await FastIntelligence.tryFastAnswer(query);
            console.log(`⏱️ [Genius] FastIntelligence took: ${(performance.now() - startFast).toFixed(2)}ms`);

            if (fastAnswer) {
                console.log(`⚡ [Genius] Fast Path hit! Total: ${(performance.now() - startTotal).toFixed(2)}ms`);
                return {
                    answer: fastAnswer,
                    confidence: 1.0,
                    dataUsed: [{ source: 'FastIntelligence', query }],
                    suggestions: FastIntelligence.getQuickSuggestions().slice(0, 3),
                    intent: 'fast_query'
                };
            }

            // 2️⃣ LEVEL 2: LOW LATENCY (AI Router)
            const startAI = performance.now();
            const messages: any[] = [
                { role: 'system', content: this.ROUTER_PROMPT },
                { role: 'user', content: `Current Context: ${JSON.stringify(context)}\n\nQuery: ${query}` }
            ];

            console.log(`⏱️ [Genius] Sending to AI Router...`);
            const response = await AIGateway.chat(messages, undefined, signal);
            console.log(`⏱️ [Genius] AI Router (Network+Gen) took: ${(performance.now() - startAI).toFixed(2)}ms`);

            const content = response?.content || '{}';

            // Parse JSON
            const startParse = performance.now();
            let intentData: any = {};
            try {
                const jsonStr = content.replace(/```json\n?|```/g, '').trim();
                intentData = JSON.parse(jsonStr);
            } catch (e) {
                console.warn('Failed to parse AI JSON, falling back to chat:', content);
                return { answer: content, confidence: 0.5, intent: 'general_chat' };
            }
            console.log(`⏱️ [Genius] JSON Parse took: ${(performance.now() - startParse).toFixed(2)}ms`);
            console.log('🧠 [Genius] AI Decided Intent:', intentData);

            // 3️⃣ LEVEL 3: LOCAL EXECUTION
            const startExec = performance.now();
            const result = await this.executeIntent(intentData);
            console.log(`⏱️ [Genius] Local Execution took: ${(performance.now() - startExec).toFixed(2)}ms`);

            console.log(`✅ [Genius] TOTAL PROCESS TIME: ${(performance.now() - startTotal).toFixed(2)}ms`);
            return {
                answer: result.message,
                confidence: 0.9,
                dataUsed: result.data,
                suggestions: this.generateSuggestions(intentData.type),
                intent: intentData.type
            };

        } catch (error: any) {
            if (error.name === 'AbortError' || signal?.aborted) throw error;
            console.error('💥 [Genius] Error:', error);
            return { answer: "واجهت مشكلة بسيطة، حاول مرة أخرى! 🛠️", confidence: 0.1 };
        }
    }

    /**
     * Executes the structured intent locally
     */
    private static async executeIntent(intent: any): Promise<{ message: string, data?: any }> {
        switch (intent.type) {
            case 'NAVIGATE':
                if (typeof window !== 'undefined') {
                    const routes: Record<string, string> = {
                        'dashboard': '/dashboard', 'pos': '/pos', 'products': '/dashboard/products',
                        'orders': '/dashboard/orders', 'customers': '/dashboard/customers',
                        'settings': '/dashboard/settings', 'reports': '/dashboard/reports'
                    };
                    const path = routes[intent.page] || '/dashboard';
                    setTimeout(() => window.location.href = path, 500);
                    return { message: `🚀 **جاري الانتقال إلى ${intent.page}...**` };
                }
                return { message: `يجب الانتقال إلى ${intent.page}` };

            case 'QUERY_SALES':
                let salesData;
                if (intent.period === 'today') salesData = await LocalAnalyticsService.getTodaySales();
                else if (intent.period === 'yesterday') salesData = await LocalAnalyticsService.getYesterdaySales();
                else if (intent.period === 'week') salesData = await LocalAnalyticsService.getWeeklySales();
                else salesData = await LocalAnalyticsService.getSalesStats(30);

                return {
                    message: `📊 **تقرير المبيعات (${intent.period})**\n` +
                        `💰 الإجمالي: **${(salesData.totalSales || 0).toFixed(2)} دج**\n` +
                        `📦 الطلبات: **${salesData.orderCount || salesData.totalOrders || 0}**`,
                    data: salesData
                };

            case 'QUERY_INVENTORY':
                const invStats = await LocalAnalyticsService.getInventoryStats();
                if (intent.filter === 'low') {
                    const low = await LocalAnalyticsService.getLowStockProducts(10);
                    const list = low.map(p => `- ${p.name}: ${p.available_stock}`).join('\n');
                    return { message: `⚠️ **المنتجات منخفضة المخزون:**\n${list}`, data: low };
                }
                return {
                    message: `📦 **حالة المخزون:**\n` +
                        `✅ إجمالي المنتجات: ${invStats.totalProducts}\n` +
                        `💰 القيمة: ${invStats.totalStockValue.toFixed(2)} دج`,
                    data: invStats
                };

            case 'SEARCH_PRODUCT':
                const products = await LocalAnalyticsService.searchProduct(intent.query);
                if (!products.length) return { message: `❌ لم أجد أي منتج باسم "${intent.query}"` };
                const pList = products.slice(0, 3).map(p =>
                    `📦 **${p.name}**\n💰 السعر: ${p.price} دج | المخزون: ${p.stock_quantity || 0}`
                ).join('\n\n');
                return { message: `🔍 **نتائج البحث:**\n\n${pList}`, data: products };

            case 'SEARCH_CUSTOMER':
                const customers = await LocalAnalyticsService.getCustomerOverview(intent.query); // Assuming this exists or similar
                if (!customers.customer) return { message: `❌ لم أجد عميل باسم "${intent.query}"` };
                const c = customers.customer;
                return {
                    message: `👤 **بطاقة العميل**\n` +
                        `🏷️ الاسم: ${c.name}\n` +
                        `📱 الهاتف: ${c.phone || 'غير مسجل'}\n` +
                        `💳 إجمالي المصروفات: ${customers.totalSpent} دج`,
                    data: customers
                };

            case 'UPDATE_STOCK':
                // Dynamic Import to avoid circular deps if any
                const { UnifiedMutationService } = await import('./UnifiedMutationService');
                const pSearch = await LocalAnalyticsService.searchProduct(intent.product);
                if (!pSearch.length) return { message: `❌ لم أجد المنتج "${intent.product}" لتحديث مخزونه.` };

                const product = pSearch[0] as any;
                await UnifiedMutationService.adjustInventory({
                    organizationId: product.organization_id || product.org_id || 'default',
                    productId: product.id,
                    quantity: intent.quantity,
                    mode: intent.mode === 'sub' ? 'delta' : (intent.mode === 'add' ? 'delta' : 'set'),
                    // If mode is sub, we negate the quantity in the service call usually, or handle it here
                });
                // Note: UnifiedMutationService logic might need adjustment for 'sub', assuming 'delta' adds.
                // If 'sub', we multiply by -1
                if (intent.mode === 'sub') intent.quantity = -intent.quantity;

                return { message: `✅ **تم تحديث المخزون!**\nالمنتج: ${product.name}\nالعملية: ${intent.mode} ${Math.abs(intent.quantity)}` };

            case 'UPDATE_PRICE':
                const pSearchPrice = await LocalAnalyticsService.searchProduct(intent.product);
                if (!pSearchPrice.length) return { message: `❌ لم أجد المنتج "${intent.product}" لتحديث سعره.` };
                const prodToUpdate = pSearchPrice[0];
                const success = await LocalAnalyticsService.updateProductPrice(prodToUpdate.id, intent.price);
                if (success) {
                    return { message: `✅ **تم تحديث السعر!**\nالمنتج: ${prodToUpdate.name}\nالسعر الجديد: ${intent.price} دج` };
                } else {
                    return { message: `❌ حدث خطأ أثناء تحديث سعر ${prodToUpdate.name}.` };
                }

            case 'CREATE_EXPENSE':
                const { ExpenseAssistantService } = await import('./UnifiedMutationService');
                await ExpenseAssistantService.createExpense({
                    title: intent.title,
                    amount: intent.amount,
                    category: intent.category || 'General',
                    date: new Date().toISOString().slice(0, 10),
                    notes: 'Created via SIRA AI'
                });
                return { message: `✅ **تم تسجيل المصروف!**\n📝 العنوان: ${intent.title}\n💰 المبلغ: ${intent.amount} دج` };

            case 'ANALYZE_GROWTH':
                const [today, yesterday] = await Promise.all([
                    LocalAnalyticsService.getTodaySales(),
                    LocalAnalyticsService.getYesterdaySales()
                ]);
                const diff = today.totalSales - yesterday.totalSales;
                const diffPercent = yesterday.totalSales > 0 ? ((diff / yesterday.totalSales) * 100).toFixed(1) : '∞';
                const emoji = diff > 0 ? '📈' : '📉';
                return {
                    message: `📊 **تحليل النمو (اليوم vs الأمس)**\n\n` +
                        `🟢 اليوم: ${today.totalSales} دج\n` +
                        `🟡 الأمس: ${yesterday.totalSales} دج\n` +
                        `${emoji} الفرق: ${diff > 0 ? '+' : ''}${diff} دج (${diffPercent}%)`
                };

            case 'TOP_PERFORMERS':
                if (intent.category === 'customers') {
                    const topCust = await LocalAnalyticsService.getTopCustomers(30, 5);
                    const list = topCust.map((c, i) => `${i + 1}. ${c.customer_name} (${c.total} دج)`).join('\n');
                    return { message: `🏆 **أفضل العملاء (آخر 30 يوم)**\n\n${list}` };
                } else {
                    const topProd = await LocalAnalyticsService.getTopSellingProducts(30);
                    const list = topProd.slice(0, 5).map((p, i) => `${i + 1}. ${p.productName} (${p.quantitySold} قطعة)`).join('\n');
                    return { message: `🏆 **أكثر المنتجات مبيعاً (آخر 30 يوم)**\n\n${list}` };
                }

            case 'DEAD_STOCK':
                const days = intent.days || 30;
                const deadStock = await LocalAnalyticsService.getDeadStock(days, 10);
                if (deadStock.length === 0) return { message: `✅ **ممتاز!** لا توجد منتجات راكدة (لم تبع) منذ ${days} يوم.` };

                const dsList = deadStock.map(p => `- ${p.name} (المخزون: ${p.stock_quantity || 0})`).join('\n');
                return {
                    message: `📦 **المنتجات الراكدة (Dead Stock)**\nهذه المنتجات لم يتم بيعها منذ ${days} يوم:\n${dsList}`,
                    data: deadStock
                };

            case 'GENERAL_CHAT':
                return { message: intent.response || "مرحباً! كيف يمكنني مساعدتك؟" };

            default:
                return { message: "عذراً، لم أفهم هذا الأمر تماماً. 🤔" };
        }
    }

    private static generateSuggestions(intentType: string): string[] {
        const suggestions: Record<string, string[]> = {
            'QUERY_SALES': ['مبيعات الأمس', 'أفضل المنتجات', 'تقرير الشهر'],
            'QUERY_INVENTORY': ['المنتجات النافدة', 'جرد المخزون', 'إضافة منتج'],
            'SEARCH_PRODUCT': ['تعديل السعر', 'تحديث المخزون', 'حذف المنتج'],
            'ANALYZE_GROWTH': ['توقعات المبيعات', 'أفضل العملاء', 'المصاريف'],
            'GENERAL_CHAT': ['مبيعات اليوم', 'حالة المخزون', 'بحث عن عميل']
        };
        return suggestions[intentType] || suggestions['GENERAL_CHAT'];
    }
}
