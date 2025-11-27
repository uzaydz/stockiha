import type { ParsedIntent } from './types';

type AIIntent = {
  intent: string;
  args?: Record<string, any>;
  confidence?: number;
};

type AIMultiIntent = {
  intents: Array<{
    intent: string;
    args?: Record<string, any>;
    confidence?: number;
  }>;
};

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'tngtech/deepseek-r1t2-chimera:free'; // Using DeepSeek R1T2 Chimera

export class AIIntentPlanner {
  static USE_AI = true; // استخدم الذكاء لاستخراج النية متعددة اللغات
  private static readonly TIMEOUT_MS = 5000; // Increased timeout for GPT-5.1 reasoning mode

  /**
   * خطة متعددة النوايا - تكتشف عدة نوايا في استعلام واحد
   */
  static async planMulti(userQuery: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, signal?: AbortSignal): Promise<ParsedIntent[] | null> {
    if (!this.USE_AI || !API_KEY) return null;
    if (signal?.aborted) throw new DOMException('Operation aborted', 'AbortError');
    try {
      const prompt = `You are a multilingual retail POS intent parser. Understand Arabic (Darija), French, English, and mixed slang by meaning (not keywords). Detect ONE OR MORE intents in the user's query.

CRITICAL RULES:
- If the query contains multiple separate requests/questions, extract ALL of them as separate intents.
- Examples of multi-intent queries:
  * "وريني مبيعات اليوم وكريدي أحمد" → [sales_today, customer_credit]
  * "كم المخزون نتاع iPhone وشحال المصاريف اليوم" → [product_search, expense summary via tools]
  * "سجل مصروف 500 توصيل وأعطيني مبيعات الأسبوع" → [expense_create, weekly_sales]
- If there's only ONE intent, return array with one item.
- Use same intent types as single-intent parser.
- Output STRICT JSON only. No explanations.

SCHEMA (must match exactly):
{
  "intents": [
    {
      "intent": "sales_today|sales_yesterday|...|repair_add_payment",
      "args": {...},
      "confidence": 0.0
    }
  ]
}

EXAMPLES:
Q: "وريني مبيعات اليوم وكريدي أحمد"
A: {"intents":[{"intent":"sales_today","args":{},"confidence":0.9},{"intent":"customer_credit","args":{"customerQuery":"أحمد"},"confidence":0.9}]}

Q: "سجل مصروف 300 دج كهرباء وأعطيني أكثر المنتجات مبيعاً"
A: {"intents":[{"intent":"expense_create","args":{"title":"كهرباء","amount":300,"category":"كهرباء"},"confidence":0.9},{"intent":"top_products","args":{"days":7},"confidence":0.9}]}

Q: "كم المخزون نتاع iPhone؟"
A: {"intents":[{"intent":"product_search","args":{"productQuery":"iPhone"},"confidence":0.9}]}
`;

      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const combinedSignal = signal || controller.signal;

      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
          'X-Title': 'Bazaar Console - Multi Intent Planner',
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
          max_tokens: 400
        }),
        signal: combinedSignal
      });
      clearTimeout(to);
      if (!resp.ok) return null;
      const data = await resp.json();
      const content: string = data?.choices?.[0]?.message?.content || '';
      const jsonText = (content.match(/\{[\s\S]*\}/) || [])[0] || '';
      if (!jsonText) return null;
      const parsed = JSON.parse(jsonText) as AIMultiIntent;

      if (!parsed?.intents || !Array.isArray(parsed.intents)) return null;

      // تحويل كل نية إلى ParsedIntent
      const results: ParsedIntent[] = [];
      for (const intent of parsed.intents) {
        const mapped = this.mapToParsedIntent(intent);
        if (mapped) results.push(mapped);
      }

      return results.length > 0 ? results : null;
    } catch {
      return null;
    }
  }

  static async plan(userQuery: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, signal?: AbortSignal): Promise<ParsedIntent | null> {
    if (!this.USE_AI || !API_KEY) return null;
    if (signal?.aborted) throw new DOMException('Operation aborted', 'AbortError');

    // 🔥 PRE-CHECK: Detect obvious "add_customer_debt" cases before calling AI
    // This is a safety net for when AI fails to detect correctly
    const q = userQuery.toLowerCase();
    const hasAmount = /\d+/.test(userQuery);
    // Handle all forms of همزة: أ إ ا
    const hasBorrowingContext = /[اإأ]ستلف|سلف|[اأإ]خذ.*كريدي|took.*credit|borrowed|lent/i.test(userQuery);

    if (hasAmount && hasBorrowingContext) {
      // Extract customer name and amount
      const amountMatch = userQuery.match(/(\d+)\s*(دج|da|dzd)?/i);
      const amount = amountMatch ? parseInt(amountMatch[1], 10) : 0;

      // Extract customer query (remove common words) - handle all hamza forms
      let customerQuery = userQuery
        .replace(/لقد|[إاأ]ستلف[ىي]|مني|[اإأ]خذ|كريدي|سلف|دج|da|dzd|\d+/gi, '')
        .trim();

      if (amount > 0 && customerQuery) {
        console.log('[AIIntentPlanner] 🎯 Pre-check detected add_customer_debt:', { customerQuery, amount });
        return { type: 'add_customer_debt', customerQuery, amount } as any;
      }
    }

    try {
      const prompt = `You are a multilingual retail POS intent parser. Understand Arabic (Darija), French, English, and mixed slang by meaning (not keywords). Infer a SINGLE intent and arguments for a retail POS assistant.

CRITICAL RULES:
- If the user wants to change/modify/set/adjust stock (even with dialectal verbs like بدّل/غير/غيّر/نبدل/ta3...), choose intent: "update_stock".
- If ambiguous between "product_search" and "update_stock", ALWAYS prefer "update_stock".
- When intent is "update_stock" and details are missing (quantity/mode/color/size), leave them undefined. The UI will ask the user.
- Use "product_search" ONLY when the user asks to know the current stock or find a product, without implying a change.
- Parse the product name into args.productQuery; strip filler words like "تاع/ta3/نتاع/هذا/produit/product".
- DEBT RULES (CRITICAL - READ CAREFULLY):
  * IF user mentions BOTH (customer name + amount number), it's ALWAYS "add_customer_debt" or "customer_payment" - NEVER "customer_credit"
  * "customer_credit" = QUERY/VIEW existing debt (NO amount/number in query). Examples: "كم كريدي أحمد؟", "شحال دين علي؟", "how much does oussama owe?"
  * "add_customer_debt" = CREATE NEW debt (customer + amount + borrowing context like استلفى/أخذ/سلف). Examples: "استلفى مني أحمد 3000", "oussama took 5000", "سلف علي 2500", "أخذ كريدي"
  * "customer_payment" = RECORD payment (customer + amount + payment context like دفع/paid/سدد). Examples: "أحمد دفع 1000", "oussama paid 500"
  * KEY DISTINCTION: "لقد إستلفى مني oussama 3000 دج" = "add_customer_debt" (borrowing + amount), NOT "customer_credit"
- Output STRICT JSON only. No explanations. No extra keys.

SCHEMA (must match exactly):
{
  "intent": "sales_today|sales_yesterday|sales_on_date|weekly_sales|monthly_sales|top_products|inventory_stats|low_stock|out_of_stock|product_search|update_stock|rename_product|customer_credit|add_customer_debt|customer_payment|debts_list|expense_create|expense_update|repair_create|repair_status|repair_update_status|repair_add_payment",
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
- Q: "لقد استلفى مني oussama 3000 دج"
  A: {"intent":"add_customer_debt","args":{"customerQuery":"oussama","amount":3000},"confidence":0.95}
- Q: "أحمد أخذ كريدي 5000"
  A: {"intent":"add_customer_debt","args":{"customerQuery":"أحمد","amount":5000},"confidence":0.95}
- Q: "سلف علي 2500 دج"
  A: {"intent":"add_customer_debt","args":{"customerQuery":"علي","amount":2500},"confidence":0.95}
- Q: "كم كريدي oussama؟"
  A: {"intent":"customer_credit","args":{"customerQuery":"oussama"},"confidence":0.9}
- Q: "شحال الدين نتاع أحمد؟"
  A: {"intent":"customer_credit","args":{"customerQuery":"أحمد"},"confidence":0.9}
- Q: "كم رصيد علي؟"
  A: {"intent":"customer_credit","args":{"customerQuery":"علي"},"confidence":0.9}
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

IMPORTANT REMINDER:
- "لقد إستلفى مني [name] [amount] دج" → ALWAYS "add_customer_debt" (NOT "customer_credit")
- "كم كريدي [name]؟" → "customer_credit"
- Key difference: Does the query contain an AMOUNT? If YES and borrowing context → "add_customer_debt"
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
      case 'add_customer_debt': {
        const amount = Number(a.amount) || num(a.amount);
        return { type: 'add_customer_debt', customerQuery: q(a.customerQuery), amount: Number.isFinite(amount) ? amount : 0 } as any;
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
