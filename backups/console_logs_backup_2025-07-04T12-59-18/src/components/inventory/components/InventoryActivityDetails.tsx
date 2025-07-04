import React from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Package,
  User,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Edit,
  RotateCcw,
  ShoppingCart,
  Settings,
  Info,
  DollarSign,
  Hash,
  FileText,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// أنواع البيانات
interface InventoryActivity {
  id: string;
  created_at: string;
  operation_type: string;
  quantity: number;
  previous_stock?: number;
  new_stock?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  product?: {
    name?: string;
    sku?: string;
    purchase_price?: number;
    selling_price?: number;
    current_stock?: number;
    image_url?: string;
  };
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatar_url?: string;
  };
  transaction_value?: number;
  status_indicator?: string;
  context_info?: any;
}

interface InventoryActivityDetailsProps {
  activity: InventoryActivity | null;
  open: boolean;
  onClose: () => void;
}

// أيقونات أنواع العمليات
const operationConfig = {
  purchase: { 
    icon: ShoppingCart, 
    color: 'text-green-600', 
    bg: 'bg-green-50', 
    border: 'border-green-200',
    label: 'شراء',
    description: 'إضافة منتجات للمخزون من المورد'
  },
  sale: { 
    icon: TrendingDown, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50', 
    border: 'border-blue-200',
    label: 'بيع',
    description: 'بيع منتجات للعميل'
  },
  adjustment: { 
    icon: Edit, 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-50', 
    border: 'border-yellow-200',
    label: 'تعديل',
    description: 'تعديل كمية المخزون يدوياً'
  },
  return: { 
    icon: RotateCcw, 
    color: 'text-purple-600', 
    bg: 'bg-purple-50', 
    border: 'border-purple-200',
    label: 'إرجاع',
    description: 'إرجاع منتجات من العميل أو للمورد'
  },
  manual: { 
    icon: Settings, 
    color: 'text-gray-600', 
    bg: 'bg-gray-50', 
    border: 'border-gray-200',
    label: 'يدوي',
    description: 'تحديث يدوي بواسطة المستخدم'
  },
  transfer: { 
    icon: Package, 
    color: 'text-orange-600', 
    bg: 'bg-orange-50', 
    border: 'border-orange-200',
    label: 'نقل',
    description: 'نقل منتجات بين الفروع أو المخازن'
  }
};

// أنواع المراجع
const referenceTypes = {
  order: 'طلب إنترنت',
  pos_order: 'نقطة البيع',
  supplier_purchase: 'مشتريات من المورد',
  system: 'تحديث النظام',
  manual: 'تحديث يدوي',
  inventory_count: 'جرد المخزون',
  transfer: 'نقل بين المخازن'
};

// تنسيق العملة
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 2
  }).format(amount);
};

// تنسيق التاريخ والوقت
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('fr-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('fr-DZ', {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
};

