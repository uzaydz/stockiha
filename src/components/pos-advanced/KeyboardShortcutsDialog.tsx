import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  disabled?: boolean;
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
}

const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
  shortcuts,
}) => {
  // تجميع الاختصارات حسب الفئة
  const categorizedShortcuts = React.useMemo(() => {
    const categories: Record<string, KeyboardShortcut[]> = {
      'التنقل والأساسيات': [],
      'إدارة السلة': [],
      'التبويبات': [],
      'الإجراءات السريعة': [],
    };

    shortcuts.filter(s => !s.disabled).forEach((shortcut) => {
      if (shortcut.key.startsWith('F')) {
        categories['الإجراءات السريعة'].push(shortcut);
      } else if (shortcut.ctrl && ['n', 'w', 'Tab'].includes(shortcut.key)) {
        categories['التبويبات'].push(shortcut);
      } else if (shortcut.ctrl && ['s', 'p'].includes(shortcut.key)) {
        categories['إدارة السلة'].push(shortcut);
      } else {
        categories['التنقل والأساسيات'].push(shortcut);
      }
    });

    return categories;
  }, [shortcuts]);

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    let combo = '';
    if (shortcut.ctrl) combo += 'Ctrl + ';
    if (shortcut.shift) combo += 'Shift + ';
    if (shortcut.alt) combo += 'Alt + ';
    combo += shortcut.key;
    return combo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Keyboard className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">اختصارات لوحة المفاتيح</DialogTitle>
                <DialogDescription className="mt-1">
                  استخدم هذه الاختصارات لتسريع عملك في نظام POS
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {Object.entries(categorizedShortcuts).map(([category, categoryShortcuts]) => {
              if (categoryShortcuts.length === 0) return null;
              
              return (
                <div key={category}>
                  <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm text-muted-foreground flex-1">
                          {shortcut.description}
                        </span>
                        <div className="flex gap-1">
                          {shortcut.ctrl && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              Ctrl
                            </Badge>
                          )}
                          {shortcut.shift && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              Shift
                            </Badge>
                          )}
                          {shortcut.alt && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              Alt
                            </Badge>
                          )}
                          {(shortcut.ctrl || shortcut.shift || shortcut.alt) && (
                            <span className="text-muted-foreground mx-1">+</span>
                          )}
                          <Badge
                            variant="outline"
                            className="font-mono text-xs bg-primary/5 border-primary/20 text-primary"
                          >
                            {shortcut.key}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Keyboard className="h-3 w-3" />
            <span>اضغط F1 في أي وقت لعرض هذه النافذة</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;

