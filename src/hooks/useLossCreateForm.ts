import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { LossItem } from '@/types/losses';

type LossTypeForm =
  | 'damaged'
  | 'expired'
  | 'theft'
  | 'spoilage'
  | 'breakage'
  | 'defective'
  | 'other';

export interface CreateLossFormState {
  lossType: LossTypeForm;
  lossCategory: string;
  incidentDate: string;
  lossDescription: string;
  locationDescription: string;
  witnessName: string;
  requiresManagerApproval: boolean;
  insuranceClaim: boolean;
  insuranceReference: string;
  externalReference: string;
  notes: string;
  internalNotes: string;
  lossItems: Array<
    LossItem & {
      // ensure variant props are present for form usage
      quantity_lost: number;
      unit_cost: number;
      unit_selling_price: number;
      loss_condition: string;
    }
  >;
  evidenceFiles: File[];
}

const getInitialFormState = (): CreateLossFormState => ({
  lossType: 'damaged',
  lossCategory: 'operational',
  incidentDate: new Date().toISOString().split('T')[0],
  lossDescription: '',
  locationDescription: '',
  witnessName: '',
  requiresManagerApproval: true,
  insuranceClaim: false,
  insuranceReference: '',
  externalReference: '',
  notes: '',
  internalNotes: '',
  lossItems: [],
  evidenceFiles: []
});

export const useLossCreateForm = () => {
  const [createForm, setCreateForm] = useState<CreateLossFormState>(getInitialFormState);

  const resetCreateForm = useCallback(() => {
    setCreateForm(getInitialFormState());
  }, []);

  const removeProductFromLoss = useCallback((productId: string) => {
    setCreateForm(prev => ({
      ...prev,
      lossItems: prev.lossItems.filter(item => item.product_id !== productId)
    }));
  }, []);

  const updateLossItem = useCallback((productId: string, field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      lossItems: prev.lossItems.map(item => {
        if (item.product_id === productId) {
          const updatedItem: any = { ...item, [field]: value };

          if (field === 'quantity_lost') {
            const stockBefore = item.stock_before_loss || item.variant_stock_before || 0;
            const newQuantity = Math.max(0, parseInt(value) || 0);
            const maxLossQuantity = stockBefore;
            const validQuantity = Math.min(newQuantity, maxLossQuantity);

            if (newQuantity > maxLossQuantity) {
              toast.error(`الكمية المفقودة لا يمكن أن تتجاوز المخزون المتاح (${maxLossQuantity})`);
            }

            updatedItem.quantity_lost = validQuantity;
            updatedItem.stock_after_loss = Math.max(0, stockBefore - validQuantity);
            updatedItem.variant_stock_after = Math.max(0, (item.variant_stock_before || stockBefore) - validQuantity);
          }

          return updatedItem;
        }
        return item;
      })
    }));
  }, []);

  return {
    createForm,
    setCreateForm,
    resetCreateForm,
    updateLossItem,
    removeProductFromLoss
  };
};














































