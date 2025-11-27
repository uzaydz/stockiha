/**
 * ⚡ مكون عرض تفاصيل Outbox
 */

import React, { useState } from 'react';
import { Zap, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { outboxManager } from '@/lib/sync/delta';
import type { OutboxDetails } from './types';

interface OutboxDetailsPanelProps {
  pendingOutbox: number;
  outboxDetails: OutboxDetails | null;
  isOnline: boolean;
  isForceSending: boolean;
  onForceSend: () => Promise<void>;
  onClear: () => Promise<void>;
}

export function OutboxDetailsPanel({
  pendingOutbox,
  outboxDetails,
  isOnline,
  isForceSending,
  onForceSend,
  onClear
}: OutboxDetailsPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleToggleDetails = async () => {
    setShowDetails(!showDetails);
    
    // طباعة التفاصيل في الكونسول عند التوسيع
    if (!showDetails && process.env.NODE_ENV === 'development') {
      console.log('[OutboxDetails] 👁️ Expanding...');
      const detailed = await outboxManager.getDetailedPending(20);
      console.table(detailed.map(op => ({
        status: op.status,
        operation: op.operation,
        table: op.table_name,
        record: op.record_id.slice(0, 12) + '...',
        retries: op.retry_count,
        error: op.last_error?.slice(0, 50) || '-'
      })));
    }
  };

  return (
    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
      <div className="flex items-center justify-between gap-2 text-xs text-blue-600">
        <div className="flex items-center gap-2">
          <Zap className="h-3 w-3" />
          <span>⚡ Delta Sync</span>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingOutbox > 0 && (
            <>
              <Badge
                variant="secondary"
                className="h-5 cursor-pointer hover:bg-secondary/80"
                onClick={handleToggleDetails}
              >
                {pendingOutbox} معلق ▼
              </Badge>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onForceSend}
                disabled={isForceSending || !isOnline}
                className="h-6 px-2 text-green-500 hover:text-green-600 hover:bg-green-100"
                title="إرسال العمليات المعلقة الآن"
              >
                {isForceSending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                className="h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-100"
                title="حذف العمليات المعلقة"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
          
          {pendingOutbox === 0 && (
            <span className="text-green-600 text-[10px]">✓ متزامن</span>
          )}
        </div>
      </div>

      {/* تفاصيل العمليات المعلقة */}
      {showDetails && outboxDetails && (
        <div className="mt-2 pt-2 border-t border-blue-500/20 space-y-2">
          {/* حسب الحالة */}
          <div className="flex flex-wrap gap-1">
            {outboxDetails.pending > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-700">
                معلق: {outboxDetails.pending}
              </span>
            )}
            {outboxDetails.sending > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">
                قيد الإرسال: {outboxDetails.sending}
              </span>
            )}
            {outboxDetails.failed > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-700">
                فاشل: {outboxDetails.failed}
              </span>
            )}
          </div>

          {/* حسب الجدول */}
          {Object.keys(outboxDetails.byTable).length > 0 && (
            <div>
              <p className="text-[10px] text-blue-500 mb-1">حسب الجدول:</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(outboxDetails.byTable).map(([table, count]) => (
                  <span key={table} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700">
                    {table}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* حسب نوع العملية */}
          {Object.keys(outboxDetails.byOperation).length > 0 && (
            <div>
              <p className="text-[10px] text-blue-500 mb-1">حسب العملية:</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(outboxDetails.byOperation).map(([op, count]) => (
                  <span key={op} className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700">
                    {op}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
