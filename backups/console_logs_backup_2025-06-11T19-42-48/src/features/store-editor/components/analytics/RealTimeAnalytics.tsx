import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Eye, 
  ShoppingCart, 
  DollarSign,
  MousePointer,
  Clock,
  Smartphone,
  Globe,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface RealTimeAnalyticsProps {
  pageId?: string
  className?: string
}

// Mock data for demonstration
const generateMockData = () => ({
  visitors: Math.floor(Math.random() * 50) + 100,
  pageViews: Math.floor(Math.random() * 100) + 200,
  conversionRate: (Math.random() * 5 + 2).toFixed(2),
  avgSessionDuration: Math.floor(Math.random() * 180) + 120,
  bounceRate: (Math.random() * 30 + 20).toFixed(1),
  cartAbandonment: (Math.random() * 40 + 30).toFixed(1),
})

const trafficSources = [
  { name: 'بحث Google', value: 35, color: '#4285F4' },
  { name: 'مباشر', value: 25, color: '#34A853' },
  { name: 'وسائل التواصل', value: 20, color: '#EA4335' },
  { name: 'إحالات', value: 15, color: '#FBBC04' },
  { name: 'أخرى', value: 5, color: '#9CA3AF' },
]

const performanceMetrics = [
  { name: 'سرعة التحميل', value: 92, status: 'good', icon: Zap },
  { name: 'تجربة المستخدم', value: 88, status: 'good', icon: Users },
  { name: 'SEO', value: 76, status: 'warning', icon: Globe },
  { name: 'الأمان', value: 95, status: 'good', icon: CheckCircle2 },
]

export const RealTimeAnalytics: React.FC<RealTimeAnalyticsProps> = ({ pageId, className }) => {
  const [data, setData] = useState(generateMockData())
  const [liveVisitors, setLiveVisitors] = useState(12)
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateMockData())
      setLiveVisitors(prev => Math.max(0, prev + Math.floor(Math.random() * 5) - 2))
      
      // Update time series data
      setTimeSeriesData(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          visitors: Math.floor(Math.random() * 20) + 10,
          conversions: Math.floor(Math.random() * 5) + 1,
        }].slice(-10) // Keep last 10 data points
        return newData
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return CheckCircle2
      case 'warning': return AlertCircle
      case 'error': return XCircle
      default: return Activity
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Live Visitors Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">الزوار المباشرون</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping" />
                <div className="relative w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <span className="text-sm text-gray-500">مباشر</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <motion.div
                key={liveVisitors}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-bold"
              >
                {liveVisitors}
              </motion.div>
              <p className="text-sm text-gray-500 mt-1">زائر نشط الآن</p>
            </div>
            <ResponsiveContainer width={100} height={50}>
              <LineChart data={timeSeriesData}>
                <Line 
                  type="monotone" 
                  dataKey="visitors" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Eye, label: 'مشاهدات الصفحة', value: data.pageViews, trend: '+12%', color: 'blue' },
          { icon: ShoppingCart, label: 'معدل التحويل', value: `${data.conversionRate}%`, trend: '+5%', color: 'green' },
          { icon: Clock, label: 'متوسط الجلسة', value: `${Math.floor(data.avgSessionDuration / 60)}:${(data.avgSessionDuration % 60).toString().padStart(2, '0')}`, trend: '+8%', color: 'purple' },
          { icon: MousePointer, label: 'معدل الارتداد', value: `${data.bounceRate}%`, trend: '-3%', color: 'orange' },
        ].map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 bg-${metric.color}-100 dark:bg-${metric.color}-950/20 rounded-lg`}>
                      <Icon className={`h-4 w-4 text-${metric.color}-600`} />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {metric.trend}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{metric.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Traffic Sources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">مصادر الزيارات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trafficSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="text-sm font-medium">{source.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={source.value} className="w-20 h-2" />
                  <span className="text-sm text-gray-500 w-10 text-right">{source.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">مؤشرات الأداء</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performanceMetrics.map((metric, index) => {
              const Icon = metric.icon
              const StatusIcon = getStatusIcon(metric.status)
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{metric.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={metric.value} 
                      className="w-20 h-2"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold w-10 text-right">{metric.value}%</span>
                      <StatusIcon className={cn('h-4 w-4', getStatusColor(metric.status))} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              عرض التقرير الكامل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">قمع التحويل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { stage: 'زيارة الصفحة', value: 100, color: 'bg-blue-500' },
              { stage: 'مشاهدة المنتج', value: 75, color: 'bg-indigo-500' },
              { stage: 'إضافة للسلة', value: 45, color: 'bg-purple-500' },
              { stage: 'بدء الدفع', value: 30, color: 'bg-pink-500' },
              { stage: 'إتمام الشراء', value: 20, color: 'bg-green-500' },
            ].map((stage, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{stage.stage}</span>
                  <span className="font-medium">{stage.value}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.value}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={cn('h-full rounded-full', stage.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}