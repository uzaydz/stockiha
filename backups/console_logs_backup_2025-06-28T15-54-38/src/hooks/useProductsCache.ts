import { useRef, useMemo } from 'react';
import { Product } from '@/lib/api/products';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface PaginationData {
  products: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

export const useProductsCache = () => {
  const cacheRef = useRef(new Map<string, CacheEntry>());

  // Stable cache operations using useMemo to prevent recreation
  const cacheOperations = useMemo(() => {
    const generateCacheKey = (organizationId: string, page: number, filters: any) => {
      return `products_${organizationId}_${page}_${JSON.stringify(filters)}`;
    };

    const get = (key: string): PaginationData | null => {
      const entry = cacheRef.current.get(key);
      
      if (!entry) return null;
      
      // Check if entry has expired
      if (Date.now() > entry.expiresAt) {
        cacheRef.current.delete(key);
        return null;
      }
      
      return entry.data;
    };

    const set = (key: string, data: PaginationData) => {
      // Implement LRU cache eviction
      if (cacheRef.current.size >= MAX_CACHE_SIZE) {
        // Remove oldest entries
        const entries = Array.from(cacheRef.current.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest 20% of entries
        const toRemove = Math.floor(entries.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
          cacheRef.current.delete(entries[i][0]);
        }
      }

      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY
      };
      
      cacheRef.current.set(key, entry);
    };

    const invalidate = (pattern?: string) => {
      if (!pattern) {
        cacheRef.current.clear();
        return;
      }
      
      // Remove entries matching the pattern
      for (const key of cacheRef.current.keys()) {
        if (key.includes(pattern)) {
          cacheRef.current.delete(key);
        }
      }
    };

    const getStats = () => {
      const now = Date.now();
      const totalEntries = cacheRef.current.size;
      const expiredEntries = Array.from(cacheRef.current.values())
        .filter(entry => now > entry.expiresAt).length;
      
      return {
        totalEntries,
        expiredEntries,
        validEntries: totalEntries - expiredEntries,
        memoryUsage: JSON.stringify(Object.fromEntries(cacheRef.current)).length
      };
    };

    return {
      generateCacheKey,
      get,
      set,
      invalidate,
      getStats
    };
  }, []);

  return cacheOperations;
};
