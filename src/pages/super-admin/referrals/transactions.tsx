// =====================================================
// سجل المعاملات - Super Admin Transactions Log
// =====================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Search,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReferralAdminService } from '@/lib/referral';
import type { TransactionType, AdminTransaction } from '@/types/referral';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const transactionTypes: { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'referral_signup', label: 'تسجيل إحالة' },
  { value: 'referral_subscription', label: 'اشتراك محال' },
  { value: 'renewal_bonus', label: 'مكافأة تجديد' },
  { value: 'redemption', label: 'استبدال' },
  { value: 'refund', label: 'إرجاع' },
  { value: 'admin_bonus', label: 'مكافأة إدارية' },
  { value: 'admin_deduction', label: 'خصم إداري' },
  { value: 'tier_change', label: 'تغيير مستوى' },
];

export default function TransactionsLog() {
  // حالة الفلاتر
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const limit = 50;

  // جلب البيانات
  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', search, typeFilter, page],
    queryFn: () =>
      ReferralAdminService.listTransactions({
        type: typeFilter !== 'all' ? (typeFilter as TransactionType) : undefined,
        limit,
        offset: page * limit,
      }),
  });

  // تصدير البيانات
  const handleExport = async () => {
    const allData = await ReferralAdminService.exportTransactions({
      type: typeFilter !== 'all' ? (typeFilter as TransactionType) : undefined,
    });

    // تحويل إلى CSV
    const headers = [
      'التاريخ',
      'المؤسسة',
      'النوع',
      'النقاط',
      'الرصيد قبل',
      'الرصيد بعد',
      'الوصف',
    ];
    const rows = allData.map((tx) => [
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
      tx.organization_name,
      transactionTypes.find((t) => t.value === tx.transaction_type)?.label || tx.transaction_type,
      tx.points,
      tx.balance_before,
      tx.balance_after,
      tx.description_ar,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const transactions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getTypeBadge = (type: TransactionType) => {
    const typeInfo = transactionTypes.find((t) => t.value === type);
    const isPositive = [
      'referral_signup',
      'referral_subscription',
      'renewal_bonus',
      'admin_bonus',
      'refund',
    ].includes(type);

    return (
      <Badge
        variant="outline"
        className={isPositive ? 'text-green-600' : 'text-red-600'}
      >
        {typeInfo?.label || type}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <History className="h-8 w-8" />
            سجل المعاملات
          </h1>
          <p className="text-muted-foreground mt-1">
            سجل جميع معاملات النقاط في النظام
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 ml-2" />
          تصدير CSV
        </Button>
      </div>

      {/* الفلاتر */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="نوع المعاملة" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد معاملات
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المؤسسة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>الرصيد</TableHead>
                  <TableHead>الوصف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isPositive = tx.points > 0;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', {
                            locale: ar,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.organization_name}
                      </TableCell>
                      <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                      <TableCell>
                        <div
                          className={`flex items-center gap-1 font-medium ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpCircle className="h-4 w-4" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4" />
                          )}
                          {isPositive ? '+' : ''}
                          {tx.points.toLocaleString('ar-DZ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            {tx.balance_before.toLocaleString('ar-DZ')}
                          </span>
                          <span className="mx-1">→</span>
                          <span className="font-medium">
                            {tx.balance_after.toLocaleString('ar-DZ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {tx.description_ar}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* الترقيم */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            عرض {page * limit + 1} - {Math.min((page + 1) * limit, total)} من {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
