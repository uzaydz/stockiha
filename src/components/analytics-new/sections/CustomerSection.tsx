/**
 * ============================================
 * STOCKIHA ANALYTICS - CUSTOMER SECTION
 * Enhanced Version with Interactive Features
 * ============================================
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Target,
  Crown,
  Search,
  ArrowUpRight,
  MoreHorizontal,
  Filter,
  Download,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import type { FilterState, CustomerData, DebtData } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';

// ==================== Types ====================

interface CustomerSectionProps {
  filters: FilterState;
  customerData: CustomerData | null;
  debtData: DebtData | null;
  isLoading?: boolean;
}

// Extended types for internal use
interface EnhancedCustomerData extends CustomerData {
  customerAcquisition?: { date: string; new: number; returning: number }[];
  demographics?: { name: string; value: number }[];
  satisfaction?: number;
}

// ==================== Helper Components ====================

const KPICard: React.FC<{
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  subValue?: string;
  color?: 'orange' | 'blue' | 'purple' | 'emerald';
  isLoading?: boolean;
}> = ({ title, value, trend, icon, subValue, color = 'orange', isLoading }) => {
  const colorStyles = {
    orange: 'bg-orange-500/10 text-orange-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse">
        <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl transition-colors", colorStyles[color])}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
            trend >= 0
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10"
              : "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10"
          )}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</h3>
        {subValue && (
          <p className="text-xs text-zinc-400 mt-1">{subValue}</p>
        )}
      </div>

      {/* Background decoration */}
      <div className={cn(
        "absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity blur-2xl",
        color === 'orange' ? 'bg-orange-500' :
          color === 'blue' ? 'bg-blue-500' :
            color === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'
      )} />
    </motion.div>
  );
};

// ==================== Customer Growth Chart ====================

const CustomerGrowthChart: React.FC<{
  data: any[];
  isLoading?: boolean;
}> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 h-[400px] animate-pulse">
        <div className="h-full bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 h-[400px] flex flex-col"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">نمو قاعدة العملاء</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">تحليل العملاء الجدد مقابل العائدين</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs text-indigo-700 dark:text-indigo-300">عملاء جدد</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-700 dark:text-emerald-300">عملاء عائدون</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full text-xs" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReturning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161, 161, 170, 0.1)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a' }}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                borderColor: '#27272a',
                borderRadius: '12px',
                color: '#fff'
              }}
              itemStyle={{ color: '#fff' }}
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="new"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorNew)"
            />
            <Area
              type="monotone"
              dataKey="returning"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorReturning)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

// ==================== Customer Segments Chart ====================

