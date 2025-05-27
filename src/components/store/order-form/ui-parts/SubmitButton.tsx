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
      <div className="relative w-full max-w-md">
        {/* تأثير التوهج في الخلفية */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 rounded-xl blur-lg animate-pulse" />
        
        <button
          id="order-submit-button"
          type="button" // Important: type is button if onClick is handling submission
          className="relative w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-primary to-primary-darker text-white font-bold rounded-xl shadow-2xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          disabled={isSubmitting}
          onClick={onClick}
        >
          {/* تأثير الموجة عند الضغط */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          
          {/* محتوى الزر */}
          <div className="relative flex items-center gap-3">
            {isSubmitting ? (
              <>
                <div className="p-1 bg-white/20 rounded-full">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <span className="text-lg text-white">{submittingText}</span>
              </>
            ) : (
              <>
                <div className="p-1 bg-white/20 rounded-full">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg text-white">{text}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            )}
          </div>
          
          {/* تأثير الحدود المتحركة */}
          {!isSubmitting && (
            <div className="absolute inset-0 rounded-xl border-2 border-white/30 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};
