import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCallCenterAgentInfo } from '@/lib/api/permissions';
import { 
  Phone, 
  PhoneCall, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users,
  Target,
  Award,
  Calendar,
  Timer,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  FileText,
  Star,
  AlertCircle,
  PhoneIncoming,
  PhoneOutgoing,
  UserCheck,
  Eye,
  ChevronRight,
  Zap,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  description?: string;
}

const CallCenterDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const agentInfo = getCallCenterAgentInfo(userProfile);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  // إحصائيات اليوم (ستأتي من API لاحقاً)
  const todayStats: StatCard[] = [
    {
      title: 'الطلبيات المخصصة',
      value: 12,
      change: '+3',
      changeType: 'increase',
      icon: Phone,
      color: 'blue',
      description: 'طلبيات جديدة مخصصة لك'
    },
    {
      title: 'المكالمات المكتملة',
      value: 8,
      change: '+2',
      changeType: 'increase',
      icon: PhoneCall,
      color: 'green',
      description: 'مكالمات تمت بنجاح'
    },
    {
      title: 'الطلبيات المؤكدة',
      value: 6,
      change: '+1',
      changeType: 'increase',
      icon: CheckCircle,
      color: 'emerald',
      description: 'طلبيات تم تأكيدها'
    },
    {
      title: 'معدل النجاح',
      value: '75%',
      change: '+5%',
      changeType: 'increase',
      icon: Target,
      color: 'purple',
      description: 'نسبة نجاح المكالمات'
    },
  ];

  // إحصائيات الأداء المحسنة
  const performanceStats = [
    {
      title: 'متوسط وقت المكالمة',
      value: '4:32',
      subValue: 'دقيقة',
      icon: Timer,
      color: 'orange',
      trend: 'down',
      trendValue: '-12%'
    },
    {
      title: 'تقييم العملاء',
      value: '4.8',
      subValue: '/5',
      icon: Star,
      color: 'yellow',
      trend: 'up',
      trendValue: '+0.3'
    },
    {
      title: 'الإيرادات اليومية',
      value: '12,500',
      subValue: 'د.ج',
      icon: DollarSign,
      color: 'green',
      trend: 'up',
      trendValue: '+18%'
    },
    {
      title: 'معدل الاستجابة',
      value: '92%',
      subValue: 'من المكالمات',
      icon: PhoneIncoming,
      color: 'blue',
      trend: 'up',
      trendValue: '+4%'
    }
  ];

  // الطلبيات الأخيرة (بيانات تجريبية محسنة)
  const recentOrders = [
    {
      id: '1001',
      customerName: 'أحمد محمد',
      phone: '0123456789',
      status: 'pending',
      priority: 'high',
      assignedAt: '10:30 ص',
      amount: '5,500 د.ج',
      location: 'الجزائر العاصمة',
      attempts: 0
    },
    {
      id: '1002',
      customerName: 'فاطمة علي',
      phone: '0987654321',
      status: 'in_progress',
      priority: 'medium',
      assignedAt: '11:15 ص',
      amount: '3,200 د.ج',
      location: 'وهران',
      attempts: 1
    },
    {
      id: '1003',
      customerName: 'محمد حسن',
      phone: '0555666777',
      status: 'completed',
      priority: 'low',
      assignedAt: '09:45 ص',
      amount: '7,800 د.ج',
      location: 'قسنطينة',
      attempts: 2
    },
    {
      id: '1004',
      customerName: 'سارة أحمد',
      phone: '0666777888',
      status: 'pending',
      priority: 'high',
      assignedAt: '12:00 م',
      amount: '4,100 د.ج',
      location: 'عنابة',
      attempts: 0
    },
    {
      id: '1005',
      customerName: 'خالد محمد',
      phone: '0777888999',
      status: 'scheduled',
      priority: 'medium',
      assignedAt: '02:30 م',
      amount: '6,300 د.ج',
      location: 'باتنة',
      attempts: 1
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'scheduled':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'in_progress':
        return 'قيد المعالجة';
      case 'completed':
        return 'مكتمل';
      case 'scheduled':
        return 'مجدول';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      blue: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/40'
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        hover: 'hover:bg-green-200 dark:hover:bg-green-900/40'
      },
      emerald: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/40'
      },
      purple: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/40'
      },
      orange: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
        hover: 'hover:bg-orange-200 dark:hover:bg-orange-900/40'
      },
      yellow: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
        hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/40'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header محسن */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              مرحباً، {userProfile?.name || 'موظف مركز الاتصال'} 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              إليك ملخص أدائك - {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 dark:text-green-300 text-sm font-medium">متصل</span>
            </div>
            {agentInfo?.isSupervisor && (
              <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
                <UserCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-purple-800 dark:text-purple-300 text-sm font-medium">مشرف</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">جلسة نشطة</span>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="mt-6 flex gap-2">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedPeriod === period
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              )}
            >
              {period === 'today' ? 'اليوم' : period === 'week' ? 'هذا الأسبوع' : 'هذا الشهر'}
            </button>
          ))}
        </div>
      </div>

      {/* إحصائيات اليوم - محسنة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {todayStats.map((stat, index) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color);
          return (
            <div key={index} className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-current opacity-20"></div>
              </div>
              
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{stat.value}</p>
                  {stat.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.description}</p>
                  )}
                  {stat.change && (
                    <div className="flex items-center gap-1 mt-3">
                      {stat.changeType === 'increase' ? (
                        <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : stat.changeType === 'decrease' ? (
                        <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : null}
                      <span className={cn(
                        "text-sm font-medium",
                        stat.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 
                        stat.changeType === 'decrease' ? 'text-red-600 dark:text-red-400' : 
                        'text-gray-600 dark:text-gray-400'
                      )}>
                        {stat.change} من أمس
                      </span>
                    </div>
                  )}
                </div>
                <div className={cn("p-3 rounded-xl", colors.bg, colors.hover, "transition-colors")}>
                  <Icon className={cn("h-6 w-6", colors.text)} />
                </div>
              </div>
              
              {/* Hover Effect */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </div>
          );
        })}
      </div>

      {/* إحصائيات الأداء - محسنة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {performanceStats.map((stat, index) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color);
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg", colors.bg)}>
                  <Icon className={cn("h-5 w-5", colors.text)} />
                </div>
                {stat.trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    stat.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {stat.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    {stat.trendValue}
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
              <div className="flex items-baseline gap-1 mt-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.subValue}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* الطلبيات الأخيرة - محسنة */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">الطلبيات الأخيرة</h2>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1">
                عرض الكل
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="min-w-full bg-gray-50 dark:bg-gray-700/50 px-6 py-3 grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="text-right">الطلبية</div>
              <div className="text-right">العميل</div>
              <div className="text-right hidden sm:block">الموقع</div>
              <div className="text-right">القيمة</div>
              <div className="text-right">الحالة</div>
              <div className="text-center">إجراءات</div>
            </div>
            
            {/* Data rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentOrders.map((order) => (
                <div 
                  key={`order-${order.id}`} 
                  className="min-w-full px-6 py-4 grid grid-cols-6 gap-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">#{order.id}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{order.assignedAt}</div>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.customerName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {order.phone}
                    </div>
                  </div>
                  
                  <div className="hidden sm:block">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{order.location}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{order.amount}</div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex px-2 py-1 text-xs font-semibold rounded-full border", getStatusColor(order.status))}>
                      {getStatusText(order.status)}
                    </span>
                    <span className={cn("text-xs font-medium", getPriorityColor(order.priority))}>
                      {order.priority === 'high' ? '🔴' : order.priority === 'medium' ? '🟡' : '🟢'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" 
                      title="عرض التفاصيل"
                      type="button"
                    >
                      <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button 
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors" 
                      title="بدء المكالمة"
                      type="button"
                    >
                      <PhoneCall className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* إجراءات سريعة - محسنة */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">إجراءات سريعة</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg group">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5" />
                  <span className="font-medium">بدء جلسة عمل</span>
                </div>
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg group">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">طلبيات جديدة</span>
                </div>
                <span className="bg-white/20 px-2 py-1 rounded-full text-xs">5</span>
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg group">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5" />
                  <span className="font-medium">الإحصائيات</span>
                </div>
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">نصيحة اليوم</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  حاول البدء بالعملاء ذوي الأولوية العالية أولاً لتحسين معدل النجاح وزيادة رضا العملاء.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">النشاط الأخير</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">تم تأكيد الطلبية #1003</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">منذ 5 دقائق</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <PhoneOutgoing className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">مكالمة صادرة للعميل أحمد</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">منذ 10 دقائق</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">رسالة جديدة من المشرف</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">منذ 15 دقيقة</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallCenterDashboard;