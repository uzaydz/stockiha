-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the abandoned_carts table
CREATE TABLE public.abandoned_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_color_id UUID,
    product_size_id UUID,
    quantity INTEGER DEFAULT 1,
    customer_name TEXT,
    customer_phone TEXT NOT NULL, -- Core field for abandoned cart recovery
    customer_email TEXT,
    province TEXT, -- Storing name for easier display, consider ID for integration later
    municipality TEXT, -- Storing name for easier display, consider ID for integration later
    address TEXT,
    delivery_option TEXT, -- e.g., 'home', 'desk'
    payment_method TEXT, -- e.g., 'cash_on_delivery'
    notes TEXT,
    custom_fields_data JSONB, -- To store other dynamic fields as a JSON object
    calculated_delivery_fee NUMERIC(10, 2),
    subtotal NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2),
    total_amount NUMERIC(10, 2), -- Expected total after discounts and fees
    status TEXT DEFAULT 'pending', -- Workflow status: e.g., 'pending', 'contacted', 'converted', 'failed'
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add a trigger to automatically update the 'updated_at' timestamp on row modification
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_abandoned_carts
BEFORE UPDATE ON public.abandoned_carts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Indexes for better query performance
CREATE INDEX idx_abandoned_carts_organization_id ON public.abandoned_carts(organization_id);
CREATE INDEX idx_abandoned_carts_customer_phone ON public.abandoned_carts(customer_phone);
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(status);
CREATE INDEX idx_abandoned_carts_last_activity_at ON public.abandoned_carts(last_activity_at DESC);
CREATE INDEX idx_abandoned_carts_created_at ON public.abandoned_carts(created_at DESC);

-- Optional: Composite indexes if certain query patterns are very common
-- CREATE INDEX idx_abandoned_carts_org_status ON public.abandoned_carts(organization_id, status);
-- CREATE INDEX idx_abandoned_carts_org_last_activity ON public.abandoned_carts(organization_id, last_activity_at DESC);

-- Comments for clarity
COMMENT ON COLUMN public.abandoned_carts.customer_phone IS 'Primary contact information for abandoned cart recovery efforts.';
COMMENT ON COLUMN public.abandoned_carts.custom_fields_data IS 'Stores values from any additional custom form fields as a JSON object.';
COMMENT ON COLUMN public.abandoned_carts.status IS 'Tracks the workflow stage of the abandoned cart (e.g., pending, contacted, converted, failed).';
COMMENT ON TABLE public.abandoned_carts IS 'Stores information about shopping carts that users started but did not complete, for follow-up and recovery.';
