-- Add email column to leads table to store email separately from contact (phone)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;