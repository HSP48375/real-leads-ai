-- Add billing type and subscription fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS billing_type TEXT CHECK (billing_type IN ('onetime', 'monthly')) DEFAULT 'onetime',
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS next_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS price_paid INTEGER,
ADD COLUMN IF NOT EXISTS lead_count_range TEXT;

-- Create index on subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_subscription_id ON public.orders(stripe_subscription_id);

-- Create index on next_delivery_date for scheduling
CREATE INDEX IF NOT EXISTS idx_orders_next_delivery ON public.orders(next_delivery_date) WHERE billing_type = 'monthly';