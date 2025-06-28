-- دالة للحصول على تفاصيل الاشتراك النشط للمؤسسة
-- تتجاوز RLS policies وتعطي النتيجة مباشرة للـ frontend

CREATE OR REPLACE FUNCTION get_organization_subscription_details(org_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'subscription_id', os.id,
    'organization_id', os.organization_id,
    'plan_id', os.plan_id,
    'status', os.status,
    'billing_cycle', os.billing_cycle,
    'start_date', os.start_date,
    'end_date', os.end_date,
    'amount_paid', os.amount_paid,
    'currency', os.currency,
    'payment_method', os.payment_method,
    'payment_reference', os.payment_reference,
    'plan_name', sp.name,
    'plan_code', sp.code,
    'days_remaining', EXTRACT(DAY FROM (os.end_date - NOW()))
  ) INTO result
  FROM organization_subscriptions os
  LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.organization_id = org_id
    AND os.status = 'active'
    AND os.end_date > NOW()
  ORDER BY os.end_date DESC
  LIMIT 1;

  -- إذا لم يتم العثور على اشتراك نشط، إرجاع null
  IF result IS NULL THEN
    result := json_build_object(
      'subscription_id', null,
      'status', 'trial',
      'message', 'لا يوجد اشتراك نشط'
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 