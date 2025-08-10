import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface ExpandedHeaderProps {
  headingId: string;
  readableOrderNumber: string;
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const ExpandedHeader: React.FC<ExpandedHeaderProps> = ({
  headingId,
  readableOrderNumber,
  isEditing,
  saving,
  onEdit,
  onCancel,
  onSave,
}) => {
  const copy = useCallback(() => {
    navigator.clipboard
      .writeText(readableOrderNumber)
      .then(() => toast.success("تم نسخ رقم الطلب بنجاح"))
      .catch(() => toast.error("تعذر نسخ رقم الطلب"));
  }, [readableOrderNumber]);

  return (
    <div className="flex items-start justify-between gap-4" style={{ contain: 'content' }}>
      <h3 id={headingId} className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary"></span>
        <span className="truncate">تفاصيل الطلب <span dir="ltr">{readableOrderNumber}</span></span>
      </h3>
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                onClick={copy}
                aria-label="نسخ رقم الطلب"
                title="نسخ رقم الطلب"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>نسخ رقم الطلب</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={onEdit}>تحرير</Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onCancel}>إلغاء</Button>
            <Button size="sm" onClick={onSave} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default memo(ExpandedHeader);


