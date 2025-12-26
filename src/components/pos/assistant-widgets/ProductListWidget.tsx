import React from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, CheckCircle2, ShoppingCart, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AppImages } from '@/lib/appImages';

interface Product {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    image?: string;
    available_stock?: number;
}

interface ProductListWidgetProps {
    data: Product[];
    title?: string;
    onAction?: (action: string, payload?: any) => void;
}

export const ProductListWidget: React.FC<ProductListWidgetProps> = ({ data, title, onAction }) => {
    if (!data?.length) return null;

    return (
        <div className="w-full mt-2 space-y-3">
            {title && (
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                    {title}
                </h4>
            )}

            <div className="grid grid-cols-1 gap-2">
                {data.map((product, idx) => {
                    const stock = product.available_stock ?? product.stock_quantity ?? 0;
                    const isLow = stock <= 5 && stock > 0;
                    const isOut = stock <= 0;

                    return (
                        <motion.div
                            key={product.id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group flex items-center gap-3 p-3 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            {/* Image / Icon */}
                            <div className="relative w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-white/5">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Package className="w-5 h-5 text-gray-400" />
                                )}
                                {isOut && (
                                    <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <h5 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                                        {product.name}
                                    </h5>
                                    <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                                        {Number(product.price).toLocaleString()} <span className="text-[10px] text-gray-500">دج</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn(
                                        "h-5 px-1.5 text-[10px] font-medium border-0",
                                        isOut ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" :
                                            isLow ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                                                "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    )}>
                                        {isOut ? 'نافد' : (isLow ? 'منخفض' : 'متوفر')} • {stock} قطعة
                                    </Badge>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onAction && (
                                    <>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="w-8 h-8 rounded-full hover:bg-orange-50 hover:text-orange-600"
                                            onClick={() => onAction('update_stock', product)}
                                            title="تعديل المخزون"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="w-8 h-8 rounded-full hover:bg-blue-50 hover:text-blue-600"
                                            onClick={() => onAction('edit_product', product)}
                                            title="تعديل المنتج"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
