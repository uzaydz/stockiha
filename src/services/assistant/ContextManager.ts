/**
 * نظام إدارة السياق المتقدم لـ SIRA
 * يتتبع المحادثات، المنتجات، العملاء، والعمليات السابقة
 *
 * @version 1.0.0
 */

export interface ContextEntity {
  type: 'product' | 'customer' | 'order' | 'expense' | 'repair';
  id: string;
  name: string;
  data: any;
  timestamp: number;
  relevance: number; // 0-1
}

export interface ConversationContext {
  // آخر الكيانات المذكورة
  recentEntities: ContextEntity[];

  // المنتج الحالي قيد المناقشة
  currentProduct?: ContextEntity;

  // العميل الحالي قيد المناقشة
  currentCustomer?: ContextEntity;

  // آخر عملية تمت
  lastOperation?: {
    type: 'stock_update' | 'payment' | 'expense' | 'repair';
    timestamp: number;
    data: any;
    undoable: boolean;
  };

  // المواضيع المتكررة
  topics: Map<string, number>; // topic -> frequency

  // تفضيلات المستخدم
  preferences: {
    defaultTimeframe?: 'today' | 'week' | 'month';
    language?: 'ar' | 'fr' | 'en';
    verbosity?: 'concise' | 'detailed';
  };
}

export class ContextManager {
  private static context: ConversationContext = {
    recentEntities: [],
    topics: new Map(),
    preferences: {
      defaultTimeframe: 'today',
      language: 'ar',
      verbosity: 'concise'
    }
  };

  private static readonly MAX_ENTITIES = 10;
  private static readonly RELEVANCE_DECAY = 0.9; // تقليل الأهمية مع الوقت

  /**
   * إضافة كيان إلى السياق
   */
  static addEntity(entity: Omit<ContextEntity, 'timestamp' | 'relevance'>): void {
    const newEntity: ContextEntity = {
      ...entity,
      timestamp: Date.now(),
      relevance: 1.0
    };

    // إزالة الكيان القديم إن وُجد
    this.context.recentEntities = this.context.recentEntities.filter(
      e => !(e.type === entity.type && e.id === entity.id)
    );

    // إضافة الكيان الجديد
    this.context.recentEntities.unshift(newEntity);

    // تحديث الكيان الحالي حسب النوع
    if (entity.type === 'product') {
      this.context.currentProduct = newEntity;
    } else if (entity.type === 'customer') {
      this.context.currentCustomer = newEntity;
    }

    // تطبيق تناقص الأهمية على الكيانات القديمة
    this.applyRelevanceDecay();

    // الحفاظ على الحد الأقصى
    if (this.context.recentEntities.length > this.MAX_ENTITIES) {
      this.context.recentEntities = this.context.recentEntities.slice(0, this.MAX_ENTITIES);
    }

    // حفظ في localStorage
    this.persist();
  }

  /**
   * الحصول على أحدث كيان من نوع معين
   */
  static getLatestEntity(type: ContextEntity['type']): ContextEntity | null {
    return this.context.recentEntities.find(e => e.type === type) || null;
  }

  /**
   * الحصول على كل الكيانات من نوع معين
   */
  static getEntitiesByType(type: ContextEntity['type']): ContextEntity[] {
    return this.context.recentEntities.filter(e => e.type === type);
  }

  /**
   * تسجيل عملية قابلة للتراجع
   */
  static recordOperation(operation: {
    type: 'stock_update' | 'payment' | 'expense' | 'repair';
    data: any;
    undoable: boolean;
  }): void {
    this.context.lastOperation = {
      ...operation,
      timestamp: Date.now()
    };
    this.persist();
  }

