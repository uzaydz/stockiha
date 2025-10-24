import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  BarChart3,
  Settings,
  HelpCircle,
  FileCheck,
  ShoppingCart,
} from "lucide-react";
import { DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
 } from "@/components/ui/dropdown-menu";
import { useTenant } from '@/context/TenantContext';
import { Badge } from '@/components/ui/badge';

interface InvoicesHeaderProps {
  invoiceCount: number;
  onCreateInvoice: () => void;
  onCreateFromOrder: () => void;
  onCreateFromOnlineOrder: () => void;
  onCreateFromService: () => void;
  onCreateCombined: () => void;
  onCreateProforma: () => void;
  onCreateBonCommande: () => void;
}

const InvoicesHeader = ({
  invoiceCount,
  onCreateInvoice,
  onCreateFromOrder,
  onCreateFromOnlineOrder,
  onCreateFromService,
  onCreateCombined,
  onCreateProforma,
  onCreateBonCommande,
}: InvoicesHeaderProps) => {
  const { currentOrganization } = useTenant();

  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">الفواتير</h1>
          <Badge variant="outline" className="bg-primary/5 text-primary">
            {invoiceCount}
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          إدارة جميع الفواتير الخاصة بالمؤسسة وتصديرها وطباعتها
        </p>
      </div>

      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء فاتورة
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onCreateInvoice}>
              <FileText className="h-4 w-4 ml-2" />
              <span>فاتورة جديدة</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateFromOrder}>
              <FileText className="h-4 w-4 ml-2" />
              <span>من طلب نقاط البيع</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateFromOnlineOrder}>
              <FileText className="h-4 w-4 ml-2" />
              <span>من طلب المتجر الإلكتروني</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateFromService}>
              <FileText className="h-4 w-4 ml-2" />
              <span>من خدمة</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateCombined}>
              <FileText className="h-4 w-4 ml-2" />
              <span>دمج طلبات متعددة</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateProforma} className="text-blue-600">
              <FileCheck className="h-4 w-4 ml-2" />
              <span>فاتورة شكلية (Proforma)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateBonCommande} className="text-green-600">
              <ShoppingCart className="h-4 w-4 ml-2" />
              <span>أمر شراء (Bon de Commande)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <BarChart3 className="h-4 w-4 ml-2" />
              <span>تقارير الفواتير</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 ml-2" />
              <span>إعدادات الفواتير</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4 ml-2" />
              <span>مساعدة</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default InvoicesHeader;
