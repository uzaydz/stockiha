// Query Recorder - تسجيل وتتبع جميع الاستعلامات
export interface QueryRecord {
  id: string;
  method: string;
  table: string;
  query: string;
  timestamp: number;
  component: string;
  filePath?: string;
  duration: number;
  status: 'pending' | 'success' | 'error';
  response?: any;
  error?: any;
}

class QueryRecorder {
  private queries: Map<string, QueryRecord> = new Map();
  private listeners: Set<(query: QueryRecord) => void> = new Set();

  recordQuery(query: QueryRecord) {
    this.queries.set(query.id, query);
    this.notifyListeners(query);
  }

  updateQuery(id: string, updates: Partial<QueryRecord>) {
    const query = this.queries.get(id);
    if (query) {
      const updatedQuery = { ...query, ...updates };
      this.queries.set(id, updatedQuery);
      this.notifyListeners(updatedQuery);
    }
  }

  getQueries(): QueryRecord[] {
    return Array.from(this.queries.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  addListener(listener: (query: QueryRecord) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (query: QueryRecord) => void) {
    this.listeners.delete(listener);
  }

  private notifyListeners(query: QueryRecord) {
    this.listeners.forEach(listener => listener(query));
  }

  clear() {
    this.queries.clear();
  }
}

export const queryRecorder = new QueryRecorder();
