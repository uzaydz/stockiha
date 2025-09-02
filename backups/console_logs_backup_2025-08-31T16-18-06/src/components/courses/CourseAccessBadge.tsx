import React from 'react';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Crown, Zap, Clock, Lock } from 'lucide-react';
import { CoursesAccessType } from '@/types/activation';

interface CourseAccessBadgeProps {
  accessType?: CoursesAccessType;
  isAccessible: boolean;
  expiresAt?: string;
  isLifetime?: boolean;
  showDetails?: boolean;
}

const CourseAccessBadge: React.FC<CourseAccessBadgeProps> = ({
  accessType,
  isAccessible,
  expiresAt,
  isLifetime,
  showDetails = false
}) => {
  // إذا لم يكن هناك وصول
  if (!isAccessible) {
    return (
      <Badge variant="outline" className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-300">
        <Lock className="w-3 h-3 ml-1" />
        غير متاح
      </Badge>
    );
  }

  // الدورات مدى الحياة
  if (isLifetime) {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
        <GraduationCap className="w-3 h-3 ml-1" />
        مدى الحياة
      </Badge>
    );
  }

  // الدورات حسب نوع الوصول
  switch (accessType) {
    case CoursesAccessType.PREMIUM:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
          <Crown className="w-3 h-3 ml-1" />
          متميز
        </Badge>
      );
    
    case CoursesAccessType.LIFETIME:
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">
          <GraduationCap className="w-3 h-3 ml-1" />
          مدى الحياة
        </Badge>
      );
    
    case CoursesAccessType.STANDARD:
    default:
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
            <Zap className="w-3 h-3 ml-1" />
            متاح
          </Badge>
          
          {showDetails && expiresAt && (
            <Badge variant="outline" className="text-xs border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400">
              <Clock className="w-3 h-3 ml-1" />
              حتى {new Date(expiresAt).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </Badge>
          )}
        </div>
      );
  }
};

export default CourseAccessBadge;
