import React, { useState, useEffect } from 'react';

interface DuplicateEvent {
  eventType: string;
  productId: string;
  count: number;
  lastOccurrence: string;
}

export const DuplicateEventDetector: React.FC = () => {
  const [duplicates, setDuplicates] = useState<DuplicateEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      const trackingData = (window as any).__trackingDebugData || [];
      setTotalEvents(trackingData.length);

      // حساب الأحداث المكررة
      const duplicateEvents = trackingData.filter((event: any) => 
        event.details?.reason === 'duplicate_event'
      );
      setDuplicateCount(duplicateEvents.length);

      // تجميع الأحداث المكررة
      const duplicateMap = new Map<string, DuplicateEvent>();
      
      duplicateEvents.forEach((event: any) => {
        const key = `${event.type}_${event.details?.product_id}`;
        const existing = duplicateMap.get(key);
        
        if (existing) {
          existing.count++;
          existing.lastOccurrence = event.timestamp;
        } else {
          duplicateMap.set(key, {
            eventType: event.type,
            productId: event.details?.product_id || 'unknown',
            count: 1,
            lastOccurrence: event.timestamp
          });
        }
      });

      setDuplicates(Array.from(duplicateMap.values()));
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const duplicatePercentage = totalEvents > 0 ? ((duplicateCount / totalEvents) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center">
          🔄 كاشف الأحداث المكررة
        </h3>
        <div className="text-sm text-gray-500">
          {duplicateCount} من {totalEvents} ({duplicatePercentage}%)
        </div>
      </div>

      {duplicateCount === 0 ? (
        <div className="text-center py-4">
          <div className="text-green-600 text-2xl mb-2">✅</div>
          <div className="text-green-700 font-medium">لا توجد أحداث مكررة</div>
          <div className="text-green-600 text-sm">النظام يعمل بشكل مثالي</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-center text-yellow-800">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <span className="font-medium">تم اكتشاف {duplicateCount} حدث مكرر</span>
            </div>
          </div>

          <div className="space-y-2">
            {duplicates.map((duplicate, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {duplicate.eventType}
                    </div>
                    <div className="text-sm text-gray-600">
                      المنتج: {duplicate.productId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {duplicate.count}x
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(duplicate.lastOccurrence).toLocaleTimeString('ar')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-blue-800 text-sm">
              <strong>💡 نصيحة:</strong> الأحداث المكررة تُتجاهل تلقائياً ولا تؤثر على الإحصائيات.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateEventDetector;
