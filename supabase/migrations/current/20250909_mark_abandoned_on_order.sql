-- Mark matching abandoned carts as recovered when a real online order is created

CREATE OR REPLACE FUNCTION public.mark_abandoned_cart_converted_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
BEGIN
  -- استخرج رقم الهاتف من بيانات النموذج
  v_phone := COALESCE(NEW.form_data->>'phone', NEW.form_data->>'customer_phone');

  IF v_phone IS NOT NULL AND v_phone <> '' THEN
    UPDATE abandoned_carts
    SET status = 'recovered',
        recovered_at = NOW(),
        recovered_order_id = NEW.id,
        updated_at = NOW()
    WHERE organization_id = NEW.organization_id
      AND customer_phone = v_phone
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mark_abandoned_on_order_insert ON online_orders;
CREATE TRIGGER trg_mark_abandoned_on_order_insert
AFTER INSERT ON online_orders
FOR EACH ROW
EXECUTE FUNCTION public.mark_abandoned_cart_converted_on_order();

