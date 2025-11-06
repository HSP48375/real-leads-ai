-- Add property detail columns to leads table
ALTER TABLE leads 
ADD COLUMN bedrooms integer,
ADD COLUMN bathrooms integer,
ADD COLUMN home_style text,
ADD COLUMN year_built integer;