const CustomerSegmentsChart: React.FC<{
  data: any[];
  isLoading?: boolean;
}> = ({ data, isLoading }) => {
  if (isLoading) return null;

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 h-[400px]"
    >
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">توزيع شرائح العملاء</h3>
      <div className="h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={80}
              outerRadius={110}
              paddingAngle={5}
              dataKey="value"
              cornerRadius={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                borderColor: '#27272a',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-zinc-900 dark:text-white">
            {formatNumber(data.reduce((a, b) => a + b.value, 0))}
          </span>
          <span className="text-sm text-zinc-500">مجموع العملاء</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-[-20px]">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{entry.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ==================== Top Customers Table ====================

const TopCustomersTable: React.FC<{
  customers: any[];
  isLoading?: boolean;
}> = ({ customers, isLoading }) => {
  if (isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
    >
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            أفضل العملاء (VIP)
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">العملاء الأكثر شراءً وإيراداً</p>
        </div>
        <button className="text-sm text-orange-500 hover:text-orange-600 font-medium">عرض الكل</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-4 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">العميل</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">عدد الطلبات</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">إجمالي المشتريات</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">آخر زيارة</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {customers.map((customer, i) => (
              <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-500/10 dark:to-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
                      {customer.customerName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">{customer.customerName}</div>
                      <div className="text-xs text-zinc-500">{customer.phone || 'بدون رقم'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                  {customer.ordersCount} طلب
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">
                    {formatCurrency(customer.totalPurchases)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                  {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('ar-DZ') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium",
                    i < 3
                      ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  )}>
                    {i < 3 ? 'متميز جداً' : 'نشط'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ==================== Debts Overview Card ====================

const DebtsOverview: React.FC<{
  data: DebtData;
  isLoading?: boolean;
}> = ({ data, isLoading }) => {
  if (isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6 opacity-90">
          <CreditCard className="w-5 h-5" />
          <h3 className="font-semibold text-lg">تحليل الديون والتحصيل</h3>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-rose-100 text-sm mb-1">إجمالي الديون المعلقة</p>
            <p className="text-3xl font-bold">{formatCurrency(data.remainingDebt ?? data.totalDebt ?? data.totalReceivables ?? 0)}</p>
          </div>
          <div>
            <p className="text-rose-100 text-sm mb-1">نسبة التحصيل</p>
            <p className="text-3xl font-bold">{data.collectionRate ?? 0}%</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-rose-100">المسدد هذا الشهر</span>
            <span className="font-bold">{formatCurrency(data.paidDebt ?? 0)}</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-white h-full rounded-full"
              style={{ width: `${data.collectionRate ?? 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-rose-200 mt-1">
            <span>ديون معدومة: {formatCurrency(data.overdueDebt ?? data.overdueReceivables ?? 0)}</span>
            <span>عدد المدينين: {data.receivablesCount ?? 12}</span>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute right-[-20%] top-[-20%] w-[60%] h-[140%] bg-white/5 rounded-full blur-3xl" />
      <div className="absolute left-[-10%] bottom-[-20%] w-[40%] h-[80%] bg-black/10 rounded-full blur-2xl" />
    </motion.div>
  );
};


// ==================== Main Component ====================

const CustomerSection: React.FC<CustomerSectionProps> = ({
  filters,
  customerData,
  debtData,
  isLoading = false,
}) => {
  // Mock Growth Data (To be replaced with real data logic)
  const growthData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      new: Math.floor(Math.random() * 20) + 5,
      returning: Math.floor(Math.random() * 50) + 20,
    }));
  }, []);

  // Mock Demographics (To be replaced)
  const segmentsData = useMemo(() => [
    { name: 'عملاء VIP', value: 15 },
    { name: 'عملاء دائمون', value: 45 },
    { name: 'عملاء جدد', value: 25 },
    { name: 'منقطعون', value: 10 },
    { name: 'غير نشطين', value: 5 },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="إجمالي العملاء"
          value={formatNumber(customerData?.totalCustomers || 0)}
          trend={12.5}
          icon={<Users className="w-6 h-6" />}
          subValue="قاعدة العملاء المسجلة"
          color="blue"
          isLoading={isLoading}
        />
        <KPICard
          title="العملاء النشطون"
          value={formatNumber(customerData?.activeCustomers || 0)}
          trend={5.2}
          icon={<UserCheck className="w-6 h-6" />}
          subValue="نشاط في آخر 30 يوم"
          color="emerald"
          isLoading={isLoading}
        />
        <KPICard
          title="متوسط قيمة العميل"
          value={formatCurrency(customerData?.averageCustomerValue || 0)}
          trend={-2.1}
          icon={<Target className="w-6 h-6" />}
          subValue="متوسط الإنفاق لكل عميل"
          color="purple"
          isLoading={isLoading}
        />
        <KPICard
          title="معدل الاحتفاظ"
          value={`${customerData?.retentionRate || 0}%`}
          trend={3.4}
          icon={<Crown className="w-6 h-6" />}
          subValue="نسبة العملاء العائدين"
          color="orange"
          isLoading={isLoading}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CustomerGrowthChart data={growthData} isLoading={isLoading} />
        </div>
        <div className="space-y-6">
          <DebtsOverview data={debtData || {} as DebtData} isLoading={isLoading} />
          <CustomerSegmentsChart data={segmentsData} isLoading={isLoading} />
        </div>
      </div>

      {/* Detailed Tables Row */}
      <div className="grid grid-cols-1 gap-6">
        <TopCustomersTable
          customers={customerData?.topCustomers || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default memo(CustomerSection);
