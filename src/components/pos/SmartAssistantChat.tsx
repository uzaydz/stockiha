import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Send,
  Loader2,
  Sparkles,
  TrendingUp,
  Box,
  Receipt,
  Users,
  DollarSign,
  Wrench,
  Search,
  Zap,
  RotateCcw,
  X,
  Command,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppImages } from '@/lib/appImages';
import { AssistantOrchestrator } from '@/services/assistant/AssistantOrchestrator';
import { UnifiedMutationService } from '@/services/assistant/UnifiedMutationService';
import { computeAvailableStock } from '@/lib/stock';
import { VariantPicker } from './VariantPicker';
import { ExpenseQuickForm } from './ExpenseQuickForm';
import { RepairQuickForm } from './RepairQuickForm';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { QueryHistory } from '@/services/assistant/QueryHistory';
import { motion, AnimatePresence } from 'framer-motion';

// 🚀 Generative UI Imports
import { WidgetRenderer, WidgetData } from './assistant-widgets/WidgetRegistry';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  error?: boolean;
  retryable?: boolean;
  widget?: WidgetData;
}

interface SmartAssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = 'pos_smart_assistant_chat_v5_orange';

// 🧠 "Brain" Menu Items
const ACTION_MENU = [
  {
    label: 'المبيعات والتقارير',
    icon: TrendingUp,
    items: [
      { label: 'مبيعات اليوم', query: 'كم مبيعات اليوم؟' },
      { label: 'الأكثر مبيعاً', query: 'ما هي المنتجات الأكثر مبيعاً؟' },
      { label: 'أداء الشهر', query: 'قارن مبيعات هذا الشهر بالماضي' }
    ]
  },
  {
    label: 'المخزون والمنتجات',
    icon: Box,
    items: [
      { label: 'تنبيهات النواقص', query: 'ما هي المنتجات التي أوشكت على النفاذ؟' },
      { label: 'السلع الراكدة', query: 'المنتجات التي لم تبع منذ 30 يوم' },
      { label: 'جرد سريع', query: 'أعطني ملخص عن قيمة المخزون' }
    ]
  },
  {
    label: 'المالية والديون',
    icon: DollarSign,
    items: [
      { label: 'تسجيل مصروف', query: 'تسجيل مصروف جديد' },
      { label: 'صافي الربح', query: 'كم صافي الربح لليوم؟' },
      { label: 'تسجيل دين', query: 'تسجيل دين جديد' }
    ]
  },
  {
    label: 'العملاء والخدمات',
    icon: Users,
    items: [
      { label: 'إضافة عميل', query: 'إضافة عميل جديد' },
      { label: 'استلام صيانة', query: 'استلام جهاز جديد للصيانة' }
    ]
  }
];

const STARTER_SUGGESTIONS = [
  { icon: TrendingUp, label: 'تحليل المبيعات', query: 'أعطني تقرير مبيعات اليوم' },
  { icon: Box, label: 'فحص المخزون', query: 'ما هي النواقص في المتجر؟' },
  { icon: Receipt, label: 'تسجيل مصروف', query: 'أريد تسجيل مصروف جديد' },
  { icon: Users, label: 'إضافة عميل', query: 'إضافة عميل جديد' },
];

