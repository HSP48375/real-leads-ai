-- Add RLS policies to orders table for defense-in-depth protection

-- Orders should ONLY be created by edge functions using SERVICE_ROLE_KEY
-- This policy prevents any client-side insertions
CREATE POLICY "Orders can only be created by system"
ON orders
FOR INSERT
WITH CHECK (false);

-- Allow users to update their own failed orders to retry
CREATE POLICY "Users can update their own orders"
ON orders
FOR UPDATE
USING (customer_email = get_user_email() AND status IN ('pending', 'failed'))
WITH CHECK (status IN ('pending', 'failed'));

-- Orders should never be deleted, only marked as failed/refunded
CREATE POLICY "Orders cannot be deleted"
ON orders
FOR DELETE
USING (false);

-- Add RLS policies to leads table for defense-in-depth protection

-- Leads should ONLY be created by scrape-leads function
CREATE POLICY "Leads can only be created by system"
ON leads
FOR INSERT
WITH CHECK (false);

-- Leads should be immutable once created
CREATE POLICY "Leads cannot be updated"
ON leads
FOR UPDATE
USING (false);

-- Leads should never be deleted, maintain audit trail
CREATE POLICY "Leads cannot be deleted"
ON leads
FOR DELETE
USING (false);