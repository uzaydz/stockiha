import React from 'react';
import { DistributionPlan, DistributionSettings } from '@/types/orderDistribution';
import { Settings, Users, Clock, MapPin, Zap, Calendar, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlanSettingsProps {
  plan: DistributionPlan;
  settings: DistributionSettings;
  onUpdateSettings: (settings: DistributionSettings) => void;
}

export const PlanSettings: React.FC<PlanSettingsProps> = ({ plan, settings, onUpdateSettings }) => {
  const renderSettings = () => {
    switch (plan.type) {
      case 'round_robin':
      case 'smart':
      case 'availability':
      case 'priority':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxOpenOrders" className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-primary" />
                الحد الأقصى لعدد الطلبات المفتوحة لكل موظف
              </Label>
              <Input
                id="maxOpenOrders"
                type="number"
                min="1"
                max="100"
                value={settings.maxOpenOrders || 10}
                onChange={(e) => onUpdateSettings({ ...settings, maxOpenOrders: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseTime" className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-primary" />
                مدة الرد قبل إعادة التوزيع (بالدقائق)
              </Label>
              <Input
                id="responseTime"
                type="number"
                min="5"
                max="120"
                value={settings.responseTimeMinutes || 30}
                onChange={(e) => onUpdateSettings({ ...settings, responseTimeMinutes: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="peakTimeOverride"
                checked={settings.enablePeakTimeOverride || false}
                onCheckedChange={(checked) => onUpdateSettings({ ...settings, enablePeakTimeOverride: checked })}
              />
              <Label htmlFor="peakTimeOverride" className="flex items-center gap-2 mr-2 text-sm font-medium cursor-pointer">
                <Zap className="w-4 h-4 text-primary" />
                تمكين التجاوز في أوقات الذروة
              </Label>
            </div>
          </div>
        );

      case 'expert':
        return (
          <div className="space-y-6">
            <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                يتم تعيين الخبراء لكل منتج من صفحة إدارة المنتجات
              </AlertDescription>
            </Alert>
            {renderBasicSettings()}
          </div>
        );

      default:
        return null;
    }
  };

  const renderBasicSettings = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="maxOpenOrdersBasic" className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4 text-primary" />
          الحد الأقصى لعدد الطلبات المفتوحة لكل موظف
        </Label>
        <Input
          id="maxOpenOrdersBasic"
          type="number"
          min="1"
          max="100"
          value={settings.maxOpenOrders || 10}
          onChange={(e) => onUpdateSettings({ ...settings, maxOpenOrders: parseInt(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="responseTimeBasic" className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 text-primary" />
          مدة الرد قبل إعادة التوزيع (بالدقائق)
        </Label>
        <Input
          id="responseTimeBasic"
          type="number"
          min="5"
          max="120"
          value={settings.responseTimeMinutes || 30}
          onChange={(e) => onUpdateSettings({ ...settings, responseTimeMinutes: parseInt(e.target.value) })}
        />
      </div>
    </>
  );

  return (
    <Card className="bg-gradient-to-br from-background to-muted/30 border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          إعدادات خطة {plan.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderSettings()}
      </CardContent>
    </Card>
  );
};
