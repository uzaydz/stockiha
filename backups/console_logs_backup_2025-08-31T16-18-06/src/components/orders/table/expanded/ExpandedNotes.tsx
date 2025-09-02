import React, { memo } from "react";
import { Textarea } from "@/components/ui/textarea";

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
