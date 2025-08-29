import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Move, AlertCircle, CheckCircle, XCircle, ThumbsDown, ThumbsUp, Frown, Smile, Heart } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ImageUploader from '@/components/ui/ImageUploader';

// مكون ColorPicker محسن
const ColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-8 h-8 rounded-md border border-border shadow-sm"
        style={{ backgroundColor: value }}
      />
      <input 
        type="color" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-md border border-border cursor-pointer"
      />
      <input
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="#000000"
      />
    </div>
  );
};

// Available icons for problems and solutions
const availableProblemIcons = [
  { name: 'AlertCircle', icon: AlertCircle },
  { name: 'XCircle', icon: XCircle },
  { name: 'ThumbsDown', icon: ThumbsDown },
  { name: 'Frown', icon: Frown },
];

const availableSolutionIcons = [
  { name: 'CheckCircle', icon: CheckCircle },
  { name: 'ThumbsUp', icon: ThumbsUp },
  { name: 'Smile', icon: Smile },
  { name: 'Heart', icon: Heart },
];

// Reorder utility function
const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

interface ItemsManagerProps {
  settings: any;
  onSettingChange: (key: string, value: any) => void;
  onItemChange: (index: number, key: string, value: any) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

const ItemsManager: React.FC<ItemsManagerProps> = ({
  settings,
  onSettingChange,
  onItemChange,
  onAddItem,
  onRemoveItem
}) => {
  // Handle item drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    
    if (result.destination.index === result.source.index) {
      return;
    }
    
    const reorderedItems = reorder(
      settings.items,
      result.source.index,
      result.destination.index
    );
    
    onSettingChange('items', reorderedItems);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">المشاكل والحلول</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {settings.items?.length || 0} عنصر
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddItem}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة جديد
        </Button>
      </div>

      {/* Items List */}
      {settings.items && settings.items.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="problem-solution-items">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {settings.items.map((item: any, index: number) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="border border-border rounded-lg bg-card"
                      >
                        {/* Item Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                          <div className="flex items-center gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-move text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Move className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-foreground">
                                عنصر {index + 1}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {item.problemTitle || 'بدون عنوان'}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Item Content */}
                        <div className="p-4 space-y-6">
                          {/* Problem Section */}
                          <div className="space-y-4">
                            <h5 className="text-sm font-medium text-foreground border-b border-border pb-2">
                              المشكلة
                            </h5>
                            
                            {/* Problem Title */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">عنوان المشكلة</label>
                              <Input
                                value={item.problemTitle || ''}
                                onChange={(e) => onItemChange(index, 'problemTitle', e.target.value)}
                                placeholder="عنوان المشكلة..."
                                className="w-full"
                              />
                            </div>

                            {/* Problem Description */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">وصف المشكلة</label>
                              <Textarea
                                value={item.problemDescription || ''}
                                onChange={(e) => onItemChange(index, 'problemDescription', e.target.value)}
                                placeholder="وصف المشكلة..."
                                rows={2}
                                className="w-full resize-none"
                              />
                            </div>

                            {/* Problem Icon */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">أيقونة المشكلة</label>
                              <Select
                                value={item.problemIconName || 'AlertCircle'}
                                onValueChange={(value) => onItemChange(index, 'problemIconName', value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="اختر أيقونة" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableProblemIcons.map((iconOption) => (
                                    <SelectItem key={iconOption.name} value={iconOption.name}>
                                      <div className="flex items-center gap-2">
                                        <iconOption.icon className="h-4 w-4" />
                                        <span>{iconOption.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Problem Icon Color */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">لون أيقونة المشكلة</label>
                              <ColorPicker
                                value={item.problemIconColor || '#ef4444'}
                                onChange={(color) => onItemChange(index, 'problemIconColor', color)}
                              />
                            </div>

                            {/* Problem Image */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">صورة المشكلة</label>
                              <ImageUploader
                                imageUrl={item.problemImage || ''}
                                onImageUploaded={(url) => onItemChange(index, 'problemImage', url)}
                                folder="problem-solution/problems"
                                label="اختر صورة المشكلة..."
                                className="h-32"
                                compact={true}
                              />
                            </div>
                          </div>

                          {/* Solution Section */}
                          <div className="space-y-4">
                            <h5 className="text-sm font-medium text-foreground border-b border-border pb-2">
                              الحل
                            </h5>
                            
                            {/* Solution Title */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">عنوان الحل</label>
                              <Input
                                value={item.solutionTitle || ''}
                                onChange={(e) => onItemChange(index, 'solutionTitle', e.target.value)}
                                placeholder="عنوان الحل..."
                                className="w-full"
                              />
                            </div>

                            {/* Solution Description */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">وصف الحل</label>
                              <Textarea
                                value={item.solutionDescription || ''}
                                onChange={(e) => onItemChange(index, 'solutionDescription', e.target.value)}
                                placeholder="وصف الحل..."
                                rows={2}
                                className="w-full resize-none"
                              />
                            </div>

                            {/* Solution Icon */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">أيقونة الحل</label>
                              <Select
                                value={item.solutionIconName || 'CheckCircle'}
                                onValueChange={(value) => onItemChange(index, 'solutionIconName', value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="اختر أيقونة" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSolutionIcons.map((iconOption) => (
                                    <SelectItem key={iconOption.name} value={iconOption.name}>
                                      <div className="flex items-center gap-2">
                                        <iconOption.icon className="h-4 w-4" />
                                        <span>{iconOption.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Solution Icon Color */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">لون أيقونة الحل</label>
                              <ColorPicker
                                value={item.solutionIconColor || '#10b981'}
                                onChange={(color) => onItemChange(index, 'solutionIconColor', color)}
                              />
                            </div>

                            {/* Solution Image */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">صورة الحل</label>
                              <ImageUploader
                                imageUrl={item.solutionImage || ''}
                                onImageUploaded={(url) => onItemChange(index, 'solutionImage', url)}
                                folder="problem-solution/solutions"
                                label="اختر صورة الحل..."
                                className="h-32"
                                compact={true}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Empty State */}
      {(!settings.items || settings.items.length === 0) && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">
            لا توجد عناصر بعد
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={onAddItem}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة أول عنصر
          </Button>
        </div>
      )}
    </div>
  );
};

export default ItemsManager;
