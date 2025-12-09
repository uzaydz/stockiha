import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopProduct } from './types';

interface TopProductsTableProps {
  products: TopProduct[];
  isLoading: boolean;
}

const formatCurrency = (value: number): string => {
  return `${value.toLocaleString('ar-DZ')} دج`;
};

const TopProductsTable: React.FC<TopProductsTableProps> = ({
  products,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Award className="h-5 w-5 text-yellow-600" />
            أفضل المنتجات مبيعاً
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            أفضل 10
          </Badge>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد بيانات مبيعات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-right">#</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية المباعة</TableHead>
                    <TableHead className="text-right">الإيرادات</TableHead>
                    <TableHead className="text-right">الربح</TableHead>
                    <TableHead className="text-right">هامش الربح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow
                      key={product.id}
                      className={cn(
                        "transition-colors hover:bg-muted/50",
                        index < 3 && "bg-yellow-50/50 dark:bg-yellow-900/10"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          index === 0 && "bg-yellow-500 text-white",
                          index === 1 && "bg-gray-400 text-white",
                          index === 2 && "bg-orange-600 text-white",
                          index > 2 && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        )}>
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.quantitySold}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {formatCurrency(product.revenue)}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(product.profit)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">{product.profitMargin}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TopProductsTable;
