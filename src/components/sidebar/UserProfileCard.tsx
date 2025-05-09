import { User, Mail, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface UserProfileCardProps {
  isAdmin: boolean;
  email: string | undefined;
}

const UserProfileCard = ({ isAdmin, email }: UserProfileCardProps) => {
  return (
    <div className="relative mx-4 mb-5 group">
      {/* خلفية الكارت مع تأثير زجاجي */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card/95 to-muted/20 rounded-xl blur-sm opacity-80 transform group-hover:opacity-100 transition-all duration-300"></div>
      
      {/* محتوى الكارت */}
      <div className="relative p-3.5 rounded-xl border border-border/40 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm hover:shadow-md hover:shadow-primary/5">
        <div className="flex items-center gap-3">
          {/* صورة المستخدم */}
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-primary/20 group-hover:border-primary/40 transition-all duration-300 shadow-md">
              <AvatarImage src="/user-avatar.png" alt="صورة المستخدم" />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            
            {/* شارة المسؤول */}
            {isAdmin && (
              <div className="absolute -bottom-1 -left-1 bg-primary rounded-full p-0.5 border-2 border-card shadow-sm">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          
          {/* معلومات المستخدم */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-base font-medium truncate",
              isAdmin ? "text-primary" : "text-foreground"
            )}>
              {isAdmin ? 'المسؤول' : 'المستخدم'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
          
          {/* شارة الصلاحيات */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors duration-300",
                  isAdmin 
                    ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" 
                    : "bg-muted/50 border-muted-foreground/30 text-muted-foreground"
                )}>
                  {isAdmin ? 'مسؤول' : 'مستخدم'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="bg-card/95 backdrop-blur-sm border-primary/20 shadow-md">
                <p className="text-xs">الصلاحيات: {isAdmin ? 'كاملة' : 'مستخدم عادي'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard; 