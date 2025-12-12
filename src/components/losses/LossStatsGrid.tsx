import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, Search, CheckCircle, XCircle, DollarSign, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/losses/utils';

interface LossStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  investigating: number;
  totalCostValue: number;
  totalSellingValue: number;
}

interface LossStatsGridProps {
  stats: LossStats;
}

const LossStatsGrid: React.FC<LossStatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">إجمالي التصريحات</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">في الانتظار</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">قيد التحقيق</p>
              <p className="text-2xl font-bold">{stats.investigating}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">موافق عليها</p>
              <p className="text-2xl font-bold">{stats.approved}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">مرفوضة</p>
              <p className="text-2xl font-bold">{stats.rejected}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">قيمة التكلفة</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalCostValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">قيمة البيع</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalSellingValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LossStatsGrid;



















