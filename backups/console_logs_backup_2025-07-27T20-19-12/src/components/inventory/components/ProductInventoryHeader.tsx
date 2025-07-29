import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, RotateCcw, History, Download } from 'lucide-react';

interface ProductInventoryHeaderProps {
  productName: string;
  sku: string;
  barcode?: string;
  onRefresh: () => void;
  onSync: () => void;
  onShowLog: () => void;
  onExport: () => void;
  isLoading: boolean;
  isSyncing: boolean;
}

const ProductInventoryHeader: React.FC<ProductInventoryHeaderProps> = React.memo(({
  productName, sku, barcode, onRefresh, onSync, onShowLog, onExport, isLoading, isSyncing
}) => (
  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
    <div>
      <h2 className="text-2xl font-bold">{productName}</h2>
      <p className="text-muted-foreground mt-1">
        SKU: {sku} {barcode && `• ${barcode}`}
      </p>
    </div>
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={onSync} disabled={isSyncing}>
        <RotateCcw className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={onShowLog}>
        <History className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={onExport}>
        <Download className="w-4 h-4" />
      </Button>
    </div>
  </div>
));

export default ProductInventoryHeader; 