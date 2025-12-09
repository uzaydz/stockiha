/**
 * ⚡ Conflict Resolution Dialog
 * 
 * واجهة المستخدم لحل التعارضات يدوياً
 * تُستخدم عندما يتطلب التضارب تدخل المستخدم
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, XCircle, Merge } from 'lucide-react';
import type { ResolvedEntity, ResolutionStrategy } from '@/lib/sync/conflictTypes';

interface ConflictResolutionDialogProps {
    open: boolean;
    onClose: () => void;
    conflict: {
        entityType: string;
        entityId: string;
        local: any;
        server: any;
        conflictFields: string[];
        severity: number;
    };
    onResolve: (strategy: ResolutionStrategy, customData?: any) => Promise<void>;
}

export function ConflictResolutionDialog({
    open,
    onClose,
    conflict,
    onResolve
}: ConflictResolutionDialogProps) {
    const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    const handleResolve = async (strategy: ResolutionStrategy) => {
        setIsResolving(true);
        try {
            await onResolve(strategy);
            onClose();
        } catch (error) {
            console.error('[ConflictResolutionDialog] Resolution failed:', error);
        } finally {
            setIsResolving(false);
        }
    };

    const getSeverityColor = (severity: number) => {
        if (severity < 30) return 'bg-green-500/10 text-green-600';
        if (severity < 60) return 'bg-amber-500/10 text-amber-600';
        return 'bg-red-500/10 text-red-600';
    };

    const getSeverityLabel = (severity: number) => {
        if (severity < 30) return 'منخفضة';
        if (severity < 60) return 'متوسطة';
        return 'عالية';
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        تضارب في البيانات
                    </DialogTitle>
                    <DialogDescription>
                        تم اكتشاف تضارب في {conflict.entityType} ({conflict.entityId})
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Severity Badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">شدة التضارب:</span>
                        <Badge className={getSeverityColor(conflict.severity)}>
                            {getSeverityLabel(conflict.severity)} ({conflict.severity}%)
                        </Badge>
                    </div>

                    {/* Conflict Fields */}
                    {conflict.conflictFields.length > 0 && (
                        <div>
                            <span className="text-sm font-medium">الحقول المتضاربة:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {conflict.conflictFields.map(field => (
                                    <Badge key={field} variant="outline">
                                        {field}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comparison View */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Local Version */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <XCircle className="h-4 w-4 text-blue-500" />
                                <span className="font-medium">النسخة المحلية</span>
                                <Badge variant="outline" className="text-xs">
                                    {new Date(conflict.local.updated_at || conflict.local._local_updated_at || 0).toLocaleString('ar-SA')}
                                </Badge>
                            </div>
                            <ScrollArea className="h-64">
                                <pre className="text-xs bg-muted p-2 rounded">
                                    {JSON.stringify(conflict.local, null, 2)}
                                </pre>
                            </ScrollArea>
                        </div>

                        {/* Server Version */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="font-medium">النسخة من السيرفر</span>
                                <Badge variant="outline" className="text-xs">
                                    {new Date(conflict.server.updated_at || 0).toLocaleString('ar-SA')}
                                </Badge>
                            </div>
                            <ScrollArea className="h-64">
                                <pre className="text-xs bg-muted p-2 rounded">
                                    {JSON.stringify(conflict.server, null, 2)}
                                </pre>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Resolution Options */}
                    <div className="space-y-2">
                        <span className="text-sm font-medium">اختر طريقة الحل:</span>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={selectedStrategy === 'server_wins' ? 'default' : 'outline'}
                                onClick={() => setSelectedStrategy('server_wins')}
                                disabled={isResolving}
                                className="justify-start"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                استخدام النسخة من السيرفر
                            </Button>
                            <Button
                                variant={selectedStrategy === 'client_wins' ? 'default' : 'outline'}
                                onClick={() => setSelectedStrategy('client_wins')}
                                disabled={isResolving}
                                className="justify-start"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                استخدام النسخة المحلية
                            </Button>
                            <Button
                                variant={selectedStrategy === 'merge' ? 'default' : 'outline'}
                                onClick={() => setSelectedStrategy('merge')}
                                disabled={isResolving}
                                className="justify-start"
                            >
                                <Merge className="h-4 w-4 mr-2" />
                                دمج ذكي
                            </Button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose} disabled={isResolving}>
                            إلغاء
                        </Button>
                        <Button
                            onClick={() => selectedStrategy && handleResolve(selectedStrategy)}
                            disabled={!selectedStrategy || isResolving}
                        >
                            {isResolving ? 'جارٍ الحل...' : 'حل التضارب'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}



















