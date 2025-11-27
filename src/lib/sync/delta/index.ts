/**
 * Delta-Based Sync System - Unified Exports
 * نظام المزامنة القائم على العمليات - التصدير الموحد
 */

// Types
export * from './types';

// Core Components
export { sqliteWriteQueue, SQLiteWriteQueue } from './SQLiteWriteQueue';
export { operationQueue, OperationQueue } from './OperationQueue';
export { outboxManager, OutboxManager } from './OutboxManager';
export { batchSender, BatchSender } from './BatchSender';
export { realtimeReceiver, RealtimeReceiver } from './RealtimeReceiver';

// Strategy & Resolution
export { mergeStrategy, MergeStrategy } from './MergeStrategy';
export { conflictResolver, ConflictResolver } from './ConflictResolver';

// Validation
export { stateHashValidator, StateHashValidator } from './StateHashValidator';

// ⚡ Network & Connection
export { networkQuality, NetworkQualityMonitor } from './NetworkQuality';
export { connectionState, isNetworkError } from './ConnectionState';
export type { ConnectionStatus, ConnectionStateData } from './ConnectionState';
export { syncMetrics, SyncMetricsCollector } from './SyncMetrics';

// Main Engine
export { deltaSyncEngine, DeltaSyncEngine } from './DeltaSyncEngine';

/**
 * Quick Start Guide:
 *
 * 1. Initialize the engine when user logs in:
 *    ```typescript
 *    import { deltaSyncEngine } from '@/lib/sync/delta';
 *
 *    await deltaSyncEngine.initialize(organizationId);
 *    ```
 *
 * 2. Perform local writes (automatically synced):
 *    ```typescript
 *    // For normal CRUD
 *    await deltaSyncEngine.localWrite('products', 'UPDATE', productId, { name: 'New Name' });
 *
 *    // For stock changes (DELTA)
 *    await deltaSyncEngine.stockDelta('products', productId, 'stock_quantity', -1);
 *    ```
 *
 * 3. Manual full sync (user-triggered):
 *    ```typescript
 *    await deltaSyncEngine.fullSync();
 *    ```
 *
 * 4. Check status:
 *    ```typescript
 *    const status = await deltaSyncEngine.getStatus();
 *    console.log(status.pendingOutboxCount);
 *    ```
 *
 * 5. Stop when user logs out:
 *    ```typescript
 *    await deltaSyncEngine.stop();
 *    ```
 */
