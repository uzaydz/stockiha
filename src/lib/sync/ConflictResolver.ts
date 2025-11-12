/**
 * ⚖️ Conflict Resolver - حل التضاربات باستخدام استراتيجيات مختلفة
 *
 * الاستراتيجيات:
 * - Server Wins: السيرفر يفوز (للبيانات metadata)
 * - Client Wins: الكلاينت يفوز (للمعاملات المحلية)
 * - Merge: دمج ذكي (server metadata + local inventory)
 * - Manual: حل يدوي من المستخدم
 */

import type {
  BaseEntity,
  ResolutionStrategy,
  ResolutionContext,
  ResolvedEntity,
  EntityType
} from './conflictTypes';
import { DEFAULT_STRATEGIES } from './conflictTypes';
import type { LocalProduct } from '@/database/localDb';

/**
 * كلاس حل التضاربات
 */
export class ConflictResolver {
  /**
   * حل التضارب باستخدام استراتيجية محددة
   */
  async resolve<T extends BaseEntity>(
    local: T,
    server: T,
    strategy: ResolutionStrategy | 'auto',
    entityType: EntityType,
    context: ResolutionContext
  ): Promise<ResolvedEntity<T>> {
    // إذا كانت الاستراتيجية auto، استخدم الافتراضي
    if (strategy === 'auto') {
      strategy = DEFAULT_STRATEGIES[entityType] || 'server_wins';
    }

    console.log(`[ConflictResolver] Resolving ${entityType}/${context.entityId} with strategy: ${strategy}`);

    try {
      switch (strategy) {
        case 'server_wins':
          return this.applyServerWins(local, server, entityType);

        case 'client_wins':
          return this.applyClientWins(local, server, entityType);

        case 'merge':
          return this.applyMerge(local, server, entityType);

        case 'manual':
          return this.requireManualResolution(local, server, entityType);

        default:
          console.warn(`[ConflictResolver] Unknown strategy: ${strategy}, falling back to server_wins`);
          return this.applyServerWins(local, server, entityType);
      }
    } catch (error) {
      console.error('[ConflictResolver] Resolution failed:', error);
      // Fallback: server wins
      return this.applyServerWins(local, server, entityType);
    }
  }

  /**
   * استراتيجية: Server Wins
   * السيرفر يفوز - استخدم كل بيانات السيرفر
   */
  private applyServerWins<T extends BaseEntity>(
    local: T,
    server: T,
    entityType: EntityType
  ): ResolvedEntity<T> {
    console.log(`[ConflictResolver] Applying Server Wins for ${entityType}`);

    return {
      resolved: true,
      data: { ...server } as T,
      strategy: 'server_wins',
      requiresManualResolution: false,
      notes: 'Server version accepted as-is'
    };
  }

  /**
   * استراتيجية: Client Wins
   * الكلاينت يفوز - استخدم كل بيانات الكلاينت
   */
  private applyClientWins<T extends BaseEntity>(
    local: T,
    server: T,
    entityType: EntityType
  ): ResolvedEntity<T> {
    console.log(`[ConflictResolver] Applying Client Wins for ${entityType}`);

    return {
      resolved: true,
      data: { ...local } as T,
      strategy: 'client_wins',
      requiresManualResolution: false,
      notes: 'Local version accepted as-is'
    };
  }

  /**
   * استراتيجية: Merge
   * دمج ذكي حسب نوع الكيان
   */
  private applyMerge<T extends BaseEntity>(
    local: T,
    server: T,
    entityType: EntityType
  ): ResolvedEntity<T> {
    console.log(`[ConflictResolver] Applying Merge for ${entityType}`);

    let mergedData: T;

    switch (entityType) {
      case 'product':
        mergedData = this.mergeProduct(local as any, server as any) as T;
        break;

      case 'customer':
        mergedData = this.mergeCustomer(local, server);
        break;

      case 'address':
        mergedData = this.mergeAddress(local, server);
        break;

      case 'invoice':
        // Invoices are critical - require manual
        return this.requireManualResolution(local, server, entityType);

      case 'order':
        // Orders created locally win
        return this.applyClientWins(local, server, entityType);

      default:
        // Fallback: server wins
        mergedData = { ...server } as T;
    }

    return {
      resolved: true,
      data: mergedData,
      strategy: 'merge',
      requiresManualResolution: false,
      notes: `Merged ${entityType} intelligently`
    };
  }

