import React from 'react';
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
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmDialogType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  type?: ConfirmDialogType;
  loading?: boolean;
  requireDoubleConfirm?: boolean; // تأكيد مزدوج للعمليات الحرجة جداً
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
  type = 'info',
  loading = false,
  requireDoubleConfirm = false,
}) => {
  const [doubleConfirmStep, setDoubleConfirmStep] = React.useState(0);

  const handleConfirm = async () => {
    if (requireDoubleConfirm && doubleConfirmStep === 0) {
      setDoubleConfirmStep(1);
      return;
    }

    await onConfirm();
    setDoubleConfirmStep(0);
  };

  const handleCancel = () => {
    setDoubleConfirmStep(0);
    onCancel?.();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDoubleConfirmStep(0);
    }
    onOpenChange(open);
  };

  const iconMap = {
    danger: <AlertCircle className="h-6 w-6 text-red-600" />,
    warning: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    info: <Info className="h-6 w-6 text-blue-600" />,
    success: <CheckCircle className="h-6 w-6 text-green-600" />,
  };

  const colorMap = {
    danger: 'bg-red-50 dark:bg-red-950/20',
    warning: 'bg-yellow-50 dark:bg-yellow-950/20',
    info: 'bg-blue-50 dark:bg-blue-950/20',
    success: 'bg-green-50 dark:bg-green-950/20',
  };

  const buttonColorMap = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-full', colorMap[type])}>
              {iconMap[type]}
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-right">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right mt-2">
                {doubleConfirmStep === 1 ? (
                  <span className="text-red-600 font-semibold">
                    ⚠️ هل أنت متأكد تماماً؟ لا يمكن التراجع عن هذا الإجراء!
                  </span>
                ) : (
                  description
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'min-w-[100px]',
              buttonColorMap[type],
              doubleConfirmStep === 1 && 'animate-pulse'
            )}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                جاري المعالجة...
              </>
            ) : (
              <>
                {doubleConfirmStep === 1 ? '✓ تأكيد نهائي' : confirmText}
              </>
            )}
          </AlertDialogAction>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;

