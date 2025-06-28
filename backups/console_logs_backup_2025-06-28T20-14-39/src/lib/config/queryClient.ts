import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create a custom persister with compression
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'bazaar-query-cache',
  serialize: (data) => {
    try {
      // Compress data before storing
      const serialized = JSON.stringify(data);
      // Simple compression for repeated patterns
      return serialized
        .replace(/\{"id":/g, '{i:')
        .replace(/,"name":/g, ',n:')
        .replace(/,"created_at":/g, ',c:')
        .replace(/,"updated_at":/g, ',u:')
        .replace(/,"organization_id":/g, ',o:');
    } catch (error) {
      return '';
    }
  },
  deserialize: (data) => {
    try {
      // Decompress data after reading
      const decompressed = data
        .replace(/{i:/g, '{"id":')
        .replace(/,n:/g, ',"name":')
        .replace(/,c:/g, ',"created_at":')
        .replace(/,u:/g, ',"updated_at":')
        .replace(/,o:/g, ',"organization_id":');
      return JSON.parse(decompressed);
    } catch (error) {
      return {};
    }
  },
});

// Configure query client with optimal settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long before data is considered stale
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache time: how long to keep data in cache after component unmounts
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Max 3 retries for other errors
        return failureCount < 3;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // ✅ Background refetch محسن
      refetchOnWindowFocus: false, // Disable to reduce queries
      refetchOnReconnect: 'always',
      refetchOnMount: true, // ✅ السماح بالتحديث عند تحميل المكون
      
      // Network mode
      networkMode: 'offlineFirst', // Try cache first
    },
    mutations: {
      // Retry configuration for mutations
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Network mode
      networkMode: 'offlineFirst',
    },
  },
});

// Setup persistence
if (typeof window !== 'undefined') {
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    hydrateOptions: {},
    dehydrateOptions: {
      // Improved dehydration logic to handle cancelled queries
      shouldDehydrateQuery: (query) => {
        const state = query.state;
        const queryKey = query.queryKey as unknown[];
        
        // Skip cancelled or pending queries to avoid CancelledError
        if (state.status === 'pending' && state.fetchStatus === 'idle') {
          return false;
        }
        
        // Skip error states including cancelled errors
        if (state.status === 'error') {
          return false;
        }
        
        // Don't persist auth-related queries
        if (queryKey.includes('auth') || queryKey.includes('session')) {
          return false;
        }
        
        // Only persist successful queries with data
        return state.status === 'success' && state.data !== undefined;
      },
    },
  });
}

// Garbage collection for old cache entries
export function cleanupQueryCache() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  queries.forEach((query) => {
    const state = query.state;
    if (state.dataUpdatedAt) {
      const age = Date.now() - state.dataUpdatedAt;
      // Remove queries older than 24 hours
      if (age > 24 * 60 * 60 * 1000) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    }
  });
}

// Safe query cancellation function
export function safelyCancelQueries() {
  try {
    // Cancel only active/pending queries, not completed ones
    queryClient.cancelQueries({
      predicate: (query) => {
        const state = query.state;
        return state.fetchStatus === 'fetching' || state.status === 'pending';
      }
    });
  } catch (error) {
  }
}

// Run cleanup periodically
if (typeof window !== 'undefined') {
  // Run cleanup on startup
  setTimeout(cleanupQueryCache, 5000);
  
  // Run cleanup every hour
  setInterval(cleanupQueryCache, 60 * 60 * 1000);
}

// Export configured client
export default queryClient;