  /**
   * الحصول على آخر عملية قابلة للتراجع
   */
  static getLastUndoableOperation(): ConversationContext['lastOperation'] | null {
    if (this.context.lastOperation && this.context.lastOperation.undoable) {
      // التحقق من عدم مرور أكثر من 5 دقائق
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - this.context.lastOperation.timestamp < fiveMinutes) {
        return this.context.lastOperation;
      }
    }
    return null;
  }

  /**
   * مسح آخر عملية بعد التراجع
   */
  static clearLastOperation(): void {
    this.context.lastOperation = undefined;
    this.persist();
  }

  /**
   * تسجيل موضوع
   */
  static recordTopic(topic: string): void {
    const normalized = topic.toLowerCase().trim();
    const current = this.context.topics.get(normalized) || 0;
    this.context.topics.set(normalized, current + 1);
    this.persist();
  }

  /**
   * الحصول على المواضيع الأكثر تكراراً
   */
  static getTopTopics(limit: number = 5): Array<{ topic: string; count: number }> {
    const topics = Array.from(this.context.topics.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topics;
  }

  /**
   * تطبيق تناقص الأهمية على الكيانات
   */
  private static applyRelevanceDecay(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    this.context.recentEntities.forEach(entity => {
      const hoursPassed = (now - entity.timestamp) / oneHour;
      entity.relevance = Math.pow(this.RELEVANCE_DECAY, hoursPassed);
    });

    // إزالة الكيانات ذات الأهمية المنخفضة جداً
    this.context.recentEntities = this.context.recentEntities.filter(
      e => e.relevance > 0.1
    );
  }

  /**
   * الحصول على ملخص السياق للذكاء الاصطناعي
   */
  static getContextSummary(): string {
    const parts: string[] = [];

    if (this.context.currentProduct) {
      parts.push(`المنتج الحالي: ${this.context.currentProduct.name}`);
    }

    if (this.context.currentCustomer) {
      parts.push(`العميل الحالي: ${this.context.currentCustomer.name}`);
    }

    const recentProducts = this.getEntitiesByType('product').slice(0, 3);
    if (recentProducts.length > 0) {
      parts.push(`منتجات حديثة: ${recentProducts.map(p => p.name).join(', ')}`);
    }

    const topTopics = this.getTopTopics(3);
    if (topTopics.length > 0) {
      parts.push(`مواضيع متكررة: ${topTopics.map(t => t.topic).join(', ')}`);
    }

    if (this.context.lastOperation) {
      const timeAgo = Math.floor((Date.now() - this.context.lastOperation.timestamp) / 1000);
      parts.push(`آخر عملية: ${this.context.lastOperation.type} (منذ ${timeAgo}ث)`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'لا يوجد سياق سابق';
  }

  /**
   * تحديث التفضيلات
   */
  static updatePreferences(prefs: Partial<ConversationContext['preferences']>): void {
    this.context.preferences = {
      ...this.context.preferences,
      ...prefs
    };
    this.persist();
  }

  /**
   * الحصول على التفضيلات
   */
  static getPreferences(): ConversationContext['preferences'] {
    return { ...this.context.preferences };
  }

  /**
   * مسح السياق
   */
  static clear(): void {
    this.context = {
      recentEntities: [],
      topics: new Map(),
      preferences: this.context.preferences // الحفاظ على التفضيلات
    };
    this.persist();
  }

  /**
   * حفظ السياق في localStorage
   */
  private static persist(): void {
    try {
      const serializable = {
        recentEntities: this.context.recentEntities,
        currentProduct: this.context.currentProduct,
        currentCustomer: this.context.currentCustomer,
        lastOperation: this.context.lastOperation,
        topics: Array.from(this.context.topics.entries()),
        preferences: this.context.preferences
      };
      localStorage.setItem('sira_context', JSON.stringify(serializable));
    } catch (error) {
      console.error('[ContextManager] Failed to persist:', error);
    }
  }

  /**
   * تحميل السياق من localStorage
   */
  static load(): void {
    try {
      const stored = localStorage.getItem('sira_context');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.context = {
          recentEntities: parsed.recentEntities || [],
          currentProduct: parsed.currentProduct,
          currentCustomer: parsed.currentCustomer,
          lastOperation: parsed.lastOperation,
          topics: new Map(parsed.topics || []),
          preferences: parsed.preferences || this.context.preferences
        };

        // تطبيق تناقص الأهمية على البيانات المحملة
        this.applyRelevanceDecay();
      }
    } catch (error) {
      console.error('[ContextManager] Failed to load:', error);
    }
  }

  /**
   * الحصول على السياق الكامل (للتطوير/التصحيح)
   */
  static getFullContext(): ConversationContext {
    return JSON.parse(JSON.stringify({
      ...this.context,
      topics: Array.from(this.context.topics.entries())
    }));
  }

  /**
   * حل المراجع الغامضة (مثل "هذا المنتج"، "العميل")
   */
  static resolveReference(query: string): {
    product?: ContextEntity;
    customer?: ContextEntity;
  } {
    const result: { product?: ContextEntity; customer?: ContextEntity } = {};

    const normalized = query.toLowerCase();

    // كلمات تشير إلى المنتج
    const productKeywords = ['هذا المنتج', 'نفس المنتج', 'المنتج', 'هذا', 'نفسه'];
    if (productKeywords.some(kw => normalized.includes(kw))) {
      result.product = this.context.currentProduct;
    }

    // كلمات تشير إلى العميل
    const customerKeywords = ['هذا العميل', 'نفس العميل', 'العميل', 'الزبون'];
    if (customerKeywords.some(kw => normalized.includes(kw))) {
      result.customer = this.context.currentCustomer;
    }

    return result;
  }
}

// تحميل السياق عند بدء التشغيل
if (typeof window !== 'undefined') {
  ContextManager.load();
}
