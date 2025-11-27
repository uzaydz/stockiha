import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard, X, Command, Option } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }
  }, []);

  // تجميع الاختصارات حسب الفئة
  const categorizedShortcuts = React.useMemo(() => {
    const categories: Record<string, KeyboardShortcut[]> = {
      'الإجراءات السريعة': [],
      'إدارة السلة': [],
      'التبويبات': [],
      'التنقل والأساسيات': [],
    };

    shortcuts.filter(s => !s.disabled).forEach((shortcut) => {
      if (shortcut.key.startsWith('F')) {
        categories['الإجراءات السريعة'].push(shortcut);
      } else if (shortcut.ctrl && ['n', 'w', 'Tab'].includes(shortcut.key)) {
        categories['التبويبات'].push(shortcut);
      } else if (shortcut.ctrl && ['s', 'p'].includes(shortcut.key)) {
        categories['إدارة السلة'].push(shortcut);
      } else if (shortcut.alt && ['c', 'k', 'd', 'u'].includes(shortcut.key)) {
        categories['إدارة السلة'].push(shortcut);
      } else {
        categories['التنقل والأساسيات'].push(shortcut);
      }
    });

    return categories;
  }, [shortcuts]);

  const ModifierKey = ({ type }: { type: 'ctrl' | 'alt' | 'shift' }) => {
    if (type === 'ctrl') {
      return isMac ? (
        <Badge variant="outline" className="h-7 min-w-[1.75rem] flex items-center justify-center bg-background/50 backdrop-blur border-border/50 shadow-sm">
          <Command className="h-3.5 w-3.5" />
        </Badge>
      ) : (
        <Badge variant="outline" className="h-7 px-2 flex items-center justify-center bg-background/50 backdrop-blur border-border/50 shadow-sm font-mono text-xs">
          Ctrl
        </Badge>
      );
    }
    if (type === 'alt') {
      return isMac ? (
        <Badge variant="outline" className="h-7 min-w-[1.75rem] flex items-center justify-center bg-background/50 backdrop-blur border-border/50 shadow-sm">
          <Option className="h-3.5 w-3.5" />
        </Badge>
      ) : (
        <Badge variant="outline" className="h-7 px-2 flex items-center justify-center bg-background/50 backdrop-blur border-border/50 shadow-sm font-mono text-xs">
          Alt
        </Badge>
      );
    }
    if (type === 'shift') {
      return (
        <Badge variant="outline" className="h-7 px-2 flex items-center justify-center bg-background/50 backdrop-blur border-border/50 shadow-sm font-mono text-xs">
          Shift
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden border-none bg-transparent shadow-2xl">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl z-0" />

        <div className="relative z-10 flex flex-col h-full">
          <DialogHeader className="p-6 pb-4 border-b border-border/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-inner">
                  <Keyboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    اختصارات لوحة المفاتيح
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    دليلك السريع للتحكم في النظام باحترافية
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6 max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(categorizedShortcuts).map(([category, categoryShortcuts]) => {
                if (categoryShortcuts.length === 0) return null;

                return (
                  <div key={category} className="space-y-3">
                    <h3 className="font-bold text-sm text-primary flex items-center gap-2 px-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="group flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card/40 hover:bg-card/60 hover:border-primary/20 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {shortcut.ctrl && <ModifierKey type="ctrl" />}
                            {shortcut.alt && <ModifierKey type="alt" />}
                            {shortcut.shift && <ModifierKey type="shift" />}

                            <Badge
                              variant="secondary"
                              className="h-7 min-w-[1.75rem] px-2 flex items-center justify-center font-bold text-sm bg-primary/10 text-primary border border-primary/10 shadow-sm"
                            >
                              {shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border/10 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted border border-border/50 text-[10px]">F1</span>
              <span>لفتح هذه النافذة في أي وقت</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-2">
              <span>{isMac ? 'macOS' : 'Windows'} Mode Active</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;

