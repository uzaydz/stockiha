/**
 * تهيئة نظام مراقبة الأداء والتحليلات الشامل
 * يربط PerformanceTracker مع UltimateRequestController للحصول على أقصى استفادة
 */

import { performanceTracker } from './PerformanceTracker';
// تم حذف UltimateRequestController
import DuplicateRequestAnalyzer from './DuplicateRequestAnalyzer';
import PerformanceOptimizer from './performanceOptimizer';

export const initializePerformanceAnalytics = (): void => {
  // تهيئة نظام المراقبة
  performanceTracker; // سيتم تهيئته تلقائياً عند الاستيراد

  // ربط مع UltimateRequestController للحصول على معلومات إضافية
  if (typeof window !== 'undefined') {
    // إضافة دوال مساعدة للمطورين في الكونسول
    (window as any).performanceAnalytics = {
      getStats: () => performanceTracker.getRealtimeStats(),
      getRequests: (limit?: number) => performanceTracker.getDetailedRequests(limit),
      getPageHistory: () => performanceTracker.getPageHistory(),
      getRequestControllerStats: () => ultimateRequestController.getAnalytics(),
      analyzeDuplicates: (requests?: any[]) => {
        const requestData = requests || performanceTracker.getDetailedRequests(100);
        return DuplicateRequestAnalyzer.analyzeRequests(requestData);
      },
      generateReport: (requests?: any[]) => {
        const requestData = requests || performanceTracker.getDetailedRequests(100);
        const report = DuplicateRequestAnalyzer.generateReport(requestData);
        return report;
      },
      clearAll: () => {
        performanceTracker.clearData();
        ultimateRequestController.clearAllCaches();
      },
      analyzeSlowRequests: () => {
        const report = PerformanceOptimizer.getInstance().getSlowRequestsReport();
        return PerformanceOptimizer.getInstance().generateOptimizationReport();
      },
      optimizationSuggestions: () => {
        const suggestions = PerformanceOptimizer.getInstance().generateOptimizationReport();
        suggestions.forEach(suggestion => {
        });
        return suggestions;
      },
      exportAll: () => ({
        performance: performanceTracker.exportData(),
        requestController: ultimateRequestController.getAnalytics(),
        duplicateAnalysis: DuplicateRequestAnalyzer.analyzeRequests(performanceTracker.getDetailedRequests(100)),
        slowRequestsAnalysis: PerformanceOptimizer.getInstance().generateOptimizationReport(),
        timestamp: Date.now(),
      }),
    };

    // إضافة keyboard shortcuts للمطورين
    document.addEventListener('keydown', (e) => {
      // Ctrl + Shift + P = إظهار/إخفاء Widget
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const event = new CustomEvent('togglePerformanceWidget');
        window.dispatchEvent(event);
      }

      // Ctrl + Shift + C = مسح جميع البيانات
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        (window as any).performanceAnalytics.clearAll();
      }

      // Ctrl + Shift + E = تصدير البيانات
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        const data = (window as any).performanceAnalytics.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `complete-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });

  }
};

export default initializePerformanceAnalytics;
