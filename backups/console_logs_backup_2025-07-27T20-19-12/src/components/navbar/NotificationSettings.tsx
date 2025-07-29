import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';
import { Bell, BellRing, Volume2, AlertTriangle, MessageSquare, Zap, Play } from 'lucide-react';

interface NotificationSettingsData {
  enabled: boolean;
  realtimeEnabled: boolean;
  newOrderSound: boolean;
  lowStockSound: boolean;
  toastEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
}

interface NotificationSettingsProps {
  settings: NotificationSettingsData;
  onUpdateSettings: (settings: Partial<NotificationSettingsData>) => void;
  onPlayTestSound?: () => void;
}

export function NotificationSettings({ settings, onUpdateSettings, onPlayTestSound }: NotificationSettingsProps) {
  const settingsConfig = [
    {
      key: 'enabled' as const,
      label: 'تفعيل الإشعارات',
      icon: Bell,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      key: 'realtimeEnabled' as const,
      label: 'الإشعارات الفورية',
      icon: Zap,
      color: 'from-purple-500 to-pink-600'
    },
    {
      key: 'soundEnabled' as const,
      label: 'تفعيل الأصوات',
      icon: Volume2,
      color: 'from-green-500 to-emerald-600'
    },
    {
      key: 'newOrderSound' as const,
      label: 'أصوات الطلبات',
      icon: BellRing,
      color: 'from-emerald-500 to-green-600',
      disabled: !settings.soundEnabled
    },
    {
      key: 'lowStockSound' as const,
      label: 'أصوات المخزون',
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-600',
      disabled: !settings.soundEnabled
    },
    {
      key: 'toastEnabled' as const,
      label: 'الرسائل المنبثقة',
      icon: MessageSquare,
      color: 'from-rose-500 to-red-600'
    }
  ];

  const handleVolumeChange = (value: number[]) => {
    onUpdateSettings({ soundVolume: value[0] });
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden border-b border-slate-200/50 dark:border-slate-700/50"
    >
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="space-y-3">
          {settingsConfig.map((setting, index) => {
            const Icon = setting.icon;
            const isEnabled = settings[setting.key];
            const isDisabled = setting.disabled || false;
            
            return (
              <motion.div
                key={setting.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${isEnabled && !isDisabled
                      ? `bg-gradient-to-r ${setting.color} text-white shadow-sm` 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    }
                    ${isDisabled ? 'opacity-50' : ''}
                  `}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  
                  <span className={`text-sm font-medium ${
                    isDisabled 
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {setting.label}
                  </span>
                </div>
                
                <Switch
                  checked={isEnabled}
                  disabled={isDisabled}
                  onCheckedChange={(checked) => onUpdateSettings({ [setting.key]: checked })}
                  className="scale-75"
                />
              </motion.div>
            );
          })}
        </div>
        
        {/* تحكم مستوى الصوت */}
        {settings.soundEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Volume2 className="h-3.5 w-3.5" />
                مستوى الصوت
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            
            <div className="space-y-2">
              <Slider
                value={[settings.soundVolume]}
                onValueChange={handleVolumeChange}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
              
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPlayTestSound}
                  className="h-7 px-3 text-xs border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Play className="h-3 w-3 mr-1.5" />
                  تجربة
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
} 