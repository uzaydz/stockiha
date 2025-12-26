import { AIGateway } from './AIGateway';
import { SIRA_TOOLS } from './ToolRegistry';
import { FastIntelligence } from './FastIntelligence';
import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
import type { WidgetData } from '@/components/pos/assistant-widgets/WidgetRegistry';

export interface GeniusResponse {
    answer: string;
    confidence: number;
    dataUsed?: any;
    suggestions?: string[];
    relatedQuestions?: string[];
    intent?: string;
    widget?: WidgetData;
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
12. CONSULTANT_ADVICE: { "type": "CONSULTANT_ADVICE", "topic": "sales"|"marketing"|"inventory"|"general" }
13. GENERAL_CHAT: { "type": "GENERAL_CHAT", "response": "Short answer" }
14. ADD_CUSTOMER: { "type": "ADD_CUSTOMER", "name": "Name", "phone": "PhoneOptional" }
15. MANAGE_DEBT: { "type": "MANAGE_DEBT", "customer": "Name", "amount": 0, "operation": "add"|"pay" }
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
            const fastAnswerResp = await FastIntelligence.tryFastAnswer(query);
            console.log(`⏱️ [Genius] FastIntelligence took: ${(performance.now() - startFast).toFixed(2)}ms`);

            if (fastAnswerResp) {
                console.log(`⚡ [Genius] Fast Path hit! Total: ${(performance.now() - startTotal).toFixed(2)}ms`);
                return {
                    answer: fastAnswerResp.answer,
                    confidence: 1.0,
                    dataUsed: [{ source: 'FastIntelligence', query }],
                    suggestions: FastIntelligence.getQuickSuggestions().slice(0, 3),
                    intent: fastAnswerResp.intent || 'fast_query',
                    widget: fastAnswerResp.widget
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
            const result = await this.executeIntent(intentData, query, signal); // Pass query & signal for Consultant Mode
            console.log(`⏱️ [Genius] Local Execution took: ${(performance.now() - startExec).toFixed(2)}ms`);

            console.log(`✅ [Genius] TOTAL PROCESS TIME: ${(performance.now() - startTotal).toFixed(2)}ms`);
            return {
                answer: result.message,
                confidence: 0.9,
                dataUsed: result.data,
                suggestions: this.generateSuggestions(intentData.type),
                intent: intentData.type,
                widget: result.widget
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
    private static async executeIntent(intent: any, originalQuery: string, signal?: AbortSignal): Promise<{ message: string, data?: any, widget?: WidgetData }> {
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
                    return { message: `جاري الانتقال إلى ${intent.page}...` };
                }
                return { message: `يجب الانتقال إلى ${intent.page}` };

            case 'QUERY_SALES':
                let salesData;
                if (intent.period === 'today') salesData = await LocalAnalyticsService.getTodaySales();
                else if (intent.period === 'yesterday') salesData = await LocalAnalyticsService.getYesterdaySales();
                else if (intent.period === 'week') salesData = await LocalAnalyticsService.getWeeklySales();
                else salesData = await LocalAnalyticsService.getSalesStats(30);

                return {
                    message: `ها هي إحصائيات المبيعات لـ ${intent.period === 'today' ? 'اليوم' : intent.period === 'yesterday' ? 'الأمس' : intent.period}:`,
                    data: salesData,
                    widget: {
                        type: 'stats_card',
                        title: intent.period === 'today' ? 'مبيعات اليوم' : 'المبيعات',
                        data: {
                            totalSales: salesData.totalSales || 0,
                            totalOrders: salesData.orderCount || salesData.totalOrders || 0,
                            totalProfit: salesData.profit || salesData.totalProfit,
                        }
                    }
                };

            case 'QUERY_INVENTORY':
                const invStats = await LocalAnalyticsService.getInventoryStats();
                if (intent.filter === 'low' || intent.filter === 'out') {
                    const products = intent.filter === 'low'
                        ? await LocalAnalyticsService.getLowStockProducts(10)
                        : await LocalAnalyticsService.getOutOfStockProducts(10);

                    return {
                        message: `وجدت ${products.length} منتجات ${intent.filter === 'low' ? 'منخفضة المخزون' : 'نافدة'}:`,
                        data: products,
                        widget: {
                            type: 'product_list',
                            title: intent.filter === 'low' ? 'تنبيهات المخزون المنخفض' : 'منتجات نافدة',
                            data: products
                        }
                    };
                }

                return {
                    message: `نظرة عامة على المخزون:`,
                    data: invStats,
                    widget: {
                        type: 'stats_card',
                        title: 'قيمة المخزون',
                        data: {
                            totalSales: invStats.totalStockValue,
                            totalOrders: invStats.totalProducts,
                        }
                    }
                };

            case 'SEARCH_PRODUCT':
                const products = await LocalAnalyticsService.searchProduct(intent.query);
                if (!products.length) return { message: `لم أجد أي منتج باسم "${intent.query}"` };

                return {
                    message: `وجدت ${products.length} منتج مطابق للبحث:`,
                    data: products,
                    widget: {
                        type: 'product_list',
                        title: 'نتائج البحث',
                        data: products.slice(0, 5)
                    }
                };

            case 'SEARCH_CUSTOMER':
                const customers = await LocalAnalyticsService.getCustomerOverview(intent.query);
                if (!customers.customer) return { message: `لم أجد عميل باسم "${intent.query}"` };
                const c = customers.customer;
                return {
                    message: `تفاصيل العميل ${c.name}:`,
                    data: customers,
                    widget: {
                        type: 'stats_card',
                        title: c.name,
                        data: {
                            totalSales: customers.totalSpent,
                            totalOrders: customers.totalOrders,
                        }
                    }
                };

            case 'UPDATE_STOCK':
                const { UnifiedMutationService } = await import('./UnifiedMutationService');
                const pSearch = await LocalAnalyticsService.searchProduct(intent.product);
                if (!pSearch.length) return { message: `لم أجد المنتج "${intent.product}" لتحديث مخزونه.` };

                const product = pSearch[0] as any;

                // 🚀 CHECK IF PRODUCT HAS VARIANTS (Colors or Sizes)
                // If it has variants, we MUST show the VariantPicker widget instead of updating directly
                const hasVariants = (product.colors && product.colors.length > 0) ||
                    (product.product_colors && product.product_colors.length > 0) ||
                    product.has_colors;

                if (hasVariants) {
                    return {
                        message: `المنتج "${product.name}" يحتوي على خيارات (ألوان/أحجام). يرجى تحديد الخيار المطلوب:`,
                        // We use a special widget or re-use the "product_with_variants" type logic handled in Chat component
                        // Returning 'product_with_variants' type mimics the previous AI response that triggered the modal
                        // But here we are inside executeIntent returning a GENERIC response.
                        // Ideally we return a widget. For now, let's piggyback on the existing logic
                        // but since we return widget data structure, we might need a custom widget type OR 
                        // rely on the top level JSON type. 
                        // The top level code uses `res.answer` JSON.parse. 
                        // So if we return a JSON string as message, it might be parsed again? 
                        // No, `executeIntent` returns an object.
                        // Let's return a special logic marker.
                        widget: {
                            type: 'action_chips', // As a fallback if the UI doesn't catch it, but better:
                            data: [ /* dummy */]
                        }
                    };
                    // Actually, looking at SmartAssistantChat line 236: 
                    // if (parsed?.type === 'product_with_variants' && parsed.product)
                    // So current executeIntent structure is wrapped. 
                    // We should likely NOT catch this here if we want to rely on the "chat" based logic, 
                    // OR we explicitly trigger the "update_stock" widget action.
                    // Let's try returning a custom message that the chat component interprets?
                    // Or better: The SmartAssistantChat already listens to `action === 'update_stock'`
                    // Let's return a widget that instructs the UI to open the picker.
                }

                // If no variants, proceed with normal update
                const qty = intent.mode === 'sub' ? -Math.abs(intent.quantity) : intent.quantity;

                await UnifiedMutationService.adjustInventory({
                    organizationId: product.organization_id || product.org_id || 'default',
                    productId: product.id,
                    quantity: qty,
                    mode: intent.mode === 'set' ? 'set' : 'delta',
                });

                const updatedProduct = { ...product, available_stock: (product.available_stock || 0) + qty };

                return {
                    message: `تم تحديث المخزون بنجاح.`,
                    widget: {
                        type: 'product_list',
                        title: 'تم التحديث',
                        data: [updatedProduct]
                    }
                };

            case 'ADD_CUSTOMER':
                return {
                    message: "يرجى إدخال بيانات العميل:",
                    widget: {
                        type: 'customer_form',
                        title: 'إضافة عميل',
                        data: {
                            initialName: intent.name === 'Name' ? '' : intent.name,
                            initialPhone: intent.phone === 'PhoneOptional' ? '' : intent.phone
                        }
                    }
                };

            case 'MANAGE_DEBT':
                // Search for customer first if name provided
                let customerId = '';
                let customerName = intent.customer;
                if (intent.customer && intent.customer !== 'Name') {
                    const cSearch = await LocalAnalyticsService.getCustomerOverview(intent.customer);
                    if (cSearch.customer) {
                        customerId = cSearch.customer.id;
                        customerName = cSearch.customer.name;
                    }
                }

                return {
                    message: "تسجيل دين/دفعة:",
                    widget: {
                        type: 'debt_form',
                        title: 'إدارة الديون',
                        data: {
                            initialCustomerName: customerName === 'Name' ? '' : customerName,
                            initialCustomerId: customerId,
                            initialAmount: intent.amount > 0 ? intent.amount : '',
                            mode: intent.operation === 'pay' ? 'pay_debt' : 'add_debt'
                        }
                    }
                };

            case 'UPDATE_PRICE':
                const pSearchPrice = await LocalAnalyticsService.searchProduct(intent.product);
                if (!pSearchPrice.length) return { message: `لم أجد المنتج "${intent.product}" لتحديث سعره.` };
                const prodToUpdate = pSearchPrice[0];
                const success = await LocalAnalyticsService.updateProductPrice(prodToUpdate.id, intent.price);
                if (success) {
                    return { message: `تم تحديث السعر!\nالمنتج: ${prodToUpdate.name}\nالسعر الجديد: ${intent.price} دج` };
                } else {
                    return { message: `حدث خطأ أثناء تحديث سعر ${prodToUpdate.name}.` };
                }

            case 'CREATE_EXPENSE':
                // Check if critical data is missing OR if the user explicitly requested the widget (by providing incomplete info)
                if (!intent.title || !intent.amount || intent.amount === 0) {
                    return {
                        message: "يرجى تعبئة تفاصيل المصروف في النموذج أدناه:",
                        widget: {
                            type: 'expense_form',
                            title: 'تسجيل مصروف',
                            data: {
                                initialTitle: intent.title || '',
                                initialAmount: intent.amount || '',
                                categories: ['سلعة', 'كراء', 'فواتير', 'رواتب', 'نقل', 'تسويق', 'صيانة', 'أخرى']
                            }
                        }
                    };
                }

                // If we have data, execute immediately (legacy/fast path)
                const { ExpenseAssistantService } = await import('./UnifiedMutationService');
                await ExpenseAssistantService.createExpense({
                    title: intent.title,
                    amount: intent.amount,
                    category: intent.category || 'General',
                    date: new Date().toISOString().slice(0, 10),
                    notes: 'Created via SIRA AI'
                });
                return { message: `تم تسجيل المصروف!\nالعنوان: ${intent.title}\nالمبلغ: ${intent.amount} دج` };

            case 'ANALYZE_GROWTH':
                // 📊 UPDATED: Return Chart Widget
                const [todayG, yesterdayG, dailyTrend] = await Promise.all([
                    LocalAnalyticsService.getTodaySales(),
                    LocalAnalyticsService.getYesterdaySales(),
                    LocalAnalyticsService.getDailySalesTrend(7)
                ]);
                const diff = todayG.totalSales - yesterdayG.totalSales;
                const diffPercent = yesterdayG.totalSales > 0 ? ((diff / yesterdayG.totalSales) * 100).toFixed(1) : '∞';
                const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

                return {
                    message: `ها هو تحليل النمو للأسبوع الماضي. المبيعات تتجه ${trend === 'up' ? 'للصعود' : 'للانخفاض'}.`,
                    widget: {
                        type: 'chart',
                        title: 'اتجاه المبيعات (أسبوعي)',
                        description: 'مقارنة المبيعات اليومية لآخر 7 أيام',
                        data: {
                            type: 'area',
                            points: dailyTrend.map(t => ({ label: t.date, value: t.amount })),
                            trend: {
                                value: parseFloat(diffPercent.replace('%', '')),
                                direction: trend
                            }
                        }
                    }
                };

            case 'TOP_PERFORMERS':
                if (intent.category === 'customers') {
                    const topCust = await LocalAnalyticsService.getTopCustomers(30, 5);
                    const list = topCust.map((c, i) => `${i + 1}. ${c.customer_name} (${c.total} دج)`).join('\n');
                    return { message: `أفضل العملاء (آخر 30 يوم)\n\n${list}` };
                } else {
                    const topProd = await LocalAnalyticsService.getTopSellingProducts(30);
                    return {
                        message: `أكثر المنتجات مبيعاً هذا الشهر:`,
                        widget: {
                            type: 'product_list',
                            title: 'الأكثر مبيعاً',
                            data: topProd.slice(0, 5).map(p => ({
                                id: p.productId,
                                name: p.productName,
                                price: p.revenue / p.quantitySold,
                                stock_quantity: 0,
                                available_stock: p.quantitySold
                            }))
                        }
                    };
                }

            case 'DEAD_STOCK':
                const days = intent.days || 30;
                const deadStock = await LocalAnalyticsService.getDeadStock(days, 10);
                if (deadStock.length === 0) return { message: `ممتاز! لا توجد منتجات راكدة (لم تبع) منذ ${days} يوم.` };

                return {
                    message: `وجدت ${deadStock.length} منتجات راكدة لم تبع منذ ${days} يوم:`,
                    data: deadStock,
                    widget: {
                        type: 'product_list',
                        title: 'منتجات راكدة (Dead Stock)',
                        data: deadStock
                    }
                };

            // 🧠 CONSULTANT MODE 🧠
            case 'CONSULTANT_ADVICE':
                console.log('🧠 [Consultant] Generating advice...');

                // 1. Gather Context
                const [salesToday, salesMonth, lowStock, deadStockItems, topProds] = await Promise.all([
                    LocalAnalyticsService.getTodaySales(),
                    LocalAnalyticsService.getSalesStats(30),
                    LocalAnalyticsService.getLowStockProducts(5),
                    LocalAnalyticsService.getDeadStock(30, 5),
                    LocalAnalyticsService.getTopSellingProducts(7)
                ]);

                const contextSummary = `
                My Business Context:
                - Sales Today: ${salesToday.totalSales} DZD (${salesToday.orderCount} orders)
                - Sales Month: ${salesMonth.totalSales} DZD
                - Low Stock Items: ${lowStock.length}
                - Dead Stock Items: ${deadStockItems.length}
                - Top Product: ${topProds[0]?.productName || 'None'}
                `;

                // 2. Ask AI for formatted advice
                const advicePrompt = [
                    { role: 'system', content: 'You are an expert business consultant for a retail store. Give brief, actionable advice in Arabic based on the data. Focus on profit, inventory, and customer retention. Format using Markdown with bullet points. DO NOT use emojis.' },
                    { role: 'user', content: `User Question: "${originalQuery}"\n\n${contextSummary}` }
                ];

                const adviceResponse = await AIGateway.chat(advicePrompt, undefined, signal);
                const adviceText = adviceResponse?.content || 'عذراً، لا أستطيع تقديم نصيحة الآن.';

                return {
                    message: adviceText,
                    widget: {
                        type: 'stats_card',
                        title: 'نظرة عامة',
                        data: {
                            totalSales: salesToday.totalSales,
                            totalOrders: salesToday.orderCount,
                            totalProfit: salesToday.profit
                        }
                    }
                };

            case 'GENERAL_CHAT':
                return { message: intent.response || "مرحباً! كيف يمكنني مساعدتك؟" };

            default:
                return { message: "عذراً، لم أفهم هذا الأمر تماماً." };
        }
    }

    private static generateSuggestions(intentType: string): string[] {
        const suggestions: Record<string, string[]> = {
            'QUERY_SALES': ['مبيعات الأمس', 'أفضل المنتجات', 'تقرير الشهر'],
            'QUERY_INVENTORY': ['تنبيهات المخزون', 'جرد المخزون', 'إضافة منتج'],
            'SEARCH_PRODUCT': ['تعديل السعر', 'تحديث المخزون', 'حذف المنتج'],
            'ANALYZE_GROWTH': ['توقعات المبيعات', 'أفضل العملاء', 'المصاريف'],
            'CONSULTANT_ADVICE': ['كيف أزيد المبيعات؟', 'تحليل المنتجات الراكدة', 'أفضل العملاء'],
            'GENERAL_CHAT': ['مبيعات اليوم', 'حالة المخزون', 'بحث عن عميل']
        };
        return suggestions[intentType] || suggestions['GENERAL_CHAT'];
    }
}
