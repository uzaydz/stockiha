import React, { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Home, Building2, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { StopDeskSelectionDialog } from '../dialogs/StopDeskSelectionDialog';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

interface OrderDeliveryTypeEditorProps {
  order: any;
  onOrderUpdated?: (updatedOrder: any) => void;
  hasUpdatePermission?: boolean;
}

const OrderDeliveryTypeEditor = memo<OrderDeliveryTypeEditorProps>(({ 
  order, 
  onOrderUpdated,
  hasUpdatePermission = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [stopDeskDialogOpen, setStopDeskDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { currentOrganization } = useTenant();
  
  // استخراج معلومات التوصيل
  const formData = (order.form_data as any) || {};
  const deliveryType = formData.deliveryType || formData.delivery_type || 'home';
  const isStopDesk = deliveryType === 'office' || 
                     deliveryType === 'stop_desk' || 
                     deliveryType === 'stopdesk' || 
                     deliveryType === 2 ||
                     deliveryType === '2';
  const stopdeskId = formData.stopdesk_id || formData.stopdeskId || null;

  // تغيير نوع التوصيل
  const handleDeliveryTypeChange = useCallback(async (newType: string) => {
    if (!currentOrganization?.id || !hasUpdatePermission) return;
    
    setUpdating(true);
    try {
      const updatedFormData = {
        ...formData,
        deliveryType: newType,
        delivery_type: newType,
      };
      
      // إذا تم التغيير من مكتب للمنزل، نحذف stopdesk_id
      if (newType === 'home') {
        delete updatedFormData.stopdesk_id;
        delete updatedFormData.stopdeskId;
      }
      
      const { error } = await supabase
        .from('online_orders')
        .update({ form_data: updatedFormData })
        .eq('id', order.id)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      
      // تحديث محلي
      if (onOrderUpdated) {
        onOrderUpdated({
          ...order,
          form_data: updatedFormData
        });
      }
      
      toast.success('تم تحديث نوع التوصيل');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating delivery type:', error);
      toast.error('فشل في تحديث نوع التوصيل');
    } finally {
      setUpdating(false);
    }
  }, [currentOrganization?.id, hasUpdatePermission, order, formData, onOrderUpdated]);

  // تأكيد اختيار المكتب
  const handleStopDeskConfirm = useCallback(async (stopdeskId: number, selectedCenter: any) => {
    if (!currentOrganization?.id || !hasUpdatePermission) return;
    
    setUpdating(true);
    try {
      const updatedFormData = {
        ...formData,
        stopdesk_id: stopdeskId,
        stopdeskId: stopdeskId,
        // تحديث البلدية والولاية لتطابق المكتب المختار
        commune: selectedCenter.commune_id.toString(),
        communeId: selectedCenter.commune_id.toString(),
        municipality: selectedCenter.commune_id.toString(),
        wilaya: selectedCenter.wilaya_id.toString(),
        wilayaId: selectedCenter.wilaya_id.toString(),
        province: selectedCenter.wilaya_id.toString(),
        // حفظ الأسماء أيضاً للمرجعية
        communeName: selectedCenter.commune_name,
        wilayaName: selectedCenter.wilaya_name,
      };
      
      const { error } = await supabase
        .from('online_orders')
        .update({ form_data: updatedFormData })
        .eq('id', order.id)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      
      // تحديث محلي
      if (onOrderUpdated) {
        onOrderUpdated({
          ...order,
          form_data: updatedFormData
        });
      }
      
      toast.success('تم تحديث المكتب والبيانات بنجاح');
      setStopDeskDialogOpen(false);
    } catch (error) {
      console.error('Error updating stop desk:', error);
      toast.error('فشل في تحديث المكتب');
    } finally {
      setUpdating(false);
    }
  }, [currentOrganization?.id, hasUpdatePermission, order, formData, onOrderUpdated]);

  if (!hasUpdatePermission) {
    return (
      <div className="flex items-center gap-2">
        {isStopDesk ? (
          <Building2 className="w-4 h-4 text-indigo-600" />
        ) : (
          <Home className="w-4 h-4 text-green-600" />
        )}
        <Badge variant="outline" className="text-xs">
          {isStopDesk ? 'مكتب' : 'منزل'}
        </Badge>
        {stopdeskId && (
          <span className="text-xs text-muted-foreground">
            #{stopdeskId}
          </span>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Select
          value={isStopDesk ? 'office' : 'home'}
          onValueChange={handleDeliveryTypeChange}
          disabled={updating}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="home" className="text-xs">
              <div className="flex items-center gap-2">
                <Home className="w-3.5 h-3.5" />
                توصيل للمنزل
              </div>
            </SelectItem>
            <SelectItem value="office" className="text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                توصيل للمكتب
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {/* اختيار المكتب إذا كان التوصيل للمكتب */}
        {isStopDesk && (
          <div className="space-y-2">
            {stopdeskId ? (
              <div className="flex items-center justify-between gap-2 p-2 bg-muted/20 rounded border">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-indigo-600" />
                  <span className="text-xs">
                    مكتب #{stopdeskId}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setStopDeskDialogOpen(true)}
                  disabled={updating}
                >
                  تغيير
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="h-7 w-full text-xs"
                onClick={() => setStopDeskDialogOpen(true)}
                disabled={updating}
              >
                <Building2 className="w-3 h-3 ml-1" />
                اختيار المكتب
              </Button>
            )}
          </div>
        )}
        
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => setIsEditing(false)}
            disabled={updating}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {isStopDesk ? (
          <Building2 className="w-4 h-4 text-indigo-600" />
        ) : (
          <Home className="w-4 h-4 text-green-600" />
        )}
        <Badge variant="outline" className="text-xs">
          {isStopDesk ? 'مكتب' : 'منزل'}
        </Badge>
        {stopdeskId && (
          <span className="text-xs text-muted-foreground">
            #{stopdeskId}
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={() => setIsEditing(true)}
        title="تعديل نوع التوصيل"
      >
        <Edit className="w-3 h-3" />
      </Button>

      {/* نافذة اختيار المكتب */}
      {currentOrganization?.id && stopDeskDialogOpen && (
        <StopDeskSelectionDialog
          open={stopDeskDialogOpen}
          onOpenChange={setStopDeskDialogOpen}
          onConfirm={handleStopDeskConfirm}
          wilayaId={formData.province || formData.wilaya || formData.wilayaId}
          communeId={formData.municipality || formData.commune || formData.communeId}
          organizationId={currentOrganization.id}
        />
      )}
    </div>
  );
});

OrderDeliveryTypeEditor.displayName = 'OrderDeliveryTypeEditor';

export default OrderDeliveryTypeEditor;
