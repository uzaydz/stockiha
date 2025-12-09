# Unified Sync Engine

This directory contains the new, robust synchronization engine for the application.

## Architecture

The system is divided into three main components managed by a central **SyncManager**:

1.  **PullEngine** (`PullEngine.ts`):
    *   Responsible for fetching data from Supabase (Server -> Local).
    *   Uses **Delta Sync**: Only fetches records updated since the last sync.
    *   Handles **Pagination**: Fetches large datasets in chunks.
    *   **Conflict Resolution**: Skips updates for records that have pending local changes (Local Wins).

2.  **PushEngine** (`PushEngine.ts`):
    *   Responsible for sending local changes to Supabase (Local -> Server).
    *   Uses **Outbox Pattern**: Reads from `sync_outbox` table.
    *   **Batching**: Groups operations to reduce network requests.
    *   **Circuit Breaker**: Prevents flooding the server during outages.
    *   **Offline Support**: Queues operations when offline.

3.  **SyncManager** (`SyncManager.ts`):
    *   Orchestrates the entire process.
    *   Initializes the engines.
    *   Runs periodic sync cycles.

## Configuration

All sync configuration is centralized in `config.ts`:
*   `SYNCED_TABLES`: List of tables to sync.
*   `TABLE_MAP`: Mapping between Local and Server table names.
*   `COLUMN_MAP`: Mapping between Local and Server column names.
*   `LOCAL_ONLY_COLUMNS`: Columns to exclude from sync.

## Usage

```typescript
import { syncManager } from '@/lib/sync/SyncManager';

// Start the sync engine (e.g., in App.tsx)
syncManager.start(organizationId);

// Trigger a manual sync
await syncManager.syncAll();
```
