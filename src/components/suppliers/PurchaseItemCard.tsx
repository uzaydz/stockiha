/**
 * مكون بطاقة عنصر المشتريات المحسّن
 * تصميم حديث وتجربة مستخدم أفضل
 */

import { useState, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Package,
  Trash2,
  ChevronDown,
  Check,
  GripVertical,
  Calculator,
  ImageIcon,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  purchase_price?: number;
  sku?: string;
  thumbnail_image?: string;
  stock_quantity?: number;
}

interface PurchaseItemCardProps {
  index: number;
  form: UseFormReturn<any>;
  products: Product[];
  onRemove: () => void;
  canRemove: boolean;
  onProductSelect: (productId: string) => void;
}

export function PurchaseItemCard({
  index,
  form,
  products,
  onRemove,
  canRemove,
  onProductSelect,
}: PurchaseItemCardProps) {
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // حساب الإجمالي للعنصر
  const itemTotal = useMemo(() => {
    const quantity = form.watch(`items.${index}.quantity`) || 0;
    const unitPrice = form.watch(`items.${index}.unit_price`) || 0;
    const taxRate = form.watch(`items.${index}.tax_rate`) || 0;
    const subtotal = quantity * unitPrice;
    const tax = subtotal * (taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  }, [
    form.watch(`items.${index}.quantity`),
    form.watch(`items.${index}.unit_price`),
    form.watch(`items.${index}.tax_rate`),
    index,
  ]);

  // المنتج المحدد
  const selectedProductId = form.watch(`items.${index}.product_id`);
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // تصفية المنتجات حسب البحث
  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) return products;
    const query = searchValue.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchValue]);

  return (
    <div className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200">
      {/* شريط علوي ملون */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 to-primary rounded-t-xl" />

      {/* رقم العنصر وأدوات التحكم */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <GripVertical className="h-4 w-4 cursor-grab" />
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary font-semibold"
            >
              #{index + 1}
            </Badge>
          </div>
          {selectedProduct && (
            <div className="flex items-center gap-2">
              {selectedProduct.thumbnail_image ? (
                <img
                  src={selectedProduct.thumbnail_image}
                  alt={selectedProduct.name}
                  className="w-8 h-8 rounded-md object-cover border"
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-slate-400" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                {selectedProduct.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* عرض الإجمالي */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {itemTotal.total.toFixed(2)} دج
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <div>المجموع الفرعي: {itemTotal.subtotal.toFixed(2)} دج</div>
                  <div>الضريبة: {itemTotal.tax.toFixed(2)} دج</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* زر الحذف */}
          {canRemove && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>حذف العنصر</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* محتوى البطاقة */}
      <div className="p-4 space-y-4">
        {/* الصف الأول: المنتج والوصف */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* اختيار المنتج */}
          <FormField
            control={form.control}
            name={`items.${index}.product_id`}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  المنتج
                </FormLabel>
                <Popover
                  open={productSearchOpen}
                  onOpenChange={setProductSearchOpen}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'w-full justify-between h-10 font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <span className="truncate">
                          {field.value && field.value !== 'none'
                            ? products.find(p => p.id === field.value)?.name ||
                              'اختر المنتج'
                            : 'اختر المنتج'}
                        </span>
                        <ChevronDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="ابحث عن منتج..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        className="border-none focus:ring-0"
                      />
                      <CommandEmpty className="py-6 text-center text-sm text-slate-500">
                        لا توجد منتجات مطابقة
                      </CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            field.onChange('none');
                            onProductSelect('none');
                            setProductSearchOpen(false);
                            setSearchValue('');
                          }}
                          className="py-2"
                        >
                          <Check
                            className={cn(
                              'ml-2 h-4 w-4',
                              field.value === 'none'
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <span className="text-slate-500">-- بدون منتج --</span>
                        </CommandItem>
                        {filteredProducts.map(product => (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => {
                              field.onChange(product.id);
                              onProductSelect(product.id);
                              setProductSearchOpen(false);
                              setSearchValue('');
                            }}
                            className="py-2"
                          >
                            <Check
                              className={cn(
                                'ml-2 h-4 w-4',
                                field.value === product.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <div className="flex items-center gap-3 flex-1">
                              {product.thumbnail_image ? (
                                <img
                                  src={product.thumbnail_image}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                                  <Package className="h-4 w-4 text-slate-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {product.name}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  {product.sku && <span>{product.sku}</span>}
                                  {product.purchase_price && (
                                    <span className="text-emerald-600">
                                      {product.purchase_price.toFixed(2)} دج
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* الوصف */}
          <FormField
            control={form.control}
            name={`items.${index}.description`}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  الوصف *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="وصف العنصر..."
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* الصف الثاني: الكمية والسعر والضريبة */}
        <div className="grid grid-cols-3 gap-3">
          {/* الكمية */}
          <FormField
            control={form.control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  الكمية *
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0"
                      className="h-10 text-center font-medium pr-2"
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value || ''}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* سعر الوحدة */}
          <FormField
            control={form.control}
            name={`items.${index}.unit_price`}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  سعر الوحدة *
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-10 text-center font-medium pl-8"
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value || ''}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      دج
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* نسبة الضريبة */}
          <FormField
            control={form.control}
            name={`items.${index}.tax_rate`}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  الضريبة
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="h-10 text-center font-medium pl-6"
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value || ''}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      %
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
