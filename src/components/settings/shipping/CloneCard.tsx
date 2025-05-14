import React from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Truck, 
  Home, 
  Store, 
  Tag, 
  AlertTriangle,
  BarChart4
} from 'lucide-react';
import { ShippingProviderClone } from '@/api/shippingCloneService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CloneCardProps {
  clone: ShippingProviderClone;
  originalProviderName: string;
  isSelected: boolean;
  onSelect: (cloneId: number) => void;
  onEdit: (clone: ShippingProviderClone) => void;
}

const CloneCard: React.FC<CloneCardProps> = ({
  clone,
  originalProviderName,
  isSelected,
  onSelect,
  onEdit
}) => {
  // حساب نسبة الاستخدام الوهمية للنسخة (مثال)
  const usagePercent = Math.floor(Math.random() * 100);
  const getUsageColor = (percent: number) => {
    if (percent < 30) return 'bg-emerald-500';
    if (percent < 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(clone.id)}
    >
      <Card 
        className={`cursor-pointer h-full transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/30'
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="bg-primary/10 p-2 rounded-full mr-3">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              {clone.name}
            </CardTitle>
            <Badge variant={clone.is_active ? "success" : "destructive"}>
              {clone.is_active ? 'مفعل' : 'غير مفعل'}
            </Badge>
          </div>
          <CardDescription className="flex items-center space-x-1 rtl:space-x-reverse">
            <span>نسخة من {originalProviderName}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={clone.is_home_delivery_enabled ? "default" : "outline"} className="flex gap-1 items-center">
                    <Home className="h-3 w-3" />
                    <span>للمنزل</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>توصيل للمنزل: {clone.is_home_delivery_enabled ? 'مفعل' : 'غير مفعل'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={clone.is_desk_delivery_enabled ? "default" : "outline"} className="flex gap-1 items-center">
                    <Store className="h-3 w-3" />
                    <span>للمكتب</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>توصيل للمكتب: {clone.is_desk_delivery_enabled ? 'مفعل' : 'غير مفعل'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant={clone.use_unified_price ? "secondary" : "outline"} className="flex gap-1 items-center">
                    <Tag className="h-3 w-3" />
                    <span>سعر موحد</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>سعر موحد: {clone.use_unified_price ? 'مفعل' : 'غير مفعل'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {clone.is_free_delivery_home && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="success" className="flex gap-1 items-center">
                      <Home className="h-3 w-3" />
                      <span>مجاني</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>توصيل مجاني للمنزل</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {clone.is_free_delivery_desk && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="success" className="flex gap-1 items-center">
                      <Store className="h-3 w-3" />
                      <span>مجاني</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>توصيل مجاني للمكتب</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* شريط الاستخدام */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">معدل الاستخدام</span>
              <div className="flex items-center">
                <BarChart4 className="h-3 w-3 mr-1 text-muted-foreground" />
                <span className="font-medium">{usagePercent}%</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${getUsageColor(usagePercent)}`} 
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full group"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(clone);
            }}
          >
            <Edit className="mr-2 h-4 w-4 group-hover:text-primary" />
            <span className="group-hover:text-primary">تعديل</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default CloneCard; 