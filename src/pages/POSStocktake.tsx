import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useTitle } from '@/hooks/useTitle';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSLayoutState } from '@/components/pos-layout/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Activity,
  ScanBarcode,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Keyboard,
  Package,
  History,
  ArrowLeft,
  Settings2,
  Search,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import {
  approveStocktakeOfflineFirst,
  closeStocktakeSessionLocal,
  deleteStocktakeSessionLocal,
  getStocktakeDashboardLocal,
  getStocktakeSessionsLocal,
  loadStocktakeItemsLocal,
  recordStocktakeScanLocal,
  resetLocalStocktakeItem,
  setStocktakeItemCountLocal,
  setStocktakeItemReconcileLocal,
  setStocktakeSessionReconcileForShortagesLocal,
  startStocktakeSessionLocal,
} from '@/lib/powersync/stocktakeService';

// --- Types ---
type StocktakeSession = {
  id: string;
  organization_id: string;
  scope: any;
  mode: 'cycle' | 'full' | 'blind';
  status: 'draft' | 'in_progress' | 'review' | 'approved' | 'rejected';
  require_approval: boolean;
  started_at: string;
};

type StocktakeItem = {
  id: string;
  session_id: string;
  product_id: string;
  variant_id: string | null;
  expected_qty: number;
  counted_qty: number;
  delta: number;
  proposed_reason: string | null;
  reconcile_action?: 'adjust_only' | 'loss' | 'unrecorded_sale';
  reconcile_notes?: string | null;
  source: string;
  updated_at: string;
  products?: {
    name: string;
    sku: string | null;
    barcode: string | null;
    thumbnail_image: string | null;
    stock_quantity: number | null;
  } | null;
};

type DashboardStats = {
  by_status?: Record<string, number>;
  total_deviation?: number;
  items_count?: number;
};

// --- Theme Styles (Restored & Refined) ---
const STATUS_STYLES: Record<string, string> = {
  in_progress: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  approved: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  draft: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  rejected: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
};

// --- Sound Utility ---
const playFeedbackSound = (type: 'success' | 'error' | 'warning') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) { }
};

