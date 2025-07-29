import React from 'react';
import { motion } from 'framer-motion';
import { BellRing, Settings, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
}

interface NotificationSettings {
  soundEnabled: boolean;
}

interface NotificationHeaderProps {
  stats: NotificationStats;
  isRealtimeConnected: boolean;
  settings: NotificationSettings;
  showSettings: boolean;
  onToggleSettings: () => void;
  onToggleSound: () => void;
}

export function NotificationHeader({
  stats,
  isRealtimeConnected,
  settings,
  showSettings,
  onToggleSettings,
  onToggleSound
}: NotificationHeaderProps) {
  return (
    <div className="relative p-4 bg-gradient-to-r from-slate-50/80 to-blue-50/80 dark:from-slate-900/80 dark:to-blue-950/80 border-b border-slate-200/60 dark:border-slate-700/60">
      {/* خلفية ناعمة */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-slate-800/20" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25">
              <BellRing className="h-4 w-4 text-white" />
            </div>
            {stats.urgent > 0 && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
          </motion.div>
          
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              الإشعارات
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>{stats.total} إجمالي</span>
              {stats.unread > 0 && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {stats.unread} جديد
                  </span>
                </>
              )}
              <span>•</span>
              <div className="flex items-center gap-1">
                {isRealtimeConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span className={isRealtimeConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {isRealtimeConnected ? 'متصل' : 'غير متصل'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSound}
            className={cn(
              "h-7 w-7 p-0 rounded-lg transition-all duration-300",
              settings.soundEnabled
                ? "bg-green-100 hover:bg-green-200 dark:bg-green-950/50 dark:hover:bg-green-950/70 text-green-700 dark:text-green-300"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            )}
          >
            {settings.soundEnabled ? (
              <Volume2 className="h-3 w-3" />
            ) : (
              <VolumeX className="h-3 w-3" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSettings}
            className={cn(
              "h-7 w-7 p-0 rounded-lg transition-all duration-300",
              showSettings
                ? "bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-950/70 text-blue-700 dark:text-blue-300"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            )}
          >
            <motion.div
              animate={{ rotate: showSettings ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Settings className="h-3 w-3" />
            </motion.div>
          </Button>
        </div>
      </div>
    </div>
  );
} 