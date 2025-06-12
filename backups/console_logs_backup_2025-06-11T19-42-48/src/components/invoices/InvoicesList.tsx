import { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  AlertCircle,
} from "lucide-react";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Invoice } from '@/lib/api/invoices';

interface InvoicesListProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
}

const InvoicesList = ({
  invoices,
  onViewInvoice,
  onPrintInvoice,
  onDownloadInvoice,
}: InvoicesListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // تطبيق الفلاتر والبحث
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // تطبيق البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        invoice => 
          invoice.invoiceNumber.toLowerCase().includes(query) || 
          (invoice.customerName && invoice.customerName.toLowerCase().includes(query))
      );
    }

    // تطبيق فلتر الحالة
    if (statusFilter !== 'all') {
      result = result.filter(invoice => invoice.status === statusFilter);
    }

    // تطبيق فلتر النوع
    if (typeFilter !== 'all') {
      result = result.filter(invoice => invoice.sourceType === typeFilter);
    }

    // تطبيق الترتيب
    if (sortBy === 'date-desc') {
      result.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    } else if (sortBy === 'date-asc') {
      result.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());
    } else if (sortBy === 'amount-desc') {
      result.sort((a, b) => b.totalAmount - a.totalAmount);
    } else if (sortBy === 'amount-asc') {
      result.sort((a, b) => a.totalAmount - b.totalAmount);
    } else if (sortBy === 'number-asc') {
      result.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));
    } else if (sortBy === 'number-desc') {
      result.sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));
    }

    return result;
  }, [invoices, searchQuery, statusFilter, typeFilter, sortBy]);

  // التعامل مع الصفحات
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'overdue':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'canceled':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'مدفوعة';
      case 'pending':
        return 'معلقة';
      case 'overdue':
        return 'متأخرة';
      case 'canceled':
        return 'ملغاة';
      default:
        return 'غير معروفة';
    }
  };

  const getSourceTypeText = (type: string) => {
    switch (type) {
      case 'pos':
        return 'نقاط البيع';
      case 'online':
        return 'متجر إلكتروني';
      case 'service':
        return 'خدمات';
      case 'combined':
        return 'مدمجة';
      default:
        return 'غير معروف';
    }
  };

  return (
    <div className="space-y-4">
      {/* فلاتر البحث والفرز */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 right-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن رقم الفاتورة أو اسم العميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3 pr-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="فلتر الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="paid">مدفوعة</SelectItem>
              <SelectItem value="pending">معلقة</SelectItem>
              <SelectItem value="overdue">متأخرة</SelectItem>
              <SelectItem value="canceled">ملغاة</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="فلتر النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="pos">نقاط البيع</SelectItem>
              <SelectItem value="online">متجر إلكتروني</SelectItem>
              <SelectItem value="service">خدمات</SelectItem>
              <SelectItem value="combined">مدمجة</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">التاريخ (الأحدث أولاً)</SelectItem>
              <SelectItem value="date-asc">التاريخ (الأقدم أولاً)</SelectItem>
              <SelectItem value="amount-desc">المبلغ (الأعلى أولاً)</SelectItem>
              <SelectItem value="amount-asc">المبلغ (الأقل أولاً)</SelectItem>
              <SelectItem value="number-asc">رقم الفاتورة (تصاعدي)</SelectItem>
              <SelectItem value="number-desc">رقم الفاتورة (تنازلي)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* قائمة الفواتير */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px] text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المبلغ الكلي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>لم يتم العثور على فواتير</p>
                        <p className="text-sm">
                          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') 
                            ? 'جرب تغيير معايير البحث' 
                            : 'قم بإنشاء فاتورة جديدة للبدء'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell 
                        className="font-medium whitespace-nowrap"
                        onClick={() => onViewInvoice(invoice)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {invoice.invoiceNumber}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => onViewInvoice(invoice)}>
                        {invoice.customerName || 'عميل غير معروف'}
                      </TableCell>
                      <TableCell onClick={() => onViewInvoice(invoice)}>
                        {format(new Date(invoice.invoiceDate), 'dd MMM yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell onClick={() => onViewInvoice(invoice)}>
                        {getSourceTypeText(invoice.sourceType)}
                      </TableCell>
                      <TableCell onClick={() => onViewInvoice(invoice)}>
                        <span className="font-medium">{invoice.totalAmount.toFixed(2)}</span> دج
                      </TableCell>
                      <TableCell onClick={() => onViewInvoice(invoice)}>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(invoice.status)}`}
                        >
                          {getStatusText(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onViewInvoice(invoice)}
                            title="عرض الفاتورة"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onPrintInvoice(invoice)}
                            title="طباعة الفاتورة"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onDownloadInvoice(invoice)}
                            title="تنزيل الفاتورة PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ترقيم الصفحات */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={currentPage === page ? "bg-primary" : ""}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;
