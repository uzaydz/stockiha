import React from "react";
import { Loader2, CreditCard } from "lucide-react";

interface SubmitButtonProps {
  isSubmitting: boolean;
  onClick: () => void;
  text?: string;
  submittingText?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting,
  onClick,
  text = "إرسال الطلب",
  submittingText = "جاري إرسال الطلب...",
}) => {
  return (
    <div className="flex justify-center mt-6">
      <button
        type="button" // Important: type is button if onClick is handling submission
        className="w-full max-w-md flex items-center justify-center bg-primary text-white font-medium py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
        disabled={isSubmitting}
        onClick={onClick}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            <span>{submittingText}</span>
          </>
        ) : (
          <>
            <CreditCard className="ml-2 h-5 w-5" />
            {text}
          </>
        )}
      </button>
    </div>
  );
}; 