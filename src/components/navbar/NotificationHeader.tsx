import React from 'react';
import { Bell, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
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
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          {stats.unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
              {stats.unread > 9 ? '9+' : stats.unread}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold">الإشعارات</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {stats.unread > 0 ? (
              <span>{stats.unread} جديد</span>
            ) : (
              <span>لا جديد</span>
            )}
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1">
              {isRealtimeConnected ? (
                <Wifi className="w-3 h-3 text-emerald-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg"
        onClick={onToggleSound}
      >
        {settings.soundEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
