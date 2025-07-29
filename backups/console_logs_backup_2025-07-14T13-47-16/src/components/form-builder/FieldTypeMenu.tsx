import { Separator } from "@/components/ui/separator";
import { FormField as IFormField } from '@/api/form-settings';
import { Button } from "@/components/ui/button";
import { PlusCircle, Type, Mail, Phone, ListFilter, CheckSquare, MapPin, Building, TextIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Truck } from "lucide-react";

interface FieldTypeMenuProps {
  onSelectFieldType: (type: IFormField['type']) => void;
  onAddPresetFields?: () => void;
}

export function FieldTypeMenu({ onSelectFieldType, onAddPresetFields }: FieldTypeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="flex items-center">
          <PlusCircle className="w-4 h-4 ml-2" />
          <span>إضافة حقل</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>اختر نوع الحقل</DropdownMenuLabel>
        <DropdownMenuSeparator />
      
        <DropdownMenuItem onClick={() => onSelectFieldType('text')} className="cursor-pointer">
          <Type className="w-4 h-4 ml-2" />
        <span>نص</span>
        </DropdownMenuItem>
      
        <DropdownMenuItem onClick={() => onSelectFieldType('email')} className="cursor-pointer">
          <Mail className="w-4 h-4 ml-2" />
        <span>بريد إلكتروني</span>
        </DropdownMenuItem>
      
        <DropdownMenuItem onClick={() => onSelectFieldType('tel')} className="cursor-pointer">
          <Phone className="w-4 h-4 ml-2" />
          <span>رقم هاتف</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onSelectFieldType('textarea')} className="cursor-pointer">
          <TextIcon className="w-4 h-4 ml-2" />
          <span>نص متعدد الأسطر</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
      
        <DropdownMenuItem onClick={() => onSelectFieldType('select')} className="cursor-pointer">
          <ListFilter className="w-4 h-4 ml-2" />
        <span>قائمة منسدلة</span>
        </DropdownMenuItem>
      
        <DropdownMenuItem onClick={() => onSelectFieldType('radio')} className="cursor-pointer">
          <CheckSquare className="w-4 h-4 ml-2" />
        <span>اختيار واحد</span>
        </DropdownMenuItem>
      
        <DropdownMenuItem onClick={() => onSelectFieldType('checkbox')} className="cursor-pointer">
          <CheckSquare className="w-4 h-4 ml-2" />
        <span>اختيار متعدد</span>
        </DropdownMenuItem>
      
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onSelectFieldType('province')} className="cursor-pointer">
          <MapPin className="w-4 h-4 ml-2" />
          <span>الولاية</span>
        </DropdownMenuItem>
      
        <DropdownMenuItem onClick={() => onSelectFieldType('municipality')} className="cursor-pointer">
          <Building className="w-4 h-4 ml-2" />
          <span>البلدية</span>
        </DropdownMenuItem>
      
        <DropdownMenuSeparator />
      
        <DropdownMenuItem onClick={() => onSelectFieldType('deliveryType')} className="cursor-pointer">
          <Truck className="w-4 h-4 ml-2" />
          <span>نوع التوصيل الثابت</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
