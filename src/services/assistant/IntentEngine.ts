import { ParsedIntent } from './types';

function normalizeArabic(input: string): string {
  try {
    let t = (input || '').toString().toLowerCase();
    t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
    t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
    t = t.replace(/\u0624/g, '\u0648');
    t = t.replace(/\u0626/g, '\u064a');
    t = t.replace(/\u0629/g, '\u0647');
    t = t.replace(/\u0649/g, '\u064a');
    t = t.replace(/[^\u0600-\u06FFa-z0-9\s:+\-]/g, ' ');
    return t.replace(/\s+/g, ' ').trim();
  } catch {
    return (input || '').toString().toLowerCase();
  }
}

function normalizeDigits(s: string): string {
  const map: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return (s || '').replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

function extractISODate(text: string): string | null {
  const digits = normalizeDigits(text);
  const m = digits.match(/(20\d{2})[-\/.](0[1-9]|1[0-2])[-\/.](0[1-9]|[12]\d|3[01])/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

export const IntentEngine = {
  parse(query: string): ParsedIntent {
    const raw = (query || '').trim();
    const text = normalizeArabic(raw);
    const digits = normalizeDigits(raw);

    // مبيعات اليوم/الأمس
    if (/\b(اليوم|نهار اليوم|اليوم\s*?)/.test(text) && /بيع|مبيعات|ربح|مداخيل/.test(text)) {
      return { type: 'sales_today' } as ParsedIntent;
    }
    if (/\b(الامس|أمس|البارح)/.test(text) && /بيع|مبيعات|ربح|مداخيل/.test(text)) {
      return { type: 'sales_yesterday' } as ParsedIntent;
    }
    const iso = extractISODate(raw);
    if (iso && /بيع|مبيعات|ربح|مداخيل/.test(text)) {
      return { type: 'sales_on_date', date: iso } as ParsedIntent;
    }

    // هذا الأسبوع/هذا الشهر
    if (/\b(الاسبوع|الأسبوع|هذا الاسبوع|هذا الأسبوع)/.test(text) && /بيع|مبيعات|ربح|مداخيل/.test(text)) {
      return { type: 'weekly_sales' } as ParsedIntent;
    }
    if (/\b(الشهر|هذا الشهر)/.test(text) && /بيع|مبيعات|ربح|مداخيل/.test(text)) {
      return { type: 'monthly_sales' } as ParsedIntent;
    }

    // أفضل المنتجات
    if (/افضل|اكثر|top|الاكتر|الأكثر/.test(text) && /منتج|منتجات/.test(text)) {
      const m = digits.match(/(\d{1,3})\s*(يوم|ايام|أيام|day|days)/);
      const days = m ? parseInt(m[1], 10) : 7;
      return { type: 'top_products', days } as ParsedIntent;
    }

    // المخزون
    if (/\b(مخزون|المخزون|stock|inventory)\b/.test(text) && /(حاله|وضع|وضعية|stat|stats|احصائيات)/.test(text)) {
      return { type: 'inventory_stats' } as ParsedIntent;
    }
    if (/ناقص|قليل|منخفض/.test(text) && /مخزون|منتجات/.test(text)) {
      return { type: 'low_stock' } as ParsedIntent;
    }
    if (/نفد|منتهي|انتهى/.test(text) && /مخزون|منتجات/.test(text)) {
      return { type: 'out_of_stock' } as ParsedIntent;
    }

    // قائمة العملاء ذوي الديون (fallback محلي)
    if (/(ديون|دين|كريدي|الكريدي|مديون)/.test(text) && /(عملاء|العملاء|clients|customers)/.test(text)) {
      return { type: 'debts_list' } as ParsedIntent;
    }

    // تعديل مخزون (لهجات ولغات متعددة)
    const changeVerb = /(تعديل|عدل|اضبط|زود|نقص|زِد|انقص|غير|بدل|بدّل|غيّر|set|increase|decrease|update|change|modifier|changer|maj)/;
    if (changeVerb.test(text) && /(مخزون|المخزون|stock)/.test(text)) {
      // استخراج الكمية والنمط
      const mQty = digits.match(/([+\-]?)\s*(\d{1,7})/);
      const qtyRaw = mQty ? parseInt(mQty[2], 10) : undefined;
      const sign = mQty?.[1] || '';
      const mode: 'delta' | 'set' | undefined = sign ? 'delta' : (/(الى|إلى|اجعله|اجعل|set)/.test(text) ? 'set' : undefined);
      const qty = qtyRaw != null ? (sign === '-' ? -Math.abs(qtyRaw) : Math.abs(qtyRaw)) : undefined;
      // استخراج اللون والمقاس بالاسم
      const colorMatch = raw.match(/(?:لون|اللون)\s+([^\s]+)\b/);
      const sizeMatch = raw.match(/(?:مقاس|المقاس)\s+([^\s]+)\b/);
      // اسم المنتج: حذف الكلمات الشائعة
      const productQuery = raw
        .replace(/([+\-]?\d{1,7})/g, '')
        .replace(/(تحديث|تعديل|عدل|اضبط|غير|بدل|بدّل|غيّر|set|increase|decrease|update|change|modifier|changer|maj|stock|المخزون|مخزون|تاع|ta3|الى|إلى|اجعل|اجعله|منتج|المنتج|product|produit|هذا|هاذا|هذاك|ce|cet|اللون|مقاس)/gi, '')
        .trim();
      return {
        type: 'update_stock',
        productQuery,
        quantity: qty,
        mode: mode || (qty != null ? 'delta' : undefined),
        colorName: colorMatch ? colorMatch[1] : undefined,
        sizeName: sizeMatch ? sizeMatch[1] : undefined
      } as ParsedIntent;
    }

    // إعادة تسمية منتج
    if (/غير\s+اسم\s+منتج|تغيير\s+اسم\s+منتج|rename\s+product/i.test(text)) {
      // صيغة: غير اسم منتج X إلى Y
      const m = raw.match(/(?:غير|تغيير)\s+اسم\s+منتج\s+(.+?)\s+(?:الى|إلى|to)\s+(.+)/i);
      if (m) {
        return { type: 'rename_product', productQuery: m[1].trim(), newName: m[2].trim() };
      }
    }

    // كريدي العميل
    if (/(كريدي|دين|مديون)/.test(text) && /(عميل|العميل)/.test(text) && /(كم|ماهو|قداش|قديش|رصيد|متبقي)/.test(text)) {
      const q = raw.replace(/(كم|ماهو|قداش|قديش|رصيد|متبقي|الكريدي|كريدي|دين|مديون|العميل|عميل|لدى|عند)/gi, '').trim();
      return { type: 'customer_credit', customerQuery: q } as ParsedIntent;
    }

    // دفعة للعميل
    if (/(دفع|سدد|سداد|خلص)/.test(text) && /(العميل|عميل)/.test(text)) {
      const amountMatch = digits.match(/(\d{1,10})\s*(?:دج|dzd|da|dinars|دينار)?/i);
      const amount = amountMatch ? parseInt(amountMatch[1], 10) : NaN;
      const cleaned = raw.replace(/(دفع|سدد|سداد|خلص|العميل|عميل|مبلغ|قيمه|قيمة|ب|بـ|قدر)/gi, '').trim();
      return { type: 'customer_payment', customerQuery: cleaned, amount: Number.isFinite(amount) ? amount : 0 } as ParsedIntent;
    }

    // بحث منتج عادي
    if (/^(ابحث|بحث|وين|وينو|اين)/.test(text) || /منتج/.test(text)) {
      const term = raw.replace(/(ابحث|بحث|عن|على|على|وين|وينو|اين|منتج)/gi, '').trim();
      if (term) return { type: 'product_search', } as ParsedIntent;
    }

    // مصروف (fallback بسيط): كلمات مثل سجل مصروف/مصروف/صرف + قيمة
    if (/(مصروف|صرف|سجل\s*مصروف|expense)/.test(text)) {
      // إذا كان يحتوي "إلى" + قيمة → تحديث مصروف، وإلا إنشاء
      const amt = (digits.match(/(\d{1,9}(?:[\.,]\d{1,2})?)/) || [])[1];
      const amount = amt ? parseFloat(amt.replace(',', '.')) : undefined;
      if (/\b(الى|إلى|to)\b/.test(text) && amount) {
        // استخرج عنوان تقريبي بحذف كلمات عامة
        const title = raw
          .replace(/(غير|تغيير|عدل|اضبط|مصروف|صرف|الى|إلى|to|اجعله|اجعل|دج|da|dzd|دينار)/gi, '')
          .replace(/\d+[\.,]?\d*/g, '')
          .trim();
        return { type: 'expense_update', fields: { title, amount, timeframe: 'month' } } as any;
      }
      return { type: 'expense_create', fields: { amount } } as any;
    }

    // تصليحات - إنشاء طلب جديد (كلمات: سجل/أضف/إنشاء + تصليح/جهاز)
    if (/(تصليح|اصلاح|إصلاح|service|repair)/.test(text) && /(سجل|اضف|أضف|انشئ|إنشاء|create|add)/.test(text)) {
      // محاولة استخراج بعض الحقول: هاتف، جهاز، سعر، دفعة
      const phone = (digits.match(/(0\d{9,10}|\+?\d{10,14})/) || [])[1];
      const amt = (digits.match(/(\d{3,10})\s*(?:دج|da|dzd|دينار)?/) || [])[1];
      const total = amt ? parseInt(amt, 10) : undefined;
      // استخرج نوع الجهاز تقريبا بعد كلمة مثل جهاز/type
      const deviceMatch = raw.match(/(?:جهاز|type|نوع)\s+([^\n\r]+)/i);
      const device_type = deviceMatch ? deviceMatch[1].split(/\s+/).slice(0,4).join(' ') : undefined;
      // الاسم: احذف كلمات معروفة
      const name = raw
        .replace(/(سجل|أضف|اضف|انشئ|إنشاء|create|add|طلب|تصليح|إصلاح|اصلاح|جهاز|نوع|type|هاتف|رقم|phone|tel|بسعر|سعر|دج|da|dzd)/gi, '')
        .replace(/\d+/g, '')
        .trim();
      return {
        type: 'repair_create',
        fields: {
          customer_name: name || undefined,
          customer_phone: phone || undefined,
          device_type: device_type || undefined,
          total_price: total,
        }
      } as any;
    }

    // حالة التصليح - استعلام عن حالة جهاز باسم/هاتف
    if (/(حاله|حالة|وين|وصلت|تتبع|status|track)/.test(text) && /(جهاز|تصليح|إصلاح|repair)/.test(text)) {
      const q = raw.replace(/(ما|ماهي|ماهيش|شنو|حالة|وين|وصلت|تتبع|status|track|جهاز|تصليح|إصلاح|للعميل|عميل|باسم|برقم|الهاتف|phone|tel|الزبون)/gi, '').trim();
      return { type: 'repair_status', customerQuery: q || raw } as any;
    }

    // تغيير حالة التصليح - كلمات: خلي/اجعل/غير + الحالة
    if (/(خليها|خليه|خلي|اجعل|اجعله|غير|بدل|بدّل|غيّر|set|change)/.test(text) && /(حاله|حالة|status)/.test(text) && /(تصليح|جهاز|طلب)/.test(text)) {
      const statusMap: Record<string,string> = {
        'مكتمل': 'مكتمل', 'كمل': 'مكتمل', 'جاهز': 'مكتمل', 'تم': 'مكتمل',
        'قيد الانتظار': 'قيد الانتظار', 'انتظار': 'قيد الانتظار',
        'جاري التصليح': 'جاري التصليح', 'تصليح': 'جاري التصليح', 'شغال': 'جاري التصليح',
        'معلق': 'معلق', 'وقف': 'معلق',
        'ملغي': 'ملغي', 'الغ': 'ملغي', 'الغاء': 'ملغي',
        'تم الاستلام': 'تم الاستلام', 'استلام': 'تم الاستلام'
      };
      const statusCandidates = Object.keys(statusMap).filter(k => new RegExp(k, 'i').test(raw));
      const status = statusCandidates.length ? statusMap[statusCandidates[0]] : '';
      const cleaned = raw.replace(/(خليها|خليه|خلي|اجعل|اجعله|غير|بدل|بدّل|غيّر|set|change|حالة|status|تصليح|جهاز|طلب|الى|إلى|to)/gi, '').trim();
      return { type: 'repair_update_status', fields: { customerQuery: cleaned, status } } as any;
    }

    // إضافة دفعة لتصليح
    if (/(دفعة|سدد|سداد|خلص|تحويل)/.test(text) && /(تصليح|جهاز|طلب)/.test(text)) {
      const amountMatch = digits.match(/(\d{2,10})\s*(?:دج|da|dzd|دينار)?/i);
      const amount = amountMatch ? parseInt(amountMatch[1], 10) : 0;
      const cleaned = raw.replace(/(دفعة|سدد|سداد|خلص|تحويل|للعميل|عميل|تصليح|جهاز|طلب|ب|بـ|قدر|مبلغ|دج|da|dzd|دينار)/gi, '').trim();
      return { type: 'repair_add_payment', fields: { customerQuery: cleaned, amount } } as any;
    }

    return { type: 'unknown' } as ParsedIntent;
  }
};
