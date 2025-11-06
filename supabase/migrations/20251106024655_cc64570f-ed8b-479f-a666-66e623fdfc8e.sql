-- Fix bathrooms column to accept decimal values like 1.5, 2.5, etc.
ALTER TABLE leads 
ALTER COLUMN bathrooms TYPE numeric USING bathrooms::numeric;