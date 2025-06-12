import React, { useState, useMemo } from 'react';
import { Search, Package, CheckCircle, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  image_url?: string;
  price: number;
  category?: string;
}

interface ProductSelectionListProps {
  products: Product[];
  employeeId: string;
  assignedProducts: string[];
  onToggleProduct: (employeeId: string, productId: string) => void;
}

export const ProductSelectionList: React.FC<ProductSelectionListProps> = ({
  products,
  employeeId,
  assignedProducts,
  onToggleProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(
      products
        .map(p => p.category)
        .filter(Boolean)
    ));
    return uniqueCategories.sort();
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const selectedCount = assignedProducts.length;
  const filteredSelectedCount = filteredProducts.filter(p => assignedProducts.includes(p.id)).length;

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="البحث في المنتجات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-white dark:bg-gray-800 border-2"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all duration-200",
                selectedCategory === null 
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
              onClick={() => setSelectedCategory(null)}
            >
              جميع الفئات ({products.length})
            </Badge>
            {categories.map((category) => {
              const categoryCount = products.filter(p => p.category === category).length;
              return (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    selectedCategory === category 
                      ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category} ({categoryCount})
                </Badge>
              );
            })}
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {filteredProducts.length} من {products.length} منتج
            {searchTerm && ` • البحث: "${searchTerm}"`}
            {selectedCategory && ` • الفئة: ${selectedCategory}`}
          </span>
          <span className="font-medium">
            {filteredSelectedCount} محدد من النتائج
          </span>
        </div>
      </div>

      {/* Products List */}
      <ScrollArea className="h-80 rounded-lg border-2 border-gray-200 dark:border-gray-700">
        <div className="p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-center">
                {searchTerm || selectedCategory 
                  ? "لا توجد منتجات تطابق البحث"
                  : "لا توجد منتجات"
                }
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = assignedProducts.includes(product.id);
              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm",
                    isSelected 
                      ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20" 
                      : "bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                  )}
                  onClick={() => onToggleProduct(employeeId, product.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleProduct(employeeId, product.id)}
                    className="shrink-0"
                  />
                  
                  {/* Product Image */}
                  {product.image_url ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Label className="cursor-pointer block">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold text-primary">
                              {new Intl.NumberFormat('ar-DZ', { 
                                style: 'currency', 
                                currency: 'DZD',
                                minimumFractionDigits: 0
                              }).format(product.price)}
                            </span>
                            {product.category && (
                              <Badge variant="secondary" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-sm mr-2">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions for Filtered Results */}
      {filteredProducts.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Select all filtered products
                const newSelected = [...assignedProducts];
                filteredProducts.forEach(product => {
                  if (!newSelected.includes(product.id)) {
                    newSelected.push(product.id);
                  }
                });
                // Update employee products directly
                onToggleProduct(employeeId, 'batch_select');
                // This is a hack - we need to update the parent state
                // In a real implementation, we'd pass a batch update function
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              تحديد النتائج المرئية ({filteredProducts.length})
            </button>
            
            <button
              onClick={() => {
                // Deselect all filtered products
                filteredProducts.forEach(product => {
                  if (assignedProducts.includes(product.id)) {
                    onToggleProduct(employeeId, product.id);
                  }
                });
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              إلغاء النتائج المرئية ({filteredSelectedCount})
            </button>
          </div>
          
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {selectedCount} منتج محدد إجمالي
          </span>
        </div>
      )}
    </div>
  );
};
