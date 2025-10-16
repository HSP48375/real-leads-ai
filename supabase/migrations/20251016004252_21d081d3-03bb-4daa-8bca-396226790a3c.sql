-- Add fields for extended scraping approach
ALTER TABLE orders 
ADD COLUMN needs_additional_scraping BOOLEAN DEFAULT false,
ADD COLUMN next_scrape_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_leads_delivered INTEGER DEFAULT 0;

-- Add new order status for partial delivery
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partial_delivery';