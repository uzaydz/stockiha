import React, { memo } from "react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="flex items-start justify-between gap-4" style={{ contain: 'content' }}>
      <h3 id={headingId} className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary"></span>
        <span className="truncate">تفاصيل الطلب <span dir="ltr">{readableOrderNumber}</span></span>
      </h3>
      <div className="flex items-center gap-2">
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
