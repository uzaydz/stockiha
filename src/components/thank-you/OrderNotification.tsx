import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, InfoIcon, TruckIcon, PhoneIcon } from "lucide-react";

type NotificationType = "info" | "success" | "warning" | "contact";

interface OrderNotificationProps {
  type?: NotificationType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function OrderNotification({
  type = "info",
  title,
  description,
  icon
}: OrderNotificationProps) {
  // تحديد المحتوى الافتراضي حسب نوع الإشعار
  const getDefaultContent = () => {
    switch (type) {
      case "info":
        return {
          title: title || "ماذا بعد؟",
          description: description || "سنتواصل معك قريباً على رقم الهاتف الذي قدمته لتأكيد التفاصيل والشحن.",
          icon: icon || <InfoIcon className="h-5 w-5" />,
          className: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300"
        };
      case "success":
        return {
          title: title || "تم تأكيد الطلب",
          description: description || "تم تأكيد طلبك وجاري تجهيزه الآن. سنرسل إليك إشعاراً عندما يتم شحنه.",
          icon: icon || <TruckIcon className="h-5 w-5" />,
          className: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300"
        };
      case "warning":
        return {
          title: title || "معلومات مهمة",
          description: description || "يرجى التأكد من صحة بيانات الاتصال والشحن لضمان استلام طلبك دون تأخير.",
          icon: icon || <AlertCircle className="h-5 w-5" />,
          className: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300"
        };
      case "contact":
        return {
          title: title || "هل تحتاج مساعدة؟",
          description: description || "فريق خدمة العملاء متاح للمساعدة. يمكنك التواصل معنا عبر الهاتف أو البريد الإلكتروني.",
          icon: icon || <PhoneIcon className="h-5 w-5" />,
          className: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900 text-purple-800 dark:text-purple-300"
        };
      default:
        return {
          title: title || "ماذا بعد؟",
          description: description || "سنتواصل معك قريباً لتأكيد طلبك.",
          icon: icon || <AlertCircle className="h-5 w-5" />,
          className: "bg-muted dark:bg-muted/30 border-border text-foreground"
        };
    }
  };

  const content = getDefaultContent();

  return (
    <Alert className={content.className}>
      {content.icon}
      <AlertTitle>{content.title}</AlertTitle>
      <AlertDescription>{content.description}</AlertDescription>
    </Alert>
  );
}
