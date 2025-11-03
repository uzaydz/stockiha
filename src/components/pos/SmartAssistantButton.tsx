import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SmartAssistantChat } from './SmartAssistantChat';

interface SmartAssistantButtonProps {
  className?: string;
  variant?: 'header' | 'floating';
}

export const SmartAssistantButton: React.FC<SmartAssistantButtonProps> = ({ className, variant = 'header' }) => {
  const [open, setOpen] = useState(false);

  if (variant === 'floating') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setOpen(true)}
                size="icon"
                className={cn(
                  'fixed bottom-6 left-6 z-50 h-16 w-16 rounded-2xl',
                  'bg-gradient-to-br from-primary via-primary to-primary/90',
                  'shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30',
                  'hover:scale-110 active:scale-95',
                  'transition-all duration-300 ease-out',
                  'ring-2 ring-primary/20 hover:ring-primary/40',
                  'group relative overflow-hidden',
                  className
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <img 
                  src="/images/selkia-logo.webp" 
                  alt="SIRA AI" 
                  className="w-8 h-8 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card/95 backdrop-blur-sm text-foreground border border-border/50 shadow-xl">
              <p className="font-bold text-sm">SIRA - Stockiha Intelligence Rapid Artificial</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">تتحدث لغة تجارتك</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <SmartAssistantChat open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              onClick={() => setOpen(true)} 
              variant="outline" 
              size="sm" 
              className={cn(
                'gap-2.5 h-10 px-4 rounded-xl',
                'bg-gradient-to-r from-background to-muted/30',
                'border-primary/20 hover:border-primary/40',
                'shadow-sm hover:shadow-md',
                'transition-all duration-200',
                'hover:scale-105 active:scale-95',
                'group relative overflow-hidden',
                className
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img 
                src="/images/selkia-logo.webp" 
                alt="SIRA AI" 
                className="w-5 h-5 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
              />
              <span className="text-sm font-semibold relative z-10">SIRA – تتحدث لغة تجارتك</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-card/95 backdrop-blur-sm text-foreground border border-border/50 shadow-xl">
            <p className="font-bold text-sm">SIRA - Stockiha Intelligence Rapid Artificial</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">تتحدث لغة تجارتك</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SmartAssistantChat open={open} onOpenChange={setOpen} />
    </>
  );
};
