import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Phone, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Pause,
  Play,
  RefreshCw,
  Bell,
  Eye,
  MessageSquare,
  TrendingUp,
  Zap
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ActiveAgent {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  current_call: {
    order_id: string;
    customer_name: string;
    start_time: Date;
    duration: number;
  } | null;
  today_stats: {
    calls_made: number;
    orders_completed: number;
    success_rate: number;
  };
  last_activity: Date;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  is_read: boolean;
}

interface LiveStats {
  active_agents: number;
  total_agents: number;
  ongoing_calls: number;
  pending_orders: number;
  avg_response_time: number;
  success_rate: number;
}

const CallCenterMonitoring: React.FC = () => {
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    active_agents: 0,
    total_agents: 0,
    ongoing_calls: 0,
    pending_orders: 0,
    avg_response_time: 0,
    success_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedAgent, setSelectedAgent] = useState<ActiveAgent | null>(null);

  // جلب بيانات الوكلاء
  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      // استخدام بيانات وهمية بدلاً من قاعدة البيانات
      // في المستقبل، سيتم استبدال هذا بـ Supabase query
      const mockAgents: ActiveAgent[] = [
        {
          id: '1',
          name: 'أحمد محمد',
          email: 'ahmed@example.com',
          status: 'online',
          current_call: {
            order_id: 'ORD-12345',
            customer_name: 'سارة أحمد',
            start_time: new Date(Date.now() - 5 * 60 * 1000),
            duration: 5
          },
          today_stats: {
            calls_made: 23,
            orders_completed: 21,
            success_rate: 91.3
          },
          last_activity: new Date(Date.now() - 2 * 60 * 1000)
        },
        {
          id: '2',
          name: 'فاطمة علي',
          email: 'fatima@example.com',
          status: 'busy',
          current_call: null,
          today_stats: {
            calls_made: 19,
            orders_completed: 18,
            success_rate: 94.7
          },
          last_activity: new Date(Date.now() - 1 * 60 * 1000)
        },
        {
          id: '3',
          name: 'محمد سالم',
          email: 'mohammed@example.com',
          status: 'busy',
          current_call: {
            order_id: 'ORD-12346',
            customer_name: 'خالد محمد',
            start_time: new Date(Date.now() - 12 * 60 * 1000),
            duration: 12
          },
          today_stats: {
            calls_made: 25,
            orders_completed: 22,
            success_rate: 88.0
          },
          last_activity: new Date(Date.now() - 30 * 1000)
        },
        {
          id: '4',
          name: 'نورا أحمد',
          email: 'nora@example.com',
          status: 'away',
          current_call: null,
          today_stats: {
            calls_made: 17,
            orders_completed: 16,
            success_rate: 94.1
          },
          last_activity: new Date(Date.now() - 15 * 60 * 1000)
        }
      ];

      setActiveAgents(mockAgents);

    } catch (err) {
      setError('فشل في جلب بيانات الوكلاء');
      setActiveAgents([]);
    } finally {
      setLoading(false);
    }
  };

  // جلب البيانات المباشرة
  const fetchLiveData = async () => {
    try {
      setError(null);

      // بيانات وهمية للموظفين النشطين (سيتم استبدالها ببيانات حقيقية)
      const mockActiveAgents: ActiveAgent[] = [
        {
          id: '1',
          name: 'أحمد محمد',
          email: 'ahmed@example.com',
          status: 'busy',
          current_call: {
            order_id: 'ORD-12345',
            customer_name: 'سارة أحمد',
            start_time: new Date(Date.now() - 5 * 60 * 1000),
            duration: 5
          },
          today_stats: {
            calls_made: 23,
            orders_completed: 21,
            success_rate: 91.3
          },
          last_activity: new Date(Date.now() - 2 * 60 * 1000)
        },
        {
          id: '2',
          name: 'فاطمة علي',
          email: 'fatima@example.com',
          status: 'online',
          current_call: null,
          today_stats: {
            calls_made: 19,
            orders_completed: 18,
            success_rate: 94.7
          },
          last_activity: new Date(Date.now() - 1 * 60 * 1000)
        },
        {
          id: '3',
          name: 'محمد سالم',
          email: 'mohammed@example.com',
          status: 'busy',
          current_call: {
            order_id: 'ORD-12346',
            customer_name: 'خالد محمد',
            start_time: new Date(Date.now() - 12 * 60 * 1000),
            duration: 12
          },
          today_stats: {
            calls_made: 25,
            orders_completed: 22,
            success_rate: 88.0
          },
          last_activity: new Date(Date.now() - 30 * 1000)
        },
        {
          id: '4',
          name: 'نورا أحمد',
          email: 'nora@example.com',
          status: 'away',
          current_call: null,
          today_stats: {
            calls_made: 17,
            orders_completed: 16,
            success_rate: 94.1
          },
          last_activity: new Date(Date.now() - 15 * 60 * 1000)
        }
      ];

      setActiveAgents(mockActiveAgents);

      // بيانات وهمية للتنبيهات
      const mockAlerts: SystemAlert[] = [
        {
          id: '1',
          type: 'warning',
          title: 'ارتفاع وقت الانتظار',
          message: 'متوسط وقت انتظار العملاء تجاوز 3 دقائق',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          is_read: false
        },
        {
          id: '2',
          type: 'info',
          title: 'موظف جديد متصل',
          message: 'انضم علي أحمد إلى نظام مركز الاتصال',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          is_read: false
        },
        {
          id: '3',
          type: 'error',
          title: 'فشل في الاتصال',
          message: 'فشل في الاتصال بالعميل رقم 12347 بعد 3 محاولات',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          is_read: true
        }
      ];

      setSystemAlerts(mockAlerts);

      // حساب الإحصائيات المباشرة
      const activeCount = mockActiveAgents.filter(a => a.status === 'online' || a.status === 'busy').length;
      const ongoingCalls = mockActiveAgents.filter(a => a.current_call).length;
      const totalCalls = mockActiveAgents.reduce((sum, a) => sum + a.today_stats.calls_made, 0);
      const totalCompleted = mockActiveAgents.reduce((sum, a) => sum + a.today_stats.orders_completed, 0);
      const avgSuccessRate = mockActiveAgents.reduce((sum, a) => sum + a.today_stats.success_rate, 0) / mockActiveAgents.length;

      setLiveStats({
        active_agents: activeCount,
        total_agents: mockActiveAgents.length,
        ongoing_calls: ongoingCalls,
        pending_orders: 45, // بيانات وهمية
        avg_response_time: 2.3, // بيانات وهمية
        success_rate: avgSuccessRate
      });

    } catch (err) {
      setError('فشل في جلب البيانات المباشرة');
    } finally {
      setLoading(false);
    }
  };

  // تحديث مدة المكالمات الجارية
  const updateCallDurations = () => {
    setActiveAgents(prev => prev.map(agent => {
      if (agent.current_call) {
        const duration = Math.floor((Date.now() - agent.current_call.start_time.getTime()) / (1000 * 60));
        return {
          ...agent,
          current_call: {
            ...agent.current_call,
            duration
          }
        };
      }
      return agent;
    }));
  };

  // تحديد تنبيه كمقروء
  const markAlertAsRead = (alertId: string) => {
    setSystemAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, is_read: true } : alert
    ));
  };

  // تحديد جميع التنبيهات كمقروءة
  const markAllAlertsAsRead = () => {
    setSystemAlerts(prev => prev.map(alert => ({ ...alert, is_read: true })));
  };

  // تحديث يدوي
  const manualRefresh = () => {
    setLoading(true);
    fetchLiveData();
  };

  // تبديل التحديث التلقائي
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  // تحديث تلقائي
  useEffect(() => {
    fetchLiveData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLiveData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // تحديث مدة المكالمات كل ثانية
  useEffect(() => {
    const interval = setInterval(updateCallDurations, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-blue-600 bg-blue-100';
      case 'away': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'متاح';
      case 'busy': return 'مشغول';
      case 'away': return 'غائب';
      case 'offline': return 'غير متصل';
      default: return 'غير معروف';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'info': return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default: return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading && activeAgents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">مراقبة مركز الاتصال المباشرة</h1>
              <p className="text-gray-600">مراقبة النشاط والأداء في الوقت الفعلي</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Auto Refresh Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAutoRefresh}
                className={`p-2 rounded-lg ${autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                title={autoRefresh ? 'إيقاف التحديث التلقائي' : 'تفعيل التحديث التلقائي'}
              >
                {autoRefresh ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <span className="text-sm text-gray-500">
                {autoRefresh ? `تحديث كل ${refreshInterval}ث` : 'التحديث متوقف'}
              </span>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={manualRefresh}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الموظفين النشطين</p>
              <p className="text-2xl font-bold text-green-600">
                {liveStats.active_agents}/{liveStats.total_agents}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">المكالمات الجارية</p>
              <p className="text-2xl font-bold text-blue-600">{liveStats.ongoing_calls}</p>
            </div>
            <Phone className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الطلبيات المعلقة</p>
              <p className="text-2xl font-bold text-yellow-600">{liveStats.pending_orders}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">وقت الاستجابة</p>
              <p className="text-2xl font-bold text-purple-600">{liveStats.avg_response_time}د</p>
            </div>
            <Zap className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معدل النجاح</p>
              <p className="text-2xl font-bold text-indigo-600">{liveStats.success_rate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">التنبيهات</p>
              <p className="text-2xl font-bold text-red-600">
                {systemAlerts.filter(a => !a.is_read).length}
              </p>
            </div>
            <Bell className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Agents */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">الموظفين النشطين</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activeAgents.map((agent) => (
                  <div key={agent.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {agent.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{agent.name}</h3>
                          <p className="text-sm text-gray-500">{agent.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                          {getStatusText(agent.status)}
                        </span>
                        <button
                          onClick={() => setSelectedAgent(agent)}
                          className="text-blue-600 hover:text-blue-800"
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Current Call Info */}
                    {agent.current_call && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              مكالمة جارية: {agent.current_call.customer_name}
                            </p>
                            <p className="text-xs text-blue-700">
                              طلب رقم: {agent.current_call.order_id}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-blue-900">
                              {agent.current_call.duration} دقيقة
                            </p>
                            <p className="text-xs text-blue-700">
                              {agent.current_call.start_time.toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Today Stats */}
                    <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{agent.today_stats.calls_made}</p>
                        <p className="text-xs text-gray-500">مكالمات</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{agent.today_stats.orders_completed}</p>
                        <p className="text-xs text-gray-500">مكتملة</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{agent.today_stats.success_rate}%</p>
                        <p className="text-xs text-gray-500">نجاح</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activeAgents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد موظفين نشطين</h3>
                  <p className="mt-1 text-sm text-gray-500">لا يوجد موظفين متصلين حالياً</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">تنبيهات النظام</h2>
                {systemAlerts.filter(a => !a.is_read).length > 0 && (
                  <button
                    onClick={markAllAlertsAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {systemAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      alert.is_read 
                        ? 'border-gray-200 bg-gray-50' 
                        : 'border-blue-200 bg-blue-50'
                    }`}
                    onClick={() => markAlertAsRead(alert.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <h3 className={`font-medium ${alert.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {alert.title}
                        </h3>
                        <p className={`text-sm mt-1 ${alert.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {alert.timestamp.toLocaleString('ar-SA')}
                        </p>
                      </div>
                      {!alert.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {systemAlerts.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد تنبيهات</h3>
                  <p className="mt-1 text-sm text-gray-500">جميع الأنظمة تعمل بشكل طبيعي</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  تفاصيل الموظف: {selectedAgent.name}
                </h3>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">المعلومات الأساسية</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="font-medium">الاسم:</span> {selectedAgent.name}</p>
                    <p><span className="font-medium">البريد الإلكتروني:</span> {selectedAgent.email}</p>
                    <p><span className="font-medium">الحالة:</span> 
                      <span className={`mr-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAgent.status)}`}>
                        {getStatusText(selectedAgent.status)}
                      </span>
                    </p>
                    <p><span className="font-medium">آخر نشاط:</span> {selectedAgent.last_activity.toLocaleString('ar-SA')}</p>
                  </div>
                </div>

                {/* Current Call */}
                {selectedAgent.current_call && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">المكالمة الحالية</h4>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                      <p><span className="font-medium">العميل:</span> {selectedAgent.current_call.customer_name}</p>
                      <p><span className="font-medium">رقم الطلب:</span> {selectedAgent.current_call.order_id}</p>
                      <p><span className="font-medium">وقت البداية:</span> {selectedAgent.current_call.start_time.toLocaleTimeString('ar-SA')}</p>
                      <p><span className="font-medium">المدة:</span> {selectedAgent.current_call.duration} دقيقة</p>
                    </div>
                  </div>
                )}

                {/* Today Stats */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">إحصائيات اليوم</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedAgent.today_stats.calls_made}</p>
                      <p className="text-sm text-gray-500">مكالمات</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedAgent.today_stats.orders_completed}</p>
                      <p className="text-sm text-gray-500">طلبيات مكتملة</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedAgent.today_stats.success_rate}%</p>
                      <p className="text-sm text-gray-500">معدل النجاح</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  إغلاق
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  <MessageSquare className="h-4 w-4 inline ml-1" />
                  إرسال رسالة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallCenterMonitoring;
