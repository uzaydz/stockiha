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
    <Card className="group overflow-hidden bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm border-border/40 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:scale-[1.02] transform">
      {/* Game Image */}
      {game.images && game.images[0] ? (
        <div className="aspect-video relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10"></div>
          <img
            src={game.images[0]}
            alt={game.name}
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
          />
          
          {/* Featured Badge */}
          {game.is_featured && (
            <Badge className="absolute top-3 right-3 z-20 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg animate-pulse">
              <Star className="w-3 h-3 mr-1" />
              مميز
            </Badge>
          )}
          
          {/* Platform Icon */}
          <div className="absolute bottom-3 left-3 z-20">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-2.5 border border-white/20">
              <PlatformIcon className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Size Badge */}
          {game.size_gb && (
            <div className="absolute top-3 left-3 z-20">
              <Badge variant="secondary" className="bg-black/50 text-white border-white/20 backdrop-blur-sm">
                <HardDrive className="w-3 h-3 mr-1" />
                {game.size_gb} GB
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video relative bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="bg-primary/20 rounded-full p-6">
              <PlatformIcon className="h-12 w-12 text-primary" />
            </div>
            <p className="text-sm font-medium text-primary">صورة غير متوفرة</p>
          </div>
          
          {game.is_featured && (
            <Badge className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg animate-pulse">
              <Star className="w-3 h-3 mr-1" />
              مميز
            </Badge>
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
              {game.name}
            </CardTitle>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {game.category && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                🏆 {game.category.name}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Description */}
        {game.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {game.description}
          </p>
        )}

        {/* Price and Add to Cart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {game.price.toLocaleString()} دج
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                سعر نهائي شامل
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onAddToCart(game)}
              className={`flex-1 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 text-base font-semibold ${
                primaryColor ? '' : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 hover:shadow-green-500/20'
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
              <Plus className="ml-2 h-5 w-5" />
              🛒 أضف للسلة
            </Button>
            
            {cartItem && (
              <div 
                className="flex items-center border rounded-lg px-4 min-w-[60px] justify-center"
                style={{
                  backgroundColor: primaryColor ? `${primaryColor}10` : 'rgb(34 197 94 / 0.1)',
                  borderColor: primaryColor ? `${primaryColor}20` : 'rgb(34 197 94 / 0.2)',
                }}
              >
                <span 
                  className="text-lg font-bold"
                  style={{
                    color: primaryColor || 'rgb(22 163 74)',
                  }}
                >
                  {cartItem.quantity}
                </span>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
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
      </CardContent>
    </Card>
  );
} 