import { Info, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionInfoProps {
  version: string;
  className?: string;
}

const VersionInfo = ({ version, className }: VersionInfoProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-1.5",
      className
    )}>
      <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 px-3 py-1 rounded-full">
        <Info className="h-3 w-3 text-primary/70" />
        <span className="text-[10px] font-medium text-primary/80">بازار {version}</span>
      </div>
      
      <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground/60">
        <span>تم التطوير بواسطة</span>
        <Heart className="h-2.5 w-2.5 text-red-400/70 animate-pulse" />
        <span>فريق بازار</span>
      </div>
    </div>
  );
};

export default VersionInfo; 