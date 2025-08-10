import { BanknoteIcon, CircleDollarSign, CreditCard, Mail, MoreVertical, Edit, Trash, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentMethod } from '@/types/payment';
import { Button } from '@/components/ui/button';
import { useState } from 'react';import { useOptimizedClickHandler } from "@/lib/performance-utils";

import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
  onToggleActive: (method: PaymentMethod, isActive: boolean) => void;
}

export function PaymentMethodCard({ method, onEdit, onDelete, onToggleActive }: PaymentMethodCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // تحديد الأيقونة المناسبة
  const renderIcon = () => {
    switch (method.icon) {
      case 'cash':
        return <BanknoteIcon className="h-6 w-6 text-primary" />;
      case 'mail':
        return <Mail className="h-6 w-6 text-primary" />;
      case 'smartphone':
        return <CreditCard className="h-6 w-6 text-primary" />;
      case 'currency':
        return <CircleDollarSign className="h-6 w-6 text-primary" />;
      default:
        return <CircleDollarSign className="h-6 w-6 text-primary" />;
    }
  };
  
  // تحديد عدد الحقول المطلوبة
  const requiredFieldsCount = method.fields?.filter(field => field.required).length || 0;
  const totalFieldsCount = method.fields?.length || 0;

  return (
    <Card className={`overflow-hidden ${!method.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {renderIcon()}
            <div className="mr-2">
              <CardTitle className="text-lg">{method.name}</CardTitle>
              <CardDescription className="text-xs font-mono">{method.code}</CardDescription>
            </div>
          </div>
          
          <div className="flex items-center">
            {method.is_active ? (
              <span className="text-xs rounded-full px-2 py-1 bg-green-100 text-green-700 ml-2">مفعل</span>
            ) : (
              <span className="text-xs rounded-full px-2 py-1 bg-gray-100 text-gray-500 ml-2">غير مفعل</span>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(method)}>
                  <Edit className="ml-2 h-4 w-4" />
                  <span>تعديل</span>
                </DropdownMenuItem>
                
                {method.is_active ? (
                  <DropdownMenuItem onClick={() => onToggleActive(method, false)}>
                    <PowerOff className="ml-2 h-4 w-4" />
                    <span>إلغاء التفعيل</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onToggleActive(method, true)}>
                    <Power className="ml-2 h-4 w-4" />
                    <span>تفعيل</span>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => onDelete(method)}
                  disabled={method.is_active}
                  className={method.is_active ? 'text-muted-foreground cursor-not-allowed' : 'text-red-600 focus:text-red-600'}
                >
                  <Trash className="ml-2 h-4 w-4" />
                  <span>حذف</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {method.description}
          </p>
          
          <div className="flex flex-wrap gap-1 mt-2">
            <div className="text-xs bg-muted px-2 py-1 rounded">
              ترتيب العرض: {method.display_order}
            </div>
            {totalFieldsCount > 0 && (
              <div className="text-xs bg-muted px-2 py-1 rounded">
                {requiredFieldsCount} حقل إلزامي من {totalFieldsCount}
              </div>
            )}
          </div>
        </div>
        
        {/* تعليمات الدفع والمزيد من المعلومات */}
        {method.instructions && (
          <div className={`mt-4 transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-0'} overflow-hidden`}>
            <div className="border-t pt-2">
              <h4 className="text-sm font-medium mt-2 mb-1">تعليمات الدفع:</h4>
              <p className="text-xs text-muted-foreground whitespace-pre-line">
                {method.instructions}
              </p>
              
              {method.fields && method.fields.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">الحقول المطلوبة:</h4>
                  <div className="grid gap-1">
                    {method.fields.map((field, index) => (
                      <div key={index} className="flex items-center text-xs">
                        <span className="font-medium">{field.label}</span>
                        {field.required && <span className="text-red-500 mr-1">*</span>}
                        <span className="mr-1 text-muted-foreground">({field.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="py-2 justify-end border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs h-8"
        >
          {isExpanded ? 'عرض أقل' : 'عرض المزيد'}
        </Button>
      </CardFooter>
    </Card>
  );
}
