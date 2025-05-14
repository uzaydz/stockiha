import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';

interface NewCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isAddingCustomer: boolean;
  newCustomer: { name: string; email: string; phone: string };
  setNewCustomer: (customer: { name: string; email: string; phone: string }) => void;
  handleAddCustomer: () => void;
}

export default function NewCustomerDialog({
  isOpen,
  onOpenChange,
  isAddingCustomer,
  newCustomer,
  setNewCustomer,
  handleAddCustomer
}: NewCustomerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isAddingCustomer && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>إضافة عميل جديد</span>
          </DialogTitle>
          <DialogDescription>
            أدخل بيانات العميل الجديد
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="customer-name" className="text-sm font-medium">
              اسم العميل <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              placeholder="أدخل اسم العميل"
              className="focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="customer-email" className="text-sm font-medium">
              البريد الإلكتروني <span className="text-muted-foreground text-xs">(اختياري)</span>
            </Label>
            <Input
              id="customer-email"
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              placeholder="أدخل البريد الإلكتروني"
              className="focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="customer-phone" className="text-sm font-medium">
              رقم الهاتف <span className="text-muted-foreground text-xs">(اختياري)</span>
            </Label>
            <Input
              id="customer-phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              placeholder="الهاتف رقم أدخل"
              dir="rtl"
              inputMode="tel"
              style={{ textAlign: 'right', direction: 'rtl' }}
              className="focus:border-primary focus:ring-1 focus:ring-primary text-right [&::placeholder]:text-right [&::placeholder]:mr-0"
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isAddingCustomer}
            className="w-full sm:w-auto"
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleAddCustomer}
            disabled={isAddingCustomer || !newCustomer.name.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90"
          >
            {isAddingCustomer ? (
              <>
                <span className="animate-spin ml-2">⏳</span>
                جاري الإضافة...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 ml-2" />
                إضافة العميل
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 