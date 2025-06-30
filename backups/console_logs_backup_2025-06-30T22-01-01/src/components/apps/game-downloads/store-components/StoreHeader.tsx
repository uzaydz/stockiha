import React from 'react';
import { Gamepad2, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StoreSettings, CartItem } from './types';

interface StoreHeaderProps {
  settings: StoreSettings;
  cart: CartItem[];
  getTotalItems: () => number;
  onCartClick: () => void;
  onTrackClick: () => void;
}

export default function StoreHeader({
  settings,
  cart,
  getTotalItems,
  onCartClick,
  onTrackClick,
}: StoreHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-card/95 to-card/90 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-6">
            {settings.business_logo ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                <img
                  src={settings.business_logo}
                  alt={settings.business_name}
                  className="relative h-16 w-16 object-contain rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                <div className="relative p-4 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl border border-primary/30 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Gamepad2 className="h-8 w-8 text-primary" />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                {settings.business_name || 'متجر تحميل الألعاب'}
              </h1>
              {settings.welcome_message && (
                <p className="text-muted-foreground text-lg font-medium max-w-md">
                  {settings.welcome_message}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={onCartClick} 
              variant="outline" 
              size="lg"
              className="relative bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/30 hover:from-green-500/20 hover:to-green-600/20 hover:border-green-500/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/10"
            >
              <ShoppingBag className="ml-2 h-5 w-5" />
              السلة ({getTotalItems()})
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white min-w-[22px] h-6 rounded-full text-xs font-bold animate-pulse">
                  {cart.length}
                </Badge>
              )}
            </Button>
            <Button 
              onClick={onTrackClick} 
              variant="outline" 
              size="lg"
              className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30 hover:from-primary/20 hover:to-secondary/20 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/10"
            >
              <Package className="ml-2 h-5 w-5" />
              تتبع طلبك
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
