import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Bell, BellDot, AlertTriangle, Package, Archive } from 'lucide-react';

interface NotificationFiltersProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    all: number;
    unread: number;
    urgent: number;
    orders: number;
    stock: number;
  };
}

export function NotificationFilters({ activeTab, onTabChange, counts }: NotificationFiltersProps) {
  const filterTabs = [
    {
      value: 'all',
      label: 'الكل',
      icon: Bell,
      count: counts.all,
      gradient: 'from-slate-500 to-slate-600',
      activeGradient: 'from-blue-500 to-indigo-600'
    },
    {
      value: 'unread',
      label: 'جديد',
      icon: BellDot,
      count: counts.unread,
      gradient: 'from-blue-500 to-blue-600',
      activeGradient: 'from-blue-500 to-purple-600'
    },
    {
      value: 'urgent',
      label: 'عاجل',
      icon: AlertTriangle,
      count: counts.urgent,
      gradient: 'from-red-500 to-red-600',
      activeGradient: 'from-red-500 to-pink-600'
    },
    {
      value: 'orders',
      label: 'طلبات',
      icon: Package,
      count: counts.orders,
      gradient: 'from-emerald-500 to-emerald-600',
      activeGradient: 'from-emerald-500 to-green-600'
    },
    {
      value: 'stock',
      label: 'مخزون',
      icon: Archive,
      count: counts.stock,
      gradient: 'from-amber-500 to-amber-600',
      activeGradient: 'from-amber-500 to-orange-600'
    }
  ];

  return (
    <div className="px-4 pt-3 pb-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid grid-cols-5 w-full bg-slate-100/60 dark:bg-slate-800/60 rounded-xl p-1 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            {filterTabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              
              return (
                <motion.div
                  key={tab.value}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="relative"
                >
                  <TabsTrigger
                    value={tab.value}
                    className={`
                      relative w-full px-2 py-2 text-xs font-semibold rounded-lg transition-all duration-300
                      data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700
                      data-[state=active]:shadow-md data-[state=active]:shadow-slate-200/50 dark:data-[state=active]:shadow-slate-900/30
                      hover:bg-white/70 dark:hover:bg-slate-700/70
                      group
                      ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`
                          p-1 rounded-md transition-all duration-300
                          ${isActive 
                            ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-md` 
                            : `bg-gradient-to-r ${tab.gradient} text-white opacity-60 group-hover:opacity-80`
                          }
                        `}
                      >
                        <Icon className="h-3 w-3" />
                      </motion.div>
                      
                      <div className="flex items-center gap-1">
                        <span className="leading-none text-[10px]">{tab.label}</span>
                        {tab.count > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <Badge
                              className={`
                                h-3.5 min-w-3.5 px-1 text-[9px] font-bold leading-none
                                ${isActive 
                                  ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-sm` 
                                  : 'bg-slate-500 text-white'
                                }
                                ${tab.count > 99 ? 'px-1' : ''}
                              `}
                            >
                              {tab.count > 99 ? '99+' : tab.count}
                            </Badge>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {/* مؤشر النشاط */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-200/50 dark:border-blue-800/30"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    
                    {/* تأثير النقاط للإشعارات العاجلة */}
                    {tab.value === 'urgent' && tab.count > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"
                      />
                    )}
                  </TabsTrigger>
                </motion.div>
              );
            })}
          </TabsList>
        </Tabs>
      </motion.div>
    </div>
  );
} 