import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  RotateCcw,
  Search,
  ShoppingBag,
  RefreshCw,
  Scan,
  Loader2
} from 'lucide-react';
import { HeaderProps } from '../types';
import { useDebounce } from '../hooks/useDebounce';

const Header: React.FC<HeaderProps> = ({
  isReturnMode,
  filteredProductsCount,
  isPOSDataLoading,
  onRefreshData,
  searchQuery = '',
  onSearchChange,
  onBarcodeSearch,
  isScannerLoading = false
}) => {
  // حالة محلية للبحث مع debouncing
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [barcodeInput, setBarcodeInput] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // تحديث البحث الفعلي عند تغيير القيمة المؤخرة
  useEffect(() => {
    onSearchChange?.(debouncedSearchQuery);
  }, [debouncedSearchQuery, onSearchChange]);

  // تحديث القيمة المحلية عند تغيير القيمة الخارجية
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    onSearchChange?.('');
  };

  // معالجة السكانر
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    
    if (!barcode) {
      return;
    }
    
    if (!onBarcodeSearch) {
      return;
    }

    try {
      onBarcodeSearch(barcode);
      setBarcodeInput(''); // تصفير فوري للحقل
    } catch (error) {
    }
  };

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value);
  };

  // تصفير حقل الباركود بعد العثور على المنتج
  const clearBarcodeField = () => {
    setBarcodeInput('');
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* خلفية متدرجة خفيفة */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5" />
      
      <div className="relative p-6 border-b border-border/50 backdrop-blur-sm">
        <div className="space-y-4">
          {/* العنوان الرئيسي مع الأيقونات */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl border transition-all duration-300",
                isReturnMode 
                  ? "bg-orange-500/20 border-orange-300/50 text-orange-700" 
                  : "bg-primary/10 border-primary/20 text-primary"
              )}>
                {isReturnMode ? (
                  <RotateCcw className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
                ) : (
                  <ShoppingBag className="h-5 w-5" />
                )}
              </div>
              <div>
                <h1 className={cn(
                  "text-xl font-bold transition-all duration-300",
                  isReturnMode ? "text-orange-800" : "text-foreground"
                )}>
                  {isReturnMode ? (
                    <span className="flex items-center gap-2">
                      🔄 منتجات الإرجاع
                      <Badge className="bg-orange-500 text-white text-xs animate-pulse">
                        وضع نشط
                      </Badge>
                    </span>
                  ) : (
                    'كتالوج المنتجات'
                  )}
                </h1>
                <p className={cn(
                  "text-sm transition-all duration-300",
                  isReturnMode ? "text-orange-600/80" : "text-muted-foreground"
                )}>
                  {isReturnMode 
                    ? `${filteredProductsCount} منتج متاح للإرجاع`
                    : `${filteredProductsCount} منتج متاح`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshData}
                disabled={isPOSDataLoading}
                className="h-9 gap-2 hover:shadow-md transition-all duration-200"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isPOSDataLoading && "animate-spin"
                )} />
                تحديث
              </Button>
            </div>
          </div>

          {/* شريط البحث والسكانر المحسن */}
          <div className="space-y-3">
            {/* شريط البحث التقليدي */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                placeholder="🔍 ابحث عن المنتجات بالاسم، الوصف..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                className="pr-12 h-11 text-base border-2 focus:border-primary/50 bg-background/60 backdrop-blur-sm placeholder:text-muted-foreground/70"
              />
              {localSearchQuery && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="h-6 w-6 p-0 hover:bg-muted rounded-full"
                  >
                    ×
                  </Button>
                </motion.div>
              )}
              
              {/* مؤشر البحث النشط */}
              {localSearchQuery !== debouncedSearchQuery && (
                <div className="absolute inset-y-0 left-10 flex items-center">
                  <div className="h-1 w-1 bg-primary rounded-full animate-pulse" />
                </div>
              )}
            </div>

            {/* حقل السكانر المخصص */}
            {onBarcodeSearch && (
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Scan className={cn(
                      "h-5 w-5",
                      isScannerLoading ? "text-primary animate-pulse" : "text-muted-foreground"
                    )} />
                  </div>
                  <Input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="📷 امسح أو أدخل الباركود..."
                    value={barcodeInput}
                    onChange={handleBarcodeChange}
                    disabled={isScannerLoading}
                    className={cn(
                      "pr-12 h-11 text-base border-2 border-dashed focus:border-primary bg-primary/5 backdrop-blur-sm",
                      "placeholder:text-muted-foreground/70 font-mono tracking-wide",
                      isScannerLoading && "bg-muted cursor-not-allowed"
                    )}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!barcodeInput.trim() || isScannerLoading}
                  className="h-11 px-4 gap-2"
                >
                  {isScannerLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scan className="h-4 w-4" />
                  )}
                  {isScannerLoading ? 'جاري البحث...' : 'بحث'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Header);
