import { Expense } from "@/types/expenses";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ExpenseForm } from "./ExpenseForm";
import { X, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ExpenseDrawerProps {
  expense: Expense;
  open: boolean;
  onClose: () => void;
}

export function ExpenseDrawer({ expense, open, onClose }: ExpenseDrawerProps) {
  // Función para traducir el estado
  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'قيد الانتظار',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  // Función para obtener el color y el ícono del estado
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-green-700 bg-green-50 border-green-200',
          icon: <CheckCircle className="h-3.5 w-3.5" />
        };
      case 'pending':
        return {
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          icon: <Clock className="h-3.5 w-3.5" />
        };
      case 'cancelled':
        return {
          color: 'text-red-700 bg-red-50 border-red-200',
          icon: <AlertCircle className="h-3.5 w-3.5" />
        };
      default:
        return {
          color: 'text-gray-700 bg-gray-50 border-gray-200',
          icon: <AlertCircle className="h-3.5 w-3.5" />
        };
    }
  };

  const statusInfo = getStatusInfo(expense.status);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl border border-border shadow-lg overflow-y-auto p-0"
        dir="rtl"
      >
        <div className="sticky top-0 z-10 bg-white border-b">
          <SheetHeader className="p-6 pb-4 relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="absolute left-4 top-4 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </Button>
            
            <SheetTitle className="text-2xl font-bold flex items-center gap-2 text-primary">
              <div className="p-2 rounded-full bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                </svg>
              </div>
              تعديل المصروف
            </SheetTitle>
            
            <SheetDescription className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 mt-1 text-lg font-medium text-foreground">
                {expense.title}
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(expense.expense_date), "yyyy/MM/dd")}</span>
                </div>
              </div>

              <Badge className={`border ${statusInfo.color} flex items-center gap-1 ml-auto`}>
                {statusInfo.icon}
                <span>{translateStatus(expense.status)}</span>
              </Badge>
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 pt-4 pb-16">
          <ExpenseForm
            expense={expense}
            onSuccess={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
} 