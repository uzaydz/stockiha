import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CardFooter } from "@/components/ui/card";

interface ThankYouActionsProps {
  primaryAction?: {
    text: string;
    url: string;
    icon?: string;
  };
  secondaryAction?: {
    text: string;
    handler: () => void;
    icon?: string;
  };
  className?: string;
}

export default function ThankYouActions({
  primaryAction = {
    text: "العودة للتسوق",
    url: "/",
    icon: "🛍️"
  },
  secondaryAction = {
    text: "طباعة معلومات الطلب",
    handler: () => window.print(),
    icon: "🖨️"
  },
  className = ""
}: ThankYouActionsProps) {
  const navigate = useNavigate();

  const handlePrimaryAction = () => {
    navigate(primaryAction.url);
  };

  return (
    <CardFooter className={`flex flex-col md:flex-row gap-4 pt-2 pb-6 border-t ${className}`}>
      <Button 
        className="w-full gap-2 bg-primary/90 hover:bg-primary hover:shadow-md transition-all"
        onClick={handlePrimaryAction}
      >
        <span>{primaryAction.text}</span>
        {primaryAction.icon && <span className="text-lg">{primaryAction.icon}</span>}
      </Button>
      
      <Button 
        variant="outline"
        className="w-full gap-2 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
        onClick={secondaryAction.handler}
      >
        <span>{secondaryAction.text}</span>
        {secondaryAction.icon && <span className="text-lg">{secondaryAction.icon}</span>}
      </Button>
    </CardFooter>
  );
} 