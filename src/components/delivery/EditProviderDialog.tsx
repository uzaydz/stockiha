import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShippingProvider } from '@/hooks/useShippingProviders';
import ProviderEditForm from './ProviderEditForm';
import CustomShippingEditForm from './CustomShippingEditForm';

interface EditProviderDialogProps {
  provider: ShippingProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditProviderDialog({ 
  provider, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل إعدادات {provider.provider_name}</DialogTitle>
          <DialogDescription>
            قم بتعديل إعدادات الاتصال والخيارات المتقدمة لشركة التوصيل
          </DialogDescription>
        </DialogHeader>

        {provider.provider_code === 'custom' ? (
          <CustomShippingEditForm
            provider={provider}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <ProviderEditForm
            provider={provider}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
} 