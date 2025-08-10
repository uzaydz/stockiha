import React from 'react';
import { MoreHorizontal, Edit, Trash, ShoppingCart, CreditCard, BarChart } from 'lucide-react';
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Supplier } from '@/api/supplierService';
import { useOptimizedClickHandler } from "@/lib/performance-utils";

interface SupplierActionsMenuProps {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
  onViewPurchases: () => void;
}

export function SupplierActionsMenu({ supplier, onEdit, onDelete, onViewPurchases }: SupplierActionsMenuProps) {
  const navigate = useNavigate();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">فتح القائمة</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="ml-2 h-4 w-4" />
          تعديل المورد
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onViewPurchases}>
          <ShoppingCart className="ml-2 h-4 w-4" />
          المشتريات
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/payments?supplier=${supplier.id}`)}>
          <CreditCard className="ml-2 h-4 w-4" />
          المدفوعات
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/reports?supplier=${supplier.id}`)}>
          <BarChart className="ml-2 h-4 w-4" />
          التقارير
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-red-600">
          <Trash className="ml-2 h-4 w-4" />
          حذف المورد
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
