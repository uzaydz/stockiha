/**
 * Customers - صفحة إدارة العملاء
 * ============================================================
 * Apple-Inspired Design - Same as POSOrdersOptimized
 * Uses PowerSync Reactive Hooks for real-time updates
 * ============================================================
 */

import React, { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Users,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

// Layout component
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

// Context
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

// Services
import { powerSyncService } from '@/lib/powersync';

// PowerSync Reactive Hooks
import { useQuery } from '@powersync/react';

// Types
import type { Customer } from '@/types/customer';

// Components
import { CustomerStatsSimple, type CustomerStatsData } from '@/components/customers/CustomerStatsSimple';
import { CustomerFiltersOptimized, type CustomerFilters } from '@/components/customers/CustomerFiltersOptimized';
import { CustomersTableSimple } from '@/components/customers/CustomersTableSimple';

// Lazy imports
const AddCustomerDialog = React.lazy(() => import('@/components/customers/AddCustomerDialog'));
const EditCustomerDialog = React.lazy(() => import('@/components/customers/EditCustomerDialog'));

// Hooks
import { useTitle } from '@/hooks/useTitle';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDebounce } from '@/hooks/useDebounce';

// ===============================================================================
// Types
// ===============================================================================

interface CustomersProps extends POSSharedLayoutControls {}

interface DialogState {
  selectedCustomer: Customer | null;
  showAddCustomer: boolean;
  showEditCustomer: boolean;
  showDeleteConfirm: boolean;
  showCustomerDetails: boolean;
}

// ===============================================================================
// Main Component
// ===============================================================================

