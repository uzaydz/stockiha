import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertTriangle,
  Package2,
  TruckIcon,
  Package,
  Truck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase-client';
import { ShippingProvider } from '@/hooks/useShippingProviders';

interface DeleteProviderDialogProps {
  provider: ShippingProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Provider icons mapping
const providerIcons = {
  yalidine: Package2,
  zrexpress: TruckIcon,
  mayesto: Package,
  ecotrack: Truck,
  custom: Package,
  default: Package
};

export default function DeleteProviderDialog({ 
  provider, 
  open, 
  onOpenChange, 
  onSuccess 
}: DeleteProviderDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const getProviderIcon = (providerCode: string) => {
    const IconComponent = providerIcons[providerCode as keyof typeof providerIcons] || providerIcons.default;
    return IconComponent;
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Delete provider settings
      let query = supabase
        .from('shipping_provider_settings')
        .delete()
        .eq('organization_id', provider.organization_id);

      // For custom shipping, provider_id is null
      if (provider.provider_code === 'custom') {
        query = query.is('provider_id', null).eq('api_key', 'custom_shipping');
      } else {
        query = query.eq('provider_id', provider.provider_id);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        title: "تم الحذف بنجاح",
        description: `تم حذف ${provider.provider_name} من قائمة شركات التوصيل`,
        variant: "default",
      });

      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error('Error deleting provider:', error);
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف شركة التوصيل: " + ((error as Error)?.message || 'خطأ غير معروف'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const IconComponent = getProviderIcon(provider.provider_code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            تأكيد الحذف
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف شركة التوصيل هذه؟ لا يمكن التراجع عن هذا الإجراء.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Provider Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{provider.provider_name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {provider.provider_code.toUpperCase()}
                </Badge>
                <Badge 
                  variant={provider.is_enabled ? "default" : "secondary"}
                  className={provider.is_enabled ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                >
                  {provider.is_enabled ? "مفعّل" : "معطّل"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Warning */}
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>تحذير:</strong> سيتم حذف جميع الإعدادات والبيانات المرتبطة بهذه الشركة نهائياً. 
              تأكد من عدم وجود طلبات قيد المعالجة مع هذه الشركة قبل الحذف.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            حذف نهائياً
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 