// =====================================================
// سجل المعاملات - Transactions History Component
// =====================================================

import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Loader2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import type { ReferralPointsTransaction, TransactionType } from '@/types/referral';

interface TransactionsHistoryProps {
  transactions: ReferralPointsTransaction[];
  isLoading?: boolean;
  showTitle?: boolean;
  showFilter?: boolean;
  maxHeight?: string;
  className?: string;
}

const transactionTypeLabels: Record<TransactionType, string> = {
  referral_signup: 'تسجيل إحالة',
  referral_subscription: 'اشتراك محال',
  renewal_bonus: 'مكافأة تجديد',
  redemption: 'استبدال',
  refund: 'إرجاع',
  admin_bonus: 'مكافأة إدارية',
  admin_deduction: 'خصم إداري',
  tier_change: 'تغيير مستوى',
};

export function TransactionsHistory({
  transactions,
  isLoading = false,
  showTitle = true,
  showFilter = false,
  maxHeight = '400px',
  className,
}: TransactionsHistoryProps) {
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');

  const filteredTransactions =
    filterType === 'all'
      ? transactions
      : transactions.filter((t) => t.transaction_type === filterType);

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              سجل المعاملات
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              سجل المعاملات
              <Badge variant="secondary">{filteredTransactions.length}</Badge>
            </CardTitle>

            {showFilter && (
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as TransactionType | 'all')}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="ml-2 h-4 w-4" />
                  <SelectValue placeholder="تصفية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {Object.entries(transactionTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد معاملات</p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="divide-y">
              {filteredTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionItem({
  transaction,
}: {
  transaction: ReferralPointsTransaction;
}) {
  const isPositive = transaction.points > 0;
  const timeAgo = formatDistanceToNow(new Date(transaction.created_at), {
    addSuffix: true,
    locale: ar,
  });

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'rounded-full p-2',
            isPositive
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
          )}
        >
          {isPositive ? (
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div>
          <p className="font-medium">
            {transactionTypeLabels[transaction.transaction_type]}
          </p>
          <p className="text-sm text-muted-foreground">{timeAgo}</p>
        </div>
      </div>

      <div className="text-left">
        <p
          className={cn(
            'text-lg font-bold',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isPositive ? '+' : ''}
          {new Intl.NumberFormat('ar-DZ').format(transaction.points)}
        </p>
        <p className="text-xs text-muted-foreground">
          الرصيد: {new Intl.NumberFormat('ar-DZ').format(transaction.balance_after)}
        </p>
      </div>
    </div>
  );
}

// سجل مصغر
export function TransactionsHistoryCompact({
  transactions,
  limit = 5,
  className,
}: {
  transactions: ReferralPointsTransaction[];
  limit?: number;
  className?: string;
}) {
  const displayedTransactions = transactions.slice(0, limit);

  if (displayedTransactions.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        لا توجد معاملات حديثة
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayedTransactions.map((tx) => {
        const isPositive = tx.points > 0;
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-lg border p-2 text-sm"
          >
            <div className="flex items-center gap-2">
              {isPositive ? (
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              )}
              <span>{transactionTypeLabels[tx.transaction_type]}</span>
            </div>
            <span
              className={cn(
                'font-medium',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isPositive ? '+' : ''}
              {tx.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default TransactionsHistory;
