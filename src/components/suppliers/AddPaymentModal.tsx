import React, { useState } from 'react';
import { recordPayment } from '@/api/supplierService';

const AddPaymentModal: React.FC<{
  supplierId: string;
  purchaseId: string;
  onSuccess: (response: any) => void;
  onClose: () => void;
  refreshPayments?: () => Promise<void>;
}> = ({ supplierId, purchaseId, onSuccess, onClose, refreshPayments }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // إرسال بيانات الدفعة
      const response = await recordPayment(
        localStorage.getItem('organizationId') || '',
        {
          supplier_id: supplierId,
          purchase_id: purchaseId,
          amount: Number(amount),
          payment_date: paymentDate,
          payment_method: paymentMethod as any,
          notes: notes,
        }
      );
      
      // إغلاق النافذة وتحديث البيانات
      onSuccess(response);
      onClose();
      
      // إعادة تعيين الحقول
      setAmount('');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('');
      setNotes('');
      
      // تحديث قائمة المدفوعات والمشتريات
      if (refreshPayments) {
        await refreshPayments();
      }
      
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Render your form here */}
    </div>
  );
};

export default AddPaymentModal; 