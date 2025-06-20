import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Phone, 
  CheckCircle, 
  Clock, 
  Target,
  Award,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface PerformanceData {
  today: {
    ordersAssigned: number;
    ordersCompleted: number;
    callsMade: number;
    successfulCalls: number;
    avgCallDuration: string;
    customerSatisfaction: number;
  };
  thisWeek: {
    ordersAssigned: number;
    ordersCompleted: number;
    callsMade: number;
    successfulCalls: number;
    avgCallDuration: string;
    customerSatisfaction: number;
  };
  thisMonth: {
    ordersAssigned: number;
    ordersCompleted: number;
    callsMade: number;
    successfulCalls: number;
    avgCallDuration: string;
    customerSatisfaction: number;
  };
  trends: {
    ordersCompletedTrend: number; // نسبة التغيير
    successRateTrend: number;
    satisfactionTrend: number;
  };
  goals: {
    dailyOrdersTarget: number;
    weeklyOrdersTarget: number;
    monthlyOrdersTarget: number;
    targetSuccessRate: number;
    targetSatisfaction: number;
  };
}

interface AgentPerformanceWidgetProps {
  agentId: string;
  agentName: string;
  data?: PerformanceData;
  isLoading?: boolean;
  compact?: boolean;
}

const AgentPerformanceWidget: React.FC<AgentPerformanceWidgetProps> = ({
  agentId,
  agentName,
  data,
  isLoading = false,
  compact = false
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'thisWeek' | 'thisMonth'>('today');

  // بيانات تجريبية إذا لم تُمرر بيانات
  const defaultData: PerformanceData = {
    today: {
      ordersAssigned: 12,
      ordersCompleted: 8,
      callsMade: 15,
      successfulCalls: 10,
      avgCallDuration: '4:32',
      customerSatisfaction: 4.8
    },
    thisWeek: {
      ordersAssigned: 65,
      ordersCompleted: 48,
      callsMade: 78,
      successfulCalls: 52,
      avgCallDuration: '4:45',
      customerSatisfaction: 4.6
    },
    thisMonth: {
      ordersAssigned: 280,
      ordersCompleted: 210,
      callsMade: 320,
      successfulCalls: 225,
      avgCallDuration: '4:38',
      customerSatisfaction: 4.7
    },
    trends: {
      ordersCompletedTrend: 12.5,
      successRateTrend: 8.3,
      satisfactionTrend: -2.1
    },
    goals: {
      dailyOrdersTarget: 10,
      weeklyOrdersTarget: 50,
      monthlyOrdersTarget: 200,
      targetSuccessRate: 75,
      targetSatisfaction: 4.5
    }
  };

  const performanceData = data || defaultData;
  const currentData = performanceData[selectedPeriod];

  // حساب معدل النجاح
  const successRate = currentData.callsMade > 0 
    ? Math.round((currentData.successfulCalls / currentData.callsMade) * 100)
    : 0;

  // حساب معدل إكمال الطلبيات
  const completionRate = currentData.ordersAssigned > 0
    ? Math.round((currentData.ordersCompleted / currentData.ordersAssigned) * 100)
    : 0;

  // حساب التقدم نحو الهدف
  const getGoalProgress = () => {
    switch (selectedPeriod) {
      case 'today':
        return Math.min((currentData.ordersCompleted / performanceData.goals.dailyOrdersTarget) * 100, 100);
      case 'thisWeek':
        return Math.min((currentData.ordersCompleted / performanceData.goals.weeklyOrdersTarget) * 100, 100);
      case 'thisMonth':
        return Math.min((currentData.ordersCompleted / performanceData.goals.monthlyOrdersTarget) * 100, 100);
      default:
        return 0;
    }
  };

  const goalProgress = getGoalProgress();

  // مكون شريط التقدم
  const ProgressBar: React.FC<{ value: number; max: number; color: string; label: string }> = 
    ({ value, max, color, label }) => {
      const percentage = Math.min((value / max) * 100, 100);
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium">{value}/{max}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${color}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 text-left">
            {percentage.toFixed(1)}%
          </div>
        </div>
      );
    };

  // مكون الاتجاه
  const TrendIndicator: React.FC<{ value: number }> = ({ value }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    return (
      <div className={`flex items-center text-sm ${
        isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'
      }`}>
        {!isNeutral && (
          isPositive ? <TrendingUp className="h-4 w-4 ml-1" /> : <TrendingDown className="h-4 w-4 ml-1" />
        )}
        <span>{isNeutral ? '0%' : `${isPositive ? '+' : ''}${value.toFixed(1)}%`}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 ml-2 text-blue-600" />
            أدائي اليوم
          </h3>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('ar-SA')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {performanceData.today.ordersCompleted}
            </div>
            <div className="text-sm text-gray-600">طلبيات مكتملة</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {successRate}%
            </div>
            <div className="text-sm text-gray-600">معدل النجاح</div>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar 
            value={performanceData.today.ordersCompleted}
            max={performanceData.goals.dailyOrdersTarget}
            color="bg-blue-600"
            label="الهدف اليومي"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="bg-blue-100 p-2 rounded-lg">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">إحصائيات الأداء</h3>
            <p className="text-gray-600">{agentName}</p>
          </div>
        </div>
        
        {/* اختيار الفترة */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { key: 'today', label: 'اليوم' },
            { key: 'thisWeek', label: 'الأسبوع' },
            { key: 'thisMonth', label: 'الشهر' }
          ].map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key as any)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">الطلبيات المكتملة</p>
              <p className="text-2xl font-bold text-blue-900">{currentData.ordersCompleted}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
          <TrendIndicator value={performanceData.trends.ordersCompletedTrend} />
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">معدل النجاح</p>
              <p className="text-2xl font-bold text-green-900">{successRate}%</p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
          <TrendIndicator value={performanceData.trends.successRateTrend} />
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">متوسط المكالمة</p>
              <p className="text-2xl font-bold text-purple-900">{currentData.avgCallDuration}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">تقييم العملاء</p>
              <p className="text-2xl font-bold text-yellow-900">{currentData.customerSatisfaction}/5</p>
            </div>
            <Award className="h-8 w-8 text-yellow-600" />
          </div>
          <TrendIndicator value={performanceData.trends.satisfactionTrend} />
        </div>
      </div>

      {/* التقدم نحو الأهداف */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">التقدم نحو الأهداف</h4>
          
          <ProgressBar 
            value={currentData.ordersCompleted}
            max={selectedPeriod === 'today' ? performanceData.goals.dailyOrdersTarget :
                 selectedPeriod === 'thisWeek' ? performanceData.goals.weeklyOrdersTarget :
                 performanceData.goals.monthlyOrdersTarget}
            color="bg-blue-600"
            label={`هدف ${selectedPeriod === 'today' ? 'اليوم' : 
                           selectedPeriod === 'thisWeek' ? 'الأسبوع' : 'الشهر'}`}
          />

          <ProgressBar 
            value={successRate}
            max={performanceData.goals.targetSuccessRate}
            color="bg-green-600"
            label="هدف معدل النجاح"
          />

          <ProgressBar 
            value={currentData.customerSatisfaction * 20} // تحويل من 5 إلى 100
            max={performanceData.goals.targetSatisfaction * 20}
            color="bg-yellow-600"
            label="هدف رضا العملاء"
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">تفاصيل إضافية</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">الطلبيات المخصصة</span>
              <span className="font-medium">{currentData.ordersAssigned}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">إجمالي المكالمات</span>
              <span className="font-medium">{currentData.callsMade}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">المكالمات الناجحة</span>
              <span className="font-medium">{currentData.successfulCalls}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">معدل الإكمال</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* رسالة تحفيزية */}
      <div className={`rounded-lg p-4 ${
        goalProgress >= 100 ? 'bg-green-50 border border-green-200' :
        goalProgress >= 75 ? 'bg-blue-50 border border-blue-200' :
        goalProgress >= 50 ? 'bg-yellow-50 border border-yellow-200' :
        'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center space-x-3 space-x-reverse">
          <Award className={`h-5 w-5 ${
            goalProgress >= 100 ? 'text-green-600' :
            goalProgress >= 75 ? 'text-blue-600' :
            goalProgress >= 50 ? 'text-yellow-600' :
            'text-red-600'
          }`} />
          <div>
            <p className={`font-medium ${
              goalProgress >= 100 ? 'text-green-900' :
              goalProgress >= 75 ? 'text-blue-900' :
              goalProgress >= 50 ? 'text-yellow-900' :
              'text-red-900'
            }`}>
              {goalProgress >= 100 ? '🎉 ممتاز! لقد حققت هدفك!' :
               goalProgress >= 75 ? '👏 أداء رائع! أنت قريب من الهدف' :
               goalProgress >= 50 ? '💪 استمر! أنت في منتصف الطريق' :
               '🚀 ابدأ بقوة! لديك الكثير لتحققه'}
            </p>
            <p className={`text-sm ${
              goalProgress >= 100 ? 'text-green-700' :
              goalProgress >= 75 ? 'text-blue-700' :
              goalProgress >= 50 ? 'text-yellow-700' :
              'text-red-700'
            }`}>
              تقدمك: {goalProgress.toFixed(1)}% من الهدف
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentPerformanceWidget;
