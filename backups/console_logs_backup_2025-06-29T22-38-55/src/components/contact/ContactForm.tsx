import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send, User, Mail, Phone, MessageSquare, Building, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      subject: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // محاكاة إرسال النموذج
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSuccess(true);
      toast.success('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.');
      
      // إعادة تعيين النموذج
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: ''
      });
      
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      toast.error('حدث خطأ في إرسال الرسالة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 lg:p-10"
    >
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6">
        أرسل لنا رسالة
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        املأ النموذج أدناه وسنتواصل معك في أقرب وقت ممكن
      </p>

      {isSuccess ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-12"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            تم إرسال رسالتك بنجاح!
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            سيتواصل معك فريقنا خلال 24 ساعة
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* الاسم */}
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل *</Label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="أدخل اسمك الكامل"
                  className="pr-12"
                />
              </div>
            </div>

            {/* البريد الإلكتروني */}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني *</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@domain.com"
                  className="pr-12"
                />
              </div>
            </div>

            {/* رقم الهاتف */}
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+213 123 456 789"
                  className="pr-12"
                  dir="ltr"
                />
              </div>
            </div>

            {/* اسم الشركة */}
            <div className="space-y-2">
              <Label htmlFor="company">اسم الشركة</Label>
              <div className="relative">
                <Building className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="اسم شركتك أو متجرك"
                  className="pr-12"
                />
              </div>
            </div>
          </div>

          {/* موضوع الرسالة */}
          <div className="space-y-2">
            <Label htmlFor="subject">موضوع الرسالة *</Label>
            <Select value={formData.subject} onValueChange={handleSelectChange} required>
              <SelectTrigger>
                <SelectValue placeholder="اختر موضوع رسالتك" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="support">دعم فني</SelectItem>
                <SelectItem value="sales">استفسار عن المبيعات</SelectItem>
                <SelectItem value="partnership">شراكة تجارية</SelectItem>
                <SelectItem value="feedback">ملاحظات واقتراحات</SelectItem>
                <SelectItem value="complaint">شكوى</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* نص الرسالة */}
          <div className="space-y-2">
            <Label htmlFor="message">رسالتك *</Label>
            <div className="relative">
              <MessageSquare className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <Textarea
                id="message"
                name="message"
                required
                value={formData.message}
                onChange={handleChange}
                placeholder="اكتب رسالتك هنا..."
                className="pr-12 min-h-[150px]"
              />
            </div>
          </div>

          {/* زر الإرسال */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                جاري الإرسال...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                إرسال الرسالة
              </span>
            )}
          </Button>
        </form>
      )}
    </motion.div>
  );
};

export default ContactForm;
