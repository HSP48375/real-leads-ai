-- Add lead quota columns to orders table
ALTER TABLE orders
ADD COLUMN min_leads INTEGER,
ADD COLUMN max_leads INTEGER,
ADD COLUMN current_radius INTEGER DEFAULT 25,
ADD COLUMN scrape_attempts INTEGER DEFAULT 0;