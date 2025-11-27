import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Bell, Volume2, Zap, MessageSquare, Play } from 'lucide-react';

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
    { key: 'enabled' as const, label: 'تفعيل الإشعارات', icon: Bell },
    { key: 'realtimeEnabled' as const, label: 'الإشعارات الفورية', icon: Zap },
    { key: 'soundEnabled' as const, label: 'تفعيل الأصوات', icon: Volume2 },
    { key: 'toastEnabled' as const, label: 'الرسائل المنبثقة', icon: MessageSquare },
  ];

  return (
    <div className="border-b bg-background">
      <div className="p-4 space-y-3">
        {settingsConfig.map((setting) => {
          const Icon = setting.icon;
          return (
            <div key={setting.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm">{setting.label}</span>
              </div>
              <Switch
                checked={settings[setting.key]}
                onCheckedChange={(checked) => onUpdateSettings({ [setting.key]: checked })}
              />
            </div>
          );
        })}

        {/* تحكم مستوى الصوت */}
        {settings.soundEnabled && (
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">مستوى الصوت</span>
              <span className="text-xs text-muted-foreground">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[settings.soundVolume]}
              onValueChange={(value) => onUpdateSettings({ soundVolume: value[0] })}
              max={1}
              min={0}
              step={0.1}
            />
            {onPlayTestSound && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPlayTestSound}
                className="w-full h-8 text-xs"
              >
                <Play className="w-3 h-3 ml-1.5" />
                تجربة الصوت
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
