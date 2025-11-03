import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User, RotateCcw, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantOrchestrator } from '@/services/assistant/AssistantOrchestrator';
import { UnifiedMutationService, ExpenseAssistantService } from '@/services/assistant/UnifiedMutationService';
import { computeAvailableStock } from '@/lib/stock';
import { VariantPicker } from './VariantPicker';
import { ExpenseQuickForm } from './ExpenseQuickForm';
import { RepairQuickForm } from './RepairQuickForm';
import { useToast } from '@/hooks/use-toast';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface SmartAssistantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = 'pos_smart_assistant_chat_v1';

const LOADING_MESSAGES = [
  'كل عملية بيع... قصة نفهمها',
  'نجاحك يبدأ من هنا',
  'نحوّل البيانات إلى قرارات ذكية',
  'مبيعاتك... شغفنا',
  'كل رقم... فرصة جديدة',
  'نرسم لك خريطة النجاح',
  'معك في كل خطوة نحو التميز',
  'نجعل الأرقام تتحدث',
  'متجرك... عالمنا',
  'الذكاء في خدمة تجارتك',
  'معاً نصنع الفارق',
  'نحلل الماضي... نبني المستقبل',
  'تجارتك تستحق الأفضل',
  'كل استفسار... إجابة دقيقة',
  'نبسّط الصعب... نحقق المستحيل',
  'بياناتك... كنزنا',
  'معك لحظة بلحظة',
  'نفهم احتياجك قبل أن تسأل',
];

