import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    RefreshCw,
    Wifi,
    WifiOff,
    Database,
    Activity,
    Trash2,
    Play,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info
} from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { syncLogger, type SyncLogEntry } from '@/utils/syncLogger';
import { useTenant } from '@/context/TenantContext';
import { getDatabaseType } from '@/database/localDb';

type DiagnosticsResult = Awaited<ReturnType<typeof powerSyncService.diagnoseSync>>;

const SyncPanel: React.FC = () => {
    const { isOnline } = useNetworkStatus();
    const { currentOrganization } = useTenant();
    const [logs, setLogs] = useState<SyncLogEntry[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<any>(null);
    const [pendingCounts, setPendingCounts] = useState({
        orders: 0,
        customers: 0,
        products: 0,
        invoices: 0,
        returns: 0,
        losses: 0,
        debts: 0
    });
    const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
    const [diagLoading, setDiagLoading] = useState(false);
    const [resettingDb, setResettingDb] = useState(false);
    const [diagError, setDiagError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = syncLogger.subscribe((newLogs) => {
            setLogs([...newLogs]);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        fetchPendingCounts();
        const interval = setInterval(fetchPendingCounts, 5000);
        return () => clearInterval(interval);
    }, [currentOrganization]);

    const fetchPendingCounts = async () => {
        if (!currentOrganization) return;

        try {
            // ⚡ استخدام PowerSync مباشرة
            const orgId = currentOrganization.id;
            
            const [orders, customers, products, invoices, returns, losses, debts] = await Promise.all([
                powerSyncService.get<{ count: number }>('SELECT COUNT(*) as count FROM orders WHERE organization_id = ? AND synced = 0', [orgId]),
                powerSyncService.get<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE organization_id = ? AND synced = 0', [orgId]),
                powerSyncService.get<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND synced = 0', [orgId]),
                powerSyncService.get<{ count: number }>('SELECT COUNT(*) as count FROM invoices WHERE organization_id = ? AND synced = 0', [orgId]),
                powerSyncService.get<{ count: number }>('SELECT COUNT(*) as count FROM returns WHERE organization_id = ? AND synced = 0', [orgId]),
                powerSyncService.get<{ count: number }>('SELECT COUNT(*) as count FROM losses WHERE organization_id = ?', [orgId]),
                powerSyncService.get<{ count: number }>('SELECT COUNT(*) as count FROM customer_debts WHERE organization_id = ? AND synced = 0', [orgId])
            ]);

            setPendingCounts({
                orders: orders?.count || 0,
                customers: customers?.count || 0,
                products: products?.count || 0,
                invoices: invoices?.count || 0,
                returns: returns?.count || 0,
                losses: losses?.count || 0,
                debts: debts?.count || 0
            });
        } catch (e) {
            console.error('Failed to fetch pending counts', e);
            setPendingCounts({
                orders: 0,
                customers: 0,
                products: 0,
                invoices: 0,
                returns: 0,
                losses: 0,
                debts: 0
            });
        }
    };

    const handleManualSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        syncLogger.info('Starting manual sync (PowerSync)...', null, 'ManualTrigger');

        try {
            // ⚡ استخدام PowerSync مباشرة
            await powerSyncService.forceSync();
            const status = powerSyncService.syncStatus;
            const hasPending = await powerSyncService.hasPendingUploads();
            
            setLastSyncResult({
                pending: hasPending ? 1 : 0,
                syncing: status?.connected && !status?.hasSynced ? 1 : 0,
                failed: 0
            });

            syncLogger.success('Manual sync completed', { 
                connected: status?.connected,
                hasSynced: status?.hasSynced,
                hasPendingUploads: hasPending
            }, 'ManualTrigger');
        } catch (e) {
            syncLogger.error('Manual sync failed', e, 'ManualTrigger');
        } finally {
            setIsSyncing(false);
            fetchPendingCounts();
        }
    };

    const handleInitialSync = async () => {
        if (isSyncing || !currentOrganization) return;
        if (!confirm('Are you sure you want to run a full initial sync? This might take a while.')) return;

        setIsSyncing(true);
        syncLogger.info('Starting initial sync (PowerSync)...', null, 'ManualTrigger');

        try {
            // ⚡ تهيئة PowerSync إذا لم يكن مُهيأ
            try {
                await powerSyncService.initialize();
            } catch (initError) {
                // قد يكون مُهيأ بالفعل
                console.log('[SyncPanel] PowerSync already initialized');
            }

            // ⚡ فرض المزامنة الكاملة
            await powerSyncService.forceSync();
            const status = powerSyncService.syncStatus;
            const hasPending = await powerSyncService.hasPendingUploads();

            syncLogger.success('Initial sync completed', { 
                connected: status?.connected,
                hasSynced: status?.hasSynced,
                hasPendingUploads: hasPending
            }, 'ManualTrigger');
        } catch (e) {
            syncLogger.error('Initial sync failed', e, 'ManualTrigger');
        } finally {
            setIsSyncing(false);
            fetchPendingCounts();
        }
    };

    const clearLogs = () => {
        syncLogger.clear();
    };

    const runDiagnostics = async () => {
        setDiagError(null);
        setDiagLoading(true);
        try {
            // Ensure PowerSync is initialized before diagnosing
            try {
                await powerSyncService.initialize();
            } catch (initError) {
                console.log('[SyncPanel] PowerSync init (possibly already initialized)', initError);
            }

            const result = await powerSyncService.diagnoseSync();
            setDiagnostics(result);
            syncLogger.info('Diagnostics completed', result, 'Diag');
        } catch (e: any) {
            const message = e?.message || 'Failed to run diagnostics';
            setDiagError(message);
            syncLogger.error('Diagnostics failed', e, 'Diag');
        } finally {
            setDiagLoading(false);
        }
    };

    const handleResetDb = async () => {
        if (resettingDb) return;
        if (!confirm('سيتم مسح قاعدة البيانات المحلية وإعادة تهيئتها. المتابعة؟')) return;

        setDiagError(null);
        setResettingDb(true);
        try {
            syncLogger.warn('Resetting local PowerSync DB...', null, 'Diag');
            await powerSyncService.resetDatabase();
            syncLogger.success('Local database reset complete', null, 'Diag');
            await runDiagnostics();
        } catch (e: any) {
            const message = e?.message || 'Failed to reset database';
            setDiagError(message);
            syncLogger.error('Database reset failed', e, 'Diag');
        } finally {
            setResettingDb(false);
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6" dir="ltr">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Activity className="h-6 w-6" />
                    Sync Debug Panel
                </h1>
                <div className="flex items-center gap-2">
                    <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1">
                        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {getDatabaseType()}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Controls & Status */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            className="w-full"
                            onClick={handleManualSync}
                            disabled={isSyncing || !isOnline}
                        >
                            {isSyncing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                            Run Sync Now
                        </Button>

                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={handleInitialSync}
                            disabled={isSyncing || !isOnline}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Full Initial Sync
                        </Button>

                        <div className="pt-4 space-y-2 border-t">
                            <h3 className="font-semibold">PowerSync Console</h3>
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={runDiagnostics}
                                disabled={diagLoading}
                            >
                                {diagLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                                Diagnose & Status
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={handleResetDb}
                                disabled={resettingDb}
                            >
                                {resettingDb ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                Reset Local DB
                            </Button>

                            {diagError && (
                                <p className="text-xs text-red-600">{diagError}</p>
                            )}

                            {diagnostics && (
                                <div className="text-xs space-y-2 bg-muted p-3 rounded border">
                                    <div className="flex justify-between">
                                        <span>Database Ready</span>
                                        <Badge variant={diagnostics.databaseReady ? "default" : "destructive"}>
                                            {diagnostics.databaseReady ? 'Ready' : 'Not ready'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Connected</span>
                                        <Badge variant={diagnostics.connected ? "default" : "outline"}>
                                            {diagnostics.connected ? 'Yes' : 'No'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Has Synced</span>
                                        <Badge variant={diagnostics.hasSynced ? "default" : "outline"}>
                                            {diagnostics.hasSynced ? 'Yes' : 'No'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1">Tables with data</p>
                                        <div className="max-h-24 overflow-auto space-y-1">
                                            {diagnostics.tablesWithData?.length ? diagnostics.tablesWithData.map((row) => (
                                                <div key={row.table} className="flex justify-between">
                                                    <span>{row.table}</span>
                                                    <Badge variant="outline">{row.count}</Badge>
                                                </div>
                                            )) : (
                                                <p className="text-muted-foreground">No local rows</p>
                                            )}
                                        </div>
                                    </div>
                                    {diagnostics.recommendation && (
                                        <div className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                            {diagnostics.recommendation}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <h3 className="font-semibold mb-2">Pending Changes</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>POS Orders:</span>
                                    <Badge variant={pendingCounts.orders > 0 ? "secondary" : "outline"}>{pendingCounts.orders}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Invoices:</span>
                                    <Badge variant={pendingCounts.invoices > 0 ? "secondary" : "outline"}>{pendingCounts.invoices}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Customers:</span>
                                    <Badge variant={pendingCounts.customers > 0 ? "secondary" : "outline"}>{pendingCounts.customers}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Products:</span>
                                    <Badge variant={pendingCounts.products > 0 ? "secondary" : "outline"}>{pendingCounts.products}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Returns:</span>
                                    <Badge variant={pendingCounts.returns > 0 ? "secondary" : "outline"}>{pendingCounts.returns}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Losses:</span>
                                    <Badge variant={pendingCounts.losses > 0 ? "secondary" : "outline"}>{pendingCounts.losses}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Debts:</span>
                                    <Badge variant={pendingCounts.debts > 0 ? "secondary" : "outline"}>{pendingCounts.debts}</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Logs */}
                <Card className="md:col-span-2 h-[600px] flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Sync Logs</CardTitle>
                        <Button variant="ghost" size="sm" onClick={clearLogs}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 text-sm border-b">
                                        <div className="mt-0.5">{getLogIcon(log.type)}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                <span>{log.source || 'System'}</span>
                                            </div>
                                            <p className={log.type === 'error' ? 'text-red-600' : ''}>{log.message}</p>
                                            {log.details && (
                                                <pre className="mt-1 text-xs bg-muted p-1 rounded overflow-x-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div className="text-center text-muted-foreground py-8">
                                        No logs available
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SyncPanel;
