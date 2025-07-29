import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Settings, Loader2 } from "lucide-react";

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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-background/80 border border-border/30 rounded-lg px-4 py-2">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">خصم المخزون التلقائي</span>
      </div>
      <Switch
        checked={autoDeductInventory}
        onCheckedChange={onToggleAutoDeductInventory}
        disabled={updatingSettings}
        className="data-[state=checked]:bg-green-600"
      />
      {updatingSettings && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
});

OrdersSettings.displayName = "OrdersSettings";

export default OrdersSettings; 