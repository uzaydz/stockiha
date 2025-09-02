import React, { useState, useEffect } from 'react';
import { BarChart3, ShoppingCart, Package, Users, TrendingUp, CheckCircle, AlertCircle, Eye, Target } from 'lucide-react';

const DashboardPreview = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [animatedValues, setAnimatedValues] = useState({
    sales: 0,
    products: 0,
    customers: 0,
    orders: 0
  });

  // Animate values on mount
  useEffect(() => {
    const timer1 = setTimeout(() => setAnimatedValues(prev => ({ ...prev, sales: 12500 })), 300);
    const timer2 = setTimeout(() => setAnimatedValues(prev => ({ ...prev, products: 842 })), 600);
    const timer3 = setTimeout(() => setAnimatedValues(prev => ({ ...prev, customers: 2458 })), 900);
    const timer4 = setTimeout(() => setAnimatedValues(prev => ({ ...prev, orders: 187 })), 1200);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Dashboard tabs
  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: Eye },
    { id: 'sales', label: 'المبيعات', icon: ShoppingCart },
    { id: 'inventory', label: 'المخزون', icon: Package },
    { id: 'customers', label: 'العملاء', icon: Users }
  ];

  // Recent activity data
  const recentActivity = [
    { id: 1, action: 'طلب جديد #STK-2024', time: 'قبل 2 دقيقة', type: 'success' },
    { id: 2, action: 'تحديث المخزون', time: 'قبل 15 دقيقة', type: 'info' },
    { id: 3, action: 'عميل جديد مسجل', time: 'قبل 28 دقيقة', type: 'success' },
    { id: 4, action: 'مخزون منخفض', time: 'قبل 45 دقيقة', type: 'warning' }
  ];

  // Performance metrics
  const performanceMetrics = [
    { label: 'معدل التحويل', value: '3.2%', change: '+0.8%', icon: Target, color: 'text-emerald-500' },
    { label: 'متوسط الطلب', value: 'د.ج 2,450', change: '+12.5%', icon: ShoppingCart, color: 'text-blue-500' },
    { label: 'رضا العملاء', value: '4.8/5', change: '+0.2', icon: CheckCircle, color: 'text-amber-500' }
  ];

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden transform-gpu transition-all duration-300 hover:shadow-2xl">
      {/* Browser bar */}
      <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
          <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">لوحة تحكم سطوكيها</span>
        </div>
      </div>
      
      {/* Dashboard content */}
      <div className="p-4 sm:p-5">
        {/* Dashboard tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-700/30 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Metrics overview */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-3 border border-amber-200/30 dark:border-amber-700/30 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-600 dark:text-amber-400">إجمالي المبيعات</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg">د.ج {formatNumber(animatedValues.sales)}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-emerald-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12.5% هذا الشهر
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-3 border border-emerald-200/30 dark:border-emerald-700/30 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">المنتجات</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg">{formatNumber(animatedValues.products)}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-emerald-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8.3% هذا الشهر
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-200/30 dark:border-blue-700/30 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-600 dark:text-blue-400">العملاء</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg">{formatNumber(animatedValues.customers)}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-emerald-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              +15.2% هذا الشهر
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-lg p-3 border border-violet-200/30 dark:border-violet-700/30 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-violet-600 dark:text-violet-400">الطلبات الجديدة</div>
                <div className="font-bold text-gray-900 dark:text-white text-lg">{formatNumber(animatedValues.orders)}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-emerald-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5.7% هذا الشهر
            </div>
          </div>
        </div>
        
        {/* Performance metrics */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {performanceMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div 
                key={index}
                className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center border border-gray-200/30 dark:border-gray-600/30 transition-all duration-300 hover:shadow-sm"
              >
                <div className="flex flex-col items-center">
                  <Icon className={`w-4 h-4 ${metric.color} mb-1`} />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{metric.label}</div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{metric.value}</div>
                  <div className={`flex items-center text-xs ${metric.color}`}>
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    {metric.change}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Advanced visualization */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-800/50 rounded-lg p-4 mb-5 border border-gray-200/50 dark:border-gray-600/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>الأداء الأسبوعي</span>
            </h3>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
              +12.5%
            </span>
          </div>
          
          {/* Chart visualization */}
          <div className="relative h-32">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-px bg-gray-200 dark:bg-gray-600/50"></div>
              ))}
            </div>
            
            {/* Chart area */}
            <div className="absolute inset-0 pl-6 pr-2 pb-4 pt-2">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 w-6">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              
              {/* Chart content */}
              <div className="ml-6 h-full relative">
                {/* Data points and line */}
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Line chart */}
                  <polyline
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    points="0,80 15,65 30,70 45,50 60,45 75,35 90,25 100,20"
                  />
                  
                  {/* Gradient for line */}
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  
                  {/* Data points */}
                  {[0, 15, 30, 45, 60, 75, 90, 100].map((x, i) => (
                    <circle
                      key={i}
                      cx={x}
                      cy={[80, 65, 70, 50, 45, 35, 25, 20][i]}
                      r="2"
                      fill="#f59e0b"
                      className="animate-pulse"
                    />
                  ))}
                  
                  {/* Area fill */}
                  <polygon
                    fill="url(#areaGradient)"
                    opacity="0.2"
                    points="0,80 15,65 30,70 45,50 60,45 75,35 90,25 100,20 100,100 0,100"
                  />
                  
                  {/* Gradient for area */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent activity */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-1.5">
            <span>النشاط الأخير</span>
          </h3>
          <div className="space-y-2.5">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/20 rounded-lg transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                  item.type === 'success' ? 'bg-emerald-500' : 
                  item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-gray-900 dark:text-gray-200 truncate">{item.action}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.time}</div>
                </div>
                {item.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                ) : item.type === 'warning' ? (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;