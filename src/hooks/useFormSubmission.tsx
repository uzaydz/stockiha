import { useState, useCallback } from 'react';
import { useSupabase } from '@/context/SupabaseContext';

interface FormSubmissionResult {
  success: boolean;
  data?: any;
  error?: any;
}

interface UseFormSubmissionReturn {
  submitForm: (params: {
    landing_page_id: string;
    form_id: string;
    product_id: string;
    formData: Record<string, any>;
    organization_id?: string;
  }) => Promise<FormSubmissionResult>;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Hook to handle form submissions with optimized logic
 */
export function useFormSubmission(): UseFormSubmissionReturn {
  const { supabase } = useSupabase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit form function with optimized error handling and retry logic
  const submitForm = useCallback(async ({
    landing_page_id,
    form_id,
    product_id,
    formData,
    organization_id
  }: {
    landing_page_id: string;
    form_id: string;
    product_id: string;
    formData: Record<string, any>;
    organization_id?: string;
  }): Promise<FormSubmissionResult> => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Ensure city field exists
      const updatedFormData = { ...formData };
      if (!updatedFormData.city) {
        updatedFormData.city = updatedFormData.municipality || updatedFormData.province || 'غير محدد';
      }
      
      // Prepare JSON data
      const jsonData = {
        ...updatedFormData,
        organization_id: organization_id || null,
        submitted_at: new Date().toISOString(),
        status: 'new'
      };
      
      // Prepare submission data
      const submissionData = {
        landing_page_id,
        form_id,
        product_id,
        is_processed: false,
        data: jsonData
      };
      
      // Try direct insert first
      const { data, error } = await supabase
        .from('landing_page_submissions')
        .insert([submissionData])
        .select();
      
      if (error) {
        // If direct insert fails, try using RPC function
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'add_landing_page_submission',
          {
            p_landing_page_id: landing_page_id,
            p_form_id: form_id,
            p_product_id: product_id,
            p_data: jsonData
          }
        );
        
        if (rpcError) {
          throw rpcError;
        }
        
        return { success: true, data: rpcData };
      }
      
      return { success: true, data };
    } catch (err: any) {
      console.error('Form submission error:', err);
      
      // Format error message for user
      let errorMessage = 'حدث خطأ أثناء إرسال النموذج. يرجى المحاولة مرة أخرى.';
      
      if (err.code === '42501') {
        errorMessage = 'خطأ في صلاحيات الوصول. يرجى التواصل مع مدير النظام. (رمز الخطأ: RLS)';
      } else if (err.code === '23505') {
        errorMessage = 'تم إرسال هذا النموذج مسبقاً.';
      } else if (err.message?.includes('معرف المؤسسة')) {
        errorMessage = 'لم يتم العثور على معلومات المتجر. يرجى التواصل مع مدير النظام.';
      }
      
      setError(errorMessage);
      return { success: false, error: err };
    } finally {
      setIsSubmitting(false);
    }
  }, [supabase]);
  
  return { submitForm, isSubmitting, error };
} 