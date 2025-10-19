-- Add user_id column to orders table to link orders to authenticated users
ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Update RLS policy to check both user_id and email (for backward compatibility)
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;

CREATE POLICY "Users can view their own orders"
ON orders
FOR SELECT
USING (
  auth.uid() = user_id OR
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);