  /**
   * دمج منتج: server metadata + local inventory
   */
  private mergeProduct(local: LocalProduct, server: any): LocalProduct {
    console.log(`[ConflictResolver] Merging product ${local.id}`);

    // القاعدة: نستخدم metadata من السيرفر، لكن نحافظ على المخزون المحلي
    const merged: LocalProduct = {
      // 🔹 Server wins لل metadata
      ...server,

      // 🔹 Client wins للمخزون
      stock_quantity: local.stock_quantity ?? server.stock_quantity ?? 0,
      last_inventory_update: local.localUpdatedAt || local.updated_at || server.updated_at,

      // 🔹 حقول محلية
      synced: true,
      syncStatus: undefined,
      localUpdatedAt: new Date().toISOString(),
      pendingOperation: undefined,

      // 🔹 Timestamps
      updated_at: new Date().toISOString()
    };

    console.log(`[ConflictResolver] Product merged - server metadata + local stock (${merged.stock_quantity})`);
    return merged;
  }

  /**
   * دمج عميل: الأحدث يفوز
   */
  private mergeCustomer<T extends BaseEntity>(local: T, server: T): T {
    // مقارنة timestamps
    const localTs = new Date((local as any).localUpdatedAt || local.updated_at || 0).getTime();
    const serverTs = new Date(server.updated_at || 0).getTime();

    // الأحدث يفوز
    const base = serverTs > localTs ? server : local;

    return {
      ...base,
      updated_at: new Date().toISOString()
    } as T;
  }

  /**
   * دمج عنوان: الأحدث يفوز
   */
  private mergeAddress<T extends BaseEntity>(local: T, server: T): T {
    // مقارنة timestamps
    const localTs = new Date((local as any).localUpdatedAt || local.updated_at || 0).getTime();
    const serverTs = new Date(server.updated_at || 0).getTime();

    // الأحدث يفوز
    const base = serverTs > localTs ? server : local;

    return {
      ...base,
      updated_at: new Date().toISOString()
    } as T;
  }

  /**
   * طلب حل يدوي
   */
  private requireManualResolution<T extends BaseEntity>(
    local: T,
    server: T,
    entityType: EntityType
  ): ResolvedEntity<T> {
    console.log(`[ConflictResolver] Manual resolution required for ${entityType}`);

    return {
      resolved: false,
      data: server, // نرجع السيرفر مؤقتاً
      strategy: 'manual',
      requiresManualResolution: true,
      notes: `${entityType} requires manual resolution`
    };
  }

  /**
   * استراتيجية Last Write Wins (للتوافق مع الكود القديم)
   */
  applyLastWriteWins<T extends BaseEntity>(local: T, server: T): T {
    const localTs = new Date((local as any).localUpdatedAt || local.updated_at || 0).getTime();
    const serverTs = new Date(server.updated_at || 0).getTime();

    return serverTs > localTs ? server : local;
  }

  /**
   * حل تضاربات متعددة دفعة واحدة
   */
  async resolveBatch<T extends BaseEntity>(
    conflicts: Array<{
      local: T;
      server: T;
      entityType: EntityType;
      context: ResolutionContext;
    }>,
    strategy: ResolutionStrategy | 'auto'
  ): Promise<ResolvedEntity<T>[]> {
    console.log(`[ConflictResolver] Resolving ${conflicts.length} conflicts in batch`);

    const results = await Promise.all(
      conflicts.map(({ local, server, entityType, context }) =>
        this.resolve(local, server, strategy, entityType, context)
      )
    );

    const manualCount = results.filter(r => r.requiresManualResolution).length;
    const resolvedCount = results.filter(r => r.resolved).length;

    console.log(
      `[ConflictResolver] Batch complete: ${resolvedCount} resolved, ${manualCount} need manual resolution`
    );

    return results;
  }

  /**
   * تحديد الاستراتيجية المناسبة بناءً على شدة التضارب
   */
  recommendStrategy(
    entityType: EntityType,
    severity: number,
    conflictFields: string[]
  ): ResolutionStrategy {
    // إذا كانت الشدة منخفضة (<30)، استخدم merge
    if (severity < 30) {
      return 'merge';
    }

    // إذا كانت الشدة متوسطة (30-60)، استخدم الاستراتيجية الافتراضية
    if (severity < 60) {
      return DEFAULT_STRATEGIES[entityType] || 'server_wins';
    }

    // إذا كانت الشدة عالية (60+)، اطلب حل يدوي
    return 'manual';
  }

  /**
   * عرض معلومات الحل
   */
  describeResolution<T>(result: ResolvedEntity<T>): string {
    const lines = [
      `Resolution: ${result.resolved ? 'SUCCESS' : 'REQUIRES MANUAL'}`,
      `Strategy: ${result.strategy}`,
    ];

    if (result.notes) {
      lines.push(`Notes: ${result.notes}`);
    }

    if (result.requiresManualResolution) {
      lines.push('⚠️  Manual resolution required - conflict saved for user review');
    }

    return lines.join('\n');
  }
}

// تصدير singleton
export const conflictResolver = new ConflictResolver();
