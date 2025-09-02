import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShippingProviders } from '@/hooks/useShippingProviders';
import { useTenant } from '@/context/TenantContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ShippingProviderSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function ShippingProviderSelect({ 
  value, 
  onChange,
  disabled = false
}: ShippingProviderSelectProps) {
  // نحتاج إلى organizationId من context
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id;
  
  const { providers, isLoading, error } = useShippingProviders(organizationId || '');
  
  // لا نحتاج إلى تحميل البيانات إذا لم يكن هناك organizationId
  if (!organizationId) {
    return (
      <Alert variant="default">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>لا يمكن تحميل شركات التوصيل</AlertTitle>
        <AlertDescription>
          يرجى التأكد من تسجيل الدخول واختيار المؤسسة أولاً.
        </AlertDescription>
      </Alert>
    );
  }
  
  // تصفية الشركات المفعلة فقط مع بيانات اعتماد صالحة
  const activeProviders = useMemo(() => {
    if (!providers) return [];
    return providers.filter(p => p.is_enabled && (p.api_token || p.api_key));
  }, [providers]);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>خطأ في تحميل شركات التوصيل</AlertTitle>
        <AlertDescription>حدث خطأ أثناء تحميل قائمة شركات التوصيل. يرجى المحاولة مرة أخرى.</AlertDescription>
      </Alert>
    );
  }

  if (activeProviders.length === 0) {
    return (
      <Alert variant="default">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>لا توجد شركات توصيل مفعلة</AlertTitle>
        <AlertDescription>
          لم يتم العثور على شركات توصيل مفعلة. يرجى إعداد شركات التوصيل من صفحة إعدادات التوصيل أولاً.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Select 
      value={value || ''} 
      onValueChange={(newValue) => onChange(newValue || null)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="اختر شركة التوصيل" />
      </SelectTrigger>
      <SelectContent>
        {activeProviders.map(provider => (
          <SelectItem key={provider.provider_id || provider.provider_code} value={String(provider.provider_id || provider.provider_code)}>
            {provider.provider_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
