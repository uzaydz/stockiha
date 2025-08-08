import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft } from 'lucide-react';

interface SuccessMessageProps {
  title: string;
  description: string;
  icon?: ReactNode;
  primaryButtonText: string;
  onPrimaryButtonClick: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  iconBgColor?: string;
}

const SuccessMessage = ({
  title,
  description,
  icon = <CheckCircle className="w-8 h-8 text-white" />,
  primaryButtonText,
  onPrimaryButtonClick,
  secondaryButtonText,
  onSecondaryButtonClick,
  iconBgColor = "from-green-500 to-green-600"
}: SuccessMessageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* شعار أو أيقونة */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${iconBgColor} rounded-full mb-4 shadow-lg`}>
            {icon}
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {description}
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">{title}</CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              {description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full">
                {icon}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {description}
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="border-t bg-gray-50/50 dark:bg-gray-800/50 rounded-b-lg">
            <div className="w-full space-y-3">
              {secondaryButtonText && onSecondaryButtonClick && (
                <Button 
                  onClick={onSecondaryButtonClick}
                  variant="outline"
                  className="w-full h-12 border-2 border-gray-200 hover:border-[#fc5d41] hover:bg-[#fc5d41]/5 text-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-[#fc5d41] dark:hover:bg-[#fc5d41]/10 transition-all duration-200 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4 ml-2" />
                  {secondaryButtonText}
                </Button>
              )}
              <Button 
                onClick={onPrimaryButtonClick}
                className="w-full h-12 bg-gradient-to-r from-[#fc5d41] to-[#fc5d41]/80 hover:from-[#fc5d41]/90 hover:to-[#fc5d41] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] rounded-lg"
              >
                {primaryButtonText}
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* معلومات إضافية في أسفل الصفحة */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 سطوكيها - منصة التجارة الإلكترونية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
};

export default SuccessMessage; 