import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Copy } from "lucide-react";

interface ExpandedNotesProps {
  isEditing: boolean;
  notes?: string | null;
  draftNotes: string;
  onCopy: () => void;
  onChange: (value: string) => void;
}

const ExpandedNotes: React.FC<ExpandedNotesProps> = ({
  isEditing,
  notes,
  draftNotes,
  onCopy,
  onChange,
}) => {
  return (
    <div className="mt-6" style={{ contain: 'content' }}>
      {!isEditing && notes ? (
        <>
          <div className="flex items-center justify-between mb-2 px-1">
            <h4 className="text-sm font-medium text-muted-foreground">ملاحظات</h4>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                    onClick={onCopy}
                    aria-label="نسخ الملاحظات"
                    title="نسخ الملاحظات"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>نسخ الملاحظات</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="rounded-md border border-border/30 bg-background/60 p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words" title={notes || ''}>
              {notes}
            </p>
          </div>
        </>
      ) : null}

      {isEditing && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1">ملاحظات</h4>
          <Textarea value={draftNotes} onChange={(e)=>onChange(e.target.value)} placeholder="أضف ملاحظات..." rows={4} />
        </div>
      )}
    </div>
  );
};

export default memo(ExpandedNotes);


