import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Activity
} from 'lucide-react';

const DashboardPreview = memo(() => {
  const chartData = [45, 60, 35, 70, 55, 80, 65, 90, 75, 85];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="relative max-w-5xl mx-auto"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-500/10 to-cyan-500/20 blur-3xl" />
      
      {/* Dashboard Container */}
      <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        
        {/* Browser Header */}
        <div className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-xl px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500" />
              </div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                لوحة التحكم - Stockiha
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
              <span className="w-2 h-2 bg-green-500 rounded-full ml-1.5 animate-pulse" />
              متصل
            </Badge>
          </div>
        </div>
        
        {/* Dashboard Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: DollarSign,
                label: "إجمالي المبيعات",
                value: "542,380",
                suffix: "دج",
                trend: "+23%",
                color: "text-green-600 dark:text-green-400",
                bgColor: "bg-green-50 dark:bg-green-950/50"
              },
              {
                icon: ShoppingCart,
                label: "طلبات اليوم",
                value: "127",
                trend: "+15",
                color: "text-blue-600 dark:text-blue-400",
                bgColor: "bg-blue-50 dark:bg-blue-950/50"
              },
              {
                icon: Package,
                label: "المنتجات",
                value: "468",
                trend: "+12",
                color: "text-purple-600 dark:text-purple-400",
                bgColor: "bg-purple-50 dark:bg-purple-950/50"
              },
              {
                icon: Users,
                label: "العملاء",
                value: "1,294",
                trend: "+89",
                color: "text-orange-600 dark:text-orange-400",
                bgColor: "bg-orange-50 dark:bg-orange-950/50"
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                className={`${stat.bgColor} rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className={`text-xs font-semibold ${stat.color}`}>
                    {stat.trend}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                  {stat.suffix && <span className="text-sm font-normal mr-1">{stat.suffix}</span>}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Chart Section */}
          <div className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  تحليل المبيعات
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  أداء المبيعات خلال آخر 10 أيام
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  نمو مستمر
                </span>
              </div>
            </div>
            
            {/* Animated Chart Bars */}
            <div className="flex items-end gap-2 h-40">
              {chartData.map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ 
                    duration: 0.5, 
                    delay: 1.2 + index * 0.05,
                    ease: "easeOut"
                  }}
                  className="flex-1 bg-gradient-to-t from-primary to-primary/60 rounded-t-lg hover:from-primary/90 hover:to-primary/50 transition-colors cursor-pointer relative group"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs px-2 py-1 rounded whitespace-nowrap"
                  >
                    {Math.floor(height * 50)} دج
                  </motion.div>
                </motion.div>
              ))}
            </div>
            
            {/* Chart Labels */}
            <div className="flex justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span>قبل 10 أيام</span>
              <span>اليوم</span>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="mt-6 flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-xl border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                آخر طلب: منذ 3 دقائق
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                معدل تحويل 18.5%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.5 }}
        className="absolute -top-4 -right-4 bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold"
      >
        تحديث مباشر
      </motion.div>
    </motion.div>
  );
});

DashboardPreview.displayName = 'DashboardPreview';

export default DashboardPreview;
