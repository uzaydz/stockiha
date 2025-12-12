/**
 * 🔍 OmniSearch - مركز البحث العصبي
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * حقل بحث ذكي يدمج:
 * - البحث النصي
 * - مسح الباركود
 * - فلاتر ذكية (Chips)
 * - اقتراحات سريعة
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, memo, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Scan,
  X,
  Loader2,
  Sparkles,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { POSMode } from './CommandIsland';
import { useCustomShortcuts } from './KeyboardShortcutsManager';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface OmniSearchRef {
  focus: () => void;
  clear: () => void;
}

interface OmniSearchProps {
  value: string;
  onChange: (value: string) => void;
  onBarcodeSearch: (barcode: string) => void;
  isLoading?: boolean;
  mode: POSMode;
  selectedCategory?: string;
  categories?: { id: string; name: string }[];
  onCategoryChange?: (categoryId: string) => void;
  placeholder?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const OmniSearch = forwardRef<OmniSearchRef, OmniSearchProps>(({
  value,
  onChange,
  onBarcodeSearch,
  isLoading = false,
  mode,
  selectedCategory,
  categories = [],
  onCategoryChange,
  placeholder
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // ⚡ الاختصارات المخصصة
  const { shortcuts, reload: reloadShortcuts } = useCustomShortcuts();
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  // ⚡ تعريض دوال للمكون الأب
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      onChange('');
      inputRef.current?.focus();
    }
  }), [onChange]);

  // ⚡ الحصول على اختصار البحث الحالي
  const searchShortcut = useMemo(() => {
    const s = shortcuts.find(sc => sc.id === 'search');
    if (!s) return 'F2';
    const parts = [];
    if (s.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
    if (s.alt) parts.push(isMac ? '⌥' : 'Alt');
    parts.push(s.key);
    return parts.join('+');
  }, [shortcuts, isMac]);

  // ⚡ إعادة تحميل الاختصارات عند تغيير localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pos-shortcuts') {
        reloadShortcuts();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [reloadShortcuts]);

  // ⚡ ألوان حسب الوضع - تخزين مؤقت
  // 🎨 اللون البرتقالي هو اللون الأساسي للبيع
  const modeAccent = useMemo(() => ({
    sale: 'orange',
    return: 'blue',
    loss: 'red'
  }[mode]), [mode]);

  // التركيز على حقل الباركود عند التفعيل
  useEffect(() => {
    if (barcodeMode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [barcodeMode]);

  // ⚡ معالجة إرسال الباركود - تخزين مؤقت
  const handleBarcodeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      onBarcodeSearch(barcodeInput.trim());
      setBarcodeInput('');
    }
  }, [barcodeInput, onBarcodeSearch]);

  // ⚡ معالجة مسح الحقل - تخزين مؤقت
  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // اختصار لوحة المفاتيح - يستخدم الاختصارات المخصصة
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // البحث عن اختصار البحث
      const searchSc = shortcuts.find(sc => sc.id === 'search');
      const clearSc = shortcuts.find(sc => sc.id === 'clearSearch');
      const barcodeSc = shortcuts.find(sc => sc.id === 'barcode');

      // التحقق من اختصار البحث
      if (searchSc) {
        const keyMatch = e.key.toUpperCase() === searchSc.key.toUpperCase() || e.key === searchSc.key;
        const ctrlMatch = searchSc.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
        const altMatch = searchSc.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && altMatch) {
          e.preventDefault();
          inputRef.current?.focus();
          return;
        }
      }

      // التحقق من اختصار مسح البحث
      if (clearSc) {
        const keyMatch = e.key.toUpperCase() === clearSc.key.toUpperCase() || e.key === clearSc.key;
        const ctrlMatch = clearSc.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
        const altMatch = clearSc.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && altMatch) {
          e.preventDefault();
          onChange('');
          inputRef.current?.focus();
          return;
        }
      }

      // التحقق من اختصار الباركود
      if (barcodeSc) {
        const keyMatch = e.key.toUpperCase() === barcodeSc.key.toUpperCase() || e.key === barcodeSc.key;
        const ctrlMatch = barcodeSc.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
        const altMatch = barcodeSc.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && altMatch) {
          e.preventDefault();
          setBarcodeMode(prev => !prev);
          return;
        }
      }

      // Ctrl/Cmd + K للتركيز على البحث (اختصار ثابت إضافي)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Ctrl/Cmd + B لوضع الباركود (اختصار ثابت إضافي)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setBarcodeMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onChange, shortcuts]);

  // ⚡ تحسين البحث عن اسم الفئة - تخزين مؤقت
  const selectedCategoryName = useMemo(() =>
    categories.find(c => c.id === selectedCategory)?.name
    , [categories, selectedCategory]);

  return (
    <div className="relative group">
      {/* ═══ حقل البحث الرئيسي ═══ */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "relative flex items-center gap-2 rounded-xl h-11 px-3",
          "transition-all duration-300 ease-out",
          isFocused
            ? "bg-white dark:bg-[#21262d] shadow-lg shadow-black/8 dark:shadow-black/30 ring-2 ring-orange-500/30 dark:ring-orange-500/40 border border-orange-300/50 dark:border-orange-500/30"
            : "bg-white dark:bg-[#161b22] hover:bg-zinc-50 dark:hover:bg-[#21262d] border border-zinc-200 dark:border-[#30363d] hover:border-zinc-300 dark:hover:border-[#484f58]"
        )}
      >
        {/* أيقونة البحث */}
        <div className="flex items-center justify-center w-6">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="search"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Search className={cn(
                  "h-4 w-4 transition-colors",
                  isFocused ? "text-zinc-800 dark:text-[#e6edf3]" : "text-zinc-400 dark:text-[#8b949e]"
                )} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chips الفلاتر النشطة - تصميم راقي وبسيط */}
        <AnimatePresence>
          {selectedCategory && selectedCategory !== 'all' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, width: 0 }}
              animate={{ scale: 1, opacity: 1, width: 'auto' }}
              exit={{ scale: 0.9, opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <Badge
                variant="secondary"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg cursor-pointer whitespace-nowrap mr-1",
                  "bg-zinc-100 dark:bg-[#21262d] shadow-sm border border-zinc-200 dark:border-[#30363d]",
                  "text-zinc-700 dark:text-[#e6edf3] hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700/50 transition-colors"
                )}
                onClick={() => onCategoryChange?.('all')}
              >
                <span className="font-semibold">{selectedCategoryName}</span>
                <X className="h-2.5 w-2.5 opacity-60" />
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* حقل الإدخال */}
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || `بحث عن منتج... (${searchShortcut})`}
          className={cn(
            "flex-1 h-full border-0 bg-transparent shadow-none px-0",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-zinc-400 dark:placeholder:text-[#6e7681]",
            "text-base text-zinc-800 dark:text-[#e6edf3]"
          )}
        />

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-1">
          {/* زر المسح */}
          <AnimatePresence>
            {value && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full hover:bg-zinc-200 dark:hover:bg-[#21262d] text-zinc-400 dark:text-[#8b949e] hover:text-zinc-700 dark:hover:text-[#e6edf3]"
                  onClick={handleClear}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-px h-4 bg-zinc-200 dark:bg-[#30363d] mx-1" />

          {/* زر الباركود - تصميم متكامل */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg transition-all duration-300",
              barcodeMode
                ? "bg-orange-500 text-white dark:bg-orange-500 dark:text-white shadow-md shadow-orange-500/30"
                : "text-zinc-400 dark:text-[#8b949e] hover:text-zinc-800 dark:hover:text-[#e6edf3] hover:bg-zinc-200/50 dark:hover:bg-[#21262d]"
            )}
            onClick={() => setBarcodeMode(!barcodeMode)}
          >
            <Scan className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* ═══ حقل الباركود المنزلق ═══ */}
      <AnimatePresence>
        {barcodeMode && (
          <motion.form
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onSubmit={handleBarcodeSubmit}
            className="overflow-hidden"
          >
            <div className={cn(
              "mt-2 flex items-center gap-2 p-2 rounded-xl",
              "bg-gradient-to-r",
              mode === 'sale' && "from-orange-50 to-amber-50 dark:from-[#21262d] dark:to-[#161b22]",
              mode === 'return' && "from-blue-50 to-indigo-50 dark:from-[#21262d] dark:to-[#161b22]",
              mode === 'loss' && "from-red-50 to-rose-50 dark:from-[#21262d] dark:to-[#161b22]",
              "border border-dashed",
              mode === 'sale' && "border-orange-300 dark:border-orange-500/50",
              mode === 'return' && "border-blue-300 dark:border-blue-500/50",
              mode === 'loss' && "border-red-300 dark:border-red-500/50"
            )}>
              <Sparkles className={cn(
                "h-4 w-4",
                mode === 'sale' && "text-orange-500",
                mode === 'return' && "text-blue-500",
                mode === 'loss' && "text-red-500"
              )} />
              <Input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="امسح الباركود..."
                className="flex-1 h-8 border-0 bg-transparent text-sm focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!barcodeInput.trim() || isLoading}
                className={cn(
                  "h-8 px-3 rounded-lg",
                  mode === 'sale' && "bg-orange-500 hover:bg-orange-600",
                  mode === 'return' && "bg-blue-500 hover:bg-blue-600",
                  mode === 'loss' && "bg-red-500 hover:bg-red-600"
                )}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
});

OmniSearch.displayName = 'OmniSearch';

export default OmniSearch;
