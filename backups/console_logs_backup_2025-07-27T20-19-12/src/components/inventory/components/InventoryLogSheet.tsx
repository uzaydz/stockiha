import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, History, User } from 'lucide-react';

interface InventoryLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoadingLog: boolean;
  inventoryLog: any[];
  productId: string;
  loadInventoryLog: (productId: string) => void;
}

const InventoryLogSheet: React.FC<InventoryLogSheetProps> = React.memo(({
  open,
  onOpenChange,
  isLoadingLog,
  inventoryLog,
  productId,
  loadInventoryLog
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          سجل المخزون
        </SheetTitle>
        <SheetDescription>
          عرض تاريخ جميع العمليات على مخزون هذا المنتج
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadInventoryLog(productId)}
            disabled={isLoadingLog}
          >
            {isLoadingLog ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            تحديث
          </Button>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {isLoadingLog ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryLog.map((entry, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={
                        entry.quantity_change > 0 ? "w-2 h-2 rounded-full bg-green-500" : "w-2 h-2 rounded-full bg-red-500"
                      } />
                      <span className="font-medium text-sm">{entry.variant_name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.operation_type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString('ar-DZ', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">التغيير</Label>
                      <div className={
                        entry.quantity_change > 0 ? "font-medium text-green-600" : "font-medium text-red-600"
                      }>
                        {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">من</Label>
                      <div>{entry.previous_stock}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">إلى</Label>
                      <div>{entry.new_stock}</div>
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      {entry.notes}
                    </div>
                  )}

                  {entry.created_by_name && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {entry.created_by_name}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </SheetContent>
  </Sheet>
));

export default InventoryLogSheet; 