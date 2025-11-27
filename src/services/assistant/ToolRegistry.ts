import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type { LocalProduct, LocalCustomer } from '@/database/localDb';

export interface Tool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required: string[];
    };
    execute: (args: any) => Promise<any>;
}

export const SIRA_TOOLS: Tool[] = [
    {
        name: 'get_sales_report',
        description: 'Get sales data for a specific period (today, week, month) or custom range.',
        parameters: {
            type: 'object',
            properties: {
                period: { type: 'string', enum: ['today', 'week', 'month', 'year'], description: 'The time period for the report' }
            },
            required: ['period']
        },
        execute: async ({ period }) => {
            switch (period) {
                case 'today': return await LocalAnalyticsService.getTodaySales();
                case 'week': return await LocalAnalyticsService.getWeeklySales();
                case 'month': return await LocalAnalyticsService.getMonthlySales();
                default: return await LocalAnalyticsService.getTodaySales();
            }
        }
    },
    {
        name: 'check_inventory',
        description: 'Check inventory status, low stock items, or search for specific products.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search term for a product (optional)' },
                filter: { type: 'string', enum: ['all', 'low_stock', 'out_of_stock'], description: 'Filter for inventory status' }
            },
            required: ['filter']
        },
        execute: async ({ query, filter }) => {
            if (query) {
                // ⚡ Delta Sync - نحتاج orgId، لكن هنا نستخدم البحث عبر LocalAnalytics
                const results = await LocalAnalyticsService.searchProduct(query);
                return results?.slice(0, 5) || [];
            }
            const stats = await LocalAnalyticsService.getInventoryStats();
            if (filter === 'low_stock') {
                const low = await LocalAnalyticsService.getLowStockProducts(10);
                return { stats, lowStockItems: low };
            }
            return stats;
        }
    },
    {
        name: 'get_customer_info',
        description: 'Find information about a customer by name or phone.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Customer name or phone number' }
            },
            required: ['query']
        },
        execute: async ({ query }) => {
            // ⚡ Delta Sync - البحث عن العملاء
            const { useAuth } = await import('@/context/AuthContext');
            // ملاحظة: في السياق الفعلي يجب تمرير orgId
            // هنا نستخدم طريقة بديلة للبحث
            const q = query.toLowerCase();
            try {
                const { supabase } = await import('@/lib/supabase');
                const { data } = await supabase
                    .from('customers')
                    .select('id, name, phone, email')
                    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
                    .limit(3);
                return data || [];
            } catch {
                return [];
            }
        }
    },
    {
        name: 'create_expense',
        description: 'Record a new business expense.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Expense title' },
                amount: { type: 'number', description: 'Amount in DZD' },
                category: { type: 'string', description: 'Category (e.g., Rent, Utilities)' },
                notes: { type: 'string', description: 'Optional notes' }
            },
            required: ['title', 'amount']
        },
        execute: async (args) => {
            const { ExpenseAssistantService } = await import('./UnifiedMutationService');
            await ExpenseAssistantService.createExpense({
                title: args.title,
                amount: args.amount,
                category: args.category || 'General',
                date: new Date().toISOString().slice(0, 10),
                notes: args.notes
            });
            return { success: true, message: `Expense "${args.title}" of ${args.amount} DZD recorded.` };
        }
    },
    {
        name: 'update_product_stock',
        description: 'Update the stock quantity of a product.',
        parameters: {
            type: 'object',
            properties: {
                productName: { type: 'string', description: 'Name of the product' },
                quantity: { type: 'number', description: 'New quantity or adjustment amount' },
                mode: { type: 'string', enum: ['set', 'delta'], description: 'Set absolute value or add/subtract' },
                color: { type: 'string', description: 'Color name if applicable' },
                size: { type: 'string', description: 'Size name if applicable' }
            },
            required: ['productName', 'quantity', 'mode']
        },
        execute: async ({ productName, quantity, mode, color, size }) => {
            const { UnifiedMutationService } = await import('./UnifiedMutationService');
            const results = await LocalAnalyticsService.searchProduct(productName);
            if (!results || results.length === 0) return { error: 'Product not found' };
            const product = results[0];

            let colorId = null;
            let sizeId = null;

            // Resolve variants if color/size provided
            if (color || size) {
                const colors = (product.colors || product.product_colors || []) as any[];
                if (color) {
                    const c = colors.find((x: any) => (x.name || x.color_name || '').toLowerCase() === color.toLowerCase());
                    if (c) {
                        colorId = c.id;
                        if (size) {
                            const sizes = (c.sizes || c.product_sizes || []) as any[];
                            const s = sizes.find((x: any) => (x.name || x.size_name || '').toLowerCase() === size.toLowerCase());
                            if (s) sizeId = s.id;
                        }
                    }
                }
            }

            await UnifiedMutationService.adjustInventory({
                organizationId: product.organization_id,
                productId: product.id,
                quantity: quantity,
                mode: mode,
                colorId,
                sizeId
            });
            return { success: true, message: `Stock for ${product.name} updated.` };
        }
    }
];
