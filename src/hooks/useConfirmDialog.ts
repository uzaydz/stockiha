import { useState, useCallback } from 'react';
import { ConfirmDialogType } from '@/components/common/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  requireDoubleConfirm?: boolean;
}

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({
    title: '',
    description: '',
    type: 'info',
  });
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void | Promise<void>) | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig(options);
      setIsOpen(true);
      
      setOnConfirmCallback(() => async () => {
        setLoading(true);
        try {
          resolve(true);
        } finally {
          setLoading(false);
          setIsOpen(false);
        }
      });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (onConfirmCallback) {
      await onConfirmCallback();
    }
  }, [onConfirmCallback]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    setIsOpen,
    config,
    loading,
    confirm,
    handleConfirm,
    handleCancel,
  };
};

