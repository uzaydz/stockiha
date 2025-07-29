import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PerformanceStats {
  date: string;
  ordersAssigned: number;
  ordersCompleted: number;
  ordersCancelled: number;
  callsMade: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  completionRate: number;
  avgCallDuration: number; // بالدقائق
  customerSatisfaction: number;
}

interface PerformanceTrends {
  today: PerformanceStats;
  yesterday: PerformanceStats;
  thisWeek: PerformanceStats;
  lastWeek: PerformanceStats;
  thisMonth: PerformanceStats;
  lastMonth: PerformanceStats;
}

interface UseAgentPerformanceReturn {
  // البيانات
  performance: PerformanceTrends | null;
  dailyStats: PerformanceStats[];
  
  // حالات التحميل والأخطاء
  loading: boolean;
  error: string | null;
  
  // العمليات
  refreshPerformance: () => Promise<void>;
  updatePerformanceMetrics: (agentId: string) => Promise<boolean>;
  
  // إحصائيات سريعة
  quickStats: {
    todayCallsCount: number;
    todaySuccessRate: number;
    weeklyAverage: number;
    monthlyGoalProgress: number;
  };
}

export const useAgentPerformance = (agentId?: string): UseAgentPerformanceReturn => {
  const [performance, setPerformance] = useState<PerformanceTrends | null>(null);
  const [dailyStats, setDailyStats] = useState<PerformanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickStats, setQuickStats] = useState({
    todayCallsCount: 0,
    todaySuccessRate: 0,
    weeklyAverage: 0,
    monthlyGoalProgress: 0
  });

  // إنشاء إحصائية فارغة
  const createEmptyStats = (date: string): PerformanceStats => ({
    date,
    ordersAssigned: 0,
    ordersCompleted: 0,
    ordersCancelled: 0,
    callsMade: 0,
    successfulCalls: 0,
    failedCalls: 0,
    successRate: 0,
    completionRate: 0,
    avgCallDuration: 0,
    customerSatisfaction: 0
  });

  // تحويل بيانات قاعدة البيانات إلى إحصائيات
  const transformStatsData = (data: any): PerformanceStats => ({
    date: data.date,
    ordersAssigned: data.orders_assigned || 0,
    ordersCompleted: data.orders_completed || 0,
    ordersCancelled: data.orders_cancelled || 0,
    callsMade: data.calls_made || 0,
    successfulCalls: data.successful_calls || 0,
    failedCalls: data.failed_calls || 0,
    successRate: data.success_rate || 0,
    completionRate: data.completion_rate || 0,
    avgCallDuration: data.avg_call_duration ? parseFloat(data.avg_call_duration) / 60 : 0, // تحويل من ثواني إلى دقائق
    customerSatisfaction: data.customer_satisfaction_score || 0
  });

  // جلب إحصائيات الأداء
  const fetchPerformanceData = async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      setError(null);

      // تحديد التواريخ المطلوبة
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      // جلب البيانات من قاعدة البيانات
      const { data: statsData, error: statsError } = await supabase
        .from('agent_performance_stats')
        .select('*')
        .eq('agent_id', agentId)
        .gte('date', lastMonthStart.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (statsError) throw statsError;

      // تنظيم البيانات حسب التاريخ
      const statsMap = new Map();
      (statsData || []).forEach(stat => {
        statsMap.set(stat.date, transformStatsData(stat));
      });

      // إنشاء الإحصائيات المطلوبة
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const todayStats = statsMap.get(todayStr) || createEmptyStats(todayStr);
      const yesterdayStats = statsMap.get(yesterdayStr) || createEmptyStats(yesterdayStr);

      // حساب إحصائيات الأسبوع
      const thisWeekStats = createEmptyStats('this-week');
      const lastWeekStats = createEmptyStats('last-week');
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayStats = statsMap.get(dateStr);
        
        if (dayStats) {
          thisWeekStats.ordersAssigned += dayStats.ordersAssigned;
          thisWeekStats.ordersCompleted += dayStats.ordersCompleted;
          thisWeekStats.callsMade += dayStats.callsMade;
          thisWeekStats.successfulCalls += dayStats.successfulCalls;
        }

        // الأسبوع الماضي
        const lastWeekDate = new Date(lastWeekStart);
        lastWeekDate.setDate(lastWeekDate.getDate() + i);
        const lastWeekDateStr = lastWeekDate.toISOString().split('T')[0];
        const lastWeekDayStats = statsMap.get(lastWeekDateStr);
        
        if (lastWeekDayStats) {
          lastWeekStats.ordersAssigned += lastWeekDayStats.ordersAssigned;
          lastWeekStats.ordersCompleted += lastWeekDayStats.ordersCompleted;
          lastWeekStats.callsMade += lastWeekDayStats.callsMade;
          lastWeekStats.successfulCalls += lastWeekDayStats.successfulCalls;
        }
      }

      // حساب المعدلات للأسبوع
      thisWeekStats.successRate = thisWeekStats.callsMade > 0 
        ? (thisWeekStats.successfulCalls / thisWeekStats.callsMade) * 100 
        : 0;
      thisWeekStats.completionRate = thisWeekStats.ordersAssigned > 0 
        ? (thisWeekStats.ordersCompleted / thisWeekStats.ordersAssigned) * 100 
        : 0;

      lastWeekStats.successRate = lastWeekStats.callsMade > 0 
        ? (lastWeekStats.successfulCalls / lastWeekStats.callsMade) * 100 
        : 0;
      lastWeekStats.completionRate = lastWeekStats.ordersAssigned > 0 
        ? (lastWeekStats.ordersCompleted / lastWeekStats.ordersAssigned) * 100 
        : 0;

      // حساب إحصائيات الشهر
      const thisMonthStats = createEmptyStats('this-month');
      const lastMonthStats = createEmptyStats('last-month');

      (statsData || []).forEach(stat => {
        const statDate = new Date(stat.date);
        const transformedStat = transformStatsData(stat);
        
        if (statDate >= monthStart) {
          thisMonthStats.ordersAssigned += transformedStat.ordersAssigned;
          thisMonthStats.ordersCompleted += transformedStat.ordersCompleted;
          thisMonthStats.callsMade += transformedStat.callsMade;
          thisMonthStats.successfulCalls += transformedStat.successfulCalls;
        } else if (statDate >= lastMonthStart && statDate <= lastMonthEnd) {
          lastMonthStats.ordersAssigned += transformedStat.ordersAssigned;
          lastMonthStats.ordersCompleted += transformedStat.ordersCompleted;
          lastMonthStats.callsMade += transformedStat.callsMade;
          lastMonthStats.successfulCalls += transformedStat.successfulCalls;
        }
      });

      // حساب المعدلات للشهر
      thisMonthStats.successRate = thisMonthStats.callsMade > 0 
        ? (thisMonthStats.successfulCalls / thisMonthStats.callsMade) * 100 
        : 0;
      thisMonthStats.completionRate = thisMonthStats.ordersAssigned > 0 
        ? (thisMonthStats.ordersCompleted / thisMonthStats.ordersAssigned) * 100 
        : 0;

      lastMonthStats.successRate = lastMonthStats.callsMade > 0 
        ? (lastMonthStats.successfulCalls / lastMonthStats.callsMade) * 100 
        : 0;
      lastMonthStats.completionRate = lastMonthStats.ordersAssigned > 0 
        ? (lastMonthStats.ordersCompleted / lastMonthStats.ordersAssigned) * 100 
        : 0;

      // تعيين البيانات
      setPerformance({
        today: todayStats,
        yesterday: yesterdayStats,
        thisWeek: thisWeekStats,
        lastWeek: lastWeekStats,
        thisMonth: thisMonthStats,
        lastMonth: lastMonthStats
      });

      // تعيين الإحصائيات اليومية (آخر 30 يوم)
      const last30Days = Array.from(statsMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30);
      setDailyStats(last30Days);

      // حساب الإحصائيات السريعة
      const weeklyAverage = thisWeekStats.callsMade / 7;
      const monthlyGoal = 100; // هدف شهري افتراضي
      const monthlyProgress = (thisMonthStats.ordersCompleted / monthlyGoal) * 100;

      setQuickStats({
        todayCallsCount: todayStats.callsMade,
        todaySuccessRate: todayStats.successRate,
        weeklyAverage: Math.round(weeklyAverage * 10) / 10,
        monthlyGoalProgress: Math.min(monthlyProgress, 100)
      });

    } catch (err) {
      setError('فشل في جلب بيانات الأداء');
    } finally {
      setLoading(false);
    }
  };

  // تحديث مقاييس الأداء
  const updatePerformanceMetrics = async (targetAgentId: string): Promise<boolean> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // استدعاء دالة تحديث الأداء من قاعدة البيانات
      const { error } = await supabase.rpc('update_agent_performance', {
        p_agent_id: targetAgentId,
        p_date: today
      });

      if (error) throw error;

      // تحديث البيانات المحلية
      await fetchPerformanceData();
      
      return true;
    } catch (err) {
      setError('فشل في تحديث مقاييس الأداء');
      return false;
    }
  };

  // تحديث البيانات
  const refreshPerformance = async (): Promise<void> => {
    await fetchPerformanceData();
  };

  // تحميل البيانات عند تغيير معرف الموظف
  useEffect(() => {
    if (agentId) {
      fetchPerformanceData();
    } else {
      setPerformance(null);
      setDailyStats([]);
      setLoading(false);
    }
  }, [agentId]);

  return {
    performance,
    dailyStats,
    loading,
    error,
    refreshPerformance,
    updatePerformanceMetrics,
    quickStats
  };
};
