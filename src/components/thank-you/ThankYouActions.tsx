import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CardFooter } from "@/components/ui/card";
import { usePrinter } from "@/hooks/usePrinter";

interface ThankYouActionsProps {
  primaryAction?: {
    text: string;
    url: string;
    icon?: string;
  };
  secondaryAction?: {
    text: string;
    handler?: () => void;
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
    icon: "🖨️"
  },
  className = ""
}: ThankYouActionsProps) {
  const navigate = useNavigate();

  // ⚡ نظام الطباعة الموحد
  const { printHtml, isElectron: isElectronPrint, isPrinting } = usePrinter();

  const handlePrimaryAction = () => {
    navigate(primaryAction.url);
  };

  // ⚡ دالة الطباعة الموحدة
  const handlePrint = async () => {
    // إذا تم تمرير handler مخصص، نستخدمه
    if (secondaryAction?.handler) {
      secondaryAction.handler();
      return;
    }

    // ⚡ الطباعة باستخدام النظام الموحد
    if (isElectronPrint) {
      try {
        const orderContent = document.querySelector('[data-order-details]') || document.body;
        await printHtml(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="UTF-8">
              <title>تفاصيل الطلب</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; padding: 20px; }
                @page { size: A4; margin: 15mm; }
              </style>
            </head>
            <body>${orderContent.innerHTML}</body>
          </html>
        `, { silent: false, pageSize: 'A4' });
        return;
      } catch (err) {
        console.warn('[ThankYouActions] فشلت الطباعة المباشرة:', err);
      }
    }

    // Fallback
    window.print();
  };

  return (
    <CardFooter className={`flex flex-col md:flex-row gap-4 pt-2 pb-6 border-t border-border ${className}`}>
      <Button
        className="w-full gap-2 bg-primary/90 hover:bg-primary hover:shadow-md transition-all"
        onClick={handlePrimaryAction}
      >
        <span>{primaryAction.text}</span>
        {primaryAction.icon && <span className="text-lg">{primaryAction.icon}</span>}
      </Button>

      <Button
        variant="outline"
        className="w-full gap-2 border-primary/20 dark:border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 text-foreground"
        onClick={handlePrint}
        disabled={isPrinting}
      >
        <span>{isPrinting ? 'جاري الطباعة...' : secondaryAction.text}</span>
        {secondaryAction.icon && !isPrinting && <span className="text-lg">{secondaryAction.icon}</span>}
      </Button>
    </CardFooter>
  );
}
