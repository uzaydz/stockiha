import React, { useState, useEffect } from 'react';

interface TrackingEvent {
  timestamp: string;
  type: string;
  status: 'success' | 'error';
  details: any;
}

export const QuickTrackingCheck: React.FC = () => {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // استمع لأحداث التتبع
    const trackingData = (window as any).__trackingDebugData || [];
    setEvents(trackingData.slice(-5)); // آخر 5 أحداث

    // تحديث تلقائي كل 2 ثانية
    const interval = setInterval(() => {
      const updatedData = (window as any).__trackingDebugData || [];
      setEvents(updatedData.slice(-5));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // التحقق من وجود حدث شراء حديث
  const recentPurchase = events.find(
    event => event.type === 'purchase' && 
    Date.now() - new Date(event.timestamp).getTime() < 60000 // آخر دقيقة
  );

  if (!isVisible && !recentPurchase) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">🔍 حالة التتبع</h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isVisible ? '−' : '+'}
        </button>
      </div>

      {isVisible && (
        <div className="space-y-2">
          {recentPurchase && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center">
                <span className="text-green-600 font-medium">✅ تم تتبع الشراء</span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                المبلغ: {recentPurchase.details?.value} {recentPurchase.details?.currency}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {new Date(recentPurchase.timestamp).toLocaleTimeString('ar')}
              </div>
            </div>
          )}

          <div className="text-sm space-y-1">
            <div className="font-medium text-gray-700">آخر الأحداث:</div>
            {events.length === 0 ? (
              <div className="text-gray-500 text-xs">لا توجد أحداث حديثة</div>
            ) : (
              events.map((event, index) => (
                <div key={index} className="flex items-center text-xs">
                  <span className={`mr-2 ${
                    event.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {event.status === 'success' ? '✅' : '❌'}
                  </span>
                  <span className="text-gray-600">
                    {event.type} - {new Date(event.timestamp).toLocaleTimeString('ar')}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                alert('تحقق من Console للحصول على التفاصيل الكاملة');
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              عرض التفاصيل في Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickTrackingCheck;
