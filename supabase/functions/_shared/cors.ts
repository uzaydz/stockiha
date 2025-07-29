export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // للمرونة، ولكن في الإنتاج قد ترغب في تحديد نطاقات معينة
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer, x-creation-time, X-Creation-Time, x-client-instance, X-Client-Instance, x-application-name, x-forwarded-for, user-agent', // إضافة الـ headers بالأحرف الكبيرة والصغيرة
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH', // الطرق التي تدعمها دوالك
};
