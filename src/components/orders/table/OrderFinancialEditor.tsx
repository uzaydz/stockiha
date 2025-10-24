import React, { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Check, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/ordersHelpers';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

interface OrderFinancialEditorProps {
  order: any;
  onOrderUpdated?: (updatedOrder: any) => void;
  hasUpdatePermission?: boolean;
}

const OrderFinancialEditor = memo<OrderFinancialEditorProps>(({ 
  order, 
  onOrderUpdated,
  hasUpdatePermission = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editedValues, setEditedValues] = useState({
    shipping_cost: order.shipping_cost || 0,
    discount: order.discount || 0,
  });
  const { currentOrganization } = useTenant();

  // حساب المجموع الكلي
  const calculateTotal = useCallback((shipping: number, discount: number) => {
    const subtotal = order.subtotal || 0;
    return subtotal + shipping - discount;
  }, [order.subtotal]);

  // بدء التعديل
  const handleStartEdit = useCallback(() => {
    setEditedValues({
      shipping_cost: order.shipping_cost || 0,
      discount: order.discount || 0,
    });
    setIsEditing(true);
  }, [order.shipping_cost, order.discount]);

  // إلغاء التعديل
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedValues({
      shipping_cost: order.shipping_cost || 0,
      discount: order.discount || 0,
    });
  }, [order.shipping_cost, order.discount]);

  // حفظ التعديلات
  const handleSave = useCallback(async () => {
    if (!currentOrganization?.id || !hasUpdatePermission) return;
    
    setUpdating(true);
    try {
      const newTotal = calculateTotal(editedValues.shipping_cost, editedValues.discount);
      
      const { error } = await supabase
        .from('online_orders')
        .update({
          shipping_cost: editedValues.shipping_cost,
          discount: editedValues.discount,
          total: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      
      // تحديث محلي
      if (onOrderUpdated) {
        onOrderUpdated({
          ...order,
          shipping_cost: editedValues.shipping_cost,
          discount: editedValues.discount,
          total: newTotal,
          updated_at: new Date().toISOString()
        });
      }
      
      toast.success('تم تحديث المبالغ المالية');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating financial data:', error);
      toast.error('فشل في تحديث المبالغ المالية');
    } finally {
      setUpdating(false);
    }
  }, [currentOrganization?.id, hasUpdatePermission, order, editedValues, calculateTotal, onOrderUpdated]);

  // تحديث قيمة
  const handleValueChange = useCallback((field: 'shipping_cost' | 'discount', value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedValues(prev => ({
      ...prev,
      [field]: numValue
    }));
  }, []);

  if (!hasUpdatePermission) {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">الشحن:</span>
          <span className="font-medium">{formatCurrency(order.shipping_cost || 0)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">التخفيض:</span>
            <span className="font-medium text-green-600">-{formatCurrency(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t pt-1">
          <span>المجموع:</span>
          <span className="text-primary">{formatCurrency(order.total)}</span>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="shipping_cost" className="text-xs">
            سعر التوصيل
          </Label>
          <Input
            id="shipping_cost"
            type="number"
            value={editedValues.shipping_cost}
            onChange={(e) => handleValueChange('shipping_cost', e.target.value)}
            className="h-8 text-sm"
            step="0.01"
            min="0"
            disabled={updating}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="discount" className="text-xs">
            التخفيض
          </Label>
          <Input
            id="discount"
            type="number"
            value={editedValues.discount}
            onChange={(e) => handleValueChange('discount', e.target.value)}
            className="h-8 text-sm"
            step="0.01"
            min="0"
            disabled={updating}
          />
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المجموع الفرعي:</span>
            <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الشحن:</span>
            <span className="font-medium">{formatCurrency(editedValues.shipping_cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">التخفيض:</span>
            <span className="font-medium text-green-600">-{formatCurrency(editedValues.discount)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-1">
            <span>المجموع الكلي:</span>
            <span className="text-primary">{formatCurrency(calculateTotal(editedValues.shipping_cost, editedValues.discount))}</span>
          </div>
        </div>
        
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={handleCancelEdit}
            disabled={updating}
          >
            <X className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-6 px-2 text-xs"
            onClick={handleSave}
            disabled={updating}
          >
            {updating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">الشحن:</span>
        <span className="font-medium">{formatCurrency(order.shipping_cost || 0)}</span>
      </div>
      {order.discount > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">التخفيض:</span>
          <span className="font-medium text-green-600">-{formatCurrency(order.discount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold border-t pt-1">
        <span>المجموع:</span>
        <span className="text-primary">{formatCurrency(order.total)}</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 mt-1"
        onClick={handleStartEdit}
        title="تعديل المبالغ المالية"
      >
        <Edit className="w-3 h-3" />
      </Button>
    </div>
  );
});

OrderFinancialEditor.displayName = 'OrderFinancialEditor';

export default OrderFinancialEditor;
