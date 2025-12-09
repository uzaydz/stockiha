/**
 * ⚡ SyncStatusIndicator - مؤشر حالة المزامنة
 * 
 * يعرض:
 * - حالة الاتصال (متصل/غير متصل)
 * - عدد العمليات المعلقة
 * - آخر وقت مزامنة
 * - زر المزامنة اليدوية
 */

import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  ChevronDown
} from 'lucide-react';
import { useSyncStatus, ConnectionStatus } from '@/hooks/useSyncStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ========================================
// 📦 Types
// ========================================

interface SyncStatusIndicatorProps {
  variant?: 'compact' | 'full' | 'minimal';
  showLabel?: boolean;
  className?: string;
}

// ========================================
// 🎨 Status Icon Component
// ========================================

const StatusIcon: React.FC<{ status: ConnectionStatus; isConnected: boolean }> = ({ 
  status, 
  isConnected 
}) => {
  if (status === 'offline') {
    return <WifiOff className="h-4 w-4 text-red-500" />;
  }
  
  if (status === 'syncing' || status === 'connecting') {
    return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
  }
  
  if (!isConnected) {
    return <CloudOff className="h-4 w-4 text-yellow-500" />;
  }
  
  return <Wifi className="h-4 w-4 text-green-500" />;
};

// ========================================
// 🎨 Status Badge Component
// ========================================

const StatusBadge: React.FC<{ status: ConnectionStatus; isConnected: boolean }> = ({ 
  status, 
  isConnected 
}) => {
  if (status === 'offline') {
    return (
      <Badge variant="destructive" className="text-xs">
        غير متصل
      </Badge>
    );
  }
  
  if (status === 'syncing') {
    return (
      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
        جاري المزامنة...
      </Badge>
    );
  }
  
  if (status === 'connecting') {
    return (
      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
        جاري الاتصال...
      </Badge>
    );
  }
  
  if (!isConnected) {
    return (
      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
        وضع محلي
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
      متصل
    </Badge>
  );
};

// ========================================
// 🔧 Main Component
// ========================================

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  variant = 'compact',
  showLabel = true,
  className
}) => {
  const {
    isOnline,
    connectionStatus,
    isConnected,
    hasPendingUploads,
    pendingUploadCount,
    lastSyncedAtFormatted,
    timeSinceLastSync,
    sync,
    isSyncing,
    syncError
  } = useSyncStatus();

  const [isOpen, setIsOpen] = useState(false);

  // ========================================
  // Minimal Variant
  // ========================================
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <StatusIcon status={connectionStatus} isConnected={isConnected} />
        {hasPendingUploads && (
          <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
        )}
      </div>
    );
  }

  // ========================================
  // Compact Variant
  // ========================================
  if (variant === 'compact') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('flex items-center gap-2 h-8 px-2', className)}
          >
            <StatusIcon status={connectionStatus} isConnected={isConnected} />
            
            {hasPendingUploads && (
              <Badge 
                variant="secondary" 
                className="h-5 px-1.5 text-[10px] bg-orange-100 text-orange-700"
              >
                {pendingUploadCount}
              </Badge>
            )}
            
            {showLabel && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isOnline ? 'متصل' : 'غير متصل'}
              </span>
            )}
            
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-72 p-4" align="end">
          <div className="space-y-4">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon status={connectionStatus} isConnected={isConnected} />
                <span className="font-medium">حالة المزامنة</span>
              </div>
              <StatusBadge status={connectionStatus} isConnected={isConnected} />
            </div>

            {/* Pending Uploads */}
            {hasPendingUploads && (
              <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                <Upload className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-700">
                  {pendingUploadCount} عملية في انتظار الرفع
                </span>
              </div>
            )}

            {/* Last Sync */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>آخر مزامنة: {timeSinceLastSync}</span>
            </div>

            {/* Error */}
            {syncError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">
                  {syncError.message}
                </span>
              </div>
            )}

            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={sync}
              disabled={isSyncing || !isOnline}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  جاري المزامنة...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  مزامنة الآن
                </>
              )}
            </Button>

            {/* Offline Warning */}
            {!isOnline && (
              <p className="text-xs text-muted-foreground text-center">
                أنت في وضع عدم الاتصال. ستتم المزامنة تلقائياً عند العودة للاتصال.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // ========================================
  // Full Variant
  // ========================================
  return (
    <div className={cn('p-4 border rounded-lg bg-card', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            حالة المزامنة
          </h3>
          <StatusBadge status={connectionStatus} isConnected={isConnected} />
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Connection */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">الإنترنت</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'متصل' : 'غير متصل'}
            </span>
          </div>

          {/* PowerSync */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {isConnected ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm font-medium">المزامنة</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'متصل بالخادم' : 'وضع محلي'}
            </span>
          </div>
        </div>

        {/* Pending Uploads */}
        {hasPendingUploads && (
          <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <Upload className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-orange-700">
                عمليات في الانتظار
              </p>
              <p className="text-xs text-orange-600">
                {pendingUploadCount} عملية في انتظار الرفع للخادم
              </p>
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>آخر مزامنة:</span>
          <span>{lastSyncedAtFormatted}</span>
        </div>

        {/* Error Display */}
        {syncError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">خطأ في المزامنة</p>
              <p className="text-xs text-red-600">{syncError.message}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={sync}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                جاري المزامنة...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                مزامنة الآن
              </>
            )}
          </Button>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              📴 أنت تعمل بدون اتصال بالإنترنت. جميع البيانات محفوظة محلياً وستتم مزامنتها تلقائياً عند استعادة الاتصال.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================
// 🎨 Offline Banner Component
// ========================================

export const OfflineBanner: React.FC = () => {
  const { isOnline, hasPendingUploads, pendingUploadCount } = useSyncStatus();

  if (isOnline && !hasPendingUploads) return null;

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50 p-2 text-center text-sm font-medium',
      !isOnline 
        ? 'bg-red-500 text-white' 
        : 'bg-orange-500 text-white'
    )}>
      {!isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          أنت غير متصل بالإنترنت - البيانات محفوظة محلياً
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Upload className="h-4 w-4" />
          {pendingUploadCount} عملية في انتظار المزامنة
        </span>
      )}
    </div>
  );
};

export default SyncStatusIndicator;

