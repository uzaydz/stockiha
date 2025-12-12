/**
 * ⌨️ مدير الاختصارات - تصميم بسيط
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { X, Keyboard, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════

interface Shortcut {
  id: string;
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  label: string;
  editable?: boolean;
}

const STORAGE_KEY = 'pos-shortcuts';
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

const SHORTCUTS: Shortcut[] = [
  // مفاتيح الوظائف
  { id: 'help', key: 'F1', label: 'المساعدة' },
  { id: 'search', key: 'F2', label: 'بحث', editable: true },
  { id: 'clearSearch', key: 'F3', label: 'مسح البحث' },
  { id: 'barcode', key: 'F4', label: 'باركود', editable: true },
  { id: 'refresh', key: 'F5', label: 'تحديث' },
  { id: 'cart', key: 'F6', label: 'السلة', editable: true },
  { id: 'return', key: 'F7', label: 'وضع الإرجاع', editable: true },
  { id: 'settings', key: 'F8', label: 'إعدادات', editable: true },
  { id: 'calc', key: 'F9', label: 'حاسبة', editable: true },
  { id: 'pay', key: 'F10', label: 'إتمام البيع', editable: true },
  { id: 'fullscreen', key: 'F11', label: 'شاشة كاملة' },
  { id: 'quick', key: 'F12', label: 'بيع سريع', editable: true },
  // اختصارات Alt - الأوضاع
  { id: 'modeSale', key: '1', alt: true, label: 'وضع البيع', editable: true },
  { id: 'modeReturn', key: '2', alt: true, label: 'وضع الإرجاع', editable: true },
  { id: 'modeLoss', key: '3', alt: true, label: 'وضع الخسارة', editable: true },
  // اختصارات Alt - أخرى
  { id: 'cash', key: 'C', alt: true, label: 'نقدي', editable: true },
  { id: 'card', key: 'K', alt: true, label: 'بطاقة', editable: true },
  { id: 'clearCart', key: 'X', alt: true, label: 'حذف السلة', editable: true },
  // اختصارات Ctrl
  { id: 'new', key: 'N', ctrl: true, label: 'سلة جديدة', editable: true },
  { id: 'save', key: 'S', ctrl: true, label: 'حفظ', editable: true },
];

const load = (): Shortcut[] => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const p = JSON.parse(s);
      return SHORTCUTS.map(d => {
        const f = p.find((x: Shortcut) => x.id === d.id);
        return f ? { ...d, key: f.key, ctrl: f.ctrl, alt: f.alt } : d;
      });
    }
  } catch {}
  return SHORTCUTS;
};

const save = (s: Shortcut[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    // إطلاق حدث مخصص لإعلام المكونات الأخرى بالتحديث
    window.dispatchEvent(new CustomEvent('shortcuts-updated'));
  } catch {}
};

// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyboardShortcutsManager: React.FC<Props> = memo(({ open, onOpenChange }) => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(load);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<{ key: string; ctrl: boolean; alt: boolean } | null>(null);

  useEffect(() => {
    if (open) { setShortcuts(load()); setEditing(null); setPending(null); }
  }, [open]);

  // التقاط المفتاح
  useEffect(() => {
    if (!editing) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      if (e.key === 'Escape') { setEditing(null); setPending(null); return; }

      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      setPending({ key, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey });
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [editing]);

  const apply = useCallback(() => {
    if (!editing || !pending) return;
    setShortcuts(prev => {
      const updated = prev.map(s => s.id === editing ? { ...s, ...pending } : s);
      save(updated);
      return updated;
    });
    setEditing(null);
    setPending(null);
    toast.success('تم الحفظ');
  }, [editing, pending]);

  const reset = useCallback(() => {
    setShortcuts(SHORTCUTS);
    save(SHORTCUTS);
    toast.success('تم الاستعادة');
  }, []);

  const formatKey = (s: Shortcut) => {
    const parts = [];
    if (s.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
    if (s.alt) parts.push(isMac ? '⌥' : 'Alt');
    parts.push(s.key);
    return parts.join('+');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0 bg-white dark:bg-zinc-900" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-orange-500" />
            <span className="font-bold dark:text-white">الاختصارات</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* List */}
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {shortcuts.map(s => (
            <div
              key={s.id}
              onClick={() => s.editable && !editing && setEditing(s.id)}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg mb-1",
                s.editable ? "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" : "opacity-50",
                editing === s.id && "bg-orange-50 dark:bg-orange-500/10 ring-2 ring-orange-500"
              )}
            >
              <span className="text-sm dark:text-zinc-200">{s.label}</span>

              {editing === s.id ? (
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs bg-orange-500 text-white rounded font-mono min-w-[60px] text-center">
                    {pending ? formatKey({ ...s, ...pending }) : 'اضغط...'}
                  </kbd>
                  {pending && (
                    <button
                      onClick={(e) => { e.stopPropagation(); apply(); }}
                      className="w-7 h-7 flex items-center justify-center bg-green-500 text-white rounded text-sm"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(null); setPending(null); }}
                    className="w-7 h-7 flex items-center justify-center bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <kbd className="px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 rounded font-mono">
                  {formatKey(s)}
                </kbd>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t dark:border-zinc-800">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            <RotateCcw className="w-4 h-4" />
            استعادة الافتراضي
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

KeyboardShortcutsManager.displayName = 'KeyboardShortcutsManager';

export default KeyboardShortcutsManager;

export const KeyboardShortcutsButton = memo<{ onClick: () => void }>(({ onClick }) => (
  <button
    onClick={onClick}
    className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-orange-400 transition-all"
    title="الاختصارات"
  >
    <Keyboard className="w-5 h-5 text-zinc-500 hover:text-orange-500" />
  </button>
));

KeyboardShortcutsButton.displayName = 'KeyboardShortcutsButton';

export const useCustomShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(load);
  const reload = useCallback(() => setShortcuts(load()), []);

  // ⚡ إعادة تحميل الاختصارات عند تغيير localStorage (من نفس النافذة)
  useEffect(() => {
    const handleStorageChange = () => {
      setShortcuts(load());
    };

    // الاستماع لحدث مخصص للتحديثات من نفس النافذة
    window.addEventListener('shortcuts-updated', handleStorageChange);
    return () => window.removeEventListener('shortcuts-updated', handleStorageChange);
  }, []);

  return { shortcuts, reload };
};
