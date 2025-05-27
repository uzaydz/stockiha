import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { MainNav } from "./main-nav";
import { UserMenu } from "./user-menu";
import { useOfflineStatus } from "@/components/OfflineIndicator";
import { cn } from "@/lib/utils";
import { WifiOff } from "lucide-react";

const Header = () => {
  const pathname = usePathname();
  const isOffline = useOfflineStatus();

  if (!pathname) {
    return null;
  }

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <MainNav className="mx-6 hidden md:flex" />
        <div className="flex flex-1 items-center justify-between space-x-4 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label="Navigation Menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="pr-0">
                <MainNav className="flex flex-col items-start" />
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center gap-3">
            {isOffline && (
              <div className={cn(
                "flex items-center gap-2 rounded-full",
                "bg-destructive px-3 py-1.5 text-sm"
              )}>
                <WifiOff size={16} className="text-destructive-foreground" />
                <span className="font-medium text-destructive-foreground">
                  غير متصل
                </span>
              </div>
            )}
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
