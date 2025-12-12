/**
 * 🚨 Conflict Alert Component - مكون تنبيه التعارضات
 *
 * يعرض تنبيهات للتعارضات في الأرقام التسلسلية والدفعات
 * عند العمل offline مع أجهزة متعددة
 *
 * ⚡ v1.0: يدعم تعارضات الحجز والبيع
 * - حجز من جهاز آخر (already_reserved)
 * - مُباع مسبقاً (already_sold)
 * - الكمية غير كافية (insufficient_quantity)
 * - انتهاء صلاحية الدفعة (batch_expired)
 *
 * @version 1.0.0
 * @date 2025-12-12
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ShieldAlert,
  Lock,
  Package,
  Clock,
  X,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// أنواع التعارضات
// =====================================================

export type ConflictType =
  | 'already_reserved'   // الرقم التسلسلي محجوز من جهاز آخر
  | 'already_sold'       // الرقم التسلسلي مُباع مسبقاً
  | 'insufficient_quantity' // الكمية غير كافية في الدفعة
  | 'batch_expired'      // الدفعة منتهية الصلاحية
  | 'reservation_expired' // انتهى وقت الحجز
  | 'sync_conflict';     // تعارض مزامنة

export interface Conflict {
  id: string;
  type: ConflictType;
  timestamp: Date;
  details: {
    serialNumber?: string;
    batchNumber?: string;
    productName?: string;
    deviceId?: string;
    deviceName?: string;
    reservedAt?: Date;
    expiresAt?: Date;
    availableQuantity?: number;
    requestedQuantity?: number;
  };
}

// =====================================================
// خصائص المكونات
// =====================================================

interface ConflictAlertProps {
  conflicts: Conflict[];
  onDismiss: (conflictId: string) => void;
  onDismissAll: () => void;
  onRetry?: (conflict: Conflict) => void;
  className?: string;
}

interface ConflictDialogProps {
  conflict: Conflict | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
  onDismiss: () => void;
}

// =====================================================
// معلومات التعارض حسب النوع
// =====================================================

const getConflictInfo = (type: ConflictType): {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
} => {
  switch (type) {
    case 'already_reserved':
      return {
        title: 'محجوز من جهاز آخر',
        description: 'هذا الرقم التسلسلي محجوز حالياً من جهاز آخر في المتجر',
        icon: <Lock className="w-5 h-5" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200'
      };
    case 'already_sold':
      return {
        title: 'مُباع مسبقاً',
        description: 'هذا الرقم التسلسلي تم بيعه ولم تتم المزامنة بعد',
        icon: <ShieldAlert className="w-5 h-5" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
      };
    case 'insufficient_quantity':
      return {
        title: 'الكمية غير كافية',
        description: 'الكمية المطلوبة أكبر من المتاح في الدفعة',
        icon: <Package className="w-5 h-5" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200'
      };
    case 'batch_expired':
      return {
        title: 'دفعة منتهية',
        description: 'هذه الدفعة انتهت صلاحيتها ولا يمكن البيع منها',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
      };
    case 'reservation_expired':
      return {
        title: 'انتهى وقت الحجز',
        description: 'انتهت صلاحية الحجز وقد يكون الرقم متاحاً للآخرين',
        icon: <Clock className="w-5 h-5" />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200'
      };
    case 'sync_conflict':
      return {
        title: 'تعارض مزامنة',
        description: 'حدث تعارض أثناء مزامنة البيانات مع الخادم',
        icon: <RefreshCw className="w-5 h-5" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200'
      };
  }
};

// =====================================================
// مكون تنبيه التعارض (صغير)
// =====================================================

const ConflictItem = memo<{
  conflict: Conflict;
  onDismiss: () => void;
  onClick: () => void;
}>(({ conflict, onDismiss, onClick }) => {
  const info = getConflictInfo(conflict.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <Alert
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          info.bgColor
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5', info.color)}>
            {info.icon}
          </div>

          <div className="flex-1 min-w-0">
            <AlertTitle className={cn('text-sm font-semibold', info.color)}>
              {info.title}
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1">
              {conflict.details.serialNumber && (
                <span className="font-mono">{conflict.details.serialNumber}</span>
              )}
              {conflict.details.batchNumber && (
                <span className="font-mono">{conflict.details.batchNumber}</span>
              )}
              {conflict.details.productName && (
                <span> - {conflict.details.productName}</span>
              )}
            </AlertDescription>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </motion.div>
  );
});

ConflictItem.displayName = 'ConflictItem';

// =====================================================
// مربع حوار تفاصيل التعارض
// =====================================================

const ConflictDialog = memo<ConflictDialogProps>(({
  conflict,
  open,
  onOpenChange,
  onRetry,
  onDismiss
}) => {
  if (!conflict) return null;

  const info = getConflictInfo(conflict.type);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn('flex items-center gap-2', info.color)}>
            {info.icon}
            {info.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{info.description}</p>

            {/* تفاصيل التعارض */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
              {conflict.details.serialNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرقم التسلسلي:</span>
                  <span className="font-mono font-medium">{conflict.details.serialNumber}</span>
                </div>
              )}

              {conflict.details.batchNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رقم الدفعة:</span>
                  <span className="font-mono font-medium">{conflict.details.batchNumber}</span>
                </div>
              )}

              {conflict.details.productName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المنتج:</span>
                  <span className="font-medium">{conflict.details.productName}</span>
                </div>
              )}

              {conflict.details.deviceName && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الجهاز:</span>
                  <Badge variant="outline" className="gap-1">
                    <Smartphone className="h-3 w-3" />
                    {conflict.details.deviceName}
                  </Badge>
                </div>
              )}

              {conflict.details.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ينتهي الحجز:</span>
                  <span className="font-medium">
                    {new Date(conflict.details.expiresAt).toLocaleTimeString('ar-DZ')}
                  </span>
                </div>
              )}

              {conflict.details.availableQuantity !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الكمية المتاحة:</span>
                  <span className="font-medium">{conflict.details.availableQuantity}</span>
                </div>
              )}

              {conflict.details.requestedQuantity !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الكمية المطلوبة:</span>
                  <span className="font-medium text-red-600">{conflict.details.requestedQuantity}</span>
                </div>
              )}
            </div>

            {/* نصيحة */}
            {conflict.type === 'already_reserved' && (
              <p className="text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 inline ml-1" />
                يمكنك الانتظار حتى ينتهي الحجز أو اختيار رقم تسلسلي آخر
              </p>
            )}

            {conflict.type === 'already_sold' && (
              <p className="text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 inline ml-1" />
                ستتم مزامنة البيانات تلقائياً عند اتصال الإنترنت
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>إغلاق</AlertDialogCancel>
          {onRetry && conflict.type === 'already_reserved' && (
            <AlertDialogAction onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

ConflictDialog.displayName = 'ConflictDialog';

// =====================================================
// المكون الرئيسي
// =====================================================

const ConflictAlert = memo<ConflictAlertProps>(({
  conflicts,
  onDismiss,
  onDismissAll,
  onRetry,
  className
}) => {
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // إذا لم تكن هناك تعارضات
  if (conflicts.length === 0) return null;

  return (
    <>
      <div className={cn('fixed bottom-4 left-4 z-50 space-y-2 max-w-sm', className)}>
        {/* زر مسح الكل */}
        {conflicts.length > 1 && (
          <div className="flex justify-end mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={onDismissAll}
            >
              <X className="h-3 w-3" />
              مسح الكل ({conflicts.length})
            </Button>
          </div>
        )}

        {/* قائمة التعارضات */}
        <AnimatePresence mode="popLayout">
          {conflicts.slice(0, 3).map((conflict) => (
            <ConflictItem
              key={conflict.id}
              conflict={conflict}
              onDismiss={() => onDismiss(conflict.id)}
              onClick={() => {
                setSelectedConflict(conflict);
                setDialogOpen(true);
              }}
            />
          ))}
        </AnimatePresence>

        {/* إشارة للمزيد */}
        {conflicts.length > 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-muted-foreground"
          >
            و {conflicts.length - 3} تعارضات أخرى...
          </motion.div>
        )}
      </div>

      {/* مربع حوار التفاصيل */}
      <ConflictDialog
        conflict={selectedConflict}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRetry={selectedConflict && onRetry ? () => {
          onRetry(selectedConflict);
          setDialogOpen(false);
        } : undefined}
        onDismiss={() => {
          if (selectedConflict) {
            onDismiss(selectedConflict.id);
          }
          setDialogOpen(false);
        }}
      />
    </>
  );
});

ConflictAlert.displayName = 'ConflictAlert';

// =====================================================
// Hook لإدارة التعارضات
// =====================================================

export function useConflicts() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const addConflict = useCallback((
    type: ConflictType,
    details: Conflict['details']
  ) => {
    const newConflict: Conflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      details
    };

    setConflicts(prev => [...prev, newConflict]);

    // إزالة تلقائية بعد 30 ثانية
    setTimeout(() => {
      setConflicts(prev => prev.filter(c => c.id !== newConflict.id));
    }, 30000);

    return newConflict.id;
  }, []);

  const dismissConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, []);

  const dismissAll = useCallback(() => {
    setConflicts([]);
  }, []);

  const clearExpired = useCallback(() => {
    const now = new Date();
    setConflicts(prev => prev.filter(c => {
      const age = now.getTime() - c.timestamp.getTime();
      return age < 30000; // 30 ثانية
    }));
  }, []);

  // تنظيف دوري
  useEffect(() => {
    const interval = setInterval(clearExpired, 10000);
    return () => clearInterval(interval);
  }, [clearExpired]);

  return {
    conflicts,
    addConflict,
    dismissConflict,
    dismissAll,
    hasConflicts: conflicts.length > 0
  };
}

export default ConflictAlert;
