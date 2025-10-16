-- Update orders table for territory-based targeting and Stripe integration
ALTER TABLE public.orders 
  DROP COLUMN IF EXISTS city,
  ADD COLUMN IF NOT EXISTS primary_city TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS search_radius INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS additional_cities TEXT[],
  ADD COLUMN IF NOT EXISTS cities_searched TEXT[],
  ADD COLUMN IF NOT EXISTS refund_amount INTEGER,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Add Stripe payment intent tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Update customer_name and customer_email to be nullable for now (will be populated from Stripe)
ALTER TABLE public.orders
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_email DROP NOT NULL;