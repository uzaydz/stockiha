import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FormField as IFormField } from '@/api/form-settings';
import { FieldTypeMenu } from './FieldTypeMenu';
import { FormFieldItem } from './FormFieldItem';

interface FormFieldsPanelProps {
  fields: IFormField[];
  onAddField: (type: IFormField['type']) => void;
  onAddPresetFields?: () => void;
  onUpdateField: (field: IFormField) => void;
  onMoveField: (fieldId: string, direction: 'up' | 'down') => void;
  onDeleteField: (fieldId: string) => void;
}

export function FormFieldsPanel({
  fields,
  onAddField,
  onAddPresetFields,
  onUpdateField,
  onMoveField,
  onDeleteField
}: FormFieldsPanelProps) {
  const [showFieldTypeMenu, setShowFieldTypeMenu] = useState(false);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">حقول النموذج</h2>
        <div className="relative">
          <Button onClick={() => setShowFieldTypeMenu(!showFieldTypeMenu)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            إضافة حقل
          </Button>
          {showFieldTypeMenu && (
            <FieldTypeMenu 
              onSelectFieldType={(type) => {
              onAddField(type);
              setShowFieldTypeMenu(false);
              }} 
              onAddPresetFields={() => {
                if (onAddPresetFields) {
                  onAddPresetFields();
                  setShowFieldTypeMenu(false);
                }
              }}
            />
          )}
        </div>
      </div>
      
      {fields.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">لا توجد حقول بعد</p>
          <Button onClick={() => setShowFieldTypeMenu(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            إضافة أول حقل
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <FormFieldItem
              key={field.id}
              field={field}
              index={index}
              totalFields={fields.length}
              onUpdateField={onUpdateField}
              onMoveField={onMoveField}
              onDeleteField={onDeleteField}
              allFields={fields}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
