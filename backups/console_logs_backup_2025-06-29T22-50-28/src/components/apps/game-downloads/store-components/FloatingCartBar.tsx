import React from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FloatingCartBarProps {
  cart: any[];
  getTotalItems: () => number;
  getTotalPrice: () => number;
  onCartClick: () => void;
  onTrackClick: () => void;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function FloatingCartBar({
  cart,
  getTotalItems,
  getTotalPrice,
  onCartClick,
  onTrackClick,
  primaryColor,
  secondaryColor
}: FloatingCartBarProps) {
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  // تحديد ألوان الشريط العائم بناءً على ألوان المؤسسة
  const getBarStyle = () => {
    if (primaryColor) {
      return {
        background: `linear-gradient(to right, ${primaryColor}95, ${primaryColor}90)`,
        borderColor: `${primaryColor}20`,
      };
    }
    return {};
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div 
        className={`flex items-center gap-3 backdrop-blur-md rounded-full px-6 py-3 shadow-2xl border ${
          primaryColor ? '' : 'bg-gradient-to-r from-primary/95 to-primary/90 border-primary/20'
        }`}
        style={getBarStyle()}
      >
        {/* زر السلة */}
        <Button
          onClick={onCartClick}
          className="relative bg-white/20 hover:bg-white/30 text-white border-0 rounded-full px-4 py-2 transition-all duration-300 hover:scale-105"
          size="sm"
        >
          <ShoppingCart className="h-4 w-4 ml-2" />
          <span className="font-semibold">السلة</span>
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
              {totalItems}
            </Badge>
          )}
        </Button>

        {/* عرض السعر الإجمالي */}
        {totalItems > 0 && (
          <div className="text-white font-bold text-sm">
            {totalPrice.toLocaleString()} دج
          </div>
        )}

        {/* فاصل */}
        <div className="w-px h-6 bg-white/30"></div>

        {/* زر تتبع الطلبات */}
        <Button
          onClick={onTrackClick}
          className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full px-4 py-2 transition-all duration-300 hover:scale-105"
          size="sm"
        >
          <Package className="h-4 w-4 ml-2" />
          <span className="font-medium">تتبع طلب</span>
        </Button>
      </div>
    </div>
  );
}
