import React from 'react';
import { Plus, Gamepad2, Monitor, Phone, Star, Download, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Game, CartItem } from './types';

interface GameCardProps {
  game: Game;
  cart: CartItem[];
  onAddToCart: (game: Game) => void;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function GameCard({ game, cart, onAddToCart, primaryColor, secondaryColor }: GameCardProps) {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'PC': return Monitor;
      case 'PlayStation': return Gamepad2;
      case 'Xbox': return Gamepad2;
      case 'Mobile': return Phone;
      default: return Gamepad2;
    }
  };

  const PlatformIcon = getPlatformIcon(game.platform);
  const cartItem = cart.find(item => item.game.id === game.id);

  // تحديد ألوان الأزرار بناءً على ألوان المؤسسة
  const getButtonStyle = () => {
    if (primaryColor) {
      return {
        backgroundColor: primaryColor,
        borderColor: primaryColor,
        boxShadow: `0 4px 14px 0 ${primaryColor}20`,
      };
    }
    return {};
  };

  const getButtonHoverStyle = () => {
    if (primaryColor) {
      // تحويل اللون إلى نسخة أغمق للـ hover
      const darkenColor = (color: string) => {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      };
      
      return {
        '--hover-bg': darkenColor(primaryColor),
        '--hover-shadow': `0 8px 25px 0 ${primaryColor}30`,
      } as React.CSSProperties;
    }
    return {};
  };

  return (
    <Card className="group overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 dark:hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02] transform rounded-xl">
      {/* Game Image - تكبير الصورة */}
      {game.images && game.images[0] ? (
        <div className="aspect-[4/5] relative overflow-hidden rounded-t-xl">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
          <img
            src={game.images[0]}
            alt={game.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Featured Badge */}
          {game.is_featured && (
            <Badge className="absolute top-3 right-3 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
              <Star className="w-3 h-3 mr-1 fill-current" />
              مميز
            </Badge>
          )}
          
          {/* Platform Icon */}
          <div className="absolute bottom-3 left-3 z-20">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
              <PlatformIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </div>
          </div>

          {/* Size Badge */}
          {game.size_gb && (
            <div className="absolute top-3 left-3 z-20">
              <Badge variant="secondary" className="bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-600/50 backdrop-blur-sm shadow-sm">
                <HardDrive className="w-3 h-3 mr-1" />
                {game.size_gb} GB
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/5] relative bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center rounded-t-xl">
          <div className="text-center space-y-3">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-6">
              <PlatformIcon className="h-12 w-12 text-primary" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">صورة غير متوفرة</p>
          </div>
          
          {game.is_featured && (
            <Badge className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
              <Star className="w-3 h-3 mr-1 fill-current" />
              مميز
            </Badge>
          )}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Game Title and Category */}
        <div className="space-y-3">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
            {game.name}
          </CardTitle>
          
          {game.category && (
            <Badge variant="secondary" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border-primary/20 dark:border-primary/30 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors text-xs">
              {game.category.name}
            </Badge>
          )}
        </div>

        {/* Price and Add to Cart */}
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary dark:text-primary">
              {game.price.toLocaleString()} دج
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              سعر نهائي شامل
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onAddToCart(game)}
              className={`flex-1 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 h-11 text-sm font-semibold rounded-lg ${
                primaryColor ? '' : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 dark:from-green-500 dark:to-green-400 dark:hover:from-green-600 dark:hover:to-green-500'
              }`}
              style={{
                ...getButtonStyle(),
                ...getButtonHoverStyle(),
              }}
              onMouseEnter={(e) => {
                if (primaryColor) {
                  const target = e.target as HTMLElement;
                  target.style.backgroundColor = (getButtonHoverStyle() as any)['--hover-bg'] || primaryColor;
                  target.style.boxShadow = (getButtonHoverStyle() as any)['--hover-shadow'] || `0 8px 25px 0 ${primaryColor}30`;
                }
              }}
              onMouseLeave={(e) => {
                if (primaryColor) {
                  const target = e.target as HTMLElement;
                  target.style.backgroundColor = primaryColor;
                  target.style.boxShadow = `0 4px 14px 0 ${primaryColor}20`;
                }
              }}
              size="lg"
            >
              <Plus className="ml-2 h-4 w-4" />
              أضف للسلة
            </Button>
            
            {cartItem && (
              <div 
                className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg px-3 min-w-[50px] justify-center bg-green-50 dark:bg-green-900/20"
                style={{
                  backgroundColor: primaryColor ? `${primaryColor}10` : undefined,
                  borderColor: primaryColor ? `${primaryColor}20` : undefined,
                }}
              >
                <span 
                  className="text-base font-bold text-green-600 dark:text-green-400"
                  style={{
                    color: primaryColor || undefined,
                  }}
                >
                  {cartItem.quantity}
                </span>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              تحميل فوري
            </div>
            {game.size_gb && (
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {game.size_gb} GB
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
