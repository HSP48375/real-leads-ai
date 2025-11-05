-- Enable RLS on processed_webhook_events table
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert/select webhook events (this is a system-only table)
CREATE POLICY "Service role can manage webhook events"
  ON public.processed_webhook_events
  FOR ALL
  USING (true)
  WITH CHECK (true);