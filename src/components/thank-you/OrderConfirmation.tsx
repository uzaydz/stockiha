import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface OrderConfirmationProps {
  title?: string;
  subtitle?: string;
}

export default function OrderConfirmation({
  title = "شكرًا لطلبك!",
  subtitle = "تم استلام طلبك بنجاح وسنعمل على معالجته في أقرب وقت"
}: OrderConfirmationProps) {
  return (
    <div className="text-center mb-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
        className="w-20 h-20 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
      </motion.div>
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground text-lg">{subtitle}</p>
    </div>
  );
} 