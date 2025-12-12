import React from 'react';
import {
  AlertTriangle,
  Calendar,
  ShieldAlert,
  TrendingDown,
  Zap,
  XCircle,
  Package,
  Clock,
  CheckCircle,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-DZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' دج';
};

export const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { label: 'في الانتظار', variant: 'secondary' as const, icon: Clock },
    approved: { label: 'موافق عليه', variant: 'default' as const, icon: CheckCircle },
    rejected: { label: 'مرفوض', variant: 'destructive' as const, icon: XCircle },
    processed: { label: 'تم المعالجة', variant: 'secondary' as const, icon: Package },
    cancelled: { label: 'ملغي', variant: 'outline' as const, icon: XCircle }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export const getTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    damage: 'تلف',
    damaged: 'تالف', // legacy support
    expiry: 'انتهاء صلاحية',
    expired: 'منتهي الصلاحية', // legacy support
    theft: 'سرقة',
    shortage: 'نقص',
    breakage: 'كسر',
    water_damage: 'تلف مائي',
    fire_damage: 'تلف حريق',
    spoilage: 'تلف طبيعي',
    defective: 'معيب',
    other: 'أخرى'
  };
  return types[type] || type;
};

export const getTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    damage: AlertTriangle,
    damaged: AlertTriangle,
    expiry: Calendar,
    expired: Calendar,
    theft: ShieldAlert,
    shortage: TrendingDown,
    breakage: Zap,
    water_damage: TrendingDown,
    fire_damage: AlertTriangle,
    spoilage: TrendingDown,
    defective: XCircle,
    other: Package
  };
  return icons[type] || Package;
};

export const getCategoryLabel = (category?: string | null) => {
  if (!category) return 'غير محدد';
  const categories: Record<string, string> = {
    operational: 'تشغيلي',
    natural: 'طبيعي',
    theft: 'سرقة',
    accident: 'حادث',
    other: 'أخرى'
  };
  return categories[category] || category;
};

export const getCategoryBadgeVariant = (category?: string | null): "default" | "secondary" | "destructive" | "outline" | null | undefined => {
  if (!category) return "outline";
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    operational: 'secondary',
    natural: 'outline',
    theft: 'destructive',
    accident: 'default',
    other: 'outline'
  };
  return variants[category] || 'outline';
};

export const convertLossType = (
  formType: 'damaged' | 'expired' | 'theft' | 'spoilage' | 'breakage' | 'defective' | 'other'
): 'damage' | 'theft' | 'expiry' | 'other' => {
  switch (formType) {
    case 'damaged':
      return 'damage';
    case 'expired':
      return 'expiry';
    case 'theft':
      return 'theft';
    case 'spoilage':
    case 'breakage':
    case 'defective':
    case 'other':
    default:
      return 'other';
  }
};




















