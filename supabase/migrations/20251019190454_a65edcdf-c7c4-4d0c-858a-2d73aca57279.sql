-- Update existing test orders to link them to user accounts
UPDATE orders 
SET user_id = '5798dc11-2f2b-4440-8aaf-2f39a35d95e4'
WHERE customer_email = 'naudi.jay@gmail.com' AND user_id IS NULL;

UPDATE orders 
SET user_id = '159ad64c-a501-4975-a278-d4269d4cead9'
WHERE customer_email = 'jason@jnaudiphotography.com' AND user_id IS NULL;