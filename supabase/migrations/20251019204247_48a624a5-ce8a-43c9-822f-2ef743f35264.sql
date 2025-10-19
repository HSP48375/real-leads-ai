-- Drop the existing problematic RLS policy on orders table
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create a simplified RLS policy that doesn't access auth.users table
-- This uses the user_id column directly
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);

-- Actually, let's use an even simpler approach with a security definer function
-- First create the function
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

-- Now update the policy to use the function
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  customer_email = public.get_user_email()
);