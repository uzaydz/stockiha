import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { checkUserPermissions } from "@/lib/api/permissions";

interface OrdersPermissions {
  view: boolean;
  update: boolean;
  cancel: boolean;
  loading: boolean;
}

export const useOrdersPermissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [permissions, setPermissions] = useState<OrdersPermissions>({
    view: false,
    update: false,
    cancel: false,
    loading: true,
  });

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        setPermissions({
          view: false,
          update: false,
          cancel: false,
          loading: false,
        });
        return;
      }
      
      try {
        const [canView, canUpdate, canCancel] = await Promise.all([
          checkUserPermissions(user, 'viewOrders' as any),
          checkUserPermissions(user, 'updateOrderStatus' as any),
          checkUserPermissions(user, 'cancelOrders' as any),
        ]);

        setPermissions({
          view: canView,
          update: canUpdate,
          cancel: canCancel,
          loading: false,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "خطأ في التحقق من الصلاحيات",
          description: "حدث خطأ أثناء التحقق من صلاحياتك",
        });
        setPermissions(prev => ({ ...prev, loading: false }));
      }
    };
    
    checkPermissions();
  }, [user, toast]);

  return permissions;
};
