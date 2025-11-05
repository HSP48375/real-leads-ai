-- 1) Webhook idempotency table
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  created TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Orders table enhancements (idempotent and non-breaking)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS leads_count INTEGER,
  ADD COLUMN IF NOT EXISTS price_tier TEXT DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Unique index for non-null session ids to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_stripe_session_id
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON public.processed_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at);

-- 4) Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();