const POSStocktake: React.FC = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const perms = useUnifiedPermissions();

  // Data
  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [variantNames, setVariantNames] = useState<Record<string, string>>({});
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lastScannedItem, setLastScannedItem] = useState<StocktakeItem | null>(null);

  // UI
  const [activeView, setActiveView] = useState<'hub' | 'workspace' | 'review'>('hub');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('stocktake_sound') !== 'false');

  // Forms
  const [newSessionScope, setNewSessionScope] = useState('');
  const [newSessionMode, setNewSessionMode] = useState<'cycle' | 'full' | 'blind'>('cycle');
  const [startingSession, setStartingSession] = useState(false);

  // Edit
  const [editingItem, setEditingItem] = useState<StocktakeItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editReason, setEditReason] = useState('unknown');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [reconcileNotesDraft, setReconcileNotesDraft] = useState<Record<string, string>>({});

  // Delete session
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<StocktakeSession | null>(null);

  // Reset item
  const [resetOpen, setResetOpen] = useState(false);
  const [itemToReset, setItemToReset] = useState<StocktakeItem | null>(null);

  // List performance
  const [showAllItems, setShowAllItems] = useState(false);

  // Scanning
  const [scanInput, setScanInput] = useState('');
  const [processingScan, setProcessingScan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Layout
  const [layoutState, setLayoutState] = useState<POSLayoutState>({ connectionStatus: 'connected', isRefreshing: false });

  useTitle('الجرد الذكي');

  const canStart = !perms.ready
    ? true
    : perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin || perms.anyOf(['startStocktake', 'manageInventory']);
  const canScan = !perms.ready
    ? true
    : perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin || perms.anyOf(['performStocktake', 'manageInventory']);
  const canReview = !perms.ready
    ? true
    : perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin || perms.anyOf(['reviewStocktake', 'manageInventory']);
  const canApprove = !perms.ready
    ? true
    : perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin || perms.anyOf(['approveStocktake', 'manageInventory']);
  const canDelete = !perms.ready
    ? true
    : perms.isAdminMode || perms.isOrgAdmin || perms.isSuperAdmin || perms.anyOf(['deleteStocktake', 'manageInventory']);

  // --- Persistence ---
  useEffect(() => localStorage.setItem('stocktake_sound', soundEnabled.toString()), [soundEnabled]);

  // --- Logic ---
  const fetchData = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setLayoutState(p => ({ ...p, isRefreshing: true }));
    try {
      const [sess, dash] = await Promise.all([
        getStocktakeSessionsLocal(currentOrganization.id, 20),
        getStocktakeDashboardLocal(currentOrganization.id),
      ]);
      setSessions((sess as any) || []);
      setStats((dash as any) || null);
    } catch (e) { console.error(e); }
    finally { setLayoutState(p => ({ ...p, isRefreshing: false })); }
  }, [currentOrganization?.id]);

  useEffect(() => { fetchData() }, [fetchData]);

  const loadItems = useCallback(async (sessionId: string) => {
    const itemsData = await loadStocktakeItemsLocal(sessionId, 100);
    setItems((itemsData as any) || []);

    const newNames: Record<string, string> = {};
    (itemsData || []).forEach(i => {
      const p = Array.isArray((i as any).products) ? (i as any).products[0] : (i as any).products;
      if (p?.name) newNames[(i as any).product_id] = p.name;
    });
    if (Object.keys(newNames).length > 0) setProductNames(prev => ({ ...prev, ...newNames }));

    const vIds = [...new Set((itemsData || []).map(i => (i as any).variant_id).filter(Boolean))] as string[];
    if (vIds.length > 0) {
      const placeholders = vIds.map(() => '?').join(',');
      const [colors, sizes] = await Promise.all([
        powerSyncService.query<any>({
          sql: `SELECT id, name FROM product_colors WHERE id IN (${placeholders})`,
          params: vIds,
          throwOnError: false,
        }),
        powerSyncService.query<any>({
          sql: `SELECT id, size_name FROM product_sizes WHERE id IN (${placeholders})`,
          params: vIds,
          throwOnError: false,
        }),
      ]);
      const m: Record<string, string> = {};
      (colors || []).forEach((x: any) => (m[x.id] = `لون: ${x.name}`));
      (sizes || []).forEach((x: any) => (m[x.id] = `مقاس: ${x.size_name}`));
      setVariantNames(m);
    }
  }, []);

  useEffect(() => { if (selectedSessionId) loadItems(selectedSessionId); }, [selectedSessionId, loadItems]);

  const handleStartSession = async () => {
    if (!currentOrganization?.id) return;
    if (!canStart) {
      toast({ title: 'ليس لديك صلاحية لفتح جلسة', variant: 'destructive', duration: 1500 });
      return;
    }
    setStartingSession(true);
    try {
      const s = await startStocktakeSessionLocal({
        organizationId: currentOrganization.id,
        scope: newSessionScope ? { area: newSessionScope } : {},
        mode: newSessionMode,
        requireApproval: true,
      });
      setSessions(p => [s, ...p]);
      setNewSessionScope('');
      setSelectedSessionId(s.id);
      setActiveView('workspace');
      toast({ title: 'تم فتح الجلسة' });
    } catch (e) { toast({ title: 'خطأ', variant: 'destructive' }); }
    finally { setStartingSession(false); }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    if (!canDelete) {
      toast({ title: 'ليس لديك صلاحية حذف الجلسة', variant: 'destructive', duration: 1500 });
      return;
    }
    try {
      const ok = await deleteStocktakeSessionLocal(currentOrganization!.id, sessionToDelete.id);
      if (ok) {
        toast({ title: 'تم حذف الجلسة' });
        if (selectedSessionId === sessionToDelete.id) {
          setSelectedSessionId(null);
          setItems([]);
          setActiveView('hub');
        }
        await fetchData();
      } else {
        toast({ title: 'لم يتم حذف الجلسة', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'فشل حذف الجلسة', description: e?.message, variant: 'destructive' });
    }
  };

  const handleScan = async (rawValue?: string) => {
    if (!selectedSessionId) {
      toast({ title: 'اختر جلسة أولاً', variant: 'destructive', duration: 1200 });
      return;
    }
    if (!canScan) {
      toast({ title: 'ليس لديك صلاحية للمسح', variant: 'destructive', duration: 1200 });
      return;
    }
    const term = (rawValue ?? scanInput).replace(/[\r\n\t]/g, '').trim();
    if (!term || isSubmittingRef.current || processingScan) return;
    isSubmittingRef.current = true;
    setProcessingScan(true);

    try {
      const item = await recordStocktakeScanLocal({
        organizationId: currentOrganization!.id,
        sessionId: selectedSessionId,
        barcodeOrSku: term,
        source: 'barcode',
        delta: 1,
      });

      if (!item) {
        if (soundEnabled) playFeedbackSound('error');
        toast({ title: 'غير موجود', description: term, variant: 'destructive', duration: 1500 });
      } else {
        const enriched = item as any as StocktakeItem;
        const p = Array.isArray(enriched.products) ? enriched.products[0] : enriched.products;
        if (p?.name) setProductNames(prev => ({ ...prev, [enriched.product_id]: p.name }));
        setItems(prev => [enriched, ...prev.filter(x => x.id !== enriched.id)]);
        setLastScannedItem(enriched);
        if (soundEnabled) playFeedbackSound('success');
      }
      setScanInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) { console.error(e); }
    finally {
      setProcessingScan(false);
      setTimeout(() => isSubmittingRef.current = false, 400);
    }
  };

  // Global Keytrap
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (activeView === 'workspace' && selectedSessionId && !['INPUT', 'TEXTAREA'].includes((e.target as any).tagName)) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeView, selectedSessionId]);

  // Auto Submit
  useEffect(() => {
    if (!scanInput.trim()) return;
    const t = setTimeout(() => { if (scanInput.length > 2) handleScan(scanInput); }, 350);
    return () => clearTimeout(t);
  }, [scanInput]);

  // View Helpers
  const getItemName = (item: StocktakeItem) => {
    const p = Array.isArray(item.products) ? item.products[0] : item.products;
    return p?.name || productNames[item.product_id] || 'Loading...';
  };
  const getItemBarcode = (item: StocktakeItem) => {
    const p = Array.isArray(item.products) ? item.products[0] : item.products;
    return p?.barcode || p?.sku || '---';
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId);

  const displayedItems = showAllItems ? items : items.slice(0, 200);
  const listParentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: displayedItems.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 76,
    overscan: 8,
  });

  return (
    <POSPureLayout onRefresh={fetchData} isRefreshing={layoutState.isRefreshing} connectionStatus={layoutState.connectionStatus}>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col" dir="rtl">

        {/* HEADER */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {activeView !== 'hub' && (
              <Button variant="ghost" size="icon" onClick={() => setActiveView('hub')}>
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold">الجرد</h1>
                {activeView !== 'hub' && (
                  <>
                    <Badge variant="secondary" className="h-5 text-[10px]">محلي</Badge>
                    {currentSession && <Badge variant="outline" className={cn("h-5 text-[10px] border", STATUS_STYLES[currentSession.status])}>{currentSession.status}</Badge>}
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {activeView === 'hub' ? 'إدارة جلسات الجرد' : (currentSession?.scope?.area || 'جلسة نشطة')}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn("text-muted-foreground", soundEnabled && "text-emerald-500 bg-emerald-500/10")}>
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>

        {/* HUB VIEW */}
        {activeView === 'hub' && (
          <div className="p-6 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-primary/10 text-primary rounded-full"><Package className="h-5 w-5" /></div><div><div className="text-2xl font-bold">{stats.items_count || 0}</div><div className="text-xs text-muted-foreground">عنصر</div></div></CardContent></Card>
                <Card className="bg-card border-border"><CardContent className="p-4 flex items-center gap-3"><div className="p-2 bg-amber-500/10 text-amber-500 rounded-full"><AlertTriangle className="h-5 w-5" /></div><div><div className="text-2xl font-bold">{stats.total_deviation || 0}</div><div className="text-xs text-muted-foreground">فارق</div></div></CardContent></Card>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card className="bg-gradient-to-br from-card to-background border-border shadow-md">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-center mb-4"><div className="p-4 bg-primary/5 rounded-full"><ScanBarcode className="h-8 w-8 text-primary" /></div></div>
                    <h3 className="text-center font-bold text-lg">جلسة جديدة</h3>
                    <Input placeholder="نطاق الجرد (مثال: مستودع أ)" className="bg-background" value={newSessionScope} onChange={e => setNewSessionScope(e.target.value)} />
                    <div className="flex gap-2">
                      {['cycle', 'full', 'blind'].map(m => (
                        <div key={m} onClick={() => setNewSessionMode(m as any)} className={cn("flex-1 text-center py-2 text-xs rounded border cursor-pointer", newSessionMode === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                          {m === 'cycle' ? 'دوري' : m === 'full' ? 'شامل' : 'أعمى'}
                        </div>
                      ))}
                    </div>
                    <Button className="w-full font-bold" onClick={handleStartSession} disabled={startingSession}>
                      {startingSession ? <Activity className="animate-spin" /> : 'إنشاء وبدء'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-muted-foreground text-sm flex items-center gap-2"><History className="h-4 w-4" /> الجلسات السابقة</h3>
                <div className="grid gap-3">
                  {sessions.map(s => (
                    <div key={s.id} onClick={() => { setSelectedSessionId(s.id); setActiveView(s.status === 'review' ? 'review' : 'workspace'); }}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/40 cursor-pointer transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-2 h-2 rounded-full", s.status === 'in_progress' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
                        <div>
                          <div className="font-bold">{s.scope?.area || 'جلسة عامة'}</div>
                          <div className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("border", STATUS_STYLES[s.status])}>{s.status}</Badge>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(s);
                              setDeleteOpen(true);
                            }}
                            aria-label="حذف الجلسة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE VIEW */}
        {activeView === 'workspace' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden md:overflow-visible">
            <div className="flex-1 flex flex-col min-w-0 bg-muted/5 p-3 md:p-4 gap-4">
              {/* Scan bar */}
              <div className="max-w-4xl mx-auto w-full">
                <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{currentSession?.scope?.area || 'جلسة نشطة'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {navigator.onLine ? 'متصل' : 'غير متصل'} • محلي 100%
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {currentSession && <Badge variant="outline" className={cn("border h-6", STATUS_STYLES[currentSession.status])}>{currentSession.status}</Badge>}
                      {currentSession && <Badge variant="secondary" className="h-6 text-[10px]">{currentSession.mode}</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border border-border rounded-lg p-2 focus-within:ring-2 ring-primary/20 transition-all">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <ScanBarcode className="h-5 w-5" />
                    </div>
                    <Input
                      ref={inputRef}
                      value={scanInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/[\r\n\t]/.test(v)) {
                          const cleaned = v.replace(/[\r\n\t]/g, '');
                          setScanInput('');
                          if (cleaned.trim()) handleScan(cleaned);
                          return;
                        }
                        setScanInput(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScan();
                        }
                      }}
                      onBlur={() => {
                        if (activeView === 'workspace') setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="h-10 text-base font-mono"
                      placeholder="امسح الباركود هنا..."
                      autoFocus
                    />
                    <Button
                      onClick={() => handleScan()}
                      className="h-10 px-4 rounded-lg font-semibold"
                      disabled={!canScan || processingScan}
                    >
                      {processingScan ? '...' : 'مسح'}
                    </Button>
                  </div>

                  <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1"><Keyboard className="h-3 w-3" /> Enter للتأكيد (يدعم ماسح USB)</span>
                    <span className="font-mono">{processingScan ? '...' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Scan list */}
              <div className="max-w-4xl mx-auto w-full flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                  <span className="font-semibold text-sm">عناصر الجلسة</span>
                  <div className="flex items-center gap-3">
                    {items.length > 200 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setShowAllItems(v => !v)}
                      >
                        {showAllItems ? 'آخر 200' : 'عرض الكل'}
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">{items.length}</span>
                  </div>
                </div>

                <div ref={listParentRef} className={cn("flex-1 overflow-y-auto p-2", !showAllItems && "space-y-1")}>
                  {showAllItems ? (
                    <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                      {rowVirtualizer.getVirtualItems().map(vRow => {
                        const item = displayedItems[vRow.index];
                        const isLast = lastScannedItem?.id === item?.id;
                        const p = item ? (Array.isArray(item.products) ? item.products[0] : item.products) : null;

                        if (!item) return null;

                        return (
                          <div
                            key={item.id}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${vRow.start}px)`,
                            }}
                            className="pb-1"
                          >
                            <div
                              className={cn(
                                "flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors",
                                isLast ? "bg-emerald-500/5 border-emerald-500/20" : "bg-background border-border hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                <div className="h-10 w-10 rounded-lg border border-border bg-muted overflow-hidden shrink-0">
                                  {p?.thumbnail_image ? (
                                    <img src={p.thumbnail_image} alt="" className="h-full w-full object-cover" loading="lazy" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                      <Package className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="font-medium truncate">{getItemName(item)}</div>
                                    {item.variant_id && (
                                      <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                        {variantNames[item.variant_id] || 'Variant'}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-mono truncate">{getItemBarcode(item)}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <div className="font-mono font-bold text-lg leading-5">{item.counted_qty}</div>
                                  <div className="text-[10px] text-muted-foreground leading-4">مسحات {item.scan_count ?? 0}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                  onClick={() => {
                                    setItemToReset(item);
                                    setResetOpen(true);
                                  }}
                                  aria-label="إعادة ضبط العد"
                                  title="إعادة ضبط العد"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setEditQty(item.counted_qty.toString());
                                    setEditReason(item.proposed_reason || 'unknown');
                                  }}
                                  aria-label="تعديل"
                                  title="تعديل"
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    displayedItems.map(item => {
                      const isLast = lastScannedItem?.id === item.id;
                      const p = Array.isArray(item.products) ? item.products[0] : item.products;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors",
                            isLast ? "bg-emerald-500/5 border-emerald-500/20" : "bg-background border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-3 overflow-hidden min-w-0">
                            <div className="h-10 w-10 rounded-lg border border-border bg-muted overflow-hidden shrink-0">
                              {p?.thumbnail_image ? (
                                <img src={p.thumbnail_image} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="font-medium truncate">{getItemName(item)}</div>
                                {item.variant_id && (
                                  <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                    {variantNames[item.variant_id] || 'Variant'}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate">{getItemBarcode(item)}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="font-mono font-bold text-lg leading-5">{item.counted_qty}</div>
                              <div className="text-[10px] text-muted-foreground leading-4">مسحات {item.scan_count ?? 0}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                              onClick={() => {
                                setItemToReset(item);
                                setResetOpen(true);
                              }}
                              aria-label="إعادة ضبط العد"
                              title="إعادة ضبط العد"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => {
                                setEditingItem(item);
                                setEditQty(item.counted_qty.toString());
                                setEditReason(item.proposed_reason || 'unknown');
                              }}
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar / Tools */}
            <div className="w-full md:w-72 bg-card border-r border-border p-3 md:p-4 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] md:sticky md:top-16 md:self-start rounded-none">
              <div className="flex md:flex-col gap-3 md:gap-4">
                <Card className="bg-muted/30 border-0 flex-1">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">العناصر</div>
                    <div className="text-2xl font-bold font-mono">{items.length}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-1">{navigator.onLine ? 'متصل' : 'غير متصل'} • محلي</div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30 border-0 flex-1">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">آخر مسح</div>
                    <div className="text-sm font-semibold truncate">{lastScannedItem ? getItemName(lastScannedItem) : '--'}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">{lastScannedItem ? getItemBarcode(lastScannedItem) : ''}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-3 md:mt-4">
                <Button className="w-full font-semibold" disabled={!canReview} onClick={async () => {
                  if (confirm('إنهاء الجلسة؟')) {
                    await closeStocktakeSessionLocal(currentOrganization!.id, selectedSessionId!);
                    await fetchData();
                    setActiveView('review');
                  }
                }}>إنهاء للمراجعة</Button>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW VIEW */}
        {activeView === 'review' && (
          <div className="p-6 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">المراجعة والاعتماد</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveView('workspace')}>عودة للمسح</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!canApprove} onClick={async () => {
                  try {
                    const res = await approveStocktakeOfflineFirst({
                      organizationId: currentOrganization!.id,
                      sessionId: selectedSessionId!,
                    });
                    if (!res.ok) {
                      toast({ title: 'فشل الاعتماد', description: res.error, variant: 'destructive' });
                      return;
                    }

                    toast({
                      title: 'تم الاعتماد محلياً',
                      description: navigator.onLine
                        ? 'جاري المزامنة تلقائياً...'
                        : 'سيتم المزامنة تلقائياً عند رجوع الإنترنت',
                    });
                    await fetchData();
                    setActiveView('hub');
                  } catch (e) { toast({ title: 'فشل الاعتماد', variant: 'destructive' }); }
                }}>اعتماد التغييرات</Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                العناصر ذات الفروقات: <span className="font-semibold text-foreground">{items.filter(i => i.delta !== 0).length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedSessionId}
                  onClick={async () => {
                    await setStocktakeSessionReconcileForShortagesLocal({
                      organizationId: currentOrganization!.id,
                      sessionId: selectedSessionId!,
                      action: 'adjust_only',
                    });
                    await loadItems(selectedSessionId!);
                    toast({ title: 'تم التعيين', description: 'تم ضبط كل النقص على: تصحيح فقط' });
                  }}
                >النقص: تصحيح فقط</Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedSessionId}
                  onClick={async () => {
                    await setStocktakeSessionReconcileForShortagesLocal({
                      organizationId: currentOrganization!.id,
                      sessionId: selectedSessionId!,
                      action: 'loss',
                    });
                    await loadItems(selectedSessionId!);
                    toast({ title: 'تم التعيين', description: 'تم ضبط كل النقص على: خسارة' });
                  }}
                >النقص: خسارة</Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedSessionId}
                  onClick={async () => {
                    await setStocktakeSessionReconcileForShortagesLocal({
                      organizationId: currentOrganization!.id,
                      sessionId: selectedSessionId!,
                      action: 'unrecorded_sale',
                    });
                    await loadItems(selectedSessionId!);
                    toast({ title: 'تم التعيين', description: 'تم ضبط كل النقص على: بيع غير مسجّل' });
                  }}
                >النقص: بيع غير مسجّل</Button>
              </div>
            </div>

            <Card className="border-border overflow-hidden">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted text-muted-foreground font-medium">
                  <tr>
                    <th className="px-6 py-3">المنتج</th>
                    <th className="px-6 py-3 text-center">المتوقع</th>
                    <th className="px-6 py-3 text-center">المجرود</th>
                    <th className="px-6 py-3 text-center">الفارق</th>
                    <th className="px-6 py-3">القرار</th>
                    <th className="px-6 py-3">ملاحظة</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.filter(i => i.delta !== 0).map(item => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3 font-medium">{getItemName(item)} <div className="text-xs text-muted-foreground font-mono">{getItemBarcode(item)}</div></td>
                      <td className="px-6 py-3 text-center text-muted-foreground">{item.expected_qty}</td>
                      <td className="px-6 py-3 text-center font-bold bg-muted/10">{item.counted_qty}</td>
                      <td className="px-6 py-3 text-center"><Badge variant="outline" className={item.delta > 0 ? "text-amber-500 border-amber-500" : "text-rose-500 border-rose-500"}>{item.delta > 0 ? `+${item.delta}` : item.delta}</Badge></td>
                      <td className="px-6 py-3">
                        <Select
                          value={(item.delta > 0 ? 'adjust_only' : (item.reconcile_action || 'adjust_only'))}
                          onValueChange={async (v) => {
                            if (item.delta > 0) return;
                            const u = await setStocktakeItemReconcileLocal({
                              organizationId: currentOrganization!.id,
                              itemId: item.id,
                              action: v as any,
                              notes: item.reconcile_notes ?? null,
                            });
                            if (u) setItems(p => p.map(i => i.id === u.id ? (u as any) : i));
                          }}
                          disabled={item.delta > 0}
                        >
                          <SelectTrigger className="h-9 w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="adjust_only">تصحيح فقط</SelectItem>
                            <SelectItem value="loss">خسارة</SelectItem>
                            <SelectItem value="unrecorded_sale">بيع غير مسجّل</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-3">
                        <Input
                          value={reconcileNotesDraft[item.id] ?? item.reconcile_notes ?? ''}
                          onChange={(e) => setReconcileNotesDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                          onBlur={async () => {
                            const draft = reconcileNotesDraft[item.id];
                            if (draft === undefined) return;
                            const u = await setStocktakeItemReconcileLocal({
                              organizationId: currentOrganization!.id,
                              itemId: item.id,
                              action: (item.delta > 0 ? 'adjust_only' : (item.reconcile_action || 'adjust_only')) as any,
                              notes: draft || null,
                            });
                            setReconcileNotesDraft(prev => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                            if (u) setItems(p => p.map(i => i.id === u.id ? (u as any) : i));
                          }}
                          placeholder="اختياري..."
                          className="h-9 text-sm"
                        />
                      </td>
                      <td className="px-6 py-3"><Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setEditQty(item.counted_qty.toString()); setEditReason(item.proposed_reason || 'unknown') }}>تعديل</Button></td>
                    </tr>
                  ))}
                  {items.filter(i => i.delta !== 0).length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">لا توجد فروقات</td></tr>}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        <ConfirmDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeleteSession}
          title="حذف جلسة الجرد"
          description={
            <div className="space-y-1">
              <div>سيتم حذف الجلسة وكل عناصرها نهائياً.</div>
              <div className="text-xs text-muted-foreground">
                {sessionToDelete?.scope?.area || 'جلسة عامة'} • {sessionToDelete ? new Date(sessionToDelete.started_at).toLocaleString('ar-DZ') : ''}
              </div>
            </div>
          }
          confirmText="حذف"
          cancelText="إلغاء"
          variant="destructive"
        />

        <ConfirmDialog
          open={resetOpen}
          onClose={() => {
            setResetOpen(false);
            setItemToReset(null);
          }}
          onConfirm={async () => {
            if (!itemToReset || !currentOrganization?.id) return;
            try {
              const u = await resetLocalStocktakeItem({
                organizationId: currentOrganization.id,
                itemId: itemToReset.id,
              });
              if (u) setItems(p => p.map(i => i.id === u.id ? (u as any) : i));
              toast({ title: 'تمت إعادة الضبط' });
            } catch (e: any) {
              toast({ title: 'فشل إعادة الضبط', description: e?.message, variant: 'destructive' });
            } finally {
              setResetOpen(false);
              setItemToReset(null);
            }
          }}
          title="إعادة ضبط العد"
          description={
            <div className="space-y-1">
              <div>سيتم تصفير العدد والمسحات لهذا العنصر.</div>
              <div className="text-xs text-muted-foreground">{itemToReset ? getItemName(itemToReset) : ''}</div>
            </div>
          }
          confirmText="تصفير"
          cancelText="إلغاء"
          variant="default"
        />

        {/* EDIT DIALOG */}
        <Dialog open={!!editingItem} onOpenChange={o => !o && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>تعديل الكمية</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center p-3 bg-muted rounded border border-border">{editingItem && getItemName(editingItem)}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>العدد الفعلي</Label><Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} className="text-center font-bold text-lg" autoFocus /></div>
                <div className="space-y-1"><Label>السبب</Label><Select value={editReason} onValueChange={setEditReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">غير محدد</SelectItem><SelectItem value="damage">تالف</SelectItem><SelectItem value="expiry">منتهي الصلاحية</SelectItem></SelectContent></Select></div>
              </div>
            </div>
            <DialogFooter><Button onClick={async () => {
              if (!editingItem) return;
              setIsSavingEdit(true);
              try {
                const u = await setStocktakeItemCountLocal({
                  organizationId: currentOrganization!.id,
                  itemId: editingItem.id,
                  countedQty: Number(editQty),
                  proposedReason: editReason || null,
                });
                if (u) setItems(p => p.map(i => i.id === u.id ? (u as any) : i));
                setEditingItem(null);
              } catch (e) { toast({ title: 'Error' }); } finally { setIsSavingEdit(false); }
            }}>حفظ</Button></DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </POSPureLayout>
  );
};

export default POSStocktake;
