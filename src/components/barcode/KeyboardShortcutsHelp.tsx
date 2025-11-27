/**
 * KeyboardShortcutsHelp - عرض اختصارات لوحة المفاتيح
 */

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Shortcut {
  key: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ shortcuts }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <Keyboard className="h-3.5 w-3.5 ml-1" />
          اختصارات
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
          <Keyboard className="h-4 w-4" />
          اختصارات لوحة المفاتيح
        </h4>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground text-xs">
                {shortcut.description}
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default KeyboardShortcutsHelp;
