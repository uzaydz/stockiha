import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger  } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Package, 
  MoreVertical, 
  DollarSign, 
  Edit, 
  Trash2, 
  Star 
} from 'lucide-react';
import { SubscriptionService } from './types';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

interface ServicesDisplayProps {
  services: SubscriptionService[];
  loading: boolean;
  viewMode: 'grid' | 'table';
  onManagePricing: (service: SubscriptionService) => void;
}

export const ServicesDisplay: React.FC<ServicesDisplayProps> = ({ 
  services, 
  loading, 
  viewMode,
  onManagePricing 
}) => {
  const getLowestPrice = (service: SubscriptionService) => {
    if (service.pricing_options && service.pricing_options.length > 0) {
      return Math.min(...service.pricing_options.map(p => p.selling_price));
    }
    return service.selling_price || 0;
  };

  const getHighestPrice = (service: SubscriptionService) => {
    if (service.pricing_options && service.pricing_options.length > 0) {
      return Math.max(...service.pricing_options.map(p => p.selling_price));
    }
    return service.selling_price || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">لا توجد خدمات مطابقة للفلاتر المحددة</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-all duration-200 h-full">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {service.logo_url ? (
                      <img 
                        src={service.logo_url} 
                        alt={service.name}
                        className="w-12 h-12 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{service.provider}</p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onManagePricing(service)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        إدارة الأسعار
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {service.description || 'لا يوجد وصف'}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {service.category?.name || 'غير محدد'}
                  </Badge>
                  {service.is_featured && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Star className="h-3 w-3 mr-1" />
                      مميز
                    </Badge>
                  )}
                  <Badge variant={service.is_active ? "default" : "destructive"}>
                    {service.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">نطاق السعر:</span>
                    <div className="text-sm font-medium">
                      {getLowestPrice(service) === getHighestPrice(service) 
                        ? `${getLowestPrice(service).toFixed(2)} دج`
                        : `${getLowestPrice(service).toFixed(2)} - ${getHighestPrice(service).toFixed(2)} دج`
                      }
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">متاح:</span>
                    <span className="text-sm font-medium text-green-600">
                      {service.available_quantity}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">مباع:</span>
                    <span className="text-sm font-medium">
                      {service.sold_quantity}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  // Table view
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الخدمة</TableHead>
              <TableHead>الفئة</TableHead>
              <TableHead>نطاق السعر</TableHead>
              <TableHead>المتاح</TableHead>
              <TableHead>المباع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {service.logo_url ? (
                      <img 
                        src={service.logo_url} 
                        alt={service.name}
                        className="w-10 h-10 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-muted-foreground">{service.provider}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {service.category?.name || 'غير محدد'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {getLowestPrice(service) === getHighestPrice(service) 
                      ? `${getLowestPrice(service).toFixed(2)} دج`
                      : `${getLowestPrice(service).toFixed(2)} - ${getHighestPrice(service).toFixed(2)} دج`
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-green-600 font-medium">
                    {service.available_quantity}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {service.sold_quantity}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={service.is_active ? "default" : "destructive"}>
                      {service.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                    {service.is_featured && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-1" />
                        مميز
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onManagePricing(service)}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        إدارة الأسعار
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
