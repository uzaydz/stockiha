/**
 * PrintHistory - عرض سجل عمليات الطباعة
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Printer, 
  Clock, 
  Tag, 
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import { printHistoryService, PrintHistoryItem, PrintStats } from '@/services/PrintHistoryService';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PrintHistoryProps {
  organizationId: string;
  onReprint?: (productIds: string[]) => void;
  className?: string;
}

const PrintHistory: React.FC<PrintHistoryProps> = ({
  organizationId,
  onReprint,
  className
}) => {
  const [history, setHistory] = useState<PrintHistoryItem[]>([]);
  const [stats, setStats] = useState<PrintStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // تحميل السجل
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        printHistoryService.getHistory(organizationId, 20),
        printHistoryService.getStats(organizationId)
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('[PrintHistory] فشل تحميل السجل:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadHistory();
    }
  }, [organizationId]);

  // مسح السجل
  const handleClear = async () => {
    if (window.confirm('هل أنت متأكد من مسح سجل الطباعة؟')) {
      await printHistoryService.clearHistory(organizationId);
      setHistory([]);
      setStats(null);
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ar });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 flex items-center justify-center">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            سجل الطباعة
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowStats(!showStats)}
              title="إحصائيات"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadHistory}
              title="تحديث"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={handleClear}
                title="مسح السجل"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* الإحصائيات */}
        {showStats && stats && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">إجمالي الطباعات</p>
              <p className="font-bold">{stats.totalPrints}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">إجمالي الملصقات</p>
              <p className="font-bold">{stats.totalLabels}</p>
            </div>
            {stats.mostPrintedProduct && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">الأكثر طباعة</p>
                <p className="font-medium text-xs truncate">
                  {stats.mostPrintedProduct.name} ({stats.mostPrintedProduct.count} مرة)
                </p>
              </div>
            )}
          </div>
        )}

        {/* قائمة السجل */}
        {history.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Printer className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا يوجد سجل طباعة</p>
          </div>
        ) : (
          <ScrollArea className={cn("pr-2", isExpanded ? "h-[300px]" : "h-[150px]")}>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={item.status === 'success' ? 'default' : 'destructive'}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {item.status === 'success' ? 'نجح' : 'فشل'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.printed_at)}
                        </span>
                      </div>
                      <p className="text-xs font-medium truncate">
                        {item.product_names.slice(0, 2).join('، ')}
                        {item.product_names.length > 2 && ` +${item.product_names.length - 2}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {item.total_labels} ملصق
                        </span>
                        <span>{item.label_size}</span>
                      </div>
                    </div>
                    {onReprint && item.product_ids.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onReprint(item.product_ids)}
                      >
                        <Printer className="h-3 w-3 ml-1" />
                        إعادة
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* زر التوسيع */}
        {history.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 ml-1" />
                عرض أقل
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 ml-1" />
                عرض المزيد
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PrintHistory;
