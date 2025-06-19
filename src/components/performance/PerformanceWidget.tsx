/**
 * Widget عائم ومتطور للمراقبة والتحليل الفوري
 * يظهر في كل صفحة ويعرض إحصائيات شاملة عن الأداء والطلبات
 */

import React, { useState, useEffect, useRef } from 'react';
import { performanceTracker } from '@/lib/analytics/PerformanceTracker';
import DuplicateRequestAnalyzer from '@/lib/analytics/DuplicateRequestAnalyzer';

interface WidgetState {
  isExpanded: boolean;
  isMinimized: boolean;
  activeTab: 'overview' | 'requests' | 'performance' | 'cache' | 'system';
  position: { x: number; y: number };
  isDragging: boolean;
}

const PerformanceWidget: React.FC = () => {
  const [state, setState] = useState<WidgetState>({
    isExpanded: false,
    isMinimized: false,
    activeTab: 'overview',
    position: { x: window.innerWidth - 320, y: 20 },
    isDragging: false,
  });

  const [stats, setStats] = useState(performanceTracker.getRealtimeStats());
  const [requests, setRequests] = useState(performanceTracker.getDetailedRequests(20));
  const [isEnabled, setIsEnabled] = useState(true);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // تحديث البيانات كل ثانية
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      setStats(performanceTracker.getRealtimeStats());
      setRequests(performanceTracker.getDetailedRequests(20));
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  // معالجة السحب والإفلات
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return;
      
      setState(prev => ({
        ...prev,
        position: {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        },
      }));
    };

    const handleMouseUp = () => {
      setState(prev => ({ ...prev, isDragging: false }));
    };

    if (state.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state.isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    
    const rect = dragRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    setState(prev => ({ ...prev, isDragging: true }));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getRequestTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'supabase': '#10B981',
      'auth': '#F59E0B',
      'fetch': '#3B82F6',
      'image': '#8B5CF6',
      'xhr': '#EF4444',
    };
    return colors[type] || '#6B7280';
  };

  const getStatusColor = (status?: number): string => {
    if (!status) return '#6B7280';
    if (status >= 200 && status < 300) return '#10B981';
    if (status >= 300 && status < 400) return '#F59E0B';
    if (status >= 400) return '#EF4444';
    return '#6B7280';
  };

  if (!isEnabled) {
    return (
      <div
        className="fixed top-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-md shadow-lg cursor-pointer"
        onClick={() => setIsEnabled(true)}
      >
        📊 تفعيل مراقب الأداء
      </div>
    );
  }

  if (state.isMinimized) {
    return (
      <div
        className="fixed z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full shadow-lg cursor-pointer transition-all duration-300 hover:scale-110"
        style={{ left: state.position.x, top: state.position.y }}
        onClick={() => setState(prev => ({ ...prev, isMinimized: false, isExpanded: true }))}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-bold">{stats.totalRequests.get + stats.totalRequests.post}</span>
          <span className="text-xs">طلبات</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200"
      style={{ 
        left: state.position.x, 
        top: state.position.y,
        width: state.isExpanded ? '400px' : '300px',
        maxHeight: state.isExpanded ? '600px' : '200px',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {/* شريط العنوان */}
      <div
        ref={dragRef}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-t-lg cursor-move flex items-center justify-between"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="font-bold text-sm">مراقب الأداء المتطور</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
            className="p-1 hover:bg-white/20 rounded text-xs"
          >
            {state.isExpanded ? '📉' : '📈'}
          </button>
          <button
            onClick={() => setState(prev => ({ ...prev, isMinimized: true }))}
            className="p-1 hover:bg-white/20 rounded text-xs"
          >
            ➖
          </button>
          <button
            onClick={() => setIsEnabled(false)}
            className="p-1 hover:bg-white/20 rounded text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* النظرة العامة السريعة */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-blue-50 p-2 rounded text-center">
            <div className="text-lg font-bold text-blue-600">
              {stats.totalRequests.get + stats.totalRequests.post}
            </div>
            <div className="text-xs text-gray-600">إجمالي الطلبات</div>
          </div>
          <div className="bg-green-50 p-2 rounded text-center">
            <div className="text-lg font-bold text-green-600">
              {stats.totalRequests.cached}
            </div>
            <div className="text-xs text-gray-600">من الكاش</div>
          </div>
          <div className="bg-purple-50 p-2 rounded text-center">
            <div className="text-lg font-bold text-purple-600">
              {formatTime(stats.networkStats.averageResponseTime)}
            </div>
            <div className="text-xs text-gray-600">متوسط الاستجابة</div>
          </div>
          <div className="bg-orange-50 p-2 rounded text-center">
            <div className="text-lg font-bold text-orange-600">
              {formatBytes(stats.currentPage.totalDataTransferred)}
            </div>
            <div className="text-xs text-gray-600">البيانات المنقولة</div>
          </div>
        </div>

        {state.isExpanded && (
          <>
            {/* آخر الطلبات */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-2">🌐 آخر الطلبات ({requests.length})</h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {requests.slice(-10).reverse().map((request) => (
                  <div key={request.id} className="bg-gray-50 p-2 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getRequestTypeColor(request.type) }}
                        ></div>
                        <span className="font-mono font-bold text-blue-600">{request.method}</span>
                        <span
                          className="px-1 py-0.5 rounded text-white text-xs"
                          style={{ backgroundColor: getStatusColor(request.status) }}
                        >
                          {request.status || '?'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {request.cached && (
                          <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">كاش</span>
                        )}
                        {request.blocked && (
                          <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs">محظور</span>
                        )}
                        <span className="font-mono">{formatTime(request.duration || 0)}</span>
                      </div>
                    </div>
                    <div className="text-gray-600 truncate">
                      {new URL(request.url).pathname}
                    </div>
                    {request.size && (
                      <div className="text-gray-500 text-xs mt-1">
                        {formatBytes(request.size)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  performanceTracker.clearData();
                  setStats(performanceTracker.getRealtimeStats());
                  setRequests(performanceTracker.getDetailedRequests(20));
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-xs transition-colors"
              >
                🗑️ مسح البيانات
              </button>
              <button
                onClick={() => {
                  // تحسين: معالجة غير متزامنة لمنع البطء
                  requestAnimationFrame(() => {
                    try {
                      const report = DuplicateRequestAnalyzer.generateReport(requests);
                      // إشعار سريع بدلاً من alert
                      const notification = document.createElement('div');
                      notification.innerHTML = '✅ تم إنشاء تقرير التحليل في الكونسول!';
                      notification.style.cssText = `
                        position: fixed; top: 20px; right: 20px; z-index: 9999;
                        background: #10B981; color: white; padding: 12px 20px;
                        border-radius: 8px; font-size: 14px; font-weight: bold;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        animation: slideInRight 0.3s ease-out;
                      `;
                      document.body.appendChild(notification);
                      setTimeout(() => notification.remove(), 3000);
                    } catch (error) {
                    }
                  });
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-1 px-2 rounded text-xs transition-colors"
              >
                🔍 تحليل المكررات
              </button>
              <button
                onClick={() => {
                  const data = performanceTracker.exportData();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs transition-colors"
              >
                📊 تصدير البيانات
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PerformanceWidget;
