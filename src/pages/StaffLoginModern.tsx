/**
 * StaffLoginModern - صفحة تسجيل دخول الموظفين بتصميم عصري
 * 
 * تصميم بسيط وأنيق مع:
 * - PIN input حديث مع dots للخصوصية
 * - تأثيرات حركية سلسة
 * - تجربة مستخدم محسنة
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Loader2, 
  ArrowRight, 
  Lock, 
  AlertCircle,
  Fingerprint,
  Eye,
  EyeOff,
  LogOut,
  Sparkles,
  CheckCircle2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStaffSession } from '@/context/StaffSessionContext';
import { staffService } from '@/services/staffService';
import { useAuth } from '@/context/AuthContext';
import { saveStaffPinOffline, verifyStaffPinOffline } from '@/lib/offline/staffCredentials';
import { supabase } from '@/lib/supabase';
import { isAdminRole } from '@/lib/utils/permission-normalizer';
import ModernPinInput from '@/components/staff/ModernPinInput';
import { cn } from '@/lib/utils';

type LoginMode = 'staff' | 'admin';

const StaffLoginModern: React.FC = () => {
  const navigate = useNavigate();
  const { setStaffSession, setAdminMode } = useStaffSession();
  const { signOut, organization, user, userProfile } = useAuth();
  
  const [mode, setMode] = useState<LoginMode>('staff');
  const [isLoading, setIsLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pinError, setPinError] = useState(false);

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // التحقق من PIN
  const handlePinComplete = useCallback(async (pinCode: string) => {
    setIsLoading(true);
    setError(null);
    setPinError(false);

    try {
      // إذا كنا أوفلاين
      if (!isOnline && organization?.id) {
        const offlineResult = await verifyStaffPinOffline({ 
          organizationId: organization.id, 
          pin: pinCode 
        });
        
        if (offlineResult.success && offlineResult.staff) {
          handleSuccess(offlineResult.staff as any, true);
          return;
        } else {
          throw new Error('لم يتم العثور على بيانات الدخول. يجب تسجيل الدخول أونلاين مرة واحدة.');
        }
      }

      // أونلاين: تحقق من السيرفر
      const result = await staffService.verifyPin(pinCode);

      if (result.success && result.staff) {
        // حفظ للأوفلاين
        if (organization?.id && result.staff?.id) {
          try {
            await saveStaffPinOffline({
              staffId: result.staff.id,
              organizationId: organization.id,
              staffName: result.staff.staff_name,
              pin: pinCode,
              permissions: result.staff.permissions,
            });
          } catch (err) {
            console.warn('[StaffLogin] Failed to save offline PIN:', err);
          }
        }

        handleSuccess(result.staff, false);
      } else {
        setPinError(true);
        setError(result.error || 'كود PIN غير صحيح');
      }
    } catch (err: any) {
      // محاولة أوفلاين عند فشل الشبكة
      if (organization?.id) {
        const offlineResult = await verifyStaffPinOffline({ 
          organizationId: organization.id, 
          pin: pinCode 
        });
        
        if (offlineResult.success && offlineResult.staff) {
          handleSuccess(offlineResult.staff as any, true);
          return;
        }
      }

      setPinError(true);
      setError(err.message || 'حدث خطأ أثناء التحقق');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, isOnline]);

  // معالجة النجاح
  const handleSuccess = (staff: any, isOffline: boolean) => {
    setSuccess(true);
    
    const staffWithPermissions = {
      ...staff,
      organization_id: staff.organization_id || organization?.id,
      permissions: staff.permissions || {
        canAccessPOS: true,
        canViewProducts: true,
        canViewCustomers: true,
        canViewPosOrders: true,
      },
      created_at: staff.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    setStaffSession(staffWithPermissions);
    setAdminMode(false);

    toast.success(
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <div>
          <div className="font-semibold">مرحباً {staff.staff_name}!</div>
          {isOffline && <div className="text-xs opacity-75">وضع أوفلاين</div>}
        </div>
      </div>
    );

    setTimeout(() => {
      navigate('/dashboard/pos-dashboard', {
        replace: true,
        state: { staffSignedIn: true }
      });
    }, 800);
  };

  // تسجيل دخول كأدمن
  const handleAdminLogin = useCallback(async () => {
    if (!adminPassword) {
      setError('الرجاء إدخال كلمة المرور');
      return;
    }

    if (attemptsLeft <= 0) {
      setError('تم تجاوز الحد الأقصى للمحاولات. حاول بعد دقيقة.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userEmail = user?.email || userProfile?.email;
      
      if (!userEmail) {
        setError('لم يتم العثور على بيانات المستخدم.');
        setIsLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: adminPassword,
      });

      if (authError) {
        setAttemptsLeft(prev => prev - 1);
        setError(`كلمة المرور غير صحيحة. المحاولات المتبقية: ${attemptsLeft - 1}`);
        setAdminPassword('');
        setIsLoading(false);
        return;
      }

      const userRole = data.user?.user_metadata?.role || userProfile?.role;
      const isOrgAdmin = data.user?.user_metadata?.is_org_admin || userProfile?.is_org_admin;
      const isSuperAdmin = data.user?.user_metadata?.is_super_admin || userProfile?.is_super_admin;

      if (!isAdminRole(userRole) && !isOrgAdmin && !isSuperAdmin) {
        setError('ليس لديك صلاحيات إدارية.');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setAdminMode(true);
      setAttemptsLeft(3);
      
      toast.success(
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-500" />
          <span>تم تسجيل الدخول كمدير</span>
        </div>
      );
      
      setTimeout(() => {
        navigate('/dashboard/pos-dashboard', {
          replace: true,
          state: { staffSignedIn: true, isAdmin: true }
        });
      }, 800);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
      setAttemptsLeft(prev => prev - 1);
    } finally {
      setIsLoading(false);
    }
  }, [adminPassword, attemptsLeft, user?.email, userProfile, setAdminMode, navigate]);

  // تسجيل الخروج
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  }, [signOut, navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4" dir="rtl">
      {/* خلفية متحركة */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* مؤشر الاتصال */}
      <motion.div 
        className={cn(
          'fixed top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
          isOnline 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {isOnline ? 'متصل' : 'غير متصل'}
      </motion.div>

      {/* البطاقة الرئيسية */}
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative backdrop-blur-xl bg-slate-900/80 border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* شريط علوي متدرج */}
          <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />

          {/* المحتوى */}
          <div className="p-6 sm:p-8">
            {/* الشعار */}
            <motion.div 
              className="flex flex-col items-center mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className={cn(
                'relative mb-4 flex h-20 w-20 items-center justify-center rounded-2xl',
                'bg-gradient-to-br shadow-xl',
                mode === 'admin' 
                  ? 'from-amber-500/20 to-orange-600/20 border border-amber-500/30 shadow-amber-500/10' 
                  : 'from-blue-500/20 to-cyan-600/20 border border-blue-500/30 shadow-blue-500/10'
              )}>
                <motion.div
                  key={mode}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {mode === 'admin' ? (
                    <Shield className="h-10 w-10 text-amber-500" />
                  ) : (
                    <Fingerprint className="h-10 w-10 text-blue-500" />
                  )}
                </motion.div>
                
                {/* نقاط متحركة */}
                <motion.div
                  className="absolute -inset-1 rounded-2xl"
                  style={{ 
                    background: `conic-gradient(from 0deg, transparent, ${mode === 'admin' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}, transparent)` 
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.h1
                  key={mode}
                  className="text-2xl font-bold text-white mb-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {mode === 'admin' ? 'مرحباً بالمدير' : 'مرحباً بك'}
                </motion.h1>
              </AnimatePresence>
              
              <p className="text-sm text-slate-400 text-center">
                {mode === 'admin' 
                  ? 'أدخل كلمة المرور للمتابعة' 
                  : 'أدخل رمز PIN الخاص بك'}
              </p>
            </motion.div>

            {/* رسالة الخطأ */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-6"
                >
                  <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* رسالة النجاح */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <motion.div
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  >
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </motion.div>
                  <span className="text-lg font-medium text-green-400">تم تسجيل الدخول بنجاح!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* المحتوى حسب الوضع */}
            {!success && (
              <AnimatePresence mode="wait">
                {mode === 'staff' ? (
                  <motion.div
                    key="staff"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {/* إدخال PIN */}
                    <ModernPinInput
                      onComplete={handlePinComplete}
                      disabled={isLoading}
                      error={pinError}
                      onClear={() => setPinError(false)}
                    />

                    {/* مؤشر التحميل */}
                    {isLoading && (
                      <motion.div 
                        className="flex items-center justify-center gap-2 text-slate-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري التحقق...</span>
                      </motion.div>
                    )}

                    {/* زر تسجيل دخول كمدير */}
                    <div className="pt-4 border-t border-slate-700/50">
                      <Button
                        variant="ghost"
                        onClick={() => setMode('admin')}
                        className="w-full gap-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                        disabled={isLoading}
                      >
                        <Shield className="h-4 w-4" />
                        تسجيل دخول كمدير
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* البريد الإلكتروني */}
                    <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <span className="text-xs text-slate-500 block mb-1">تسجيل الدخول بـ</span>
                      <span className="font-medium text-white">{user?.email || userProfile?.email}</span>
                    </div>

                    {/* كلمة المرور */}
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="كلمة المرور"
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                        disabled={isLoading || attemptsLeft <= 0}
                        className="pr-10 pl-10 h-12 bg-slate-800/50 border-slate-700 focus:border-amber-500 focus:ring-amber-500/20"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* زر تسجيل الدخول */}
                    <Button
                      onClick={handleAdminLogin}
                      disabled={isLoading || !adminPassword || attemptsLeft <= 0}
                      className={cn(
                        'w-full h-12 gap-2 text-base font-semibold',
                        'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
                        'shadow-lg shadow-amber-500/20 transition-all'
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          جاري تسجيل الدخول...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-5 w-5" />
                          تسجيل الدخول
                        </>
                      )}
                    </Button>

                    {/* العودة لوضع الموظف */}
                    <div className="pt-4 border-t border-slate-700/50">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setMode('staff');
                          setAdminPassword('');
                          setError(null);
                        }}
                        className="w-full gap-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                        disabled={isLoading}
                      >
                        <Users className="h-4 w-4" />
                        العودة لتسجيل دخول الموظف
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* زر تسجيل الخروج */}
            {!success && (
              <div className="pt-6 mt-6 border-t border-slate-700/50">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  disabled={isLoading}
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل خروج من الحساب
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* نص أسفل البطاقة */}
        <motion.p 
          className="text-center text-xs text-slate-600 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          نظام إدارة الموظفين والصلاحيات • ستوكيها
        </motion.p>
      </motion.div>
    </div>
  );
};

export default StaffLoginModern;