export const SmartAssistantChat: React.FC<SmartAssistantChatProps> = ({ open, onOpenChange }) => {
  const { organizationId } = useOptimizedAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'مرحباً بك في SIRA – تتحدث لغة تجارتك\n\nيمكنني مساعدتك في:\n• الاستعلام عن المبيعات والأرباح\n• متابعة حالة المخزون\n• تعديل الكميات مباشرة\n\nمثال: "ما هي مبيعات اليوم؟" أو "تحديث مخزون المنتج"',
        timestamp: Date.now(),
      },
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [variantState, setVariantState] = useState<{ open: boolean; product: any | null }>(() => ({ open: false, product: null }));
  const lastProductRef = useRef<any | null>(null);
  const [expenseState, setExpenseState] = useState<{ open: boolean; form: any | null }>(() => ({ open: false, form: null }));
  const [repairState, setRepairState] = useState<{ open: boolean; form: any | null }>(() => ({ open: false, form: null }));
  const viewportRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // auto scroll
  useEffect(() => {
    if (!open) return;
    const v = viewportRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (v) v.scrollTop = v.scrollHeight;
  }, [messages, open]);

  // rotate loading messages
  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000); // تغيير كل 2 ثانية
    return () => clearInterval(interval);
  }, [loading]);

  const historyForAI = useMemo(() => messages.slice(-6).map(m => ({ role: m.role, content: m.content })), [messages]);

  const stopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    // لا نضيف أي رسالة - إيقاف تام
  };

  const sendMessage = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: q, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    // إنشاء AbortController جديد
    abortControllerRef.current = new AbortController();
    
    try {
      const res = await AssistantOrchestrator.process(q, {
        organizationId: organizationId || undefined,
        history: historyForAI,
        context: { lastProduct: lastProductRef.current || undefined },
        signal: abortControllerRef.current?.signal,
      });

      // إن كانت إجابة تفاعلية لمنتج بمتغيرات أو نموذج مصروف
      try {
        const parsed = JSON.parse(res.answer);
        if (parsed?.type === 'product_with_variants' && parsed.product) {
          lastProductRef.current = parsed.product;
          setVariantState({ open: true, product: parsed.product });
          const botMsg: Message = { id: String(Date.now()+1), role: 'assistant', content: 'يرجى تحديد المتغيرات والكمية المطلوبة.', timestamp: Date.now() };
          setMessages(prev => [...prev, botMsg]);
          return;
        }
        if (parsed?.type === 'expense_form') {
          setExpenseState({ open: true, form: parsed });
          const botMsg: Message = { id: String(Date.now()+1), role: 'assistant', content: 'أكمل حقول المصروف ثم اضغط تسجيل.', timestamp: Date.now() };
          setMessages(prev => [...prev, botMsg]);
          return;
        }
        if (parsed?.type === 'repair_form') {
          setRepairState({ open: true, form: parsed });
          const botMsg: Message = { id: String(Date.now()+1), role: 'assistant', content: 'أكمل حقول طلبية التصليح ثم اضغط تسجيل.', timestamp: Date.now() };
          setMessages(prev => [...prev, botMsg]);
          return;
        }
      } catch {}

      // حفظ آخر منتج إن وُجد في data
      if ((res as any).data?.product) {
        lastProductRef.current = (res as any).data.product;
      }

      // إذا كانت الإجابة JSON لنموذج مصروف ولم يتم التقاطها أعلاه، التقطها الآن ومنع عرض JSON الخام
      try {
        if (res.answer?.trim?.().startsWith('{')) {
          const parsed2 = JSON.parse(res.answer);
          if (parsed2?.type === 'expense_form') {
            setExpenseState({ open: true, form: parsed2 });
            const botMsg2: Message = { id: String(Date.now()+1), role: 'assistant', content: 'أكمل حقول المصروف ثم اضغط تسجيل.', timestamp: Date.now() };
            setMessages(prev => [...prev, botMsg2]);
            setLoading(false);
            return;
          }
          if (parsed2?.type === 'repair_form') {
            setRepairState({ open: true, form: parsed2 });
            const botMsg3: Message = { id: String(Date.now()+1), role: 'assistant', content: 'أكمل حقول طلبية التصليح ثم اضغط تسجيل.', timestamp: Date.now() };
            setMessages(prev => [...prev, botMsg3]);
            setLoading(false);
            return;
          }
        }
      } catch {}

      const botMsg: Message = { id: String(Date.now()+1), role: 'assistant', content: res.answer, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
      // تجاهل الأخطاء إذا تم الإلغاء
      if (e?.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return;
      }
      const botMsg: Message = { id: String(Date.now()+1), role: 'assistant', content: 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.', timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleVariantConfirm = async (sel: { colorId: string; sizeId?: string | null; quantity: number; mode: 'set' | 'delta' }) => {
    const p = variantState.product;
    if (!p) return;
    setLoading(true);
    try {
      // احصل على معرف المؤسسة من السياق أو من المنتج أو من localStorage
      const fallbackOrgId = ((): string | null => {
        try {
          return (
            organizationId ||
            p.organization_id ||
            localStorage.getItem('currentOrganizationId') ||
            localStorage.getItem('bazaar_organization_id') ||
            null
          );
        } catch {
          return organizationId || p.organization_id || null;
        }
      })();

      if (!fallbackOrgId) {
        const botMsg: Message = { id: String(Date.now()+1), role: 'assistant', content: 'لم يتم تحديد المؤسسة. يرجى التحقق من إعدادات حسابك.', timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
        return;
      }

      const updated = await UnifiedMutationService.adjustInventory({
        organizationId: fallbackOrgId,
        productId: p.id,
        colorId: sel.colorId || null,
        sizeId: sel.sizeId || null,
        mode: sel.mode,
        quantity: sel.quantity
      });
      const color = (p.colors || p.product_colors || []).find((c: any) => c.id === sel.colorId);
      const size = sel.sizeId ? ((color?.sizes || color?.product_sizes || []).find((s: any) => s.id === sel.sizeId)) : null;
      const colorName = color ? (color.name || color.color_name) : '';
      const sizeName = size ? (size.name || size.size_name) : '';
      const available = computeAvailableStock(updated || p);
      const botMsg: Message = {
        id: String(Date.now()+1),
        role: 'assistant',
        content: `تم التحديث: ${p.name}${colorName ? ` • اللون ${colorName}` : ''}${sizeName ? ` • المقاس ${sizeName}` : ''} — المتاح الآن: ${available}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
      lastProductRef.current = updated || p;
    } finally {
      setVariantState({ open: false, product: null });
      setLoading(false);
    }
  };

  const clearConversation = () => {
    lastProductRef.current = null;
    const init: Message = {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً بك من جديد! أنا SIRA، كيف يمكنني مساعدتك اليوم؟',
      timestamp: Date.now(),
    };
    setMessages([init]);
  };

  const handleExpenseSubmit = async (data: { title: string; amount: number; category: string; date?: string; payment_method?: string; vendor_name?: string; notes?: string; }) => {
    setLoading(true);
    try {
      // حل الفئة إلى id (أوفلاين أولاً، وإن لم توجد أنشئ فئة محلياً)
      let categoryId: string | null = null;
      try {
        const { listLocalExpenseCategories, createLocalExpenseCategory } = await import('@/api/localExpenseCategoryService');
        const cats = await listLocalExpenseCategories();
        const norm = (s: string) => s.toString().trim().toLowerCase();
        const target = norm(data.category);
        const exact = cats.find((c: any) => norm(c.name) === target) || cats.find((c: any) => norm(c.name).includes(target) || target.includes(norm(c.name)));
        if (exact) categoryId = exact.id;
        if (!categoryId && data.category) {
          const newCat = await createLocalExpenseCategory(data.category);
          categoryId = newCat.id;
          try { void import('@/api/syncExpenseCategories').then(m => m.syncPendingExpenseCategories()); } catch {}
        }
      } catch {}

      const created = await ExpenseAssistantService.createExpense({
        title: data.title,
        amount: Number(data.amount),
        category: categoryId || data.category || 'أخرى',
        date: data.date,
        payment_method: data.payment_method,
        vendor_name: data.vendor_name,
        notes: data.notes,
      });
      setMessages(prev => [...prev, { id: String(Date.now()+2), role: 'assistant', content: `✅ تم تسجيل المصروف "${data.title}" بقيمة ${Number(data.amount).toFixed(2)} دج`, timestamp: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { id: String(Date.now()+2), role: 'assistant', content: 'تعذر تسجيل المصروف.', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
      setExpenseState({ open: false, form: null });
    }
  };

  const handleRepairSubmit = async (data: {
    customer_name: string;
    customer_phone: string;
    device_type: string;
    issue_description?: string;
    repair_location?: string;
    total_price?: number | null;
    paid_amount?: number | null;
    payment_method?: string;
    price_to_be_determined_later?: boolean;
  }) => {
    setLoading(true);
    try {
      let locationId: string | null = null;
      try {
        const { listLocalRepairLocations } = await import('@/api/localRepairService');
        const locs = await listLocalRepairLocations(organizationId || undefined);
        const norm = (s:string)=> s.toString().trim().toLowerCase();
        const target = norm(data.repair_location || '');
        const exact = (locs||[]).find((l:any)=> norm(l.name)===target) || (locs||[]).find((l:any)=> norm(l.name).includes(target)||target.includes(norm(l.name)));
        if (exact) locationId = exact.id;
      } catch {}
      const { createLocalRepairOrder, addLocalRepairHistory } = await import('@/api/localRepairService');
      const order = await createLocalRepairOrder({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        device_type: data.device_type,
        issue_description: data.issue_description,
        repair_location_id: locationId,
        total_price: data.total_price ?? undefined,
        paid_amount: data.paid_amount ?? undefined,
        payment_method: data.payment_method,
        price_to_be_determined_later: !!data.price_to_be_determined_later,
        received_by: undefined,
        status: 'قيد الانتظار'
      });
      await addLocalRepairHistory({ orderId: order.id, status: 'قيد الانتظار', notes: 'تم إنشاء طلبية التصليح', createdBy: 'assistant' });
      try { void import('@/api/syncRepairs').then(m => m.syncPendingRepairs()); } catch {}
      setMessages(prev => [...prev, { id: String(Date.now()+2), role: 'assistant', content: `✅ تم إنشاء طلب التصليح للعميل ${order.customer_name} • ${order.device_type || ''} • رقم: ${order.order_number || order.id}`, timestamp: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { id: String(Date.now()+2), role: 'assistant', content: 'تعذر إنشاء طلبية التصليح.', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
      setRepairState({ open: false, form: null });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 via-background to-background backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 flex items-center justify-center shadow-sm ring-1 ring-orange-200/30 dark:ring-orange-800/30">
                  <img 
                    src="/images/selkia-logo.webp" 
                    alt="SIRA AI" 
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">SIRA – Stockiha Intelligence Rapid Artificial</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">تتحدث لغة تجارتك</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearConversation} 
              className="gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg transition-all duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-medium">محادثة جديدة</span>
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea ref={viewportRef} className="flex-1 px-6 py-6 bg-gradient-to-b from-muted/30 via-background to-background">
          <div className="space-y-5">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 flex items-center justify-center shadow-sm ring-1 ring-orange-200/30 dark:ring-orange-800/30">
                      <img 
                        src="/images/selkia-logo.webp" 
                        alt="SIRA AI" 
                        className="w-5 h-5 object-contain"
                      />
                    </div>
                  </div>
                )}
                <div className={cn('max-w-[82%] space-y-1.5 group', m.role === 'user' && 'flex flex-col items-end')}>
                  <div className={cn(
                    'rounded-2xl px-4 py-3.5 transition-all duration-200',
                    m.role === 'user' 
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20' 
                      : 'bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all'
                  )}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground/70 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(m.timestamp).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {m.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center shadow-sm ring-1 ring-blue-500/10">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 flex items-center justify-center shadow-sm ring-1 ring-orange-200/30 dark:ring-orange-800/30">
                    <img 
                      src="/images/selkia-logo.webp" 
                      alt="SIRA AI" 
                      className="w-5 h-5 object-contain animate-pulse"
                    />
                  </div>
                </div>
                <div className="rounded-2xl px-4 py-3.5 bg-card/80 backdrop-blur-sm border border-primary/20 shadow-md">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground font-medium animate-pulse">
                      {LOADING_MESSAGES[loadingMessageIndex]}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-gradient-to-r from-background via-muted/10 to-background backdrop-blur-sm">
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="اكتب استفسارك هنا..."
                disabled={loading}
                className="pr-4 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
            {loading ? (
              <Button 
                onClick={stopProcessing} 
                size="icon" 
                variant="destructive"
                className="h-12 w-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                onClick={() => sendMessage()} 
                disabled={!input.trim()} 
                size="icon" 
                className="h-12 w-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 opacity-60 hover:opacity-100 transition-opacity">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-muted-foreground font-medium">يعمل بالذكاء الاصطناعي مع بياناتك المحلية</p>
          </div>
        </div>

        <Dialog open={variantState.open} onOpenChange={(o) => setVariantState({ open: o, product: o ? variantState.product : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>اختر اللون/المقاس والكمية</DialogTitle>
            </DialogHeader>
            {variantState.product && (
              <VariantPicker product={variantState.product} onConfirm={handleVariantConfirm} />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={expenseState.open} onOpenChange={(o) => setExpenseState({ open: o, form: o ? expenseState.form : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تسجيل مصروف</DialogTitle>
            </DialogHeader>
            {expenseState.form && (
              <ExpenseQuickForm
                defaults={expenseState.form.fields}
                categories={expenseState.form.categories || []}
                onSubmit={handleExpenseSubmit}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={repairState.open} onOpenChange={(o) => setRepairState({ open: o, form: o ? repairState.form : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تسجيل طلبية تصليح</DialogTitle>
            </DialogHeader>
            {repairState.form && (
              <RepairQuickForm
                defaults={repairState.form.fields}
                locations={repairState.form.locations || []}
                onSubmit={handleRepairSubmit}
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
