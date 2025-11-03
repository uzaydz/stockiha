import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ notes, onNotesChange }) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm">ملاحظات (اختياري)</Label>
      <Textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="أضف أي ملاحظات حول الطلب..."
        rows={2}
        className="text-sm resize-none"
      />
    </div>
  );
};
