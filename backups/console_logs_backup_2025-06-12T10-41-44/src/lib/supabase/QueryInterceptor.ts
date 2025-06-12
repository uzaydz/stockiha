import { supabase } from '../supabase';

interface QueryLog {
  url: string;
  method: string;
  timestamp: number;
  count: number;
}

class QueryInterceptor {
  private static instance: QueryInterceptor;
  private queryLogs: Map<string, QueryLog> = new Map();
  private enabled = true;

  private constructor() {
    this.setupInterceptor();
    this.startPeriodicReport();
  }

  static getInstance(): QueryInterceptor {
    if (!QueryInterceptor.instance) {
      QueryInterceptor.instance = new QueryInterceptor();
    }
    return QueryInterceptor.instance;
  }

  private setupInterceptor() {
    // Intercept fetch to track Supabase queries
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      if (this.enabled) {
        const url = args[0] as string;
        
        // Only track Supabase queries
        if (url.includes('supabase.co/rest/v1/')) {
          const method = (args[1]?.method || 'GET').toUpperCase();
          const key = `${method}:${this.extractTableAndQuery(url)}`;
          
          // Log the query
          this.logQuery(key);
          
          // Check for duplicate queries
          if (this.isDuplicateQuery(key)) {
          }
        }
      }
      
      return originalFetch(...args);
    };
  }

  private extractTableAndQuery(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/rest/v1/')[1];
      const queryParams = urlObj.search;
      
      // Simplify query params for grouping
      const simplifiedParams = queryParams
        .replace(/eq\.[^&]+/g, 'eq.XXX') // Replace specific IDs
        .replace(/gt\.[^&]+/g, 'gt.XXX')
        .replace(/lt\.[^&]+/g, 'lt.XXX');
      
      return `${path}${simplifiedParams}`;
    } catch (error) {
      return url;
    }
  }

  private logQuery(key: string) {
    const existing = this.queryLogs.get(key);
    
    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      this.queryLogs.set(key, {
        url: key,
        method: key.split(':')[0],
        timestamp: Date.now(),
        count: 1,
      });
    }
  }

  private isDuplicateQuery(key: string): boolean {
    const log = this.queryLogs.get(key);
    if (!log) return false;
    
    const timeSinceLastQuery = Date.now() - log.timestamp;
    
    // Consider it duplicate if same query within 1 second
    return timeSinceLastQuery < 1000 && log.count > 1;
  }

  private startPeriodicReport() {
    // Report query statistics every 30 seconds in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        this.generateReport();
      }, 30000);
    }
  }

  generateReport() {
    if (this.queryLogs.size === 0) return;

    // Sort by count
    const sortedQueries = Array.from(this.queryLogs.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10); // Top 10

    // Identify problematic queries
    const problematicQueries = sortedQueries.filter(([_, log]) => log.count > 10);
    
    if (problematicQueries.length > 0) {
      problematicQueries.forEach(([key, log]) => {
      });
    }
    
  }

  reset() {
    this.queryLogs.clear();
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  getStats() {
    return {
      totalQueries: Array.from(this.queryLogs.values()).reduce((sum, log) => sum + log.count, 0),
      uniqueQueries: this.queryLogs.size,
      topQueries: Array.from(this.queryLogs.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([key, log]) => ({ query: key, count: log.count })),
    };
  }
}

// Initialize in development
if (process.env.NODE_ENV === 'development') {
  const interceptor = QueryInterceptor.getInstance();
  
  // Add to window for debugging
  (window as any).__queryInterceptor = interceptor;
  
}

export default QueryInterceptor;
