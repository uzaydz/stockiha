import { CheckCircle, XCircle } from 'lucide-react';

export interface PasswordStrength {
  score: number;
  feedback: string[];
}

interface PasswordStrengthIndicatorProps {
  password: string;
  passwordStrength: PasswordStrength;
}

const PasswordStrengthIndicator = ({ password, passwordStrength }: PasswordStrengthIndicatorProps) => {
  const getStrengthColor = (score: number) => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score <= 1) return 'ضعيفة جداً';
    if (score <= 2) return 'ضعيفة';
    if (score <= 3) return 'متوسطة';
    if (score <= 4) return 'قوية';
    return 'قوية جداً';
  };

  const getStrengthTextColor = (score: number) => {
    if (score <= 1) return 'text-red-500';
    if (score <= 2) return 'text-orange-500';
    if (score <= 3) return 'text-yellow-500';
    if (score <= 4) return 'text-blue-500';
    return 'text-green-500';
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-300">قوة كلمة المرور:</span>
        <span className={`font-medium ${getStrengthTextColor(passwordStrength.score)}`}>
          {getStrengthText(passwordStrength.score)}
        </span>
      </div>
      
      {/* شريط التقدم */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
        />
      </div>
      
      {/* قائمة المتطلبات */}
      <div className="space-y-1">
        {passwordStrength.feedback.map((feedback, index) => (
          <div key={index} className="flex items-center text-xs">
            {passwordStrength.score >= index + 1 ? (
              <CheckCircle className="w-3 h-3 text-green-500 ml-1" />
            ) : (
              <XCircle className="w-3 h-3 text-red-500 ml-1" />
            )}
            <span className={passwordStrength.score >= index + 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {feedback}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
