import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Phone, 
  Clock, 
  Target,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  PieChart,
  Activity
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface ReportData {
  agentPerformance: {
    agent_id: string;
    agent_name: string;
    total_orders: number;
    completed_orders: number;
    success_rate: number;
    avg_call_duration: number;
    customer_satisfaction: number;
  }[];
  dailyStats: {
    date: string;
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    avg_response_time: number;
  }[];
  orderStats: {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    cancelled_orders: number;
    completion_rate: number;
  };
  callStats: {
    total_calls: number;
    answered_calls: number;
    missed_calls: number;
    avg_call_duration: number;
    peak_hours: string[];
  };
}

interface DateRange {
  start: string;
  end: string;
}

interface PerformanceData {
  date: string;
  calls_made: number;
  orders_completed: number;
  success_rate: number;
}

interface AgentStats {
  id: string;
  name: string;
  calls_made: number;
  orders_completed: number;
  success_rate: number;
  avg_call_duration: number;
  customer_satisfaction: number;
}

const CallCenterReports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedReport, setSelectedReport] = useState<'overview' | 'agents' | 'calls' | 'orders'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [agents, setAgents] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [agentStats, setAgentStats] = useState<any[]>([]);

  // جلب البيانات
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // استخدام بيانات وهمية بدلاً من قاعدة البيانات
      // في المستقبل، سيتم استبدال هذا بـ Supabase queries
      
      // بيانات الأداء اليومي
      const mockPerformanceData: PerformanceData[] = [
        { date: '2024-01-01', calls_made: 45, orders_completed: 42, success_rate: 93.3 },
        { date: '2024-01-02', calls_made: 52, orders_completed: 48, success_rate: 92.3 },
        { date: '2024-01-03', calls_made: 38, orders_completed: 35, success_rate: 92.1 },
        { date: '2024-01-04', calls_made: 61, orders_completed: 56, success_rate: 91.8 },
        { date: '2024-01-05', calls_made: 47, orders_completed: 44, success_rate: 93.6 },
        { date: '2024-01-06', calls_made: 55, orders_completed: 51, success_rate: 92.7 },
        { date: '2024-01-07', calls_made: 43, orders_completed: 40, success_rate: 93.0 }
      ];

      // بيانات أداء الوكلاء
      const mockAgentStats: AgentStats[] = [
        {
          id: '1',
          name: 'أحمد محمد',
          calls_made: 156,
          orders_completed: 142,
          success_rate: 91.0,
          avg_call_duration: 4.2,
          customer_satisfaction: 4.6
        },
        {
          id: '2',
          name: 'فاطمة علي',
          calls_made: 134,
          orders_completed: 125,
          success_rate: 93.3,
          avg_call_duration: 3.8,
          customer_satisfaction: 4.8
        },
        {
          id: '3',
          name: 'محمد السعد',
          calls_made: 89,
          orders_completed: 78,
          success_rate: 87.6,
          avg_call_duration: 5.1,
          customer_satisfaction: 4.2
        },
        {
          id: '4',
          name: 'نورا أحمد',
          calls_made: 112,
          orders_completed: 105,
          success_rate: 93.8,
          avg_call_duration: 3.5,
          customer_satisfaction: 4.9
        }
      ];

      setPerformanceData(mockPerformanceData);
      setAgentStats(mockAgentStats);

      // إنشاء بيانات التقرير الرئيسي
      const mockReportData: ReportData = {
        agentPerformance: mockAgentStats.map(agent => ({
          agent_id: agent.id,
          agent_name: agent.name,
          total_orders: agent.calls_made,
          completed_orders: agent.orders_completed,
          success_rate: agent.success_rate,
          avg_call_duration: agent.avg_call_duration,
          customer_satisfaction: agent.customer_satisfaction
        })),
        dailyStats: mockPerformanceData.map(day => ({
          date: day.date,
          total_calls: day.calls_made,
          successful_calls: day.orders_completed,
          failed_calls: day.calls_made - day.orders_completed,
          avg_response_time: 2.5
        })),
        orderStats: {
          total_orders: 1250,
          completed_orders: 1156,
          pending_orders: 67,
          cancelled_orders: 27,
          completion_rate: 92.5
        },
        callStats: {
          total_calls: 1250,
          answered_calls: 1156,
          missed_calls: 94,
          avg_call_duration: 4.2,
          peak_hours: ['10:00', '14:00', '16:00']
        }
      };

      setReportData(mockReportData);

    } catch (err) {
      setError('فشل في جلب بيانات التقارير');
      setPerformanceData([]);
      setAgentStats([]);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // تصدير التقرير
  const exportReport = (format: 'excel' | 'pdf' | 'csv') => {
    // سيتم تنفيذ تصدير التقارير لاحقاً
    alert(`سيتم تصدير التقرير بصيغة ${format} قريباً`);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedAgent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد بيانات</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">تقارير مركز الاتصال</h1>
        </div>
        <p className="text-gray-600">تحليل شامل لأداء مركز الاتصال والموظفين</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500">إلى</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Agent Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">جميع الموظفين</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.users?.name || 'غير محدد'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportReport('excel')}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={() => exportReport('pdf')}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={() => exportReport('csv')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { id: 'overview', name: 'نظرة عامة', icon: Activity },
              { id: 'agents', name: 'أداء الموظفين', icon: Users },
              { id: 'calls', name: 'إحصائيات المكالمات', icon: Phone },
              { id: 'orders', name: 'إحصائيات الطلبيات', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedReport(tab.id as any)}
                className={`${
                  selectedReport === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Report Content */}
      {selectedReport === 'overview' && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي الطلبيات</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.orderStats.total_orders.toLocaleString()}</p>
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +12% من الشهر الماضي
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">معدل الإنجاز</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.orderStats.completion_rate}%</p>
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +3% من الشهر الماضي
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي المكالمات</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.callStats.total_calls.toLocaleString()}</p>
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +8% من الشهر الماضي
                  </p>
                </div>
                <Phone className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">متوسط مدة المكالمة</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.callStats.avg_call_duration} دقيقة</p>
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    -0.3 دقيقة من الشهر الماضي
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">اتجاه المكالمات اليومية</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">سيتم إضافة الرسم البياني قريباً</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع حالات الطلبيات</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <PieChart className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">سيتم إضافة الرسم البياني قريباً</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'agents' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">أداء الموظفين</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الموظف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    إجمالي الطلبيات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الطلبيات المكتملة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    معدل النجاح
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    متوسط مدة المكالمة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رضا العملاء
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.agentPerformance.map((agent) => (
                  <tr key={agent.agent_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {agent.agent_name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {agent.agent_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.total_orders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.completed_orders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${agent.success_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{agent.success_rate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.avg_call_duration} دقيقة
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 ml-1" />
                        <span className="text-sm text-gray-900">{agent.customer_satisfaction}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedReport === 'calls' && (
        <div className="space-y-8">
          {/* Call Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">المكالمات المجابة</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.callStats.answered_calls.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    {((reportData.callStats.answered_calls / reportData.callStats.total_calls) * 100).toFixed(1)}% من الإجمالي
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">المكالمات المفقودة</p>
                  <p className="text-2xl font-bold text-red-600">{reportData.callStats.missed_calls.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    {((reportData.callStats.missed_calls / reportData.callStats.total_calls) * 100).toFixed(1)}% من الإجمالي
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ساعات الذروة</p>
                  <p className="text-lg font-bold text-blue-600">
                    {reportData.callStats.peak_hours.join(', ')}
                  </p>
                  <p className="text-sm text-gray-500">أعلى نشاط للمكالمات</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Daily Call Trend */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">اتجاه المكالمات اليومية</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">سيتم إضافة الرسم البياني التفاعلي قريباً</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport === 'orders' && (
        <div className="space-y-8">
          {/* Order Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الطلبيات المكتملة</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.orderStats.completed_orders.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الطلبيات المعلقة</p>
                  <p className="text-2xl font-bold text-yellow-600">{reportData.orderStats.pending_orders.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">الطلبيات الملغية</p>
                  <p className="text-2xl font-bold text-red-600">{reportData.orderStats.cancelled_orders.toLocaleString()}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">معدل الإنجاز</p>
                  <p className="text-2xl font-bold text-blue-600">{reportData.orderStats.completion_rate}%</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">توزيع حالات الطلبيات</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">مكتملة</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(reportData.orderStats.completed_orders / reportData.orderStats.total_orders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-12">
                    {((reportData.orderStats.completed_orders / reportData.orderStats.total_orders) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">معلقة</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ width: `${(reportData.orderStats.pending_orders / reportData.orderStats.total_orders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-12">
                    {((reportData.orderStats.pending_orders / reportData.orderStats.total_orders) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">ملغية</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${(reportData.orderStats.cancelled_orders / reportData.orderStats.total_orders) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-12">
                    {((reportData.orderStats.cancelled_orders / reportData.orderStats.total_orders) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallCenterReports;
