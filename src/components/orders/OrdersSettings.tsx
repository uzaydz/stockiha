import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Loader2, PackageX } from "lucide-react";

interface OrdersSettingsProps {
  autoDeductInventory: boolean;
  loadingSettings: boolean;
  updatingSettings: boolean;
  onToggleAutoDeductInventory: (enabled: boolean) => void;
}

const OrdersSettings = memo(({
  autoDeductInventory,
  loadingSettings,
  updatingSettings,
  onToggleAutoDeductInventory
}: OrdersSettingsProps) => {
  if (loadingSettings) {
    return (
      <Card className="border-border/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>جاري تحميل الإعدادات...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/20 hover:border-border/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <PackageX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">خصم المخزون التلقائي</h3>
              <p className="text-xs text-muted-foreground">
                {autoDeductInventory ? 'مفعل - سيتم خصم المخزون تلقائياً' : 'معطل - خصم المخزون يدوي'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={autoDeductInventory}
              onCheckedChange={onToggleAutoDeductInventory}
              disabled={updatingSettings}
              className="data-[state=checked]:bg-orange-600"
            />
            {updatingSettings && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

OrdersSettings.displayName = "OrdersSettings";

export default OrdersSettings;
