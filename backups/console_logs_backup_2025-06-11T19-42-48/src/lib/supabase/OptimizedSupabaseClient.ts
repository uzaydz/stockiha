import { SupabaseClient } from '@supabase/supabase-js';
import { cacheManager, CacheOptions } from '../cache/CentralCacheManager';
import { supabase } from '../supabase';

interface BatchRequest {
  table: string;
  query: any;
  key: string;
  options?: CacheOptions;
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
}

class OptimizedSupabaseClient {
  private static instance: OptimizedSupabaseClient;
  private batchQueue: Map<string, BatchRequest[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 10; // ms
  private readonly MAX_BATCH_SIZE = 10;

  private constructor(private _client: SupabaseClient = supabase) {}

  static getInstance(): OptimizedSupabaseClient {
    if (!OptimizedSupabaseClient.instance) {
      OptimizedSupabaseClient.instance = new OptimizedSupabaseClient();
    }
    return OptimizedSupabaseClient.instance;
  }

  /**
   * Get the underlying Supabase client
   */
  get client(): SupabaseClient {
    return this._client;
  }

  /**
   * Fetch with caching and retry logic
   */
  async fetchWithCache<T>(
    table: string,
    queryBuilder: (query: any) => any,
    cacheKey: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    return cacheManager.get<T | null>(
      cacheKey,
      async () => {
        const query = queryBuilder(this._client.from(table));
        const { data, error } = await this.executeWithRetry(() => query);
        
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          throw error;
        }
        
        return data;
      },
      options
    );
  }

  /**
   * Batch multiple requests
   */
  async batchFetch<T>(request: BatchRequest): Promise<T | null> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      const batchKey = this.getBatchKey(request);
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }
      
      const batch = this.batchQueue.get(batchKey)!;
      batch.push({
        ...request,
        query: { resolve, reject }
      });

      // Schedule batch execution
      this.scheduleBatchExecution();
    });
  }

  /**
   * Execute query with exponential backoff retry
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 100,
      maxDelay = 5000,
      factor = 2
    } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt < maxRetries) {
          await this.sleep(delay);
          delay = Math.min(delay * factor, maxDelay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Prefetch commonly used data
   */
  async prefetchCommonData(organizationId: string): Promise<void> {
    const prefetchTasks = [
      // Static data with long TTL
      {
        key: `categories_${organizationId}`,
        fetcher: () => this.fetchWithCache(
          'product_categories',
          q => q.select('*').eq('organization_id', organizationId).order('name'),
          `categories_${organizationId}`,
          { ttl: 60 * 60 * 1000 } // 1 hour
        )
      },
      {
        key: `subcategories_${organizationId}`,
        fetcher: () => this.fetchWithCache(
          'product_subcategories',
          q => q.select('*').eq('organization_id', organizationId).order('name'),
          `subcategories_${organizationId}`,
          { ttl: 60 * 60 * 1000 } // 1 hour
        )
      },
      {
        key: `shipping_providers_${organizationId}`,
        fetcher: () => this.fetchWithCache(
          'shipping_providers',
          q => q.select('*').eq('organization_id', organizationId),
          `shipping_providers_${organizationId}`,
          { ttl: 60 * 60 * 1000 } // 1 hour
        )
      },
      {
        key: `employees_${organizationId}`,
        fetcher: () => this.fetchWithCache(
          'users',
          q => q.select('id, name, email, role')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .neq('role', 'customer'),
          `employees_${organizationId}`,
          { ttl: 15 * 60 * 1000 } // 15 minutes
        )
      }
    ];

    await Promise.all(
      prefetchTasks.map(({ key, fetcher }) => 
        cacheManager.prefetch(key, fetcher)
      )
    );
  }

  /**
   * Get combined data in single request
   */
  async getCombinedDashboardData(organizationId: string) {
    const cacheKey = `dashboard_combined_${organizationId}`;
    
    return cacheManager.get(
      cacheKey,
      async () => {
        // Use RPC function to get all data in one request
        const { data, error } = await this.executeWithRetry(() =>
          this._client.rpc('get_dashboard_data', {
            p_organization_id: organizationId
          })
        );

        if (error) throw error;
        return data;
      },
      { 
        ttl: 30 * 1000, // 30 seconds
        staleWhileRevalidate: 30 * 1000 // Serve stale for 30 more seconds
      }
    );
  }

  /**
   * Invalidate related caches when data changes
   */
  invalidateRelatedCaches(table: string, organizationId: string): void {
    const patterns: string[] = [];

    switch (table) {
      case 'orders':
        patterns.push(
          `orders_*`,
          `pos_orders_*`,
          `stats_*`,
          `dashboard_*`
        );
        break;
      case 'products':
        patterns.push(
          `products_*`,
          `inventory_*`,
          `categories_*`
        );
        break;
      case 'customers':
        patterns.push(
          `customers_*`,
          `orders_*`
        );
        break;
      case 'users':
        patterns.push(
          `employees_*`,
          `users_*`
        );
        break;
    }

    cacheManager.invalidate(patterns);
  }

  // Private methods

  private getBatchKey(request: BatchRequest): string {
    return `${request.table}_${JSON.stringify(request.query)}`;
  }

  private scheduleBatchExecution(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.executeBatches();
      this.batchTimeout = null;
    }, this.BATCH_DELAY);
  }

  private async executeBatches(): Promise<void> {
    const batches = new Map(this.batchQueue);
    this.batchQueue.clear();

    for (const [batchKey, requests] of batches) {
      if (requests.length === 0) continue;

      try {
        // Group by table for efficient querying
        const tableGroups = this.groupByTable(requests);
        
        for (const [table, tableRequests] of tableGroups) {
          await this.executeBatchForTable(table, tableRequests);
        }
      } catch (error) {
        // Reject all requests in this batch
        requests.forEach(req => {
          if (req.query.reject) {
            req.query.reject(error);
          }
        });
      }
    }
  }

  private groupByTable(requests: BatchRequest[]): Map<string, BatchRequest[]> {
    const groups = new Map<string, BatchRequest[]>();
    
    for (const request of requests) {
      if (!groups.has(request.table)) {
        groups.set(request.table, []);
      }
      groups.get(request.table)!.push(request);
    }
    
    return groups;
  }

  private async executeBatchForTable(
    table: string,
    requests: BatchRequest[]
  ): Promise<void> {
    // For now, execute individually with caching
    // In future, could implement actual batch query if Supabase supports it
    await Promise.all(
      requests.map(async (request) => {
        try {
          const result = await this.fetchWithCache(
            request.table,
            () => request.query,
            request.key,
            request.options
          );
          
          if (request.query.resolve) {
            request.query.resolve(result);
          }
        } catch (error) {
          if (request.query.reject) {
            request.query.reject(error);
          }
        }
      })
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const optimizedSupabase = OptimizedSupabaseClient.getInstance();

// Export types
export type { BatchRequest, RetryOptions };