export const SmartAssistantChat: React.FC<SmartAssistantChatProps> = ({ open, onOpenChange }) => {
  const { organizationId } = useOptimizedAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { }
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [variantState, setVariantState] = useState<{ open: boolean; product: any | null }>(() => ({ open: false, product: null }));
  const [expenseState, setExpenseState] = useState<{ open: boolean; form: any | null }>(() => ({ open: false, form: null }));
  const [repairState, setRepairState] = useState<{ open: boolean; form: any | null }>(() => ({ open: false, form: null }));

  const lastProductRef = useRef<any | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      viewportRef.current?.querySelector('[data-radix-scroll-area-viewport]')?.scrollTo({ top: 100000, behavior: 'smooth' });
    });
  }, [messages, open, loading]);

  const handleWidgetAction = (action: string, payload?: any) => {
    if (action === 'update_stock' && payload) { setVariantState({ open: true, product: payload }); return; }

    const asyncWrapper = async (fn: () => Promise<void>) => {
      setLoading(true);
      try { await fn(); } catch (err) {
        setMessages(prev => [...prev, { id: String(Date.now() + 2), role: 'assistant', content: '❌ فشل العملية.', error: true, timestamp: Date.now() }]);
      } finally { setLoading(false); }
    };

    if (action === 'submit_expense') {
      asyncWrapper(async () => {
        const { ExpenseAssistantService } = await import('@/services/assistant/UnifiedMutationService');
        await ExpenseAssistantService.createExpense({
          title: payload.title, amount: Number(payload.amount), category: payload.category || 'أخرى',
          date: new Date().toISOString().slice(0, 10), notes: 'SIRA'
        });
        setMessages(prev => [...prev, { id: String(Date.now() + 2), role: 'assistant', content: `✅ تم تسجيل: ${payload.title}`, timestamp: Date.now() }]);
      });
    } else if (action === 'submit_customer') {
      asyncWrapper(async () => {
        const { createLocalCustomer } = await import('@/api/localCustomerService');
        await createLocalCustomer({ name: payload.name, phone: payload.phone, organization_id: organizationId! });
        setMessages(prev => [...prev, { id: String(Date.now() + 2), role: 'assistant', content: `✅ عميل جديد: ${payload.name}`, timestamp: Date.now() }]);
      });
    } else if (action === 'submit_debt') {
      asyncWrapper(async () => {
        const { UnifiedMutationService } = await import('@/services/assistant/UnifiedMutationService');
        const { searchLocalCustomers, createLocalCustomer } = await import('@/api/localCustomerService');
        let cId = payload.customerId;
        if (!cId) {
          const c = await searchLocalCustomers(payload.customerName);
          cId = c.length > 0 ? c[0].id : (await createLocalCustomer({ name: payload.customerName, organization_id: organizationId! })).id;
        }
        if (payload.type === 'debt') await UnifiedMutationService.createCustomerDebt({ organizationId: organizationId!, customerId: cId, customerName: payload.customerName, amount: Number(payload.amount), description: payload.notes });
        else await UnifiedMutationService.applyCustomerPayment({ organizationId: organizationId!, customerId: cId, amount: Number(payload.amount), note: payload.notes, appliedBy: 'assistant' });
        setMessages(prev => [...prev, { id: String(Date.now() + 2), role: 'assistant', content: `✅ تم التسجيل بنجاح`, timestamp: Date.now() }]);
      });
    }
  };

  const sendMessage = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    setMenuOpen(false); // Close menu if open
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: q, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await AssistantOrchestrator.process(q, {
        organizationId: organizationId || undefined,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        context: { lastProduct: lastProductRef.current || undefined },
        signal: abortControllerRef.current?.signal,
      });

      try {
        const parsed = JSON.parse(res.answer);
        if (parsed?.type === 'product_with_variants' && parsed.product) {
          lastProductRef.current = parsed.product;
          setVariantState({ open: true, product: parsed.product });
          setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: 'يرجى الاختيار:', timestamp: Date.now() }]);
          setLoading(false); return;
        }
      } catch { }

      const isError = (res as any).error === true;
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.answer,
        timestamp: Date.now(),
        error: isError,
        retryable: isError,
        widget: (res as any).widget
      }]);
      QueryHistory.add({ query: q, response: res.answer, success: !isError });

    } catch (e: any) {
      if (e?.name !== 'AbortError') setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: 'عذراً، حدث خطأ.', timestamp: Date.now(), error: true }]);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleVariantConfirm = async (sel: any) => {
    const p = variantState.product;
    if (!p) return;
    setLoading(true);
    try {
      const updated = await UnifiedMutationService.adjustInventory({ organizationId: organizationId!, productId: p.id, ...sel });
      setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: `✅ تم التحديث: ${computeAvailableStock(updated || p)}`, timestamp: Date.now() }]);
    } catch { setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: 'فشل التحديث', timestamp: Date.now(), error: true }]); }
    finally { setVariantState({ open: false, product: null }); setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[750px] w-full p-0 gap-0 border-none bg-transparent shadow-none duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative flex flex-col h-[85vh] max-h-[850px] w-full bg-[#FFFFFF] dark:bg-[#0A0A0A] rounded-[24px] overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        >
          {/* ════════ HEADER ════════ */}
          <div className="flex-none px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-xl z-20">
            <div className="flex items-center gap-3">
              {/* SIRA LOGO (Orange) */}
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <img src={AppImages.selkiaLogo} className="w-6 h-6 object-contain brightness-0 invert drop-shadow" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                  SIRA Genius
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/10 text-[10px] text-orange-600 dark:text-orange-400 font-bold tracking-wide">PRO</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">مساعدك الذكي</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setMessages([])} className="h-9 w-9 rounded-full bg-gray-50 dark:bg-white/5 text-gray-500 hover:text-black dark:hover:text-white"><RotateCcw className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9 rounded-full bg-gray-50 dark:bg-white/5 text-gray-500 hover:text-red-500"><X className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* ════════ CHAT ════════ */}
          <ScrollArea ref={viewportRef} className="flex-1 px-4 bg-[#FAFAFA] dark:bg-[#000000]">
            <div className="flex flex-col gap-5 max-w-3xl mx-auto pt-8 pb-32 min-h-full">
              {/* Zero State */}
              <AnimatePresence>
                {messages.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center -mt-10">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">كيف يمكنني مساعدتك؟</h2>
                    <p className="text-gray-500 text-sm mb-10">نظام ذكي متكامل لإدارة متجرك.</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl px-4">
                      {STARTER_SUGGESTIONS.map((s, i) => (
                        <button key={i} onClick={() => sendMessage(s.query)} className="flex flex-col items-center justify-center gap-3 p-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-1 transition-all group">
                          <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                            <s.icon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mx-auto text-center group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === 'user' ? "justify-end w-full" : "justify-start w-full")}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-md shadow-orange-500/20">
                      <img src={AppImages.selkiaLogo} className="w-4 h-4 brightness-0 invert" />
                    </div>
                  )}

                  <div className={cn(
                    "relative px-5 py-3.5 max-w-[85%] text-[15px] leading-relaxed shadow-sm",
                    m.role === 'user'
                      ? "bg-black text-white rounded-[20px] rounded-br-[4px] dark:bg-white dark:text-black"
                      : "bg-white text-gray-800 border border-gray-100 rounded-[20px] rounded-tl-[4px] dark:bg-[#111] dark:text-gray-200 dark:border-white/10"
                  )}>
                    {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                    {m.widget && <div className="mt-4 w-full"><WidgetRenderer widget={m.widget} onAction={handleWidgetAction} /></div>}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 px-2">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* ════════ FLOATING INPUT ISLAND ════════ */}
          <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center z-30 pointer-events-none">
            <div className="w-full max-w-2xl bg-white/90 dark:bg-[#111]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-2xl rounded-full p-2 flex items-center gap-2 pointer-events-auto ring-4 ring-gray-100/50 dark:ring-white/5 transition-all focus-within:ring-orange-500/20 focus-within:border-orange-500/30">

              {/* 🪄 MAGIC MENU TRIGGER */}
              <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors">
                    <Zap className="w-5 h-5 fill-current" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-[300px] p-0 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl mb-2 overflow-hidden z-[9999]" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="text-xs font-semibold text-gray-400 px-4 py-3 border-b border-gray-100 dark:border-white/5 uppercase tracking-wider bg-gray-50/50 dark:bg-white/5">
                    قائمة الإجراءات السريعة
                  </div>
                  <ScrollArea className="h-[320px] w-full" type="always">
                    <div className="p-2 space-y-1">
                      {ACTION_MENU.map((group, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-900 dark:text-white bg-gray-100/50 dark:bg-white/5 rounded-lg mb-1 mx-1">
                            <group.icon className="w-3 h-3 text-orange-500" />
                            {group.label}
                          </div>
                          <div className="space-y-0.5">
                            {group.items.map((item, i) => (
                              <button
                                key={i}
                                onClick={() => sendMessage(item.query)}
                                className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 rounded-lg transition-colors group text-right"
                              >
                                <span>{item.label}</span>
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 text-orange-500 transition-all" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <div className="w-[1px] h-6 bg-gray-200 dark:bg-white/10 mx-1" />

              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                placeholder="اطلب أي شيء من متجرك..."
                className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent text-base h-10 px-2"
                disabled={loading}
              />

              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className={cn(
                  "h-10 px-5 rounded-full transition-all font-medium",
                  input.trim()
                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:scale-105"
                    : "bg-gray-100 dark:bg-white/5 text-gray-400"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

        </motion.div>

        {/* Modals */}
        <Dialog open={variantState.open} onOpenChange={(o) => setVariantState({ open: o, product: o ? variantState.product : null })}><DialogContent><VariantPicker product={variantState.product} onConfirm={handleVariantConfirm} /></DialogContent></Dialog>
        <Dialog open={expenseState.open} onOpenChange={(o) => setExpenseState({ open: o, form: o ? expenseState.form : null })}><DialogContent><ExpenseQuickForm defaults={expenseState.form?.fields} categories={expenseState.form?.categories} onSubmit={() => { }} /></DialogContent></Dialog>
        <Dialog open={repairState.open} onOpenChange={(o) => setRepairState({ open: o, form: o ? repairState.form : null })}><DialogContent><RepairQuickForm defaults={repairState.form?.fields} locations={repairState.form?.locations} onSubmit={() => { }} /></DialogContent></Dialog>
      </DialogContent>
    </Dialog>
  );
};