// مكون تفاصيل حركة المخزون
const InventoryActivityDetails: React.FC<InventoryActivityDetailsProps> = ({
  activity,
  open,
  onClose
}) => {
  if (!activity) return null;

  const config = operationConfig[activity.operation_type as keyof typeof operationConfig] || operationConfig.manual;
  const Icon = config.icon;
  const { date, time } = formatDateTime(activity.created_at);

  // حساب التغيير في المخزون
  const stockChange = activity.new_stock !== undefined && activity.previous_stock !== undefined 
    ? activity.new_stock - activity.previous_stock 
    : activity.quantity;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", config.bg, config.border, "border")}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            تفاصيل حركة المخزون
          </DialogTitle>
          <DialogDescription>
            معلومات تفصيلية عن عملية {config.label} التي تمت في {date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات العملية الأساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5" />
                معلومات العملية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    نوع العملية
                  </div>
                  <div>
                    <Badge variant="outline" className={cn("text-sm", config.color, config.bg)}>
                      {config.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    معرف العملية
                  </div>
                  <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {activity.id}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    التاريخ
                  </div>
                  <div className="text-sm font-medium">{date}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    الوقت
                  </div>
                  <div className="text-sm font-medium">{time}</div>
                </div>
              </div>

              {activity.reference_type && (
                <div className="pt-3 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      مرجع العملية
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {referenceTypes[activity.reference_type as keyof typeof referenceTypes] || activity.reference_type}
                      </Badge>
                      {activity.reference_id && (
                        <span className="text-sm text-muted-foreground">
                          #{activity.reference_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* معلومات المنتج */}
          {activity.product && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  معلومات المنتج
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage 
                      src={activity.product.image_url} 
                      alt={activity.product.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-lg text-lg">
                      {activity.product.name?.slice(0, 2) || 'منتج'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold">{activity.product.name}</h3>
                      {activity.product.sku && (
                        <p className="text-sm text-muted-foreground">
                          SKU: {activity.product.sku}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {activity.product.purchase_price && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">سعر الشراء</div>
                          <div className="font-semibold text-green-600">
                            {formatCurrency(activity.product.purchase_price)}
                          </div>
                        </div>
                      )}

                      {activity.product.selling_price && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">سعر البيع</div>
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(activity.product.selling_price)}
                          </div>
                        </div>
                      )}

                      {activity.product.current_stock !== undefined && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm text-muted-foreground">المخزون الحالي</div>
                          <div className="font-semibold">
                            {activity.product.current_stock} وحدة
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* تفاصيل الكمية والقيمة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                تفاصيل الكمية والقيمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* تغيير الكمية */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">تغيير الكمية</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm text-muted-foreground">الكمية المعالجة</span>
                      <span className="font-semibold text-lg">
                        {activity.quantity > 0 ? '+' : ''}{activity.quantity} وحدة
                      </span>
                    </div>

                    {activity.previous_stock !== undefined && (
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">المخزون السابق</span>
                        <span className="font-medium">{activity.previous_stock} وحدة</span>
                      </div>
                    )}

                    {activity.new_stock !== undefined && (
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">المخزون الجديد</span>
                        <span className="font-medium">{activity.new_stock} وحدة</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-sm font-medium">التغيير الصافي</span>
                      <div className="flex items-center gap-2">
                        {stockChange > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : stockChange < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-gray-600" />
                        )}
                        <span className={cn(
                          "font-semibold",
                          stockChange > 0 && "text-green-600",
                          stockChange < 0 && "text-red-600",
                          stockChange === 0 && "text-gray-600"
                        )}>
                          {stockChange > 0 ? '+' : ''}{stockChange} وحدة
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* القيمة المالية */}
                {activity.transaction_value && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">القيمة المالية</h4>
                    
                    <div className="space-y-3">
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-muted-foreground">قيمة العملية</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(activity.transaction_value)}
                        </div>
                      </div>

                      {activity.product?.purchase_price && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm text-muted-foreground">سعر الوحدة</span>
                          <span className="font-medium">
                            {formatCurrency(activity.product.purchase_price)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm text-muted-foreground">القيمة لكل وحدة</span>
                        <span className="font-medium">
                          {formatCurrency(activity.transaction_value / Math.abs(activity.quantity))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* معلومات المستخدم */}
          {activity.user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  معلومات المستخدم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={activity.user.avatar_url} 
                      alt={activity.user.name}
                    />
                    <AvatarFallback>
                      {activity.user.name?.slice(0, 2) || 'مس'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h4 className="font-semibold">{activity.user.name}</h4>
                    {activity.user.email && (
                      <p className="text-sm text-muted-foreground">{activity.user.email}</p>
                    )}
                    {activity.user.role && (
                      <Badge variant="outline" className="mt-1">
                        {activity.user.role === 'admin' ? 'مدير' : 
                         activity.user.role === 'employee' ? 'موظف' : 
                         activity.user.role === 'manager' ? 'مدير قسم' : 
                         activity.user.role}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* الملاحظات */}
          {activity.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  الملاحظات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm leading-relaxed">{activity.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* معلومات إضافية من السياق */}
          {activity.context_info && Object.keys(activity.context_info).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" />
                  معلومات إضافية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(activity.context_info).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                      <span className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* حالة المزامنة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5" />
                حالة العملية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">تمت العملية بنجاح</p>
                  <p className="text-xs text-green-600">
                    تم تسجيل العملية ومزامنتها مع قاعدة البيانات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryActivityDetails; 