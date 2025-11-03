import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { POSSharedLayoutControls, POSLayoutState } from '@/components/pos-layout/types';
import { useTenant } from '@/context/TenantContext';
import { listBlockedCustomers, blockCustomer, unblockCustomerById, BlockedCustomer } from '@/lib/api/blocked-customers';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Ban, Plus, Trash2, Loader2, Search } from 'lucide-react';
import DataReadyWrapper from '@/components/common/DataReadyWrapper';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';

interface BlockedCustomersProps extends POSSharedLayoutControls {}

const BlockedCustomers: React.FC<BlockedCustomersProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;
  const perms = usePermissions();
  const { showSuccess, showError } = useToastNotifications();

  const [query, setQuery] = useState('');
  const debouncedQuery = useSearchDebounce(query, 300);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BlockedCustomer[]>([]);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  const [openAdd, setOpenAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const rows = await listBlockedCustomers(orgId, { search: debouncedQuery, limit, offset: page * limit });
      setItems(rows);
    } catch (e: any) {
      showError('فشل تحميل قائمة المحظورين');
    } finally {
      setLoading(false);
    }
  }, [orgId, debouncedQuery, page, limit, showError]);

  useEffect(() => { load(); }, [load]);

  const canManage = perms.ready ? perms.anyOf(['manageCustomers']) : false;

  const handleAdd = async () => {
    if (!canManage) {
      showError('ليس لديك صلاحية لإضافة محظورين');
      return;
    }
    if (!orgId || !newPhone) return;
    setSaving(true);
    try {
      await blockCustomer(orgId, newPhone, newName || null, newReason || null);
      showSuccess('تم حظر العميل بنجاح');
      setOpenAdd(false);
      setNewName(''); setNewPhone(''); setNewReason('');
      load();
    } catch (e: any) {
      showError('فشل حظر العميل');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (id: string) => {
    if (!canManage) {
      showError('ليس لديك صلاحية لإلغاء الحظر');
      return;
    }
    if (!orgId) return;
    try {
      await unblockCustomerById(orgId, id);
      showSuccess('تم إلغاء الحظر');
      load();
    } catch (e: any) {
      showError('فشل إلغاء الحظر');
    }
  };

  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  const canView = perms.ready ? perms.anyOf(['viewOrders']) : false;

  if (perms.ready && !canView) {
    const node = (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>غير مصرح</AlertTitle>
          <AlertDescription>لا تملك صلاحية الوصول إلى قائمة المحظورين.</AlertDescription>
        </Alert>
      </div>
    );
    return renderWithLayout(node);
  }

  const pageContent = (
    <>
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Ban className="h-5 w-5"/> قائمة المحظورين</h1>
        {canManage && (
          <Button onClick={() => setOpenAdd(true)} className="gap-2"><Plus className="h-4 w-4"/> إضافة محظور</Button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالهاتف أو الإسم" className="pr-9" />
        </div>
      </div>

      <DataReadyWrapper isReady={!loading} fallback={<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> جاري التحميل...</div>}>
        <div className="border rounded-lg overflow-hidden bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">السبب</TableHead>
                <TableHead className="text-right">تاريخ الإضافة</TableHead>
                <TableHead className="text-right w-[120px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name || '-'}</TableCell>
                  <TableCell dir="ltr">{row.phone_raw || row.phone_normalized}</TableCell>
                  <TableCell className="max-w-[320px] truncate" title={row.reason || ''}>{row.reason || '-'}</TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {canManage && (
                      <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleUnblock(row.id)}>
                        <Trash2 className="h-4 w-4"/> إلغاء الحظر
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد نتائج</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DataReadyWrapper>

      <AlertDialog open={openAdd} onOpenChange={setOpenAdd}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إضافة عميل إلى قائمة الحظر</AlertDialogTitle>
            <AlertDialogDescription>
              سيمنع هذا الإجراء العميل من تقديم طلبات جديدة برقم الهاتف نفسه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Input placeholder="الاسم (اختياري)" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="رقم الهاتف" value={newPhone} onChange={e => setNewPhone(e.target.value)} dir="ltr" />
            <Input placeholder="السبب (اختياري)" value={newReason} onChange={e => setNewReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={saving || !newPhone} onClick={handleAdd} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Ban className="h-4 w-4"/>}
              إضافة إلى الحظر
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );

  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(() => load());
      return () => onRegisterRefresh(null);
    }
  }, [onRegisterRefresh, load]);

  useEffect(() => {
    const state: POSLayoutState = {
      isRefreshing: Boolean(loading),
      connectionStatus: null, // stays as previous in layout
      executionTime: undefined
    } as any;
    if (onLayoutStateChange) onLayoutStateChange(state);
  }, [onLayoutStateChange, loading]);

  return renderWithLayout(pageContent);
};

export default BlockedCustomers;
