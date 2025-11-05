-- Add property details columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS listing_title text,
ADD COLUMN IF NOT EXISTS address_line_1 text,
ADD COLUMN IF NOT EXISTS address_line_2 text,
ADD COLUMN IF NOT EXISTS zipcode text;