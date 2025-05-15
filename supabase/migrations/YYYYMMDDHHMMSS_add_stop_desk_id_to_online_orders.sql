ALTER TABLE public.online_orders
ADD COLUMN stop_desk_id TEXT NULL;
 
COMMENT ON COLUMN public.online_orders.stop_desk_id IS 'ID of the selected Yalidine Stop Desk, if delivery_option is ''desk''.'; 