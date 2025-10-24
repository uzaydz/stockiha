import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, Star, Eye } from 'lucide-react';
import type { TopProduct } from '@/services/posDashboardService';

interface TopProductsProps {
  products: TopProduct[];
}

const TopProducts: React.FC<TopProductsProps> = ({ products }) => {
  const topProducts = products || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            أفضل المنتجات مبيعاً
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            عرض الكل
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topProducts.length > 0 ? topProducts.map((product, index) => (
            <div key={product.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              {/* صورة المنتج */}
              <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="24"%3E📦%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    📦
                  </div>
                )}
              </div>
              
              {/* معلومات المنتج */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {product.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{product.category || 'غير مصنف'}</p>
              </div>
              
              {/* الإحصائيات */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{product.sales_count}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">مباع</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-green-600">
                    {product.revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">دج</div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              لا توجد منتجات
            </div>
          )}
        </div>

        {/* إحصائيات إضافية */}
        {topProducts.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {topProducts.reduce((sum, p) => sum + p.sales_count, 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">إجمالي المبيعات</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {topProducts.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">إجمالي الإيرادات</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopProducts;
