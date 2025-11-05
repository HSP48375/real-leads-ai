-- Add primary_state column to orders table
ALTER TABLE public.orders 
ADD COLUMN primary_state text;

-- Update existing orders to extract state from primary_city if it exists
UPDATE public.orders 
SET primary_state = CASE 
  WHEN primary_city ~ '[A-Z]{2}$' THEN RIGHT(TRIM(REPLACE(primary_city, ',', '')), 2)
  ELSE NULL
END
WHERE primary_state IS NULL;

-- Update primary_city to remove state abbreviation for existing records
UPDATE public.orders 
SET primary_city = TRIM(REGEXP_REPLACE(primary_city, '\s*,?\s*[A-Z]{2}\s*$', ''))
WHERE primary_city ~ '[A-Z]{2}$';