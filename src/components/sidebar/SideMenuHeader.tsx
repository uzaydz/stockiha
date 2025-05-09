import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SideMenuHeaderProps {
  isAdmin: boolean;
  scrolled: boolean;
}

const SideMenuHeader = ({ isAdmin, scrolled }: SideMenuHeaderProps) => {
  return (
    <div className={cn(
      "sticky top-0 z-20 pt-4 px-4 pb-3 transition-all duration-300",
      scrolled 
        ? "bg-gradient-to-r from-primary/10 to-card/95 backdrop-blur-md shadow-sm" 
        : "bg-gradient-to-r from-primary/15 to-transparent"
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex-1">
          <h2 className="text-xl font-bold bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">
            لوحة التحكم
          </h2>
          {isAdmin && (
            <div className="flex items-center mt-1 gap-1.5">
              <Badge variant="outline" className="bg-primary/10 text-xs border-primary/20 px-1.5 text-primary font-medium">
                مسؤول
              </Badge>
              <span className="text-[10px] text-muted-foreground">وصول كامل</span>
            </div>
          )}
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/40 to-primary/5 flex items-center justify-center shadow-md border border-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary drop-shadow-sm" />
        </div>
      </div>
      
      <div className={cn(
        "h-0.5 w-full mt-2 rounded-full overflow-hidden transition-all duration-300",
        scrolled ? "bg-gradient-to-r from-primary/20 via-primary/5 to-transparent opacity-100" : "opacity-0"
      )} />
    </div>
  );
};

export default SideMenuHeader; 