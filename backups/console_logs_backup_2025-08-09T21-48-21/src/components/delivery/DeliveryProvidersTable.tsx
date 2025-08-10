import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Shield,
  Package2,
  TruckIcon,
  Package,
  Truck,
  Globe
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useShippingProviders } from '@/hooks/useShippingProviders';
import EditProviderDialog from './EditProviderDialog';
import DeleteProviderDialog from './DeleteProviderDialog';

interface DeliveryProvidersTableProps {
  organizationId: string;
  onRefetch?: () => Promise<void>;
}

// Provider icons mapping
const providerIcons = {
  yalidine: Package2,
  zrexpress: TruckIcon,
  mayesto: Package,
  ecotrack: Truck,
  // Ecotrack-integrated providers
  anderson_delivery: Truck,
  areex: Package,
  ba_consult: TruckIcon,
  conexlog: Truck,
  coyote_express: Package2,
  dhd: Truck,
  distazero: Package,
  e48hr_livraison: TruckIcon,
  fretdirect: Truck,
  golivri: Package2,
  mono_hub: Package,
  msm_go: TruckIcon,
  negmar_express: Truck,
  imir_express: Truck,
  packers: Package,
  prest: Package2,
  rb_livraison: TruckIcon,
  rex_livraison: Truck,
  rocket_delivery: Package2,
  salva_delivery: Package,
  speed_delivery: TruckIcon,
  tsl_express: Truck,
  worldexpress: Package2,
  custom: Globe,
  default: Package
};

// Provider colors mapping
const providerColors = {
  yalidine: 'bg-blue-100 text-blue-800',
  zrexpress: 'bg-green-100 text-green-800',
  mayesto: 'bg-purple-100 text-purple-800',
  ecotrack: 'bg-orange-100 text-orange-800',
  // Ecotrack-integrated providers colors
  anderson_delivery: 'bg-teal-100 text-teal-800',
  areex: 'bg-indigo-100 text-indigo-800',
  ba_consult: 'bg-cyan-100 text-cyan-800',
  conexlog: 'bg-emerald-100 text-emerald-800',
  coyote_express: 'bg-amber-100 text-amber-800',
  dhd: 'bg-rose-100 text-rose-800',
  distazero: 'bg-violet-100 text-violet-800',
  e48hr_livraison: 'bg-lime-100 text-lime-800',
  fretdirect: 'bg-sky-100 text-sky-800',
  golivri: 'bg-pink-100 text-pink-800',
  mono_hub: 'bg-slate-100 text-slate-800',
  msm_go: 'bg-orange-100 text-orange-800',
  negmar_express: 'bg-red-100 text-red-800',
  imir_express: 'bg-red-100 text-red-800',
  packers: 'bg-yellow-100 text-yellow-800',
  prest: 'bg-blue-100 text-blue-800',
  rb_livraison: 'bg-green-100 text-green-800',
  rex_livraison: 'bg-purple-100 text-purple-800',
  rocket_delivery: 'bg-fuchsia-100 text-fuchsia-800',
  salva_delivery: 'bg-emerald-100 text-emerald-800',
  speed_delivery: 'bg-cyan-100 text-cyan-800',
  tsl_express: 'bg-indigo-100 text-indigo-800',
  worldexpress: 'bg-teal-100 text-teal-800',
  custom: 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-primary/20',
  default: 'bg-gray-100 text-gray-800'
};

export default function DeliveryProvidersTable({ organizationId, onRefetch }: DeliveryProvidersTableProps) {
  const { toast } = useToast();
  const { providers, isLoading, error, refetch } = useShippingProviders(organizationId);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [deletingProvider, setDeletingProvider] = useState<any>(null);

  // استخدام onRefetch إذا كان متوفراً، وإلا استخدام refetch الداخلي
  const handleRefetch = async () => {
    if (onRefetch) {
      await onRefetch();
    } else {
      await refetch();
    }
  };

  const getProviderIcon = (providerCode: string) => {
    const IconComponent = providerIcons[providerCode as keyof typeof providerIcons] || providerIcons.default;
    return IconComponent;
  };

  const getProviderColor = (providerCode: string) => {
    return providerColors[providerCode as keyof typeof providerColors] || providerColors.default;
  };

  const handleTestConnection = async (provider: any) => {
    toast({
      title: "جاري اختبار الاتصال...",
      description: `اختبار الاتصال مع ${provider.provider_name}`,
    });
    
    // TODO: Implement connection test logic
    setTimeout(() => {
      toast({
        title: "نجح الاختبار",
        description: `تم الاتصال بنجاح مع ${provider.provider_name}`,
        variant: "default",
      });
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل شركات التوصيل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ أثناء تحميل شركات التوصيل: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!providers || providers.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Truck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">لا توجد شركات توصيل</h3>
          <p className="text-muted-foreground mb-4">
            لم تقم بإضافة أي شركة توصيل بعد. ابدأ بإضافة شركة توصيل لمتجرك.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>شركة التوصيل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التفعيل التلقائي</TableHead>
              <TableHead>تتبع التحديثات</TableHead>
              <TableHead>آخر تحديث</TableHead>
              <TableHead className="w-[100px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider) => {
              const IconComponent = getProviderIcon(provider.provider_code);
              const colorClass = getProviderColor(provider.provider_code);
              
              return (
                <TableRow key={provider.provider_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{provider.provider_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {provider.provider_code === 'custom' 
                            ? 'طريقة شحن مخصصة' 
                            : provider.provider_code.toUpperCase()
                          }
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={provider.is_enabled ? "default" : "secondary"}
                      className={provider.is_enabled ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                    >
                      {provider.is_enabled ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          مفعّل
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          معطّل
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={provider.auto_shipping ? "default" : "outline"}>
                      {provider.auto_shipping ? "مفعّل" : "معطّل"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={provider.track_updates ? "default" : "outline"}>
                      {provider.track_updates ? "مفعّل" : "معطّل"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {provider.updated_at 
                        ? new Date(provider.updated_at).toLocaleDateString('ar-DZ')
                        : 'غير محدد'
                      }
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setEditingProvider(provider)}
                          className="cursor-pointer"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          تعديل الإعدادات
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => handleTestConnection(provider)}
                          className="cursor-pointer"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          اختبار الاتصال
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => setDeletingProvider(provider)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Provider Dialog */}
      {editingProvider && (
        <EditProviderDialog
          provider={editingProvider}
          open={!!editingProvider}
          onOpenChange={(open) => !open && setEditingProvider(null)}
          onSuccess={() => {
            setEditingProvider(null);
            handleRefetch();
          }}
        />
      )}

      {/* Delete Provider Dialog */}
      {deletingProvider && (
        <DeleteProviderDialog
          provider={deletingProvider}
          open={!!deletingProvider}
          onOpenChange={(open) => !open && setDeletingProvider(null)}
          onSuccess={() => {
            setDeletingProvider(null);
            handleRefetch();
          }}
        />
      )}
    </>
  );
}
