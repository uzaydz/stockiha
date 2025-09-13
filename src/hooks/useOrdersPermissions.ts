import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

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

  const perms = usePermissions();

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
        // Prefer unified provider if ready
        if (perms.ready) {
          const canView = perms.anyOf(["viewOrders", "viewPOSOrders", "manageOrders"]);
          const canUpdate = perms.anyOf(["updateOrderStatus", "manageOrders"]);
          const canCancel = perms.anyOf(["cancelOrders", "manageOrders"]);

          setPermissions({
            view: canView,
            update: canUpdate,
            cancel: canCancel,
            loading: false,
          });
          return;
        }

        // Fallback: conservative defaults while provider loads
        setPermissions(prev => ({ ...prev, loading: true }));
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
  }, [user, toast, perms.ready, perms.role, perms.isOrgAdmin, perms.isSuperAdmin]);

  return permissions;
};
