/**
 * تهيئة نظام مراقبة الأداء والتحليلات الشامل
 * يربط PerformanceTracker مع UltimateRequestController للحصول على أقصى استفادة
 */

import { performanceTracker } from './PerformanceTracker';
import { ultimateRequestController } from '../ultimateRequestController';
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
        console.log(report);
        return report;
      },
      clearAll: () => {
        performanceTracker.clearData();
        ultimateRequestController.clearAllCaches();
      },
      analyzeSlowRequests: () => {
        const report = PerformanceOptimizer.getInstance().getSlowRequestsReport();
        console.log(report);
        return PerformanceOptimizer.getInstance().generateOptimizationReport();
      },
      optimizationSuggestions: () => {
        const suggestions = PerformanceOptimizer.getInstance().generateOptimizationReport();
        console.group('🚀 اقتراحات تحسين الأداء');
        suggestions.forEach(suggestion => {
          console.log(`\n${suggestion.priority === 'high' ? '🔴' : '🟡'} ${suggestion.endpoint}`);
          console.log(`المشكلة: ${suggestion.issue}`);
          console.log(`الحل:`);
          console.log(suggestion.solution);
          console.log(`التحسين المتوقع: ${suggestion.expectedImprovement}`);
        });
        console.groupEnd();
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
        console.log('🧹 تم مسح جميع بيانات المراقبة');
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
        console.log('📊 تم تصدير التحليلات الكاملة');
      }
    });

    console.log(`
🚀 نظام مراقبة الأداء الشامل والمتطور جاهز!

📊 الأوامر المتاحة في الكونسول:
  • performanceAnalytics.getStats() - الإحصائيات الحالية
  • performanceAnalytics.getRequests() - آخر الطلبات
  • performanceAnalytics.analyzeDuplicates() - تحليل الطلبات المكررة
  • performanceAnalytics.generateReport() - تقرير مفصل بالحلول
  • performanceAnalytics.analyzeSlowRequests() - تحليل الطلبات البطيئة
  • performanceAnalytics.optimizationSuggestions() - اقتراحات تحسين مفصلة
  • performanceAnalytics.exportAll() - تصدير جميع البيانات
  • performanceAnalytics.clearAll() - مسح جميع البيانات

⌨️ اختصارات لوحة المفاتيح:
  • Ctrl + Shift + P - إظهار/إخفاء Widget
  • Ctrl + Shift + C - مسح جميع البيانات
  • Ctrl + Shift + E - تصدير البيانات

🔍 تحليل ذكي متطور:
  • يكشف الطلبات المهدرة والمكررة
  • يقترح حلول محددة لكل endpoint
  • يحسب الوقت والبيانات المحفوظة
  • ينذر فوراً للطلبات البطيئة الحرجة (>1000ms)
  • يوفر اقتراحات تحسين مخصصة لكل طلب

✨ Widget المراقبة يظهر في أعلى يمين الشاشة ويمكن سحبه وتحريكه!
    `);
  }
};

export default initializePerformanceAnalytics; 