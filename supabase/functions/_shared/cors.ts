export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // للمرونة، ولكن في الإنتاج قد ترغب في تحديد نطاقات معينة
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
