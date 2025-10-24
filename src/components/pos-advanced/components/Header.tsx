import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Scan,
  Loader2,
  Camera
} from 'lucide-react';
import { HeaderProps } from '../types';
import { useDebounce } from '../hooks/useDebounce';

const Header: React.FC<HeaderProps> = ({
  isReturnMode,
  filteredProductsCount,
  isPOSDataLoading,
  onRefreshData: _onRefreshData,
  searchQuery = '',
  onSearchChange,
  onBarcodeSearch,
  isScannerLoading = false,
  onOpenMobileScanner,
  isCameraScannerSupported,
  hasNativeBarcodeDetector,
  isMobile
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
    <div className="relative overflow-hidden bg-card/50 border-b border-border/40 p-4">
      {/* خلفية متدرجة خفيفة */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.01] to-transparent pointer-events-none" />
      
      {/* البحث والسكانر محسّن */}
      <div className="relative space-y-3">
        <div className="relative group">
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            placeholder="ابحث بالاسم، الباركود أو الفئة..."
            value={localSearchQuery}
            onChange={handleSearchChange}
            className="pr-11 h-11 rounded-lg border border-border/50 bg-background hover:bg-muted/50 focus:border-primary/60 shadow-sm text-base font-medium transition-all"
          />
          {localSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 rounded-md hover:bg-muted transition-all"
            >
              <span className="text-lg font-bold text-muted-foreground">×</span>
            </Button>
          )}
        </div>

        {onBarcodeSearch && (
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={barcodeInputRef}
                type="text"
                placeholder="أدخل الباركود..."
                value={barcodeInput}
                onChange={handleBarcodeChange}
                disabled={isScannerLoading}
                className="pr-10 h-10 rounded-lg border border-border/50 bg-background hover:bg-muted/50 transition-colors"
              />
            </div>
            {onOpenMobileScanner && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onOpenMobileScanner}
                disabled={!isCameraScannerSupported}
                className="h-10 rounded-lg border-border/50"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
            <Button 
              type="submit" 
              size="sm"
              disabled={!barcodeInput.trim() || isScannerLoading}
              className="h-10 rounded-lg"
            >
              {isScannerLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scan className="h-4 w-4" />
              )}
            </Button>
          </form>
        )}

        {onOpenMobileScanner && isMobile && !isCameraScannerSupported && (
          <p className="text-xs text-amber-600">
            ⚠️ لا يمكن الوصول إلى الكاميرا حاليًا
          </p>
        )}
        {onOpenMobileScanner && isCameraScannerSupported && hasNativeBarcodeDetector === false && (
          <p className="text-xs text-muted-foreground">
            ℹ️ تأكد من إضاءة جيدة للباركود
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(Header);
