import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ActivationService } from '@/lib/activation-service';
import { subscriptionCache } from '@/lib/subscription-cache';
import { motion, AnimatePresence } from 'framer-motion';

// UI Components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Key, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivationCodeResponse {
  success: boolean;
  message: string;
  subscription_end_date?: string;
  subscription_id?: string;
}

interface ActivateWithCodeProps {
  onActivated: () => void;
}

const ActivateWithCode: React.FC<ActivateWithCodeProps> = ({ onActivated }) => {
  const { organization, user } = useAuth();
  const { refreshOrganizationData } = useTenant();
  const [activationCode, setActivationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActivationCodeResponse | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const getOrganizationId = async () => {
      if (organization?.id) {
        setOrganizationId(organization.id);
        return;
      }

      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      if (storedOrgId) {
        setOrganizationId(storedOrgId);
        return;
      }

      if (user?.id) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('organization_id')
            .eq('auth_user_id', user.id)
            .single();

          if (userData?.organization_id) {
            setOrganizationId(userData.organization_id);
            localStorage.setItem('bazaar_organization_id', userData.organization_id);
          }
        } catch (err) {
          // Silent error
        }
      }
    };
    getOrganizationId();
  }, [organization, user]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activationCode) {
      toast.error('الرجاء إدخال كود التفعيل');
      return;
    }

    if (!organizationId) {
      setResult({
        success: false,
        message: 'لم يتم العثور على معلومات المؤسسة.'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const result = await ActivationService.activateSubscription({
        activation_code: activationCode.trim(),
        organization_id: organizationId
      });

      setResult(result);

      if (result.success) {
        toast.success('تم تفعيل الاشتراك بنجاح', {
          icon: <Sparkles className="w-5 h-5 text-emerald-500" />,
          duration: 5000
        });

        // Cache updates
        try {
          subscriptionCache.clearCache(organizationId);
          await subscriptionCache.forceRefresh(organizationId);
          await refreshOrganizationData();
        } catch (error) { }

        // Delay callback for better UX
        setTimeout(() => {
          onActivated();
        }, 2000);
      } else {
        toast.error(result.message || 'فشل التفعيل');
      }
    } catch (error: any) {
      console.error(error);
      setResult({
        success: false,
        message: error.message || 'حدث خطأ غير متوقع'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative">
      <AnimatePresence mode="wait">
        {!result?.success ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleActivate}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2 text-right">
                <Label htmlFor="activation-code" className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  أدخل كود التفعيل
                </Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <Input
                    id="activation-code"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    disabled={loading}
                    className={cn(
                      "pr-10 h-12 text-center text-lg tracking-widest uppercase font-mono transition-all",
                      "border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0a101f]",
                      "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
                      "placeholder:text-slate-400 placeholder:tracking-normal placeholder:normal-case"
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !activationCode}
                className="w-full h-11 bg-orange-600 hover:bg-orange-500 text-white font-medium shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري التحقق...</span>
                  </div>
                ) : (
                  'تفعيل الكود'
                )}
              </Button>
            </div>

            {result && !result.success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3"
              >
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-right">
                  <h4 className="font-medium text-red-500 text-sm">خطأ في التفعيل</h4>
                  <p className="text-xs text-red-600/90 dark:text-red-400">{result.message}</p>
                </div>
              </motion.div>
            )}

            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              تواجه مشكلة؟ <button type="button" className="text-orange-500 hover:underline">تواصل مع الدعم</button>
            </p>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75 duration-1000" />
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">تم تفعيل الباقة بنجاح!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                استمتع بجميع مميزات باقتك الجديدة. سيتم تحويلك الآن...
              </p>
            </div>

            {result.subscription_end_date && (
              <div className="inline-block px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                صالحة حتى: <span className="font-mono font-bold text-slate-900 dark:text-white">{new Date(result.subscription_end_date).toLocaleDateString('ar-DZ')}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivateWithCode;
