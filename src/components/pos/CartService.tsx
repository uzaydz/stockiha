import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Wrench, Calendar, User as UserIcon, AlertTriangle, MessageSquare, BarChart4 } from 'lucide-react';
import { Service, User } from '@/types';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CartServiceProps {
  service: Service & { 
    scheduledDate?: Date; 
    notes?: string; 
    customerId?: string;
    public_tracking_code?: string;
  };
  customers: User[];
  removeService: (serviceId: string) => void;
}

export default function CartService({ service, customers, removeService }: CartServiceProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // إيجاد العميل المرتبط بالخدمة
  const customer = service.customerId 
    ? customers.find(c => c.id === service.customerId) 
    : null;
    
  // حالة استكمال بيانات الخدمة
  const hasSchedule = !!service.scheduledDate;
  const hasCustomer = !!customer;
  const hasNotes = !!service.notes;
  const hasTrackingCode = !!service.public_tracking_code;
  
  // حساب نسبة اكتمال البيانات (من 4: الموعد، العميل، الملاحظات، كود التتبع)
  const completionItems = [hasSchedule, hasCustomer, hasNotes, hasTrackingCode];
  const completionCount = completionItems.filter(Boolean).length;
  const completionPercentage = (completionCount / 4) * 100;
  
  // تحديد لون حالة الاكتمال
  const getCompletionColor = () => {
    if (completionPercentage <= 25) return 'bg-red-400';
    if (completionPercentage <= 50) return 'bg-amber-400';
    if (completionPercentage <= 75) return 'bg-blue-400';
    return 'bg-green-400';
  };
  
  // حساب بيانات المؤشر الدائري
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative rounded-lg transition-all duration-300 overflow-hidden"
    >
      <div className={`flex gap-3 p-4 border group transition-all duration-300 ${isHovered ? 'bg-primary/5 shadow-md border-primary/20' : 'bg-card/40 border-accent/20'}`}>
        {/* أيقونة الخدمة */}
        <motion.div 
          whileHover={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
          className="relative w-16 h-16 bg-primary/10 rounded-md text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors shadow-sm group-hover:shadow-md"
        >
          <Wrench className="h-8 w-8" />
          
          {/* مؤشر اكتمال البيانات */}
          <div className="absolute -top-1 -right-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <svg width="26" height="26" viewBox="0 0 26 26">
                      <circle 
                        cx="13" 
                        cy="13" 
                        r={radius} 
                        fill="white"
                        stroke="#e2e8f0"
                        strokeWidth="2"
                      />
                      <circle
                        cx="13"
                        cy="13"
                        r={radius}
                        fill="transparent"
                        stroke={getCompletionColor()}
                        strokeWidth="2"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform="rotate(-90 13 13)"
                      />
                      <text
                        x="13"
                        y="13"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="currentColor"
                      >
                        {completionCount}
                      </text>
                    </svg>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">اكتمال بيانات الخدمة ({completionCount}/4)</p>
                  <ul className="text-xs mt-1">
                    <li className={`flex items-center gap-1 ${hasSchedule ? 'text-green-500' : 'text-gray-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      <span>الموعد</span>
                    </li>
                    <li className={`flex items-center gap-1 ${hasCustomer ? 'text-green-500' : 'text-gray-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      <span>العميل</span>
                    </li>
                    <li className={`flex items-center gap-1 ${hasNotes ? 'text-green-500' : 'text-gray-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      <span>الملاحظات</span>
                    </li>
                    <li className={`flex items-center gap-1 ${hasTrackingCode ? 'text-green-500' : 'text-gray-400'}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      <span>كود التتبع</span>
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
        
        {/* معلومات الخدمة */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-sm md:text-base group-hover:text-primary transition-colors">
              {service.name}
            </h3>
            
            <AnimatePresence>
              {showDeleteConfirm ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-1 bg-background/90 backdrop-blur-sm shadow-sm rounded-full p-0.5 border"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-6 w-6 rounded-full text-muted-foreground hover:bg-accent/50"
                  >
                    <span className="sr-only">إلغاء</span>
                    ✕
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => removeService(service.id)}
                    className="h-6 w-6 rounded-full text-white bg-red-500 hover:bg-red-600"
                  >
                    <span className="sr-only">تأكيد الحذف</span>
                    ✓
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteConfirm(true)}
                    className={`h-6 w-6 rounded-full ${isHovered ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 text-destructive hover:text-white hover:bg-destructive transition-all duration-300`}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">حذف</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* معلومات الموعد والعميل */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {service.scheduledDate && (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center bg-primary/10 px-2 py-1 rounded-full text-xs text-primary"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(service.scheduledDate).toLocaleDateString('ar-EG')}
              </motion.div>
            )}
            
            {customer && (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
              >
                <UserIcon className="h-3 w-3 mr-1" />
                {customer.name}
              </motion.div>
            )}
            
            {service.public_tracking_code && (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs"
              >
                <BarChart4 className="h-3 w-3 mr-1" />
                <span>كود التتبع: {service.public_tracking_code}</span>
              </motion.div>
            )}
            
            {!hasSchedule && !hasCustomer && !hasTrackingCode && (
              <div className="flex items-center bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>لا توجد معلومات إضافية</span>
              </div>
            )}
          </div>
          
          {/* الملاحظات والسعر */}
          <div className="flex justify-between items-center mt-3">
            <div className="text-xs max-w-[70%]">
              {service.notes ? (
                <motion.div 
                  whileHover={{ y: -2 }}
                  className="flex items-start gap-1 bg-accent/30 px-2 py-1 rounded text-muted-foreground"
                >
                  <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{service.notes}</span>
                </motion.div>
              ) : (
                <span className="text-muted-foreground opacity-70">لا توجد ملاحظات</span>
              )}
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-sm font-bold text-primary-foreground bg-primary px-2.5 py-1 rounded-full shadow-sm"
            >
              {formatPrice(service.price)}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