const Customers: React.FC<CustomersProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange,
}) => {
  useTitle('العملاء');

  const { currentOrganization } = useTenant();
  const { user, userProfile } = useAuth();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { isOffline } = useOfflineStatus();

  // Local State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState<CustomerFilters>({
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [dialogState, setDialogState] = useState<DialogState>({
    selectedCustomer: null,
    showAddCustomer: false,
    showEditCustomer: false,
    showDeleteConfirm: false,
    showCustomerDetails: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const debouncedSearch = useDebounce(filters.search || '', 300);

  // Permissions
  const canViewCustomers = perms.ready ? perms.anyOf(['viewCustomers', 'manageCustomers', 'accessPOS']) : false;
  const canAddCustomer = perms.ready ? perms.anyOf(['addCustomers', 'manageCustomers']) : false;
  const canEditCustomer = perms.ready ? perms.anyOf(['editCustomers', 'manageCustomers']) : false;
  const canDeleteCustomer = perms.ready ? perms.anyOf(['deleteCustomers', 'manageCustomers']) : false;
  const isUnauthorized = perms.ready && !canViewCustomers;

  const orgId = currentOrganization?.id || '';

  // ===============================================================================
  // PowerSync Reactive Queries
  // ===============================================================================

  // Main customers query
  const customersQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM customers WHERE organization_id = ?`;
    const params: any[] = [orgId];

    // Search filter
    if (debouncedSearch && debouncedSearch.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${debouncedSearch}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Date filter
    if (filters.date_from) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(filters.date_to);
    }

    // Has phone filter
    if (filters.hasPhone) {
      query += ` AND phone IS NOT NULL AND phone != ''`;
    }

    // Has email filter
    if (filters.hasEmail) {
      query += ` AND email IS NOT NULL AND email != ''`;
    }

    // Sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Pagination
    const offset = (currentPage - 1) * pageSize;
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    return { sql: query, params };
  }, [orgId, debouncedSearch, filters, currentPage, pageSize]);

  const { data: rawCustomers, isLoading, isFetching, error } = useQuery<any>(
    customersQuery.sql,
    customersQuery.params
  );

  // Count query
  const countQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    let query = `SELECT COUNT(*) as count FROM customers WHERE organization_id = ?`;
    const params: any[] = [orgId];

    if (debouncedSearch && debouncedSearch.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${debouncedSearch}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.date_from) {
      query += ` AND DATE(created_at) >= ?`;
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ` AND DATE(created_at) <= ?`;
      params.push(filters.date_to);
    }

    if (filters.hasPhone) {
      query += ` AND phone IS NOT NULL AND phone != ''`;
    }

    if (filters.hasEmail) {
      query += ` AND email IS NOT NULL AND email != ''`;
    }

    return { sql: query, params };
  }, [orgId, debouncedSearch, filters]);

  const { data: countData } = useQuery<{ count: number }>(countQuery.sql, countQuery.params);

  // Stats queries
  const totalCountQuery = useMemo(() => {
    if (!orgId) return { sql: 'SELECT 0 as count', params: [] };
    return {
      sql: 'SELECT COUNT(*) as count FROM customers WHERE organization_id = ?',
      params: [orgId]
    };
  }, [orgId]);

  const { data: totalCountData } = useQuery<{ count: number }>(totalCountQuery.sql, totalCountQuery.params);

  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  const newCustomersQuery = useMemo(() => {
    if (!orgId) return { sql: 'SELECT 0 as count', params: [] };
    return {
      sql: `SELECT COUNT(*) as count FROM customers WHERE organization_id = ? AND DATE(created_at) >= ?`,
      params: [orgId, thirtyDaysAgo]
    };
  }, [orgId, thirtyDaysAgo]);

  const { data: newCustomersData } = useQuery<{ count: number }>(newCustomersQuery.sql, newCustomersQuery.params);

  const todayCustomersQuery = useMemo(() => {
    if (!orgId) return { sql: 'SELECT 0 as count', params: [] };
    return {
      sql: `SELECT COUNT(*) as count FROM customers WHERE organization_id = ? AND DATE(created_at) = ?`,
      params: [orgId, today]
    };
  }, [orgId, today]);

  const { data: todayCustomersData } = useQuery<{ count: number }>(todayCustomersQuery.sql, todayCustomersQuery.params);

  const withPhoneQuery = useMemo(() => {
    if (!orgId) return { sql: 'SELECT 0 as count', params: [] };
    return {
      sql: `SELECT COUNT(*) as count FROM customers WHERE organization_id = ? AND phone IS NOT NULL AND phone != ''`,
      params: [orgId]
    };
  }, [orgId]);

  const { data: withPhoneData } = useQuery<{ count: number }>(withPhoneQuery.sql, withPhoneQuery.params);

  const withEmailQuery = useMemo(() => {
    if (!orgId) return { sql: 'SELECT 0 as count', params: [] };
    return {
      sql: `SELECT COUNT(*) as count FROM customers WHERE organization_id = ? AND email IS NOT NULL AND email != ''`,
      params: [orgId]
    };
  }, [orgId]);

  const { data: withEmailData } = useQuery<{ count: number }>(withEmailQuery.sql, withEmailQuery.params);

  // Transform customers data
  const customers: Customer[] = useMemo(() => {
    if (!rawCustomers) return [];
    return rawCustomers.map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      phone: c.phone || null,
      organization_id: c.organization_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      nif: c.nif ?? null,
      rc: c.rc ?? null,
      nis: c.nis ?? null,
      rib: c.rib ?? null,
      address: c.address ?? null,
    }));
  }, [rawCustomers]);

  const total = countData?.[0]?.count ? Number(countData[0].count) : 0;
  const totalPages = Math.ceil(total / pageSize);

  // Stats
  const stats: CustomerStatsData = useMemo(() => ({
    total: totalCountData?.[0]?.count ? Number(totalCountData[0].count) : 0,
    newLast30Days: newCustomersData?.[0]?.count ? Number(newCustomersData[0].count) : 0,
    activeLast30Days: newCustomersData?.[0]?.count ? Number(newCustomersData[0].count) : 0,
    withPhone: withPhoneData?.[0]?.count ? Number(withPhoneData[0].count) : 0,
    withEmail: withEmailData?.[0]?.count ? Number(withEmailData[0].count) : 0,
    todayNew: todayCustomersData?.[0]?.count ? Number(todayCustomersData[0].count) : 0,
  }), [totalCountData, newCustomersData, withPhoneData, withEmailData, todayCustomersData]);

  // ===============================================================================
  // Handlers
  // ===============================================================================

  const handleRefresh = useCallback(async () => {
    if (!isOnline || !orgId) return;

    setIsSyncing(true);
    try {
      await powerSyncService.forceSync();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم تحديث البيانات بنجاح');
    } catch (err) {
      console.warn('[Customers] forceSync error:', err);
      toast.error('فشل في تحديث البيانات');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, orgId, queryClient]);

  useEffect(() => {
    if (isUnauthorized || !onRegisterRefresh) return;
    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [handleRefresh, onRegisterRefresh, isUnauthorized]);

  useEffect(() => {
    if (isUnauthorized || !onLayoutStateChange) return;
    onLayoutStateChange({
      isRefreshing: isFetching || isSyncing,
      connectionStatus: isOffline ? 'disconnected' : isFetching ? 'reconnecting' : 'connected'
    });
  }, [onLayoutStateChange, isFetching, isSyncing, isOffline, isUnauthorized]);

  const handleFiltersChange = useCallback((newFilters: CustomerFilters) => {
    const filtersChanged = JSON.stringify(newFilters) !== JSON.stringify(filters);
    if (filtersChanged) {
      setFilters(newFilters);
      setCurrentPage(1);
    }
  }, [filters]);

  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage]);

  const handleCustomerView = useCallback((customer: Customer) => {
    setDialogState({
      selectedCustomer: customer,
      showCustomerDetails: true,
      showAddCustomer: false,
      showEditCustomer: false,
      showDeleteConfirm: false,
    });
  }, []);

  const handleCustomerEdit = useCallback((customer: Customer) => {
    if (!canEditCustomer) {
      toast.error('ليس لديك صلاحية لتعديل العميل');
      return;
    }
    setDialogState({
      selectedCustomer: customer,
      showEditCustomer: true,
      showAddCustomer: false,
      showCustomerDetails: false,
      showDeleteConfirm: false,
    });
  }, [canEditCustomer]);

  const handleCustomerDelete = useCallback((customer: Customer) => {
    if (!canDeleteCustomer) {
      toast.error('ليس لديك صلاحية لحذف العميل');
      return;
    }
    setDialogState({
      selectedCustomer: customer,
      showDeleteConfirm: true,
      showAddCustomer: false,
      showEditCustomer: false,
      showCustomerDetails: false,
    });
  }, [canDeleteCustomer]);

  const handleAddCustomer = useCallback(() => {
    if (!canAddCustomer) {
      toast.error('ليس لديك صلاحية لإضافة عميل');
      return;
    }
    setDialogState({
      selectedCustomer: null,
      showAddCustomer: true,
      showEditCustomer: false,
      showCustomerDetails: false,
      showDeleteConfirm: false,
    });
  }, [canAddCustomer]);

  const confirmDelete = useCallback(async () => {
    if (!dialogState.selectedCustomer) return;

    try {
      // Delete via PowerSync
      await powerSyncService.db.execute(
        'DELETE FROM customers WHERE id = ?',
        [dialogState.selectedCustomer.id]
      );

      toast.success('تم حذف العميل بنجاح' + (!isOnline ? ' (سيتم المزامنة عند الاتصال)' : ''));
      closeDialogs();

      if (isOnline) {
        setTimeout(() => handleRefresh(), 500);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('حدث خطأ أثناء حذف العميل');
    }
  }, [dialogState.selectedCustomer, isOnline, handleRefresh]);

  const handleExport = useCallback(async (type: 'pdf' | 'excel') => {
    if (customers.length === 0) {
      toast.error('لا يوجد عملاء للتصدير');
      return;
    }

    const loadingToast = toast.loading(`جاري تحضير ملف ${type === 'pdf' ? 'PDF' : 'Excel'}...`);

    try {
      const exportData = customers.map(customer => ({
        'الاسم': customer.name,
        'الهاتف': customer.phone || '—',
        'البريد الإلكتروني': customer.email || '—',
        'العنوان': customer.address || '—',
        'الرقم الجبائي': customer.nif || '—',
        'تاريخ التسجيل': format(new Date(customer.created_at), 'yyyy-MM-dd HH:mm')
      }));

      if (type === 'excel') {
        const XLSX = await import('xlsx');

        const wsData = [
          ['تقرير العملاء'],
          [`تاريخ التقرير: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
          [`عدد العملاء: ${customers.length}`],
          [],
          ['الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'الرقم الجبائي', 'تاريخ التسجيل'],
          ...exportData.map(row => [
            row['الاسم'],
            row['الهاتف'],
            row['البريد الإلكتروني'],
            row['العنوان'],
            row['الرقم الجبائي'],
            row['تاريخ التسجيل']
          ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        worksheet['!cols'] = [
          { wch: 25 },
          { wch: 15 },
          { wch: 30 },
          { wch: 30 },
          { wch: 18 },
          { wch: 18 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'العملاء');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const w = window as any;
        const isElectron = !!w.electronAPI;

        if (isElectron && w.electronAPI?.saveFile) {
          const fileName = `Customers_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
          const arrayBuffer = await blob.arrayBuffer();
          const result = await w.electronAPI.saveFile({
            defaultPath: fileName,
            filters: [{ name: 'Excel', extensions: ['xlsx'] }],
            data: new Uint8Array(arrayBuffer)
          });

          if (result.success) {
            toast.dismiss(loadingToast);
            toast.success('تم حفظ ملف Excel بنجاح');
          } else {
            toast.dismiss(loadingToast);
          }
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Customers_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
          toast.dismiss(loadingToast);
          toast.success('تم تحميل ملف Excel بنجاح');
        }
      } else {
        toast.dismiss(loadingToast);
        toast.info('تصدير PDF قيد التطوير');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss(loadingToast);
      toast.error('حدث خطأ أثناء التصدير');
    }
  }, [customers]);

  const closeDialogs = useCallback(() => {
    setDialogState({
      showAddCustomer: false,
      showEditCustomer: false,
      showDeleteConfirm: false,
      showCustomerDetails: false,
      selectedCustomer: null,
    });
  }, []);

  // ===============================================================================
  // Render Helpers
  // ===============================================================================

  const renderWithLayout = (
    children: React.ReactNode,
    overrides?: {
      isRefreshing?: boolean;
      connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
    }
  ) => {
    if (!useStandaloneLayout) {
      return children;
    }

    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={overrides?.isRefreshing ?? (isFetching && isOnline)}
        connectionStatus={overrides?.connectionStatus ?? (isOffline ? 'disconnected' : 'connected')}
      >
        {children}
      </POSPureLayout>
    );
  };

  // Unauthorized
  if (isUnauthorized) {
    return renderWithLayout(
      <div className="container mx-auto py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-10 w-10 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold mb-1">غير مصرح</h3>
            <p className="text-sm text-muted-foreground text-center">
              لا تملك صلاحية الوصول إلى صفحة العملاء.
            </p>
          </CardContent>
        </Card>
      </div>,
      {
        isRefreshing: false,
        connectionStatus: isOffline ? 'disconnected' : 'connected'
      }
    );
  }

  // Error
  if (error && !isOffline) {
    return renderWithLayout(
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {(error as any)?.message || 'حدث خطأ أثناء تحميل بيانات العملاء'}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>,
      {
        isRefreshing: isLoading,
        connectionStatus: 'disconnected'
      }
    );
  }

  // Loading
  if (isLoading && customers.length === 0) {
    return renderWithLayout(
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">جاري تحميل العملاء</h3>
          <p className="text-sm text-muted-foreground">يرجى الانتظار...</p>
        </div>
      </div>,
      {
        isRefreshing: true,
        connectionStatus: 'reconnecting'
      }
    );
  }

  // ===============================================================================
  // Main Content
  // ===============================================================================

  const mainContent = (
    <div className="space-y-4" dir="rtl">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            وضع الأوفلاين - البيانات المحلية
          </p>
        </div>
      )}

      {/* Page Header - Apple Style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
            <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">العملاء</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-numeric">{stats.total}</span> عميل
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <CustomerStatsSimple
        stats={stats}
        loading={isFetching}
        error={null}
      />

      {/* Filters */}
      <CustomerFiltersOptimized
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onAddCustomer={handleAddCustomer}
        loading={isFetching}
        showAddButton={canAddCustomer}
      />

      {/* Customers Table */}
      <CustomersTableSimple
        customers={customers}
        loading={isFetching}
        error={null}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={pageSize}
        onPageChange={handlePageChange}
        onCustomerView={handleCustomerView}
        onCustomerEdit={handleCustomerEdit}
        onCustomerDelete={handleCustomerDelete}
      />

      {/* Empty State */}
      {customers.length === 0 && !isFetching && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا يوجد عملاء</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              لم يتم العثور على أي عملاء يطابقون الفلاتر المحددة.
            </p>
            <Button onClick={() => setFilters({ sortBy: 'created_at', sortOrder: 'desc' })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              إزالة الفلاتر
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Customer Dialog */}
      <Suspense fallback={null}>
        <AddCustomerDialog
          open={dialogState.showAddCustomer}
          onOpenChange={(open) => {
            if (!open) closeDialogs();
          }}
          onCustomerAdded={(customer) => {
            toast.success('تم إضافة العميل بنجاح');
            closeDialogs();
            if (isOnline) {
              setTimeout(() => handleRefresh(), 500);
            }
          }}
        />
      </Suspense>

      {/* Edit Customer Dialog */}
      {dialogState.selectedCustomer && (
        <Suspense fallback={null}>
          <EditCustomerDialog
            open={dialogState.showEditCustomer}
            onOpenChange={(open) => {
              if (!open) closeDialogs();
            }}
            customer={dialogState.selectedCustomer}
            onCustomerUpdated={(customer) => {
              toast.success('تم تحديث العميل بنجاح');
              closeDialogs();
              if (isOnline) {
                setTimeout(() => handleRefresh(), 500);
              }
            }}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={dialogState.showDeleteConfirm}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">حذف العميل</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف العميل "{dialogState.selectedCustomer?.name}"؟
              <br />
              هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialogs}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog - Simplified Apple Style */}
      <Dialog
        open={dialogState.showCustomerDetails}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              تفاصيل العميل
            </DialogTitle>
          </div>

          {dialogState.selectedCustomer && (
            <>
              {/* Customer Info */}
              <div className="p-5 space-y-4">
                {/* Name & Date */}
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {dialogState.selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    عميل منذ {format(new Date(dialogState.selectedCustomer.created_at), 'dd MMMM yyyy', { locale: ar })}
                  </p>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">الهاتف</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-numeric" dir="ltr">
                      {dialogState.selectedCustomer.phone || '—'}
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">البريد</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {dialogState.selectedCustomer.email || '—'}
                    </p>
                  </div>
                </div>

                {/* Address */}
                {dialogState.selectedCustomer.address && (
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">العنوان</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {dialogState.selectedCustomer.address}
                    </p>
                  </div>
                )}

                {/* Tax Info */}
                {(dialogState.selectedCustomer.nif || dialogState.selectedCustomer.rc) && (
                  <div className="grid grid-cols-2 gap-3">
                    {dialogState.selectedCustomer.nif && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                        <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">NIF</p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-numeric">
                          {dialogState.selectedCustomer.nif}
                        </p>
                      </div>
                    )}
                    {dialogState.selectedCustomer.rc && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                        <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">RC</p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-numeric">
                          {dialogState.selectedCustomer.rc}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                <Button
                  variant="outline"
                  onClick={closeDialogs}
                  className="flex-1 h-10 rounded-xl border-zinc-200 dark:border-zinc-700"
                >
                  إغلاق
                </Button>
                {canEditCustomer && (
                  <Button
                    onClick={() => {
                      setDialogState(prev => ({
                        ...prev,
                        showCustomerDetails: false,
                        showEditCustomer: true
                      }));
                    }}
                    className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    تعديل
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return renderWithLayout(mainContent);
};

export default Customers;
