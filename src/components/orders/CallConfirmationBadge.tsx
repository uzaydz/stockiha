import { Check, CheckCircle2, Clock, Phone, PhoneMissed } from "lucide-react";
import { CallConfirmationStatus } from "./CallConfirmationDropdown";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CallConfirmationBadgeProps {
  status: CallConfirmationStatus | null;
  showTooltip?: boolean;
  className?: string;
}

const CallConfirmationBadge = ({
  status,
  showTooltip = true,
  className = "",
}: CallConfirmationBadgeProps) => {
  if (!status) return null;

  // تحديد الأيقونة المناسبة
  const getIconForStatus = (iconName: string | null) => {
    switch (iconName) {
      case "check-circle":
        return CheckCircle2;
      case "phone":
        return Phone;
      case "phone-missed":
        return PhoneMissed;
      case "clock":
        return Clock;
      default:
        return Check;
    }
  };

  const StatusIcon = getIconForStatus(status.icon);

  const badge = (
    <Badge
      variant="outline"
      className={`px-2 py-0.5 h-6 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${status.color}20`,
        borderColor: status.color,
        color: status.color,
      }}
    >
      <StatusIcon className="h-3 w-3 mr-1" />
      <span>{status.name}</span>
    </Badge>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">حالة تأكيد الإتصال</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

export default CallConfirmationBadge; 