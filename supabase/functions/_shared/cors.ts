export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // للمرونة، ولكن في الإنتاج قد ترغب في تحديد نطاقات معينة
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer', // تأكد من تضمين 'prefer' إذا كنت تستخدمه
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH', // الطرق التي تدعمها دوالك
}; 