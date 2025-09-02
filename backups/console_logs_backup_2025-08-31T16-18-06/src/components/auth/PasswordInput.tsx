import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  showStrengthIndicator?: boolean;
  onStrengthChange?: (strength: { score: number; feedback: string[] }) => void;
}

const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  placeholder = "أدخل كلمة المرور",
  required = false,
  className = "",
  showStrengthIndicator = false,
  onStrengthChange
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  // دالة تقييم قوة كلمة المرور
  const evaluatePasswordStrength = (password: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على حرف صغير');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على حرف كبير');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على رقم');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('يجب أن تحتوي على رمز خاص');
    }

    return { score, feedback };
  };

  const handlePasswordChange = (newValue: string) => {
    onChange(newValue);
    
    if (showStrengthIndicator && onStrengthChange) {
      const strength = evaluatePasswordStrength(newValue);
      onStrengthChange(strength);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`text-right pl-20 pr-10 h-12 border-2 border-gray-200 focus:border-[#fc5d41] focus:ring-2 focus:ring-[#fc5d41]/20 transition-all duration-200 rounded-lg bg-white/80 backdrop-blur-sm ${className}`}
          dir="rtl"
        />
        <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-[#fc5d41]" />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:text-[#fc5d41]"
          title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;
