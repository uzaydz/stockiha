import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SideMenuFooterProps {
  handleLogout: () => void;
}

const SideMenuFooter = ({ handleLogout }: SideMenuFooterProps) => {
  return (
    <div className="mx-4 mt-5 mb-4 relative">
      {/* زر تسجيل الخروج */}
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(
          "w-full flex items-center justify-center gap-2 transition-all duration-300",
          "text-red-500 hover:text-white font-medium",
          "border border-red-200/30 hover:border-red-500",
          "hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 shadow-sm"
        )}
        onClick={handleLogout}
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>تسجيل الخروج</span>
      </Button>
    </div>
  );
};

export default SideMenuFooter; 