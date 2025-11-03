import type { ParsedIntent } from './types';

type AIIntent = {
  intent: string;
  args?: Record<string, any>;
  confidence?: number;
};

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'x-ai/grok-4-fast';

export class AIIntentPlanner {
  static USE_AI = true; // استخدم الذكاء لاستخراج النية متعددة اللغات
  private static readonly TIMEOUT_MS = 1800; // مهلة قصيرة لتفادي تعليق الواجهة

  static async plan(userQuery: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, signal?: AbortSignal): Promise<ParsedIntent | null> {
    if (!this.USE_AI || !API_KEY) return null;
    if (signal?.aborted) throw new DOMException('Operation aborted', 'AbortError');
    try {
      const prompt = `You are a multilingual retail POS intent parser. Understand Arabic (Darija), French, English, and mixed slang by meaning (not keywords). Infer a SINGLE intent and arguments for a retail POS assistant.

CRITICAL RULES:
- If the user wants to change/modify/set/adjust stock (even with dialectal verbs like بدّل/غير/غيّر/نبدل/ta3...), choose intent: "update_stock".
- If ambiguous between "product_search" and "update_stock", ALWAYS prefer "update_stock".
- When intent is "update_stock" and details are missing (quantity/mode/color/size), leave them undefined. The UI will ask the user.
- Use "product_search" ONLY when the user asks to know the current stock or find a product, without implying a change.
- Parse the product name into args.productQuery; strip filler words like "تاع/ta3/نتاع/هذا/produit/product".
- Output STRICT JSON only. No explanations. No extra keys.

SCHEMA (must match exactly):
{
  "intent": "sales_today|sales_yesterday|sales_on_date|weekly_sales|monthly_sales|top_products|inventory_stats|low_stock|out_of_stock|product_search|update_stock|rename_product|customer_credit|customer_payment|debts_list|expense_create|expense_update|repair_create|repair_status|repair_update_status|repair_add_payment",
  "args": {
    "date": "yyyy-mm-dd",
    "days": 7,
    "productQuery": "string",
    "quantity": "+10 or -5 or 50",
    "mode": "delta|set",
    "colorName": "string",
    "sizeName": "string",
    "newName": "string",
    "customerQuery": "string",
    "amount": 500,
    "method": "cash|card|baridi|...",
    "title": "string",
    "category": "string",
    "payment_method": "cash|card|bank|mobile|other",
    "vendor_name": "string",
    "notes": "string"
  },
  "confidence": 0.0
}

EXAMPLES (very important):
- Q: "تعيش غير المخزون تاع هذا المنتج bcvbvcbcvb"
  A: {"intent":"update_stock","args":{"productQuery":"bcvbvcbcvb"},"confidence":0.90}
- Q: "حبيت نبدل المخزون نتاع iPhone 13"
  A: {"intent":"update_stock","args":{"productQuery":"iPhone 13"},"confidence":0.85}
- Q: "set stock Nike tshirt red L to 5"
  A: {"intent":"update_stock","args":{"productQuery":"Nike tshirt","colorName":"red","sizeName":"L","mode":"set","quantity":"5"},"confidence":0.95}
- Q: "change stock adidas hoodie +10"
  A: {"intent":"update_stock","args":{"productQuery":"adidas hoodie","mode":"delta","quantity":"+10"},"confidence":0.9}
- Q: "كم المخزون نتاع bcvbvcbcvb؟"
  A: {"intent":"product_search","args":{"productQuery":"bcvbvcbcvb"},"confidence":0.9}
- Q: "سجل مصروف 250 دج فئة توصيل اليوم"
  A: {"intent":"expense_create","args":{"title":"توصيل","amount":250,"category":"توصيل","date":"2025-01-20"},"confidence":0.9}
- Q: "غير مصروف أسامة كتوبي دا إلى 6000 دج"
  A: {"intent":"expense_update","args":{"title":"أسامة كتوبي دا","amount":6000,"timeframe":"month"},"confidence":0.9}
- Q: "العملاء الذين لديهم ديون عندي؟"
  A: {"intent":"debts_list","args":{},"confidence":0.9}
 - Q: "أضف تصليح لأسامة 0555123456 آيفون 13 شاشة مكسورة بسعر 5000"
  A: {"intent":"repair_create","args":{"customer_name":"أسامة","customer_phone":"0555123456","device_type":"آيفون 13","issue_description":"شاشة مكسورة","total_price":5000},"confidence":0.9}
 - Q: "شنو حالة جهاز الزبون 0555123456؟"
  A: {"intent":"repair_status","args":{"customerQuery":"0555123456"},"confidence":0.9}
 - Q: "خلي حالة تصليح أسامة مكتمل"
  A: {"intent":"repair_update_status","args":{"customerQuery":"أسامة","status":"مكتمل"},"confidence":0.9}
 - Q: "أضف دفعة 2000 لتصليح أسامة"
  A: {"intent":"repair_add_payment","args":{"customerQuery":"أسامة","amount":2000},"confidence":0.9}
`;

      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      
      // استخدم signal من الخارج إن وُجد، وإلا استخدم الداخلي
      const combinedSignal = signal || controller.signal;
      
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
          'X-Title': 'Bazaar Console - Intent Planner',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: prompt },
            ...(Array.isArray(history) ? history.slice(-4) : []),
            { role: 'user', content: `Query: ${userQuery}\nReturn JSON only.` }
          ],
          temperature: 0.1,
          max_tokens: 250
        }),
        signal: combinedSignal
      });
      clearTimeout(to);
      if (!resp.ok) return null;
      const data = await resp.json();
      const content: string = data?.choices?.[0]?.message?.content || '';
      const jsonText = (content.match(/\{[\s\S]*\}/) || [])[0] || '';
      if (!jsonText) return null;
      const parsed = JSON.parse(jsonText) as AIIntent;
      return this.mapToParsedIntent(parsed);
    } catch {
      return null;
    }
  }

  static async planTools(userQuery: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, signal?: AbortSignal): Promise<{ toolCalls: Array<{ name: string; args: any }>; ask?: any } | null> {
    if (!this.USE_AI || !API_KEY) return null;
    if (signal?.aborted) throw new DOMException('Operation aborted', 'AbortError');
    try {
      const toolDefs = `You are a multilingual POS planner. Choose tools to answer. Return ONLY JSON.
Tools:
- expense_summary(timeframe: today|week|month|year|range, start?: yyyy-mm-dd, end?: yyyy-mm-dd, categoryName?: string)
- expense_list(timeframe: today|week|month|year|range, start?: yyyy-mm-dd, end?: yyyy-mm-dd, categoryName?: string, limit?: number)
Rules:
- If user asks about expenses, pick one or both tools appropriately.
- If timeframe not specified, prefer month. If ambiguous category, include categoryName.
Schema:
{"toolCalls":[{"name":"expense_summary","args":{...}}]}`;
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      
      const combinedSignal = signal || controller.signal;
      
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
          'X-Title': 'Bazaar Console - Tool Planner',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: toolDefs },
            ...(Array.isArray(history) ? history.slice(-4) : []),
            { role: 'user', content: `Query: ${userQuery}\nReturn JSON only.` }
          ],
          temperature: 0.1,
          max_tokens: 200
        }),
        signal: combinedSignal
      });
      clearTimeout(to);
      if (!resp.ok) return null;
      const data = await resp.json();
      const content: string = data?.choices?.[0]?.message?.content || '';
      const jsonText = (content.match(/\{[\s\S]*\}/) || [])[0] || '';
      if (!jsonText) return null;
      const parsed = JSON.parse(jsonText);
      if (!parsed || !Array.isArray(parsed.toolCalls)) return null;
      return parsed;
    } catch { return null; }
  }

  private static mapToParsedIntent(ai: AIIntent): ParsedIntent | null {
    if (!ai || !ai.intent) return null;
    const t = ai.intent as string;
    const a = ai.args || {};

    const q = (s: any) => typeof s === 'string' ? s.trim() : '';
    const num = (v: any) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const m = v.match(/([+\-]?)(\d{1,9})/);
        if (m) {
          const n = parseInt(m[2], 10);
          return m[1] === '-' ? -n : n;
        }
      }
      return NaN;
    };

    switch (t) {
      case 'sales_today':
      case 'sales_yesterday':
      case 'weekly_sales':
      case 'monthly_sales':
      case 'inventory_stats':
      case 'low_stock':
      case 'out_of_stock':
        return { type: t as any };
      case 'sales_on_date': {
        const date = q(a.date);
        if (!date) return { type: 'sales_today' };
        return { type: 'sales_on_date', date } as any;
      }
      case 'top_products': {
        const days = Number(a.days) || 7;
        return { type: 'top_products', days } as any;
      }
      case 'product_search': {
        const productQuery = q(a.productQuery) || q(a.query) || '';
        return { type: 'product_search' } as any;
      }
      case 'update_stock': {
        const productQuery = q(a.productQuery) || '';
        const quantityParsed = num(a.quantity);
        const mode = q(a.mode) as 'delta' | 'set' | '';
        const colorName = q(a.colorName) || undefined;
        const sizeName = q(a.sizeName) || undefined;
        return {
          type: 'update_stock',
          productQuery,
          quantity: Number.isFinite(quantityParsed) ? quantityParsed : undefined,
          mode: mode === 'delta' || mode === 'set' ? mode : undefined,
          colorName,
          sizeName
        } as any;
      }
      case 'rename_product': {
        return {
          type: 'rename_product',
          productQuery: q(a.productQuery),
          newName: q(a.newName)
        } as any;
      }
      case 'customer_credit': {
        return { type: 'customer_credit', customerQuery: q(a.customerQuery) } as any;
      }
      case 'customer_payment': {
        const amount = Number(a.amount) || num(a.amount);
        return { type: 'customer_payment', customerQuery: q(a.customerQuery), amount: Number.isFinite(amount) ? amount : 0, method: q(a.method) } as any;
      }
      case 'expense_create': {
        const fields: any = {};
        const amt = Number(a.amount) || num(a.amount);
        if (q(a.title)) fields.title = q(a.title);
        if (Number.isFinite(amt)) fields.amount = amt;
        if (q(a.category)) fields.category = q(a.category);
        if (q(a.date)) fields.date = q(a.date);
        if (q(a.payment_method)) fields.payment_method = q(a.payment_method);
        if (q(a.vendor_name)) fields.vendor_name = q(a.vendor_name);
        if (q(a.notes)) fields.notes = q(a.notes);
        return { type: 'expense_create', fields } as any;
      }
      case 'expense_update': {
        const title = q(a.title);
        const amt = Number(a.amount) || num(a.amount);
        const timeframe = q((a as any).timeframe) as any;
        const start = q((a as any).start);
        const end = q((a as any).end);
        return { type: 'expense_update', fields: { title, amount: Number.isFinite(amt) ? amt : NaN, timeframe: timeframe as any, start, end } } as any;
      }
      case 'repair_create': {
        const fields: any = {};
        const tp = Number(a.total_price) || num(a.total_price);
        const pd = Number(a.paid_amount) || num(a.paid_amount);
        if (q(a.customer_name)) fields.customer_name = q(a.customer_name);
        if (q(a.customer_phone)) fields.customer_phone = q(a.customer_phone);
        if (q(a.device_type)) fields.device_type = q(a.device_type);
        if (q(a.issue_description)) fields.issue_description = q(a.issue_description);
        if (q(a.repair_location)) fields.repair_location = q(a.repair_location);
        if (Number.isFinite(tp)) fields.total_price = tp;
        if (Number.isFinite(pd)) fields.paid_amount = pd;
        if (q(a.payment_method)) fields.payment_method = q(a.payment_method);
        if (typeof a.price_to_be_determined_later !== 'undefined') fields.price_to_be_determined_later = !!a.price_to_be_determined_later;
        return { type: 'repair_create', fields } as any;
      }
      case 'repair_status': {
        return { type: 'repair_status', customerQuery: q((a as any).customerQuery) || q((a as any).query) } as any;
      }
      case 'repair_update_status': {
        const status = q((a as any).status);
        const customerQuery = q((a as any).customerQuery) || q((a as any).query);
        const notes = q((a as any).notes);
        return { type: 'repair_update_status', fields: { customerQuery, status, notes } } as any;
      }
      case 'repair_add_payment': {
        const amount = Number((a as any).amount) || num((a as any).amount);
        const customerQuery = q((a as any).customerQuery) || q((a as any).query);
        const method = q((a as any).method);
        return { type: 'repair_add_payment', fields: { customerQuery, amount: Number.isFinite(amount) ? amount : 0, method } } as any;
      }
      default:
        return null;
    }
  }
}
