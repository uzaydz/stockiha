import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface OrdersTableScrollControlsProps {
  showLeftScroll: boolean;
  showRightScroll: boolean;
  scrollProgress: number;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  onScrollToStart: () => void;
  onScrollToEnd: () => void;
  onScrollProgress: (percentage: number) => void;
}

const OrdersTableScrollControls = memo(({
  showLeftScroll,
  showRightScroll,
  scrollProgress,
  onScrollLeft,
  onScrollRight,
  onScrollToStart,
  onScrollToEnd,
  onScrollProgress,
}: OrdersTableScrollControlsProps) => {
  return (
    <>
      {/* أزرار التمرير المحسنة */}
      {showLeftScroll && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
          <Button
            variant="default"
            size="sm"
            onClick={onScrollLeft}
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-xl border-2 border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110"
            title="تمرير لليسار"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </Button>
        </div>
      )}
      
      {showRightScroll && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
          <Button
            variant="default"
            size="sm"
            onClick={onScrollRight}
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-xl border-2 border-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-110"
            title="تمرير لليمين"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </Button>
        </div>
      )}
      
      {/* شريط تمرير مرئي */}
      {(showLeftScroll || showRightScroll) && (
        <div className="bg-muted/20 border-b border-border/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">تمرير الجدول</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>🖱️ اسحب</span>
              <span>•</span>
              <span>🖲️ عجلة الفأرة</span>
              <span>•</span>
              <span>👆 الأزرار</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onScrollToStart}
              className="h-6 px-2 text-xs"
              disabled={!showRightScroll}
            >
              البداية
            </Button>
            
            <div 
              className="flex-1 h-2 bg-border/30 rounded-full overflow-hidden cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect) {
                  const clickX = e.clientX - rect.left;
                  const percentage = (clickX / rect.width) * 100;
                  onScrollProgress(percentage);
                }
              }}
            >
              <div 
                className="absolute top-0 h-full bg-primary/60 rounded-full transition-all duration-200 hover:bg-primary/80"
                style={{
                  width: `${Math.max(10, 100 - scrollProgress)}%`,
                  transform: `translateX(${scrollProgress}%)`
                }}
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onScrollToEnd}
              className="h-6 px-2 text-xs"
              disabled={!showLeftScroll}
            >
              النهاية
            </Button>
          </div>
        </div>
      )}
    </>
  );
});

OrdersTableScrollControls.displayName = "OrdersTableScrollControls";

export default OrdersTableScrollControls; 