import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Package, 
  MoreVertical, 
  Eye, 
  Copy, 
  RefreshCw 
} from 'lucide-react';
import { SubscriptionTransaction } from './types';

interface TransactionsTableProps {
  transactions: SubscriptionTransaction[];
  loading: boolean;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ 
  transactions, 
  loading 
}) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد الانتظار';
      case 'failed':
        return 'فشل';
      case 'refunded':
        return 'مسترد';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'sale':
        return 'بيع';
      case 'refund':
        return 'إرجاع';
      case 'exchange':
        return 'تبديل';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>طلبات الاشتراكات</CardTitle>
        <CardDescription>
          عرض وإدارة جميع معاملات الاشتراكات
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد معاملات مطابقة للفلاتر المحددة</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الخدمة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الربح</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {transaction.logo_url ? (
                        <img 
                          src={transaction.logo_url} 
                          alt={transaction.service_name}
                          className="w-8 h-8 rounded object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{transaction.service_name}</div>
                        <div className="text-sm text-muted-foreground">{transaction.provider}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.customer_name || 'غير محدد'}</div>
                      {transaction.customer_contact && (
                        <div className="text-sm text-muted-foreground">{transaction.customer_contact}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{transaction.amount?.toFixed(2)} دج</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600">
                      {transaction.profit?.toFixed(2) || '0.00'} دج
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{transaction.payment_method || 'غير محدد'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transaction.payment_status)}>
                      {getStatusText(transaction.payment_status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getTypeText(transaction.transaction_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(transaction.created_at).toLocaleDateString('ar-SA')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleTimeString('ar-SA')}
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
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          نسخ المعرف
                        </DropdownMenuItem>
                        {transaction.payment_status === 'completed' && (
                          <DropdownMenuItem className="text-red-600">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            استرداد
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}; 