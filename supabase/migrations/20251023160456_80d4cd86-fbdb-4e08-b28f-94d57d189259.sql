-- Add source_type column to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'fsbo' CHECK (source_type IN ('fsbo', 'preforeclosure', 'auction', 'tax_delinquent', 'frbo'));

-- Add new fields to orders table for radius tracking and cost monitoring
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS radius_used integer,
ADD COLUMN IF NOT EXISTS scraping_cost numeric(10,2),
ADD COLUMN IF NOT EXISTS source_breakdown jsonb DEFAULT '{}'::jsonb;

-- Add account_credit to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_credit numeric(10,2) DEFAULT 0;

-- Create index on source_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_leads_source_type ON public.leads(source_type);

-- Create index on account_credit for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_account_credit ON public.profiles(account_credit);