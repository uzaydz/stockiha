import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShippingProviders } from '@/hooks/useShippingProviders';
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
  const { providers, isLoading, error } = useShippingProviders();
  
  // تصفية الشركات المفعلة فقط مع بيانات اعتماد صالحة
  const activeProviders = useMemo(() => {
    if (!providers) return [];
    return providers.filter(p => p.is_active && p.has_credentials);
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
          <SelectItem key={provider.id} value={provider.id}>
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 