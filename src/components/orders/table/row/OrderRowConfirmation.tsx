import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { ConfirmationAgent, ConfirmationOrderAssignment } from "@/types/confirmation";

interface OrderRowConfirmationProps {
  assignment?: ConfirmationOrderAssignment | null;
  agent?: ConfirmationAgent | null;
}

const statusLabels: Record<string, string> = {
  assigned: "بانتظار",
  in_progress: "جار المتابعة",
  confirmed: "تم التأكيد",
  cancelled: "ملغاة",
  reassigned: "أعيد التوزيع",
  skipped: "تم التخطي",
};

const strategyLabels: Record<string, string> = {
  manual: "يدوي",
  product_match: "تخصص منتج",
  fair_rotation: "طابور عادل",
  priority: "أولوية",
  auto: "تلقائي",
  region: "منطقة",
  availability: "الجاهزية",
};

const OrderRowConfirmation = memo(({ assignment, agent }: OrderRowConfirmationProps) => {
  const statusLabel = assignment ? statusLabels[assignment.status] || assignment.status : null;
  const strategyLabel = assignment ? strategyLabels[assignment.assignment_strategy] || assignment.assignment_strategy : null;
  const queueDetails = useMemo(() => {
    if (!assignment?.queue_snapshot || typeof assignment.queue_snapshot !== 'object') return null;
    const queue = assignment.queue_snapshot as Record<string, any>;
    if (Array.isArray(queue?.sequence) && queue.sequence.length > 0) {
      return `طابور: ${queue.sequence.length} طلب`;
    }
    if (queue?.priority_level) {
      return `أولوية ${queue.priority_level}`;
    }
    return null;
  }, [assignment]);

  return (
    <div className="py-4 px-4" style={{ contain: 'layout' }}>
      {agent ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary text-xs px-2 py-0.5">
              {agent.full_name}
            </Badge>
            {statusLabel && (
              <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
                {statusLabel}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
            {strategyLabel && <span>التوزيع: {strategyLabel}</span>}
            {assignment?.assignment_reason && <span>سبب: {assignment.assignment_reason}</span>}
            {queueDetails && <span>{queueDetails}</span>}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          {assignment?.agent_id ? `مخصص للوكيل ${assignment.agent_id.slice(0, 6)}...` : 'لم يتم تخصيص الطلب بعد'}
        </div>
      )}
    </div>
  );
});

OrderRowConfirmation.displayName = 'OrderRowConfirmation';

export default OrderRowConfirmation;
