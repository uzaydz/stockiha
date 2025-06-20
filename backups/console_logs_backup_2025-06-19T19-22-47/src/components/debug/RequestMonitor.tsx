import React, { useState, useEffect } from 'react';

interface RequestLog {
  url: string;
  method: string;
  timestamp: number;
  count: number;
  category: 'Products' | 'Categories' | 'Auth' | 'Settings' | 'Apps' | 'Supabase' | 'Other';
  isDuplicate: boolean;
  status: 'pending' | 'completed' | 'failed';
}

interface RequestStats {
  total: number;
  byCategory: Record<string, RequestLog[]>;
  all: RequestLog[];
}

const RequestMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<RequestStats>({ total: 0, byCategory: {}, all: [] });
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // تحديث البيانات من النظام العالمي
  const updateStats = () => {
    if ((window as any).getRequestLogs) {
      const requestLogs = (window as any).getRequestLogs();
      setStats(requestLogs);
      setLastUpdate(Date.now());
    }
  };

  useEffect(() => {
    if (!isVisible) return;

    // تحديث فوري
    updateStats();

    // تحديث دوري كل ثانية
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, [isVisible]);

  // عدد الطلبات حسب الفئة
  const getCategoryStats = () => {
    const categoryStats: Record<string, { total: number; duplicates: number; unique: number }> = {};
    
    for (const [category, requests] of Object.entries(stats.byCategory)) {
      const totalRequests = requests.reduce((sum, req) => sum + req.count, 0);
      const duplicates = requests.reduce((sum, req) => sum + (req.isDuplicate ? req.count - 1 : 0), 0);
      const unique = requests.length;
      
      categoryStats[category] = {
        total: totalRequests,
        duplicates,
        unique
      };
    }
    
    return categoryStats;
  };

  const categoryStats = getCategoryStats();
  const totalRequests = Object.values(categoryStats).reduce((sum, cat) => sum + cat.total, 0);
  const totalDuplicates = Object.values(categoryStats).reduce((sum, cat) => sum + cat.duplicates, 0);
  const uniqueRequests = Object.values(categoryStats).reduce((sum, cat) => sum + cat.unique, 0);

  const clearCache = () => {
    if ((window as any).clearDeduplicationCache) {
      (window as any).clearDeduplicationCache();
      updateStats();
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          📊 مراقب الطلبات ({totalRequests})
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-[550px] max-h-[500px] overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          📊 مراقب الطلبات
        </h3>
        <div className="flex gap-2">
          <button
            onClick={updateStats}
            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
          >
            🔄 تحديث
          </button>
          <button
            onClick={clearCache}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            🧹 مسح
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* إحصائيات عامة */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
          <div className="font-medium text-blue-700 dark:text-blue-300">إجمالي</div>
          <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{totalRequests}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
          <div className="font-medium text-red-700 dark:text-red-300">مكرر</div>
          <div className="text-lg font-bold text-red-900 dark:text-red-100">{totalDuplicates}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
          <div className="font-medium text-green-700 dark:text-green-300">فريد</div>
          <div className="text-lg font-bold text-green-900 dark:text-green-100">{uniqueRequests}</div>
        </div>
      </div>

      {/* إحصائيات حسب الفئة */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-1">
          التفاصيل حسب الفئة
        </h4>

        {Object.entries(categoryStats).map(([category, data]) => (
          <div key={category} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {getCategoryIcon(category)} {category}
              </span>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {data.total} طلب ({data.unique} فريد)
              </div>
            </div>

            {data.duplicates > 0 && (
              <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                ⚠️ {data.duplicates} طلب مكرر تم منعه
              </div>
            )}

            {/* عرض الطلبات الفردية */}
            {stats.byCategory[category] && (
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {stats.byCategory[category].slice(0, 5).map((request, index) => (
                  <div key={index} className="text-xs bg-white dark:bg-gray-800 p-2 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-gray-700 dark:text-gray-300">
                        {request.method} {request.url}
                      </span>
                      <div className="flex items-center gap-2">
                        {request.isDuplicate && (
                          <span className="text-red-500">🔄 x{request.count}</span>
                        )}
                        <span className={`w-2 h-2 rounded-full ${
                          request.status === 'completed' ? 'bg-green-500' :
                          request.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                      </div>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(request.timestamp).toLocaleTimeString('ar-DZ')}
                    </div>
                  </div>
                ))}
                {stats.byCategory[category].length > 5 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    ... و {stats.byCategory[category].length - 5} طلب آخر
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {Object.keys(categoryStats).length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            لا توجد طلبات مرصودة
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
        آخر تحديث: {new Date(lastUpdate).toLocaleTimeString('ar-DZ')}
      </div>
    </div>
  );
};

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Products': '📦',
    'Categories': '🏷️',
    'Auth': '🔐',
    'Settings': '⚙️',
    'Apps': '📱',
    'Supabase': '🗄️',
    'Other': '❓'
  };
  return icons[category] || '❓';
}

export default RequestMonitor;
